/* ==========================================================================
   FinSight — xlsx.js : pembuat file Excel (.xlsx) murni di browser
   OOXML minimal + ZIP (metode STORE) + CRC32. Instan, tanpa library & tanpa server.
   ========================================================================== */
'use strict';

const XLSX = (() => {
  const enc = new TextEncoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  const x = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  function colName(i) { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

  function zip(files) {
    const parts = [], central = [];
    let off = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // ---------- Registri gaya (font/isi/garis/format dibuat sesuai kebutuhan) ----------
  function Gaya() {
    const fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = ['<border/>'], fmts = [], xfs = [];
    const daftar = (arr, xml) => { let i = arr.indexOf(xml); if (i < 0) { arr.push(xml); i = arr.length - 1; } return i; };
    const FMT = { rp: '"Rp "#,##0;[Red]-"Rp "#,##0', num: '#,##0', tgl: 'dd mmm yyyy', pct: '0.0%' };
    const tepi = (s, c) => (s ? `<left style="${s}"><color rgb="FF${c}"/></left><right style="${s}"><color rgb="FF${c}"/></right><top style="${s}"><color rgb="FF${c}"/></top><bottom style="${s}"><color rgb="FF${c}"/></bottom>` : '');
    function s(o = {}) {
      const f = daftar(fonts, `<font>${o.b ? '<b/>' : ''}${o.i ? '<i/>' : ''}<sz val="${o.sz || 10}"/><color rgb="FF${o.c || '1E293B'}"/><name val="Calibri"/></font>`);
      const fi = o.bg ? daftar(fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${o.bg}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      let bd = 0;
      if (o.bd === 'sel') bd = daftar(borders, `<border>${tepi('thin', 'E2E8F0')}</border>`);
      else if (o.bd === 'hdr') bd = daftar(borders, `<border><left style="thin"><color rgb="FFF3D3E4"/></left><right style="thin"><color rgb="FFF3D3E4"/></right><top style="thin"><color rgb="FFF3D3E4"/></top><bottom style="medium"><color rgb="FFDB2777"/></bottom></border>`);
      else if (o.bd === 'tot') bd = daftar(borders, `<border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="medium"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom></border>`);
      else if (o.bd === 'kp') bd = daftar(borders, `<border>${tepi('thin', 'F3D3E4')}</border>`);
      const nf = o.fmt ? 164 + daftar(fmts, FMT[o.fmt] || o.fmt) : 0;
      const al = `<alignment horizontal="${o.ah || 'general'}" vertical="${o.av || 'center'}"${o.wrap ? ' wrapText="1"' : ''}${o.ind ? ` indent="${o.ind}"` : ''}/>`;
      const xml = `<xf numFmtId="${nf}" fontId="${f}" fillId="${fi}" borderId="${bd}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${nf ? ' applyNumberFormat="1"' : ''}>${al}</xf>`;
      return daftar(xfs, xml);
    }
    s({});                                             // indeks 0 = normal
    function xml() {
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        (fmts.length ? `<numFmts count="${fmts.length}">${fmts.map((c, i) => `<numFmt numFmtId="${164 + i}" formatCode="${x(c)}"/>`).join('')}</numFmts>` : '') +
        `<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>` +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    }
    return { s, xml };
  }

  const ALIAS_T = { n: 'num', d: 'tgl', p: 'pct', s: 'teks' };
  const AH = { l: 'left', c: 'center', r: 'right' };

  /**
   * sheets: [{ name, judul, sub, filter, ringkasan:[[label,nilai]], cols:[{h,w,t,a,sum}], rows:[[nilai | {v,l2,c}]] }]
   *   t: no | ent | rek | teks | prod | rp | num | pct | tgl | kol | status   (n/d/p/s = alias lama)
   * umum: { app, ins, dicetak, warnaProd(kode)→hex, muda(hex)→hex, KOLW, STW }
   * Hasil: kop berwarna, ringkasan, header tabel bergaya aplikasi, chip berwarna, baris zebra,
   *        nominal format Rupiah (tetap angka), baris total, freeze pane, filter, siap cetak A4.
   */
  function build(sheets, umum = {}) {
    const G = Gaya();
    const wbSheets = sheets.map((s, i) => `<sheet name="${x(String(s.name).slice(0, 31).replace(/[\\\/\?\*\[\]:]/g, ' '))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
    const defNames = [];
    const files = [];
    const st = {
      judul: G.s({ b: true, sz: 15, c: 'FFFFFF', bg: 'DB2777', ah: 'left', ind: 1 }),
      judulR: G.s({ b: true, sz: 10, c: 'FCE7F3', bg: 'DB2777', ah: 'right' }),
      ins: G.s({ sz: 9, c: '64748B', bg: 'FDF2F8', ah: 'left', ind: 1 }),
      meta: G.s({ i: true, sz: 9, c: '64748B', ah: 'left' }),
      kpL: G.s({ b: true, sz: 8, c: '9D174D', bg: 'FDF2F8', bd: 'kp', ah: 'left', ind: 1 }),
      kpV: G.s({ b: true, sz: 12, c: '0F172A', bg: 'FDF2F8', bd: 'kp', ah: 'left', ind: 1 }),
      hdr: (a) => G.s({ b: true, sz: 9, c: '831843', bg: 'FDF2F8', bd: 'hdr', ah: AH[a] || 'left', wrap: true })
    };
    sheets.forEach((sh, si) => {
      const cols = sh.cols.map((c) => Object.assign({}, c, { t: ALIAS_T[c.t] || c.t || 'teks', a: c.a || ((ALIAS_T[c.t] || c.t) === 'rp' || (ALIAS_T[c.t] || c.t) === 'num' || (ALIAS_T[c.t] || c.t) === 'pct' ? 'r' : 'l') }));
      const n = cols.length, last = colName(n - 1);
      const rows = [], merges = [];
      let r = 1;
      const cell = (ref, v, s) => {
        if (v === null || v === undefined || v === '') return `<c r="${ref}" s="${s}"/>`;
        if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
        return `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
      };
      // Teks 2 baris: baris 1 tebal (nama), baris 2 kecil abu-abu (kontak) — seperti tabel aplikasi
      const run = (t, b, sz, c) => `<r><rPr>${b ? '<b/>' : ''}<sz val="${sz}"/><color rgb="FF${c}"/><rFont val="Calibri"/></rPr><t xml:space="preserve">${x(t)}</t></r>`;
      const cell2 = (ref, v, s, warna) => {
        const i = v.indexOf('\n');
        return `<c r="${ref}" t="inlineStr" s="${s}"><is>${run(v.slice(0, i), true, 10, warna || '0F172A')}${run(v.slice(i), false, 8.5, '64748B')}</is></c>`;
      };
      const baris = (isi, ht) => { rows.push(`<row r="${r}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${isi}</row>`); r++; };
      const penuh = (teks, s, ht, sKanan, teksKanan) => {
        // Teks kanan (sub-judul) menempati 3 kolom terakhir agar tidak terpotong
        const ka = teksKanan && n > 4 ? n - 3 : (teksKanan && n > 1 ? n - 1 : n);
        let isi = cell('A' + r, teks, s);
        for (let i = 1; i < n; i++) isi += cell(colName(i) + r, i === ka && teksKanan ? teksKanan : '', i >= ka && sKanan !== undefined ? sKanan : s);
        if (teksKanan && ka < n) { if (ka > 1) merges.push(`A${r}:${colName(ka - 1)}${r}`); if (ka < n - 1) merges.push(`${colName(ka)}${r}:${last}${r}`); } else merges.push(`A${r}:${last}${r}`);
        baris(isi, ht);
      };
      // Kop
      penuh(`${umum.app || 'FinSight'} — ${sh.judul || sh.name}`, st.judul, 30, st.judulR, sh.sub || 'LAPORAN');
      penuh(umum.ins || 'Monitoring Portofolio Kredit & Penagihan', st.ins, 18);
      penuh(`Filter: ${sh.filter || 'Semua data'}`, st.meta, 16);
      if (umum.dicetak) penuh(`Dicetak: ${umum.dicetak}`, st.meta, 16);
      // Ringkasan (label di atas nilai, 2 kolom per kotak)
      const ring = (sh.ringkasan || []).slice(0, Math.max(1, Math.floor(n / 2)));
      if (ring.length) {
        r++;
        let l = '', v = '';
        const lebar = Math.max(1, Math.floor(n / ring.length));
        for (let i = 0; i < n; i++) {
          const k = Math.min(ring.length - 1, Math.floor(i / lebar)), awal = k * lebar === i;
          l += cell(colName(i) + r, awal ? ring[k][0] : '', st.kpL);
          v += cell(colName(i) + (r + 1), awal ? ring[k][1] : '', st.kpV);
        }
        ring.forEach((_, k) => { const a = k * lebar, b = k === ring.length - 1 ? n - 1 : (k + 1) * lebar - 1; if (b > a) { merges.push(`${colName(a)}${r}:${colName(b)}${r}`); merges.push(`${colName(a)}${r + 1}:${colName(b)}${r + 1}`); } });
        baris(l, 18); baris(v, 24);
      }
      r++;
      // Header tabel
      const hdr = r;
      baris(cols.map((c, i) => cell(colName(i) + r, c.h, st.hdr(c.a))).join(''), 30);
      // Data
      sh.rows.forEach((row, ri) => {
        const zebra = ri % 2 ? 'FBFAFE' : null;
        let tinggi = 0;
        const isi = cols.map((c, i) => {
          let v = row[i], kls = '';
          if (v && typeof v === 'object' && !Array.isArray(v)) { kls = v.c || ''; v = v.l2 ? [v.v, v.l2].filter((z) => z !== '' && z !== undefined && z !== null).join('\n') : v.v; }
          const ref = colName(i) + r;
          const dasar = { bd: 'sel', bg: zebra, ah: AH[c.a], sz: 10 };
          if (/neg/.test(kls)) Object.assign(dasar, { c: 'BE123C', b: true }); else if (/\bb\b/.test(kls)) dasar.b = true;
          if (/mut/.test(kls)) dasar.c = '94A3B8';
          if (typeof v === 'string' && v.indexOf('\n') > -1) { dasar.wrap = true; tinggi = Math.max(tinggi, 30); }
          switch (c.t) {
            case 'no': return cell(ref, v, G.s(Object.assign(dasar, { c: '94A3B8', ah: 'center' })));
            case 'ent': {
              if (typeof v === 'string' && v.indexOf('\n') > 0) return cell2(ref, v, G.s(Object.assign(dasar, { wrap: true, av: 'center' })), dasar.c);
              return cell(ref, v, G.s(Object.assign(dasar, { wrap: true, b: !kls })));
            }
            case 'rek': return cell(ref, v === undefined ? '' : String(v), G.s(Object.assign(dasar, { c: dasar.c || '475569', fmt: '@' })));
            case 'rp': case 'num': case 'pct':
              return cell(ref, typeof v === 'number' ? v : v, G.s(Object.assign(dasar, { fmt: typeof v === 'number' ? c.t : undefined, ah: 'right' })));
            case 'tgl': {
              dasar.ind = 1;
              if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
                const serial = (Date.UTC(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000;
                return cell(ref, serial, G.s(Object.assign(dasar, { fmt: 'tgl' })));
              }
              return cell(ref, v, G.s(dasar));
            }
            case 'prod': {
              if (!v) return cell(ref, '', G.s(dasar));
              const w = umum.warnaProd ? umum.warnaProd(v) : '64748B';
              return cell(ref, v, G.s(Object.assign(dasar, { b: true, c: w, bg: umum.muda ? umum.muda(w) : 'F1F5F9', ah: 'center' })));
            }
            case 'kol': {
              if (v === '' || v === null || v === undefined) return cell(ref, '', G.s(dasar));
              const k = +String(v).replace(/\D/g, '') || 1, w = (umum.KOLW || {})[k] || ['334155', 'F1F5F9'];
              return cell(ref, 'Kol. ' + k, G.s(Object.assign(dasar, { b: true, c: w[0], bg: w[1], ah: 'center' })));
            }
            case 'status': {
              const w = (umum.STW || {})[v] || ['475569', 'F1F5F9'];
              return cell(ref, v, G.s(Object.assign(dasar, v ? { b: true, c: w[0], bg: w[1], ah: 'center' } : {})));
            }
            case 'risk': {          // v1.5: indikator risiko penagihan berwarna
              if (!v) return cell(ref, '', G.s(dasar));
              const blk = /blokir/i.test(v);
              return cell(ref, v, G.s(Object.assign(dasar, { b: true, wrap: true, c: blk ? 'BE123C' : 'B45309', bg: blk ? 'FFE4E6' : 'FEF3C7' })));
            }
            default: return cell(ref, v, G.s(dasar));
          }
        }).join('');
        baris(isi, tinggi || 20);
      });
      const akhirData = r - 1;
      // Total
      if (cols.some((c) => c.sum) && sh.rows.length) {
        const iLbl = cols.findIndex((c) => !c.sum && c.t !== 'no');
        const isi = cols.map((c, i) => {
          const ref = colName(i) + r;
          if (c.sum) {
            const tot = sh.rows.reduce((a, row) => { let v = row[i]; if (v && typeof v === 'object') v = v.v; return a + (typeof v === 'number' && isFinite(v) ? v : 0); }, 0);
            return `<c r="${ref}" s="${G.s({ b: true, bd: 'tot', bg: 'F8F7FC', fmt: c.t === 'rp' ? 'rp' : 'num', ah: 'right' })}"><f>SUBTOTAL(9,${colName(i)}${hdr + 1}:${colName(i)}${akhirData})</f><v>${tot}</v></c>`;
          }
          return cell(ref, i === iLbl ? `Total (${sh.rows.length.toLocaleString('id-ID')} ${sh.satuan || 'baris'})` : '', G.s({ b: true, bd: 'tot', bg: 'F8F7FC' }));
        }).join('');
        baris(isi, 22);
      }
      const lebarKol = '<cols>' + cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 14}" customWidth="1"/>`).join('') + '</cols>';
      const pane = `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${hdr}" topLeftCell="A${hdr + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
      const lanskap = n > 6;
      defNames.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${si}">'${x(String(sh.name).slice(0, 31).replace(/[\\\/\?\*\[\]:]/g, ' ')).replace(/'/g, "''")}'!$${hdr}:$${hdr}</definedName>`);
      if (sh.rows.length) defNames.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${si}" hidden="1">'${x(String(sh.name).slice(0, 31).replace(/[\\\/\?\*\[\]:]/g, ' ')).replace(/'/g, "''")}'!$A$${hdr}:$${last}$${akhirData}</definedName>`);
      files.push({ name: `xl/worksheets/sheet${si + 1}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>${pane}<sheetFormatPr defaultRowHeight="15"/>${lebarKol}<sheetData>${rows.join('')}</sheetData>${sh.rows.length ? `<autoFilter ref="A${hdr}:${last}${akhirData}"/>` : ''}${merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${lanskap ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8${x(umum.app || 'FinSight')} — ${x(sh.judul || sh.name)}&amp;R&amp;8Halaman &amp;P dari &amp;N</oddFooter></headerFooter></worksheet>` });
    });
    const head = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${wbSheets}</sheets>${defNames.length ? `<definedNames>${defNames.join('')}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: G.xml() }
    ];
    return zip(head.concat(files));
  }

  return { build };
})();
