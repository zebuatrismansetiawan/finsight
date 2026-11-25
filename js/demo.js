/* ==========================================================================
   FinSight — demo.js : backend tiruan di browser (HANYA mode demo)
   Dimuat otomatis bila GAS_URL di js/config.js belum diisi. Semua data FIKTIF.
   Meniru kontrak API backend Google Apps Script (bentuk respons sama).
   ========================================================================== */
'use strict';

window.DemoAPI = (() => {
  // ---------- PRNG deterministik ----------
  let seed = 20261121;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  const pilih = (a) => a[Math.floor(rnd() * a.length)];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const HARI = iso(new Date()), PERIODE = HARI.slice(0, 7);
  const geser = (p, n) => { let y = +p.slice(0, 4), m = +p.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad(m + 1); };

  // v1.7: daftar produk tetap (urutan tampil) — sama dengan PRODUK_BAKU server
  const PRODUK = [
    { kode: 'BCM', nama: 'BCM', urut: 1, warna: '#0EA5E9' }, { kode: 'SCF', nama: 'SCF (Supply Chain Financing)', urut: 2, warna: '#10B981' },
    { kode: 'KPP SUPPLY', nama: 'KPP Supply', urut: 3, warna: '#6366F1' }, { kode: 'CCC', nama: 'CCC (Cash Collateral)', urut: 4, warna: '#F43F7A' },
    { kode: 'BWU', nama: 'BWU (Bisnis Wirausaha)', urut: 5, warna: '#8B5CF6' }, { kode: 'KUR', nama: 'KUR (Kredit Usaha Rakyat)', urut: 6, warna: '#3B82F6' },
    { kode: 'KPP DEMAND', nama: 'KPP Demand', urut: 7, warna: '#14B8A6' }, { kode: 'KUR PMI', nama: 'KUR PMI', urut: 8, warna: '#F97316' }];
  const N_AKTIF = { BCM: 96, SCF: 34, 'KPP SUPPLY': 58, CCC: 864, BWU: 1120, KUR: 790, 'KPP DEMAND': 272, 'KUR PMI': 436 };
  const RANGE = { BCM: [1.5e9, 2.5e10], SCF: [5e8, 8e9], 'KPP SUPPLY': [3e8, 5e9], BWU: [1e8, 2e9], CCC: [1e8, 3e9], KUR: [2.5e7, 5e8], 'KUR PMI': [1e7, 1e8], 'KPP DEMAND': [2e8, 2.5e9] };
  const JW_DEMO = { BCM: ['12 bulan', '24 bulan'], SCF: ['6 bulan', '12 bulan'], 'KPP SUPPLY': ['12 bulan', '24 bulan'], CCC: ['12 bulan', '36 bulan', '60 bulan'], BWU: ['36 bulan', '48 bulan', '60 bulan'],
    KUR: ['24 bulan', '36 bulan', '48 bulan'], 'KPP DEMAND': ['60 bulan', '120 bulan', '180 bulan'], 'KUR PMI': ['12 bulan', '24 bulan', '36 bulan'] };
  const PRE = ['PT', 'CV', 'UD', 'Koperasi', 'Toko', 'Kelompok Tani'];
  const ORANG = ['Agung Nugroho', 'Dewi Sartika', 'Budi Hermawan', 'Rina Wulandari', 'Hendra Saputra', 'Sri Lestari', 'Andi Pratama', 'Yuliana Putri', 'Rudi Hartono', 'Maya Anggraini', 'Fajar Ramadhan', 'Nur Aini'];
  const KATA = ['Nusantara', 'Mandiri', 'Agro', 'Berkah', 'Surya', 'Logistik', 'Makmur', 'Sentosa', 'Teknik', 'Padi', 'Subur', 'Samudera', 'Karya', 'Bahari', 'Mega', 'Tirta', 'Kencana', 'Jaya', 'Abadi', 'Konstruksi', 'Sejahtera', 'Cahaya', 'Bintang', 'Timur', 'Prima', 'Graha', 'Perkasa', 'Lestari', 'Niaga', 'Sinar'];
  const PIC = ['Herman', 'Ibu Lestari', 'Bambang', 'Mandiri', 'Sukirno', 'Faisal', 'Irwan', 'Ridwan', 'Hendra', 'Yanto', 'Wati', 'Joko'];
  const RM = ['Siti Rahmawati', 'Dani Irawan', 'Budi Santoso', 'Andi Kurnia', 'Hendra Wijaya'];
  const NPP_RM = { 'Siti Rahmawati': '20001', 'Dani Irawan': '20002', 'Budi Santoso': '20003', 'Andi Kurnia': '20004', 'Hendra Wijaya': '40001' };
  const UNIT_DEMO = ['31100', '31100', '31100', '31102', '31105', '31107', '31160', '31162', '31106', '31161', 'KC Grandwisata', '31165', '31101', '31103', '31104', '31108', '31166'];
  const SEG_DEMO = { BCM: 'SME', SCF: 'SME', 'KPP SUPPLY': 'SME', BWU: 'SBP', KUR: 'SBP', 'KUR PMI': 'SBP', 'KPP DEMAND': 'SBP' };
  const kolAcak = () => { const r = rnd(); return r < 0.844 ? 1 : r < 0.934 ? 2 : r < 0.968 ? 3 : r < 0.989 ? 4 : 5; };
  const bulat = (n, k = 1e5) => Math.round(n / k) * k;

  const PT_DEMO = ['PT Minori Pemagang', 'PT Minori SSW', 'PT Aji', 'PT Nagomi', 'PT. Minori SSW', 'pt aji'];
  const EXT = new Map();          // detail KUR PMI dari "spreadsheet KUR PMI" (simulasi)
  let sumberPmi = null;
  // ---------- Dataset ----------
  const rows = [];
  let no = 10000;
  const EMP = ['Fuji Co., Ltd.', 'Toyota Boshoku Co., Ltd.', 'Daihatsu Motor Co., Ltd.', 'Kyowa Foods Co., Ltd.', 'Sakura Seiki K.K.', 'Yamato Logistics Co., Ltd.', 'Hokkaido Agri Farm', 'Nagoya Steel Works'];
  const buatProduk = (p) => {
    const nL = Math.round(N_AKTIF[p.kode] * 0.12);
    for (let i = 0; i < N_AKTIF[p.kode] + nL; i++) {
      const lunas = i >= N_AKTIF[p.kode];
      const [a, b] = RANGE[p.kode];
      const pl = bulat(a + Math.pow(rnd(), 1.8) * (b - a), 1e6);
      const kol = lunas ? 1 : kolAcak();
      const bd = lunas ? 0 : bulat(pl * (rnd() < 0.22 ? 0.12 + rnd() * 0.36 : 0.5 + rnd() * 0.48));
      const an = lunas ? 0 : bulat(pl / ri(24, 84) * 1.08, 1e4);
      const risiko = !lunas && rnd() < (kol >= 2 ? 0.09 : 0.011);
      // Tgl_Jatuh_Tempo: sebagian besar jauh ke depan; debitur berisiko/kol tinggi dekat atau lewat
      const dlt = lunas ? ri(-400, -10) : kol >= 3 ? ri(-60, 12) : risiko ? ri(-2, 12) : rnd() < 0.05 ? ri(0, 30) : ri(31, 1500);
      const jt = iso(new Date(Date.now() + dlt * 86400000));
      const blokirKosong = risiko && rnd() < 0.5;
      const sa = risiko ? bulat(an * rnd() * 0.6, 1e4) : bulat(an * (1.1 + rnd() * 4), 1e4);
      const sb = blokirKosong ? (rnd() < 0.5 ? null : 0) : (lunas ? 0 : an);
      const nm = rnd() < 0.72 ? pilih(PRE) + ' ' + pilih(KATA) + ' ' + pilih(KATA) + (rnd() < 0.3 ? ' ' + pilih(KATA) : '') : pilih(ORANG) + (rnd() < 0.5 ? ' (' + pilih(['Toko Grosir', 'Warung', 'Bengkel', 'Konveksi', 'Katering']) + ')' : '');
      const wv = rnd() > 0.025;
      const wa = wv ? '08' + ri(11, 59) + '-****-' + pad(ri(0, 99)) + pad(ri(0, 99)) : '';
      no += ri(1, 3);
      let kl = lunas ? null : kol;
      if (!lunas && rnd() < 0.015) kl = Math.min(5, Math.max(1, kol + (rnd() < 0.68 ? -1 : 1)));
      const rp = '10' + String(no).padStart(8, '0'), ra = '0' + (2 + (no % 6)) + String((no * 7919) % 100000000).padStart(8, '0');
      const rmNm = pilih(RM);
      const sg = SEG_DEMO[p.kode] || (rnd() < 0.55 ? 'SME' : rnd() < 0.8 ? 'SBP' : '');                 // v1.5: CCC bisa SME / SBP / belum diketahui
      const un = pilih(UNIT_DEMO);
      const tb = iso(new Date(Date.now() - ri(60, 1500) * 86400000));
      const pt = p.kode === 'KUR PMI' ? (rnd() < 0.03 ? '' : PT_DEMO[no % PT_DEMO.length]) : '';
      const cif = String(1000000 + no * 3);
      // v1.3: kunci debitur (id) = CIF (Debitur Umum) / Rek Afil (KUR PMI)
      const id = p.kode === 'KUR PMI' ? ra : cif;
      const jw0 = pilih(JW_DEMO[p.kode] || ['36 bulan']);                                              // v1.7: Jangka_Waktu dari base data
      const baris = [id, nm, cif, pilih(PIC), wa, wv ? 1 : 0, p.kode, pl, bd, jt, lunas ? 'Lunas' : 'Aktif', kol, sb, sa, an, rnd() < 0.02 ? 1 : 0, rmNm, kl, rp, ra, pt, '', jw0, '', 0,
        tb, un === 'KC Grandwisata' ? '31163' : un, NPP_RM[rmNm] || '', sg, 0, ''];
      baris.jw0 = jw0;
      rows.push(baris);
      if (p.kode === 'KUR PMI') EXT.set(ra, { jw: pilih(['12 bulan', '24 bulan', '36 bulan', '48 bulan']), bt: 'Batch ' + ri(1, 18), ada: rnd() < 0.93, pu: EMP[no % EMP.length] });
    }
  };
  PRODUK.forEach(buatProduk);
  // v1.7: produk di luar daftar (mis. OTHERS) tidak ditampilkan — hanya dilaporkan di rekonsiliasi
  const LUAR_DEMO = { OTHERS: 18 };
  rows.sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const COLS = ['id', 'nm', 'cif', 'pic', 'wa', 'wv', 'pr', 'pl', 'bd', 'jt', 'st', 'kol', 'sb', 'sa', 'an', 'oo', 'rm', 'kl', 'rp', 'ra', 'pt', 'il', 'jw', 'bt', 'sx', 'tb', 'un', 'np', 'sg', 'hm', 'pu'];
  // v1.6: debitur SME dengan CIF sama & beberapa rekening pinjaman (BCM; 1 CIF BCM + SCF; 1 CIF dengan Rek Afil sama)
  (() => {
    const bcm = rows.filter((r) => r[6] === 'BCM' && r[10] === 'Aktif').slice(0, 4);
    bcm.forEach((a, j) => {
      const nTambah = j === 0 ? 2 : 1;
      for (let k = 1; k <= nTambah; k++) {
        const b = a.slice(); no += 3; const rp = '10' + String(no).padStart(8, '0');
        b[0] = a[2] + '-' + rp; b[18] = rp; b.jw0 = a.jw0;
        if (j === 3) b[6] = 'SCF';
        b[7] = Math.round(a[7] * (0.3 + 0.2 * k) / 1e6) * 1e6; b[8] = Math.round(b[7] * 0.7 / 1e5) * 1e5; b[14] = Math.round(b[7] / 48 / 1e4) * 1e4; b[12] = b[14];
        if (j === 1) b[13] = a[13];                              // rek afil sama → saldo akhir tidak dijumlah 2×
        else { b[19] = '0' + String(no * 7).padStart(9, '0'); b[13] = b[14] * 3; }
        b[9] = iso(new Date(Date.now() + (40 + k * 30) * 864e5)); b[25] = iso(new Date(Date.now() - (200 + k * 90) * 864e5)); b[11] = k === 2 ? 2 : a[11]; b[17] = b[11];
        rows.push(b);
      }
    });
  })();
  // v1.5: 1 CIF dengan 2 rekening pinjaman (demo)
  (() => { const a = rows.find((r) => r[6] === 'CCC' && r[10] === 'Aktif'); if (!a) return; const b = a.slice(); b.jw0 = a.jw0; b[0] = a[2] + '-10' + String(no + 7).padStart(8, '0'); b[18] = '10' + String(no + 7).padStart(8, '0'); b[7] = Math.round(a[7] / 2); b[8] = Math.round(a[8] / 2); rows.push(b); })();
  let sumberPt = null;                                         // v1.5: sumber KUR PMI per PT (simulasi)
  let ver = String(Date.now()), lver = '1', sver = '1.1.1';
  function terapkanSumber() {
    let tanpa = 0;
    rows.forEach((r) => {
      if (r[6] !== 'KUR PMI') return;
      const x = EXT.get(r[19]);
      const ptOn = !!(sumberPt && sumberPt[r[20]] && sumberPt[r[20]].aktif !== false);   // sumber per PT (sama dengan server)
      if ((sumberPmi || ptOn) && x && x.ada) { r[22] = x.jw || r.jw0; r[23] = x.bt; r[24] = 1; } else { r[22] = r.jw0 || ''; r[23] = ''; r[24] = ptOn ? 1 : 0; if (sumberPmi) tanpa++; }
      r[30] = ptOn && x ? x.pu : '';                              // v1.6: Perusahaan (tempat kerja) dari sheet PT
    });
    return tanpa;
  }
  // ---------- v1.7: Tanggal Base Data (posisi data) — beberapa tanggal di "database" ----------
  const TGLS = (() => {
    const d0 = new Date(); d0.setHours(12, 0, 0, 0); d0.setDate(d0.getDate() - 1);           // posisi H-1 = terbaru
    const L = [iso(d0)];
    const d1 = new Date(d0); d1.setDate(d1.getDate() - 7); L.push(iso(d1));
    const d2 = new Date(d0.getFullYear(), d0.getMonth(), 0, 12); if (!L.includes(iso(d2))) L.push(iso(d2));   // akhir bulan lalu
    const d3 = new Date(d2); d3.setDate(15); if (!L.includes(iso(d3))) L.push(iso(d3));
    return L.filter((x, i, a) => a.indexOf(x) === i).sort().reverse();
  })();
  const hapusTgl = new Set();
  const tglList = () => TGLS.filter((t) => !hapusTgl.has(t));
  const hashS = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  /** Baris pada tanggal lama: baki debet sedikit lebih tinggi, sebagian kol lebih baik, kredit yang belum dibooking tidak ada. */
  function barisTgl(t, L) {
    const umur = Math.round((new Date(tglList()[0]) - new Date(t)) / 864e5);
    return L.filter((r) => (!r[25] || r[25] <= t) && hashS('baru' + r[0]) >= umur * 0.0009).map((r) => {      // kredit baru sejak tanggal itu belum ada
      const b = r.slice(), h = hashS(r[0] + t);
      if (b[10] === 'Aktif') b[8] = Math.round(b[8] * (1 + umur * 0.0009 + h * 0.004) / 1e5) * 1e5;
      if (b[11] >= 2 && h < 0.35) b[11] = b[11] - 1;
      if (b[10] === 'Lunas' && h < 0.5) { b[10] = 'Aktif'; b[8] = Math.round(b[7] * 0.08 / 1e5) * 1e5; b[11] = 1; }
      return b;
    });
  }
  const ds = (tglMinta) => { const t = terapkanSumber();
    // Sama dengan server: bila sumber per PT aktif, debitur KUR PMI yang tidak ada di sheet PT mana pun disembunyikan.
    const ptAktif = sumberPt ? Object.keys(sumberPt).filter((n) => sumberPt[n] && sumberPt[n].aktif !== false) : null;
    const vis0 = ptAktif ? rows.filter((r) => r[6] !== 'KUR PMI' || ptAktif.includes(r[20])) : rows;
    const tg = tglList(), target = tglMinta && tg.includes(tglMinta) ? tglMinta : tg[0] || '';
    const vis = target && target !== tg[0] ? barisTgl(target, vis0) : vis0;
    const per = target ? target.slice(0, 7) : PERIODE;
    const tglBase = tg.filter((x) => x < per + '-01')[0] || tg.filter((x) => x.slice(0, 7) === per && x < target).slice(-1)[0] || '';
    return { cols: COLS, rows: vis, n: vis.length, dibangun: Date.now(), periode: per, adaBaseline: true, ver: ver + (target && target !== tg[0] ? '@' + target : ''),
    tgl: target, tgls: tg.map((x) => ({ t: x, n: x === tg[0] ? vis0.length : barisTgl(x, vis0).length })), tglBase,
    kunci: { dup: [], nDup: 0, tanpa: [], nTanpa: 0, pmiTanpaSumber: t, pmiDisembunyikan: rows.length - vis.length, multi: 1 }, sumberPmi: sumberPmi ? { nama: sumberPmi.nama, n: sumberPmi.n } : null,
    rekon: rekonDemo(vis), kolom: { tb: true, un: true, np: true, sg: true, npH: 'NPP_RM', pu: !!sumberPt, jw: true, tg: true }, sumberPt: sumberPt ? { nama: 'Database KUR PMI (demo)', galat: '', pt: Object.keys(sumberPt).map((n) => ({ nama: n, n: rows.filter((r) => r[6] === 'KUR PMI' && r[20] === n).length, galat: '' })) } : null }; };
  /** v1.6: rekonsiliasi per produk (sama bentuknya dengan server). KPP di "database" tertulis KPP DEMAND. */
  function rekonDemo(vis) {
    const sumber = {}, tampil = {}, cif = {};
    rows.forEach((r) => { const raw = r[6] === 'KPP SUPPLY' ? 'KPP SUP' : r[6]; const x = sumber[raw] || (sumber[raw] = { asli: raw, pr: r[6], n: 0, pl: 0, bd: 0, dup: 0, tanpa: 0 }); x.n++; x.pl += r[7]; x.bd += r[8]; });
    vis.forEach((r) => { const x = tampil[r[6]] || (tampil[r[6]] = { pr: r[6], n: 0, cif: 0, aktif: 0, pl: 0, bd: 0 }); x.n++; if (r[10] === 'Aktif') x.aktif++; x.pl += r[7]; x.bd += r[8]; const k = r[6] + '|' + r[2]; if (!cif[k]) { cif[k] = 1; x.cif++; } });
    const urut = (o) => Object.values(o).sort((a, b) => b.n - a.n);
    Object.keys(LUAR_DEMO).forEach((k) => { sumber[k] = { asli: k, pr: '', n: LUAR_DEMO[k], pl: LUAR_DEMO[k] * 6e8, bd: LUAR_DEMO[k] * 4e8, dup: 0, tanpa: 0 }; });
    return { sumber: urut(sumber), tampil: urut(tampil), pindah: {}, pmiSembunyi: rows.length - vis.length, pmiBaru: 0, baris: rows.length + 18, luar: Object.assign({}, LUAR_DEMO), geser: 0 };
  }
  // ---------- v1.5: cakupan data per peran (sama dengan server) ----------
  const SEG_BAWAAN = { SME: ['BCM', 'CCC', 'SCF', 'KPP SUPPLY'], SBP: ['BWU', 'CCC', 'KUR', 'KPP DEMAND', 'KUR PMI'] };
  const UNIT_BAWAAN = [['31100', 'KCU Jababeka'], ['31102', 'KC Cikarang'], ['31105', 'KC Mutiara Gading'], ['31107', 'KC Tambun'], ['31160', 'KC RE Martadinata'], ['31162', 'KC Cibitung'], ['31106', 'KC Cikarang Baru'], ['31161', 'KC MM2100'], ['31163', 'KC Grandwisata'], ['31165', 'KC Wisma Asri'], ['31101', 'KC Bulak Kapal'], ['31103', 'KC Lippo Cikarang'], ['31104', 'KC Kalimas'], ['31108', 'KC Cikarang Central City'], ['31166', 'KC Delta Mas']].map((x) => ({ k: x[0], n: x[1] }));
  const aksesD = () => { let a = null; try { a = JSON.parse(setting.AKSES_DATA || 'null'); } catch (e) { a = null; } a = a || {}; return { unit: a.unit || UNIT_BAWAAN, kol: a.kol || {}, seg: a.seg || SEG_BAWAAN, segV: 3, peran: a.peran || { Manager: { s: '', n: 0, d: 1 } } }; };
  // v1.7: d = data mengikuti bawahan (downliner) — bawaan BBM / SME Credit Risk / Branch Manager
  const peranDef = (n) => { const l = String(n || '').toLowerCase(); if (/(^|[^a-z])(prm|arm)([^a-z]|$)/.test(l) || /program relationship/.test(l)) return { s: 'SBP', n: 1, d: 0 }; if (l === 'rm' || /^rm([^a-z]|$)/.test(l) || /relationship manager/.test(l)) return { s: 'SME', n: 1, d: 0 };
    if (/business banking manager|(^|[^a-z])bbm([^a-z]|$)|credit risk|branch manager|(^|[^a-z])bm([^a-z]|$)|kepala cabang|pemimpin cabang|pinca/.test(l)) return { s: '', n: 0, d: 1 }; return { s: '', n: 0, d: 0 }; };
  const aturPeran = (p) => (p === 'Admin' ? { s: '', n: 0, d: 0 } : aksesD().peran[p] || peranDef(p));
  const bawahan = (npp) => { const out = [], q = [npp], lihat = new Set([npp]); while (q.length) { const x = q.shift(); users.forEach((y) => { if (y.upliner === x && !lihat.has(y.npp)) { lihat.add(y.npp); out.push(y.npp); q.push(y.npp); } }); } return out.sort(); };
  const cakupan = (u) => { const p = aturPeran(u.peran);
    if (p.d) { const b = bawahan(u.npp); if (b.length) return { s: '', npp: '', bawah: [u.npp].concat(b), bawahBelum: false }; return { s: p.s || '', npp: p.n ? u.npp : '', bawah: null, bawahBelum: true }; }
    return { s: p.s || '', npp: p.n ? u.npp : '', bawah: null }; };
  const sufiks = (sc) => (sc.bawah ? '|B|' + Math.round(hashS(sc.bawah.join(',')) * 1e10).toString(36) : sc.s || sc.npp ? '|' + sc.s + '|' + sc.npp : '');
  const dsUntuk = (u, tgl) => {
    const D = ds(tgl), sc = cakupan(u);
    if (!sc.s && !sc.npp && !sc.bawah) return sc.bawahBelum ? Object.assign({}, D, { kunci: null, rekon: null, cakupan: { s: '', npp: '', bawah: 0, bawahBelum: true } }) : D;
    const a = aksesD();
    // v1.6: NPP login = kunci — bila filter NPP aktif, segmen tidak ikut menyaring; v1.7: downliner = NPP dirinya + bawahan
    const r = D.rows.filter((x) => (sc.bawah ? sc.bawah.includes(x[27]) : sc.npp ? x[27] === sc.npp : (!sc.s || (x[28] ? x[28] === sc.s : (a.seg[sc.s] || []).includes(x[6])))));
    const vb = String(D.ver).split('@');
    return Object.assign({}, D, { rows: r, n: r.length, ver: vb[0] + sufiks(sc) + (vb[1] ? '@' + vb[1] : ''), kunci: null, rekon: null,
      cakupan: { s: sc.s, npp: sc.npp, nppAktif: !!sc.npp, nppBelum: false, bawah: sc.bawah ? sc.bawah.length - 1 : 0, bawahBelum: !!sc.bawahBelum, bawahAktif: !!sc.bawah } });
  };
  const verU = (u) => ver + sufiks(cakupan(u));
  const byId = () => { const m = {}; rows.forEach((r) => { m[r[0]] = r; }); return m; };
  const rpKeId = () => { const m = {}; rows.forEach((r) => { if (r[18]) m[r[18]] = r[0]; }); return m; };

  // ---------- Snapshot 6 bulan ----------
  const snap = [];
  (() => {
    const agg = {};
    rows.forEach((r) => { const k = r[6] + '|' + (r[10] === 'Lunas' ? 'L' : r[11]); agg[k] = agg[k] || [0, 0, 0]; agg[k][0]++; agg[k][1] += r[7]; agg[k][2] += r[8]; });
    for (let m = 6; m >= 0; m--) {
      const p = geser(PERIODE, -m);
      Object.keys(agg).forEach((k) => {
        const [pr, kol] = k.split('|');
        const g = 1 - m * (0.008 + (kol === '1' ? 0.004 : kol === 'L' ? 0.03 : -0.006)) + (rnd() - 0.5) * 0.02;
        snap.push([p, pr, kol, Math.max(0, Math.round(agg[k][0] * g)), Math.round(agg[k][1] * g), Math.round(agg[k][2] * g * (1 + m * 0.004))]);
      });
    }
  })();

  // ---------- Pengguna, template, pengaturan ----------
  const users = [
    { npp: '10001', nama: 'Dewi Kartika', email: 'admin.demo@contoh.id', peran: 'Admin', status: 'Aktif', dibuat: new Date(Date.now() - 90 * 864e5).toISOString(), login: '' },
    { npp: '20001', nama: 'Siti Rahmawati', email: 'siti.demo@contoh.id', peran: 'RM', status: 'Aktif', dibuat: new Date(Date.now() - 80 * 864e5).toISOString(), login: '' },
    { npp: '20002', nama: 'Dani Irawan', email: '', peran: 'RM', status: 'Aktif', dibuat: new Date(Date.now() - 60 * 864e5).toISOString(), login: '' },
    { npp: '30001', nama: 'Bambang Sutrisno', email: 'bm.demo@contoh.id', peran: 'Manager', status: 'Aktif', dibuat: new Date(Date.now() - 70 * 864e5).toISOString(), login: '' },
    { npp: '20003', nama: 'Budi Santoso', email: '', peran: 'RM', status: 'Nonaktif', dibuat: new Date(Date.now() - 40 * 864e5).toISOString(), login: '' },
    { npp: '40001', nama: 'Hendra Wijaya', email: '', peran: 'PRM', status: 'Aktif', dibuat: new Date(Date.now() - 50 * 864e5).toISOString(), login: '' }];
  // v1.7: upliner (atasan) — Manager membawahi RM & PRM (data Dashboard Manager mengikuti bawahannya)
  users.forEach((x) => { x.upliner = ['20001', '20002', '20003', '40001'].includes(x.npp) ? '30001' : ''; });
  const SA_NPP = '10001';
  let tpl = [
    { id: 'TPL-001', nama: 'Reminder H-7 (Jadwal Angsuran)', isi: 'Yth. Bapak/Ibu {nama},\n\nKami mengingatkan angsuran kredit {produk} Anda sebesar *{angsuran}* akan jatuh tempo pada *{jatuh_tempo}*.\nMohon pastikan saldo rekening mencukupi sebelum tanggal tersebut.\n\nTerima kasih atas kerja samanya.\n— {cabang}', aktif: true, diperbarui: new Date(Date.now() - 20 * 864e5).toISOString(), oleh: '10001 Dewi Kartika' },
    { id: 'TPL-002', nama: 'Reminder H-3 (Defisit Saldo)', isi: 'Yth. Bapak/Ibu {nama},\n\nAngsuran {produk} Anda sebesar *{angsuran}* jatuh tempo pada *{jatuh_tempo}*. Saldo rekening saat ini belum mencukupi, kekurangan sekitar *{kekurangan}*.\nMohon segera melakukan setoran agar terhindar dari denda keterlambatan.\n\n— {cabang}', aktif: true, diperbarui: new Date(Date.now() - 12 * 864e5).toISOString(), oleh: '10001 Dewi Kartika' },
    { id: 'TPL-003', nama: 'Panggilan Mendesak (H-1 Jatuh Tempo)', isi: 'Yth. Bapak/Ibu {nama},\n\nAngsuran {produk} sebesar *{angsuran}* jatuh tempo BESOK ({jatuh_tempo}). Sisa baki debet Anda {baki_debet}.\nMohon konfirmasi setoran Anda dengan membalas pesan ini atau menghubungi RM Anda.\n\n— {cabang}', aktif: true, diperbarui: new Date(Date.now() - 5 * 864e5).toISOString(), oleh: '10001 Dewi Kartika' }];
  const KET = { NAMA_APLIKASI: 'Nama aplikasi di sidebar & judul', SUBJUDUL: 'Teks kecil di bawah logo', NAMA_INSTITUSI: 'Nama institusi di footer & laporan', NAMA_CABANG: 'Nama unit/cabang (placeholder {cabang} di template WA)', POLLING_DETIK: 'Interval cek pembaruan data di browser (detik, 15–120)', JT_HARI: 'Rentang "jatuh tempo" ke depan (hari)', WA_MODE: 'fonnte = kirim sungguhan, simulasi = uji alur tanpa mengirim (UAT)', WA_KUOTA_HARIAN: 'Batas pesan WA per hari', WA_BATCH: 'Pesan yang diproses per eksekusi pemicu (10–40)', WA_JEDA: 'Jeda acak antarpesan di gateway (detik, format min-maks)', TOTP_ISSUER: 'Nama yang tampil di aplikasi Authenticator', SESI_JAM: 'Lama sesi login (jam, 1–24)', LOGO_DATA: 'Logo aplikasi', LOGO_UKURAN: 'Ukuran logo di sidebar (piksel, 24–80)', LOGO_TEKS: 'Tampilkan nama aplikasi di samping logo (ya/tidak)', LOGIN_TEKS: 'Tampilkan nama & subjudul aplikasi di halaman login (ya/tidak)', LOGIN_LOGO: 'Tinggi logo di halaman login (piksel, 48–160)' };
  const setting = { NAMA_APLIKASI: 'FinSight', SUBJUDUL: 'Business Banking', NAMA_INSTITUSI: '', NAMA_CABANG: 'KC Contoh Jakarta', POLLING_DETIK: '30', JT_HARI: '30', WA_MODE: 'simulasi', WA_KUOTA_HARIAN: '1000', WA_BATCH: '25', WA_JEDA: '3-8', TOTP_ISSUER: 'FinSight Demo', SESI_JAM: '8', LOGO_DATA: '', LOGO_UKURAN: '34', LOGO_TEKS: 'ya', LOGIN_TEKS: 'tidak', LOGIN_LOGO: '96' };
  // Tampilan merek (logo, nama) disimpan di browser ini agar tetap ada setelah halaman dimuat ulang (seperti server sungguhan)
  const KB = 'fs_demo_brand', KUNCI_BRAND = ['NAMA_APLIKASI', 'SUBJUDUL', 'LOGO_DATA', 'LOGO_UKURAN', 'LOGO_TEKS', 'LOGIN_TEKS', 'LOGIN_LOGO'];
  try { const bb = JSON.parse(localStorage.getItem(KB) || '{}'); KUNCI_BRAND.forEach((k) => { if (typeof bb[k] === 'string') setting[k] = bb[k]; }); } catch (e) { /* abaikan */ }
  const simpanBrandDemo = () => { try { const o = {}; KUNCI_BRAND.forEach((k) => { o[k] = setting[k]; }); localStorage.setItem(KB, JSON.stringify(o)); } catch (e) { /* abaikan */ } };
  let token = { ada: false, samar: '' };
  setting.PERAN_AKSES = JSON.stringify({ RM: ['dashboard', 'kualitas', 'debitur', 'risiko', 'blast', 'log', 'pipeline'], PRM: ['dashboard', 'kualitas', 'debitur', 'risiko', 'blast', 'log', 'pipeline'], Manager: ['dashboard', 'kualitas', 'debitur', 'risiko', 'log', 'pipeline'] });
  setting.PMI_PT = JSON.stringify(['PT Minori Pemagang', 'PT Minori SSW', 'PT Aji', 'PT Nagomi']);
  setting.TURNSTILE_SITEKEY = ''; setting.AKTIVASI_JAM = '72';
  KET.PERAN_AKSES = 'Menu yang boleh dibuka tiap peran'; KET.PMI_PT = 'Daftar PT penempatan debitur KUR PMI';
  KET.TURNSTILE_SITEKEY = 'Site key Cloudflare Turnstile (publik)'; KET.AKTIVASI_JAM = 'Masa berlaku sandi awal (jam)';
  const KHUSUS = ['PERAN_AKSES', 'PMI_PT', 'TURNSTILE_SITEKEY', 'AKTIVASI_JAM', 'AKSES_DATA'];
  setting.AKSES_DATA = '';
  let pakDoc = null;
  let tsSecret = '';
  // v1.3 — Analisa (format surat & data) disimpan di memori tab ini
  let impSumber = '', impPeta = [];
  const JUDUL_PMI = [['A', 'No', '1'], ['B', 'Nama Lengkap', 'Siti Contoh'], ['C', 'Nama Perusahaan', 'PT Minori SSW'], ['D', 'Jangka Waktu', '36'], ['E', 'Rek Afil', '0533001122'], ['F', 'Batch', 'Batch 9']].map((x) => ({ kol: x[0], h: x[1], contoh: x[2] }));
  const surat = [], dataSurat = {};
  let aver = '1';
  // v1.4: Perangkat Analisa KUR PMI (format bawaan) — konfigurasi & data contoh FIKTIF
  let pakK = typeof PAK !== 'undefined' ? JSON.parse(JSON.stringify(PAK.CONTOH)) : { nama: 'Perangkat Analisa KUR PMI', kolom: [], ttd: {}, kantor: {}, kredit: { bunga: 6, batas: 60 }, pt: [], teks: {} };
  const XL_FIELD = (typeof XLK !== 'undefined' ? XLK.FIELD.map((f) => f.k) : []).concat(['b_ap', 'xl_ubah']);
  const tplDemo = (id) => (id === 'PAK-KUR' ? { id, nama: pakK.nama, penanda: pakK.kolom.map((f) => f.k), aktif: true } : id === 'XL-KUR' ? { id, nama: 'Format Excel KUR PMI', penanda: XL_FIELD, aktif: true } : surat.find((x) => x.id === id));
  // v1.7: Format Excel (INPUT + CALL MEMO + BNI 105) — 3 baris BATCH contoh, semua FIKTIF
  dataSurat['XL-KUR'] = [
    ['RINA KARTIKA', 'PT. Minori', 'Kumiai Contoh Satu', 'Pekerjaan Pengolahan Makanan', 36, 165000, 'Belum Menikah', 'Cirebon', '2002-03-14', 'P', 36, '2026-12-08', 49900000],
    ['DIMAS PRAKOSO', 'PT. Minori', 'Kumiai Contoh Dua', 'Pekerjaan Perakitan Mobil', 36, 182000, 'Belum Menikah', 'Indramayu', '2000-08-21', 'L', 36, '2026-12-15', 49900000],
    ['YOGI SAPUTRA', 'PT Aji', 'Kumiai Contoh Tiga', 'Pekerjaan Pengelasan', 12, 158000, 'Menikah', 'Kuningan', '1998-11-02', 'L', 12, '2026-12-20', 24900000]
  ].map((x, i) => ({ id: 'ANL-DEMO-XL-' + (i + 1), b: 'IMP-DEMO', t: Date.now() - (i + 1) * 864e5, o: '00001 Demo', d: { b_a: 301 + i, b_b: x[0], b_c: x[1], b_d: x[2], b_e: '3209000000000' + (101 + i), b_f: 'X' + (1000001 + i), b_g: 'V' + (2000001 + i), b_h: 'AL-' + (3001 + i),
    b_i: 'IBU CONTOH ' + (i + 1), b_j: '08xx-xxxx-' + (1000 + i), b_k: 'contoh' + (i + 1) + '@contoh.id', b_l: '', b_m: 'Aichi, Jepang', b_n: x[3], b_o: x[4], b_p: x[5], b_q: x[6], b_r: x[7], b_s: x[8], b_t: x[9], b_u: x[10], b_v: x[11],
    b_w: 'tidak ditemukan riwayat fasilitas kredit (SLIK bersih)', b_x: x[12], b_y: 24 - i * 2, b_z: 'KELUARGA CONTOH ' + (i + 1), b_aa: '08xx-xxxx-' + (2000 + i), b_ab: 'Jl. Contoh No. ' + (i + 1) + ' RT 00' + (i + 1) + '/00' + (i + 2) + ', Desa Contoh, Kec. Contoh, Kab. Contoh',
    b_ac: 'Jl. Contoh No. ' + (i + 1), b_ad: 'Jl. Contoh', b_ae: '00' + (i + 1) + '/00' + (i + 2), b_af: 'Desa Contoh', b_ag: 'Kec. Contoh', b_ah: 'Kab. Contoh', b_am: 695 + i, b_an: 0, b_ao: 104.6,
    xl_tglsurat: '2026-11-17', xl_tglmohon: '2026-11-12' } }));
  // v1.7: Pipeline (FIKTIF)
  const pipe = [
    { id: 'PL-DEMO-1', seg: 'SME', per: PERIODE, nm: 'PT Contoh Agro Lestari', bu: 'Perdagangan hasil pertanian', np: '20001', rm: 'Siti Rahmawati', sf: 'Baru', jk: 'KMK', fk: '', mk: 0, mm: 5e9, rc: 3e9, os: 0, nom: 0, net: 0, sp: 'KC Cikarang', kw: '', rb: '', w1: 'Kunjungan & pengumpulan dokumen', w2: 'Analisa kredit', w3: '', w4: '', w5: '', pt: 'Rp 500 jt', pk: '10 kartu', pp: '120 karyawan', dibuat: Date.now() - 6e8, oleh: '20001 Siti Rahmawati', diubah: Date.now() - 2e8, olehU: '20001 Siti Rahmawati' },
    { id: 'PL-DEMO-2', seg: 'SME', per: PERIODE, nm: 'CV Contoh Teknik Mandiri', bu: 'Jasa konstruksi', np: '20002', rm: 'Dani Irawan', sf: 'Tambahan', jk: 'KI', fk: '', mk: 2e9, mm: 3.5e9, rc: 1.5e9, os: 0, nom: 0, net: 0, sp: 'KC Tambun', kw: '', rb: '', w1: 'Penawaran tambahan plafon', w2: '', w3: '', w4: '', w5: '', pt: '', pk: '', pp: '45 karyawan', dibuat: Date.now() - 4e8, oleh: '20002 Dani Irawan', diubah: Date.now() - 4e8, olehU: '20002 Dani Irawan' },
    { id: 'PL-DEMO-3', seg: 'SBP', per: PERIODE, nm: 'Toko Contoh Berkah', bu: 'Toko kelontong', np: '40001', rm: 'Hendra Wijaya', sf: 'Tambahan', jk: 'BWU Reguler', fk: 'KMK', mk: 0, mm: 0, rc: 0, os: 1.2e8, nom: 3e8, net: 1.8e8, sp: '', kw: 'BM', rb: 'W3', w1: '', w2: '', w3: '', w4: '', w5: '', pt: '', pk: '', pp: '', dibuat: Date.now() - 3e8, oleh: '40001 Hendra Wijaya', diubah: Date.now() - 3e8, olehU: '40001 Hendra Wijaya' },
    { id: 'PL-DEMO-4', seg: 'SBP', per: PERIODE, nm: 'Usaha Contoh Laundry', bu: 'Jasa laundry', np: '40001', rm: 'Hendra Wijaya', sf: 'Baru', jk: 'KUR', fk: 'KMK', mk: 0, mm: 0, rc: 0, os: 0, nom: 1.5e8, net: 1.5e8, sp: '', kw: 'AH', rb: 'W2', w1: '', w2: '', w3: '', w4: '', w5: '', pt: '', pk: '', pp: '', dibuat: Date.now() - 2e8, oleh: '40001 Hendra Wijaya', diubah: Date.now() - 2e8, olehU: '40001 Hendra Wijaya' }];
  const PIPE_OPSI = { sifat: ['Baru', 'Tambahan'], jenis: ['BWU Prima', 'BWU Reguler', 'BWU Pandu', 'CCC', 'KUR', 'KPP', 'KUR PMI'], fasilitas: ['KI', 'KMK'], kewenangan: ['AH & SBX', 'AH', 'BM'], booking: ['W1', 'W2', 'W3', 'W4', 'W5'] };
  const opsiRm = (seg) => users.filter((x) => x.status === 'Aktif' && x.peran !== 'Admin' && (() => { const p = aturPeran(x.peran), df = peranDef(x.peran); return (df.s === seg && df.n) || (p.s === seg && p.n && !p.d); })()).map((x) => ({ npp: x.npp, nama: x.nama, peran: x.peran })).sort((a, b) => a.nama.localeCompare(b.nama));
  const pipeCak = (u) => { if (u.peran === 'Admin') return { semua: true, s: '' }; const sc = cakupan(u); if (sc.bawah) return { npp: sc.bawah }; if (sc.npp) return { npp: [sc.npp] }; return { semua: true, s: sc.s || '' }; };
  const bolehPipe = (cak, r, u) => (String(r.oleh || '').slice(0, 5) === u.npp) || (cak.semua ? (!cak.s || r.seg === cak.s) : cak.npp.includes(r.np));
  // v1.7: kebijakan sandi demo (riwayat & penguncian bertingkat) — sama dengan server
  const SANDI_HARI = 30;
  const sisaHari = (c) => (c && c.pa ? Math.max(0, SANDI_HARI - Math.floor((Date.now() - c.pa) / 864e5)) : null);
  const sandiPernah = (c, v) => !!(c && (c.pw === v || (c.hh || []).includes(v)));
  const pasangSandi = (c, v) => { if (c.pw) c.hh = [c.pw].concat(c.hh || []).slice(0, 24); c.pw = v; c.pa = Date.now(); c.ch = 0; };
  const PESAN_PERNAH = 'Kata sandi ini pernah Anda gunakan sebelumnya. Demi keamanan, buat kata sandi baru yang belum pernah dipakai.';
  const validSandi = (v, npp) => { v = String(v || ''); if (v.length < 8) return 'Kata sandi minimal 8 karakter.'; if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Kata sandi wajib kombinasi huruf dan angka.'; if (v.includes(npp) || (npp.replace(/^0+/, '').length >= 4 && v.includes(npp.replace(/^0+/, '')))) return 'Kata sandi tidak boleh mengandung NPP login Anda (' + npp + ').'; return ''; };
  dataSurat['PAK-KUR'] = [
    ['DEWI LESTARI', 'PT. Minori', '3209xxxxxxxx0001', 'Toyota Boshoku Co., Ltd.', 'Pekerjaan Pengelasan', 12, 16500000, 9950000, 12, 'Belum Menikah', 'P', '2002-04-11'],
    ['RIZKI PRATAMA', 'PT. Minori', '3209xxxxxxxx0002', 'Daihatsu Motor Co., Ltd.', 'Pekerjaan Perakitan Mobil', 36, 18200000, 33900000, 36, 'Belum Menikah', 'L', '2000-09-02'],
    ['AGUS SETIAWAN', 'PT Aji', '3209xxxxxxxx0003', 'Kyowa Foods Co., Ltd.', 'Pengolahan Makanan', 12, 15800000, 12500000, 12, 'Menikah', 'L', '1998-12-30']
  ].map((x, i) => ({ id: 'ANL-DEMO-PAK-' + (i + 1), b: 'IMP-DEMO', t: Date.now() - (i + 1) * 864e5, o: '00001 Demo', d: { nama: x[0], pt: x[1], nik: x[2], hp: '08xx-xxxx-' + (1000 + i), tempat: x[3], pekerjaan: x[4], lama: x[5], gaji: x[6], plafond: x[7], jw: x[8], status: x[9], jk: x[10], tgllahir: x[11], tmplahir: 'Cirebon',
    berangkat: '2026-12-0' + (i + 3), slik: 'ditemukan riwayat fasilitas kredit di Bank Contoh Outs. Rp. 0,- (lunas) dengan status lancar.', alamat: 'Jl. Contoh No. ' + (i + 1) + ', Kec. Contoh, Kab. Contoh', nopak: 'DEMO/4/KUR PMI/' + String(101 + i) + '/2026', tglpak: '2026-11-17', tglmohon: '2026-11-12', lain: 0 } }));
  const MENU_PERAN = ['dashboard', 'kualitas', 'debitur', 'risiko', 'pipeline', 'blast', 'template', 'log', 'analisa'];
  const peranAkses = () => { try { return JSON.parse(setting.PERAN_AKSES) || {}; } catch (e) { return {}; } };
  const menuPeran = (p) => (p === 'Admin' ? MENU_PERAN.concat(['pengguna', 'pengaturan']) : (peranAkses()[p] || null) ? peranAkses()[p].concat(['pengaturan']) : []);
  const labelPeran = (p) => (p === 'Admin' ? 'Super Admin' : p);
  const normPt = (v) => String(v || '').toLowerCase().replace(/^\s*p\.?\s*t\.?\s+/, '').replace(/[^a-z0-9]/g, '');
  // 1 akun = 1 perangkat: id sesi terakhir per NPP (disimpan di browser ini)
  const KS = 'fs_demo_sesi';
  const sesiAktif = () => { try { return JSON.parse(localStorage.getItem(KS) || '{}'); } catch (e) { return {}; } };

  // ---------- Log blast ----------
  const logs = [];
  (() => {
    const aktif = rows.filter((r) => r[10] === 'Aktif' && r[5] && !r[15]);
    for (let d = 29; d >= 0; d--) {
      const n = d === 0 ? ri(6, 14) : ri(8, 30);
      const t0 = new Date(); t0.setDate(t0.getDate() - d); t0.setHours(ri(8, 15), ri(0, 59), 0, 0);
      const batch = 'BL-' + iso(t0).slice(2).replace(/-/g, '') + '-' + pad(t0.getHours()) + pad(t0.getMinutes()) + '00-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const peng = pilih(['20001', '20002', '10001']), tp = pilih(tpl).id;
      for (let i = 0; i < n; i++) {
        const r = pilih(aktif), w = t0.getTime() + i * 4000;
        const st = rnd() < 0.94 ? 'Terkirim' : 'Gagal';
        logs.push({ id: batch + '-' + pad(i + 1), batch, w, npp: peng, idd: r[18], nm: r[1], tp, st, coba: 1, ket: st === 'Terkirim' ? 'Diterima gateway #' + ri(80000000, 89999999) : pilih(['Nomor tidak terdaftar di WhatsApp', 'Perangkat gateway terputus']), kirim: w + 6000 });
      }
    }
  })();

  // ---------- Kredensial demo (disimpan di browser ini) ----------
  const KC = 'fs_demo_cred';
  const cred = () => { try { return JSON.parse(localStorage.getItem(KC) || '{}'); } catch (e) { return {}; } };
  const setCred = (c) => localStorage.setItem(KC, JSON.stringify(c));
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function b32enc(bytes) { let bits = 0, val = 0, o = ''; bytes.forEach((b) => { val = (val << 8) | b; bits += 8; while (bits >= 5) { o += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }); if (bits) o += B32[(val << (5 - bits)) & 31]; return o; }
  function b32dec(s) { let bits = 0, val = 0; const o = []; for (const ch of s.replace(/[^A-Z2-7]/g, '')) { val = (val << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { o.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(o); }
  async function totp(secret, step) {
    const key = await crypto.subtle.importKey('raw', b32dec(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const c = new ArrayBuffer(8); new DataView(c).setUint32(4, step >>> 0);
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, c));
    const o = h[19] & 15;
    return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
  }
  async function cekTotp(secret, kode, ls) {
    const now = Math.floor(Date.now() / 30000);
    for (let d = -1; d <= 1; d++) { const L = now + d; if (ls && L <= ls) continue; if (await totp(secret, L) === kode) return L; }
    return -1;
  }
  const b64u = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  const tok = (p) => b64u(p) + '.demo';
  const bacaTok = (t) => { try { const p = unb64u(String(t).split('.')[0]); return p.x > Date.now() ? p : null; } catch (e) { return null; } };
  const ok = (data, message) => ({ success: true, data: data === undefined ? null : data, message: message || '' });
  const fail = (message, code, data) => ({ success: false, message, code: code || 'ERROR', data: data || null });
  const me = (u) => ({ npp: u.npp, nama: u.nama, peran: u.peran, email: u.email });
  let alasanSesi = '';
  const sesi = (t) => {
    alasanSesi = '';
    const p = bacaTok(t); if (!p || p.s) return null;
    const aktif = sesiAktif()[p.n];
    if (aktif && p.j !== aktif) { alasanSesi = 'LAIN'; return null; }
    const u = users.find((x) => x.npp === p.n); if (!u || u.status !== 'Aktif' || u.peran !== p.r) return null; return u;
  };
  const gagalSesi = () => (alasanSesi === 'LAIN' ? fail('Akun Anda baru saja masuk di perangkat lain. Sesi di perangkat ini ditutup otomatis.', 'AUTH', { alasan: 'LAIN' }) : fail('Sesi berakhir. Silakan masuk kembali.', 'AUTH'));
  const keamanan = (npp) => { const c = cred()[npp]; if (c && c.blokir) return 'Diblokir'; if (c && c.kunci > Date.now()) return 'Terkunci';
    return !c || !c.pw ? 'Belum aktivasi' : c.ch ? 'Wajib ganti sandi' : sisaHari(c) === 0 ? 'Sandi kedaluwarsa' : !c.t ? 'Belum 2FA' : '2FA aktif'; };
  /** v1.7: salah 5× → 15 menit, 7× → 30 menit, 10× → diblokir (hanya Super Admin yang membuka). */
  const gagal = (npp) => {
    const all = cred(), c = all[npp] || (all[npp] = {}), n = (c.g = (c.g || 0) + 1);
    let pesan = '';
    if (n >= 10) { c.blokir = Date.now(); pesan = ' Akun DIBLOKIR karena 10x salah. Hubungi Super Admin untuk membuka blokir.'; }
    else if (n === 5 || n === 7) { c.kunci = Date.now() + (n === 5 ? 15 : 30) * 6e4; pesan = ' Akun dikunci ' + (n === 5 ? 15 : 30) + ' menit.'; }
    else { const L = n < 5 ? 5 : n < 7 ? 7 : 10, sisa = L - n; if (sisa <= 2) pesan = L === 10 ? ' Sisa ' + sisa + ' percobaan sebelum akun DIBLOKIR (hanya dapat dibuka Super Admin).' : ' Sisa ' + sisa + ' percobaan sebelum akun dikunci ' + (L === 5 ? 15 : 30) + ' menit.'; }
    setCred(all); return pesan;
  };
  const kunciPesan = (c) => (c && c.blokir ? 'Akun DIBLOKIR karena 10x salah kata sandi / kode. Hanya Super Admin yang dapat membuka blokir (Pengguna & Peran → Reset akses → Buka kunci akun).'
    : c && c.kunci > Date.now() ? 'Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi ' + Math.ceil((c.kunci - Date.now()) / 6e4) + ' menit lagi atau hubungi Super Admin.' : '');

  // ---------- Statistik log ----------
  const hariIniMs = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function statHari() {
    const t = hariIniMs(), s = { terkirim: 0, gagal: 0, antre: 0, batal: 0, total: 0 };
    logs.forEach((l) => { if (l.w < t) return; s.total++; if (l.st === 'Terkirim') s.terkirim++; else if (l.st === 'Gagal') s.gagal++; else if (l.st === 'Batal') s.batal++; else s.antre++; });
    return s;
  }
  const gw = (u) => { const s = statHari(); return { mode: setting.WA_MODE, tokenAda: token.ada, kuota: +setting.WA_KUOTA_HARIAN, terkirim: s.terkirim, gagal: s.gagal, antre: s.antre, bolehKirim: u && u.peran !== 'Manager' }; };

  let mutasiAkhir = Date.now();
  // Hak akses rute = sama dengan server: '*' semua peran, 'A' Super Admin saja, ['menu',…] butuh salah satu menu
  const ROLES = {
    'blast.kirim': ['blast'], 'blast.proses': ['blast'], 'blast.batal': ['blast'], 'template.list': ['blast', 'template'], 'template.simpan': ['template'], 'wa.tes': 'A',
    'user.list': 'A', 'user.simpan': 'A', 'user.reset': 'A', 'user.gantiNpp': 'A', 'peran.simpan': 'A', 'pmi.simpan': 'A', 'setting.get': 'A', 'setting.simpan': 'A', 'rahasia.simpan': 'A', 'snapshot.jalankan': 'A', 'import.run': 'A',
    'pmi.sumber.simpan': 'A', 'pmi.sumber.hapus': 'A', 'pmi.sumber.info': 'A', 'keamanan.status': 'A', 'keamanan.simpan': 'A',
    'analisa.template.list': ['analisa'], 'analisa.template.ambil': ['analisa'], 'analisa.template.simpan': 'A', 'analisa.template.hapus': 'A',
    'analisa.data.list': ['analisa'], 'analisa.data.impor': ['analisa'], 'analisa.data.hapus': ['analisa'], 'analisa.catat': ['analisa'],
    'analisa.pak.konfig': ['analisa'], 'analisa.pak.simpan': 'A', 'import.info': 'A', 'import.peta': 'A', 'import.peta.simpan': 'A',
    'analisa.pak.docs': 'A', 'akses.info': 'A', 'akses.simpan': 'A', 'akses.cek': 'A', 'pmi.pt.info': 'A', 'pmi.pt.baca': 'A', 'pmi.pt.simpan': 'A', 'pmi.pt.hapus': 'A',
    'cache.refresh': 'A', 'data.tanggal.hapus': 'A', 'analisa.data.ubah': ['analisa'], 'pipeline.list': ['pipeline'], 'pipeline.simpan': ['pipeline'], 'pipeline.hapus': ['pipeline']   // v1.7
  };
  const boleh = (u, a) => { const r = ROLES[a]; if (!r || u.peran === 'Admin') return true; if (r === 'A') return false; const m = menuPeran(u.peran); return r.some((x) => m.includes(x)); };

  async function proses(body) {
    const a = body.action, d = body.data || {};
    if (a === 'batch') {
      const u = sesi(body.token); if (!u) return gagalSesi();
      const results = [];
      for (const c of body.calls || []) results.push(await proses({ action: c.action, data: c.data, token: body.token }));
      return ok({ results });
    }
    // ----- alur login (publik)
    if (a === 'auth.login') {
      const npp = String(d.npp || ''), u = users.find((x) => x.npp === npp), c = cred()[npp];
      if (!/^\d{5}$/.test(npp)) return fail('NPP harus 5 digit angka.', 'VALIDATION');
      if (tsSecret && setting.TURNSTILE_SITEKEY && !d.ts) return fail('Selesaikan verifikasi keamanan (Cloudflare) terlebih dahulu.', 'TURNSTILE');
      if (kunciPesan(c)) return fail(kunciPesan(c), 'LOCKED');
      if (u && !u.peran) return fail('Akun ini tidak memiliki peran yang valid. Hubungi Super Admin.', 'FORBIDDEN');
      const aktif = c && c.pw;
      const cocok = u && u.status === 'Aktif' && (aktif ? c.pw === d.password : d.password === npp);
      if (!cocok) { const ps = u ? gagal(npp) : ''; return fail('NPP atau kata sandi salah.' + ps, 'AUTH_FAIL'); }
      { const all = cred(); if (all[npp] && all[npp].pw && !all[npp].pa) { all[npp].pa = Date.now(); setCred(all); } }     // hitungan salah kembali 0 hanya setelah login penuh
      if (!aktif || c.ch) return ok({ langkah: 'GANTI_SANDI', tiket: tok({ n: npp, s: 'pw', x: Date.now() + 6e5 }), nama: u.nama, pertama: !aktif });
      if (sisaHari(cred()[npp]) === 0) return ok({ langkah: 'GANTI_SANDI', tiket: tok({ n: npp, s: 'pw', x: Date.now() + 6e5 }), nama: u.nama, pertama: false, kedaluwarsa: true, hari: SANDI_HARI });
      if (!c.t) return ok(await mulai2fa(u));
      return ok({ langkah: 'OTP', tiket: tok({ n: npp, s: 'otp', x: Date.now() + 6e5 }), nama: u.nama });
    }
    if (a === 'auth.gantiSandi') {
      const p = bacaTok(d.tiket); if (!p || p.s !== 'pw') return fail('Langkah login kedaluwarsa. Silakan masuk ulang dari awal.', 'AUTH');
      const v = String(d.baru || ''), u = users.find((x) => x.npp === p.n);
      const gl = validSandi(v, p.n); if (gl) return fail(gl, 'VALIDATION');
      const c = cred(); c[p.n] = c[p.n] || {};
      if (sandiPernah(c[p.n], v)) return fail(PESAN_PERNAH, 'PERNAH');
      pasangSandi(c[p.n], v); setCred(c);
      if (!c[p.n].t) return ok(await mulai2fa(u), 'Kata sandi berhasil diganti.');
      return ok({ langkah: 'OTP', tiket: tok({ n: p.n, s: 'otp', x: Date.now() + 6e5 }), nama: u.nama }, 'Kata sandi berhasil diganti.');
    }
    if (a === 'app.brand') return ok({ nama: setting.NAMA_APLIKASI, sub: setting.SUBJUDUL, logo: setting.LOGO_DATA || '', ukuran: +setting.LOGO_UKURAN || 34, teks: setting.LOGO_TEKS !== 'tidak', sver, ts: tsSecret ? setting.TURNSTILE_SITEKEY : '',
      lt: setting.LOGIN_TEKS === 'ya', lu: Math.max(48, Math.min(160, +setting.LOGIN_LOGO || 96)) });
    if (a === 'auth.qrBaru' || a === 'auth.verifikasi2fa') {
      const p = bacaTok(d.tiket);
      if (!p || p.s !== '2fa') return fail('Langkah login kedaluwarsa. Silakan masuk ulang dari awal.', 'AUTH');
      const x = cred()[p.n] || {};
      if (x.t && !x.tp) return fail('QR ini sudah dipakai. Authenticator sudah aktif — silakan masuk ulang dan gunakan kode dari aplikasi.', 'QR_USED');
      if (!x.tq || x.tq !== p.q) return fail('QR ini sudah tidak berlaku karena QR baru dibuat di perangkat/jendela lain. Silakan masuk ulang.', 'QR_REPLACED');
      if (a === 'auth.qrBaru') return ok(await mulai2fa(users.find((y) => y.npp === p.n)), 'QR baru dibuat. QR sebelumnya tidak berlaku lagi.');
      if (Date.now() > x.tx + 30e3) return fail('Masa berlaku QR habis. Buat QR baru lalu pindai ulang.', 'QR_EXPIRED');
    }
    if (a === 'auth.verifikasi2fa' || a === 'auth.otp') {
      const p = bacaTok(d.tiket), lingkup = a === 'auth.otp' ? 'otp' : '2fa';
      if (!p || p.s !== lingkup) return fail('Langkah login kedaluwarsa. Silakan masuk ulang dari awal.', 'AUTH');
      const c = cred(), x = c[p.n], u = users.find((y) => y.npp === p.n);
      const sec = lingkup === '2fa' ? x.tp : x.t;
      if (lingkup === 'otp' && kunciPesan(x)) return fail(kunciPesan(x), 'LOCKED');
      const L = await cekTotp(sec, String(d.kode || ''), lingkup === 'otp' ? x.ls : 0);
      if (L < 0) { const ps = lingkup === 'otp' ? gagal(p.n) : ''; return fail((lingkup === '2fa' ? 'Kode tidak cocok. Pastikan jam ponsel otomatis lalu masukkan kode terbaru.' : 'Kode authenticator salah atau sudah dipakai.') + ps, 'OTP_FAIL'); }
      if (lingkup === '2fa') { x.t = x.tp; x.ta = Date.now(); delete x.tp; delete x.tq; delete x.tx; }
      x.ls = L; x.g = 0; setCred(c);
      u.login = new Date().toISOString();
      const j = Math.random().toString(36).slice(2, 10), sa = sesiAktif(); sa[u.npp] = j; localStorage.setItem(KS, JSON.stringify(sa));
      return ok({ langkah: 'SELESAI', token: tok({ n: u.npp, r: u.peran, i: Date.now(), x: Date.now() + 8 * 36e5, j }), me: me(u), akses: menuPeran(u.peran) }, lingkup === '2fa' ? 'Autentikasi dua faktor aktif.' : '');
    }
    // ----- butuh sesi
    const u = sesi(body.token);
    if (!u) return gagalSesi();
    if (!boleh(u, a)) return fail('Anda tidak memiliki hak akses untuk fitur ini.', 'FORBIDDEN');
    switch (a) {
      case 'boot': return ok(Object.assign({ me: me(u), akses: menuPeran(u.peran), setting, produk: PRODUK, ver: verU(u), lver, server: Date.now(), periode: PERIODE, hariIni: HARI, snap: cakupan(u).npp || cakupan(u).bawah ? [] : snap, gw: gw(u), cakupan: cakupan(u) }, d.ver === verU(u) ? { notModified: true } : { ds: dsUntuk(u) }, boleh(u, 'blast.kirim') ? { tpl: tpl.filter((t) => t.aktif) } : {}));
      case 'sync.ping': {
        if (Date.now() - mutasiAkhir > 120000) {    // simulasi perubahan di Google Sheets tiap ±2 menit
          mutasiAkhir = Date.now();
          const r = pilih(rows.filter((x) => x[10] === 'Aktif'));
          r[13] = r[13] < r[14] ? r[14] * 2 : Math.round(r[13] * 0.9); r[12] = r[14];
          ver = String(Date.now());
        }
        return ok({ ver: verU(u), lver, sver, t: Date.now() });
      }
      case 'data.debitur': { const D = dsUntuk(u, d.tgl); return ok(d.ver && d.ver === D.ver ? { ver: D.ver, notModified: true } : { ver: D.ver, ds: D, produk: PRODUK }); }
      case 'data.tanggal.hapus': {                                 // v1.7: Super Admin hapus 1 tanggal base data
        const t = String(d.tgl || ''), L = tglList();
        if (!L.includes(t)) return fail('Tidak ada baris dengan tanggal ' + t + '.');
        if (L.length < 2) return fail('Tanggal terakhir tidak dapat dihapus di mode demo.', 'VALIDATION');
        const n = ds(t).n; hapusTgl.add(t); ver = String(Date.now());
        return ok({ dihapus: n, ver }, n + ' baris base data tanggal ' + t + ' dihapus.');
      }
      // ----- v1.5
      case 'debitur.hp': {
        const r = rows.find((x) => x[0] === String(d.id || ''));
        if (!r || !dsUntuk(u).rows.includes(r)) return fail('Debitur tidak ditemukan.', 'VALIDATION');
        const w = String(d.hp || '').replace(/\D/g, '').replace(/^62/, '0').replace(/^8/, '08');
        if (!/^08\d{7,12}$/.test(w)) return fail('Nomor HP tidak valid. Contoh: 081234567890.', 'VALIDATION');
        r[4] = w.slice(0, 4) + '-****-' + w.slice(-4); r[5] = 1; r[29] = 1; ver = String(Date.now());
        return ok({ ver: verU(u), wa: r[4] }, 'Nomor HP debitur disimpan.');
      }
      case 'akses.info': {
        const D = ds(), n = { np: 0, un: 0, sg: 0, SME: 0, SBP: 0, tanpaSeg: 0 }, perUnit = {};
        D.rows.forEach((r) => { if (r[27]) n.np++; if (r[26]) { n.un++; perUnit[r[26]] = (perUnit[r[26]] || 0) + 1; } if (r[28] === 'SME') n.SME++; else if (r[28] === 'SBP') n.SBP++; else n.tanpaSeg++; });
        const peran = {}; Object.keys(peranAkses()).forEach((p) => { peran[p] = aturPeran(p); });
        return ok({ akses: aksesD(), header: ['Rek_Pinjaman', 'Nama', 'No_WA', 'Produk', 'PT_PMI', 'CIF', 'RM', 'Tgl_Booking', 'Unit', 'NPP_RM', 'Segmen', 'Jangka_Waktu', 'Tgl_Data'], kolom: { tb: true, un: true, np: true, sg: true }, hitung: n, perUnit, total: D.rows.length, peran, bawaan: { unit: UNIT_BAWAAN, seg: SEG_BAWAAN } });
      }
      case 'akses.cek': {                                         // v1.6: sama dengan server
        const npp = String(d.npp || '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        if (!npp || npp.length > 5) return fail('Isi NPP (maksimal 5 digit), mis. 67221.', 'VALIDATION');
        const n5 = npp.padStart(5, '0'), D = ds();
        const ringkas = (L) => { const per = {}, cf = {}; L.forEach((r) => { const x = per[r[6]] || (per[r[6]] = { pr: r[6], n: 0, cif: 0, pl: 0, bd: 0, sme: 0, sbp: 0 }); x.n++; x.pl += r[7]; x.bd += r[8]; if (r[28] === 'SME') x.sme++; else if (r[28] === 'SBP') x.sbp++; const k = r[6] + '|' + r[2]; if (!cf[k]) { cf[k] = 1; x.cif++; } }); return Object.values(per).sort((a, b) => b.n - a.n); };
        const milik = D.rows.filter((r) => r[27] === n5), us = users.find((x) => x.npp === n5);
        let lihat = null;
        if (us) { const L = us.peran === 'Admin' ? D.rows : dsUntuk(us).rows, sc = cakupan(us); lihat = { segmen: sc.s, filterNpp: !!sc.npp, nppAktif: !!sc.npp, bawah: sc.bawah ? sc.bawah.slice(1) : null, bawahBelum: !!sc.bawahBelum, n: L.length, produk: ringkas(L) }; }
        const hit = {}; D.rows.forEach((r) => { const k = r[27] || '(kosong)'; hit[k] = (hit[k] || 0) + 1; });
        const contoh = Object.keys(hit).sort((a, b) => hit[b] - hit[a]).slice(0, 12).map((k) => { const p = users.find((x) => x.npp === k); return { npp: k, n: hit[k], nama: p ? p.nama : '', peran: p ? p.peran : '' }; });
        return ok({ npp: n5, adaNpp: true, kolom: 'NPP_RM', total: D.rows.length, n: milik.length, produk: ringkas(milik), pengguna: us ? { nama: us.nama, peran: us.peran, status: us.status } : null, lihat, contoh });
      }
      case 'akses.simpan': {
        const a = d.akses || {};
        setting.AKSES_DATA = JSON.stringify({ unit: (a.unit || []).filter((x) => x.k || x.n), kol: a.kol || {}, seg: a.seg || SEG_BAWAAN, segV: 3, peran: a.peran || {} });
        ver = String(Date.now()); sver = String(Date.now());
        return ok({ akses: aksesD(), ver, setting }, 'Pengaturan akses data disimpan. Berlaku langsung untuk semua pengguna.');
      }
      case 'pmi.pt.info': {
        const daftar = JSON.parse(setting.PMI_PT || '[]');
        const judul = [['A', 'No', '1'], ['B', 'Nama Deb', 'Siti Contoh'], ['C', 'No Rek Afiliasi', '0533001122'], ['D', 'Angkatan', 'Batch 9'], ['E', 'Tenor', '36'], ['F', 'Perusahaan', 'Fuji Co., Ltd.']].map((x) => ({ kol: x[0], h: x[1], contoh: x[2] }));
        if (!sumberPt) return ok({ aktif: false, daftar, lama: !!sumberPmi });
        return ok({ aktif: true, url: 'https://docs.google.com/spreadsheets/d/demo/edit', nama: 'Database KUR PMI (demo)', galat: '', sheets: daftar.concat(['Fuji Co., Ltd.']), disembunyikan: 0, lama: false,
          pt: daftar.map((n) => { const c = sumberPt[n] || { aktif: true, sheet: n, baris: 5, kunci: 'auto', kolom: {} }; return Object.assign({ nama: n, tersimpan: !!sumberPt[n], n: rows.filter((r) => r[6] === 'KUR PMI' && r[20] === n).length, cocok: rows.filter((r) => r[6] === 'KUR PMI' && r[20] === n).length, baru: 0, galat: '', judul, pakai: { nm: 'B · Nama Deb', ra: 'C · No Rek Afiliasi', bt: 'D · Angkatan', jw: 'E · Tenor' } }, c); }) });
      }
      case 'pmi.pt.baca': {
        if (!String(d.url || '').trim()) return fail('Tempel link spreadsheet KUR PMI yang valid.', 'VALIDATION');
        const daftar = JSON.parse(setting.PMI_PT || '[]');
        const out = { nama: 'Database KUR PMI (demo)', sheets: daftar.concat(['Fuji Co., Ltd.']) };
        if (d.sheet) { const b = Math.max(1, +d.baris || 1); out.baris = b; out.n = 40; out.judul = b === 5 ? [['A', 'No', '1'], ['B', 'Nama Deb', 'Siti Contoh'], ['C', 'No Rek Afiliasi', '0533001122'], ['D', 'Angkatan', 'Batch 9'], ['E', 'Tenor', '36'], ['F', 'Perusahaan', 'Fuji Co., Ltd.']].map((x) => ({ kol: x[0], h: x[1], contoh: x[2] })) : [{ kol: 'A', h: 'DATA DEBITUR KUR PMI', contoh: '' }]; }
        return ok(out);
      }
      case 'pmi.pt.simpan': {
        const daftar = JSON.parse(setting.PMI_PT || '[]');
        sumberPt = {}; Object.keys(d.pt || {}).forEach((n) => { if (daftar.includes(n)) sumberPt[n] = d.pt[n]; });
        rows.forEach((r) => { if (r[6] === 'KUR PMI') { const n = daftar.find((x) => x.toLowerCase().replace(/[^a-z]/g, '') === String(r[20]).toLowerCase().replace(/^pt\.?\s*/, 'pt').replace(/[^a-z]/g, '')); if (n) { r[20] = n; r[24] = 1; } } });
        ver = String(Date.now());
        return ok({ ver, ringkas: Object.keys(sumberPt).map((n) => n + ': ' + rows.filter((r) => r[20] === n).length), peringatan: [] }, 'Sumber KUR PMI per PT disimpan.');
      }
      case 'pmi.pt.hapus': sumberPt = null; ver = String(Date.now()); return ok({ ver }, 'Sumber KUR PMI per PT diputus. Debitur KUR PMI kembali dari sheet Debitur.');
      case 'analisa.pak.docs': {
        if (d.aksi === 'info') return ok(pakDoc || { ada: false });
        if (d.aksi === 'buat') { pakDoc = { ada: true, url: 'https://docs.google.com/document/d/demo/edit', docx: 'https://docs.google.com/document/d/demo/export?format=docx', diubah: Date.now(), sinkron: Date.now(), perlu: false }; return ok(pakDoc, d.ulang ? 'Isi dokumen diperbarui dari format aplikasi.' : 'Dokumen Google Docs dibuat (demo — tautan contoh).'); }
        if (d.aksi === 'sinkron') { if (!pakDoc) return fail('Belum ada dokumen Google Docs. Klik "Edit di Word" dulu.'); pakDoc.sinkron = Date.now(); return ok(Object.assign({}, pakDoc, { konfig: pakK, berubah: 0, aver }), 'Tidak ada perubahan di dokumen.'); }
        if (d.aksi === 'putus') { pakDoc = null; return ok({ ada: false }, 'Tautan dokumen dilepas.'); }
        return fail('Aksi tidak dikenal.', 'VALIDATION');
      }
      case 'data.snapshot': return ok({ snap, periode: PERIODE });
      case 'cache.refresh': return ok({ ver, berubah: false }, 'Data sudah paling baru.');
      case 'snapshot.jalankan': return ok({ r: { ok: true, periode: PERIODE }, snap }, 'Snapshot periode ' + PERIODE + ' diperbarui.');
      case 'auth.me': return ok({ me: me(u), totpAktif: true, sandiHari: sisaHari(cred()[u.npp]), sandiBerlaku: SANDI_HARI });
      case 'auth.logout': return ok(null, 'Anda telah keluar.');
      case 'auth.ubahSandi': {
        const c = cred(), x = c[u.npp];
        if (x.pw !== d.lama) return fail('Kata sandi lama salah.', 'VALIDATION');
        if (await cekTotp(x.t, String(d.kode || ''), x.ls) < 0) return fail('Kode authenticator salah.', 'VALIDATION');
        const gl = validSandi(d.baru, u.npp); if (gl) return fail(gl, 'VALIDATION');
        if (sandiPernah(x, String(d.baru))) return fail(PESAN_PERNAH, 'PERNAH');
        pasangSandi(x, String(d.baru)); setCred(c);
        return ok({ token: tok({ n: u.npp, r: u.peran, i: Date.now(), x: Date.now() + 8 * 36e5 }) }, 'Kata sandi diperbarui. Sesi di perangkat lain telah diakhiri.');
      }
      case 'template.list': return ok({ templates: u.peran === 'Admin' ? tpl : tpl.filter((t) => t.aktif) });
      case 'template.simpan': {
        if (!d.nama || !d.isi) return fail('Nama dan isi template wajib diisi.', 'VALIDATION');
        const asing = (d.isi.match(/\{([a-z_]+)\}/gi) || []).map((m) => m.slice(1, -1)).filter((k) => !['nama', 'produk', 'angsuran', 'jatuh_tempo', 'baki_debet', 'kekurangan', 'saldo_akhir', 'id_debitur', 'cabang'].includes(k));
        if (asing.length) return fail('Placeholder tidak dikenal: {' + asing.join('}, {') + '}', 'VALIDATION');
        let t = tpl.find((x) => x.id === d.id);
        if (!t) { t = { id: 'TPL-' + String(tpl.length + 1).padStart(3, '0') }; tpl.push(t); }
        Object.assign(t, { nama: d.nama, isi: d.isi, aktif: d.aktif !== false, diperbarui: new Date().toISOString(), oleh: u.npp + ' ' + u.nama });
        sver = sver + '.';
        return ok({ id: t.id, templates: tpl }, 'Template disimpan.');
      }
      case 'blast.kirim': {
        const t = tpl.find((x) => x.id === d.templateId && x.aktif);
        if (!t) return fail('Template tidak ditemukan atau nonaktif.', 'VALIDATION');
        const m = byId(), s0 = hariIniMs(), alias = rpKeId();
        const sudah = new Set(logs.filter((l) => l.w >= s0 && l.st !== 'Gagal' && l.st !== 'Batal').map((l) => (alias[l.idd] || l.idd) + '|' + l.tp));
        const siap = [], lewat = [], dup = [];
        (d.ids || []).forEach((id) => {
          const r = m[id];
          if (!r) return lewat.push({ id, nama: '-', alasan: 'Debitur tidak ditemukan' });
          if (r[15]) return lewat.push({ id, nama: r[1], alasan: 'Opt-out WA' });
          if (!r[5]) return lewat.push({ id, nama: r[1], alasan: 'Nomor WA tidak valid' });
          if (r[10] === 'Lunas') return lewat.push({ id, nama: r[1], alasan: 'Kredit sudah lunas' });
          if (sudah.has(id + '|' + t.id)) dup.push({ id, nama: r[1] });
          siap.push(id);
        });
        if (dup.length && !d.paksa && !d.lewatiDuplikat) return fail(dup.length + ' debitur sudah menerima template "' + t.nama + '" hari ini.', 'CONFIRM', { duplikat: dup, siap: siap.length, dilewati: lewat });
        const kirim = d.lewatiDuplikat ? siap.filter((id) => !dup.find((x) => x.id === id)) : siap;
        if (!kirim.length) return fail('Tidak ada penerima yang valid untuk dikirimi.', 'VALIDATION');
        const s = statHari();
        if (kirim.length > +setting.WA_KUOTA_HARIAN - s.terkirim - s.antre) return fail('Kuota harian tidak cukup.', 'QUOTA');
        const now = Date.now(), batch = 'BL-' + iso(new Date()).slice(2).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        kirim.forEach((id, i) => logs.push({ id: batch + '-' + String(i + 1).padStart(3, '0'), batch, w: now, npp: u.npp, idd: m[id][18] || id, nm: m[id][1], tp: t.id, st: 'Antre', coba: 0, ket: '', kirim: 0 }));
        lver = String(Date.now());
        return ok({ batchId: batch, antre: kirim.length, dilewati: lewat, mode: setting.WA_MODE }, kirim.length + ' pesan masuk antrean' + (setting.WA_MODE === 'simulasi' ? ' (mode SIMULASI — tidak benar-benar terkirim)' : '') + '.');
      }
      case 'blast.proses': {
        const q = logs.filter((l) => l.st === 'Antre').slice(0, +setting.WA_BATCH || 25);
        q.forEach((l) => { l.coba++; const g = rnd() < 0.04; l.st = g ? 'Gagal' : 'Terkirim'; l.ket = g ? 'Nomor tidak terdaftar di WhatsApp' : 'SIMULASI — tidak dikirim ke WhatsApp'; l.kirim = Date.now(); });
        if (q.length) lver = String(Date.now());
        return ok({ diproses: q.length });
      }
      case 'blast.batal': {
        let n = 0; logs.forEach((l) => { if (l.batch === d.batchId && l.st === 'Antre' && (u.peran === 'Admin' || l.npp === u.npp)) { l.st = 'Batal'; l.ket = 'Dibatalkan oleh ' + u.npp; n++; } });
        lver = String(Date.now());
        return ok({ dibatalkan: n }, n ? n + ' pesan antre dibatalkan.' : 'Tidak ada pesan antre pada batch ini.');
      }
      case 'blast.status': { const s = statHari(); return ok({ gw: gw(u), hariIni: s, perangkat: u.peran === 'Admin' && token.ada ? { status: true, perangkat: 'connect', kuota: '980', nama: 'Demo' } : undefined }); }
      case 'log.list': {
        const dari = d.dari ? new Date(d.dari + 'T00:00:00').getTime() : Date.now() - 30 * 864e5;
        const sampai = d.sampai ? new Date(d.sampai + 'T23:59:59').getTime() : Date.now() + 864e5;
        const nm = {}; users.forEach((x) => { nm[x.npp] = x.nama; });
        const tn = {}; tpl.forEach((x) => { tn[x.id] = x.nama; });
        const ring = { total: 0, terkirim: 0, gagal: 0, antre: 0, batal: 0 }, peng = {}, out = [];
        for (let i = logs.length - 1; i >= 0; i--) {
          const l = logs[i];
          if (l.w < dari || l.w > sampai) continue;
          peng[l.npp] = nm[l.npp] || l.npp;
          if (d.batch && l.batch !== d.batch) continue;
          ring.total++; ring[{ Terkirim: 'terkirim', Gagal: 'gagal', Batal: 'batal' }[l.st] || 'antre']++;
          if (out.length < 3000) out.push([l.id, l.batch, l.w, l.npp, nm[l.npp] || l.npp, l.idd, l.nm, l.tp, tn[l.tp] || l.tp, l.st === 'Mengirim' ? 'Antre' : l.st, l.coba, l.ket, l.kirim]);
        }
        return ok({ rows: out, ringkas: ring, pengirim: peng, lver, terpotong: false });
      }
      case 'wa.tes': return ok({ ok: true }, 'Pesan tes diterima gateway (SIMULASI).');
      case 'user.list': return ok({ users: users.map((x) => Object.assign({}, x, { label: labelPeran(x.peran), keamanan: keamanan(x.npp), upliner: x.upliner || '', ganda: 0, sandiHari: sisaHari(cred()[x.npp]) })), superAdmin: SA_NPP, sandiBerlaku: SANDI_HARI });
      case 'user.gantiNpp': {
        const x = users.find((y) => y.npp === d.npp), baru = String(d.baru || '');
        if (!x) return fail('Pengguna tidak ditemukan.');
        if (!/^\d{5}$/.test(baru)) return fail('NPP baru harus 5 digit angka.', 'VALIDATION');
        if (baru === x.npp) return fail('NPP baru sama dengan NPP lama.', 'VALIDATION');
        if (users.some((y) => y.npp === baru)) return fail('NPP ' + baru + ' sudah dipakai pengguna lain.', 'VALIDATION');
        const lama = x.npp, c = cred(); if (c[lama]) { c[baru] = c[lama]; delete c[lama]; setCred(c); }
        const sa = sesiAktif(); delete sa[lama]; localStorage.setItem(KS, JSON.stringify(sa));
        x.npp = baru;
        users.forEach((y) => { if (y.upliner === lama) y.upliner = baru; });       // v1.7: bawahan ikut pindah upliner
        const diri = lama === u.npp;
        return ok({ npp: baru, keluar: diri }, 'NPP ' + lama + ' diganti menjadi ' + baru + '.' + (diri ? ' Silakan masuk kembali dengan NPP baru.' : ' Pengguna masuk dengan NPP baru; kata sandi & authenticator tetap.'));
      }
      case 'peran.simpan': {
        const m = d.peran || {}, baru = {};
        for (const k of Object.keys(m)) {
          const n = String(k).replace(/\s+/g, ' ').trim();
          if (!/^[A-Za-z0-9][A-Za-z0-9 .&()\/-]{1,29}$/.test(n) || /^(super\s*-?\s*)?admin$/i.test(n)) return fail('Nama peran "' + n + '" tidak valid.', 'VALIDATION');
          const mm = (m[k] || []).filter((x, i, a) => MENU_PERAN.includes(x) && a.indexOf(x) === i);
          if (!mm.length) return fail('Peran "' + n + '" minimal boleh membuka 1 menu.', 'VALIDATION');
          baru[n] = MENU_PERAN.filter((x) => mm.includes(x));
        }
        const pakai = {}; users.forEach((x) => { if (x.peran !== 'Admin') pakai[x.peran] = (pakai[x.peran] || 0) + 1; });
        const hilang = Object.keys(pakai).filter((p) => !baru[p]);
        if (hilang.length) return fail('Peran ' + hilang.map((p) => '"' + p + '" (' + pakai[p] + ' pengguna)').join(', ') + ' masih dipakai. Pindahkan penggunanya ke peran lain dulu.', 'VALIDATION');
        setting.PERAN_AKSES = JSON.stringify(baru); sver = sver + '.';
        return ok({ peran: baru, setting }, 'Hak akses peran disimpan. Berlaku langsung untuk semua pengguna.');
      }
      case 'pmi.simpan': {
        const daftar = [], sudah = {}, ganti = {};
        for (const it of d.daftar || []) {
          const nama = String((it && it.nama) || '').replace(/\s+/g, ' ').trim(); if (!nama) continue;
          const k = normPt(nama); if (!k) return fail('Nama PT "' + nama + '" tidak valid.', 'VALIDATION');
          if (sudah[k]) return fail('PT "' + nama + '" ganda.', 'VALIDATION');
          sudah[k] = 1; daftar.push(nama);
          if (it.lama && it.lama !== nama) ganti[normPt(it.lama)] = nama;
        }
        let diganti = 0;
        rows.forEach((r) => { const g = ganti[normPt(r[20])]; if (r[20] && g && r[20] !== g) { r[20] = g; diganti++; } });
        if (diganti) ver = String(Date.now());
        setting.PMI_PT = JSON.stringify(daftar); sver = sver + '.';
        return ok({ daftar, diganti, setting }, 'Daftar PT KUR PMI disimpan.' + (diganti ? ' ' + diganti + ' debitur ikut diperbarui.' : ''));
      }
      case 'user.simpan': {
        if (!/^\d{5}$/.test(d.npp || '')) return fail('NPP harus 5 digit angka.', 'VALIDATION');
        if (!String(d.nama || '').trim()) return fail('Nama wajib diisi.', 'VALIDATION');
        let x = users.find((y) => y.npp === d.npp);
        if (d.mode === 'tambah' && x) return fail('NPP ' + d.npp + ' sudah terdaftar.', 'VALIDATION');
        const peranN = /^(super\s*-?\s*)?admin$/i.test(String(d.peran || '').trim()) ? 'Admin' : Object.keys(peranAkses()).find((k) => k.toLowerCase() === String(d.peran || '').trim().toLowerCase());
        if (!peranN) return fail('Peran tidak valid.', 'VALIDATION');
        d.peran = peranN;
        if (d.npp === u.npp && (d.peran !== 'Admin' || d.status !== 'Aktif')) return fail('Anda tidak dapat menurunkan peran atau menonaktifkan akun Anda sendiri.', 'VALIDATION');
        if (d.peran === 'Admin' && !(x && x.peran === 'Admin' && d.npp === u.npp)) return fail('Peran Super Admin hanya untuk 1 akun dan tidak dapat diberikan ke pengguna lain.', 'VALIDATION');
        const adaUp = d.upliner !== undefined, up = adaUp ? String(d.upliner || '').trim() : '';
        if (up) {
          if (!users.some((y) => y.npp === up)) return fail('Upliner harus pengguna yang terdaftar.', 'VALIDATION');
          if (up === d.npp) return fail('Upliner tidak boleh dirinya sendiri.', 'VALIDATION');
          if (bawahan(d.npp).includes(up)) return fail('Upliner tidak valid: ' + up + ' adalah bawahan (downliner) dari ' + d.npp + '.', 'VALIDATION');
        }
        if (!x) { x = { npp: d.npp, dibuat: new Date().toISOString(), login: '', upliner: '' }; users.push(x); }
        Object.assign(x, { nama: d.nama, email: d.email || '', peran: d.peran, status: d.status });
        if (adaUp) x.upliner = up;
        ver = String(Date.now());
        return ok({ npp: d.npp }, d.mode === 'tambah' ? 'Pengguna ditambahkan. Sandi awal = NPP.' : 'Data pengguna diperbarui.');
      }
      case 'user.reset': {
        const c = cred();
        if (d.mode === 'semua') { const hh = c[d.npp] && [c[d.npp].pw].concat(c[d.npp].hh || []).filter(Boolean); delete c[d.npp]; if (hh && hh.length) c[d.npp] = { hh }; }
        else if (d.mode === '2fa' && c[d.npp]) { delete c[d.npp].t; delete c[d.npp].tp; delete c[d.npp].tq; delete c[d.npp].tx; delete c[d.npp].ls; }
        else if (d.mode === 'buka' && c[d.npp]) { delete c[d.npp].kunci; delete c[d.npp].blokir; c[d.npp].g = 0; }
        setCred(c);
        return ok(null, d.mode === 'buka' ? 'Kunci akun dibuka.' : d.mode === '2fa' ? 'Authenticator direset. QR baru tampil saat login berikutnya.' : 'Akses direset. Login dengan sandi = NPP.');
      }
      case 'setting.get': return ok({ setting, keterangan: KET, rahasia: { FONNTE_TOKEN: token }, sistem: { versi: '1.7.0 (demo)', dataVer: ver, spreadsheetUrl: 'https://docs.google.com/spreadsheets/', folderEkspor: '', pemicu: ['onChangeData', 'prosesAntrian', 'warmupCache', 'snapshotHarian'] } });
      case 'setting.simpan': {
        const inp = d.setting || {};
        if (inp.LOGO_DATA && (String(inp.LOGO_DATA).length > 48000 || !/^data:image\/(png|jpeg|webp);base64,/.test(inp.LOGO_DATA))) return fail('Logo tidak valid atau terlalu besar. Gunakan PNG/JPG/WEBP — aplikasi otomatis memperkecilnya.', 'VALIDATION');
        if (Object.keys(inp).some((k) => KHUSUS.includes(k))) return fail('Pengaturan ini hanya bisa diubah lewat menunya sendiri.', 'VALIDATION');
        Object.keys(inp).forEach((k) => { if (k in setting && !KHUSUS.includes(k)) setting[k] = String(inp[k]); });
        if ('LOGO_UKURAN' in inp) setting.LOGO_UKURAN = String(Math.max(24, Math.min(80, Math.round(+inp.LOGO_UKURAN) || 34)));
        if ('LOGO_TEKS' in inp) setting.LOGO_TEKS = inp.LOGO_TEKS === 'tidak' ? 'tidak' : 'ya';
        if ('LOGIN_TEKS' in inp) setting.LOGIN_TEKS = inp.LOGIN_TEKS === 'ya' ? 'ya' : 'tidak';
        if ('LOGIN_LOGO' in inp) setting.LOGIN_LOGO = String(Math.max(48, Math.min(160, Math.round(+inp.LOGIN_LOGO) || 96)));
        simpanBrandDemo();
        sver = sver + '.'; return ok({ setting }, 'Pengaturan disimpan.');
      }
      case 'rahasia.simpan':
        if (d.kunci !== 'FONNTE_TOKEN') return fail('Kunci tidak diizinkan.', 'FORBIDDEN');
        token = d.nilai === '__HAPUS__' ? { ada: false, samar: '' } : { ada: true, samar: String(d.nilai).slice(0, 4) + '••••••' + String(d.nilai).slice(-3) };
        return ok({ kunci: 'FONNTE_TOKEN', ada: token.ada, samar: token.samar }, 'Tersimpan.');
      case 'ekspor.pdf': return fail('Di mode demo, gunakan tombol Cetak lalu “Simpan sebagai PDF”.', 'DEMO');
      case 'ekspor.catat': return ok(null);
      // ----- v1.3: sumber KUR PMI terpisah
      case 'pmi.sumber.info': return ok(sumberPmi ? { aktif: true, url: sumberPmi.url, sheet: sumberPmi.sheet, nama: sumberPmi.nama, baris: sumberPmi.n, kolom: ['Rek Afil', 'Nama', 'Nama Perusahaan', 'Jangka Waktu', 'Batch'], galat: '', tanpaSumber: terapkanSumber(),
        peta: sumberPmi.peta || { baris: 1, kolom: {} }, judul: JUDUL_PMI, pakai: { ra: 'E', nm: 'B', pt: 'C', jw: 'D', bt: 'F' } } : { aktif: false });
      case 'pmi.sumber.simpan': {
        const m = String(d.url || '').match(/\/d\/([A-Za-z0-9_-]{20,})/), id = m ? m[1] : String(d.url || '').trim();
        if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) return fail('Tempel link spreadsheet KUR PMI yang valid.', 'VALIDATION');
        const n = Array.from(EXT.values()).filter((x) => x.ada).length;
        sumberPmi = { url: 'https://docs.google.com/spreadsheets/d/' + id + '/edit', sheet: String(d.sheet || '').trim(), nama: 'Data KUR PMI (demo) › ' + (String(d.sheet || '').trim() || 'Sheet1'), n,
          peta: { baris: Math.max(1, Math.min(50, +((d.peta || {}).baris) || 1)), kolom: Object.assign({}, (d.peta || {}).kolom || {}) } };
        ver = String(Date.now());
        return ok({ nama: sumberPmi.nama, baris: n, kolom: ['Rek Afil', 'Nama', 'Nama Perusahaan', 'Jangka Waktu', 'Batch'], ver, tanpaSumber: terapkanSumber() }, 'Spreadsheet KUR PMI terhubung: ' + n + ' baris terbaca.');
      }
      case 'pmi.sumber.hapus': sumberPmi = null; ver = String(Date.now()); terapkanSumber(); return ok({ ver }, 'Sumber KUR PMI diputus. Detail kembali dari sheet Debitur.');
      // ----- v1.3: keamanan
      case 'keamanan.status': {
        const ak = users.filter((x) => x.status === 'Aktif');
        return ok({ gerbang: { aktif: false, lewatSekarang: false, ip: '', negara: '', rahasiaCocok: false },
          turnstile: { aktif: !!(tsSecret && setting.TURNSTILE_SITEKEY), siteKey: setting.TURNSTILE_SITEKEY, secretAda: !!tsSecret, secretSamar: tsSecret ? tsSecret.slice(0, 4) + '••••••' + tsSecret.slice(-3) : '' },
          berbagi: [{ jenis: 'Database utama', nama: '🗃️ FinSight — Database (demo)', akses: 'PRIVATE', izin: 'NONE', publik: false, domain: false, editor: 1, pembaca: 0, aman: true },
            { jenis: 'Folder FinSight', nama: '📁 FinSight', akses: 'PRIVATE', izin: 'NONE', publik: false, domain: false, editor: 1, pembaca: 0, aman: true }],
          akun: { total: ak.length, superAdmin: ak.filter((x) => x.peran === 'Admin').length, superGanda: 0, tanpa2fa: ak.filter((x) => keamanan(x.npp) === 'Belum 2FA').map((x) => x.npp), belumAktif: ak.filter((x) => keamanan(x.npp) === 'Belum aktivasi').map((x) => x.npp), kedaluwarsa: [],
            terkunci: ak.filter((x) => keamanan(x.npp) === 'Terkunci').map((x) => x.npp), diblokir: ak.filter((x) => keamanan(x.npp) === 'Diblokir').map((x) => x.npp), sandiLama: ak.filter((x) => keamanan(x.npp) === 'Sandi kedaluwarsa').map((x) => x.npp), sandiHari: SANDI_HARI },
          aktivasiJam: +setting.AKTIVASI_JAM || 72, wa: { mode: setting.WA_MODE, tokenAda: token.ada }, sesiJam: +setting.SESI_JAM || 8, log24: { gagalLogin: 0, ditolak: 0 } });
      }
      case 'keamanan.simpan': {
        if (d.aksi === 'turnstile') {
          if (!/^[0-9A-Za-z_-]{10,100}$/.test(String(d.siteKey || ''))) return fail('Site key Turnstile tidak valid.', 'VALIDATION');
          if (!d.secret && !tsSecret) return fail('Isi Secret key Turnstile.', 'VALIDATION');
          setting.TURNSTILE_SITEKEY = String(d.siteKey); if (d.secret) tsSecret = String(d.secret); sver = sver + '.';
          return ok(null, 'Cloudflare Turnstile aktif di halaman masuk.');
        }
        if (d.aksi === 'turnstileOff') { setting.TURNSTILE_SITEKEY = ''; tsSecret = ''; sver = sver + '.'; return ok(null, 'Turnstile dimatikan.'); }
        if (d.aksi === 'gerbang') return fail('Permintaan ini belum lewat Cloudflare Worker dengan rahasia yang sama. (Mode demo tidak memakai Worker.)', 'VALIDATION');
        if (d.aksi === 'gerbangOff') return ok(null, 'Gerbang Cloudflare dimatikan.');
        if (d.aksi === 'aktivasi') { const j = Math.max(1, Math.min(720, Math.round(+d.jam) || 72)); setting.AKTIVASI_JAM = String(j); return ok({ jam: j }, 'Masa berlaku sandi awal: ' + j + ' jam.'); }
        return fail('Aksi tidak dikenal.', 'VALIDATION');
      }
      // ----- v1.3: Analisa
      case 'analisa.template.list': return ok({ templates: surat.filter((t) => u.peran === 'Admin' || t.aktif).map((t) => ({ id: t.id, nama: t.nama, namaFile: t.namaFile, penanda: t.penanda, ukuran: t.ukuran, aktif: t.aktif, diubah: t.diubah, oleh: t.oleh })), aver, bolehUbah: u.peran === 'Admin' });
      case 'analisa.template.ambil': { const t = surat.find((x) => x.id === d.id); return t ? ok({ id: t.id, nama: t.nama, namaFile: t.namaFile, diubah: t.diubah, base64: t.base64 }) : fail('Format surat tidak ditemukan.'); }
      case 'analisa.template.simpan': {
        const nama = String(d.nama || '').replace(/\s+/g, ' ').trim();
        if (nama.length < 2 || nama.length > 60) return fail('Nama format surat 2–60 karakter.', 'VALIDATION');
        let t = d.id ? surat.find((x) => x.id === d.id) : null;
        if (d.id && !t) return fail('Format surat tidak ditemukan.');
        if (d.base64) {
          let bin = ''; try { bin = atob(String(d.base64)); } catch (e) { return fail('File tidak valid.', 'VALIDATION'); }
          if (bin.length > 5 * 1024 * 1024) return fail('File terlalu besar (maks 5 MB).', 'VALIDATION');
          if (bin.slice(0, 4) !== 'PK\u0003\u0004' || bin.indexOf('word/document.xml') < 0) return fail('File bukan dokumen Word (.docx) yang valid. Simpan dari Word sebagai "Word Document (.docx)".', 'VALIDATION');
        } else if (!t) return fail('Unggah file Word (.docx) format surat.', 'VALIDATION');
        if (!t) { t = { id: 'SRT-' + String(surat.length + 1).padStart(3, '0') }; surat.push(t); }
        if (d.base64) Object.assign(t, { base64: String(d.base64), namaFile: String(d.namaFile || nama + '.docx'), ukuran: Math.round(String(d.base64).length * 0.75), penanda: (d.penanda || []).map(String) });
        Object.assign(t, { nama, aktif: d.aktif !== false, diubah: Date.now(), oleh: u.npp + ' ' + u.nama });
        aver = String(Date.now());
        return proses({ action: 'analisa.template.list', token: body.token }).then((r) => ok({ id: t.id, templates: r.data.templates }, 'Format surat disimpan.'));
      }
      case 'analisa.template.hapus': {
        const i = surat.findIndex((x) => x.id === d.id); if (i < 0) return fail('Format surat tidak ditemukan.');
        const n = (dataSurat[d.id] || []).length; const nm = surat[i].nama; surat.splice(i, 1); delete dataSurat[d.id]; aver = String(Date.now());
        return ok({ dihapus: n }, 'Format surat "' + nm + '" dihapus' + (n ? ' beserta ' + n + ' data suratnya.' : '.'));
      }
      case 'analisa.data.list': { if (!tplDemo(d.tpl)) return fail('Format surat tidak ditemukan.'); return ok({ aver, tpl: d.tpl, rows: dataSurat[d.tpl] || [] }); }
      case 'analisa.pak.konfig': return ok({ konfig: pakK, bolehUbah: u.peran === 'Admin', aver, id: 'PAK-KUR', doc: u.peran === 'Admin' ? pakDoc : null });
      case 'analisa.pak.simpan': {
        const k = d.konfig && typeof d.konfig === 'object' ? JSON.parse(JSON.stringify(d.konfig)) : null;
        if (!k) return fail('Format tidak valid.', 'VALIDATION');
        const inti = (typeof PAK !== 'undefined' ? PAK.KOLOM : []).filter((f) => f.inti);
        const seen = new Set();
        k.kolom = (k.kolom || []).map((f) => Object.assign({}, f, { k: String(f.k || f.label || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 40) })).filter((f) => f.k && !seen.has(f.k) && seen.add(f.k));
        inti.forEach((f) => { if (!seen.has(f.k)) k.kolom.push(f); });
        k.kolom.forEach((f) => { if (inti.some((x) => x.k === f.k)) f.inti = true; });
        k.kredit.bunga = Math.max(0, Math.min(50, +k.kredit.bunga || 0)); k.kredit.batas = Math.max(1, Math.min(100, +k.kredit.batas || 60));
        if (JSON.stringify(k).length > 45000) return fail('Pengaturan terlalu panjang.', 'VALIDATION');
        pakK = k; aver = String(Date.now());
        return ok({ konfig: pakK, aver }, 'Format Perangkat Analisa disimpan.');
      }
      case 'analisa.data.impor': {
        const t = tplDemo(d.tpl); if (!t || !t.aktif) return fail('Format surat tidak ditemukan atau nonaktif.');
        const masuk = Array.isArray(d.rows) ? d.rows : []; if (!masuk.length) return fail('Tidak ada baris data untuk diimpor.', 'VALIDATION');
        if (masuk.length > 2000) return fail('Maksimal 2000 baris per kiriman.', 'VALIDATION');
        const L = dataSurat[d.tpl] = d.mode === 'ganti' ? [] : (dataSurat[d.tpl] || []);
        const dihapus = d.mode === 'ganti' ? 0 : 0, batch = d.batch || 'IMP-DEMO';
        let n = 0;
        masuk.forEach((o, i) => { const isi = {}; t.penanda.forEach((f) => { if (o[f] !== undefined && o[f] !== null && String(o[f]).trim() !== '') isi[f] = o[f]; }); if (!Object.keys(isi).length) return; L.push({ id: 'ANL-DEMO-' + Date.now().toString(36) + '-' + i, b: batch, t: Date.now(), o: u.npp + ' ' + u.nama, d: isi }); n++; });
        aver = String(Date.now());
        return ok({ ditambah: n, dihapus, batch, dilewati: masuk.length - n }, n + ' data surat diimpor.');
      }
      case 'analisa.data.hapus': {
        const L = dataSurat[d.tpl] || [], set = new Set(d.ids || []); const sisa = d.semua ? [] : L.filter((r) => !set.has(r.id));
        const n = L.length - sisa.length; dataSurat[d.tpl] = sisa; aver = String(Date.now());
        return ok({ dihapus: n }, n + ' data surat dihapus.');
      }
      case 'analisa.catat': return ok(null);
      case 'analisa.data.ubah': {                                   // v1.7: ubah 1 data Format Excel di tempat
        if (d.tpl !== 'XL-KUR') return fail('Format tidak mendukung ubah data.', 'VALIDATION');
        const r = (dataSurat['XL-KUR'] || []).find((x) => x.id === d.id); if (!r) return fail('Data tidak ditemukan (mungkin sudah dihapus).');
        const inp = d.d || {}; let n = 0;
        Object.keys(inp).forEach((k) => { if (!XL_FIELD.includes(k)) return; let v = inp[k];
          if (k === 'xl_ubah' && v) { try { const o = JSON.parse(v); if (!o || typeof o !== 'object' || Array.isArray(o)) v = ''; } catch (e) { v = ''; } if (String(v).length > 40000) return; }
          if (v === '' || v === null || v === undefined) delete r.d[k]; else r.d[k] = v; n++; });
        r.t = Date.now(); aver = String(Date.now());
        return ok({ id: r.id, diubah: n, aver }, 'Data disimpan.');
      }
      // ----- v1.7: Pipeline
      case 'pipeline.list': {
        const cak = pipeCak(u), L = pipe.filter((r) => bolehPipe(cak, r, u)).map((r) => Object.assign({}, r));
        const npps = {}; L.forEach((r) => { npps[r.np] = 1; });
        const bd = {}; ds().rows.forEach((x) => { if (!npps[x[27]] || x[10] !== 'Aktif') return; const t = bd[x[27]] || (bd[x[27]] = { bd: 0, n: 0 }); t.bd += x[8]; t.n++; });
        const opsi = { SME: opsiRm('SME'), SBP: opsiRm('SBP') };
        if (!cak.semua) Object.keys(opsi).forEach((k) => { opsi[k] = opsi[k].filter((x) => cak.npp.includes(x.npp)); }); else if (cak.s) Object.keys(opsi).forEach((k) => { if (k !== cak.s) opsi[k] = []; });
        return ok({ rows: L, bd, tgl: tglList()[0] || '', me: u.npp, cakupan: cak.semua ? (cak.s || 'semua') : (cak.npp.length > 1 ? 'bawahan' : 'sendiri'), opsi: Object.assign({ rm: opsi, spoke: aksesD().unit }, PIPE_OPSI), periode: PERIODE });
      }
      case 'pipeline.simpan': {
        const seg = d.seg === 'SBP' ? 'SBP' : d.seg === 'SME' ? 'SME' : ''; if (!seg) return fail('Segmen pipeline tidak valid.', 'VALIDATION');
        const cak = pipeCak(u); if (cak.semua && cak.s && cak.s !== seg) return fail('Peran Anda hanya untuk pipeline ' + cak.s + '.', 'FORBIDDEN');
        const tx = (v, n) => String(v === null || v === undefined ? '' : v).trim().slice(0, n || 120), num = (v) => { const n = typeof v === 'number' ? v : Number(String(v || 0).replace(/[^\d]/g, '')); return isFinite(n) && n >= 0 ? Math.round(n) : NaN; };
        const o = { seg, nm: tx(d.nm, 100), bu: tx(d.bu), per: /^\d{4}-\d{2}$/.test(String(d.per || '')) ? d.per : PERIODE, np: String(d.np || '').replace(/\D/g, '').padStart(5, '0'), sf: PIPE_OPSI.sifat.includes(d.sf) ? d.sf : '' };
        if (!o.nm) return fail('Nama Debitur wajib diisi.', 'VALIDATION');
        if (!d.np) return fail((seg === 'SME' ? 'Nama RM' : 'Nama PRM/ARM') + ' wajib dipilih.', 'VALIDATION');
        if (!o.sf) return fail('Sifat Kredit wajib dipilih (Baru / Tambahan).', 'VALIDATION');
        if (seg === 'SME') { Object.assign(o, { jk: tx(d.jk, 60), mk: num(d.mk), mm: num(d.mm), rc: num(d.rc), sp: tx(d.sp, 80), pt: tx(d.pt), pk: tx(d.pk), pp: tx(d.pp), fk: '', os: 0, nom: 0, net: 0, kw: '', rb: '' }); [1, 2, 3, 4, 5].forEach((w) => { o['w' + w] = tx(d['w' + w], 300); }); if ([o.mk, o.mm, o.rc].some(isNaN)) return fail('Nominal (Rp) harus angka ≥ 0.', 'VALIDATION'); }
        else {
          o.jk = PIPE_OPSI.jenis.includes(d.jk) ? d.jk : ''; if (!o.jk) return fail('Jenis Kredit wajib dipilih.', 'VALIDATION');
          o.fk = PIPE_OPSI.fasilitas.includes(d.fk) ? d.fk : ''; if (!o.fk) return fail('Fasilitas Kredit wajib dipilih (KI / KMK).', 'VALIDATION');
          o.nom = num(d.nom); o.os = o.sf === 'Tambahan' ? num(d.os) : 0; if (isNaN(o.nom) || isNaN(o.os)) return fail('Nominal (Rp) harus angka ≥ 0.', 'VALIDATION'); if (!o.nom) return fail('Nominal Pengajuan wajib diisi.', 'VALIDATION');
          o.net = o.sf === 'Tambahan' ? o.nom - o.os : o.nom;
          o.kw = PIPE_OPSI.kewenangan.includes(d.kw) ? d.kw : ''; if (!o.kw) return fail('Kewenangan wajib dipilih.', 'VALIDATION');
          o.rb = PIPE_OPSI.booking.includes(d.rb) ? d.rb : ''; if (!o.rb) return fail('Rencana Booking wajib dipilih (W1–W5).', 'VALIDATION');
          Object.assign(o, { mk: 0, mm: 0, rc: 0, sp: '', pt: '', pk: '', pp: '', w1: '', w2: '', w3: '', w4: '', w5: '' });
        }
        const rm = opsiRm(seg).find((x) => x.npp === o.np); if (!rm) return fail((seg === 'SME' ? 'RM' : 'PRM/ARM') + ' tidak terdaftar sebagai pengguna aktif.', 'VALIDATION');
        if (!cak.semua && !cak.npp.includes(o.np)) return fail('Anda hanya dapat mengisi pipeline atas nama ' + (cak.npp.length > 1 ? 'Anda atau bawahan Anda.' : 'Anda sendiri.'), 'FORBIDDEN');
        o.rm = rm.nama;
        const lama = d.id ? pipe.find((r) => r.id === d.id) : null;
        if (d.id && !lama) return fail('Pipeline tidak ditemukan (mungkin sudah dihapus).');
        if (lama && (!bolehPipe(cak, lama, u) || lama.seg !== seg)) return fail('Anda tidak dapat mengubah pipeline ini.', 'FORBIDDEN');
        const oleh = u.npp + ' ' + u.nama;
        if (lama) Object.assign(lama, o, { diubah: Date.now(), olehU: oleh });
        else pipe.push(Object.assign(o, { id: 'PL-' + iso(new Date()).slice(2).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(), dibuat: Date.now(), oleh, diubah: Date.now(), olehU: oleh }));
        return ok({ id: lama ? lama.id : o.id }, lama ? 'Pipeline diperbarui.' : 'Pipeline ditambahkan.');
      }
      case 'pipeline.hapus': {
        const i = pipe.findIndex((r) => r.id === d.id); if (i < 0) return fail('Pipeline tidak ditemukan.');
        if (!bolehPipe(pipeCak(u), pipe[i], u)) return fail('Anda tidak dapat menghapus pipeline ini.', 'FORBIDDEN');
        pipe.splice(i, 1); return ok({ id: d.id }, 'Pipeline dihapus.');
      }
      case 'import.info': {
        if (!String(d.sumber || '').trim()) return fail('Tempel URL atau ID spreadsheet sumber.');
        return ok({ nama: 'Rekap Cabang (demo)', id: 'demo', sheets: [
          { nama: 'JBA', baris: 4, kolom: 6, atas: [['Nama Deb', 'No CIF', 'Telp', 'Sisa Pokok', 'Limit', 'Produk'], ['PT Contoh Satu', 'CIF001', '08111111111', '50.000.000', '80.000.000', 'KUR KECIL'], ['CV Contoh Dua', 'CIF002', '08122222222', '40.000.000', '60.000.000', 'BWU'], ['UD Contoh Tiga', 'CIF003', '08133333333', '15.000.000', '25.000.000', 'KUR MIKRO']] },
          { nama: 'PMI', baris: 3, kolom: 5, atas: [['REKAP KUR PMI'], ['Nama Pekerja', 'Rek Afiliasi', 'PT', 'Tenor', 'Angkatan'], ['Siti Contoh', '0533001122', 'PT Minori SSW', '36', 'Batch 9']] }] });
      }
      case 'import.peta': return ok({ sumber: impSumber, profil: impPeta, sheets: null });
      case 'import.peta.simpan': impSumber = String(d.sumber || ''); impPeta = (d.profil || []).slice(0, 2); return ok({ profil: impPeta }, 'Pemetaan kolom disimpan.');
      case 'import.run': {
        const prof = (d.profil || []).filter((p) => p.aktif && p.sheet);
        if (prof.length) { impSumber = String(d.sumber || ''); impPeta = (d.profil || []).slice(0, 2); }
        const lap = {};
        if (d.sheets && d.sheets.Debitur && !prof.length) lap.Debitur = { sumber: 120, ditambah: 18, diperbarui: 0, dilewati: 102 };
        prof.forEach((p) => {
          const pm = p.jenis === 'pmi', K = p.kolom || {};
          const contoh = pm ? [{ nm: 'Siti Contoh', ra: '0533001122', pt: (K.pt || '').indexOf('tetap:') === 0 ? K.pt.slice(6) : 'PT Minori SSW', pr: 'KUR PMI' }] : [{ nm: 'PT Contoh Satu', cif: 'CIF001', wa: '08111111111', bd: '50.000.000', pl: '80.000.000', pr: (K.pr || '').indexOf('tetap:') === 0 ? K.pr.slice(6) : 'KUR KECIL' }, { nm: 'CV Contoh Dua', cif: 'CIF002', wa: '08122222222', bd: '40.000.000', pl: '60.000.000', pr: 'BWU' }];
          const kol = Object.keys(contoh[0]).map((f) => ({ f, sumber: K[f] ? (K[f].indexOf('tetap:') === 0 ? '= ' + K[f].slice(6) : K[f].replace(/^(hdr|kol):/, '')) : (pm && f === 'pr' ? '= KUR PMI' : 'otomatis') }));
          lap[pm ? 'Debitur KUR PMI' : 'Debitur Umum'] = { sumber: pm ? 1 : 3, ditambah: pm ? 1 : 3, diperbarui: 0, dilewati: 0, contoh, kolom: kol,
            multi: pm ? [] : [{ cif: 'CIF001', nama: 'PT Contoh Satu', rek: ['1001234567', '1001234999'] }], nMulti: pm ? 0 : 1 };
        });
        if (d.sheets && d.sheets.Pengguna) lap.Pengguna = { sumber: 4, ditambah: 0, diperbarui: 0, dilewati: 4 };
        return ok({ sumber: { nama: 'Rekap Cabang (demo)', id: 'demo' }, dryRun: d.dryRun !== false, laporan: lap, peringatan: ['Demo: tidak ada data yang benar-benar ditulis.'] }, d.dryRun !== false ? 'Pindai selesai — belum ada data yang ditulis.' : 'Import selesai (demo).');
      }
      default: return fail('Aksi tidak dikenal: ' + a, 'UNKNOWN');
    }
  }

  async function mulai2fa(u) {
    const bytes = crypto.getRandomValues(new Uint8Array(20)), sec = b32enc(Array.from(bytes));
    const tq = b32enc(Array.from(crypto.getRandomValues(new Uint8Array(8))));
    const c = cred(); c[u.npp] = Object.assign(c[u.npp] || {}, { tp: sec, tq, tx: Date.now() + 180e3 }); setCred(c);
    const iss = setting.TOTP_ISSUER;
    return { langkah: 'SETUP_2FA', tiket: tok({ n: u.npp, s: '2fa', q: tq, x: Date.now() + 6e5 }), nama: u.nama, issuer: iss, akun: u.npp + ' ' + u.nama, berlakuDetik: 180,
      otpauth: 'otpauth://totp/' + encodeURIComponent(iss + ':' + u.npp + ' ' + u.nama) + '?secret=' + sec + '&issuer=' + encodeURIComponent(iss) + '&algorithm=SHA1&digits=6&period=30' };
  }

  return {
    async handle(body) { await new Promise((r) => setTimeout(r, 60 + Math.random() * 120)); return proses(JSON.parse(JSON.stringify(body))); },
    async kodeDemo(npp, setup) { const c = cred()[npp]; const s = c && (setup ? c.tp : c.t); return s ? totp(s, Math.floor(Date.now() / 30000)) : '—'; }
  };
})();
