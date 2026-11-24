/* ==========================================================================
   FinSight — app.js : state, metrik turunan, shell, router, sinkronisasi
   Prinsip "tanpa delay":
   - Data dimuat SEKALI (dataset ringkas), disimpan lokal (SWR) → buka ulang instan.
   - Pindah menu = render dari memori (tanpa request server).
   - Filter/cari/urut/paging dihitung di browser (ms).
   - Polling ringan "sync.ping" mendeteksi perubahan Google Sheets (≤ 30–60 dtk).
   ========================================================================== */
'use strict';

const S = {
  me: null, akses: null, setting: {}, produk: [], prodMap: {}, ds: null, D: [], byId: {}, snap: [], tpl: [], tplAll: null, gw: null,
  ver: '', lver: '', sver: '', periodeIni: '', hariIni: '', periode: '',
  log: null, logQ: null, users: null, adminSet: null, devStatus: null,
  lastSync: 0, online: true, syncing: false, perluRender: false,
  f: {}, sel: { deb: new Set(), risk: new Set() }, blast: { ids: [], sumber: '', tplId: '', step: 1 }, batchAktif: null
};

// v1.2: akses menu diatur Super Admin per peran (server = sumber kebenaran, lihat S.akses).
const MENU_PERAN = ['dashboard', 'kualitas', 'debitur', 'risiko', 'blast', 'template', 'log', 'analisa'];
const LABEL_MENU = { dashboard: 'Dashboard', kualitas: 'Kualitas Kredit', debitur: 'Daftar Debitur', risiko: 'Penagihan', blast: 'WA Blast', template: 'Template WA', log: 'Log Blast', analisa: 'Analisa' };
const RUTE_INDUK = { 'debitur-pmi': 'debitur' };              // sub-page mengikuti hak akses induknya
const labelPeran = (p) => (p === 'Admin' ? 'Super Admin' : p === 'RM' ? 'RM - Relationship Manager' : p || '');
const MENU = [
  ['dashboard', 'Dashboard', 'dashboard'], ['kualitas', 'Kualitas Kredit (Kol. 1-5)', 'pie'], ['debitur', 'Daftar Debitur', 'users'],
  ['risiko', 'Penagihan', 'alert'], ['blast', 'WA Blast', 'send'], ['template', 'Template WA', 'template'],
  ['log', 'Log Blast', 'history'], ['analisa', 'Analisa', 'scroll'], ['pengguna', 'Pengguna & Peran', 'shield'], ['pengaturan', 'Pengaturan', 'settings']
];
const KOL = {
  1: { n: 'Lancar', s: 'L', c: '#16A34A' }, 2: { n: 'Dalam Perhatian Khusus', s: 'DPK', c: '#2563EB' },
  3: { n: 'Kurang Lancar', s: 'KL', c: '#D97706' }, 4: { n: 'Diragukan', s: 'D', c: '#EA580C' }, 5: { n: 'Macet', s: 'M', c: '#E11D48' }
};

// ============================================================================
//  METRIK TURUNAN (semua dihitung di browser)
// ============================================================================
const M = (() => {
  const memo = new Map();
  const cache = (k, fn) => { if (memo.has(k)) return memo.get(k); const v = fn(); memo.set(k, v); return v; };
  const reset = () => memo.clear();

  function decode(ds) {
    const c = {}; ds.cols.forEach((k, i) => { c[k] = i; });
    const hari = S.hariIni;
    return ds.rows.map((r) => {
      const o = {
        id: String(r[c.id]), nm: r[c.nm] || '', cif: r[c.cif] || '', pic: r[c.pic] || '', wa: r[c.wa] || '', wv: r[c.wv], pr: r[c.pr] || '-',
        pl: +r[c.pl] || 0, bd: +r[c.bd] || 0, jt: r[c.jt] || '', st: r[c.st], kol: +r[c.kol] || 1, sb: r[c.sb], sa: +r[c.sa] || 0, an: +r[c.an] || 0,
        oo: r[c.oo], rm: r[c.rm] || '', kl: r[c.kl] === null || r[c.kl] === undefined ? null : +r[c.kl],
        rp: c.rp === undefined ? '' : String(r[c.rp] || ''), ra: c.ra === undefined ? '' : String(r[c.ra] || ''),   // v1.1 (data lama: kosong)
        pt: c.pt === undefined ? '' : String(r[c.pt] || ''), il: c.il === undefined ? '' : String(r[c.il] || ''),   // v1.2
        jw: c.jw === undefined ? '' : String(r[c.jw] || ''), bt: c.bt === undefined ? '' : String(r[c.bt] || ''), sx: c.sx === undefined ? 0 : +r[c.sx] || 0,   // v1.3
        tb: c.tb === undefined ? '' : String(r[c.tb] || ''), un: c.un === undefined ? '' : String(r[c.un] || ''), np: c.np === undefined ? '' : String(r[c.np] || ''),   // v1.5
        sg: c.sg === undefined ? '' : String(r[c.sg] || ''), hm: c.hm === undefined ? 0 : +r[c.hm] || 0,
        pu: c.pu === undefined ? '' : String(r[c.pu] || '')                                                    // v1.6: Perusahaan (tempat kerja KUR PMI)
      };
      // v1.3: id = CIF (Debitur Umum) / Rek Afil (KUR PMI); nomor rekening pinjaman tetap dari Rek_Pinjaman
      o.rek = o.rp || o.il || (c.jw === undefined ? o.id : '');
      o.aktif = o.st === 'Aktif';
      o.dd = o.jt ? U.selisihHari(hari, o.jt) : null;
      o.fBlokir = o.aktif && o.an > 0 && (o.sb === null || o.sb === 0);
      o.fSaldo = o.aktif && o.an > 0 && o.sa < o.an;
      o.risiko = o.fBlokir || o.fSaldo;
      o.kurang = o.aktif ? Math.max(0, o.an - o.sa) : 0;
      o.mv = o.aktif && o.kl ? o.kol - o.kl : 0;
      o.q = (o.id + ' ' + o.nm + ' ' + o.cif + ' ' + o.pic + ' ' + o.pr + ' ' + o.rm + ' ' + o.rp + ' ' + o.ra + ' ' + o.pt + ' ' + o.il + ' ' + o.bt + ' ' + o.un + ' ' + o.np + ' ' + o.pu).toLowerCase();
      return o;
    });
  }

  const byProduk = (pr) => cache('p|' + pr, () => (pr && pr !== 'ALL' ? S.D.filter((d) => d.pr === pr) : S.D));

  function kpi(pr) {
    return cache('k|' + pr, () => {
      const L = byProduk(pr), jh = Number(S.setting.JT_HARI) || 30;
      const k = { total: L.length, aktif: 0, lunas: 0, plafon: 0, baki: 0, plLunas: 0, jt: 0, jtBaki: 0, jtAn: 0, lt50: 0, lt50Sisa: 0, risiko: 0, kurang: 0, bakiRisiko: 0 };
      L.forEach((d) => {
        k.plafon += d.pl; k.baki += d.bd;
        if (d.aktif) {
          k.aktif++;
          if (d.dd !== null && d.dd >= 0 && d.dd <= jh) { k.jt++; k.jtBaki += d.bd; k.jtAn += d.an; }
          if (d.pl > 0 && d.bd < 0.5 * d.pl) { k.lt50++; k.lt50Sisa += d.pl - d.bd; }
          if (d.risiko) { k.risiko++; k.kurang += d.kurang; k.bakiRisiko += d.bd; }
        } else { k.lunas++; k.plLunas += d.pl; }
      });
      return k;
    });
  }

  function perProduk() {
    return cache('pp', () => S.produk.map((p) => {
      const L = byProduk(p.kode);
      const o = { kode: p.kode, nama: p.nama, warna: p.warna, n: L.length, aktif: 0, plafon: 0, baki: 0, risiko: 0 };
      L.forEach((d) => { o.plafon += d.pl; o.baki += d.bd; if (d.aktif) o.aktif++; if (d.risiko) o.risiko++; });
      return o;
    }));
  }

  function kol(pr) {
    return cache('kol|' + pr, () => {
      const o = { 1: { n: 0, b: 0 }, 2: { n: 0, b: 0 }, 3: { n: 0, b: 0 }, 4: { n: 0, b: 0 }, 5: { n: 0, b: 0 }, n: 0, b: 0 };
      byProduk(pr).forEach((d) => { if (!d.aktif) return; o[d.kol].n++; o[d.kol].b += d.bd; o.n++; o.b += d.bd; });
      return o;
    });
  }

  const risiko = (pr) => cache('r|' + pr, () => byProduk(pr).filter((d) => d.risiko));
  const gerak = (pr) => cache('g|' + pr, () => byProduk(pr).filter((d) => d.mv !== 0));

  /** Agregat snapshot periode p: { n, aktif, plafon, baki, kol:{1..5:{n,b}}, lunas, perProduk:{kode:{n,plafon,baki}} } */
  function snap(p, pr) {
    return cache('s|' + p + '|' + pr, () => {
      const rows = S.snap.filter((r) => r[0] === p && (!pr || pr === 'ALL' || r[1] === pr));
      if (!rows.length) return null;
      const o = { n: 0, aktif: 0, plafon: 0, baki: 0, lunas: 0, kol: { 1: { n: 0, b: 0 }, 2: { n: 0, b: 0 }, 3: { n: 0, b: 0 }, 4: { n: 0, b: 0 }, 5: { n: 0, b: 0 } }, pp: {} };
      rows.forEach((r) => {
        const k = r[2], n = r[3], pl = r[4], b = r[5];
        o.n += n; o.plafon += pl; o.baki += b;
        if (!o.pp[r[1]]) o.pp[r[1]] = { n: 0, plafon: 0, baki: 0 };
        o.pp[r[1]].n += n; o.pp[r[1]].plafon += pl; o.pp[r[1]].baki += b;
        if (k === 'L') o.lunas += n; else if (o.kol[k]) { o.kol[k].n += n; o.kol[k].b += b; o.aktif += n; }
      });
      return o;
    });
  }
  const periodes = () => cache('per', () => {
    const s = new Set(S.snap.map((r) => r[0])); s.add(S.periodeIni);
    return Array.from(s).filter(Boolean).sort();
  });
  /** Agregat periode: periode berjalan = data langsung, periode lalu = snapshot */
  function agregat(p, pr) {
    if (p === S.periodeIni) {
      const k = kpi(pr), kl = kol(pr);
      return { n: k.total, aktif: k.aktif, plafon: k.plafon, baki: k.baki, lunas: k.lunas, kol: kl, live: true };
    }
    return snap(p, pr);
  }
  const delta = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : null);

  return { decode, reset, byProduk, kpi, perProduk, kol, risiko, gerak, snap, periodes, agregat, delta };
})();

