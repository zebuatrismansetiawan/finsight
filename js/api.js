/* ==========================================================================
   FinSight — api.js : klien REST ke Google Apps Script
   - POST text/plain (tanpa preflight CORS), token sesi di BODY (bukan URL)
   - Deduplikasi request kembar, batch beberapa aksi baca, retry jaringan
   - Mode demo otomatis bila GAS_URL belum diisi (data fiktif di browser)
   ========================================================================== */
'use strict';

const Api = (() => {
  const cfg = window.APP_CONFIG || {};
  const qs = new URLSearchParams(location.search);
  const belumDiatur = !cfg.GAS_URL || /GANTI|XXXX/i.test(cfg.GAS_URL);
  const DEMO = belumDiatur || qs.has('demo');
  const BACA = /^(boot|sync\.|data\.|log\.list|template\.list|user\.list|setting\.get|blast\.status|auth\.me)/;
  const KUNCI_SESI = 'fs_sesi' + (DEMO ? '_demo' : '');

  let sesi = null;
  try { sesi = JSON.parse(localStorage.getItem(KUNCI_SESI) || 'null'); } catch (e) { sesi = null; }
  if (sesi && sesi.exp && sesi.exp < Date.now()) sesi = null;

  const inflight = {};
  let epoch = 0;
  const pendengar = { auth: [], net: [] };

  function simpanSesi(token, me, exp) {
    sesi = token ? { token, me, exp: exp || Date.now() + 8 * 3600e3 } : null;
    if (sesi) localStorage.setItem(KUNCI_SESI, JSON.stringify(sesi)); else localStorage.removeItem(KUNCI_SESI);
  }
  function expDariToken(t) {
    try { const b = t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))).x; }
    catch (e) { return 0; }
  }

  async function kirim(body, timeout = 45000) {
    if (DEMO) {
      if (!window.DemoAPI) throw new Error('Modul demo belum termuat.');
      return window.DemoAPI.handle(body);
    }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(cfg.GAS_URL, {
        method: 'POST', redirect: 'follow', signal: ctl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // WAJIB text/plain (hindari preflight)
        body: JSON.stringify(body)
      });
      const txt = await res.text();
      try { return JSON.parse(txt); }
      catch (e) { throw new Error(/<html/i.test(txt) ? 'Respons server bukan JSON. Pastikan Web App di-deploy dengan akses "Anyone".' : 'Respons server tidak valid.'); }
    } finally { clearTimeout(t); }
  }

  async function jalankan(action, data, opts = {}) {
    const body = { action, data: data || {}, token: opts.token !== undefined ? opts.token : (sesi && sesi.token) };
    let res, err;
    for (let coba = 0; coba < (BACA.test(action) ? 2 : 1); coba++) {
      try { res = await kirim(body, opts.timeout); err = null; break; }
      catch (e) {
        err = e;
        if (e.name === 'AbortError') err = new Error('Waktu tunggu habis. Periksa koneksi lalu coba lagi.');
        else if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) err = new Error(navigator.onLine ? 'Tidak dapat terhubung ke server.' : 'Anda sedang offline.');
        await new Promise((r) => setTimeout(r, 700));
      }
    }
    if (err) { pendengar.net.forEach((f) => f(false)); return { success: false, message: err.message, code: 'NET' }; }
    pendengar.net.forEach((f) => f(true));
    if (res && res.code === 'AUTH' && !opts.publik) pendengar.auth.forEach((f) => f(res.message));
    return res || { success: false, message: 'Respons kosong.' };
  }

  /** Panggil API. Aksi baca kembar yang sedang berjalan berbagi satu promise. */
  function call(action, data, opts) {
    if (!BACA.test(action)) { epoch++; return jalankan(action, data, opts); }
    const k = epoch + '|' + action + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = jalankan(action, data, opts);
    inflight[k] = p;
    p.finally(() => delete inflight[k]);
    return p;
  }

  /** Gabungkan beberapa aksi BACA dalam satu eksekusi server. */
  async function batchCalls(calls) {
    const body = { action: 'batch', calls, token: sesi && sesi.token };
    try {
      const res = await kirim(body);
      if (res && res.code === 'AUTH') pendengar.auth.forEach((f) => f(res.message));
      pendengar.net.forEach((f) => f(true));
      return res;
    } catch (e) { pendengar.net.forEach((f) => f(false)); return { success: false, message: e.message, code: 'NET' }; }
  }

  return {
    DEMO, belumDiatur, call, batch: batchCalls,
    get sesi() { return sesi; }, simpanSesi, expDariToken,
    onAuth: (f) => pendengar.auth.push(f), onNet: (f) => pendengar.net.push(f)
  };
})();
