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

  const PRODUK = [
    { kode: 'BWU', nama: 'BWU (Bisnis Wirausaha)', urut: 1, warna: '#8B5CF6' }, { kode: 'CCC', nama: 'CCC (Cash Collateral)', urut: 2, warna: '#F43F7A' },
    { kode: 'KUR', nama: 'KUR (Kredit Usaha Rakyat)', urut: 3, warna: '#3B82F6' }, { kode: 'KUR PMI', nama: 'KUR PMI', urut: 4, warna: '#F97316' },
    { kode: 'KPP', nama: 'KPP (Kredit Pemilikan)', urut: 5, warna: '#14B8A6' }];
  const N_AKTIF = { BWU: 1120, CCC: 864, KUR: 790, 'KUR PMI': 436, KPP: 272 };
  const RANGE = { BWU: [1e8, 2e9], CCC: [1e8, 3e9], KUR: [2.5e7, 5e8], 'KUR PMI': [1e7, 1e8], KPP: [2e8, 2.5e9] };
  const PRE = ['PT', 'CV', 'UD', 'Koperasi', 'Toko', 'Kelompok Tani'];
  const ORANG = ['Agung Nugroho', 'Dewi Sartika', 'Budi Hermawan', 'Rina Wulandari', 'Hendra Saputra', 'Sri Lestari', 'Andi Pratama', 'Yuliana Putri', 'Rudi Hartono', 'Maya Anggraini', 'Fajar Ramadhan', 'Nur Aini'];
  const KATA = ['Nusantara', 'Mandiri', 'Agro', 'Berkah', 'Surya', 'Logistik', 'Makmur', 'Sentosa', 'Teknik', 'Padi', 'Subur', 'Samudera', 'Karya', 'Bahari', 'Mega', 'Tirta', 'Kencana', 'Jaya', 'Abadi', 'Konstruksi', 'Sejahtera', 'Cahaya', 'Bintang', 'Timur', 'Prima', 'Graha', 'Perkasa', 'Lestari', 'Niaga', 'Sinar'];
  const PIC = ['Herman', 'Ibu Lestari', 'Bambang', 'Mandiri', 'Sukirno', 'Faisal', 'Irwan', 'Ridwan', 'Hendra', 'Yanto', 'Wati', 'Joko'];
  const RM = ['Siti Rahmawati', 'Dani Irawan', 'Budi Santoso', 'Andi Kurnia', 'Hendra Wijaya'];
  const kolAcak = () => { const r = rnd(); return r < 0.844 ? 1 : r < 0.934 ? 2 : r < 0.968 ? 3 : r < 0.989 ? 4 : 5; };
  const bulat = (n, k = 1e5) => Math.round(n / k) * k;

  const PT_DEMO = ['PT Minori Pemagang', 'PT Minori SSW', 'PT Aji', 'PT Nagomi', 'PT. Minori SSW', 'pt aji'];
  // ---------- Dataset ----------
  const rows = [];
  let no = 10000;
  PRODUK.forEach((p) => {
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
      const pt = p.kode === 'KUR PMI' ? (rnd() < 0.03 ? '' : PT_DEMO[no % PT_DEMO.length]) : '';
      // v1.2: kunci debitur (id) = Rek_Pinjaman
      rows.push([rp, nm, String(ri(1000000, 9999999)), pilih(PIC), wa, wv ? 1 : 0, p.kode, pl, bd, jt, lunas ? 'Lunas' : 'Aktif', kol, sb, sa, an, rnd() < 0.02 ? 1 : 0, pilih(RM), kl, rp, ra, pt, '']);
    }
  });
  rows.sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const COLS = ['id', 'nm', 'cif', 'pic', 'wa', 'wv', 'pr', 'pl', 'bd', 'jt', 'st', 'kol', 'sb', 'sa', 'an', 'oo', 'rm', 'kl', 'rp', 'ra', 'pt', 'il'];
  let ver = String(Date.now()), lver = '1', sver = '1.1.1';
  const ds = () => ({ cols: COLS, rows, n: rows.length, dibangun: Date.now(), periode: PERIODE, adaBaseline: true, ver });
  const byId = () => { const m = {}; rows.forEach((r) => { m[r[0]] = r; }); return m; };

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
    { npp: '20003', nama: 'Budi Santoso', email: '', peran: 'RM', status: 'Nonaktif', dibuat: new Date(Date.now() - 40 * 864e5).toISOString(), login: '' }];
  let tpl = [
    { id: 'TPL-001', nama: 'Reminder H-7 (Jadwal Angsuran)', isi: 'Yth. Bapak/Ibu {nama},\n\nKami mengingatkan angsuran kredit {produk} Anda sebesar *{angsuran}* akan jatuh tempo pada *{jatuh_tempo}*.\nMohon pastikan saldo rekening mencukupi sebelum tanggal tersebut.\n\nTerima kasih atas kerja samanya.\n— {cabang}', aktif: true, diperbarui: new Date(Date.now() - 20 * 864e5).toISOString(), oleh: '10001 Dewi Kartika' },
    { id: 'TPL-002', nama: 'Reminder H-3 (Defisit Saldo)', isi: 'Yth. Bapak/Ibu {nama},\n\nAngsuran {produk} Anda sebesar *{angsuran}* jatuh tempo pada *{jatuh_tempo}*. Saldo rekening saat ini belum mencukupi, kekurangan sekitar *{kekurangan}*.\nMohon segera melakukan setoran agar terhindar dari denda keterlambatan.\n\n— {cabang}', aktif: true, diperbarui: new Date(Date.now() - 12 * 864e5).toISOString(), oleh: '10001 Dewi Kartika' },
    { id: 'TPL-003', nama: 'Panggilan Mendesak (H-1 Jatuh Tempo)', isi: 'Yth. Bapak/Ibu {nama},\n\nAngsuran {produk} sebesar *{angsuran}* jatuh tempo BESOK ({jatuh_tempo}). Sisa baki debet Anda {baki_debet}.\nMohon konfirmasi setoran Anda dengan membalas pesan ini atau menghubungi RM Anda.\n\n— {cabang}', aktif: true, diperbarui: new Date(Date.now() - 5 * 864e5).toISOString(), oleh: '10001 Dewi Kartika' }];
  const KET = { NAMA_APLIKASI: 'Nama aplikasi di sidebar & judul', SUBJUDUL: 'Teks kecil di bawah logo', NAMA_INSTITUSI: 'Nama institusi di footer & laporan', NAMA_CABANG: 'Nama unit/cabang (placeholder {cabang} di template WA)', POLLING_DETIK: 'Interval cek pembaruan data di browser (detik, 15–120)', JT_HARI: 'Rentang "jatuh tempo" ke depan (hari)', WA_MODE: 'fonnte = kirim sungguhan, simulasi = uji alur tanpa mengirim (UAT)', WA_KUOTA_HARIAN: 'Batas pesan WA per hari', WA_BATCH: 'Pesan yang diproses per eksekusi pemicu (10–40)', WA_JEDA: 'Jeda acak antarpesan di gateway (detik, format min-maks)', TOTP_ISSUER: 'Nama yang tampil di aplikasi Authenticator', SESI_JAM: 'Lama sesi login (jam, 1–24)', LOGO_DATA: 'Logo aplikasi', LOGO_UKURAN: 'Ukuran logo di sidebar (piksel, 24–80)', LOGO_TEKS: 'Tampilkan nama aplikasi di samping logo (ya/tidak)' };
  const setting = { NAMA_APLIKASI: 'FinSight', SUBJUDUL: 'Business Banking', NAMA_INSTITUSI: '', NAMA_CABANG: 'KC Contoh Jakarta', POLLING_DETIK: '30', JT_HARI: '30', WA_MODE: 'simulasi', WA_KUOTA_HARIAN: '1000', WA_BATCH: '25', WA_JEDA: '3-8', TOTP_ISSUER: 'FinSight Demo', SESI_JAM: '8', LOGO_DATA: '', LOGO_UKURAN: '34', LOGO_TEKS: 'ya' };
  let token = { ada: false, samar: '' };
  setting.PERAN_AKSES = JSON.stringify({ RM: ['dashboard', 'kualitas', 'debitur', 'risiko', 'blast', 'log'], Manager: ['dashboard', 'kualitas', 'debitur', 'risiko', 'log'] });
  setting.PMI_PT = JSON.stringify(['PT Minori Pemagang', 'PT Minori SSW', 'PT Aji', 'PT Nagomi']);
  KET.PERAN_AKSES = 'Menu yang boleh dibuka tiap peran'; KET.PMI_PT = 'Daftar PT penempatan debitur KUR PMI';
  const MENU_PERAN = ['dashboard', 'kualitas', 'debitur', 'risiko', 'blast', 'template', 'log'];
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
        logs.push({ id: batch + '-' + pad(i + 1), batch, w, npp: peng, idd: r[0], nm: r[1], tp, st, coba: 1, ket: st === 'Terkirim' ? 'Diterima gateway #' + ri(80000000, 89999999) : pilih(['Nomor tidak terdaftar di WhatsApp', 'Perangkat gateway terputus']), kirim: w + 6000 });
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
  const keamanan = (npp) => { const c = cred()[npp]; return !c ? 'Belum aktivasi' : c.ch ? 'Wajib ganti sandi' : !c.t ? 'Belum 2FA' : '2FA aktif'; };

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
    'user.list': 'A', 'user.simpan': 'A', 'user.reset': 'A', 'user.gantiNpp': 'A', 'peran.simpan': 'A', 'pmi.simpan': 'A', 'setting.get': 'A', 'setting.simpan': 'A', 'rahasia.simpan': 'A', 'snapshot.jalankan': 'A', 'import.run': 'A'
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
      const cocok = u && u.status === 'Aktif' && (c ? c.pw === d.password : d.password === npp);
      if (!cocok) return fail('NPP atau kata sandi salah.', 'AUTH_FAIL');
      if (!c || c.ch) return ok({ langkah: 'GANTI_SANDI', tiket: tok({ n: npp, s: 'pw', x: Date.now() + 6e5 }), nama: u.nama, pertama: !c });
      if (!c.t) return ok(await mulai2fa(u));
      return ok({ langkah: 'OTP', tiket: tok({ n: npp, s: 'otp', x: Date.now() + 6e5 }), nama: u.nama });
    }
    if (a === 'auth.gantiSandi') {
      const p = bacaTok(d.tiket); if (!p || p.s !== 'pw') return fail('Langkah login kedaluwarsa. Silakan masuk ulang dari awal.', 'AUTH');
      const v = String(d.baru || ''), u = users.find((x) => x.npp === p.n);
      if (v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v) || v.includes(p.n)) return fail('Kata sandi minimal 8 karakter, kombinasi huruf & angka, tanpa NPP.', 'VALIDATION');
      const c = cred(); c[p.n] = Object.assign(c[p.n] || {}, { pw: v, ch: 0 }); setCred(c);
      if (!c[p.n].t) return ok(await mulai2fa(u), 'Kata sandi berhasil diganti.');
      return ok({ langkah: 'OTP', tiket: tok({ n: p.n, s: 'otp', x: Date.now() + 6e5 }), nama: u.nama }, 'Kata sandi berhasil diganti.');
    }
    if (a === 'app.brand') return ok({ nama: setting.NAMA_APLIKASI, sub: setting.SUBJUDUL, logo: setting.LOGO_DATA || '', ukuran: +setting.LOGO_UKURAN || 34, teks: setting.LOGO_TEKS !== 'tidak', sver });
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
      const L = await cekTotp(sec, String(d.kode || ''), lingkup === 'otp' ? x.ls : 0);
      if (L < 0) return fail(lingkup === '2fa' ? 'Kode tidak cocok. Pastikan jam ponsel otomatis lalu masukkan kode terbaru.' : 'Kode authenticator salah atau sudah dipakai.', 'OTP_FAIL');
      if (lingkup === '2fa') { x.t = x.tp; x.ta = Date.now(); delete x.tp; delete x.tq; delete x.tx; }
      x.ls = L; setCred(c);
      u.login = new Date().toISOString();
      const j = Math.random().toString(36).slice(2, 10), sa = sesiAktif(); sa[u.npp] = j; localStorage.setItem(KS, JSON.stringify(sa));
      return ok({ langkah: 'SELESAI', token: tok({ n: u.npp, r: u.peran, i: Date.now(), x: Date.now() + 8 * 36e5, j }), me: me(u), akses: menuPeran(u.peran) }, lingkup === '2fa' ? 'Autentikasi dua faktor aktif.' : '');
    }
    // ----- butuh sesi
    const u = sesi(body.token);
    if (!u) return gagalSesi();
    if (!boleh(u, a)) return fail('Anda tidak memiliki hak akses untuk fitur ini.', 'FORBIDDEN');
    switch (a) {
      case 'boot': return ok(Object.assign({ me: me(u), akses: menuPeran(u.peran), setting, produk: PRODUK, ver, lver, server: Date.now(), periode: PERIODE, hariIni: HARI, snap, gw: gw(u) }, d.ver === ver ? { notModified: true } : { ds: ds() }, boleh(u, 'blast.kirim') ? { tpl: tpl.filter((t) => t.aktif) } : {}));
      case 'sync.ping': {
        if (Date.now() - mutasiAkhir > 120000) {    // simulasi perubahan di Google Sheets tiap ±2 menit
          mutasiAkhir = Date.now();
          const r = pilih(rows.filter((x) => x[10] === 'Aktif'));
          r[13] = r[13] < r[14] ? r[14] * 2 : Math.round(r[13] * 0.9); r[12] = r[14];
          ver = String(Date.now());
        }
        return ok({ ver, lver, sver, t: Date.now() });
      }
      case 'data.debitur': return ok(d.ver === ver ? { ver, notModified: true } : { ver, ds: ds(), produk: PRODUK });
      case 'data.snapshot': return ok({ snap, periode: PERIODE });
      case 'cache.refresh': return ok({ ver, berubah: false }, 'Data sudah paling baru.');
      case 'snapshot.jalankan': return ok({ r: { ok: true, periode: PERIODE }, snap }, 'Snapshot periode ' + PERIODE + ' diperbarui.');
      case 'auth.me': return ok({ me: me(u), totpAktif: true });
      case 'auth.logout': return ok(null, 'Anda telah keluar.');
      case 'auth.ubahSandi': {
        const c = cred(), x = c[u.npp];
        if (x.pw !== d.lama) return fail('Kata sandi lama salah.', 'VALIDATION');
        if (await cekTotp(x.t, String(d.kode || ''), x.ls) < 0) return fail('Kode authenticator salah.', 'VALIDATION');
        if (String(d.baru || '').length < 8 || !/[A-Za-z]/.test(d.baru) || !/\d/.test(d.baru)) return fail('Kata sandi minimal 8 karakter, kombinasi huruf & angka.', 'VALIDATION');
        x.pw = d.baru; setCred(c);
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
        const m = byId(), s0 = hariIniMs();
        const sudah = new Set(logs.filter((l) => l.w >= s0 && l.st !== 'Gagal' && l.st !== 'Batal').map((l) => l.idd + '|' + l.tp));
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
        kirim.forEach((id, i) => logs.push({ id: batch + '-' + String(i + 1).padStart(3, '0'), batch, w: now, npp: u.npp, idd: id, nm: m[id][1], tp: t.id, st: 'Antre', coba: 0, ket: '', kirim: 0 }));
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
      case 'user.list': return ok({ users: users.map((x) => Object.assign({}, x, { label: labelPeran(x.peran), keamanan: keamanan(x.npp) })) });
      case 'user.gantiNpp': {
        const x = users.find((y) => y.npp === d.npp), baru = String(d.baru || '');
        if (!x) return fail('Pengguna tidak ditemukan.');
        if (!/^\d{5}$/.test(baru)) return fail('NPP baru harus 5 digit angka.', 'VALIDATION');
        if (baru === x.npp) return fail('NPP baru sama dengan NPP lama.', 'VALIDATION');
        if (users.some((y) => y.npp === baru)) return fail('NPP ' + baru + ' sudah dipakai pengguna lain.', 'VALIDATION');
        const lama = x.npp, c = cred(); if (c[lama]) { c[baru] = c[lama]; delete c[lama]; setCred(c); }
        const sa = sesiAktif(); delete sa[lama]; localStorage.setItem(KS, JSON.stringify(sa));
        x.npp = baru;
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
        if (!x) { x = { npp: d.npp, dibuat: new Date().toISOString(), login: '' }; users.push(x); }
        Object.assign(x, { nama: d.nama, email: d.email || '', peran: d.peran, status: d.status });
        return ok({ npp: d.npp }, d.mode === 'tambah' ? 'Pengguna ditambahkan. Sandi awal = NPP.' : 'Data pengguna diperbarui.');
      }
      case 'user.reset': {
        const c = cred();
        if (d.mode === 'semua') delete c[d.npp]; else if (d.mode === '2fa' && c[d.npp]) { delete c[d.npp].t; delete c[d.npp].tp; delete c[d.npp].tq; delete c[d.npp].tx; delete c[d.npp].ls; }
        setCred(c);
        return ok(null, d.mode === 'buka' ? 'Kunci akun dibuka.' : d.mode === '2fa' ? 'Authenticator direset. QR baru tampil saat login berikutnya.' : 'Akses direset. Login dengan sandi = NPP.');
      }
      case 'setting.get': return ok({ setting, keterangan: KET, rahasia: { FONNTE_TOKEN: token }, sistem: { versi: '1.2.0 (demo)', dataVer: ver, spreadsheetUrl: 'https://docs.google.com/spreadsheets/', folderEkspor: '', pemicu: ['onChangeData', 'prosesAntrian', 'warmupCache', 'snapshotHarian'] } });
      case 'setting.simpan': {
        const inp = d.setting || {};
        if (inp.LOGO_DATA && (String(inp.LOGO_DATA).length > 48000 || !/^data:image\/(png|jpeg|webp);base64,/.test(inp.LOGO_DATA))) return fail('Logo tidak valid atau terlalu besar. Gunakan PNG/JPG/WEBP — aplikasi otomatis memperkecilnya.', 'VALIDATION');
        Object.keys(inp).forEach((k) => { if (k in setting && k !== 'PERAN_AKSES' && k !== 'PMI_PT') setting[k] = String(inp[k]); });
        if ('LOGO_UKURAN' in inp) setting.LOGO_UKURAN = String(Math.max(24, Math.min(80, Math.round(+inp.LOGO_UKURAN) || 34)));
        if ('LOGO_TEKS' in inp) setting.LOGO_TEKS = inp.LOGO_TEKS === 'tidak' ? 'tidak' : 'ya';
        sver = sver + '.'; return ok({ setting }, 'Pengaturan disimpan.');
      }
      case 'rahasia.simpan':
        if (d.kunci !== 'FONNTE_TOKEN') return fail('Kunci tidak diizinkan.', 'FORBIDDEN');
        token = d.nilai === '__HAPUS__' ? { ada: false, samar: '' } : { ada: true, samar: String(d.nilai).slice(0, 4) + '••••••' + String(d.nilai).slice(-3) };
        return ok({ kunci: 'FONNTE_TOKEN', ada: token.ada, samar: token.samar }, 'Tersimpan.');
      case 'ekspor.pdf': return fail('Di mode demo, gunakan tombol Cetak lalu “Simpan sebagai PDF”.', 'DEMO');
      case 'ekspor.catat': return ok(null);
      case 'import.run': return ok({ sumber: { nama: 'Spreadsheet contoh (demo)', id: 'demo' }, dryRun: d.dryRun !== false, laporan: { Debitur: { sumber: 120, ditambah: 18, diperbarui: 0, dilewati: 102 } }, peringatan: ['Demo: tidak ada data yang benar-benar ditulis.'] }, d.dryRun !== false ? 'Pindai selesai — belum ada data yang ditulis.' : 'Import selesai (demo).');
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
