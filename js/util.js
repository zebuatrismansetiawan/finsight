/* ==========================================================================
   FinSight — util.js : helper DOM, format Indonesia, ikon, toast, modal, tooltip
   ========================================================================== */
'use strict';

const U = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /** Ikon SVG inline (Lucide, stroke 2). */
  function ic(name, size = 18, cls = '') {
    const p = ICONS[name] || ICONS.info;
    return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  }

  // ---------- Angka & uang (format Indonesia) ----------
  const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const num = (n) => nf0.format(Math.round(Number(n) || 0));
  const dec = (n, d = 1) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0);
  const rp = (n) => (n < 0 ? '-' : '') + 'Rp ' + num(Math.abs(n));
  /** Rupiah ringkas: Rp 1,24 T / Rp 396,8 M / Rp 48,2 Jt / Rp 950 Rb */
  function rpS(n, opt = {}) {
    n = Number(n) || 0;
    const a = Math.abs(n), s = n < 0 ? '-' : '';
    let v, u;
    if (a >= 1e12) { v = a / 1e12; u = opt.long ? 'Triliun' : 'T'; }
    else if (a >= 1e9) { v = a / 1e9; u = opt.long ? 'Miliar' : 'M'; }
    else if (a >= 1e6) { v = a / 1e6; u = opt.long ? 'Juta' : 'Jt'; }
    else if (a >= 1e3) { v = a / 1e3; u = 'Rb'; }
    else return s + 'Rp ' + num(a);
    const d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    return s + 'Rp ' + dec(v, d) + (opt.noUnit ? '' : ' ' + u);
  }
  function rpParts(n) {           // {angka, satuan} untuk KPI besar
    const s = rpS(n, { long: true });
    const m = s.match(/^(-?Rp [\d.,]+)\s?(.*)$/);
    return m ? { a: m[1], u: m[2] } : { a: s, u: '' };
  }
  const pct = (n, d = 1) => dec(n, d) + '%';

  // ---------- Tanggal ----------
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  /** 'yyyy-mm-dd' → '28 Nov 2026' */
  function tgl(s, panjang) {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '-';
    return Number(m[3]) + ' ' + (panjang ? BULAN : BLN)[Number(m[2]) - 1] + ' ' + m[1];
  }
  const tgl2 = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + ' ' + BLN[Number(m[2]) - 1] + ' ' + m[1] : '-'; };
  const periodeLabel = (p, panjang) => { const m = String(p || '').match(/^(\d{4})-(\d{2})/); return m ? (panjang ? BULAN : BLN)[Number(m[2]) - 1] + ' ' + m[1] : p; };
  const pad = (n) => String(n).padStart(2, '0');
  const jam = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  const tglJam = (ms) => { if (!ms) return '-'; const d = new Date(ms); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const isoLokal = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  /** selisih hari kalender (b - a), keduanya 'yyyy-mm-dd' */
  function selisihHari(a, b) {
    if (!a || !b) return null;
    const x = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
    const y = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
    return Math.round((y - x) / 86400000);
  }
  function tambahHari(s, n) { const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) + n * 86400000); return d.toISOString().slice(0, 10); }
  function periodeGeser(p, n) { let y = +p.slice(0, 4), m = +p.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad(m + 1); }

  // ---------- Lain-lain ----------
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  const inisial = (nama) => {
    const w = String(nama || '').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
    const pre = ['PT', 'CV', 'UD'];
    if (pre.includes((w[0] || '').toUpperCase())) return w[0].toUpperCase().slice(0, 2);
    return ((w[0] || '?')[0] + ((w[1] || '')[0] || '')).toUpperCase();
  };
  function unduh(blob, nama) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nama;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function b64ToBlob(b64, mime) {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  async function salin(teks) {
    try { await navigator.clipboard.writeText(teks); toast('Disalin ke clipboard.', 'ok'); }
    catch (e) { toast('Gagal menyalin. Salin manual.', 'warn'); }
  }

  // ---------- Toast ----------
  function toast(msg, type = 'ok', ms = 3600) {
    const root = $('#toasts');
    if (!root) return;
    const icon = { ok: 'ok', err: 'xcircle', warn: 'alertc', info: 'info' }[type] || 'info';
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'err' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast-ic">${ic(icon, 18)}</span><div class="toast-msg">${esc(msg)}</div><button class="toast-x" aria-label="Tutup">${ic('x', 14)}</button>`;
    el.querySelector('.toast-x').onclick = () => tutup();
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const t = setTimeout(tutup, ms);
    function tutup() { clearTimeout(t); el.classList.remove('show'); setTimeout(() => el.remove(), 250); }
  }

  // ---------- Modal ----------
  let modalStack = [];
  function modal({ title, body, footer = '', size = 'md', onClose, cls = '' }) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal-scrim"></div><div class="modal modal-${size} ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-hd"><h3>${esc(title)}</h3><button class="btn-icon modal-x" aria-label="Tutup">${ic('x', 18)}</button></div>
      <div class="modal-bd">${body}</div>${footer ? `<div class="modal-ft">${footer}</div>` : ''}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const close = () => {
      wrap.classList.remove('show');
      modalStack = modalStack.filter((m) => m !== api);
      setTimeout(() => wrap.remove(), 200);
      if (onClose) onClose();
    };
    wrap.querySelector('.modal-scrim').onclick = close;
    wrap.querySelector('.modal-x').onclick = close;
    const api = { el: wrap.querySelector('.modal'), close };
    modalStack.push(api);
    setTimeout(() => { const f = wrap.querySelector('[autofocus], input, select, textarea'); if (f) f.focus(); }, 60);
    return api;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close(); });

  function konfirmasi({ title, body, ok = 'Lanjutkan', batal = 'Batal', bahaya = false }) {
    return new Promise((resolve) => {
      let hasil = false;
      const m = modal({
        title, size: 'sm', body: `<div class="confirm-body">${body}</div>`,
        footer: `<button class="btn btn-secondary" data-x="0">${esc(batal)}</button><button class="btn ${bahaya ? 'btn-danger' : 'btn-primary'}" data-x="1">${esc(ok)}</button>`,
        onClose: () => resolve(hasil)
      });
      m.el.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => { hasil = b.dataset.x === '1'; m.close(); });
    });
  }

  // ---------- Tooltip global (atribut data-tip) ----------
  let tipEl = null;
  function initTip() {
    tipEl = document.createElement('div');
    tipEl.className = 'tip';
    document.body.appendChild(tipEl);
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { tipEl.classList.remove('show'); return; }
      tipEl.innerHTML = t.getAttribute('data-tip');
      tipEl.classList.add('show');
    });
    document.addEventListener('mousemove', (e) => {
      if (!tipEl.classList.contains('show')) return;
      const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      let x = e.clientX + 14, y = e.clientY + 14;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14;
      if (y + h > innerHeight - 8) y = e.clientY - h - 14;
      tipEl.style.transform = `translate(${x}px,${y}px)`;
    });
    document.addEventListener('scroll', () => tipEl.classList.remove('show'), true);
  }


  // ---------- Format Proper untuk subjudul & keterangan ----------
  // Setiap kata diawali huruf kapital, KECUALI "dan", "untuk", "dengan", "per"
  // (tetap huruf kecil, kecuali menjadi kata pertama). Akronim (NPP, WA, OS),
  // angka, placeholder {nama}, email, dan isi <code>/<a>/<button> tidak diubah.
  const KATA_KECIL = new Set(['dan', 'untuk', 'dengan', 'per']);
  const SEL_PROPER = ['.ph p', '.card-h p', '.hero p', '.sync-banner p', '.card p.muted', '.empty p', '.lg-sub', '.lg-hint > span', '.lg-feat li', '.lg-sec > span', '.tfa-once > span',
    '.kpi-f > span', '.kolc-f > span', '.rk-f > span', '.card-f > span.muted', '.mk span', '.fld > small', '.opt small', '.preset small', '.imp small', '.dt-sub'].join(',');
  const LEWATI = 'code,kbd,pre,a,button,textarea,select,option,input,svg,.no-proper';
  function properTeks(t, st) {
    return t.replace(/[\p{L}\p{N}{}_@'’]+(?:[.\/][\p{L}\p{N}]+)*/gu, (w) => {
      const awal = st.awal; st.awal = false;
      if (/[{}@_]/.test(w) || /^\p{N}/u.test(w)) return w;
      const lw = w.toLowerCase();
      if (!awal && KATA_KECIL.has(lw)) return lw;
      const kap = (x) => { const c = x.charAt(0); return c === c.toLowerCase() && c !== c.toUpperCase() ? c.toUpperCase() + x.slice(1) : x; };
      return w.indexOf('/') > -1 ? w.split('/').map((x) => (/^\p{N}/u.test(x) ? x : kap(x))).join('/') : kap(w);
    });
  }
  function properEl(el) {
    if (!el || el.closest('.no-proper')) return;
    const st = { awal: true };
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      const p = n.parentElement;
      if (p && p !== el && p.closest(LEWATI) && el.contains(p.closest(LEWATI))) { st.awal = false; continue; }
      const v = properTeks(n.nodeValue, st);
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  }
  function properDi(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches(SEL_PROPER)) properEl(root);
    root.querySelectorAll(SEL_PROPER).forEach(properEl);
    const atas = root.parentElement && root.parentElement.closest(SEL_PROPER);
    if (atas) properEl(atas);
  }
  /** Pasang sekali: semua render berikutnya otomatis diformat sebelum tampil di layar. */
  function properAuto(root) {
    root = root || document.body;
    properDi(root);
    new MutationObserver((ms) => {
      ms.forEach((m) => {
        m.addedNodes.forEach((n) => { if (n.nodeType === 1) properDi(n); else if (n.nodeType === 3 && n.parentElement) { const a = n.parentElement.closest(SEL_PROPER); if (a) properEl(a); } });
      });
    }).observe(root, { childList: true, subtree: true });
  }

  return {
    proper: (t) => properTeks(String(t || ''), { awal: true }), properAuto,
    $, $$, esc, ic, num, dec, rp, rpS, rpParts, pct, tgl, tgl2, periodeLabel, jam, tglJam, isoLokal, selisihHari,
    tambahHari, periodeGeser, debounce, inisial, unduh, b64ToBlob, salin, toast, modal, konfirmasi, initTip, BLN, BULAN
  };
})();