// ============================================================================
//  v1.5 — Segmen (SME / SBP), unit & cakupan data
// ============================================================================
const SEG = (() => {
  const BAWAAN = { SME: ['BCM', 'CCC', 'SCF', 'OTHER'], SBP: ['BWU', 'CCC', 'KUR', 'KPP', 'KUR PMI'] };   // v1.6: SME + SCF & Other
  const NAMA = { SME: 'SME', SBP: 'SBP' };
  const UNIT_BAWAAN = [['31100', 'KCU Jababeka'], ['31102', 'KC Cikarang'], ['31105', 'KC Mutiara Gading'], ['31107', 'KC Tambun'], ['31160', 'KC RE Martadinata'], ['31162', 'KC Cibitung'],
    ['31106', 'KC Cikarang Baru'], ['31161', 'KC MM2100'], ['31163', 'KC Grandwisata'], ['31165', 'KC Wisma Asri'], ['31101', 'KC Bulak Kapal'], ['31103', 'KC Lippo Cikarang'], ['31104', 'KC Kalimas'],
    ['31108', 'KC Cikarang Central City'], ['31166', 'KC Delta Mas']].map((x) => ({ k: x[0], n: x[1] }));
  function akses() {
    let a = null; try { a = JSON.parse(S.setting.AKSES_DATA || 'null'); } catch (e) { a = null; }
    a = a && typeof a === 'object' ? a : {};
    let seg = a.seg && a.seg.SME ? { SME: a.seg.SME.slice(), SBP: (a.seg.SBP || []).slice() } : BAWAAN;
    if (a.seg && a.segV !== 2) {            // v1.6: pengaturan lama (v1.5) belum mengenal SCF & Other — sama dengan server
      ['SME', 'SBP'].forEach((g) => BAWAAN[g].forEach((p) => { if (!seg.SME.includes(p) && !seg.SBP.includes(p)) seg[g].push(p); }));
    }
    return { seg, unit: Array.isArray(a.unit) ? a.unit : UNIT_BAWAAN, peran: a.peran || {} };
  }
  /** Segmen yang boleh dibuka pengguna ini (server = sumber kebenaran, lihat S.cakupan).
   *  v1.6: bila filter NPP aktif, NPP login = kunci → segmen mengikuti debitur miliknya (SME dan/atau SBP). */
  const milikku = () => {
    const c = (S.ds && S.ds.cakupan) || S.cakupan;
    if (c && c.nppAktif && S.D) { const ada = ['SME', 'SBP'].filter((g) => S.D.some((d) => masuk(d, g))); if (ada.length) return ada; }
    return c && c.s ? [c.s] : ['SME', 'SBP'];
  };
  const produk = (seg) => (akses().seg[seg] || []).slice();
  /** Debitur termasuk segmen? (kolom Segmen → produk; segmen belum diketahui tampil di kedua segmen produk itu) */
  const masuk = (d, seg) => (d.sg ? d.sg === seg : produk(seg).includes(d.pr));
  const units = () => akses().unit;
  const namaUnit = (k) => { if (!k) return ''; const u = units().find((x) => x.k === k || x.n === k); return u ? (u.k && u.n ? u.k + ' - ' + u.n : u.n || u.k) : k; };
  return { akses, milikku, produk, masuk, units, namaUnit, NAMA };
})();

