/* ==========================================================================
   FinSight — xlkur.js : v1.7 Format Excel KUR PMI (INPUT + CALL MEMO + BNI 105 = 1 format)
   - Tata letak (lebar kolom, tinggi baris, font, ukuran, garis, margin, skala, pemisah halaman)
     dari XLKUR_DATA (xlkur-data.js, dibuat dari berkas Excel format bank).
   - Rumus Excel dihitung di browser (mesin rumus kecil): VLOOKUP ke BATCH = data rekaman.
   - Data = baris sheet BATCH pengguna (A..AQ) + tanggal surat & permohonan + teks sel yang diubah.
   - "Link interaktif": klik sel di format → kolom data sumbernya disorot di formulir; ubah data →
     format dihitung ulang; mode Edit teks → ubah isi sel langsung (tersimpan per debitur).
   - Cetak / PDF A4 sama dengan Excel, simulasi angsuran metode ANUITAS.
   ========================================================================== */
'use strict';

const XLK = (() => {
  const D = typeof XLKUR_DATA !== 'undefined' ? XLKUR_DATA : { gaya: [], lembar: [] };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const huruf = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const indeks = (h) => { let n = 0; for (const ch of String(h).toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

  /** Kolom data = huruf kolom sheet BATCH (A..AQ) + isian INPUT. Label = judul kolom BATCH. */
  const LABEL = ['No (Batch)', 'Nama', 'Perusahaan', 'Kumiai', 'NIK', 'No. Paspor', 'No. Visa', 'No. Akte Lahir', 'Nama Ibu Kandung', 'No HP', 'Email', 'NPWP',
    'Tempat Penempatan Kerja', 'Jenis Pekerjaan', 'Lama Penempatan (bulan)', 'Gaji per Bulan (Yen)', 'Status', 'Tempat Lahir', 'Tanggal Lahir', 'Jenis Kelamin',
    'Jangka Waktu (bulan)', 'Rencana Berangkat', 'Hasil SLIK', 'Plafond Pinjaman', 'Usia', 'Keluarga — Nama', 'Keluarga — No HP', 'Alamat', 'Alamat sesuai KTP',
    'JL/KP', 'RT/RW', 'Desa/Kel', 'Kecamatan', 'Kota/Kab', 'Gaji Rupiah', 'Nama Pasangan', 'NIK Pasangan', 'Tgl Lahir Pasangan', 'No Surat',
    'Kewajiban Bank Lain / bln', 'Kurs Yen (AO1)', 'Tanggal Kurs (AP1)', 'Tgl Berangkat (teks)'];
  const ANGKA = ['a', 'o', 'p', 'u', 'x', 'y', 'ai', 'an', 'ao'];
  const TANGGAL = ['s', 'v', 'al'];
  const FIELD = LABEL.map((l, i) => { const h = huruf(i).toLowerCase(); return { k: 'b_' + h, h: huruf(i), label: l, tipe: ANGKA.includes(h) ? 'angka' : TANGGAL.includes(h) ? 'tanggal' : (h === 'w' || h === 'ab' || h === 'ac' || h === 'm') ? 'panjang' : 'teks' }; })
    .concat([{ k: 'xl_tglsurat', h: 'R2', label: 'Tanggal Surat (INPUT R2)', tipe: 'tanggal' }, { k: 'xl_tglmohon', h: 'R4', label: 'Tanggal Permohonan (INPUT R4)', tipe: 'tanggal' }]);
  const WAJIB = ['b_a', 'b_b', 'b_x', 'b_u'];

  // ------------------------------------------------------------------ angka & tanggal
  const grup = (n, d) => { const t = Math.abs(n).toFixed(d || 0).split('.'); t[0] = t[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '-' : '') + t[0] + (t[1] ? ',' + t[1] : ''); };
  function teksUmum(n) {
    if (!isFinite(n)) return '#NUM!';
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    let s = Number(n.toPrecision(11)).toString();
    if (/e/.test(s)) return s.toUpperCase().replace('.', ',');
    return s.replace('.', ',');
  }
  const isoKeSerial = (s) => { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5) : NaN; };
  const serialKeTgl = (n) => new Date(Date.UTC(1899, 11, 30) + Math.round(n * 864e5));
  /** Tanggal dari ISO / dd/mm/yyyy / serial / teks "24 November 2026" → Date (UTC) atau null. */
  function tanggal(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v > 20000 && v < 80000 ? serialKeTgl(v) : null;
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/); if (m) return new Date(Date.UTC(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]));
    m = s.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
    if (m) { const i = BULAN.concat(BLN).concat(HARI_EN).map((x) => x.toLowerCase()).findIndex((x) => x === m[2] || x.slice(0, 3) === m[2].slice(0, 3)); if (i > -1) return new Date(Date.UTC(+m[3], i % 12, +m[1])); }
    return null;
  }
  const iso = (d) => d ? d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2) : '';
  const tglPendek = (v) => { const d = tanggal(v); return d ? d.getUTCDate() + ' ' + BLN[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : String(v || ''); };
  function fmtTglPola(d, pola) {
    const dd = d.getUTCDate(), mm = d.getUTCMonth(), yy = d.getUTCFullYear();
    return pola.replace(/\[[^\]]*\]/g, '').replace(/\\(.)/g, '$1').replace(/yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d/g, (t) => ({
      yyyy: String(yy), yy: String(yy).slice(-2), mmmm: BULAN[mm], mmm: BLN[mm], mm: ('0' + (mm + 1)).slice(-2), m: String(mm + 1), dd: ('0' + dd).slice(-2), d: String(dd), dddd: '', ddd: ''
    }[t]));
  }
  const polaTanggal = (nf) => { const t = String(nf || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''); return /[dy]/i.test(t) && /m/i.test(t) && !/[#0]/.test(t); };

  /** Format tampilan nilai sesuai format angka Excel sel. Mengembalikan { t: teks, isi?: karakter isian } */
  function tampil(v, nf) {
    if (v && v.err) return { t: v.err };
    if (v === null || v === undefined || v === '') return { t: '' };
    nf = nf || '';
    const fill = nf.match(/^@\*\s*"(.)"$/);
    if (typeof v === 'boolean') return { t: v ? 'TRUE' : 'FALSE' };
    if (typeof v === 'string') {
      if (fill) return { t: v, isi: fill[1] };
      if (polaTanggal(nf) && /^\d{4}-\d{2}-\d{2}/.test(v)) return { t: fmtTglPola(tanggal(v), nf.split(';')[0]) };
      return { t: v };
    }
    if (!nf || /^General/i.test(nf) || nf === '@') return { t: teksUmum(v) };
    const sek = nf.split(';');
    if (polaTanggal(sek[0])) return { t: fmtTglPola(serialKeTgl(v), sek[0]) };
    let f = sek[0], x = v;
    if (v < 0 && sek[1]) { f = sek[1]; x = -v; } else if (v === 0 && sek[2]) f = sek[2];
    const lit = (s) => s.replace(/"([^"]*)"/g, '$1').replace(/\\(.)/g, '$1').replace(/_./g, ' ').replace(/\*./g, '');
    if (!/[0#?]/.test(f.replace(/"[^"]*"/g, ''))) return { t: lit(f).trim() || '-' };
    const pct = /%/.test(f.replace(/"[^"]*"/g, ''));
    if (pct) x *= 100;
    const inti = f.replace(/"[^"]*"/g, '').match(/[#0?,.]+/) || [''];
    const dec = (inti[0].split('.')[1] || '').replace(/[^0#?]/g, '').length;
    const pakaiGrup = /[#0],[#0]/.test(inti[0]);
    const angka = pakaiGrup ? grup(x, dec) : (dec ? x.toFixed(dec).replace('.', ',') : String(Math.round(x)));
    const tx = f.replace(/"([^"]*)"|\\(.)|_.|\*.|[#0?,.]+|%/g, (m0, a, b) => (a !== undefined ? a : b !== undefined ? b : m0[0] === '_' ? ' ' : m0[0] === '*' ? '' : m0 === '%' ? '%' : '\u0001'));
    return { t: tx.replace('\u0001', angka).replace(/\u0001/g, '').trim(), kanan: /\*/.test(f) };
  }

  // ------------------------------------------------------------------ mesin rumus
  function token(src) {
    const s = String(src).replace(/^=/, ''), t = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i], sisa = s.slice(i);
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '"') { let j = i + 1, v = ''; while (j < s.length) { if (s[j] === '"') { if (s[j + 1] === '"') { v += '"'; j += 2; continue; } j++; break; } v += s[j++]; } t.push({ k: 's', v }); i = j; continue; }
      if (ch === "'") { let j = i + 1, v = ''; while (j < s.length && !(s[j] === "'" && s[j + 1] !== "'")) { if (s[j] === "'") j++; v += s[j++]; } j++; if (s[j] === '!') { t.push({ k: 'sh', v }); i = j + 1; continue; } throw new Error('Nama sheet tidak valid'); }
      let m = sisa.match(/^(<>|<=|>=)/); if (m) { t.push({ k: 'op', v: m[1] }); i += 2; continue; }
      m = sisa.match(/^\d+(\.\d+)?([eE][+-]?\d+)?/); if (m) { t.push({ k: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      m = sisa.match(/^\$?([A-Za-z]{1,3})\$?(\d+)(?![A-Za-z0-9_(!])/); if (m) { t.push({ k: 'ref', v: m[1].toUpperCase() + m[2] }); i += m[0].length; continue; }
      m = sisa.match(/^[A-Za-z_][A-Za-z0-9_.]*/);
      if (m) {
        const w = m[0]; i += w.length;
        if (s[i] === '!') { t.push({ k: 'sh', v: w }); i++; continue; }
        if (s[i] === '(') { t.push({ k: 'fn', v: w.toUpperCase() }); continue; }
        if (/^(TRUE|FALSE)$/i.test(w)) { t.push({ k: 'b', v: /^TRUE$/i.test(w) }); continue; }
        throw new Error('Nama tidak dikenal: ' + w);
      }
      if ('+-*/^&=<>%'.includes(ch)) { t.push({ k: 'op', v: ch }); i++; continue; }
      if ('(),'.includes(ch)) { t.push({ k: ch }); i++; continue; }
      throw new Error('Karakter tidak dikenal: ' + ch);
    }
    return t;
  }
  function urai(src) {
    const t = token(src);
    let p = 0;
    const lihat = () => t[p], ambil = () => t[p++];
    const op = (vs) => { const x = lihat(); return x && x.k === 'op' && vs.includes(x.v) ? (p++, x.v) : null; };
    const banding = () => { let a = gabung(); let o; while ((o = op(['=', '<>', '<', '>', '<=', '>=']))) a = { t: 'bin', o, a, b: gabung() }; return a; };
    const gabung = () => { let a = tambah(); while (op(['&'])) a = { t: 'bin', o: '&', a, b: tambah() }; return a; };
    const tambah = () => { let a = kali(); let o; while ((o = op(['+', '-']))) a = { t: 'bin', o, a, b: kali() }; return a; };
    const kali = () => { let a = pangkat(); let o; while ((o = op(['*', '/']))) a = { t: 'bin', o, a, b: pangkat() }; return a; };
    const pangkat = () => { let a = unar(); while (op(['^'])) a = { t: 'bin', o: '^', a, b: unar() }; return a; };
    const unar = () => { const o = op(['-', '+']); if (o) return { t: 'un', o, x: unar() }; let x = dasar(); while (op(['%'])) x = { t: 'pct', x }; return x; };
    function dasar() {
      const x = ambil();
      if (!x) throw new Error('Rumus terpotong');
      if (x.k === 'n') return { t: 'n', v: x.v };
      if (x.k === 's') return { t: 's', v: x.v };
      if (x.k === 'b') return { t: 'b', v: x.v };
      if (x.k === 'ref') return { t: 'ref', sh: '', a: x.v };
      if (x.k === 'sh') { const r = ambil(); if (!r || r.k !== 'ref') throw new Error('Referensi sheet tidak valid'); return { t: 'ref', sh: x.v, a: r.v }; }
      if (x.k === 'fn') {
        ambil();                                   // (
        const args = [];
        if (lihat() && lihat().k === ')') { ambil(); return { t: 'fn', n: x.v, args }; }
        for (;;) { args.push(banding()); const s = ambil(); if (!s) throw new Error('Kurung fungsi tidak ditutup'); if (s.k === ')') break; if (s.k !== ',') throw new Error('Pemisah argumen tidak valid'); }
        return { t: 'fn', n: x.v, args };
      }
      if (x.k === '(') { const e = banding(); const z = ambil(); if (!z || z.k !== ')') throw new Error('Kurung tidak ditutup'); return e; }
      throw new Error('Token tidak terduga');
    }
    const e = banding();
    if (p < t.length) throw new Error('Sisa rumus tidak dikenal');
    return e;
  }
  const ERR = (e) => ({ err: e });
  const isErr = (v) => !!(v && v.err);
  function keAngka(v) {
    if (isErr(v)) return v;
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const s = String(v).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d+,\d+$/.test(s)) return parseFloat(s.replace(',', '.'));
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? isoKeSerial(s) : NaN;
    return isFinite(d) ? d : ERR('#VALUE!');
  }
  const keTeks = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? teksUmum(v) : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v));
  const benar = (v) => (typeof v === 'boolean' ? v : typeof v === 'number' ? v !== 0 : typeof v === 'string' ? /^true$/i.test(v) : !!v);
  const bulat = (x, d, mode) => { const f = Math.pow(10, d || 0), y = Math.abs(x) * f; const r = mode === 'up' ? Math.ceil(y - 1e-9) : mode === 'down' ? Math.floor(y + 1e-9) : Math.round(y + 1e-9); return Math.sign(x) * r / f; };

  /** Buku kerja 1 rekaman: nilai sel dihitung malas & di-memo. */
  function buku(rec, konf, ubah) {
    rec = lengkapi(rec || {});
    const memo = {}, sedang = {}, ast = {};
    const L = {}; D.lembar.forEach((l, i) => { L[l.n] = l; L[i] = l; });
    function token_(s) { return String(s).replace(/\{\{([a-z0-9_.]+)\}\}/gi, (m, k) => { const v = nilaiKonf(konf, k); return v === undefined || v === null ? '' : v; }); }
    function sel(sh, a) {
      const key = sh + '!' + a;
      if (key in memo) return memo[key];
      if (ubah && Object.prototype.hasOwnProperty.call(ubah, key)) return (memo[key] = token_(ubah[key]));
      const l = L[sh], c = l && l.sel[a];
      if (!c) return (memo[key] = null);
      const k = c[2];
      let v;
      if (k === 'n') v = c[3];
      else if (k === 's') v = token_(c[3]);
      else if (k === 'r') v = token_(c[3].map((r) => r[0]).join(''));
      else if (k === 'b') v = !!c[3];
      else if (k === 'd') v = c[3];
      else if (k === 'f') {
        if (sedang[key]) return ERR('#REF!');
        sedang[key] = 1;
        try { v = hitung(ast[key] || (ast[key] = urai(c[3])), sh); } catch (e) { v = ERR('#NAME?'); }
        delete sedang[key];
        if (typeof v === 'string') v = token_(v);
      } else v = null;
      return (memo[key] = v);
    }
    function hitung(n, sh) {
      switch (n.t) {
        case 'n': return n.v;
        case 's': return n.v;
        case 'b': return n.v;
        case 'ref': return sel(n.sh || sh, n.a);
        case 'pct': { const x = keAngka(hitung(n.x, sh)); return isErr(x) ? x : x / 100; }
        case 'un': { const x = keAngka(hitung(n.x, sh)); return isErr(x) ? x : n.o === '-' ? -x : x; }
        case 'bin': {
          const a = hitung(n.a, sh), b = hitung(n.b, sh);
          if (isErr(a)) return a; if (isErr(b)) return b;
          if (n.o === '&') return keTeks(a) + keTeks(b);
          if (['=', '<>', '<', '>', '<=', '>='].includes(n.o)) {
            let x = a, y = b;
            if (typeof x === 'string' || typeof y === 'string') { x = keTeks(x).toLowerCase(); y = keTeks(y).toLowerCase(); } else { x = keAngka(x); y = keAngka(y); }
            return { '=': x === y, '<>': x !== y, '<': x < y, '>': x > y, '<=': x <= y, '>=': x >= y }[n.o];
          }
          const x = keAngka(a), y = keAngka(b);
          if (isErr(x)) return x; if (isErr(y)) return y;
          if (n.o === '+') return x + y; if (n.o === '-') return x - y; if (n.o === '*') return x * y;
          if (n.o === '/') return y === 0 ? ERR('#DIV/0!') : x / y;
          if (n.o === '^') { const r = Math.pow(x, y); return isFinite(r) ? r : ERR('#NUM!'); }
          return ERR('#VALUE!');
        }
        case 'fn': return fungsi(n, sh);
      }
      return ERR('#VALUE!');
    }
    function fungsi(n, sh) {
      const A = n.args, v = (i) => hitung(A[i], sh), num = (i) => keAngka(v(i));
      const semua = () => A.map((x) => hitung(x, sh));
      switch (n.n) {
        case 'REC': { const x = rec[keTeks(v(0))]; return x === undefined || x === '' ? null : x; }
        case 'TGLS': { let x = v(0); if ((x === null || x === '') && A[1]) x = v(1); return x === null || x === '' ? '' : tglPendek(x); }
        case 'TERBILANG': { const x = num(0); return isErr(x) ? x : (typeof PAK !== 'undefined' ? PAK.terbilang(x) : String(Math.round(x))); }
        case 'CONCATENATE': { const L2 = semua(); const e = L2.find(isErr); return e || L2.map(keTeks).join(''); }
        case 'IF': { const c = v(0); if (isErr(c)) return c; return benar(c) ? (A[1] ? v(1) : true) : (A[2] ? v(2) : false); }
        case 'IFERROR': { const x = v(0); return isErr(x) ? v(1) : x; }
        case 'INT': { const x = num(0); return isErr(x) ? x : Math.floor(x); }
        case 'MOD': { const x = num(0), y = num(1); if (isErr(x)) return x; if (isErr(y)) return y; return y === 0 ? ERR('#DIV/0!') : x - y * Math.floor(x / y); }
        case 'ROUND': case 'ROUNDUP': case 'ROUNDDOWN': { const x = num(0), d = A[1] ? num(1) : 0; if (isErr(x)) return x; return bulat(x, d, n.n === 'ROUNDUP' ? 'up' : n.n === 'ROUNDDOWN' ? 'down' : ''); }
        case 'ABS': { const x = num(0); return isErr(x) ? x : Math.abs(x); }
        case 'SUM': case 'MAX': case 'MIN': { const L2 = semua().map(keAngka); const e = L2.find(isErr); if (e) return e; return n.n === 'SUM' ? L2.reduce((s, x) => s + x, 0) : n.n === 'MAX' ? Math.max(...L2) : Math.min(...L2); }
        case 'TRIM': return keTeks(v(0)).replace(/\s+/g, ' ').trim();
        case 'UPPER': return keTeks(v(0)).toUpperCase();
        case 'LOWER': return keTeks(v(0)).toLowerCase();
        case 'PROPER': return keTeks(v(0)).toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, a, b) => a + b.toUpperCase());
        case 'LEN': return keTeks(v(0)).length;
        case 'TEXT': { const x = v(0); return tampil(typeof x === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(x) ? keAngka(x) : x, keTeks(v(1))).t; }
        case 'AND': return semua().every(benar);
        case 'OR': return semua().some(benar);
        case 'NOT': return !benar(v(0));
      }
      return ERR('#NAME?');
    }
    /** Kolom data (REC) yang dipakai sebuah sel — langsung atau lewat sel lain (untuk tautan interaktif). */
    function jejak(sh, a, lihat) {
      lihat = lihat || {};
      const key = sh + '!' + a;
      if (lihat[key]) return [];
      lihat[key] = 1;
      const c = L[sh] && L[sh].sel[a];
      if (!c || c[2] !== 'f') return [];
      const out = new Set();
      const jalan = (n) => {
        if (!n) return;
        if (n.t === 'fn') { if (n.n === 'REC' && n.args[0] && n.args[0].t === 's') out.add(n.args[0].v); n.args.forEach(jalan); }
        else if (n.t === 'ref') jejak(n.sh || sh, n.a, lihat).forEach((x) => out.add(x));
        else if (n.t === 'bin') { jalan(n.a); jalan(n.b); } else if (n.t === 'un' || n.t === 'pct') jalan(n.x);
      };
      try { jalan(ast[key] || (ast[key] = urai(c[3]))); } catch (e) { /* abaikan */ }
      return Array.from(out);
    }
    return { sel, jejak, rec, token: token_ };
  }
  /** Nilai konfigurasi (penanda {{ttd.prm.nama}}, {{pt.kontak}}, {{pt.narasumber.1}}, {{kantor.kota}}). */
  function nilaiKonf(k, kunci) {
    k = k || {};
    const p = kunci.split('.');
    let o = p[0] === 'pt' ? ((k.pt || [])[0] || {}) : k[p[0]];
    for (let i = 1; i < p.length && o !== undefined && o !== null; i++) o = Array.isArray(o) ? o[+p[i]] : o[p[i]];
    return o;
  }
  /** Lengkapi kolom turunan seperti rumus sheet BATCH: AI = P × kurs (AO1), AQ = TEXT(V,"dd mmmm yyyy"). */
  function lengkapi(r) {
    const o = Object.assign({}, r);
    const P = keAngka(o.b_p), K = keAngka(o.b_ao);
    if ((o.b_ai === undefined || o.b_ai === '') && !isErr(P) && !isErr(K) && P && K) o.b_ai = P * K;
    if ((o.b_aq === undefined || o.b_aq === '') && o.b_v) { const d = tanggal(o.b_v); if (d) o.b_aq = fmtTglPola(d, 'dd mmmm yyyy'); }
    return o;
  }

  // ------------------------------------------------------------------ render
  let cssSiap = false;
  function pasangCss() {
    if (cssSiap) return;
    cssSiap = true;
    const st = document.createElement('style');
    st.id = 'xlkur-css';
    st.textContent = gayaCss();
    document.head.appendChild(st);
  }
  function gayaCss() {
    return D.gaya.map((g, i) => `.xl-t .g${i}{${g}}`).join('\n') + `
.xl-page{width:210mm;height:297mm;box-sizing:border-box;background:#fff;color:#000;position:relative;overflow:hidden;margin:0 auto 14px;box-shadow:0 2px 12px rgba(20,10,60,.18)}
.xl-isi{display:flex;flex-direction:column;align-items:flex-start}.xl-isi.tengah{align-items:center}
.xl-t{border-collapse:collapse;table-layout:fixed;font-family:Calibri,Carlito,'Segoe UI',Arial,sans-serif;font-size:11pt;line-height:1.18;color:#000}
.xl-t td{padding:0 2px;overflow:hidden;white-space:pre;vertical-align:bottom;box-sizing:border-box}
.xl-t td.xh{padding:0!important;border:0!important;font-size:0!important}
.xl-t .xv{overflow:hidden}
.xl-t .xo{display:block;overflow:hidden;white-space:pre;position:relative;z-index:1}
.xl-t td[data-o]{overflow:visible}.xl-t .xvo{overflow:visible}
.xl-t .xf{display:flex;justify-content:space-between;gap:4px}
.xl-t .xk{text-align:right}
.xl-sim{font-family:Calibri,Carlito,'Segoe UI',Arial,sans-serif;font-size:10pt;color:#000}
.xl-sim h2{font-size:13pt;margin:0 0 2pt;text-align:center}.xl-sim .xs-sub{text-align:center;margin:0 0 8pt;font-size:10pt}
.xl-sim table{border-collapse:collapse;width:100%}.xl-sim td,.xl-sim th{border:1px solid #000;padding:1.5pt 4pt;text-align:right;font-variant-numeric:tabular-nums}
.xl-sim th{background:#F4B183;text-align:center}.xl-sim td:first-child{text-align:center}.xl-sim tr.tot td{font-weight:700;background:#FBE5D6}
.xl-sim .xs-ring{display:grid;grid-template-columns:auto 1fr;gap:1pt 10pt;margin:0 0 8pt}.xl-sim .xs-ring b{font-weight:700}`;
  }
  const pxPt = (pt) => pt * 96 / 72;
  /** Halaman 1 lembar = pemisah halaman manual Excel + pemisah otomatis bila tinggi baris melebihi tinggi kertas A4 (seperti Excel). */
  function halaman(L) {
    const [r1, , r2] = L.area, z = (L.skala || 100) / 100, sembunyi = new Set(L.hr);
    const tinggi = (r) => (sembunyi.has(r) ? 0 : (L.rh[r] !== undefined ? L.rh[r] : L.drh));
    const tinggiKertas = (297 / 25.4 * 72) - (L.mg[2] + L.mg[3]) * 72 - 2;          // pt
    const hal = [], seg = [];
    let s = r1;
    L.brk.forEach((b) => { seg.push([s, b]); s = b + 1; });
    seg.push([s, r2]);
    seg.forEach(([pa, pb]) => {
      let mulai = pa, t = 0;
      for (let r = pa; r <= pb; r++) {
        const h = tinggi(r) * z;
        if (t + h > tinggiKertas && r > mulai) { hal.push([mulai, r - 1]); mulai = r; t = 0; }
        t += h;
      }
      hal.push([mulai, pb]);
    });
    return hal;
  }
  /** Halaman-halaman 1 lembar (mengikuti pemisah halaman Excel). opsi: { li, interaktif } */
  function lembarHtml(li, B, opsi) {
    const L = D.lembar[li], [r1, c1, r2, c2] = L.area;
    const atas = {}, tutup = new Set();
    L.gab.forEach(([a, b, c, d]) => { atas[a + ',' + b] = [c, d]; for (let r = a; r <= c; r++) for (let cc = b; cc <= d; cc++) if (r !== a || cc !== b) tutup.add(r + ',' + cc); });
    const tersembunyi = new Set(L.hr);
    const tinggi = (r) => (tersembunyi.has(r) ? 0 : (L.rh[r] !== undefined ? L.rh[r] : L.drh));
    const lebar = (c) => L.cw[c - c1] || 0;
    const isiSel = (r, c) => { const x = L.sel[huruf(c - 1) + r]; return !!(x && x[2] !== 'e'); };
    const lebarTot = L.cw.reduce((a, b) => a + b, 0);
    const z = (L.skala || 100) / 100;
    const hal = halaman(L);
    const ubah = (opsi && opsi.ubah) || {};
    return hal.map(([pa, pb], hi) => {
      let rows = '';
      for (let r = pa; r <= pb; r++) {
        if (tersembunyi.has(r)) continue;
        let tds = '';
        for (let c = c1; c <= c2; c++) {
          if (tutup.has(r + ',' + c)) continue;
          const a = huruf(c - 1) + r, cell = L.sel[a];
          const m = atas[r + ',' + c];
          let rs = 1, cs = 1, h = tinggi(r), w = lebar(c);
          if (m) {
            const rb = Math.min(m[0], pb);
            rs = 0; h = 0; for (let x = r; x <= rb; x++) if (!tersembunyi.has(x)) { rs++; h += tinggi(x); }
            cs = m[1] - c + 1; w = 0; for (let x = c; x <= m[1]; x++) w += lebar(x);
          }
          const span = (rs > 1 ? ` rowspan="${rs}"` : '') + (cs > 1 ? ` colspan="${cs}"` : '');
          if (!w) { tds += `<td class="xh"${span}></td>`; continue; }
          const gi = cell && cell[0] > -1 ? cell[0] : -1;
          let isi = '';
          let attr = '';
          if (cell && cell[2] !== 'e') {
            const v = B.sel(L.n, a);
            const dirubah = Object.prototype.hasOwnProperty.call(ubah, L.n + '!' + a);
            const g = D.gaya[gi] || '';
            const bungkus = /white-space:pre-wrap/.test(g);
            let html;
            if (cell[2] === 'r' && !dirubah) {
              html = cell[3].map((run) => { const st = run[1] || {}; const css = (st.b ? 'font-weight:700;' : '') + (st.i ? 'font-style:italic;' : '') + (st.u ? 'text-decoration:underline;' : '') + (st.s ? 'font-size:' + st.s + 'pt;' : '') + (st.f ? 'font-family:' + st.f + ';' : '');
                return `<span style="${css}">${esc(B.token(run[0]))}</span>`; }).join('');
            } else {
              const f = tampil(v, cell[1]);
              const t = bungkus ? f.t : String(f.t).replace(/\n/g, ' ');
              html = f.isi ? `<span class="xf"><span>${esc(t)}</span><span>${esc(f.isi)}</span></span>` : esc(t);
              if (f.kanan) html = `<span class="xk" style="display:block">${html}</span>`;
            }
            const kiri = !/text-align:(center|right|justify)/.test(g) && !(typeof v === 'number' && !/text-align:left/.test(g));
            let luber = false;
            const kosong = (x) => x >= c1 && x <= c2 && !isiSel(r, x) && !tutup.has(r + ',' + x) && !atas[r + ',' + x];
            const sisiKiri = () => { let t = 0; for (let x = c - 1; kosong(x); x--) t += lebar(x); return t; };
            const sisiKanan = () => { let t = 0; for (let x = c + 1; kosong(x); x++) t += lebar(x); return t; };
            if (!bungkus && !m) {                         // teks panjang meluber ke sel kosong di sebelahnya (seperti Excel)
              const tengah = /text-align:center/.test(g), kanan = /text-align:right/.test(g) || (typeof v === 'number' && !/text-align:(left|center)/.test(g));
              if (kiri) { const lw = sisiKanan(); if (lw) { luber = true; html = `<span class="xo" style="width:${Math.max(0, w + lw - 4)}px">${html}</span>`; } }
              else if (tengah) { const e = Math.min(sisiKiri(), sisiKanan()); if (e) { luber = true; html = `<span class="xo" style="width:${Math.max(0, w + 2 * e - 4)}px;margin-left:${-e}px;text-align:center">${html}</span>`; } }
              else if (kanan && typeof v !== 'number') { const e = sisiKiri(); if (e) { luber = true; html = `<span class="xo" style="width:${Math.max(0, w + e - 4)}px;margin-left:${-e}px;text-align:right">${html}</span>`; } }
            }
            isi = `<div class="xv${luber ? ' xvo' : ''}" style="max-height:${pxPt(h).toFixed(1)}px">${html}</div>`;
            if (luber) attr += ' data-o="1"';
            if (opsi && opsi.interaktif) attr += ` data-a="${li}!${a}"${cell[2] === 'f' ? ' data-k="f"' : ''}${dirubah ? ' data-u="1"' : ''}`;
          } else if (opsi && opsi.interaktif) attr = ` data-a="${li}!${a}" data-k="e"`;
          tds += `<td${gi > -1 ? ` class="g${gi}"` : ''}${span}${attr}>${isi}</td>`;
        }
        rows += `<tr style="height:${tinggi(r)}pt">${tds}</tr>`;
      }
      const mg = L.mg;
      return `<div class="xl-page" data-lembar="${esc(L.n)}" data-hal="${hi + 1}"><div class="xl-isi ${L.tengah ? 'tengah' : ''}" style="padding:${mg[2]}in ${mg[1]}in ${mg[3]}in ${mg[0]}in">
        <table class="xl-t" style="width:${lebarTot}px;zoom:${z}"><colgroup>${L.cw.map((x) => `<col style="width:${x}px">`).join('')}</colgroup><tbody>${rows}</tbody></table></div></div>`;
    }).join('');
  }
  /** Simulasi angsuran metode ANUITAS (= rumus H34 sheet INPUT / PMT Excel). */
  function hitungSim(B) {
    const P = keAngka(B.sel('INPUT', 'G16')), n = Math.round(keAngka(B.sel('INPUT', 'G17'))), b = keAngka(B.sel('INPUT', 'H31'));
    const ok = !isErr(P) && !isErr(n) && !isErr(b) && P > 0 && n > 0;
    const r = ok ? b / 12 : 0;
    const pmt = !ok ? 0 : r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
    const baris = [];
    let sisa = P;
    for (let i = 1; ok && i <= n; i++) { const bunga = sisa * r, pokok = pmt - bunga; sisa = Math.max(0, sisa - pokok); baris.push({ ke: i, pmt, bunga, pokok, sisa }); }
    return { ok, P, n, b, r, pmt, baris };
  }
  function simulasiHtml(B) {
    const S2 = hitungSim(B);
    if (!S2.ok) return '';
    const rp = (x) => 'Rp' + grup(Math.round(x));
    const per = 44, hal = [];
    for (let i = 0; i < S2.baris.length; i += per) hal.push(S2.baris.slice(i, i + per));
    const tot = S2.baris.reduce((a, x) => ({ pmt: a.pmt + x.pmt, bunga: a.bunga + x.bunga, pokok: a.pokok + x.pokok }), { pmt: 0, bunga: 0, pokok: 0 });
    return hal.map((L2, hi) => `<div class="xl-page" data-lembar="SIMULASI" data-hal="${hi + 1}"><div class="xl-sim" style="padding:0.45in 0.5in">
      ${hi === 0 ? `<h2>SIMULASI ANGSURAN KUR PMI — METODE ANUITAS</h2><p class="xs-sub">${esc(keTeks(B.sel('INPUT', 'G6')))} • ${esc(keTeks(B.sel('INPUT', 'A2')))}</p>
      <div class="xs-ring"><span>Maksimum Kredit</span><b>${rp(S2.P)}</b><span>Jangka Waktu</span><b>${S2.n} bulan</b><span>Suku Bunga</span><b>${grup(S2.b * 100, 2).replace(/,00$/, '')}% efektif anuitas per tahun</b>
        <span>Angsuran per bulan</span><b>${rp(S2.pmt)} (dibulatkan ${rp(keAngka(B.sel('INPUT', 'R121')) || Math.round(S2.pmt))})</b><span>Bunga bulan ke-1</span><b>${rp(S2.P * S2.r)}</b><span>Pokok bulan ke-1</span><b>${rp(S2.pmt - S2.P * S2.r)}</b></div>` : `<p class="xs-sub">Simulasi angsuran (lanjutan) — ${esc(keTeks(B.sel('INPUT', 'G6')))}</p>`}
      <table><thead><tr><th>Bulan ke</th><th>Angsuran</th><th>Bunga</th><th>Pokok</th><th>Sisa Pokok</th></tr></thead><tbody>
      ${L2.map((x) => `<tr><td>${x.ke}</td><td>${rp(x.pmt)}</td><td>${rp(x.bunga)}</td><td>${rp(x.pokok)}</td><td>${rp(x.sisa)}</td></tr>`).join('')}
      ${hi === hal.length - 1 ? `<tr class="tot"><td>Total</td><td>${rp(tot.pmt)}</td><td>${rp(tot.bunga)}</td><td>${rp(tot.pokok)}</td><td></td></tr>` : ''}</tbody></table></div></div>`).join('');
  }
  /** Semua halaman 1 rekaman: INPUT → CALL MEMO → BNI 105 (+ simulasi bila diminta). */
  function dokumen(rec, konf, opsi) {
    opsi = opsi || {};
    let ubah = {};
    try { ubah = rec && rec.xl_ubah ? JSON.parse(rec.xl_ubah) : {}; } catch (e) { ubah = {}; }
    const B = buku(rec, konf, ubah);
    const o = Object.assign({ ubah }, opsi);
    return { B, html: D.lembar.map((l, i) => lembarHtml(i, B, o)).join('') + (opsi.simulasi ? simulasiHtml(B) : '') };
  }
  function dokCetak(isi, judul) {
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${esc(judul || 'Format Excel KUR PMI')}</title><style>
      @page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      ${gayaCss()}
      .xl-page{margin:0;box-shadow:none;page-break-after:always;break-after:page}.xl-page:last-child{page-break-after:auto;break-after:auto}
      @media screen{body{background:#e9e7f1;padding:12px}.xl-page{margin:0 auto 14px;box-shadow:0 2px 12px rgba(0,0,0,.2)}}
    </style></head><body>${isi}</body></html>`;
  }
  async function cetak(daftar, konf, judul, simulasi) {
    const isi = daftar.map((r) => dokumen(r, konf, { simulasi }).html).join('');
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    const w = fr.contentWindow;
    w.document.open(); w.document.write(dokCetak(isi, judul)); w.document.close();
    try { if (w.document.fonts && w.document.fonts.ready) await w.document.fonts.ready; } catch (e) { /* abaikan */ }
    await new Promise((ok) => setTimeout(ok, 200));
    w.focus(); w.print();
    setTimeout(() => fr.remove(), 60000);
  }

  // ------------------------------------------------------------------ import & template
  const normN = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  /** Baca workbook pengguna (sheet BATCH + No Surat) → { rows: [rekaman], sheet, kurs, tglKurs, nSurat } */
  async function bacaWorkbook(file) {
    if (file.size > 25 * 1024 * 1024) throw new Error('File terlalu besar (maks 25 MB).');
    const buf = new Uint8Array(await file.arrayBuffer());
    if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new Error('Gunakan file Excel (.xlsx) yang berisi sheet BATCH.');
    const m = await Surat.unzip(buf);
    const nama = await Surat.daftarSheet(buf, m);
    const shB = nama.find((n) => n.trim().toUpperCase() === 'BATCH') || nama[0];
    const rows = await Surat.bacaXlsx(buf, shB, m);
    if (!rows || !rows.length) throw new Error('Sheet BATCH kosong.');
    let hi = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) { const r = rows[i] || []; if (normN(r[1]) === 'nama' && /^no/.test(normN(r[0]))) { hi = i; break; } }
    if (hi < 0) throw new Error('Judul kolom BATCH tidak ditemukan (kolom A = NO, kolom B = NAMA). Gunakan sheet BATCH dari format Excel KUR PMI.');
    const r0 = rows[0] || [];
    const kurs = keAngka(r0[indeks('AO')]);
    const tglKurs = r0[indeks('AP')];
    const shS = nama.find((n) => n.trim().toLowerCase() === 'no surat');
    const surat = {};
    let nSurat = 0;
    if (shS) {
      const rs = await Surat.bacaXlsx(buf, shS, m) || [];
      rs.slice(1).forEach((r) => { const k = normN(r[2]); if (k && r[0] !== '' && surat[k] === undefined) { surat[k] = r[0]; nSurat++; } });
    }
    const out = [];
    rows.slice(hi + 1).forEach((r) => {
      if (!r || String(r[1] || '').trim() === '') return;
      const o = {};
      for (let i = 0; i < 43; i++) {
        let v = r[i];
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'string') v = v.trim();
        const h = huruf(i).toLowerCase();
        if (ANGKA.includes(h) && typeof v === 'string') { const n = keAngka(v); if (!isErr(n)) v = n; }
        if (h === 'e' || h === 'j' || h === 'aa' || h === 'ak' || h === 'l') v = String(v).replace(/\.0+$/, '');
        o['b_' + h] = v;
      }
      if (o.b_ao === undefined && !isErr(kurs) && kurs) o.b_ao = kurs;
      if (o.b_ap === undefined && tglKurs) o.b_ap = tglKurs;
      if (o.b_am === undefined && surat[normN(o.b_b)] !== undefined) o.b_am = surat[normN(o.b_b)];
      const tk = tanggal(tglKurs);
      o.xl_tglsurat = tk ? iso(tk) : iso(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
      out.push(o);
    });
    return { rows: out, sheet: shB, kurs: isErr(kurs) ? 0 : kurs, tglKurs, nSurat, sheets: nama };
  }
  /** Template import = susunan sheet BATCH (judul baris 1–2, data mulai baris 3) + rumus AI & AQ, ditambah sheet No Surat. */
  async function template() {
    const x = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sel = (ref, v, st) => `<c r="${ref}" t="inlineStr" s="${st}"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
    const H2 = ['NO', 'NAMA', 'Perusahaan', 'Kumiai', 'NIK', 'NO. PASPOR', 'NO. VISA', 'NO AKTE LAHIR', 'Nama Ibu Kandung', 'NO HP', 'Email', 'NPWP', 'TEMPAT PENEMPATAN KERJA',
      'JENIS PEKERJAAN', 'LAMA PENEMPATAN', 'GAJI PERBULAN (YEN)', 'STATUS', 'TMP LHR', 'TGL LHR', 'JENIS KELAMIN', 'Jangka Waktu', 'Rencana Berangkat', 'Hasil SLIK',
      'PLAFOND PINJAMAN', 'USIA', 'Nama', 'No HP', 'Alamat', 'Alamat sesuai KTP', 'JL/KP', 'RT/RW', 'DESA/KEL', 'KEC', 'KOTA/KAB', 'GAJI RUPIAH', 'Nama Pasangan', 'NIK Pasangan',
      'Tanggal Lahir Pasangan', 'No Surat', 'Kewajiban Bank Lain / bln', 'Kurs (isi di AO1)', 'Tanggal kurs (AP1)', 'Date'];
    const r1 = `<row r="1" ht="22" customHeight="1">${sel('Z1', 'KELUARGA YANG DAPAT DIHUBUNGI', 1)}${sel('AC1', 'Alamat sesuai KTP', 1)}${sel('AI1', 'GAJI RUPIAH', 1)}${sel('AN1', 'Angsuran / kewajiban per bulan', 1)}<c r="AO1" s="3"><v>113.29</v></c>${sel('AP1', '', 4)}</row>`;
    const r2 = `<row r="2" ht="30" customHeight="1">${H2.map((h, i) => sel(huruf(i) + '2', h, 1)).join('')}</row>`;
    const r3 = `<row r="3"><c r="AI3" s="3"><f>IF(P3="","",P3*$AO$1)</f></c><c r="AQ3" s="2"><f>IF(V3="","",TEXT(V3,"dd mmmm yyyy"))</f></c></row>`;
    const cols = H2.map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 1 ? 30 : i === 22 || i === 27 || i === 28 ? 40 : 16}" customWidth="1" style="${ANGKA.includes(huruf(i).toLowerCase()) ? 3 : TANGGAL.includes(huruf(i).toLowerCase()) ? 4 : 2}"/>`).join('');
    const lembar1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="2" topLeftCell="C3" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${r1}${r2}${r3}</sheetData></worksheet>`;
    const lembar2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="32" customWidth="1"/><col min="4" max="13" width="18" customWidth="1"/></cols><sheetData><row r="1">${['No', 'Tanggal', 'Nama Debitur', 'No Surat', 'Batch', 'No PAK', '', 'Rekening', 'No.', 'No SKK', 'No.', 'No. PK', 'Plafond Kredit'].map((h, i) => (h ? sel(huruf(i) + '1', h, 1) : '')).join('')}</row></sheetData></worksheet>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8CBAD"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="BATCH" sheetId="1" r:id="rId1"/><sheet name="No Surat" sheetId="2" r:id="rId2"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', styles], ['xl/worksheets/sheet1.xml', lembar1], ['xl/worksheets/sheet2.xml', lembar2]
    ];
    return Surat.zip(files, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  return { D, FIELD, WAJIB, LABEL, halaman, buku, dokumen, cetak, dokCetak, pasangCss, gayaCss, tampil, urai, bacaWorkbook, template, tanggal, iso, tglPendek, hitungSim, lengkapi, nilaiKonf, huruf };
})();

// ============================================================================
//  XLUI — tab "Format Excel" di halaman Analisa
// ============================================================================
const XLU = { sel: new Set(), baris: '', f: { q: '', hal: 1, per: 10 }, mode: 'tautan', zoom: 0, draf: null, simpanT: null, simulasi: true };
const XL_ID = 'XL-KUR';
const XLUI = {
  data() { return AN.data[XL_ID] || null; },
  rows() {
    const q = XLU.f.q.trim().toLowerCase();
    const L = this.data() || [];
    return q ? L.filter((r) => Object.values(r.d).join(' ').toLowerCase().includes(q)) : L;
  },
  rec(id) { const r = (this.data() || []).find((x) => x.id === id); return r ? Object.assign({}, r.d, XLU.draf && XLU.draf.id === id ? XLU.draf.d : {}) : null; },
  render(admin) {
    const { esc, ic } = U;
    return `<div class="card an-tpl xl-head"><div class="an-tpl-h"><span class="kpi-ic soft" style="--c:#16A34A">${ic('xls', 20)}</span>
        <div class="grow"><small class="muted">Format Excel bank — sheet <b>INPUT</b>, <b>CALL MEMO</b> & <b>BNI 105</b> jadi 1 format</small><b class="an-tpl-n">Format Excel KUR PMI</b>
          <small class="muted">${XLK.D.lembar.map((l) => `${esc(l.n)} (${XLK.halaman(l).length} hlm, skala ${l.skala}%)`).join(' • ')} • font, ukuran, margin & tinggi baris sama dengan Excel • simulasi angsuran anuitas</small></div>
        <div class="row-g"><button class="btn btn-secondary btn-sm" data-act="xlTemplate">${ic('download', 15)} Template import (.xlsx)</button><button class="btn btn-primary btn-sm" data-act="xlImport">${ic('upload', 15)} Import data Excel</button></div></div>
        <div class="xl-step"><span>${ic('xls', 14)} Import file Excel berisi sheet <b>BATCH</b> (+ <b>No Surat</b>)</span><span>${ic('eye', 14)} Klik debitur → format terisi otomatis dari rumus</span><span>${ic('link2', 14)} Klik sel → kolom data sumber disorot • ubah data / teks sel langsung</span><span>${ic('print', 14)} Cetak / PDF A4</span></div></div>
      <div class="an-grid xl-grid"><section class="card tbl-card" id="xlData"></section>
        <section class="card an-prev-c"><div class="an-prev-h"><b>Format Excel</b><div class="row-g">
          <div class="seg" role="group" aria-label="Mode pratinjau"><button class="${XLU.mode === 'tautan' ? 'on' : ''}" data-act="xlMode" data-v="tautan" title="Klik sel untuk melihat kolom data sumbernya">${ic('link2', 13)} Tautan</button><button class="${XLU.mode === 'edit' ? 'on' : ''}" data-act="xlMode" data-v="edit" title="Ubah isi sel langsung di format">${ic('edit', 13)} Edit teks</button></div>
          <label class="chk sm"><input type="checkbox" data-act="xlSim" ${XLU.simulasi ? 'checked' : ''}><span>Simulasi anuitas</span></label>
          <button class="btn btn-primary btn-sm" data-act="xlCetak" id="xlCetak">${ic('print', 15)} Cetak / PDF</button></div></div>
          <div class="an-prev-i" id="xlInfo"></div>
          <div class="an-prev xl-prev" id="xlPrev"><div class="an-load"><span class="spin"></span> Menyusun format…</div></div>
          <div class="an-prev-f"><span class="muted sm">${ic('info', 13)} Pratinjau = hasil cetak A4. Pilih <b>Simpan sebagai PDF</b> di dialog cetak untuk file PDF.</span>
            <div class="row-g"><button class="btn-icon sm" data-act="xlZoom" data-v="-1" title="Perkecil">−</button><button class="btn-icon sm" data-act="xlZoom" data-v="1" title="Perbesar">+</button></div></div></section></div>
      <section class="card pad-l xl-form" id="xlForm"></section>`;
  },
  async mount() {
    XLK.pasangCss();
    if (!PKU.k && !PKU.muat) await PAKUI.muat();
    if (!this.data()) await this.muatData(); else { this.segarData(); this.pratinjau(); this.form(); }
  },
  async muatData() {
    const r = await Api.call('analisa.data.list', { tpl: XL_ID });
    if (!r.success) { U.toast(r.message, 'err'); AN.data[XL_ID] = []; }
    else AN.data[XL_ID] = r.data.rows;
    if (XLU.baris && !(AN.data[XL_ID] || []).some((x) => x.id === XLU.baris)) XLU.baris = '';
    if (!XLU.baris && AN.data[XL_ID] && AN.data[XL_ID].length) XLU.baris = AN.data[XL_ID][0].id;
    if (App.halaman === 'analisa' && AN.jenis === 'xl') { this.segarData(); this.pratinjau(); this.form(); }
  },
  segarData() {
    const { esc, ic } = U;
    const el = document.getElementById('xlData');
    if (!el) return;
    const semua = this.data();
    if (!semua) { el.innerHTML = '<div class="pad"><span class="spin"></span> Memuat data…</div>'; return; }
    const L = this.rows(), rows = UI.halaman(L, XLU.f);
    const allSel = rows.length && rows.every((r) => XLU.sel.has(r.id));
    el.innerHTML = `<div class="card-h pad"><div><h3>${ic('users', 18, 'pink')} Data BATCH <span class="tag">${U.num(semua.length)}</span></h3><p>1 baris = 1 debitur (kolom A–AQ sheet BATCH)</p></div>
        <div class="inp-ic sm an-q">${ic('search', 15)}<input type="search" data-act="xlQ" placeholder="Cari nama, no batch…" value="${esc(XLU.f.q)}"></div></div>
      ${XLU.sel.size ? `<div class="bbar"><span><b>${U.num(XLU.sel.size)}</b> dipilih</span><span class="sp"></span><button class="btn btn-sm btn-secondary" data-act="xlCetakSel">${ic('print', 14)} Cetak terpilih</button><button class="btn btn-sm btn-ghost" data-act="xlHapusSel">${ic('trash', 14)} Hapus</button><button class="btn-link sm" data-act="xlSelNone">Batal pilih</button></div>` : ''}
      ${L.length ? `<div class="tbl-wrap"><table class="tbl sm"><thead><tr><th class="c w1"><input type="checkbox" data-act="xlSelPage" ${allSel ? 'checked' : ''} aria-label="Pilih semua"></th><th class="num">No</th><th>Nama</th><th>Perusahaan</th><th class="num">Plafond</th><th class="c">JW</th><th>Tgl Surat</th><th class="c"></th></tr></thead><tbody>
        ${rows.map((r) => `<tr class="${r.id === XLU.baris ? 'row-sel' : ''}"><td class="c"><input type="checkbox" data-act="xlSel" data-id="${esc(r.id)}" ${XLU.sel.has(r.id) ? 'checked' : ''}></td><td class="num tnum">${esc(r.d.b_a || '')}</td>
          <td><button class="lnk" data-act="xlLihat" data-id="${esc(r.id)}"><b>${esc(r.d.b_b || '—')}</b></button>${r.d.xl_ubah && r.d.xl_ubah !== '{}' ? ' <span class="tag warn" title="Ada teks sel yang diubah">diubah</span>' : ''}</td><td class="muted">${esc(r.d.b_c || '')}</td>
          <td class="num tnum">${r.d.b_x ? U.rpJ(+r.d.b_x || 0) : '—'}</td><td class="c tnum">${esc(r.d.b_u || '—')}</td><td class="nw">${r.d.xl_tglsurat ? esc(XLK.tglPendek(r.d.xl_tglsurat)) : '—'}</td>
          <td class="c"><button class="btn-icon sm" data-act="xlLihat" data-id="${esc(r.id)}" title="Lihat format">${ic('eye', 15)}</button></td></tr>`).join('')}</tbody></table></div>${UI.pager(L.length, XLU.f.hal, XLU.f.per).replace(/data-act="hal"/g, 'data-act="xlHal"').replace(/data-act="per"/g, 'data-act="xlPer"')}`
        : App.kosong('xls', semua.length ? 'Tidak ada data yang cocok' : 'Belum ada data', semua.length ? 'Ubah kata kunci pencarian.' : 'Klik <b>Import data Excel</b> lalu pilih file Excel yang berisi sheet BATCH.')}`;
  },
  /** Pratinjau format debitur terpilih (atau format kosong). */
  pratinjau() {
    const box = document.getElementById('xlPrev'), info = document.getElementById('xlInfo');
    if (!box) return;
    const rec = XLU.baris ? this.rec(XLU.baris) : {};
    const t0 = performance.now();
    const dok = XLK.dokumen(rec || {}, PKU.k || {}, { interaktif: true, simulasi: XLU.simulasi });
    this._B = dok.B;
    const z = this.zoom(box);
    const fokus = document.activeElement && document.activeElement.closest ? document.activeElement.closest('#xlPrev td[data-a]') : null;
    const fa = fokus && fokus.dataset.a, top = box.scrollTop, left = box.scrollLeft;
    box.innerHTML = `<div class="xl-zoom" style="zoom:${z}">${dok.html}</div>`;
    box.scrollTop = top; box.scrollLeft = left;
    box.classList.toggle('mode-edit', XLU.mode === 'edit');
    box.classList.toggle('mode-tautan', XLU.mode === 'tautan');
    if (XLU.mode === 'edit') box.querySelectorAll('td[data-a]').forEach((td) => { if (td.querySelector('.xv') || td.dataset.k === 'e') td.setAttribute('contenteditable', 'true'); });
    if (info) info.innerHTML = rec && XLU.baris ? `${U.ic('check', 13)} <b>${U.esc(rec.b_b || '—')}</b> • No ${U.esc(rec.b_a || '—')} • ${box.querySelectorAll('.xl-page').length} halaman • dihitung ${Math.round(performance.now() - t0)} ms${XLU.draf ? ' • <b class="warn">perubahan belum tersimpan…</b>' : ''}` : `${U.ic('info', 13)} Format kosong — import data lalu pilih debitur.`;
    this.pasangKlik(box);
    if (fa) { const td = box.querySelector(`td[data-a="${fa}"]`); if (td) { td.focus({ preventScroll: true }); if (td.isContentEditable) td._awal = td.innerText; } }
  },
  zoom(box) {
    const w = Math.max(280, (box.clientWidth || 600) - 24);
    const pas = Math.min(1, w / 800);
    if (!XLU.zoom) return pas.toFixed(3);
    return Math.max(0.3, Math.min(1.6, pas + XLU.zoom * 0.1)).toFixed(3);
  },
  pasangKlik(box) {
    box.onclick = (e) => {
      const td = e.target.closest('td[data-a]');
      if (!td || XLU.mode !== 'tautan') return;
      const [li, a] = td.dataset.a.split('!');
      const L = XLK.D.lembar[+li];
      const f = this._B ? this._B.jejak(L.n, a) : [];
      box.querySelectorAll('td.xl-on').forEach((x) => x.classList.remove('xl-on'));
      td.classList.add('xl-on');
      this.sorot(f, L.n + '!' + a);
    };
    if (box._xlFokus) return;
    box._xlFokus = 1;                                    // focusin/focusout hanya lewat addEventListener (sekali per elemen)
    box.addEventListener('focusin', (e) => {
      const td = e.target.closest && e.target.closest('td[data-a][contenteditable]');
      if (td) td._awal = td.innerText;
    });
    box.addEventListener('focusout', (e) => {
      const td = e.target.closest && e.target.closest('td[data-a][contenteditable]');
      if (!td || !XLU.baris || td._awal === undefined) return;
      const teks = td.innerText.replace(/\u00A0/g, ' ').replace(/\n$/, '');
      if (teks === String(td._awal).replace(/\u00A0/g, ' ').replace(/\n$/, '')) return;
      const [li, a] = td.dataset.a.split('!');
      const key = XLK.D.lembar[+li].n + '!' + a;
      const rec = this.rec(XLU.baris);
      let ubah = {}; try { ubah = rec.xl_ubah ? JSON.parse(rec.xl_ubah) : {}; } catch (er) { ubah = {}; }
      ubah[key] = teks;
      this.ubah({ xl_ubah: JSON.stringify(ubah) }, 'Teks sel ' + key + ' diubah.');
    });
  },
  /** Sorot kolom data sumber sel di formulir (tautan interaktif). */
  sorot(fields, kunci) {
    const box = document.getElementById('xlForm');
    if (!box) return;
    box.querySelectorAll('.xl-fld.on').forEach((x) => x.classList.remove('on'));
    const ket = document.getElementById('xlTaut');
    if (ket) ket.innerHTML = fields.length ? `${U.ic('link2', 13)} Sel <b>${U.esc(kunci)}</b> memakai: ${fields.map((f) => `<b>${U.esc((XLK.FIELD.find((x) => x.k === f) || { label: f }).label)}</b>`).join(', ')}` : `${U.ic('info', 13)} Sel <b>${U.esc(kunci)}</b> berisi teks tetap format${XLU.baris ? ' — pakai mode <b>Edit teks</b> untuk mengubahnya' : ''}.`;
    let pertama = null;
    fields.forEach((f) => { const el = box.querySelector(`.xl-fld[data-f="${f}"]`); if (el) { el.classList.add('on'); if (!pertama) pertama = el; } });
    if (pertama) { pertama.scrollIntoView({ behavior: 'smooth', block: 'center' }); const i = pertama.querySelector('input,textarea'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 250); }
  },
  /** Formulir data debitur terpilih — terhubung langsung ke format (hitung ulang saat diketik). */
  form() {
    const { esc, ic } = U;
    const box = document.getElementById('xlForm');
    if (!box) return;
    const rec = XLU.baris ? this.rec(XLU.baris) : null;
    if (!rec) { box.innerHTML = `<h3>${ic('edit', 18)} Data debitur</h3><p class="muted">Pilih debitur di daftar untuk mengubah datanya. Perubahan langsung terlihat di format.</p>`; return; }
    let ubah = {}; try { ubah = rec.xl_ubah ? JSON.parse(rec.xl_ubah) : {}; } catch (e) { ubah = {}; }
    const nU = Object.keys(ubah).length;
    const inp = (f) => {
      const v = rec[f.k] === undefined || rec[f.k] === null ? '' : rec[f.k];
      const val = f.tipe === 'tanggal' ? (XLK.iso(XLK.tanggal(v)) || '') : v;
      const e = f.tipe === 'panjang' ? `<textarea data-k="${f.k}" rows="2">${esc(val)}</textarea>` : `<input data-k="${f.k}" ${f.tipe === 'tanggal' ? 'type="date"' : f.tipe === 'angka' ? 'inputmode="decimal"' : ''} value="${esc(val)}">`;
      return `<label class="xl-fld ${f.tipe === 'panjang' ? 'span2' : ''}" data-f="${f.k}"><span><em>${esc(f.h)}</em>${esc(f.label)}${XLK.WAJIB.includes(f.k) ? ' <b class="neg">*</b>' : ''}</span>${e}</label>`;
    };
    box.innerHTML = `<div class="row-g sb"><div><h3>${ic('edit', 18)} Data debitur — ${esc(rec.b_b || '')}</h3><p class="muted sm" id="xlTaut">${ic('link2', 13)} Klik sel di format (mode <b>Tautan</b>) untuk menyorot kolom data sumbernya. Ketik di sini → format dihitung ulang otomatis & tersimpan.</p></div>
      <div class="row-g">${nU ? `<button class="btn btn-ghost btn-sm" data-act="xlResetTeks">${ic('undo', 14)} Kembalikan ${U.num(nU)} teks sel</button>` : ''}<span class="xl-sv muted sm" id="xlSv">${XLU.draf ? 'Menyimpan…' : `${ic('check', 13, 'pos')} Tersimpan`}</span></div></div>
      <div class="xl-fg">${XLK.FIELD.map(inp).join('')}</div>
      ${nU ? `<h5 class="dt-sub">${ic('edit', 14)} Teks sel yang diubah langsung</h5><ul class="xl-ubah">${Object.keys(ubah).map((k) => `<li><code>${esc(k)}</code><span>${esc(String(ubah[k]).slice(0, 120))}</span><button class="btn-link sm" data-act="xlResetSel" data-k="${esc(k)}">kembalikan</button></li>`).join('')}</ul>` : ''}`;
    box.querySelectorAll('[data-k]').forEach((el) => {
      el.oninput = () => {
        const f = XLK.FIELD.find((x) => x.k === el.dataset.k);
        let v = el.value;
        if (f && f.tipe === 'angka' && v.trim() !== '') { const n = Number(String(v).replace(/\./g, '').replace(',', '.')); if (isFinite(n)) v = n; }
        this.ubah({ [el.dataset.k]: v });
      };
    });
  },
  /** Ubah data (draf) → hitung ulang format → simpan otomatis 1,2 detik setelah berhenti mengetik. */
  ubah(d, pesan) {
    const id = XLU.baris;
    if (!id) return;
    if (!XLU.draf || XLU.draf.id !== id) XLU.draf = { id, d: {} };
    Object.assign(XLU.draf.d, d);
    if (d.xl_ubah !== undefined) setTimeout(() => this.pratinjau(), 0); else this.pratinjau();
    const sv = document.getElementById('xlSv'); if (sv) sv.innerHTML = '<span class="spin"></span> Menyimpan…';
    clearTimeout(XLU.simpanT);
    XLU.simpanT = setTimeout(() => this.simpan(pesan), d.xl_ubah !== undefined ? 50 : 1200);
  },
  async simpan(pesan) {
    const dr = XLU.draf;
    if (!dr) return;
    XLU.draf = null;
    const r = await Api.call('analisa.data.ubah', { tpl: XL_ID, id: dr.id, d: dr.d });
    const sv = document.getElementById('xlSv');
    if (!r.success) { U.toast(r.message, 'err', 6000); if (sv) sv.textContent = 'Gagal menyimpan'; return; }
    const row = (this.data() || []).find((x) => x.id === dr.id);
    if (row) Object.keys(dr.d).forEach((k) => { if (dr.d[k] === '' || dr.d[k] === null) delete row.d[k]; else row.d[k] = dr.d[k]; });
    if (r.data && r.data.aver) AN.aver = r.data.aver;
    if (sv) sv.innerHTML = `${U.ic('check', 13, 'pos')} Tersimpan`;
    if (pesan) { U.toast(pesan, 'ok', 2200); this.form(); }
    this.segarData();
  },
  importDialog() {
    const { esc, ic } = U;
    const m = U.modal({ title: 'Import data Excel (sheet BATCH)', size: 'lg',
      body: `<div class="form-g"><label class="fld"><span>File Excel (.xlsx)</span><input type="file" id="xlFile" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><small class="muted">Pilih file Excel yang berisi sheet <b>BATCH</b> (judul baris 2: A = NO, B = NAMA, … AM = No Surat) dan sheet <b>No Surat</b>. Kurs dibaca dari <b>AO1</b>, tanggal dari <b>AP1</b>. File hanya dibaca di browser.</small></label>
        <label class="fld"><span>Nomor batch yang diimpor (opsional)</span><input id="xlNo" placeholder="Kosong = semua; mis. 221-230, 245"></label>
        <label class="chk"><input type="checkbox" id="xlGanti"><span>Ganti semua data Format Excel yang sudah ada</span></label></div><div id="xlHasil" class="mt"></div>`,
      footer: `<button class="btn btn-ghost" data-x="0">Batal</button><button class="btn btn-primary" data-x="1" disabled>${ic('upload', 16)} Import</button>` });
    const $m = (s) => m.el.querySelector(s);
    let hasil = null;
    const saring = () => {
      if (!hasil) return [];
      const t = $m('#xlNo').value.trim();
      if (!t) return hasil.rows;
      const ok = new Set();
      t.split(/[,;\s]+/).forEach((p) => { const r = p.match(/^(\d+)\s*-\s*(\d+)$/); if (r) { for (let i = +r[1]; i <= +r[2] && i - +r[1] < 5000; i++) ok.add(String(i)); } else if (p) ok.add(p.replace(/\.0+$/, '')); });
      return hasil.rows.filter((r) => ok.has(String(r.b_a).replace(/\.0+$/, '')));
    };
    const tampilHasil = () => {
      const L = saring(), box = $m('#xlHasil');
      if (!hasil) return;
      box.innerHTML = `<div class="src-st ok">${ic('ok', 18)}<div><b>Sheet ${esc(hasil.sheet)}: ${U.num(hasil.rows.length)} debitur${L.length !== hasil.rows.length ? ` • ${U.num(L.length)} sesuai nomor batch` : ''}</b><small>Kurs AO1: ${hasil.kurs ? esc(String(hasil.kurs).replace('.', ',')) : '—'} • Tanggal AP1: ${esc(hasil.tglKurs || '—')} • No Surat terbaca: ${U.num(hasil.nSurat)}</small></div></div>
        ${L.length ? `<div class="tbl-wrap mt"><table class="tbl sm"><thead><tr><th>No</th><th>Nama</th><th>Perusahaan</th><th class="num">Plafond</th><th class="c">JW</th><th>No Surat</th></tr></thead><tbody>${L.slice(0, 6).map((r) => `<tr><td class="tnum">${esc(r.b_a || '')}</td><td>${esc(r.b_b || '')}</td><td>${esc(r.b_c || '')}</td><td class="num tnum">${r.b_x ? U.rp(+r.b_x || 0) : '—'}</td><td class="c">${esc(r.b_u || '')}</td><td>${esc(r.b_am || '—')}</td></tr>`).join('')}</tbody></table></div>${L.length > 6 ? `<p class="muted sm">… dan ${U.num(L.length - 6)} debitur lain.</p>` : ''}` : `<div class="alert alert-warn mt">${ic('info', 16)}<div>Tidak ada debitur dengan nomor batch tersebut.</div></div>`}`;
      $m('[data-x="1"]').disabled = !L.length;
    };
    $m('#xlFile').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      $m('#xlHasil').innerHTML = '<span class="spin"></span> Membaca file…';
      try { hasil = await XLK.bacaWorkbook(f); tampilHasil(); }
      catch (er) { hasil = null; $m('#xlHasil').innerHTML = `<div class="alert alert-neg">${ic('alertc', 16)}<div>${esc(er.message)}</div></div>`; $m('[data-x="1"]').disabled = true; }
    };
    $m('#xlNo').oninput = U.debounce(tampilHasil, 250);
    $m('[data-x="0"]').onclick = m.close;
    $m('[data-x="1"]').onclick = async (ev) => {
      const L = saring();
      if (!L.length) return;
      const b = ev.currentTarget; b.disabled = true;
      const ganti = $m('#xlGanti').checked;
      if (ganti && !(await U.konfirmasi({ title: 'Ganti semua data?', body: 'Semua data Format Excel yang sudah ada akan dihapus lalu diganti hasil import ini.', ok: 'Ganti', bahaya: true }))) { b.disabled = false; return; }
      let n = 0, batch = '';
      for (let i = 0; i < L.length; i += 2000) {
        b.innerHTML = `<span class="spin"></span> Mengimpor ${U.num(Math.min(L.length, i + 2000))}/${U.num(L.length)}…`;
        const r = await Api.call('analisa.data.impor', { tpl: XL_ID, rows: L.slice(i, i + 2000), mode: ganti && i === 0 ? 'ganti' : 'tambah', batch }, { timeout: 180000 });
        if (!r.success) { b.disabled = false; b.innerHTML = `${ic('upload', 16)} Import`; return U.toast(r.message, 'err', 6000); }
        n += r.data.ditambah; batch = r.data.batch;
      }
      m.close();
      U.toast(`${U.num(n)} debitur diimpor ke Format Excel.`, 'ok');
      XLU.sel.clear();
      await this.muatData();
    };
  },
  act: {
    xlTemplate: async () => { const b = await XLK.template(); U.unduh(b, 'Template_Import_Format_Excel_KUR_PMI.xlsx'); U.toast('Template sheet BATCH diunduh. Data mulai baris 3 (judul di baris 2).', 'ok'); },
    xlImport: () => XLUI.importDialog(),
    xlQ: (el) => { XLU.f.q = el.value; XLU.f.hal = 1; XLUI.segarData(); const i = document.querySelector('#xlData .an-q input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
    xlHal: (el) => { XLU.f.hal = +el.dataset.v; XLUI.segarData(); },
    xlPer: (el) => { XLU.f.per = +el.value; XLU.f.hal = 1; XLUI.segarData(); },
    xlLihat: async (el) => { if (XLU.draf) await XLUI.simpan(); XLU.baris = el.dataset.id; XLUI.segarData(); XLUI.pratinjau(); XLUI.form(); if (window.innerWidth < 1100) { const p = document.querySelector('.xl-grid .an-prev-c'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
    xlSel: (el) => { el.checked ? XLU.sel.add(el.dataset.id) : XLU.sel.delete(el.dataset.id); XLUI.segarData(); },
    xlSelPage: (el) => { UI.halaman(XLUI.rows(), XLU.f).forEach((r) => (el.checked ? XLU.sel.add(r.id) : XLU.sel.delete(r.id))); XLUI.segarData(); },
    xlSelNone: () => { XLU.sel.clear(); XLUI.segarData(); },
    xlMode: (el) => { XLU.mode = el.dataset.v; document.querySelectorAll('[data-act="xlMode"]').forEach((b) => b.classList.toggle('on', b.dataset.v === XLU.mode)); XLUI.pratinjau(); if (XLU.mode === 'edit') U.toast('Mode Edit teks: klik sel di format lalu ketik. Perubahan tersimpan otomatis untuk debitur ini.', 'info', 4000); },
    xlSim: (el) => { XLU.simulasi = el.checked; XLUI.pratinjau(); },
    xlZoom: (el) => { XLU.zoom = Math.max(-6, Math.min(8, XLU.zoom + +el.dataset.v)); XLUI.pratinjau(); },
    xlCetak: async () => { if (XLU.draf) await XLUI.simpan(); const rec = XLU.baris ? XLUI.rec(XLU.baris) : {}; await XLK.cetak([rec || {}], PKU.k || {}, 'Format Excel KUR PMI ' + ((rec && rec.b_b) || ''), XLU.simulasi); Api.call('analisa.catat', { tpl: XL_ID, jenis: 'cetak', jumlah: 1 }); },
    xlCetakSel: async () => { if (XLU.draf) await XLUI.simpan(); const L = Array.from(XLU.sel).map((id) => XLUI.rec(id)).filter(Boolean); if (!L.length) return; await XLK.cetak(L, PKU.k || {}, 'Format Excel KUR PMI (' + L.length + ' debitur)', XLU.simulasi); Api.call('analisa.catat', { tpl: XL_ID, jenis: 'cetak', jumlah: L.length }); },
    xlHapusSel: async () => {
      const n = XLU.sel.size;
      if (!n || !(await U.konfirmasi({ title: 'Hapus data?', body: `${U.num(n)} data Format Excel terpilih akan dihapus.`, ok: 'Hapus', bahaya: true }))) return;
      const r = await Api.call('analisa.data.hapus', { tpl: XL_ID, ids: Array.from(XLU.sel) });
      if (!r.success) return U.toast(r.message, 'err');
      if (XLU.sel.has(XLU.baris)) XLU.baris = '';
      XLU.sel.clear(); U.toast(r.message, 'ok'); await XLUI.muatData();
    },
    xlResetSel: (el) => { const rec = XLUI.rec(XLU.baris); let u = {}; try { u = JSON.parse(rec.xl_ubah || '{}'); } catch (e) { u = {}; } delete u[el.dataset.k]; XLUI.ubah({ xl_ubah: Object.keys(u).length ? JSON.stringify(u) : '' }, 'Teks sel dikembalikan ke rumus/format.'); },
    xlResetTeks: async () => { if (!(await U.konfirmasi({ title: 'Kembalikan semua teks sel?', body: 'Semua teks sel yang diubah langsung untuk debitur ini kembali mengikuti rumus/format Excel.', ok: 'Kembalikan' }))) return; XLUI.ubah({ xl_ubah: '' }, 'Semua teks sel dikembalikan.'); }
  }
};
