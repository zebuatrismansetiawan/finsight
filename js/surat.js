/* ==========================================================================
   FinSight — surat.js : mesin surat Word (.docx) di browser (v1.3)
   - ZIP baca/tulis (DecompressionStream / CompressionStream "deflate-raw").
   - Penanda {{nama_field}} atau {{nama_field:format}} diisi langsung di XML Word,
     termasuk penanda yang terpecah di beberapa "run" (sering terjadi saat diketik di Word).
   - Pratinjau: dokumen Word → HTML aman (teks di-escape, gambar data-URL, tanpa tautan/skrip).
   - Import massal: baca .xlsx (sheet pertama) atau .csv; template import .xlsx dibuat otomatis.
   - Contoh format surat (Memo Analisa Kredit) dibuat dari nol sebagai .docx.
   ========================================================================== */
'use strict';

const Surat = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const XML_NS = 'http://www.w3.org/XML/1998/namespace';
  const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const POLA = /\{\{\s*([A-Za-z0-9_]+)\s*(?::\s*([A-Za-z]+)\s*)?\}\}/g;
  const FORMAT = {
    rp: 'Rupiah (Rp 1.500.000)', angka: 'Angka bertitik (1.500.000)', tgl: 'Tanggal panjang (22 November 2026)', tglpendek: 'Tanggal pendek (22/11/2026)',
    terbilang: 'Terbilang (satu juta lima ratus ribu)', besar: 'HURUF BESAR', kecil: 'huruf kecil', judul: 'Huruf Awal Kapital'
  };
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const xe = (s) => esc(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const normField = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

  // ========================================================================
  //  ZIP
  // ========================================================================
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  async function aliran(bytes, jenis, kompres) {
    const s = new Blob([bytes]).stream().pipeThrough(kompres ? new CompressionStream(jenis) : new DecompressionStream(jenis));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  /** Baca ZIP → Map(nama → Uint8Array). */
  async function unzip(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('File bukan ZIP/Office yang valid.');
    const n = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const out = new Map();
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Struktur ZIP rusak.');
      const metode = dv.getUint16(p + 10, true), uk = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), kl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const nama = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + kl;
      if (nama.endsWith('/')) continue;
      const lnl = dv.getUint16(off + 26, true), lxl = dv.getUint16(off + 28, true);
      const data = u8.subarray(off + 30 + lnl + lxl, off + 30 + lnl + lxl + uk);
      if (metode === 0) out.set(nama, data.slice());
      else if (metode === 8) out.set(nama, await aliran(data, 'deflate-raw', false));
      else throw new Error('Metode kompresi ZIP tidak didukung (' + metode + ').');
    }
    return out;
  }
  /** Tulis ZIP. files: [[nama, Uint8Array|string]] (urutan dipertahankan). */
  async function zip(files, mime) {
    const parts = [], central = [];
    let off = 0;
    const bisa = typeof CompressionStream !== 'undefined';
    for (const [nama, isi] of files) {
      const name = enc.encode(nama), data = typeof isi === 'string' ? enc.encode(isi) : isi, crc = crc32(data);
      let simpan = data, metode = 0;
      if (bisa && data.length > 512 && !/\.(png|jpe?g|gif|zip)$/i.test(nama)) {
        try { const z = await aliran(data, 'deflate-raw', true); if (z.length < data.length) { simpan = z; metode = 8; } } catch (e) { /* simpan apa adanya */ }
      }
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, metode, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true);
      h.setUint32(18, simpan.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, simpan);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, metode, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, simpan.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + simpan.length;
    }
    const cd = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cd, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: mime || 'application/zip' });
  }

  // ========================================================================
  //  XML
  // ========================================================================
  function xml(str) {
    const d = new DOMParser().parseFromString(str, 'application/xml');
    if (d.getElementsByTagName('parsererror').length) throw new Error('XML dokumen Word tidak valid.');
    return d;
  }
  const serial = (d) => new XMLSerializer().serializeToString(d);
  const teks = (m, nama) => (m.has(nama) ? dec.decode(m.get(nama)) : '');
  const anak = (el, ln) => Array.from(el ? el.childNodes : []).filter((n) => n.nodeType === 1 && (!ln || n.localName === ln));
  const satu = (el, ln) => anak(el, ln)[0] || null;
  const wv = (el, at) => (el ? el.getAttributeNS(W, at) || el.getAttribute('w:' + at) : null);
  /** Bagian dokumen yang boleh berisi penanda. */
  const bagianTeks = (m) => Array.from(m.keys()).filter((k) => /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(k));

  // ========================================================================
  //  Format nilai
  // ========================================================================
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function keAngka(v) {
    if (typeof v === 'number') return v;
    const s = String(v === null || v === undefined ? '' : v).replace(/[Rr][Pp]\.?|\s/g, '');
    if (!s) return NaN;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
    if (/^-?\d+(,\d+)$/.test(s)) return Number(s.replace(',', '.'));
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  function keTanggal(v) {
    if (v instanceof Date) return v;
    const s = String(v === null || v === undefined ? '' : v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) return new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1]);
    if (/^\d{5}(\.\d+)?$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 864e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
    return null;
  }
  function terbilang(n) {
    n = Math.floor(Math.abs(n));
    const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    const t = (x) => {
      if (x < 12) return s[x];
      if (x < 20) return t(x - 10) + ' belas';
      if (x < 100) return t(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + t(x % 10) : '');
      if (x < 200) return 'seratus' + (x - 100 ? ' ' + t(x - 100) : '');
      if (x < 1000) return t(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + t(x % 100) : '');
      if (x < 2000) return 'seribu' + (x - 1000 ? ' ' + t(x - 1000) : '');
      if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + t(x % 1000) : '');
      if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta' + (x % 1e6 ? ' ' + t(x % 1e6) : '');
      if (x < 1e12) return t(Math.floor(x / 1e9)) + ' miliar' + (x % 1e9 ? ' ' + t(x % 1e9) : '');
      return t(Math.floor(x / 1e12)) + ' triliun' + (x % 1e12 ? ' ' + t(x % 1e12) : '');
    };
    return n === 0 ? 'nol' : t(n).replace(/\s+/g, ' ').trim();
  }
  function format(v, f) {
    if (v === null || v === undefined || v === '') return '';
    f = String(f || '').toLowerCase();
    const titik = (x) => Math.round(x).toLocaleString('id-ID');
    if (f === 'rp' || f === 'rupiah') { const n = keAngka(v); return isNaN(n) ? String(v) : 'Rp ' + titik(n); }
    if (f === 'angka') { const n = keAngka(v); return isNaN(n) ? String(v) : titik(n); }
    if (f === 'terbilang') { const n = keAngka(v); return isNaN(n) ? String(v) : terbilang(n); }
    if (f === 'tgl' || f === 'tanggal') { const d = keTanggal(v); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : String(v); }
    if (f === 'tglpendek') { const d = keTanggal(v); return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() : String(v); }
    const sv = String(v);
    if (f === 'besar') return sv.toUpperCase();
    if (f === 'kecil') return sv.toLowerCase();
    if (f === 'judul') return sv.toLowerCase().replace(/(^|[\s(\-\/])([a-z])/g, (m, a, b) => a + b.toUpperCase());
    return typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(v).replace('.', ',')) : sv;
  }

  // ========================================================================
  //  Penanda
  // ========================================================================
  /** w:t milik paragraf ini sendiri (bukan paragraf di dalam kotak teks bersarang). */
  function tParagraf(p) {
    return Array.from(p.getElementsByTagNameNS(W, 't')).filter((t) => { let a = t.parentNode; while (a && a.localName !== 'p') a = a.parentNode; return a === p; });
  }
  /** Daftar penanda [{field, fmt, teks}] dari file .docx (Map ZIP). */
  function daftarPenanda(m) {
    const ada = new Map();
    bagianTeks(m).forEach((nama) => {
      const d = xml(teks(m, nama));
      Array.from(d.getElementsByTagNameNS(W, 'p')).forEach((p) => {
        const full = tParagraf(p).map((t) => t.textContent).join('');
        let x; POLA.lastIndex = 0;
        while ((x = POLA.exec(full))) { const f = normField(x[1]); if (f && !ada.has(f)) ada.set(f, { field: f, fmt: (x[2] || '').toLowerCase(), teks: x[0] }); }
      });
    });
    return Array.from(ada.values());
  }

  /** Isi semua penanda di 1 dokumen XML. nilai(field, fmt, asli) → teks pengganti. */
  function isiDoc(d, nilai) {
    Array.from(d.getElementsByTagNameNS(W, 'p')).forEach((p) => {
      const ts = tParagraf(p);
      if (!ts.length) return;
      const isi = ts.map((t) => t.textContent), full = isi.join('');
      if (full.indexOf('{{') < 0) return;
      const cocok = []; let x; POLA.lastIndex = 0;
      while ((x = POLA.exec(full))) cocok.push({ a: x.index, b: x.index + x[0].length, f: normField(x[1]), fmt: (x[2] || '').toLowerCase(), asli: x[0] });
      if (!cocok.length) return;
      // posisi awal tiap node
      const awal = []; let acc = 0; isi.forEach((s) => { awal.push(acc); acc += s.length; });
      const cari = (pos) => { for (let i = ts.length - 1; i >= 0; i--) if (pos >= awal[i]) return i; return 0; };
      const baru = isi.slice();
      for (let k = cocok.length - 1; k >= 0; k--) {
        const c = cocok[k], ia = cari(c.a), ib = cari(c.b - 1);
        const ganti = String(nilai(c.f, c.fmt, c.asli));
        const oa = c.a - awal[ia], ob = c.b - awal[ib];
        if (ia === ib) { baru[ia] = baru[ia].slice(0, oa) + ganti + baru[ia].slice(ob); }
        else {
          baru[ia] = baru[ia].slice(0, oa) + ganti;
          for (let i = ia + 1; i < ib; i++) baru[i] = '';
          baru[ib] = baru[ib].slice(ob);
        }
      }
      ts.forEach((t, i) => {
        if (baru[i] === isi[i]) return;
        t.textContent = baru[i];
        t.setAttributeNS(XML_NS, 'xml:space', 'preserve');
        if (baru[i].indexOf('\n') > -1) pecahBaris(t);
      });
    });
    return d;
  }
  /** Teks berisi baris baru → w:t + w:br + w:t di run yang sama. */
  function pecahBaris(t) {
    const bagian = t.textContent.split('\n'), r = t.parentNode, doc = t.ownerDocument;
    t.textContent = bagian[0];
    let ref = t;
    for (let i = 1; i < bagian.length; i++) {
      const br = doc.createElementNS(W, 'w:br'), t2 = doc.createElementNS(W, 'w:t');
      t2.setAttributeNS(XML_NS, 'xml:space', 'preserve'); t2.textContent = bagian[i];
      r.insertBefore(br, ref.nextSibling); r.insertBefore(t2, br.nextSibling); ref = t2;
    }
  }
  const nilaiDari = (data, tandai) => (f, fmt, asli) => {
    const v = data ? data[f] : undefined;
    if (v === undefined || v === null || v === '') return tandai ? '⁣' + asli + '⁣' : '';
    const s = format(v, fmt);
    return tandai === 'semua' ? '⁤' + s + '⁤' : s;
  };

  /** .docx (bytes) + data → .docx terisi (Blob). */
  async function buatDocx(bytes, data) {
    const m = await unzip(bytes);
    bagianTeks(m).forEach((nama) => { m.set(nama, enc.encode(serial(isiDoc(xml(teks(m, nama)), nilaiDari(data, false))))); });
    return zip(Array.from(m.entries()), MIME_DOCX);
  }

  /** Gabungkan banyak surat dalam 1 file Word (dipisah halaman). Kop/kaki diisi data surat pertama. */
  async function gabungDocx(bytes, daftar) {
    const m = await unzip(bytes);
    const d = xml(teks(m, 'word/document.xml'));
    const body = d.getElementsByTagNameNS(W, 'body')[0];
    const sect = anak(body, 'sectPr')[0] || null;
    const asli = anak(body).filter((n) => n !== sect);
    asli.forEach((n) => body.removeChild(n));
    let docPr = 1000;
    daftar.forEach((data, i) => {
      if (i > 0) {
        const p = d.createElementNS(W, 'w:p'), r = d.createElementNS(W, 'w:r'), br = d.createElementNS(W, 'w:br');
        br.setAttributeNS(W, 'w:type', 'page'); r.appendChild(br); p.appendChild(r); body.insertBefore(p, sect);
      }
      const wadah = d.createElementNS(W, 'w:body');
      asli.forEach((n) => wadah.appendChild(n.cloneNode(true)));
      isiDoc(wadah, nilaiDari(data, false));
      if (i > 0) {
        Array.from(wadah.getElementsByTagNameNS(W, 'bookmarkStart')).concat(Array.from(wadah.getElementsByTagNameNS(W, 'bookmarkEnd'))).forEach((b) => b.parentNode.removeChild(b));
        Array.from(wadah.getElementsByTagName('*')).forEach((el) => {
          if (el.localName === 'docPr' && el.hasAttribute('id')) el.setAttribute('id', String(++docPr));
          ['w14:paraId', 'w14:textId'].forEach((a) => { if (el.hasAttribute(a)) el.removeAttribute(a); });
        });
      }
      anak(wadah).forEach((n) => body.insertBefore(n, sect));
    });
    m.set('word/document.xml', enc.encode(serial(d)));
    bagianTeks(m).filter((k) => k !== 'word/document.xml').forEach((nama) => { m.set(nama, enc.encode(serial(isiDoc(xml(teks(m, nama)), nilaiDari(daftar[0], false))))); });
    return zip(Array.from(m.entries()), MIME_DOCX);
  }

  // ========================================================================
  //  Pratinjau (Word → HTML aman)
  // ========================================================================
  const twPt = (v) => (Number(v) || 0) / 20;
  const warnaOk = (c) => (c && /^[0-9A-Fa-f]{6}$/.test(c) ? '#' + c : '');
  const fontOk = (f) => String(f || '').replace(/[^A-Za-z0-9 \-]/g, '').slice(0, 40);
  const HL = { yellow: '#FFFF00', green: '#00FF00', cyan: '#00FFFF', magenta: '#FF00FF', blue: '#0000FF', red: '#FF0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080', lightGray: '#C0C0C0', black: '#000000' };

  function gayaDok(m) {
    const st = { p: {}, r: {}, defP: null, defR: null, gaya: {} };
    const s = teks(m, 'word/styles.xml');
    if (!s) return st;
    const d = xml(s);
    const dd = d.getElementsByTagNameNS(W, 'docDefaults')[0];
    if (dd) {
      const rp = dd.getElementsByTagNameNS(W, 'rPrDefault')[0], pp = dd.getElementsByTagNameNS(W, 'pPrDefault')[0];
      st.defR = rp ? satu(rp, 'rPr') : null; st.defP = pp ? satu(pp, 'pPr') : null;
    }
    Array.from(d.getElementsByTagNameNS(W, 'style')).forEach((g) => {
      const id = wv(g, 'styleId'), tipe = wv(g, 'type');
      st.gaya[id] = { tipe, basis: wv(satu(g, 'basedOn'), 'val'), pPr: satu(g, 'pPr'), rPr: satu(g, 'rPr'), tblPr: satu(g, 'tblPr'), def: wv(g, 'default') === '1' || g.getAttribute('w:default') === '1' };
      if (st.gaya[id].def && tipe === 'paragraph') st.defStyle = id;
    });
    return st;
  }
  /** Rantai gaya (basedOn) → [pPr...], [rPr...] dari yang paling dasar. */
  function rantai(st, id, jenis) {
    const out = []; let n = 0;
    while (id && st.gaya[id] && n++ < 10) { if (st.gaya[id][jenis]) out.unshift(st.gaya[id][jenis]); id = st.gaya[id].basis; }
    return out;
  }
  function cssRun(rPrs) {
    const o = {};
    rPrs.filter(Boolean).forEach((r) => {
      anak(r).forEach((e) => {
        const v = wv(e, 'val'), off = v === '0' || v === 'false' || v === 'none';
        switch (e.localName) {
          case 'b': o.b = !off; break;
          case 'i': o.i = !off; break;
          case 'u': o.u = !off; break;
          case 'strike': case 'dstrike': o.s = !off; break;
          case 'caps': o.caps = !off; break;
          case 'smallCaps': o.sc = !off; break;
          case 'vanish': o.hide = !off; break;
          case 'sz': o.sz = Number(v) / 2; break;
          case 'color': if (warnaOk(v)) o.c = warnaOk(v); break;
          case 'highlight': if (HL[v]) o.bg = HL[v]; break;
          case 'shd': { const f = wv(e, 'fill'); if (warnaOk(f) && f !== 'auto') o.bg = warnaOk(f); break; }
          case 'rFonts': { const f = wv(e, 'ascii') || wv(e, 'hAnsi'); if (f) o.f = fontOk(f); break; }
          case 'vertAlign': o.va = v === 'superscript' ? 'super' : v === 'subscript' ? 'sub' : ''; break;
          default:
        }
      });
    });
    const css = [];
    if (o.b) css.push('font-weight:700'); if (o.i) css.push('font-style:italic');
    if (o.u || o.s) css.push('text-decoration:' + [o.u ? 'underline' : '', o.s ? 'line-through' : ''].filter(Boolean).join(' '));
    if (o.caps) css.push('text-transform:uppercase'); if (o.sc) css.push('font-variant:small-caps');
    if (o.sz) css.push('font-size:' + o.sz + 'pt'); if (o.c) css.push('color:' + o.c); if (o.bg) css.push('background:' + o.bg);
    if (o.f) css.push(`font-family:'${o.f}',Calibri,Arial,sans-serif`);
    if (o.va) css.push('vertical-align:' + o.va + ';font-size:smaller');
    return { css: css.join(';'), hide: o.hide };
  }
  function cssPar(pPrs) {
    const o = {};
    pPrs.filter(Boolean).forEach((p) => {
      anak(p).forEach((e) => {
        switch (e.localName) {
          case 'jc': { const v = wv(e, 'val'); o.jc = v === 'center' ? 'center' : (v === 'right' || v === 'end') ? 'right' : (v === 'both' || v === 'distribute') ? 'justify' : 'left'; break; }
          case 'spacing': {
            if (wv(e, 'before') !== null) o.sb = twPt(wv(e, 'before'));
            if (wv(e, 'after') !== null) o.sa = twPt(wv(e, 'after'));
            const l = wv(e, 'line'), lr = wv(e, 'lineRule');
            if (l) o.lh = !lr || lr === 'auto' ? Math.max(0.8, Number(l) / 240).toFixed(2) : twPt(l) + 'pt';
            break;
          }
          case 'ind': {
            const L = wv(e, 'left') || wv(e, 'start'), R = wv(e, 'right') || wv(e, 'end'), F = wv(e, 'firstLine'), H = wv(e, 'hanging');
            if (L !== null) o.ml = twPt(L); if (R !== null) o.mr = twPt(R);
            if (F !== null) o.ti = twPt(F); if (H !== null) o.ti = -twPt(H);
            break;
          }
          case 'shd': { const f = wv(e, 'fill'); if (warnaOk(f)) o.bg = warnaOk(f); break; }
          default:
        }
      });
    });
    const css = [];
    if (o.jc) css.push('text-align:' + o.jc);
    css.push('margin:' + (o.sb || 0) + 'pt ' + (o.mr || 0) + 'pt ' + (o.sa === undefined ? 0 : o.sa) + 'pt ' + (o.ml || 0) + 'pt');
    if (o.ti) css.push('text-indent:' + o.ti + 'pt');
    if (o.lh) css.push('line-height:' + o.lh);
    if (o.bg) css.push('background:' + o.bg);
    return css.join(';');
  }

  async function bangunKonteks(m) {
    const rels = {};
    const relsDok = (nama) => {
      const base = nama.replace(/[^/]+$/, ''), rf = base + '_rels/' + nama.slice(base.length) + '.rels', out = {};
      const s = teks(m, rf);
      if (s) Array.from(xml(s).getElementsByTagName('Relationship')).forEach((r) => {
        const t = r.getAttribute('Target') || '';
        out[r.getAttribute('Id')] = { tipe: r.getAttribute('Type') || '', target: /^\//.test(t) ? t.slice(1) : (base + t).replace(/[^/]+\/\.\.\//g, ''), luar: r.getAttribute('TargetMode') === 'External' };
      });
      return out;
    };
    rels.doc = relsDok('word/document.xml');
    // penomoran
    const num = { abs: {}, map: {} };
    const ns = teks(m, 'word/numbering.xml');
    if (ns) {
      const d = xml(ns);
      Array.from(d.getElementsByTagNameNS(W, 'abstractNum')).forEach((a) => {
        const lv = {};
        anak(a, 'lvl').forEach((l) => { lv[wv(l, 'ilvl')] = { fmt: wv(satu(l, 'numFmt'), 'val') || 'decimal', teks: wv(satu(l, 'lvlText'), 'val') || '', mulai: Number(wv(satu(l, 'start'), 'val') || 1) }; });
        num.abs[wv(a, 'abstractNumId')] = lv;
      });
      Array.from(d.getElementsByTagNameNS(W, 'num')).forEach((n) => { num.map[wv(n, 'numId')] = wv(satu(n, 'abstractNumId'), 'val'); });
    }
    return { m, st: gayaDok(m), rels, num, hit: {}, relsDok };
  }
  function nomor(K, numId, ilvl) {
    const lv = (K.num.abs[K.num.map[numId]] || {})[ilvl];
    if (!lv) return '';
    const k = numId + ':' + ilvl;
    K.hit[k] = (K.hit[k] || lv.mulai - 1) + 1;
    Object.keys(K.hit).forEach((x) => { const [a, b] = x.split(':'); if (a === numId && Number(b) > Number(ilvl)) delete K.hit[x]; });
    if (lv.fmt === 'bullet') return '•';
    const n = K.hit[k];
    const romawi = (x) => { const v = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]; let s = ''; v.forEach(([a, b]) => { while (x >= a) { s += b; x -= a; } }); return s; };
    const f = { decimal: String(n), lowerLetter: String.fromCharCode(96 + ((n - 1) % 26) + 1), upperLetter: String.fromCharCode(64 + ((n - 1) % 26) + 1), lowerRoman: romawi(n), upperRoman: romawi(n).toUpperCase() }[lv.fmt] || String(n);
    return lv.teks.replace(/%\d/g, f);
  }
  const mimeGambar = (n) => (/\.png$/i.test(n) ? 'image/png' : /\.jpe?g$/i.test(n) ? 'image/jpeg' : /\.gif$/i.test(n) ? 'image/gif' : /\.bmp$/i.test(n) ? 'image/bmp' : '');
  function dataUrl(bytes, mime) {
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return 'data:' + mime + ';base64,' + btoa(s);
  }
  function htmlTeks(s, cssR) {
    // ⁣ = penanda kosong / format (disorot), ⁤ = nilai yang diisi (disorot lembut)
    const bag = String(s).split(/(⁣[^⁣]*⁣|⁤[^⁤]*⁤)/);
    return bag.map((b) => {
      if (!b) return '';
      if (b[0] === '⁣') return `<mark class="sr-pn">${esc(b.slice(1, -1))}</mark>`;
      if (b[0] === '⁤') return `<mark class="sr-isi">${esc(b.slice(1, -1))}</mark>`;
      return esc(b).replace(/\t/g, '<span class="sr-tab"></span>');
    }).join('');
  }
  function htmlRun(K, r, rPrPar, relsAktif) {
    const rPr = satu(r, 'rPr');
    const gs = rPr ? wv(satu(rPr, 'rStyle'), 'val') : null;
    const g = cssRun([K.st.defR].concat(rPrPar || []).concat(gs ? rantai(K.st, gs, 'rPr') : []).concat([rPr]));
    if (g.hide) return '';
    let h = '';
    anak(r).forEach((e) => {
      switch (e.localName) {
        case 't': h += htmlTeks(e.textContent); break;
        case 'tab': h += '<span class="sr-tab"></span>'; break;
        case 'br': case 'cr': h += wv(e, 'type') === 'page' ? '<span class="sr-pb"></span>' : '<br>'; break;
        case 'noBreakHyphen': h += '‑'; break;
        case 'sym': h += '•'; break;
        case 'drawing': case 'pict': h += htmlGambar(K, e, relsAktif); break;
        default:
      }
    });
    return g.css ? `<span style="${g.css}">${h}</span>` : h;
  }
  function htmlGambar(K, e, relsAktif) {
    const blip = e.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip')[0];
    const ext = e.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'extent')[0];
    let isiTb = '';
    const txbx = e.getElementsByTagNameNS(W, 'txbxContent')[0];
    if (txbx) isiTb = `<div class="sr-txbx">${htmlBlok(K, txbx, relsAktif)}</div>`;
    if (!blip) return isiTb;
    const id = blip.getAttributeNS(R_NS, 'embed') || blip.getAttribute('r:embed');
    const rel = relsAktif[id];
    if (!rel || rel.luar || !K.m.has(rel.target)) return isiTb;
    const mime = mimeGambar(rel.target);
    if (!mime) return isiTb;
    const w = ext ? Math.round(Number(ext.getAttribute('cx')) / 9525) : 0, hh = ext ? Math.round(Number(ext.getAttribute('cy')) / 9525) : 0;
    return `<img class="sr-img" src="${dataUrl(K.m.get(rel.target), mime)}" alt="" style="${w ? `width:${w}px;` : ''}${hh ? `height:${hh}px;` : ''}">` + isiTb;
  }
  function htmlPar(K, p, relsAktif) {
    const pPr = satu(p, 'pPr');
    const gid = (pPr && wv(satu(pPr, 'pStyle'), 'val')) || K.st.defStyle;
    const pPrs = [K.st.defP].concat(rantai(K.st, gid, 'pPr')).concat([pPr]);
    const rPrPar = rantai(K.st, gid, 'rPr');
    let pre = '';
    const np = pPr ? satu(pPr, 'numPr') : null;
    if (np) { const t = nomor(K, wv(satu(np, 'numId'), 'val'), wv(satu(np, 'ilvl'), 'val') || '0'); if (t) pre = `<span class="sr-num">${esc(t)}</span>`; }
    let h = '';
    const jalan = (el) => anak(el).forEach((e) => {
      if (e.localName === 'r') h += htmlRun(K, e, rPrPar, relsAktif);
      else if (['hyperlink', 'smartTag', 'ins', 'fldSimple', 'customXml', 'bdo', 'dir'].includes(e.localName)) jalan(e);
      else if (e.localName === 'sdt') jalan(satu(e, 'sdtContent'));
    });
    jalan(p);
    const css = cssPar(pPrs);
    const gR = cssRun([K.st.defR].concat(rPrPar));
    return `<p class="sr-p" style="${css};${gR.css}">${pre}${h || '&#8203;'}</p>`;
  }
  function htmlTabel(K, tbl, relsAktif) {
    const tblPr = satu(tbl, 'tblPr');
    const gid = tblPr && wv(satu(tblPr, 'tblStyle'), 'val');
    const prs = (gid ? rantai(K.st, gid, 'tblPr') : []).concat([tblPr]).filter(Boolean);
    let garis = false;
    prs.forEach((pr) => { const b = satu(pr, 'tblBorders'); if (b) anak(b).forEach((x) => { const v = wv(x, 'val'); if (v && v !== 'nil' && v !== 'none') garis = true; }); });
    const jc = tblPr ? wv(satu(tblPr, 'jc'), 'val') : null;
    const grid = anak(satu(tbl, 'tblGrid'), 'gridCol').map((g) => twPt(wv(g, 'w')));
    const rows = anak(tbl, 'tr');
    // peta vMerge → rowspan
    const sel = rows.map((tr) => { let col = 0; return anak(tr, 'tc').map((tc) => { const pr = satu(tc, 'tcPr'); const span = Number(pr && wv(satu(pr, 'gridSpan'), 'val')) || 1; const vm = pr ? satu(pr, 'vMerge') : null; const o = { tc, pr, col, span, vm: vm ? (wv(vm, 'val') === 'restart' ? 'r' : 'c') : '' }; col += span; return o; }); });
    sel.forEach((baris, ri) => baris.forEach((c) => {
      if (c.vm !== 'r') return;
      let n = 1;
      for (let k = ri + 1; k < sel.length; k++) { const s = sel[k].find((x) => x.col === c.col); if (s && s.vm === 'c') n++; else break; }
      c.rs = n;
    }));
    const cg = grid.length ? `<colgroup>${grid.map((w) => `<col style="width:${w}pt">`).join('')}</colgroup>` : '';
    const body = sel.map((baris) => '<tr>' + baris.filter((c) => c.vm !== 'c').map((c) => {
      const css = [];
      if (garis) css.push('border:1px solid #444');
      if (c.pr) {
        const b = satu(c.pr, 'tcBorders');
        if (b) anak(b).forEach((x) => { const v = wv(x, 'val'), sisi = { top: 'top', bottom: 'bottom', left: 'left', start: 'left', right: 'right', end: 'right' }[x.localName]; if (sisi) css.push(`border-${sisi}:${v && v !== 'nil' && v !== 'none' ? '1px solid #444' : '0'}`); });
        const sh = satu(c.pr, 'shd'); if (sh && warnaOk(wv(sh, 'fill'))) css.push('background:' + warnaOk(wv(sh, 'fill')));
        const va = wv(satu(c.pr, 'vAlign'), 'val'); if (va) css.push('vertical-align:' + (va === 'center' ? 'middle' : va));
      }
      return `<td${c.span > 1 ? ` colspan="${c.span}"` : ''}${c.rs > 1 ? ` rowspan="${c.rs}"` : ''} style="${css.join(';')}">${htmlBlok(K, c.tc, relsAktif)}</td>`;
    }).join('') + '</tr>').join('');
    return `<table class="sr-tbl" style="${jc === 'center' ? 'margin:0 auto;' : ''}">${cg}<tbody>${body}</tbody></table>`;
  }
  function htmlBlok(K, el, relsAktif) {
    let h = '';
    anak(el).forEach((e) => {
      if (e.localName === 'p') h += htmlPar(K, e, relsAktif);
      else if (e.localName === 'tbl') h += htmlTabel(K, e, relsAktif);
      else if (e.localName === 'sdt') h += htmlBlok(K, satu(e, 'sdtContent'), relsAktif);
      else if (e.localName === 'customXml') h += htmlBlok(K, e, relsAktif);
    });
    return h;
  }
  function htmlKepala(K, sect, jenis) {
    if (!sect) return '';
    const ref = anak(sect, jenis + 'Reference').find((r) => (wv(r, 'type') || 'default') === 'default');
    if (!ref) return '';
    const rel = K.rels.doc[ref.getAttributeNS(R_NS, 'id') || ref.getAttribute('r:id')];
    if (!rel || !K.m.has(rel.target)) return '';
    const d = xml(teks(K.m, rel.target));
    return htmlBlok(K, d.documentElement, K.relsDok(rel.target));
  }

  /**
   * Pratinjau HTML. mode: 'format' (penanda disorot) | 'data' (diisi dari data, nilai disorot lembut).
   * Mengembalikan { html, halaman } — html sudah aman (tanpa skrip/tautan/sumber luar).
   */
  async function pratinjau(bytes, data, mode) {
    const m0 = await unzip(bytes);
    const tandai = mode === 'format' ? true : 'semua';
    const m = new Map(m0);
    bagianTeks(m).forEach((nama) => { m.set(nama, enc.encode(serial(isiDoc(xml(teks(m, nama)), nilaiDari(mode === 'format' ? null : data, tandai))))); });
    const K = await bangunKonteks(m);
    const d = xml(teks(m, 'word/document.xml'));
    const body = d.getElementsByTagNameNS(W, 'body')[0];
    const sect = anak(body, 'sectPr')[0] || null;
    const pg = sect ? satu(sect, 'pgSz') : null, mg = sect ? satu(sect, 'pgMar') : null;
    const lebar = pg ? twPt(wv(pg, 'w')) : 595, tinggi = pg ? twPt(wv(pg, 'h')) : 842;
    const pad = mg ? [twPt(wv(mg, 'top')), twPt(wv(mg, 'right')), twPt(wv(mg, 'bottom')), twPt(wv(mg, 'left'))] : [72, 72, 72, 72];
    const isi = htmlBlok(K, body, K.rels.doc);
    const kepala = htmlKepala(K, sect, 'header'), kaki = htmlKepala(K, sect, 'footer');
    const gR = cssRun([K.st.defR]);
    const halaman = isi.split('<span class="sr-pb"></span>');
    const page = (h) => `<div class="sr-page" style="width:${lebar}pt;min-height:${tinggi}pt;padding:${Math.max(18, pad[0] * 0.55)}pt ${pad[1]}pt ${Math.max(18, pad[2] * 0.55)}pt ${pad[3]}pt;${gR.css}">
      ${kepala ? `<div class="sr-hdr">${kepala}</div>` : ''}<div class="sr-body">${h}</div>${kaki ? `<div class="sr-ftr">${kaki}</div>` : ''}</div>`;
    return { html: halaman.map(page).join(''), halaman: halaman.length, lebarPt: lebar };
  }

  // ========================================================================
  //  Import data: .xlsx / .csv
  // ========================================================================
  function kolKeIndeks(ref) { const m = String(ref).match(/^([A-Z]+)/); let n = 0; if (m) for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }
  /** v1.7: namaSheet (opsional) = baca sheet tertentu (tanpa beda huruf besar/kecil); bawaan sheet pertama. m = hasil unzip (opsional). */
  async function bacaXlsx(buf, namaSheet, mz) {
    const m = mz || await unzip(buf);
    const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const wb = xml(teks(m, 'xl/workbook.xml'));
    const semua = Array.from(wb.getElementsByTagNameNS(NS, 'sheet'));
    const cari = namaSheet ? semua.find((x) => String(x.getAttribute('name') || '').trim().toLowerCase() === String(namaSheet).trim().toLowerCase()) : null;
    if (namaSheet && !cari) return null;
    const sh0 = cari || semua[0];
    if (!sh0) throw new Error('Workbook tidak berisi sheet.');
    const rid = sh0.getAttributeNS(R_NS, 'id') || sh0.getAttribute('r:id');
    let path = 'xl/worksheets/sheet1.xml';
    const rels = teks(m, 'xl/_rels/workbook.xml.rels');
    if (rels) { const r = Array.from(xml(rels).getElementsByTagName('Relationship')).find((x) => x.getAttribute('Id') === rid); if (r) { const t = r.getAttribute('Target'); path = t.startsWith('/') ? t.slice(1) : 'xl/' + t; } }
    const ss = [];
    const sst = teks(m, 'xl/sharedStrings.xml');
    if (sst) Array.from(xml(sst).getElementsByTagNameNS(NS, 'si')).forEach((si) => ss.push(Array.from(si.getElementsByTagNameNS(NS, 't')).filter((t) => t.parentNode.localName !== 'rPh').map((t) => t.textContent).join('')));
    // gaya tanggal
    const tglXf = new Set();
    const sty = teks(m, 'xl/styles.xml');
    if (sty) {
      const d = xml(sty), custom = {};
      Array.from(d.getElementsByTagNameNS(NS, 'numFmt')).forEach((f) => { custom[f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || ''; });
      const xfs = d.getElementsByTagNameNS(NS, 'cellXfs')[0];
      if (xfs) anak(xfs, 'xf').forEach((xf, i) => {
        const id = Number(xf.getAttribute('numFmtId') || 0);
        const kode = custom[id] || '';
        if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (kode && /[dmy]/i.test(kode.replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/^[#0.,% ]+$/.test(kode))) tglXf.add(i);
      });
    }
    const d = xml(teks(m, path));
    const rows = [];
    Array.from(d.getElementsByTagNameNS(NS, 'row')).forEach((row) => {
      const out = [];
      anak(row, 'c').forEach((c, j) => {
        const idx = c.getAttribute('r') ? kolKeIndeks(c.getAttribute('r')) : j;
        const t = c.getAttribute('t'), s = Number(c.getAttribute('s') || 0);
        const v = satu(c, 'v');
        let val = '';
        if (t === 's') val = ss[Number(v && v.textContent)] || '';
        else if (t === 'inlineStr') val = Array.from(c.getElementsByTagNameNS(NS, 't')).map((x) => x.textContent).join('');
        else if (t === 'str') val = v ? v.textContent : '';
        else if (t === 'b') val = v && v.textContent === '1' ? 'Ya' : 'Tidak';
        else if (t === 'e') val = '';
        else if (v) {
          const n = Number(v.textContent);
          if (tglXf.has(s) && isFinite(n)) { const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 864e5)); val = dt.toISOString().slice(0, 10); }
          else val = isFinite(n) ? n : v.textContent;
        }
        out[idx] = val;
      });
      for (let i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = '';
      rows[Number(row.getAttribute('r') || rows.length + 1) - 1] = out;
    });
    return rows.map((r) => r || []);
  }
  function bacaCsv(txt) {
    txt = String(txt || '').replace(/^﻿/, '');
    const baris1 = txt.split(/\r?\n/)[0] || '';
    const pemisah = (baris1.match(/;/g) || []).length > (baris1.match(/,/g) || []).length ? ';' : (baris1.indexOf('\t') > -1 ? '\t' : ',');
    const rows = []; let row = [], sel = '', kutip = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (kutip) { if (ch === '"') { if (txt[i + 1] === '"') { sel += '"'; i++; } else kutip = false; } else sel += ch; }
      else if (ch === '"') kutip = true;
      else if (ch === pemisah) { row.push(sel); sel = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(sel); rows.push(row); row = []; sel = ''; }
      else sel += ch;
    }
    if (sel !== '' || row.length) { row.push(sel); rows.push(row); }
    return rows;
  }
  /** Baca file import → { kolom: [field], cocok: [field], hilang: [field], lebih: [nama], rows: [{field: nilai}] }. */
  async function bacaImport(file, penanda) {
    if (file.size > 15 * 1024 * 1024) throw new Error('File terlalu besar (maks 15 MB).');
    const buf = new Uint8Array(await file.arrayBuffer());
    const xlsx = buf[0] === 0x50 && buf[1] === 0x4b;
    const rows = xlsx ? await bacaXlsx(buf) : bacaCsv(dec.decode(buf));
    const set = new Set(penanda);
    let hi = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) { const n = (rows[i] || []).filter((x) => set.has(normField(x))).length; if (n && (hi < 0 || n > rows[hi].filter((x) => set.has(normField(x))).length)) hi = i; }
    if (hi < 0) throw new Error('Baris judul kolom tidak ditemukan. Gunakan template import (nama kolom = penanda format surat).');
    const head = rows[hi].map((x) => normField(x));
    const cocok = penanda.filter((f) => head.includes(f)), hilang = penanda.filter((f) => !head.includes(f));
    const lebih = rows[hi].filter((x, i) => String(x).trim() && !set.has(head[i]));
    const data = [];
    rows.slice(hi + 1).forEach((r) => {
      const o = {}; let ada = false;
      head.forEach((f, i) => { if (!set.has(f)) return; let v = r[i]; if (v === undefined || v === null) return; if (typeof v === 'string') v = v.trim(); if (v === '') return; o[f] = v; ada = true; });
      if (ada) data.push(o);
    });
    return { cocok, hilang, lebih, rows: data, baris: data.length };
  }

  /** Template import .xlsx: baris 1 = nama penanda; kolom berformat teks; sheet Petunjuk. */
  async function templateImport(judul, penanda, contohFmt) {
    const col = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
    const sel = (ref, v, s) => `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
    const lembar1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>${penanda.map((f, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(16, Math.min(40, f.length + 6))}" style="2" customWidth="1"/>`).join('')}</cols><sheetData><row r="1" ht="24" customHeight="1">${penanda.map((f, i) => sel(col(i) + '1', f, 1)).join('')}</row></sheetData></worksheet>`;
    const ptj = [['Petunjuk import data — ' + judul, 3], ['1. Isi data mulai baris 2 di sheet "Data". Satu baris = satu surat.', 0], ['2. Jangan mengubah judul kolom di baris 1 (nama kolom = penanda di format Word).', 0],
      ['3. Angka boleh ditulis biasa (1500000) atau bertitik (1.500.000). Tanggal: 2026-11-22 atau 22/11/2026.', 0], ['4. Simpan sebagai .xlsx (atau .csv), lalu unggah lewat tombol "Import data" di halaman Analisa.', 0], ['', 0],
      ['Kolom', 3]].concat(penanda.map((f) => [f + (contohFmt && contohFmt[f] ? '  →  ditampilkan sebagai ' + (FORMAT[contohFmt[f]] || contohFmt[f]) : ''), 0]));
    const lembar2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="16"/><cols><col min="1" max="1" width="110" customWidth="1"/></cols><sheetData>${ptj.map((r, i) => `<row r="${i + 1}">${r[0] ? sel('A' + (i + 1), r[0], r[1]) : ''}</row>`).join('')}</sheetData></worksheet>`;
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF9D174D"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDB2777"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/><sheet name="Petunjuk" sheetId="2" r:id="rId2"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', styles], ['xl/worksheets/sheet1.xml', lembar1], ['xl/worksheets/sheet2.xml', lembar2]
    ];
    return zip(files, MIME_XLSX);
  }

  // ========================================================================
  //  Contoh format surat (Memo Analisa Kredit) — .docx dibuat dari nol
  // ========================================================================
  async function contohDocx(opsi) {
    opsi = opsi || {};
    const run = (t, p) => `<w:r>${p ? `<w:rPr>${p}</w:rPr>` : ''}<w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
    const par = (isi, pPr) => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${isi}</w:p>`;
    const B = '<w:b/>';
    const sel = (isi, w, extra) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${extra || ''}</w:tcPr>${isi}</w:tc>`;
    const brs = (label, nilai) => `<w:tr>${sel(par(run(label)), 3200)}${sel(par(run(':')), 300)}${sel(par(nilai), 5500)}</w:tr>`;
    const tabel = (rows, tepi) => `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>${tepi ? '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders>' : ''}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="3200"/><w:gridCol w:w="300"/><w:gridCol w:w="5500"/></w:tblGrid>${rows.join('')}</w:tbl>`;
    const judulBag = (t) => par(run(t, B + '<w:color w:val="9D174D"/>'), '<w:spacing w:before="200" w:after="80"/>');
    const ins = xe(opsi.institusi || 'NAMA BANK / UNIT KERJA'), cab = xe(opsi.cabang || 'Kantor Cabang');
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="${R_NS}"><w:body>
${par(run(ins, B + '<w:sz w:val="28"/><w:color w:val="9D174D"/>'), '<w:jc w:val="left"/><w:spacing w:after="0"/>')}
${par(run(cab + ' — Business Banking', '<w:color w:val="555555"/>'), '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="DB2777"/></w:pBdr><w:spacing w:after="240"/>')}
${par(run('MEMO ANALISA KREDIT', B + '<w:sz w:val="30"/>'), '<w:jc w:val="center"/><w:spacing w:after="40"/>')}
${par(run('Nomor: {{nomor_surat}}', '<w:color w:val="333333"/>'), '<w:jc w:val="center"/><w:spacing w:after="240"/>')}
${tabel([brs('Kepada', run('{{kepada}}')), brs('Dari', run('{{nama_analis}}')), brs('Tanggal', run('{{tanggal_surat:tgl}}')), brs('Perihal', run('Analisa permohonan kredit {{nama_debitur}}', B))])}
${judulBag('A. Data Debitur')}
${tabel([brs('Nama debitur', run('{{nama_debitur:besar}}', B)), brs('CIF', run('{{cif}}')), brs('No. rekening pinjaman', run('{{rek_pinjaman}}')), brs('Produk', run('{{produk}}')), brs('Bidang usaha / pekerjaan', run('{{bidang_usaha}}'))], true)}
${judulBag('B. Fasilitas yang Diusulkan')}
${tabel([brs('Plafon', run('{{plafon:rp}}', B)), brs('Terbilang', run('{{plafon:terbilang}} rupiah', '<w:i/>')), brs('Jangka waktu', run('{{jangka_waktu}}')), brs('Tujuan penggunaan', run('{{tujuan_kredit}}'))], true)}
${judulBag('C. Analisa Kemampuan Bayar')}
${tabel([brs('Penghasilan bersih / bulan', run('{{penghasilan_bulanan:rp}}')), brs('Angsuran / bulan', run('{{angsuran:rp}}')), brs('Debt Service Ratio (DSR)', run('{{dsr}}')), brs('Kolektibilitas SLIK', run('{{kolektibilitas_slik}}'))], true)}
${judulBag('D. Kesimpulan & Rekomendasi')}
${par(run('{{rekomendasi}}'), '<w:spacing w:after="240"/>')}
${par(run('Demikian memo analisa ini disampaikan sebagai bahan pertimbangan pemutus kredit.'), '<w:jc w:val="both"/><w:spacing w:after="360"/>')}
<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>
<w:tr>${sel(par(run('Dibuat oleh,'), '<w:jc w:val="center"/>') + par(run('Analis Kredit'), '<w:jc w:val="center"/><w:spacing w:after="900"/>') + par(run('{{nama_analis}}', B + '<w:u w:val="single"/>'), '<w:jc w:val="center"/>'), 4500)}${sel(par(run('Disetujui oleh,'), '<w:jc w:val="center"/>') + par(run('Pemutus Kredit'), '<w:jc w:val="center"/><w:spacing w:after="900"/>') + par(run('{{nama_pemutus}}', B + '<w:u w:val="single"/>'), '<w:jc w:val="center"/>'), 4500)}</w:tr></w:tbl>
${par(run('Dokumen internal — RAHASIA', '<w:i/><w:sz w:val="16"/><w:color w:val="888888"/>'), '<w:jc w:val="right"/><w:spacing w:before="300"/>')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['word/document.xml', doc], ['word/styles.xml', styles]
    ], MIME_DOCX);
  }

  /** ZIP berisi banyak .docx (1 file per surat). */
  async function zipSurat(item) {
    const files = [], nama = new Set();
    for (const it of item) {
      let n = String(it.nama || 'surat').replace(/[\\/:*?"<>|\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'surat';
      let k = n, i = 2; while (nama.has(k.toLowerCase())) k = n + ' (' + i++ + ')';
      nama.add(k.toLowerCase());
      files.push([k + '.docx', new Uint8Array(await it.blob.arrayBuffer())]);
    }
    return zip(files, 'application/zip');
  }

  const b64ke = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function keB64(blobOrBytes) {
    const u = blobOrBytes instanceof Blob ? new Uint8Array(await blobOrBytes.arrayBuffer()) : blobOrBytes;
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    return btoa(s);
  }

  /** v1.7: daftar nama sheet di workbook (.xlsx). */
  async function daftarSheet(buf, mz) {
    const m = mz || await unzip(buf);
    const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    return Array.from(xml(teks(m, 'xl/workbook.xml')).getElementsByTagNameNS(NS, 'sheet')).map((x) => x.getAttribute('name') || '');
  }
  return { unzip, zip, daftarPenanda, buatDocx, gabungDocx, pratinjau, bacaImport, bacaXlsx, daftarSheet, bacaCsv, templateImport, contohDocx, zipSurat,
    format, terbilang, normField, b64ke, keB64, FORMAT, MIME_DOCX };
})();
