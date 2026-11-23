/* ==========================================================================
   FinSight — laporan.js : satu template laporan untuk Excel, PDF & Cetak
   Tampilan mengikuti tabel di aplikasi: kop + logo, ringkasan, tabel dengan
   chip produk / Kol. / status berwarna, nominal rata kanan, baris total.
   - Excel  : dibuat di browser (xlsx.js) — angka tetap angka (bisa dijumlah).
   - PDF    : HTML yang sama dikonversi server (Apps Script) & disimpan di Drive.
   - Cetak  : HTML yang sama dicetak lewat iframe (bisa "Simpan sebagai PDF").
   ========================================================================== */
'use strict';

const Laporan = (() => {
  const esc = (s) => U.esc(s === null || s === undefined ? '' : String(s));
  const MAKS_PDF = 2500;
  const KOLW = { 1: ['15803D', 'DCFCE7'], 2: ['1D4ED8', 'DBEAFE'], 3: ['B45309', 'FEF3C7'], 4: ['C2410C', 'FFEDD5'], 5: ['BE123C', 'FFE4E6'] };
  const STW = { Aktif: ['15803D', 'DCFCE7'], Lunas: ['475569', 'F1F5F9'] };
  const hex = (h) => String(h || '#64748B').replace('#', '').toUpperCase().slice(0, 6);
  const rgba = (h, a) => { const x = hex(h); return `rgba(${parseInt(x.slice(0, 2), 16)},${parseInt(x.slice(2, 4), 16)},${parseInt(x.slice(4, 6), 16)},${a})`; };
  /** Warna muda (campur putih) dalam hex — untuk isian sel Excel. */
  const muda = (h, a = 0.14) => { const x = hex(h); return [0, 2, 4].map((i) => Math.round(255 - (255 - parseInt(x.slice(i, i + 2), 16)) * a).toString(16).padStart(2, '0')).join('').toUpperCase(); };

  // ---------- Definisi tipe kolom (dipakai Excel & HTML) ----------
  const TIPE = {
    no:     { a: 'c', w: 5 },
    ent:    { a: 'l', w: 32 },
    rek:    { a: 'l', w: 16 },
    teks:   { a: 'l', w: 16 },
    prod:   { a: 'c', w: 10 },
    rp:     { a: 'r', w: 18 },
    num:    { a: 'r', w: 11 },
    pct:    { a: 'r', w: 10 },
    tgl:    { a: 'l', w: 14 },
    kol:    { a: 'c', w: 10 },
    status: { a: 'c', w: 10 },
    risk:   { a: 'l', w: 24 }
  };
  const tipe = (k) => Object.assign({}, TIPE[k.t] || TIPE.teks, k);

  /** Nilai tampilan sebuah sel untuk HTML (PDF/Cetak). */
  function selHtml(k, d, i) {
    if (k.t === 'no') return { v: U.num(i + 1) };
    const p = k.p ? k.p(d, i) : (k.x ? k.x(d, i) : '');
    const o = p && typeof p === 'object' && !Array.isArray(p) ? p : { v: p };
    if (k.t === 'rp' && typeof o.v === 'number') o.v = U.rpJ(o.v);         // v1.5: Juta / M, 2 desimal dipotong
    if (k.t === 'num' && typeof o.v === 'number') o.v = U.num(o.v);
    if (k.t === 'pct' && typeof o.v === 'number') o.v = U.pct(o.v * 100);
    if (k.t === 'tgl' && /^\d{4}-\d{2}-\d{2}/.test(o.v || '')) o.v = U.tgl2(o.v);
    return o;
  }
  function isiHtml(k, o) {
    let v = o.v === null || o.v === undefined ? '' : o.v;
    if (k.t === 'prod' && v) { const c = UI.warnaProd(v); v = `<span class="chip" style="color:${c};background:${rgba(c, 0.13)}">${esc(v)}</span>`; }
    else if (k.t === 'kol' && v) { const n = +String(v).replace(/\D/g, '') || 1, w = KOLW[n] || KOLW[1]; v = `<span class="chip" style="color:#${w[0]};background:#${w[1]}">Kol. ${n}</span>`; }
    else if (k.t === 'status' && v) { const w = STW[v] || ['475569', 'F1F5F9']; v = `<span class="chip" style="color:#${w[0]};background:#${w[1]}">${esc(v)}</span>`; }
    else if (k.t === 'risk' && v) v = String(v).split(' & ').map((x) => `<span class="chip ${/blokir/i.test(x) ? 'r-neg' : 'r-warn'}">${esc(x)}</span>`).join(' ');
    else v = esc(v);
    const l2 = o.l2 ? `<div class="l2">${esc(o.l2)}</div>` : '';
    return (k.t === 'ent' ? `<b>${v}</b>` : v) + l2;
  }

  // ---------- Logo (PNG data URL supaya terbaca juga oleh konverter PDF server) ----------
  let logoCache = { kunci: '', url: '' };
  async function logoPng() {
    const b = App.brand();
    if (b.logo) return b.logo;
    if (logoCache.kunci === 'bawaan') return logoCache.url;
    try {
      const svg = App.logoSvg(96).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const c = document.createElement('canvas'); c.width = 96; c.height = 96;
      c.getContext('2d').drawImage(img, 0, 0, 96, 96);
      URL.revokeObjectURL(url);
      logoCache = { kunci: 'bawaan', url: c.toDataURL('image/png') };
      return logoCache.url;
    } catch (e) { return ''; }
  }

  function metaCetak() {
    return `${U.tglJam(Date.now())} WIB oleh ${S.me.nama} (NPP ${S.me.npp}, ${App.labelPeran(S.me.peran)})`;
  }

  // ---------- HTML laporan ----------
  const CSS = `@page{size:A4 __ORI__;margin:10mm 9mm}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0F172A;font-size:8pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{border-collapse:collapse}
.kop{width:100%}.kop td{vertical-align:middle;padding:0}
.kop .kl{width:52px}.kop .logo{height:40px;max-width:150px;display:block}
.kop .app{font-size:15pt;font-weight:bold;letter-spacing:-.2px;color:#0F172A}
.kop .ins{font-size:7.5pt;color:#64748B;margin-top:2px}
.kop .kr{text-align:right}.kop .lbl{font-size:6.5pt;letter-spacing:1.4px;color:#DB2777;font-weight:bold}
.kop .jdl{font-size:13pt;font-weight:bold;color:#0F172A}.kop .sub{font-size:8pt;color:#64748B}
.garis{height:4px;margin:8px 0 8px;background:#DB2777;border-right:180px solid #8B5CF6;border-radius:2px}
.meta{width:100%;font-size:7.3pt;color:#475569;margin-bottom:8px}.meta td{padding:0;vertical-align:top}.meta b{color:#0F172A}.meta .r{text-align:right}
.ring{width:100%;margin:0 0 9px;border-collapse:separate;border-spacing:6px 0}
.ring td{border:1px solid #F3D3E4;background:#FDF2F8;border-radius:8px;padding:6px 9px}
.ring .kl{font-size:6.3pt;color:#9D174D;text-transform:uppercase;letter-spacing:.5px;font-weight:bold}.ring .kv{font-size:11pt;font-weight:bold;margin-top:2px;color:#0F172A}
.data{width:100%;table-layout:auto}
.data thead{display:table-header-group}.data tr{page-break-inside:avoid}
.data th{background:#FDF2F8;color:#831843;font-size:6.6pt;text-transform:uppercase;letter-spacing:.4px;font-weight:bold;padding:6px 5px;border-bottom:1.6px solid #DB2777;text-align:left;vertical-align:bottom}
.data td{padding:5px 5px;border-bottom:1px solid #EEEDF5;font-size:7.6pt;vertical-align:middle}
.data tbody tr:nth-child(even) td{background:#FBFAFE}
.data .a-r{text-align:right;white-space:nowrap}.data .a-c{text-align:center}.data .rek{white-space:nowrap;color:#475569}
.data .l2{font-size:6.4pt;color:#64748B;margin-top:1px}
.data .neg{color:#BE123C;font-weight:bold}.data .pos{color:#15803D}.data .warn{color:#B45309}.data .b{font-weight:bold}.data .mut{color:#94A3B8}
.data tfoot td{background:#F8F7FC;font-weight:bold;border-top:1.6px solid #CBD5E1;border-bottom:0;padding:6px 5px}
.chip{display:inline-block;padding:1px 6px;border-radius:7px;font-weight:bold;font-size:6.6pt;white-space:nowrap}
.chip.r-neg{color:#BE123C;background:#FFE4E6}.chip.r-warn{color:#B45309;background:#FEF3C7;margin-top:1px}
.tagih .garis{background:#E11D48;border-right-color:#DB2777}.tagih .kop .lbl{color:#E11D48}.tagih .ring td{background:#FFF1F2;border-color:#FECDD3}.tagih .ring .kl{color:#9F1239}
.tagih .data th{background:#FFF1F2;color:#881337;border-bottom-color:#E11D48}.tagih .ring td:nth-child(2) .kv{color:#BE123C}
.ft{margin-top:10px;font-size:6.6pt;color:#94A3B8;border-top:1px solid #EEEDF5;padding-top:5px}
.ft b{color:#64748B}`;

  function html(spec, logo) {
    const st = S.setting || {}, b = App.brand();
    const kol = spec.kolom.map(tipe);
    const data = spec.data.slice(0, spec.maks || 1e9);
    const lanskap = spec.orientasi ? spec.orientasi === 'landscape' : kol.length > 7;
    const ins = [b.sub, st.NAMA_INSTITUSI, st.NAMA_CABANG].filter(Boolean).join(' • ');
    const th = kol.map((k) => `<th class="a-${k.a}">${esc(k.h)}</th>`).join('');
    const tb = data.map((d, i) => '<tr>' + kol.map((k) => {
      const o = selHtml(k, d, i);
      const cls = ['a-' + k.a, k.t === 'rek' ? 'rek' : '', o.c || ''].filter(Boolean).join(' ');
      return `<td class="${cls}">${isiHtml(k, o)}</td>`;
    }).join('') + '</tr>').join('');
    let tf = '';
    if (kol.some((k) => k.sum)) {
      const iLbl = kol.findIndex((k) => !k.sum && k.t !== 'no');
      tf = '<tfoot><tr>' + kol.map((k, i) => {
        if (k.sum) { const t = spec.data.reduce((s, d, j) => { const v = k.x(d, j); return s + (Number(v && typeof v === 'object' ? v.v : v) || 0); }, 0); return `<td class="a-r">${esc(k.t === 'rp' ? U.rpJ(t) : U.num(t))}</td>`; }
        return i === iLbl ? `<td>Total (${U.num(spec.data.length)} ${esc(spec.satuan || 'baris')})</td>` : '<td></td>';
      }).join('') + '</tr></tfoot>';
    }
    const ring = (spec.ringkasan || []).slice(0, 6);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(spec.judul)}</title><style>${CSS.replace('__ORI__', lanskap ? 'landscape' : 'portrait')}</style></head><body${spec.tema ? ` class="${esc(spec.tema)}"` : ''}>
<table class="kop"><tr>${logo ? `<td class="kl"><img class="logo" src="${logo}" alt=""></td>` : ''}<td class="kn"><div class="app">${esc(b.nama)}</div><div class="ins">${esc(ins || 'Monitoring Portofolio Kredit & Penagihan')}</div></td>
<td class="kr"><div class="lbl">LAPORAN</div><div class="jdl">${esc(spec.judul)}</div>${spec.sub ? `<div class="sub">${esc(spec.sub)}</div>` : ''}</td></tr></table>
<div class="garis"></div>
<table class="meta"><tr><td><b>Filter:</b> ${esc(spec.filter || 'Semua data')}</td><td class="r"><b>Dicetak:</b> ${esc(metaCetak())}</td></tr></table>
${ring.length ? `<table class="ring"><tr>${ring.map((r) => `<td><div class="kl">${esc(r[0])}</div><div class="kv">${esc(r[1])}</div></td>`).join('')}</tr></table>` : ''}
<table class="data"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody>${tf}</table>
<div class="ft"><b>Dokumen internal — RAHASIA.</b> ${U.num(data.length)} baris${spec.data.length > data.length ? ` (dibatasi dari ${U.num(spec.data.length)} — gunakan Excel untuk data lengkap)` : ''} • Dibuat otomatis oleh ${esc(b.nama)} v${esc(typeof VERSI_APP !== 'undefined' ? VERSI_APP : '')}</div>
</body></html>`;
  }

  // ---------- Cetak (iframe tersembunyi) ----------
  async function cetak(spec) {
    if (!spec.data.length) return U.toast('Tidak ada data untuk dicetak.', 'warn');
    const doc = html(spec, await logoPng());
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    const w = fr.contentWindow;
    w.document.open(); w.document.write(doc); w.document.close();
    await new Promise((ok) => { const im = w.document.images; let n = im.length; if (!n) return ok(); [...im].forEach((x) => { if (x.complete) { if (!--n) ok(); } else x.onload = x.onerror = () => { if (!--n) ok(); }; }); setTimeout(ok, 1500); });
    w.focus(); w.print();
    setTimeout(() => fr.remove(), 60000);
    Api.call('ekspor.catat', { jenis: 'cetak', judul: spec.judul, jumlah: spec.data.length, filter: spec.filter });
  }

  // ---------- PDF (server) ----------
  async function pdf(spec, btn) {
    if (!spec.data.length) return U.toast('Tidak ada data untuk diekspor.', 'warn');
    if (Api.DEMO) { U.toast('Mode demo: PDF dibuat lewat dialog cetak (pilih "Simpan sebagai PDF").', 'info', 5000); return cetak(spec); }
    if (btn) { btn.disabled = true; btn.dataset.l = btn.innerHTML; btn.innerHTML = '<span class="spin"></span> Membuat PDF…'; }
    const doc = html(Object.assign({}, spec, { maks: MAKS_PDF }), await logoPng());
    const r = await Api.call('ekspor.pdf', { judul: spec.judul, html: doc, jumlah: Math.min(spec.data.length, MAKS_PDF), filter: spec.filter }, { timeout: 120000 });
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.l; }
    if (!r.success) return U.toast(r.message, 'err');
    U.unduh(U.b64ToBlob(r.data.base64, 'application/pdf'), r.data.nama);
    U.toast(r.data.url ? 'PDF diunduh & tersimpan di folder Drive “Ekspor Laporan”.' : 'PDF diunduh.', 'ok', 5000);
  }

  // ---------- Excel ----------
  function lembar(spec, nama) {
    const kol = spec.kolom.map(tipe);
    return {
      name: nama || spec.judul,
      judul: spec.judul, sub: spec.sub, filter: spec.filter, ringkasan: spec.ringkasan, satuan: spec.satuan,
      cols: kol.map((k) => ({ h: k.h, w: k.xw || k.w, t: k.t, a: k.a, sum: !!k.sum })),
      rows: spec.data.map((d, i) => kol.map((k) => {
        if (k.t === 'no') return i + 1;
        const v = k.x ? k.x(d, i) : (k.p ? k.p(d, i) : '');
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          return { v: v.v, l2: v.l2, c: v.c };
        }
        return v;
      }))
    };
  }
  function umumXlsx() {
    const st = S.setting || {}, b = App.brand();
    return { app: b.nama, ins: [b.sub, st.NAMA_INSTITUSI, st.NAMA_CABANG].filter(Boolean).join(' • '), dicetak: metaCetak(), warnaProd: (k) => hex(UI.warnaProd(k)), muda, KOLW, STW };
  }
  function xlsx(spec) {
    if (!spec.data.length) return U.toast('Tidak ada data untuk diekspor.', 'warn');
    const umum = umumXlsx();
    const sheets = [lembar(spec, spec.lembar || spec.judul)].concat((spec.lembarLain || []).map((x) => lembar(Object.assign({ filter: spec.filter }, x), x.lembar || x.judul)));
    const blob = XLSX.build(sheets, umum);
    const nama = spec.judul.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_') + '_' + U.isoLokal(new Date()).replace(/-/g, '') + '.xlsx';
    U.unduh(blob, nama);
    Api.call('ekspor.catat', { jenis: 'xlsx', judul: spec.judul, jumlah: spec.data.length, filter: spec.filter });
    U.toast(`Excel “${nama}” diunduh (${U.num(spec.data.length)} baris).`, 'ok');
  }

  /** Kolom standar debitur (sama dengan tabel Daftar Debitur di aplikasi). */
  function kolomDebitur(opsi = {}) {
    const kontak = (d) => [d.wa, d.pic].filter(Boolean).join(' • ');
    const k = [
      { h: 'No', t: 'no' },
      { h: 'Nama Debitur', t: 'ent', x: (d) => d.nm + '\n' + kontak(d), p: (d) => ({ v: d.nm, l2: kontak(d) }) },
      { h: 'Rek Pinjaman', t: 'rek', x: (d) => d.rek || '' },
      { h: 'Rek Afil', t: 'rek', x: (d) => d.ra || '' },
      opsi.pt ? { h: 'PT Penempatan', t: 'teks', w: 20, x: (d) => (d.pt ? UI.namaPt(d.pt) : 'Belum diisi'), p: (d) => (d.pt ? UI.namaPt(d.pt) : { v: 'Belum diisi', c: 'mut' }) } : { h: 'Produk', t: 'prod', x: (d) => d.pr },
      opsi.pt ? { h: 'Batch', t: 'teks', w: 11, x: (d) => d.bt || '' } : null,
      opsi.pt ? { h: 'Jangka Waktu', t: 'teks', w: 12, x: (d) => d.jw || '' } : null,
      { h: 'Plafon', t: 'rp', sum: true, x: (d) => d.pl },
      { h: 'Baki Debet', t: 'rp', sum: true, x: (d) => d.bd, p: (d) => ({ v: U.rpJ(d.bd), c: 'b' + (d.kol === 5 ? ' neg' : '') }) },
      { h: 'Angsuran', t: 'rp', sum: true, x: (d) => d.an },
      { h: 'Saldo Blokir', t: 'rp', sum: true, x: (d) => (d.sb === null || d.sb === undefined ? (d.aktif ? { v: 'Kosong', c: 'neg' } : '') : (d.fBlokir ? { v: d.sb, c: 'neg' } : d.sb)),
        p: (d) => (d.sb === null || d.sb === undefined ? (d.aktif ? { v: 'Kosong', c: 'neg' } : '') : { v: U.rpJ(d.sb), c: d.fBlokir ? 'neg' : '' }) },
      { h: 'Saldo Akhir', t: 'rp', sum: true, x: (d) => (d.fSaldo ? { v: d.sa, c: 'neg' } : d.sa), p: (d) => ({ v: U.rpJ(d.sa), c: d.fSaldo ? 'neg' : '' }) },
      { h: 'Jatuh Tempo', t: 'tgl', x: (d) => d.jt, p: (d) => ({ v: d.jt ? U.tgl2(d.jt) : '', l2: jtTeks(d) }) },
      { h: 'Kol', t: 'kol', x: (d) => (d.aktif ? d.kol : '') },
      { h: 'Status', t: 'status', x: (d) => d.st }
    ].filter(Boolean);
    return k;
  }
  function jtTeks(d) {
    if (!d.aktif || d.dd === null || d.dd === undefined) return '';
    if (d.dd < 0) return 'Lewat ' + Math.abs(d.dd) + ' hari';
    if (d.dd === 0) return 'Hari ini';
    return 'H-' + d.dd;
  }

  return { xlsx, pdf, cetak, html, kolomDebitur, jtTeks, umumXlsx, MAKS_PDF };
})();