// ============================================================================
//  APLIKASI
// ============================================================================
const VERSI_APP = '1.6.0';   // versi frontend (config.js milik Anda tidak perlu diubah)
const App = (() => {
  const { $, $$, esc, ic } = U;
  let halaman = 'dashboard';
  let installPrompt = null;

  // ---------- Penyimpanan lokal (SWR) ----------
  const kunciCache = () => 'fs_cache_' + (Api.DEMO ? 'demo_' : '') + ((S.me && S.me.npp) || (Api.sesi && Api.sesi.me && Api.sesi.me.npp) || 'x');
  function simpanLokal() {
    try {
      localStorage.setItem(kunciCache(), JSON.stringify({ t: Date.now(), ver: S.ver, ds: S.ds, snap: S.snap, produk: S.produk, setting: S.setting, tpl: S.tpl, gw: S.gw, me: S.me, akses: S.akses, periodeIni: S.periodeIni, cakupan: S.cakupan || null }));
    } catch (e) { /* kuota penuh → abaikan */ }
  }
  function muatLokal() {
    try {
      const c = JSON.parse(localStorage.getItem(kunciCache()) || 'null');
      if (!c || !c.ds || Date.now() - c.t > 7 * 86400e3) return false;
      S.setting = c.setting || {}; S.produk = c.produk || []; S.snap = c.snap || []; S.tpl = c.tpl || []; S.gw = c.gw; S.me = S.me || c.me; if (!S.akses && c.akses) S.akses = c.akses; if (c.cakupan) S.cakupan = c.cakupan;
      S.periodeIni = c.periodeIni || U.isoLokal(new Date()).slice(0, 7);
      S.hariIni = U.isoLokal(new Date());
      if (!S.periode) S.periode = S.periodeIni;
      terapkanData(c.ds);
      return true;
    } catch (e) { return false; }
  }
  function hapusLokal() { Object.keys(localStorage).filter((k) => k.indexOf('fs_cache_') === 0).forEach((k) => localStorage.removeItem(k)); }

  /** v1.6: produk yang ada di data tetapi belum ada di master produk (mis. BCM, SCF, OTHER) ikut ditampilkan. */
  const PRODUK_TAMBAHAN = { BCM: ['BCM', '#0EA5E9'], SCF: ['SCF (Supply Chain Financing)', '#10B981'], OTHER: ['Other (Lainnya)', '#94A3B8'] };
  function lengkapiProduk() {
    if (!S.D) return;
    const ada = new Set((S.produk || []).map((p) => p.kode)), baru = [];
    S.D.forEach((d) => { if (d.pr && d.pr !== '-' && !ada.has(d.pr)) { ada.add(d.pr); baru.push(d.pr); } });
    if (!baru.length) return;
    const urutan = Object.keys(PRODUK_TAMBAHAN);
    baru.sort((a, b) => ((urutan.indexOf(a) + 1 || 99) - (urutan.indexOf(b) + 1 || 99)) || a.localeCompare(b));
    S.produk = (S.produk || []).concat(baru.map((k, i) => ({ kode: k, nama: (PRODUK_TAMBAHAN[k] || [k])[0], urut: 100 + i, warna: (PRODUK_TAMBAHAN[k] || [0, '#64748B'])[1] })));
  }
  function terapkanData(ds) {
    S.ds = ds; S.ver = ds.ver;
    S.D = M.decode(ds);
    lengkapiProduk();
    S.prodMap = {}; S.produk.forEach((p) => { S.prodMap[p.kode] = p; });
    S.byId = {}; S.D.forEach((d) => { S.byId[d.id] = d; });
    M.reset();
    // bersihkan pilihan yang sudah tidak ada
    ['deb', 'risk'].forEach((k) => S.sel[k].forEach((id) => { if (!S.byId[id]) S.sel[k].delete(id); }));
  }
  function terapkanBoot(d) {
    S.me = d.me; S.setting = d.setting || {}; S.produk = d.produk || []; S.snap = d.snap || [];
    if (Array.isArray(d.akses)) S.akses = d.akses;
    S.periodeIni = d.periode; S.hariIni = d.hariIni; S.lver = d.lver; S.gw = d.gw;
    if (d.cakupan) S.cakupan = d.cakupan;                       // v1.5: cakupan data peran (segmen & NPP)
    if (!S.periode || S.periode > S.periodeIni) S.periode = S.periodeIni;
    if (d.tpl) S.tpl = d.tpl;
    if (d.ds) terapkanData(d.ds);
    else { S.prodMap = {}; S.produk.forEach((p) => { S.prodMap[p.kode] = p; }); M.reset(); }
    S.lastSync = Date.now();
  }

  // ---------- Mulai ----------
  async function mulai() {
    if (!Api.sesi) return Auth.tampil(Idle.pesan());
    if (Idle.kedaluwarsa()) return Idle.keluar();
    Idle.reset(); Idle.mulai();
    document.body.classList.remove('is-login');
    S.me = Api.sesi.me;
    const adaCache = muatLokal();
    shell();
    if (adaCache) render(); else $('#view').innerHTML = skeleton();
    const r = await Api.call('boot', { ver: adaCache ? S.ver : '' });
    if (!r.success) {
      if (r.code === 'AUTH') return;
      if (!adaCache) $('#view').innerHTML = kosong('offline', 'Gagal memuat data', esc(r.message) + '<br><button class="btn btn-primary mt" data-g="reload">Coba lagi</button>');
      setOnline(false);
      return;
    }
    terapkanBoot(r.data);
    simpanBrand();
    shell();
    render();
    simpanLokal();
    Sync.mulai();
    setTimeout(prefetch, 400);
  }

  /** Muat data sekunder di belakang layar (1 eksekusi server via batch). */
  async function prefetch() {
    const calls = [{ action: 'log.list', data: {} }];
    const admin = S.me.peran === 'Admin';
    if (admin) calls.push({ action: 'user.list' }, { action: 'setting.get' }, { action: 'template.list' }, { action: 'blast.status' });
    const r = await Api.batch(calls);
    if (!r.success) return;
    const [lg, us, st, tp, bs] = r.data.results;
    if (lg && lg.success) { S.log = lg.data; S.logQ = {}; }
    if (admin) {
      if (us && us.success) S.users = us.data.users;
      if (st && st.success) S.adminSet = st.data;
      if (tp && tp.success) S.tplAll = tp.data.templates;
      if (bs && bs.success) S.devStatus = bs.data.perangkat || null;
    }
    notifikasi();
    if (['log', 'pengguna', 'pengaturan', 'template'].includes(halaman)) render();
  }

  // ---------- Shell (sidebar + header + footer) ----------
  function logoSvg(sz = 34) {
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F43F7A"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#lg)"/><rect x="10" y="21" width="5" height="10" rx="2.5" fill="#fff" opacity=".75"/><rect x="17.5" y="15" width="5" height="16" rx="2.5" fill="#fff" opacity=".9"/><rect x="25" y="9" width="5" height="22" rx="2.5" fill="#fff"/></svg>`;
  }
  // ---------- Identitas & logo (diatur Admin di Pengaturan → Logo Aplikasi) ----------
  const BRAND_DEF = { nama: 'FinSight', sub: 'Business Banking', logo: '', ukuran: 34, teks: true, lt: false, lu: 96 };
  const logoValid = (v) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(v || ''));
  function brand() {
    const st = S.setting || {};
    if (S.me && st.NAMA_APLIKASI !== undefined) {
      return { nama: st.NAMA_APLIKASI || BRAND_DEF.nama, sub: st.SUBJUDUL || BRAND_DEF.sub, logo: logoValid(st.LOGO_DATA) ? st.LOGO_DATA : '',
        ukuran: Math.max(24, Math.min(80, Number(st.LOGO_UKURAN) || 34)), teks: st.LOGO_TEKS !== 'tidak', ts: st.TURNSTILE_SITEKEY || '',
        lt: st.LOGIN_TEKS === 'ya', lu: Math.max(48, Math.min(160, Number(st.LOGIN_LOGO) || 96)) };
    }
    try { const b = Object.assign({}, BRAND_DEF, JSON.parse(localStorage.getItem('fs_brand') || '{}')); if (!logoValid(b.logo)) b.logo = ''; return b; } catch (e) { return Object.assign({}, BRAND_DEF); }
  }
  function simpanBrand(b) { try { localStorage.setItem('fs_brand', JSON.stringify(b || brand())); } catch (e) { /* penuh */ } }
  function logoHtml(b, sz) {
    return b && b.logo ? `<img class="logo-img" src="${esc(b.logo)}" alt="${esc(b.nama)}" style="height:${sz}px">` : logoSvg(sz);
  }
  function brandIsi(b) {
    return `${logoHtml(b, b.ukuran)}${b.teks ? `<div class="brand-t"><b>${esc(b.nama)}</b><span>${esc(b.sub)}</span></div>` : ''}`;
  }
  /** Perbarui logo di sidebar tanpa render ulang seluruh halaman. */
  function segarBrand() {
    const b = brand(), el = $('#side .brand');
    simpanBrand(b); pasangFavicon(b);
    $$('.top-logo').forEach((x) => { x.innerHTML = logoHtml(b, 28); });
    if (el) { el.className = 'brand' + (b.teks ? '' : ' no-teks'); el.style.setProperty('--logo', b.ukuran + 'px'); el.innerHTML = brandIsi(b); }
  }
  /** Menu yang boleh dibuka pengguna ini (dari server; cadangan: dihitung dari PERAN_AKSES). */
  function aksesKu() {
    if (!S.me) return [];
    if (S.me.peran === 'Admin') return MENU.map((m) => m[0]);
    if (Array.isArray(S.akses)) return S.akses;
    let m = {}; try { m = JSON.parse(S.setting.PERAN_AKSES || '{}') || {}; } catch (e) { m = {}; }
    return (m[S.me.peran] || []).concat(['pengaturan']);
  }
  const boleh = (p) => !!S.me && aksesKu().includes(RUTE_INDUK[p] || p);
  /** Pasang logo kustom juga sebagai ikon tab browser (favicon) & ikon pintasan iOS. */
  function pasangFavicon(b) {
    b = b || brand();
    const ganti = (sel, href, type) => { const el = document.querySelector(sel); if (!el) return; if (!el.dataset.asli) el.dataset.asli = el.getAttribute('href'); el.setAttribute('href', href || el.dataset.asli); if (type !== undefined) { if (href) el.setAttribute('type', type); else el.setAttribute('type', 'image/svg+xml'); } };
    const t = b.logo ? (b.logo.match(/^data:(image\/[a-z+]+)/) || [])[1] || 'image/png' : '';
    ganti('link[rel="icon"]', b.logo, t);
    ganti('link[rel="apple-touch-icon"]', b.logo);
    if (b.nama) document.title = document.title.replace(/^[^—|-]*?(?=\s[—|-]\s|$)/, b.nama);
  }

  function shell() {
    const app = $('#app');
    const st = S.setting || {}, br = brand();
    const peranLbl = labelPeran(S.me.peran);
    app.innerHTML = `
    <div class="blob blob-a"></div><div class="blob blob-b"></div>
    <aside class="side" id="side">
      <div class="side-top">
        <a class="brand${br.teks ? '' : ' no-teks'}" href="#/dashboard" style="--logo:${br.ukuran}px">${brandIsi(br)}</a>
        <nav class="nav">${navIsi()}</nav>
      </div>
      <div class="side-user">
        <div class="avatar">${esc(U.inisial(S.me.nama))}</div>
        <div class="su-t"><b>${esc(S.me.nama)}</b><span class="role-tag">${esc(peranLbl)}</span></div>
        <button class="btn-icon ghost" data-g="logout" title="Keluar" aria-label="Keluar">${ic('logout', 18)}</button>
      </div>
    </aside>
    <div class="side-scrim" data-g="side-close"></div>
    <div class="main">
      <header class="top">
        <button class="btn-icon ghost only-m" data-g="side-open" aria-label="Menu">${ic('menu', 20)}</button>
        <a class="top-logo only-m" href="#/dashboard" aria-label="${esc(br.nama)}">${logoHtml(br, 28)}</a>
        <div class="gsearch">
          ${ic('search', 17, 'gs-ic')}
          <input id="gsearch" type="search" placeholder="Cari debitur, rek, CIF, produk…" autocomplete="off" aria-label="Cari debitur">
          <kbd class="hide-m">/</kbd>
          <div class="gs-drop" id="gsDrop"></div>
        </div>
        <div class="top-r">
          <div class="sync-pill" id="syncPill" data-g="sync-now" title="Klik untuk cek pembaruan sekarang"></div>
          <button class="btn-icon bell" data-g="notif" aria-label="Notifikasi">${ic('bell', 19)}<span class="dot" id="bellDot" hidden></span></button>
          <button class="prof" data-g="profil" aria-label="Profil">${`<span class="avatar sm">${esc(U.inisial(S.me.nama))}</span>`}${ic('down', 15)}</button>
        </div>
      </header>
      ${Api.DEMO ? `<div class="demo-bar">${ic('info', 15)} <b>Mode demo</b> — data fiktif di browser. Isi <code>GAS_URL</code> di <code>js/config.js</code> untuk terhubung ke Google Sheets.</div>` : ''}
      <main id="view" class="view" tabindex="-1"></main>
      <footer class="foot">
        <span>${esc(st.NAMA_APLIKASI || 'FinSight')} © ${new Date().getFullYear()}${st.NAMA_INSTITUSI ? ' ' + esc(st.NAMA_INSTITUSI) : ''} • Terhubung ke Google Sheets</span>
        <span class="foot-l"><a href="#" data-g="bantuan" class="fl-a">Bantuan</a><a href="#" data-g="privasi" class="fl-b">Kebijakan Privasi</a><span class="muted fl-c">v${esc(VERSI_APP)}</span></span>
      </footer>
    </div>
    ${navBawah()}`;
    pasangFavicon(br);
    updatePeriode(); updatePill(); notifikasi(); tandaiNav();
  }

  function navIsi() {
    return MENU.filter((m) => boleh(m[0])).map((m) => m[0] === 'debitur' ? navDebitur(m) : `<a href="#/${m[0]}" data-nav="${m[0]}" class="nav-i" title="${esc(m[1])}">${ic(m[2], 19)}<span class="nav-t">${esc(m[1])}</span>${m[0] === 'blast' ? '<span class="nav-badge">Baru</span>' : ''}${m[0] === 'risiko' ? '<span class="nav-cnt" id="navRisk"></span>' : ''}</a>`).join('');
  }
  /** Bangun ulang menu samping (mis. setelah produk segmen / cakupan berubah). */
  function segarNav() { const n = $('.side .nav'); if (n) { n.innerHTML = navIsi(); tandaiNav(); } }
  /** v1.5: menu Daftar Debitur bertingkat & dapat diciutkan — SME (BCM, CCC) / SBP (BWU, CCC, KUR, KPP, KUR PMI), sesuai peran. */
  let navBuka = {};
  try { navBuka = JSON.parse(localStorage.getItem('fs_nav') || '{}') || {}; } catch (e) { navBuka = {}; }
  function simpanNav() { try { localStorage.setItem('fs_nav', JSON.stringify(navBuka)); } catch (e) { /* penuh */ } }
  function navDebitur(m) {
    const segs = SEG.milikku();
    const grup = (seg) => {
      const pr = SEG.produk(seg);
      return `<div class="nav-g" data-grp="${seg}"><div class="nav-r"><a href="#/debitur?seg=${seg}" class="nav-s" data-sub="debitur|${seg}|">${ic(seg === 'SME' ? 'building' : 'store', 15)}<span>${esc(SEG.NAMA[seg])}</span></a>
        <button type="button" class="nav-tg sm" data-g="navtg" data-k="${seg}" aria-label="Buka/ciutkan ${esc(SEG.NAMA[seg])}" aria-expanded="false">${ic('down', 14)}</button></div>
        <div class="nav-sub2">${pr.map((p) => p === 'KUR PMI'
          ? `<a href="#/debitur-pmi" class="nav-s2" data-sub="debitur-pmi||">${ic('plane', 13)}<span>KUR PMI</span></a>`
          : `<a href="#/debitur?seg=${seg}&pr=${encodeURIComponent(p)}" class="nav-s2" data-sub="debitur|${seg}|${esc(p)}"><i class="dot-p" style="--c:${(S.prodMap[p] || {}).warna || '#94A3B8'}"></i><span>${esc(p)}</span></a>`).join('')}</div></div>`;
    };
    return `<div class="nav-g akar" data-grp="deb"><div class="nav-r"><a href="#/debitur" data-nav="debitur" class="nav-i" title="${esc(m[1])}">${ic(m[2], 19)}<span class="nav-t">${esc(m[1])}</span></a>
      <button type="button" class="nav-tg" data-g="navtg" data-k="deb" aria-label="Buka/ciutkan Daftar Debitur" aria-expanded="false">${ic('down', 15)}</button></div>
      <div class="nav-sub">${segs.map(grup).join('')}</div></div>`;
  }
  /** Parameter rute (#/debitur?seg=SME&pr=CCC). */
  function param() { const q = (location.hash || '').split('?')[1] || ''; const o = {}; q.split('&').forEach((x) => { const [k, v] = x.split('='); if (k) o[k] = decodeURIComponent(v || ''); }); return o; }
  function bukaNav() {
    const p = param(), aktif = halaman === 'debitur' || halaman === 'debitur-pmi';
    $$('.nav-g[data-grp]').forEach((g) => {
      const k = g.dataset.grp;
      const paksa = aktif && (k === 'deb' || (halaman === 'debitur' && p.seg === k) || (halaman === 'debitur-pmi' && k === 'SBP'));
      const buka = navBuka[k] === undefined ? paksa : navBuka[k] || paksa;
      g.classList.toggle('open', !!buka);
      const b = g.querySelector(':scope > .nav-r > .nav-tg'); if (b) b.setAttribute('aria-expanded', buka ? 'true' : 'false');
    });
  }

  function updatePeriode() {          // v1.2: pemilih tanggal di bilah atas dihapus (tetap aman dipanggil)
    const el = $('#perTxt'); if (!el) return;
    const p = S.periode || S.periodeIni;
    if (!p) { el.textContent = '-'; return; }
    const akhir = p === S.periodeIni ? S.hariIni : U.tambahHari(U.periodeGeser(p, 1) + '-01', -1);
    el.innerHTML = `<b class="tnum">01</b> ${U.BLN[+p.slice(5, 7) - 1]} – <b class="tnum">${akhir.slice(8, 10)}</b> ${U.periodeLabel(akhir.slice(0, 7))}`;
  }

  function setOnline(v) { S.online = v; updatePill(); }
  function updatePill() {
    const el = $('#syncPill'); if (!el) return;
    if (!S.online) { el.className = 'sync-pill off'; el.innerHTML = `${ic('offline', 14)}<span>Offline — data tersimpan${S.lastSync ? ' ' + U.jam(S.lastSync) : ''}</span>`; return; }
    el.className = 'sync-pill' + (S.syncing ? ' busy' : '');
    el.innerHTML = `<span class="live"><i></i></span><span>Terakhir diperbarui: <b class="tnum">${S.lastSync ? U.jam(S.lastSync) : '—'}</b> <em>(Hampir real-time)</em></span>`;
  }

  /** Floating bottom navigation (HP): Dashboard, Daftar Debitur, [Kualitas Kredit], Penagihan, Menu (v1.3). */
  function navBawah() {
    const it = [['dashboard', 'Dashboard', 'dashboard'], ['debitur', 'Debitur', 'users'], ['kualitas', 'Kualitas', 'pie'], ['risiko', 'Penagihan', 'alert']]
      .filter((m) => boleh(m[0]));
    const btn = (m) => m[0] === 'kualitas'
      ? `<a href="#/kualitas" class="bn-i bn-c" data-bn="kualitas" aria-label="Kualitas Kredit"><span class="bn-fab">${ic('pie', 24)}</span><span class="bn-t">Kualitas</span></a>`
      : `<a href="#/${m[0]}" class="bn-i" data-bn="${m[0]}">${ic(m[2], 22)}<span class="bn-t">${m[1]}</span>${m[0] === 'risiko' ? '<i class="bn-dot" id="bnRisk" hidden></i>' : ''}</a>`;
    return `<nav class="bnav" id="bnav" aria-label="Navigasi utama">${it.map(btn).join('')}<button type="button" class="bn-i bn-menu" data-g="side-open" aria-label="Buka menu lengkap">${ic('grid', 22)}<span class="bn-t">Menu</span></button></nav>`;
  }

  function tandaiNav() {
    const induk = RUTE_INDUK[halaman] || halaman;
    const p = param(), kunci = halaman + '|' + (halaman === 'debitur' ? (p.seg || '') + '|' + (p.seg ? p.pr || '' : '') : '|');
    $$('.nav-i').forEach((a) => a.classList.toggle('on', a.dataset.nav === induk && (induk !== 'debitur' || kunci === 'debitur||')));
    $$('.nav-s, .nav-s2').forEach((a) => a.classList.toggle('on', a.dataset.sub === kunci));
    $$(".nav-g.akar").forEach((g) => g.classList.toggle('on', induk === 'debitur'));
    bukaNav();
    $$('.bn-i[data-bn]').forEach((a) => a.classList.toggle('on', a.dataset.bn === induk));
    const bm = $('.bn-menu');
    if (bm) bm.classList.toggle('on', !$$('.bn-i[data-bn]').some((a) => a.dataset.bn === induk));
    const br = $('#bnRisk');
    if (br && S.D.length) br.hidden = !M.kpi('ALL').risiko;
    const nr = $('#navRisk');
    if (nr && S.D.length) { const n = M.kpi('ALL').risiko; nr.textContent = n ? U.num(n) : ''; nr.hidden = !n; }
  }

  // ---------- Router ----------
  function rute() {
    const h = (location.hash || '#/dashboard').replace(/^#\/?/, '').split('?')[0] || 'dashboard';
    if (Pages[h] && boleh(h)) return h;
    const awal = MENU.find((m) => boleh(m[0]) && Pages[m[0]]);
    return awal ? awal[0] : 'pengaturan';
  }
  function go(p) { if (location.hash !== '#/' + p) location.hash = '#/' + p; else render(); }
  function render(opts = {}) {
    if (!S.me || !$('#view')) return;
    halaman = rute();
    tandaiNav();
    const v = $('#view');
    const scroll = opts.tetap ? window.scrollY : 0;
    if (!S.ds) { v.innerHTML = skeleton(); return; }
    try {
      v.innerHTML = Pages[halaman].render();
      if (Pages[halaman].mount) Pages[halaman].mount(v);
    } catch (e) {
      console.error(e);
      v.innerHTML = kosong('alertc', 'Terjadi kesalahan saat menampilkan halaman', esc(e.message));
    }
    S.perluRender = false;
    document.title = (Pages[halaman].judul || 'FinSight') + ' — ' + (S.setting.NAMA_APLIKASI || 'FinSight');
    if (!opts.tetap) { window.scrollTo(0, 0); } else window.scrollTo(0, scroll);
    $('#side') && $('#side').classList.remove('open');
    document.body.classList.remove('side-open');
  }
  /** Render ulang halaman aktif tanpa mengganggu pengguna yang sedang mengetik. */
  function renderAman() {
    const a = document.activeElement;
    if (a && $('#view') && $('#view').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { S.perluRender = true; return; }
    if (document.querySelector('.modal-wrap')) { S.perluRender = true; return; }
    render({ tetap: true });
  }

  // ---------- Sinkronisasi hampir real-time ----------
  const Sync = (() => {
    let t = null, aktifTerakhir = Date.now(), berjalan = false;
    const interval = () => {
      const dasar = Math.max(15, Math.min(120, Number(S.setting.POLLING_DETIK) || 30)) * 1000;
      return Date.now() - aktifTerakhir > 180000 ? Math.max(dasar, 60000) : dasar;   // diam > 3 mnt → 60 dtk
    };
    function jadwal() { clearTimeout(t); t = setTimeout(tick, interval()); }
    async function tick(paksa) {
      if (berjalan) return;
      if (document.hidden && !paksa) { jadwal(); return; }
      berjalan = true;
      try {
        const r = await Api.call('sync.ping', {});
        if (!r.success) { if (r.code !== 'AUTH') setOnline(false); return; }
        setOnline(true);
        const d = r.data;
        if (d.ver !== S.ver) await muatData(true);
        if (d.sver !== S.sver) { const awal = !S.sver; S.sver = d.sver; if (!awal) await muatMeta(); }
        if (d.lver !== S.lver) { S.lver = d.lver; await muatLog(); }
        S.lastSync = Date.now();
        updatePill();
      } finally { berjalan = false; jadwal(); }
    }
    function mulai() {
      jadwal();
      ['pointerdown', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, () => { aktifTerakhir = Date.now(); }, { passive: true }));
      document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - S.lastSync > 10000) tick(); });
      addEventListener('online', () => tick(true));
      addEventListener('offline', () => setOnline(false));
    }
    return { mulai, tick };
  })();

  async function muatData(beritahu) {
    S.syncing = true; updatePill();
    const r = await Api.call('data.debitur', { ver: S.ver });
    S.syncing = false;
    if (r.success && r.data.ds) {
      if (r.data.produk) S.produk = r.data.produk;
      terapkanData(r.data.ds);
      simpanLokal();
      notifikasi();
      renderAman();
      if (beritahu) U.toast('Data diperbarui dari Google Sheets (' + U.num(r.data.ds.n) + ' debitur).', 'info', 2600);
    }
    updatePill();
    return r;
  }
  async function muatMeta() {
    const r = await Api.call('boot', { ver: S.ver });
    if (r.success) { terapkanBoot(r.data); simpanLokal(); segarBrand(); segarNav(); renderAman(); }
  }
  async function muatLog() {
    const q = S.logQ || {};
    const r = await Api.call('log.list', q);
    if (r.success) { S.log = r.data; notifikasi(); if (halaman === 'log' || halaman === 'blast' || halaman === 'risiko') renderAman(); }
    const b = await Api.call('blast.status', {});
    if (b.success) { S.gw = b.data.gw; if (b.data.perangkat) S.devStatus = b.data.perangkat; }
  }

  // ---------- Notifikasi ----------
  let notifItems = [];
  function notifikasi() {
    if (!S.D.length) return;
    const k = M.kpi('ALL');
    const it = [];
    if (k.risiko) it.push({ ic: 'alert', c: 'neg', t: `${U.num(k.risiko)} debitur berisiko gagal bayar`, s: `Total kekurangan saldo ${U.rpS(k.kurang)}`, go: 'risiko' });
    const h3 = S.D.filter((d) => d.risiko && d.dd !== null && d.dd <= 3).length;
    if (h3) it.push({ ic: 'calclock', c: 'warn', t: `${U.num(h3)} debitur berisiko jatuh tempo ≤ 3 hari`, s: 'Prioritaskan penagihan preventif', go: 'risiko' });
    const turun = S.D.filter((d) => d.mv > 0).length;
    if (turun) it.push({ ic: 'downtrend', c: 'warn', t: `${U.num(turun)} debitur turun kolektibilitas bulan ini`, s: 'Lihat tabel pergerakan Kol.', go: 'kualitas' });
    if (S.gw) {
      if (S.gw.gagal) it.push({ ic: 'xcircle', c: 'neg', t: `${U.num(S.gw.gagal)} pesan WA gagal hari ini`, s: 'Periksa keterangan di Log Blast', go: 'log' });
      if (S.gw.antre) it.push({ ic: 'hourglass', c: 'info', t: `${U.num(S.gw.antre)} pesan WA dalam antrean`, s: 'Dikirim bertahap oleh sistem', go: 'log' });
      if (S.me.peran === 'Admin' && S.gw.mode === 'fonnte' && !S.gw.tokenAda) it.push({ ic: 'key', c: 'neg', t: 'Token gateway WA belum diisi', s: 'Pengaturan → Gateway WA', go: 'pengaturan' });
      if (S.me.peran === 'Admin' && S.gw.mode === 'simulasi') it.push({ ic: 'info', c: 'info', t: 'WA Blast dalam mode SIMULASI', s: 'Pesan tidak benar-benar dikirim', go: 'pengaturan' });
    }
    notifItems = it;
    const sidik = it.map((x) => x.t).join('|');
    const dot = $('#bellDot');
    if (dot) dot.hidden = !it.length || localStorage.getItem('fs_notif_baca') === sidik;
    tandaiNav();
  }

  // ---------- Popover (periode, notifikasi, profil) ----------
  function popover(anchor, html, cls = '') {
    tutupPopover();
    const r = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'pop ' + cls;
    el.innerHTML = html;
    document.body.appendChild(el);
    const w = el.offsetWidth;
    el.style.top = (r.bottom + 8) + 'px';
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => document.addEventListener('click', luarPop, true), 0);
    return el;
  }
  function luarPop(e) { const p = $('.pop'); if (p && !p.contains(e.target)) tutupPopover(); }
  function tutupPopover() { $$('.pop').forEach((p) => p.remove()); document.removeEventListener('click', luarPop, true); }

  function popPeriode(btn) {
    const ps = M.periodes().slice().reverse();
    const el = popover(btn, `<div class="pop-h">Periode tampilan</div>` + ps.map((p) =>
      `<button class="pop-i ${p === S.periode ? 'on' : ''}" data-p="${p}">${ic('calendar', 15)}<span>${U.periodeLabel(p, true)}</span>${p === S.periodeIni ? '<em>berjalan</em>' : '<em>snapshot</em>'}</button>`).join('') +
      `<div class="pop-f">Periode lalu memakai <b>Snapshot_Kol</b> (akhir bulan). Daftar per debitur selalu kondisi terkini.</div>`, 'pop-per');
    el.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { S.periode = b.dataset.p; tutupPopover(); updatePeriode(); render({ tetap: true }); });
  }
  function popNotif(btn) {
    const el = popover(btn, `<div class="pop-h">Notifikasi <span class="muted">${notifItems.length}</span></div>` +
      (notifItems.length ? notifItems.map((n, i) => `<button class="pop-n" data-i="${i}"><span class="pn-ic ${n.c}">${ic(n.ic, 16)}</span><span><b>${esc(n.t)}</b><small>${esc(n.s)}</small></span>${ic('right', 15)}</button>`).join('')
        : `<div class="pop-empty">${ic('ok', 22)}<p>Tidak ada notifikasi.</p></div>`), 'pop-notif');
    localStorage.setItem('fs_notif_baca', notifItems.map((x) => x.t).join('|'));
    $('#bellDot').hidden = true;
    el.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { tutupPopover(); go(notifItems[+b.dataset.i].go); });
  }
  function popProfil(btn) {
    const el = popover(btn, `<div class="pop-prof"><div class="avatar">${esc(U.inisial(S.me.nama))}</div><div><b>${esc(S.me.nama)}</b><small>NPP ${esc(S.me.npp)} • ${esc(labelPeran(S.me.peran))}</small></div></div>
      <button class="pop-i" data-x="set">${ic('settings', 15)}<span>Profil & Keamanan</span></button>
      ${installPrompt ? `<button class="pop-i" data-x="install">${ic('install', 15)}<span>Pasang aplikasi (PWA)</span></button>` : ''}
      <button class="pop-i" data-x="semua">${ic('phonem', 15)}<span>Keluar dari semua perangkat</span></button>
      <button class="pop-i danger" data-x="out">${ic('logout', 15)}<span>Keluar</span></button>`, 'pop-profil');
    el.querySelectorAll('[data-x]').forEach((b) => b.onclick = async () => {
      tutupPopover();
      const x = b.dataset.x;
      if (x === 'set') go('pengaturan');
      if (x === 'install' && installPrompt) { installPrompt.prompt(); installPrompt = null; }
      if (x === 'out') logout(false);
      if (x === 'semua' && await U.konfirmasi({ title: 'Keluar dari semua perangkat?', body: 'Sesi di semua browser/HP akan diakhiri. Anda perlu login ulang dengan kode authenticator.', ok: 'Keluar semua', bahaya: true })) logout(true);
    });
  }

  async function logout(semua) {
    Api.call('auth.logout', { semua: !!semua });
    Api.simpanSesi(null);
    hapusLokal();
    Idle.hapus();
    location.hash = '';
    location.reload();
  }

  /** Tutup sesi di perangkat ini tanpa memanggil server (dipakai saat sesi ditolak / NPP diganti). */
  function keluarPaksa(pesan) {
    Api.simpanSesi(null);
    Idle.hapus();
    hapusLokal();
    S.me = null; S.akses = null; S.users = null; S.adminSet = null;
    document.querySelectorAll('.modal-wrap, .modal-bg, .popover, .drawer, .dr-scrim, .idle-warn').forEach((x) => x.remove());
    document.body.classList.remove('side-open', 'modal-open');
    Auth.tampil(pesan);
  }

  // ---------- Keluar otomatis bila 5 menit tanpa aktivitas ----------
  // Aktivitas = klik/sentuh, ketik, gulir, gerak mouse. Polling data TIDAK dihitung.
  // Waktu aktivitas terakhir disimpan di localStorage agar berlaku lintas tab & saat tab
  // ditutup lalu dibuka kembali (> 5 menit → langsung diminta login ulang).
  const Idle = (() => {
    const BATAS = 5 * 60 * 1000, PERINGATAN = 30 * 1000, KUNCI = 'fs_aktif';
    let tAkhir = Date.now(), tSimpan = 0, timer = null, jalan = false, box = null;
    const baca = () => Math.max(tAkhir, Number(localStorage.getItem(KUNCI)) || 0);
    function tandai() {
      tAkhir = Date.now();
      if (tAkhir - tSimpan > 2000) { tSimpan = tAkhir; try { localStorage.setItem(KUNCI, String(tAkhir)); } catch (e) { /* abaikan */ } }
      if (box) tutupPeringatan();
    }
    function reset() { tAkhir = Date.now(); tSimpan = 0; try { localStorage.setItem(KUNCI, String(tAkhir)); } catch (e) { /* abaikan */ } }
    function hapus() { clearInterval(timer); jalan = false; tutupPeringatan(); localStorage.removeItem(KUNCI); }
    const kedaluwarsa = () => { const v = Number(localStorage.getItem(KUNCI)) || 0; return !!v && Date.now() - v >= BATAS; };
    function tutupPeringatan() { if (box) { box.remove(); box = null; } }
    function peringatan(sisa) {
      if (!box) {
        box = document.createElement('div');
        box.className = 'idle-warn'; box.setAttribute('role', 'alertdialog');
        box.innerHTML = `${ic('clock', 20)}<div><b>Tidak ada aktivitas</b><span>Anda akan keluar otomatis dalam <em class="tnum" id="idleSisa"></em> detik demi keamanan data.</span></div><button class="btn btn-primary btn-sm" type="button">Tetap masuk</button>`;
        box.querySelector('button').onclick = () => tandai();
        document.body.appendChild(box);
      }
      const e = box.querySelector('#idleSisa'); if (e) e.textContent = Math.max(0, Math.ceil(sisa / 1000));
    }
    function cek() {
      if (!Api.sesi) return hapus();
      const diam = Date.now() - baca();
      if (diam >= BATAS) return keluar();
      if (diam >= BATAS - PERINGATAN) peringatan(BATAS - diam); else tutupPeringatan();
    }
    function keluar() {
      hapus();
      Api.call('auth.logout', {});
      Api.simpanSesi(null);
      hapusLokal();
      try { sessionStorage.setItem('fs_idle', '1'); } catch (e) { /* abaikan */ }
      location.hash = '';
      location.reload();
    }
    function mulai() {
      if (jalan) return;
      jalan = true;
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, tandai, { passive: true, capture: true }));
      addEventListener('scroll', tandai, { passive: true, capture: true });
      let mm = 0;
      addEventListener('mousemove', () => { const n = Date.now(); if (n - mm > 1000) { mm = n; tandai(); } }, { passive: true });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) cek(); });
      addEventListener('storage', (e) => { if (e.key === KUNCI && box && Date.now() - (Number(e.newValue) || 0) < BATAS - PERINGATAN) tutupPeringatan(); });
      timer = setInterval(cek, 1000);
    }
    return { mulai, reset, hapus, kedaluwarsa, keluar, pesan: () => { const v = sessionStorage.getItem('fs_idle'); sessionStorage.removeItem('fs_idle'); return v ? 'Sesi diakhiri otomatis karena tidak ada aktivitas selama 5 menit. Silakan masuk kembali.' : ''; } };
  })();

  // ---------- Pencarian global ----------
  function cariGlobal(q) {
    const drop = $('#gsDrop');
    q = q.trim().toLowerCase();
    if (!q) { drop.classList.remove('show'); return; }
    const hasil = [];
    for (const d of S.D) { if (d.q.includes(q)) { hasil.push(d); if (hasil.length >= 8) break; } }
    drop.innerHTML = (hasil.length ? `<div class="gs-h">${U.num(hasil.length)}${hasil.length >= 8 ? '+' : ''} debitur cocok</div>` + hasil.map((d) => `<button class="gs-i" data-id="${esc(d.id)}"><span class="avatar xs" style="--c:${(S.prodMap[d.pr] || {}).warna || '#64748B'}">${esc(U.inisial(d.nm))}</span>
        <span class="gs-t"><b>${esc(d.nm)}</b><span class="gs-m">${d.rek ? `<span class="tnum">Rek ${esc(d.rek)}</span>` : ''}${d.cif ? `<span class="tnum">CIF ${esc(d.cif)}</span>` : ''}</span></span>
        <span class="gs-c">${UI.prod(d.pr)}${d.aktif ? UI.kol(d.kol, true) : UI.status(d.st)}</span></button>`).join('')
      : `<div class="gs-empty">Tidak ada debitur cocok dengan “${esc(q)}”.</div>`) +
      `<button class="gs-all" data-all="1">${ic('search', 14)} Tampilkan semua hasil di Daftar Debitur</button>`;
    drop.classList.add('show');
  }

  // ---------- Detail debitur (panel samping) ----------
  function detail(id) {
    if (String(id).indexOf('G:') === 0) { const g = S.grupDeb && S.grupDeb[id]; if (g) return detailGrup(g); }
    const d = S.byId[id];
    if (!d) return U.toast('Debitur tidak ditemukan (mungkin sudah dihapus dari sheet).', 'warn');
    const util = d.pl ? d.bd / d.pl * 100 : 0;
    const kunciLog = [id, d.rp, d.il].filter(Boolean).map(String);
    const riw = S.log ? S.log.rows.filter((r) => kunciLog.includes(String(r[5]))).slice(0, 8) : null;
    const pmi = d.pr === 'KUR PMI';
    const bisaWa = boleh('blast');
    const body = `
      <div class="dt-head"><span class="avatar lg" style="--c:${(S.prodMap[d.pr] || {}).warna || '#64748B'}">${esc(U.inisial(d.nm))}</span>
        <div><h4>${esc(d.nm)}</h4><div class="muted">${d.rek ? 'Rek ' + esc(d.rek) : ''}${d.cif ? (d.rek ? ' • ' : '') + 'CIF ' + esc(d.cif) : ''}${d.pt ? ' • ' + esc(UI.namaPt(d.pt)) : ''}</div>
        <div class="dt-tags">${UI.prod(d.pr)} ${UI.kol(d.kol)} ${UI.status(d.st)} ${d.oo ? '<span class="pill pill-grey">Opt-out WA</span>' : ''}</div></div></div>
      ${d.risiko ? `<div class="alert alert-neg">${ic('alert', 16)}<div><b>Berisiko gagal bayar</b> — ${d.fBlokir ? 'saldo blokir kosong' : ''}${d.fBlokir && d.fSaldo ? ' & ' : ''}${d.fSaldo ? 'saldo akhir < angsuran' : ''}. Kekurangan ${U.rp(d.kurang)}.</div></div>` : ''}
      ${pmi ? `<h5 class="dt-sub">Detail KUR PMI ${d.sx ? `<span class="tag pos">${ic('link', 11)} Spreadsheet KUR PMI</span>` : '<span class="tag">Sheet Debitur</span>'}</h5>
      <div class="dt-grid dt-pmi">
        <div class="span2"><span>Nama</span><b>${esc(d.nm)}</b></div>
        <div class="span2"><span>Perusahaan</span><b>${d.pu ? esc(d.pu) : '<span class="muted">Belum diisi</span>'}</b></div>
        <div class="span2"><span>Mitra KUR PMI (PT)</span><b>${d.pt ? esc(UI.namaPt(d.pt)) : '<span class="muted">Belum diisi</span>'}</b></div>
        <div><span>Jangka waktu</span><b>${d.jw ? esc(d.jw) : '<span class="muted">—</span>'}</b></div>
        <div><span>Batch</span><b>${d.bt ? esc(d.bt) : '<span class="muted">—</span>'}</b></div>
        <div class="span2"><span>Rek afiliasi (kunci)</span><b class="tnum">${d.ra ? esc(d.ra) : '<span class="muted">Belum diisi</span>'}</b></div>
      </div>
      ${!d.sx && S.ds && S.ds.sumberPmi ? `<p class="muted sm">${ic('info', 12)} Rek Afil ini belum ditemukan di spreadsheet KUR PMI.</p>` : ''}` : ''}
      <div class="dt-grid">
        <div><span>Rek pinjaman</span><b class="tnum">${d.rek ? esc(d.rek) : '<span class="muted">Belum diisi</span>'}</b></div>
        ${pmi ? `<div><span>CIF</span><b class="tnum">${d.cif ? esc(d.cif) : '<span class="muted">—</span>'}</b></div>` : `<div><span>Rek afiliasi</span><b class="tnum">${d.ra ? esc(d.ra) : '<span class="muted">Belum diisi</span>'}</b></div>`}
        <div><span>Plafon</span><b class="tnum">${U.rp(d.pl)}</b></div>
        <div><span>Baki debet</span><b class="tnum">${U.rp(d.bd)}</b></div>
        <div class="span2"><span>Utilisasi plafon</span><div class="bar"><i style="width:${Math.min(100, util)}%"></i></div><small class="tnum">${U.pct(util)}</small></div>
        <div><span>Angsuran</span><b class="tnum">${U.rp(d.an)}</b></div>
        <div><span>Jatuh tempo</span><b>${U.tgl(d.jt)}</b>${UI.jtInfo(d)}</div>
        <div><span>Saldo blokir</span><b class="tnum ${d.fBlokir ? 'neg' : ''}">${d.sb === null ? 'Kosong' : U.rp(d.sb)}</b></div>
        <div><span>Saldo akhir</span><b class="tnum ${d.fSaldo ? 'neg' : ''}">${U.rp(d.sa)}</b></div>
        <div><span>Kol. awal bulan</span><b>${d.kl ? 'Kol. ' + d.kl : '—'}</b>${d.mv ? `<small class="${d.mv > 0 ? 'neg' : 'pos'}">${d.mv > 0 ? 'Turun' : 'Naik'} ${Math.abs(d.mv)} tingkat</small>` : ''}</div>
        <div><span>Tgl booking</span><b>${d.tb ? U.tgl(d.tb) : '<span class="muted">—</span>'}</b></div>
        <div class="span2 dt-hp" id="dtHp"><span>No. HP debitur</span>${hpIsi(d)}</div>
        ${d.pic ? `<div><span>Kontak (PIC)</span><b>${esc(d.pic)}</b></div>` : ''}
        ${d.un ? `<div><span>Unit</span><b>${esc(SEG.namaUnit(d.un))}</b></div>` : ''}
        ${d.sg ? `<div><span>Segmen</span><b>${esc(d.sg)}</b></div>` : ''}
        ${d.rm || d.np ? `<div class="span2"><span>RM pengelola</span><b>${esc(d.rm || '—')}</b>${d.np ? `<small class="tnum">NPP ${esc(d.np)}</small>` : ''}</div>` : ''}
      </div>
      <h5 class="dt-sub">Riwayat WA (30 hari)</h5>
      ${riw === null ? '<p class="muted">Riwayat sedang dimuat…</p>' : riw.length ? `<ul class="dt-log">${riw.map((r) => `<li>${UI.logStatus(r[9])}<span><b>${esc(r[8])}</b><small>${U.tglJam(r[2])} • oleh ${esc(r[4])}</small></span></li>`).join('')}</ul>` : '<p class="muted">Belum ada pesan WA.</p>'}`;
    const m = U.modal({
      title: 'Detail Debitur', body, size: 'drawer', cls: 'drawer',
      footer: `<button class="btn btn-secondary" data-x="salin">${ic('copy', 16)} Salin No. Rek</button>${bisaWa ? `<button class="btn btn-primary" data-x="wa" ${d.wv && !d.oo && d.aktif ? '' : 'disabled title="Nomor tidak valid / opt-out / lunas"'}>${ic('send', 16)} Kirim WA</button>` : ''}`
    });
    m.el.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => {
      if (b.dataset.x === 'salin') U.salin(d.rek || d.ra || d.cif);
      if (b.dataset.x === 'wa') { m.close(); blastKe([d.id], 'Detail debitur'); }
    });
    pasangHp(m, d);
  }

  /** v1.6: Detail debitur SME dengan beberapa rekening pinjaman (CIF sama) — total + rincian tiap rekening. */
  function detailGrup(g) {
    const L = g.grup, d0 = g.utama;
    const kunciLog = new Set(); L.forEach((d) => [d.id, d.rp, d.il].filter(Boolean).forEach((k) => kunciLog.add(String(k))));
    const riw = S.log ? S.log.rows.filter((r) => kunciLog.has(String(r[5]))).slice(0, 10) : null;
    const bisaWa = boleh('blast');
    const util = g.pl ? g.bd / g.pl * 100 : 0;
    const produk = Array.from(new Set(L.map((d) => d.pr)));
    const rek = (d) => `<div class="dt-ln ${d.aktif ? '' : 'off'}">
        <div class="dt-ln-h"><b class="tnum">${d.rek ? esc(d.rek) : '<span class="muted">Rek belum diisi</span>'}</b>${UI.prod(d.pr)}${d.aktif ? UI.kol(d.kol, true) : UI.status(d.st)}</div>
        <div class="dt-grid dt-sm">
          <div><span>Plafon</span><b class="tnum">${U.rp(d.pl)}</b></div>
          <div><span>Baki debet</span><b class="tnum ${d.kol === 5 ? 'neg' : ''}">${U.rp(d.bd)}</b></div>
          <div><span>Angsuran</span><b class="tnum">${U.rp(d.an)}</b></div>
          <div><span>Jatuh tempo</span><b>${U.tgl(d.jt)}</b>${UI.jtInfo(d)}</div>
          <div><span>Saldo blokir</span><b class="tnum ${d.fBlokir ? 'neg' : ''}">${d.sb === null || d.sb === undefined ? 'Kosong' : U.rp(d.sb)}</b></div>
          <div><span>Saldo akhir</span><b class="tnum ${d.fSaldo ? 'neg' : ''}">${U.rp(d.sa)}</b></div>
          <div><span>Kol. awal bulan</span><b>${d.kl ? 'Kol. ' + d.kl : '—'}</b>${d.mv ? `<small class="${d.mv > 0 ? 'neg' : 'pos'}">${d.mv > 0 ? 'Turun' : 'Naik'} ${Math.abs(d.mv)} tingkat</small>` : ''}</div>
          <div><span>Tgl booking</span><b>${d.tb ? U.tgl(d.tb) : '<span class="muted">—</span>'}</b></div>
          ${d.ra ? `<div class="span2"><span>Rek afiliasi</span><b class="tnum">${esc(d.ra)}</b></div>` : ''}
        </div></div>`;
    const body = `
      <div class="dt-head"><span class="avatar lg" style="--c:${(S.prodMap[d0.pr] || {}).warna || '#64748B'}">${esc(U.inisial(g.nm))}</span>
        <div><h4>${esc(g.nm)}</h4><div class="muted">CIF ${esc(g.cif)} • ${U.num(L.length)} rekening pinjaman</div>
        <div class="dt-tags">${produk.map((p) => UI.prod(p)).join(' ')} ${UI.kol(g.kol)} ${UI.status(g.st)}</div></div></div>
      ${g.risiko ? `<div class="alert alert-neg">${ic('alert', 16)}<div><b>Berisiko gagal bayar</b> — ${L.filter((d) => d.risiko).length} rekening dengan saldo kurang / blokir kosong. Kekurangan ${U.rp(g.kurang)}.</div></div>` : ''}
      <h5 class="dt-sub">Total ${U.num(L.length)} rekening</h5>
      <div class="dt-grid">
        <div><span>Total plafon</span><b class="tnum">${U.rp(g.pl)}</b></div>
        <div><span>Total baki debet</span><b class="tnum">${U.rp(g.bd)}</b></div>
        <div class="span2"><span>Utilisasi plafon</span><div class="bar"><i style="width:${Math.min(100, util)}%"></i></div><small class="tnum">${U.pct(util)}</small></div>
        <div><span>Total angsuran</span><b class="tnum">${U.rp(g.an)}</b></div>
        <div><span>Jatuh tempo terdekat</span><b>${U.tgl(g.jt)}</b>${UI.jtInfo(g)}</div>
        <div><span>Total saldo blokir</span><b class="tnum ${g.fBlokir ? 'neg' : ''}">${g.sb === null ? 'Kosong' : U.rp(g.sb)}</b></div>
        <div><span>Total saldo akhir</span><b class="tnum ${g.fSaldo ? 'neg' : ''}">${U.rp(g.sa)}</b>${g.nRa > 1 ? `<small>${U.num(g.nRa)} rek afiliasi</small>` : ''}</div>
        <div class="span2 dt-hp" id="dtHp"><span>No. HP debitur</span>${hpIsi(d0)}</div>
        ${d0.pic ? `<div><span>Kontak (PIC)</span><b>${esc(d0.pic)}</b></div>` : ''}
        ${d0.un ? `<div><span>Unit</span><b>${esc(SEG.namaUnit(d0.un))}</b></div>` : ''}
        ${d0.sg ? `<div><span>Segmen</span><b>${esc(d0.sg)}</b></div>` : ''}
        ${d0.rm || d0.np ? `<div class="span2"><span>RM pengelola</span><b>${esc(d0.rm || '—')}</b>${d0.np ? `<small class="tnum">NPP ${esc(d0.np)}</small>` : ''}</div>` : ''}
      </div>
      <h5 class="dt-sub">Rincian per rekening pinjaman</h5>
      <div class="dt-lns">${L.map(rek).join('')}</div>
      <h5 class="dt-sub">Riwayat WA (30 hari)</h5>
      ${riw === null ? '<p class="muted">Riwayat sedang dimuat…</p>' : riw.length ? `<ul class="dt-log">${riw.map((r) => `<li>${UI.logStatus(r[9])}<span><b>${esc(r[8])}</b><small>${U.tglJam(r[2])} • oleh ${esc(r[4])}</small></span></li>`).join('')}</ul>` : '<p class="muted">Belum ada pesan WA.</p>'}`;
    const kirim = L.filter((d) => d.aktif && d.wv && !d.oo).map((d) => d.id);
    const m = U.modal({
      title: 'Detail Debitur', body, size: 'drawer', cls: 'drawer',
      footer: `<button class="btn btn-secondary" data-x="salin">${ic('copy', 16)} Salin No. Rek</button>${bisaWa ? `<button class="btn btn-primary" data-x="wa" ${kirim.length ? '' : 'disabled title="Nomor tidak valid / opt-out / lunas"'}>${ic('send', 16)} Kirim WA</button>` : ''}`
    });
    m.el.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => {
      if (b.dataset.x === 'salin') U.salin(L.map((d) => d.rek || d.ra).filter(Boolean).join(', '));
      if (b.dataset.x === 'wa') { m.close(); blastKe(kirim, 'Detail debitur'); }
    });
    pasangHp(m, d0, L.map((d) => d.id));
  }

  /** v1.5: No HP di Detail Debitur — semua peran hanya dapat menambah / mengganti No HP (data lain tetap dari base data). */
  function hpIsi(d, form) {
    if (form) return `<form class="hp-f" novalidate><input class="inp" id="hpIn" inputmode="tel" maxlength="16" placeholder="08xxxxxxxxxx" autocomplete="off" aria-label="Nomor HP debitur">
      <button class="btn btn-primary btn-sm" type="submit">${ic('check', 14)} Simpan</button><button class="btn btn-ghost btn-sm" type="button" data-hp="batal">Batal</button></form>
      <small class="muted">Nomor disimpan di sheet Kontak_Debitur (tidak tertimpa import) & tercatat di Audit_Log.</small>`;
    return `<div class="hp-v">${d.wa ? `<b class="tnum">${esc(d.wa)}</b>${d.hm ? '<span class="tag">ditambahkan di aplikasi</span>' : ''}` : '<b class="muted">Belum ada</b>'}
      <button class="btn btn-secondary btn-sm" type="button" data-hp="ubah">${ic(d.wa ? 'edit' : 'plus', 14)} ${d.wa ? 'Ganti No. HP' : 'Tambah No. HP'}</button></div>`;
  }
  function pasangHp(m, d, ids) {
    ids = ids && ids.length ? ids : [d.id];                    // v1.6: debitur SME per CIF → No HP disimpan ke semua rekeningnya
    const box = m.el.querySelector('#dtHp');
    if (!box) return;
    const gambar = (form) => {
      box.innerHTML = `<span>No. HP debitur</span>${hpIsi(d, form)}`;
      const ub = box.querySelector('[data-hp="ubah"]'); if (ub) ub.onclick = () => { gambar(true); setTimeout(() => { const i = box.querySelector('#hpIn'); if (i) i.focus(); }, 30); };
      const bt = box.querySelector('[data-hp="batal"]'); if (bt) bt.onclick = () => gambar(false);
      const f = box.querySelector('form');
      if (f) f.onsubmit = async (e) => {
        e.preventDefault();
        const v = box.querySelector('#hpIn').value.trim(), b = f.querySelector('[type="submit"]');
        if (!/^(\+?62|0)?8\d{7,12}$/.test(v.replace(/[\s.-]/g, ''))) return U.toast('Nomor HP tidak valid. Contoh: 081234567890.', 'warn');
        b.disabled = true; b.innerHTML = '<span class="spin"></span>';
        let r = null;
        for (const id of ids) { r = await Api.call('debitur.hp', { id, hp: v }); if (!r.success) break; }
        if (!r.success) { b.disabled = false; b.innerHTML = ic('check', 14) + ' Simpan'; return U.toast(r.message, 'err'); }
        d.wa = r.data.wa; d.wv = 1; d.hm = 1;
        gambar(false);
        U.toast(r.message, 'ok');
        await muatData(false);
      };
    };
    gambar(false);
  }

  /** Bawa daftar ID ke halaman WA Blast (langkah 2: pilih template). */
  function blastKe(ids, sumber, tplId) {
    if (!boleh('blast')) return U.toast('Peran Anda tidak dapat mengirim WA Blast.', 'warn');
    S.blast = { ids: ids.slice(), sumber, tplId: tplId || S.blast.tplId || '', step: ids.length ? (tplId ? 3 : 2) : 1, pilih: new Set(ids) };
    go('blast');
  }

  // ---------- Ekspor ----------
  function metaCetak(filter) {
    const st = S.setting;
    return [`Dicetak: ${U.tglJam(Date.now())} WIB oleh ${S.me.nama} (NPP ${S.me.npp}, ${labelPeran(S.me.peran)})`,
      `Filter: ${filter || 'Semua data'}`, (st.NAMA_INSTITUSI || st.NAMA_CABANG) ? [st.NAMA_INSTITUSI, st.NAMA_CABANG].filter(Boolean).join(' • ') : 'Dokumen RAHASIA — internal'];
  }
  /** Ekspor Excel format lama (kolom + baris) — kini memakai template laporan bergaya v1.2. */
  function eksporXlsx(judul, cols, rows, filter, extraSheets = [], opsi = {}) {
    const nama = judul.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_') + '_' + U.isoLokal(new Date()).replace(/-/g, '') + '.xlsx';
    const blob = XLSX.build([{ name: opsi.lembar || judul.slice(0, 31), judul, sub: opsi.sub, filter, ringkasan: opsi.ringkasan, satuan: opsi.satuan, cols, rows },
      ...extraSheets.map((x) => Object.assign({ judul: x.judul || (judul + ' — ' + x.name), filter }, x))], Laporan.umumXlsx());
    U.unduh(blob, nama);
    Api.call('ekspor.catat', { jenis: 'xlsx', judul, jumlah: rows.length, filter });
    U.toast(`Excel “${nama}” diunduh (${U.num(rows.length)} baris).`, 'ok');
  }
  const eksporPdf = (spec, btn) => Laporan.pdf(spec, btn);
  const cetak = (spec) => Laporan.cetak(spec);

  // ---------- Komponen kosong / skeleton ----------
  function kosong(icon, judul, teks) { return `<div class="empty">${ic(icon, 34)}<h4>${judul}</h4><p>${teks || ''}</p></div>`; }
  function skeleton() {
    return `<div class="sk-wrap"><div class="sk sk-title"></div><div class="grid g3">${'<div class="card sk-card"><div class="sk sk-ic"></div><div class="sk sk-l"></div><div class="sk sk-xl"></div></div>'.repeat(6)}</div>
      <div class="grid g12"><div class="card c8 sk-chart"><div class="sk sk-l"></div><div class="sk sk-block"></div></div><div class="card c4 sk-chart"><div class="sk sk-l"></div><div class="sk sk-circle"></div></div></div></div>`;
  }

  // ---------- Event global ----------
  function pasangEvent() {
    addEventListener('hashchange', () => { tutupPopover(); render(); });
    document.addEventListener('click', async (e) => {
      const g = e.target.closest('[data-g]');
      if (g) {
        const a = g.dataset.g;
        if (g.tagName === 'A') e.preventDefault();
        if (a === 'logout') logout(false);
        else if (a === 'keluar-bn') { if (await U.konfirmasi({ title: 'Keluar dari aplikasi?', body: 'Anda akan keluar dari FinSight di perangkat ini.', ok: 'Keluar' })) logout(false); }
        else if (a === 'side-open') { $('#side').classList.add('open'); document.body.classList.add('side-open'); }
        else if (a === 'side-close') { $('#side').classList.remove('open'); document.body.classList.remove('side-open'); }
        else if (a === 'periode') popPeriode(g);
        else if (a === 'notif') popNotif(g);
        else if (a === 'profil') popProfil(g);
        else if (a === 'sync-now') { S.syncing = true; updatePill(); await Sync.tick(true); S.syncing = false; updatePill(); }
        else if (a === 'reload') location.reload();
        else if (a === 'bantuan') bantuan();
        else if (a === 'navtg') { const gr = g.closest('.nav-g'); const buka = !gr.classList.contains('open'); navBuka[g.dataset.k] = buka; simpanNav(); gr.classList.toggle('open', buka); g.setAttribute('aria-expanded', buka ? 'true' : 'false'); }
        else if (a === 'privasi') privasi();
        return;
      }
      const gi = e.target.closest('.gs-i');
      if (gi) { $('#gsDrop').classList.remove('show'); detail(gi.dataset.id); return; }
      if (e.target.closest('.gs-all')) { S.f.deb = Object.assign(S.f.deb || {}, { q: $('#gsearch').value, hal: 1 }); $('#gsDrop').classList.remove('show'); go('debitur'); return; }
      if (!e.target.closest('.gsearch')) { const dr = $('#gsDrop'); if (dr) dr.classList.remove('show'); }
      const pi = e.target.closest('[data-per-ini]');
      if (pi) { e.preventDefault(); S.periode = S.periodeIni; updatePeriode(); render({ tetap: true }); return; }
      const det = e.target.closest('[data-detail]');
      if (det) { detail(det.dataset.detail); return; }
      const wa = e.target.closest('[data-wa]');
      if (wa) { blastKe([wa.dataset.wa], 'Aksi cepat'); return; }
      const gp = e.target.closest('[data-go]');
      if (gp) { e.preventDefault(); if (gp.dataset.tab) S.f[gp.dataset.go] = Object.assign(S.f[gp.dataset.go] || {}, { tab: gp.dataset.tab }); go(gp.dataset.go); }
    });
    document.addEventListener('input', U.debounce((e) => { if (e.target.id === 'gsearch') cariGlobal(e.target.value); }, 80));
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { const g = $('#gsearch'); if (g) { e.preventDefault(); g.focus(); } }
      if (e.target.id === 'gsearch' && e.key === 'Enter') { S.f.deb = Object.assign(S.f.deb || {}, { q: e.target.value, hal: 1 }); $('#gsDrop').classList.remove('show'); go('debitur'); }
    });
    document.addEventListener('focusout', () => { if (S.perluRender) setTimeout(() => { if (S.perluRender) renderAman(); }, 50); });
    // Sesi ditolak server (kedaluwarsa, dicabut, atau akun masuk di perangkat lain → tutup paksa).
    Api.onAuth((msg) => keluarPaksa(msg || 'Sesi berakhir. Silakan masuk kembali.'));
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  }

  function bantuan() {
    U.modal({
      title: 'Bantuan', size: 'md', body: `<ul class="help">
      <li><b>Pembaruan data</b>: edit langsung di Google Sheets. Aplikasi memeriksa perubahan tiap ${esc(S.setting.POLLING_DETIK || 30)} detik (indikator hijau di atas). Klik indikator untuk cek sekarang.</li>
      <li><b>Pencarian cepat</b>: tekan <kbd>/</kbd> di mana saja.</li>
      <li><b>WA Blast</b>: pesan masuk antrean lalu dikirim bertahap. Debitur opt-out & nomor tidak valid otomatis dilewati.</li>
      <li><b>Keamanan</b>: login memakai NPP + kata sandi + kode Microsoft Authenticator. HP hilang? Minta Admin “Reset 2FA”.</li></ul>`
    });
  }
  function privasi() {
    U.modal({ title: 'Kebijakan Privasi & Kerahasiaan', size: 'md', body: `<p>Data debitur bersifat <b>RAHASIA</b>. Gunakan aplikasi hanya untuk keperluan pekerjaan dan sesuai kebijakan keamanan informasi serta pelindungan data pribadi di institusi Anda.</p><ul class="help"><li>Nomor WhatsApp ditampilkan tersamar; nomor lengkap hanya dipakai server saat mengirim pesan.</li><li>Setiap login, ekspor, dan WA blast tercatat di Audit_Log.</li><li>Data tersimpan sementara di browser ini untuk mempercepat tampilan dan dihapus saat Anda keluar.</li></ul>` });
  }

  function init() {
    U.initTip();
    U.properAuto(document.body);
    U.mataAuto();                       // v1.3: tombol lihat/sembunyikan di semua kolom kata sandi
    pasangEvent();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w && w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) U.toast('Versi baru FinSight tersedia — muat ulang halaman untuk memperbarui.', 'info', 8000);
          });
        });
      }).catch(() => {});
    }
    if (Api.DEMO) {
      const s = document.createElement('script');
      s.src = './js/demo.js?v=' + VERSI_APP;
      s.onload = () => mulai();
      document.head.appendChild(s);
    } else mulai();
  }

  return { init, mulai, render, go, detail, blastKe, param, segarNav, eksporXlsx, eksporPdf, cetak, kosong, muatData, muatLog, simpanLokal, terapkanBoot, hapusLokal, tutupPopover, get halaman() { return halaman; }, logoSvg, logoHtml, brand, simpanBrand, segarBrand, pasangFavicon, aksesKu, boleh, labelPeran, keluarPaksa, aktif: () => Idle.reset(), Sync: () => Sync };
})();

document.addEventListener('DOMContentLoaded', App.init);
