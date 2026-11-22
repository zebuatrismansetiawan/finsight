/* ==========================================================================
   FinSight — analisa.js : halaman Analisa (v1.3)
   Format surat Word (.docx) dari Super Admin + data import massal (.xlsx/.csv)
   → pratinjau surat & unduh Word (per surat, ZIP, atau digabung 1 file).
   ========================================================================== */
'use strict';

const AN = { list: null, aver: '', ubah: false, tpl: '', file: {}, data: {}, sel: new Set(), f: { q: '', hal: 1, per: 10 }, mode: 'format', baris: '', muat: false, zoom: 0 };

Pages.analisa = {
  judul: 'Analisa',
  t() { return (AN.list || []).find((x) => x.id === AN.tpl) || null; },
  rows() {
    const L = AN.data[AN.tpl] || [];
    const q = AN.f.q.trim().toLowerCase();
    return q ? L.filter((r) => Object.values(r.d).join(' ').toLowerCase().includes(q)) : L;
  },
  render() {
    const { esc, ic } = U;
    const admin = S.me.peran === 'Admin';
    const t = this.t();
    const actions = t ? `<button class="btn btn-secondary" data-act="tplImport">${ic('xls', 17, 'pos')} Template import (.xlsx)</button>
      <button class="btn btn-primary" data-act="import">${ic('upload', 17)} Import data</button>` : '';
    let h = UI.head({ crumb: ['Portofolio Kredit', 'Analisa'], title: 'Analisa', sub: 'Format surat Word, import data massal, pratinjau, dan unduh surat siap cetak.', actions });
    if (!AN.list) return h + '<div class="card pad"><span class="spin"></span> Memuat format surat…</div>';
    if (!AN.list.length) {
      return h + `<div class="card an-empty">${App.kosong('pdf', 'Belum ada format surat', admin ? 'Unggah format surat Word (.docx) berisi penanda seperti <code>{{nama_debitur}}</code>, atau mulai dari contoh Memo Analisa Kredit lalu sesuaikan di Word.' : 'Format surat belum disiapkan. Hubungi Super Admin.')}
        ${admin ? `<div class="row-g c"><button class="btn btn-primary" data-act="unggah">${ic('upload', 16)} Unggah format Word (.docx)</button><button class="btn btn-secondary" data-act="contoh">${ic('spark', 16)} Pakai contoh format</button></div>` : ''}</div>` + this.panduan(admin);
    }
    const nPen = t ? t.penanda.length : 0;
    h += `<div class="card an-tpl"><div class="an-tpl-h"><span class="kpi-ic soft" style="--c:#2563EB">${ic('pdf', 20)}</span>
        <div class="grow"><small class="muted">Format surat</small>
          ${AN.list.length > 1 ? `<select class="sel" data-act="pilihTpl" aria-label="Pilih format surat">${AN.list.map((x) => `<option value="${esc(x.id)}" ${x.id === AN.tpl ? 'selected' : ''}>${esc(x.nama)}${x.aktif ? '' : ' (nonaktif)'}</option>`).join('')}</select>` : `<b class="an-tpl-n">${esc(t.nama)}</b>`}
          <small class="muted">${esc(t.namaFile || '')} • ${U.num(nPen)} penanda • diperbarui ${t.diubah ? U.tglJam(t.diubah) : '—'}${t.oleh ? ' oleh ' + esc(t.oleh.replace(/^\d+\s/, '')) : ''}</small></div>
        <div class="row-g">
          <button class="btn btn-secondary btn-sm" data-act="unduhFormat">${ic('download', 15)} Unduh format</button>
          ${admin ? `<button class="btn btn-secondary btn-sm" data-act="ganti">${ic('upload', 15)} Ganti file</button><button class="btn btn-secondary btn-sm" data-act="unggah">${ic('plus', 15)} Format baru</button><button class="btn-icon sm" data-act="hapusTpl" title="Hapus format">${ic('trash', 15)}</button>` : ''}
        </div></div>
      <div class="an-pen">${t.penanda.map((f) => `<span class="an-pn" title="Penanda {{${esc(f)}}}">{{${esc(f)}}}</span>`).join('') || '<span class="muted">Tidak ada penanda {{…}} di format ini.</span>'}</div></div>`;
    h += `<div class="an-grid"><section class="card tbl-card" id="anData"></section>
      <section class="card an-prev-c"><div class="an-prev-h"><b>Pratinjau surat</b>
        <div class="seg"><button class="${AN.mode === 'format' ? 'on' : ''}" data-act="mode" data-v="format">Format</button><button class="${AN.mode === 'data' ? 'on' : ''}" data-act="mode" data-v="data">Data terpilih</button></div></div>
        <div class="an-prev-i" id="anInfo"></div>
        <div class="an-prev" id="anPrev"><div class="an-load"><span class="spin"></span> Menyiapkan pratinjau…</div></div>
        <div class="an-prev-f"><span class="muted sm">${ic('info', 13)} Pratinjau mendekati tampilan Word; hasil unduhan memakai format asli.</span>
          <button class="btn btn-primary btn-sm" data-act="unduhSatu" id="anUnduh" ${AN.baris ? '' : 'disabled'}>${ic('download', 15)} Unduh Word</button></div></section></div>`;
    return h + this.panduan(admin);
  },
  panduan(admin) {
    const { ic } = U;
    return `<details class="card an-help"><summary>${ic('info', 16)} Cara membuat & memakai format surat</summary><div class="an-help-b">
      <ol><li>${admin ? 'Buat surat di Microsoft Word seperti biasa (kop, logo, tabel, tanda tangan).' : 'Super Admin menyiapkan format surat Word.'} Bagian yang berubah tiap surat ditulis sebagai <b>penanda</b>, misalnya <code>{{nama_debitur}}</code>, <code>{{plafon:rp}}</code>, <code>{{tanggal_surat:tgl}}</code>.</li>
      <li>Format tambahan: ${Object.keys(Surat.FORMAT).map((k) => `<code>:${k}</code> ${U.esc(Surat.FORMAT[k])}`).join(', ')}.</li>
      <li>Unduh <b>Template import (.xlsx)</b> — kolomnya otomatis sama dengan penanda. Isi 1 baris per surat, lalu <b>Import data</b>.</li>
      <li>Pilih data → lihat pratinjau → <b>Unduh Word</b> per surat, <b>ZIP</b> (1 file per surat), atau <b>gabung 1 file</b> untuk dicetak sekaligus.</li></ol></div></details>`;
  },
  async mount(root) {
    pasangAksi(root, this);
    if (!AN.list && !AN.muat) { await this.muatList(); return; }
    if (this.t()) { this.segarData(); if (!AN.data[AN.tpl]) this.muatData(); this.pratinjau(); }
    if (!AN.muat && Date.now() - (AN.ts || 0) > 60000) this.muatList();      // segarkan bila data dari pengguna lain berubah
  },
  async muatList(paksa) {
    AN.muat = true;
    const r = await Api.call('analisa.template.list', {});
    AN.muat = false; AN.ts = Date.now();
    const lama = AN.list ? JSON.stringify(AN.list) + AN.aver : null;
    if (!r.success) { U.toast(r.message, 'err'); if (!AN.list) AN.list = []; }
    else {
      AN.list = r.data.templates; AN.ubah = r.data.bolehUbah;
      if (paksa || AN.aver !== r.data.aver) AN.data = {};
      AN.aver = r.data.aver;
      if (!AN.list.find((x) => x.id === AN.tpl)) { AN.tpl = (AN.list.find((x) => x.aktif) || AN.list[0] || {}).id || ''; AN.sel.clear(); AN.baris = ''; }
    }
    if (App.halaman === 'analisa' && (paksa || lama !== JSON.stringify(AN.list) + AN.aver)) App.render({ tetap: true });
  },
  async muatData() {
    const id = AN.tpl;
    const r = await Api.call('analisa.data.list', { tpl: id });
    if (!r.success) return U.toast(r.message, 'err');
    AN.data[id] = r.data.rows;
    if (AN.tpl === id && App.halaman === 'analisa') { this.segarData(); if (AN.mode === 'data') this.pratinjau(); }
  },
  /** Bytes format surat (cache per versi). */
  async bytes(t) {
    t = t || this.t();
    const c = AN.file[t.id];
    if (c && c.diubah === t.diubah) return c.bytes;
    const r = await Api.call('analisa.template.ambil', { id: t.id }, { timeout: 90000 });
    if (!r.success) throw new Error(r.message);
    const b = Surat.b64ke(r.data.base64);
    AN.file[t.id] = { diubah: r.data.diubah, bytes: b };
    return b;
  },
  /** Kolom ringkas tabel: utamakan nomor surat, nama debitur, plafon/nilai, tanggal. */
  kolomTampil(t, n) {
    const urut = [/^(nomor|no)_?surat$|^nomor$/, /^nama_(debitur|nasabah|pemohon|peserta)$|^nama$/, /plafon|nilai|jumlah|nominal/, /tanggal|tgl/, /cif|rek/];
    const out = [];
    urut.forEach((re) => { const f = t.penanda.find((x) => re.test(x) && !out.includes(x)); if (f) out.push(f); });
    t.penanda.forEach((x) => { if (!out.includes(x)) out.push(x); });
    return out.slice(0, n || 3);
  },
  segarData() {
    const { esc, ic } = U;
    const el = document.getElementById('anData');
    const t = this.t();
    if (!el || !t) return;
    const semua = AN.data[AN.tpl];
    if (!semua) { el.innerHTML = '<div class="pad"><span class="spin"></span> Memuat data surat…</div>'; return; }
    const L = this.rows(), rows = UI.halaman(L, AN.f), kol = this.kolomTampil(t);
    const allSel = rows.length && rows.every((r) => AN.sel.has(r.id));
    el.innerHTML = `<div class="an-data-h"><div><b>Data surat</b> <span class="tag">${U.num(semua.length)}</span></div>
        <div class="inp-ic an-q">${ic('search', 15)}<input type="search" data-act="q" placeholder="Cari data…" value="${esc(AN.f.q)}" aria-label="Cari data surat"></div></div>
      <div class="bbar"><label class="chk"><input type="checkbox" data-act="selPage" ${allSel ? 'checked' : ''}><span>Pilih halaman ini</span></label>
        ${L.length > rows.length ? `<button class="btn-link sm" data-act="selAll">Pilih semua ${U.num(L.length)}</button>` : ''}
        ${AN.sel.size ? `<button class="btn-link sm" data-act="selNone">Batal pilih (${U.num(AN.sel.size)})</button>` : ''}
        <span class="sp"></span>
        <button class="btn btn-sm btn-secondary" data-act="zipSel" ${AN.sel.size ? '' : 'disabled'} title="1 file Word per surat dalam ZIP">${ic('download', 14)} Word (ZIP)</button>
        <button class="btn btn-sm btn-secondary" data-act="gabungSel" ${AN.sel.size ? '' : 'disabled'} title="Semua surat terpilih dalam 1 file Word">${ic('print', 14)} Gabung 1 file</button>
        <button class="btn btn-sm btn-danger-soft" data-act="hapusSel" ${AN.sel.size ? '' : 'disabled'}>${ic('trash', 14)}</button></div>
      ${L.length ? `<div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th class="c w1"><span class="sr">Pilih</span></th><th class="c w1">No</th>${kol.map((k) => `<th>${esc(k.replace(/_/g, ' '))}</th>`).join('')}<th class="c">Aksi</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr class="${AN.baris === r.id ? 'row-sel' : ''}" title="Diimpor ${r.t ? esc(U.tglJam(r.t)) : ''}${r.o ? ' oleh ' + esc(r.o.replace(/^\d+\s/, '')) : ''}"><td class="c"><input type="checkbox" data-act="sel" data-id="${esc(r.id)}" ${AN.sel.has(r.id) ? 'checked' : ''} aria-label="Pilih"></td>
          <td class="c muted tnum">${(AN.f.hal - 1) * AN.f.per + i + 1}</td>
          ${kol.map((k, j) => `<td>${j === 0 ? `<button class="lnk" data-act="lihat" data-id="${esc(r.id)}"><b>${esc(this.tampil(r.d[k]))}</b></button>` : esc(this.tampil(r.d[k]))}</td>`).join('')}
          <td class="c"><div class="acts"><button class="btn-icon sm" data-act="lihat" data-id="${esc(r.id)}" title="Pratinjau">${ic('eye', 15)}</button><button class="btn-icon sm pos" data-act="unduhBaris" data-id="${esc(r.id)}" title="Unduh Word">${ic('download', 15)}</button></div></td></tr>`).join('')}
        </tbody></table></div>${UI.pager(L.length, AN.f.hal, AN.f.per)}`
    : App.kosong('upload', semua.length ? 'Tidak ada data yang cocok' : 'Belum ada data surat', semua.length ? 'Ubah kata kunci pencarian.' : 'Unduh template import, isi datanya, lalu klik Import data.')}`;
  },
  tampil(v) { if (v === undefined || v === null || v === '') return '—'; return typeof v === 'number' ? v.toLocaleString('id-ID') : String(v).slice(0, 60); },
  async pratinjau() {
    const t = this.t(), el = document.getElementById('anPrev'), info = document.getElementById('anInfo');
    if (!t || !el) return;
    const r = AN.baris ? (AN.data[AN.tpl] || []).find((x) => x.id === AN.baris) : null;
    if (info) info.innerHTML = AN.mode === 'format' ? `${U.ic('info', 13)} Penanda <mark class="sr-pn">{{…}}</mark> akan diganti data saat surat diunduh.`
      : r ? `${U.ic('check', 13)} Data: <b>${U.esc(this.tampil(r.d[t.penanda[0]]))}</b> • kolom kosong ditandai <mark class="sr-pn">kuning</mark>` : `${U.ic('info', 13)} Pilih baris data (ikon ${U.ic('eye', 12)}) untuk melihat surat terisi.`;
    const tok = (this._tok = (this._tok || 0) + 1);
    try {
      const b = await this.bytes(t);
      const hasil = await Surat.pratinjau(b, r ? r.d : null, AN.mode === 'data' && r ? 'data' : 'format');
      if (tok !== this._tok || !document.getElementById('anPrev')) return;
      el.innerHTML = `<div class="an-pages">${hasil.html}</div>`;
      const pas = () => { const w = el.clientWidth - 24, pw = hasil.lebarPt * 96 / 72; const z = Math.min(1, w / pw); el.querySelector('.an-pages').style.zoom = String(Math.max(0.3, z)); };
      pas(); this._pas = pas;
    } catch (e) {
      if (tok === this._tok) el.innerHTML = `<div class="alert alert-neg">${U.ic('alertc', 16)}<div>Pratinjau gagal: ${U.esc(e.message)}</div></div>`;
    }
  },
  namaFile(r) {
    const t = this.t();
    const k = t.penanda.find((f) => /nomor|no_surat/.test(f) && r.d[f]) ;
    const n = t.penanda.find((f) => /nama/.test(f) && r.d[f]);
    return [t.nama, n ? r.d[n] : '', k ? String(r.d[k]).replace(/[\/\\]/g, '-') : r.id].filter(Boolean).join(' - ');
  },
  async unduhBaris(id, btn) {
    const t = this.t(), r = (AN.data[AN.tpl] || []).find((x) => x.id === id);
    if (!r) return;
    const asli = btn && btn.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }
    try {
      const blob = await Surat.buatDocx(await this.bytes(t), r.d);
      U.unduh(blob, this.namaFile(r) + '.docx');
      Api.call('analisa.catat', { tpl: t.id, jenis: 'docx', jumlah: 1 });
    } catch (e) { U.toast('Gagal membuat surat: ' + e.message, 'err'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = asli; } }
  },
  async massal(jenis, btn) {
    const t = this.t(), pilih = (AN.data[AN.tpl] || []).filter((r) => AN.sel.has(r.id));
    if (!pilih.length) return;
    if (pilih.length > 500) return U.toast('Maksimal 500 surat sekali unduh. Kurangi pilihan.', 'warn');
    const asli = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Membuat…';
    try {
      const b = await this.bytes(t);
      if (jenis === 'gabung') {
        const blob = await Surat.gabungDocx(b, pilih.map((r) => r.d));
        U.unduh(blob, t.nama + ' - ' + pilih.length + ' surat.docx');
      } else {
        const item = [];
        for (let i = 0; i < pilih.length; i++) {
          item.push({ nama: this.namaFile(pilih[i]), blob: await Surat.buatDocx(b, pilih[i].d) });
          if (i % 20 === 19) btn.innerHTML = `<span class="spin"></span> ${i + 1}/${pilih.length}`;
        }
        U.unduh(await Surat.zipSurat(item), t.nama + ' - ' + pilih.length + ' surat.zip');
      }
      Api.call('analisa.catat', { tpl: t.id, jenis: jenis === 'gabung' ? 'gabung' : 'zip', jumlah: pilih.length });
      U.toast(`${U.num(pilih.length)} surat dibuat.`, 'ok');
    } catch (e) { U.toast('Gagal membuat surat: ' + e.message, 'err'); }
    finally { btn.disabled = false; btn.innerHTML = asli; }
  },
  /** Dialog unggah format (baru / ganti file). */
  unggah(ganti) {
    const { esc, ic } = U;
    const t = ganti ? this.t() : null;
    const m = U.modal({
      title: ganti ? 'Ganti file format surat' : 'Unggah format surat Word', size: 'md',
      body: `<div class="form-g">
        <label class="fld"><span>Nama format surat</span><input id="anNama" maxlength="60" value="${esc(t ? t.nama : '')}" placeholder="mis. Memo Analisa Kredit KUR"></label>
        <label class="fld"><span>File Word (.docx)</span><input type="file" id="anFile" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><small class="muted">Maks 5 MB. Simpan dari Word sebagai "Word Document (.docx)".</small></label>
        ${t ? `<label class="chk"><input type="checkbox" id="anAktif" ${t.aktif ? 'checked' : ''}><span>Aktif (bisa dipakai pengguna)</span></label>` : ''}
        <div id="anCek" class="muted sm"></div></div>`,
      footer: `<button class="btn btn-secondary" data-x="0">Batal</button><button class="btn btn-primary" data-x="1">${ic('check', 16)} Simpan format</button>`
    });
    let file = null, pen = null;
    m.el.querySelector('#anFile').onchange = async (e) => {
      file = e.target.files[0]; pen = null;
      const cek = m.el.querySelector('#anCek');
      if (!file) { cek.innerHTML = ''; return; }
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error('File lebih dari 5 MB.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        const zipM = await Surat.unzip(bytes);
        if (!zipM.has('word/document.xml')) throw new Error('Bukan dokumen Word (.docx).');
        pen = Surat.daftarPenanda(zipM);
        file._bytes = bytes;
        if (!m.el.querySelector('#anNama').value.trim()) m.el.querySelector('#anNama').value = file.name.replace(/\.docx$/i, '').slice(0, 60);
        cek.innerHTML = pen.length ? `${ic('check', 13, 'pos')} ${pen.length} penanda ditemukan: ${pen.map((p) => `<code>${esc(p.teks)}</code>`).join(' ')}` : `<span class="warn">${ic('alertc', 13)} Tidak ada penanda {{…}}. Surat akan sama untuk semua data.</span>`;
      } catch (err) { file = null; cek.innerHTML = `<span class="neg">${ic('alertc', 13)} ${esc(err.message)}</span>`; }
    };
    m.el.querySelectorAll('[data-x]').forEach((b) => b.onclick = async () => {
      if (b.dataset.x === '0') return m.close();
      const nama = m.el.querySelector('#anNama').value.trim();
      if (nama.length < 2) return U.toast('Isi nama format surat.', 'warn');
      if (!t && !file) return U.toast('Pilih file Word (.docx).', 'warn');
      b.disabled = true; b.innerHTML = '<span class="spin"></span> Mengunggah…';
      const d = { id: t ? t.id : undefined, nama, aktif: t ? m.el.querySelector('#anAktif').checked : true };
      if (file) Object.assign(d, { namaFile: file.name, base64: await Surat.keB64(file._bytes), penanda: pen.map((p) => p.field) });
      const r = await Api.call('analisa.template.simpan', d, { timeout: 120000 });
      b.disabled = false; b.innerHTML = `${ic('check', 16)} Simpan format`;
      if (!r.success) return U.toast(r.message, 'err');
      m.close(); U.toast(r.message, 'ok');
      AN.list = r.data.templates; AN.tpl = r.data.id; delete AN.file[r.data.id]; AN.mode = 'format';
      App.render({ tetap: true });
    });
  },
  /** Dialog import data massal. */
  importDialog() {
    const { esc, ic } = U;
    const t = this.t();
    const m = U.modal({
      title: 'Import data surat — ' + t.nama, size: 'lg',
      body: `<div class="form-g">
        <label class="fld"><span>File data (.xlsx atau .csv)</span><input type="file" id="imFile" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"><small class="muted">Gunakan <a href="#" id="imTpl">template import</a> — judul kolom = penanda format surat. 1 baris = 1 surat.</small></label>
        <div id="imHasil"></div>
        <div class="opts row" id="imMode" hidden>
          <label class="opt on"><input type="radio" name="imMode" value="tambah" checked>${ic('plus', 18)}<span><b>Tambahkan</b><small>Data baru ditambahkan ke data yang sudah ada.</small></span></label>
          <label class="opt"><input type="radio" name="imMode" value="ganti">${ic('refresh', 18)}<span><b>Ganti semua</b><small>Data lama format ini dihapus, diganti isi file.</small></span></label></div></div>`,
      footer: `<button class="btn btn-secondary" data-x="0">Batal</button><button class="btn btn-primary" data-x="1" disabled>${ic('upload', 16)} Import</button>`
    });
    let hasil = null;
    const ok = m.el.querySelector('[data-x="1"]');
    m.el.querySelector('#imTpl').onclick = (e) => { e.preventDefault(); this.act.tplImport(); };
    m.el.querySelectorAll('input[name=imMode]').forEach((r) => r.onchange = () => m.el.querySelectorAll('#imMode .opt').forEach((o) => o.classList.toggle('on', o.querySelector('input').checked)));
    m.el.querySelector('#imFile').onchange = async (e) => {
      const f = e.target.files[0], box = m.el.querySelector('#imHasil');
      hasil = null; ok.disabled = true; m.el.querySelector('#imMode').hidden = true;
      if (!f) { box.innerHTML = ''; return; }
      box.innerHTML = '<span class="spin"></span> Membaca file…';
      try {
        hasil = await Surat.bacaImport(f, t.penanda);
        if (!hasil.rows.length) throw new Error('Tidak ada baris data di bawah judul kolom.');
        const kol = this.kolomTampil({ penanda: hasil.cocok }, 5);
        box.innerHTML = `<div class="im-ring"><span class="pill pill-pos">${ic('check', 12)} ${U.num(hasil.baris)} baris data</span><span class="pill pill-pos">${hasil.cocok.length} kolom cocok</span>
            ${hasil.hilang.length ? `<span class="pill pill-warn" title="${esc(hasil.hilang.join(', '))}">${hasil.hilang.length} penanda tanpa kolom</span>` : ''}${hasil.lebih.length ? `<span class="pill pill-grey" title="${esc(hasil.lebih.join(', '))}">${hasil.lebih.length} kolom lain diabaikan</span>` : ''}</div>
          ${hasil.hilang.length ? `<p class="muted sm">${ic('info', 12)} Penanda tanpa kolom (akan kosong di surat): ${hasil.hilang.map((x) => `<code>${esc(x)}</code>`).join(' ')}</p>` : ''}
          <div class="tbl-wrap im-prev"><table class="tbl"><thead><tr><th class="c">#</th>${kol.map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>
          ${hasil.rows.slice(0, 5).map((r, i) => `<tr><td class="c muted">${i + 1}</td>${kol.map((k) => `<td>${esc(this.tampil(r[k]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          ${hasil.baris > 5 ? `<p class="muted sm">… dan ${U.num(hasil.baris - 5)} baris lainnya.</p>` : ''}`;
        m.el.querySelector('#imMode').hidden = false;
        ok.disabled = false;
      } catch (err) { box.innerHTML = `<div class="alert alert-neg">${ic('alertc', 16)}<div>${esc(err.message)}</div></div>`; }
    };
    ok.onclick = async () => {
      if (!hasil) return;
      const mode = m.el.querySelector('input[name=imMode]:checked').value;
      if (mode === 'ganti' && !(await U.konfirmasi({ title: 'Ganti semua data?', body: `Semua data surat format <b>${esc(t.nama)}</b> (${U.num((AN.data[AN.tpl] || []).length)} baris) akan diganti isi file ini.`, ok: 'Ya, ganti', bahaya: true }))) return;
      ok.disabled = true;
      const CH = 500, batch = 'IMP-' + new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
      let total = 0;
      for (let i = 0; i < hasil.rows.length; i += CH) {
        ok.innerHTML = `<span class="spin"></span> ${U.num(Math.min(i + CH, hasil.rows.length))}/${U.num(hasil.rows.length)}`;
        const r = await Api.call('analisa.data.impor', { tpl: t.id, rows: hasil.rows.slice(i, i + CH), mode: i === 0 ? mode : 'tambah', batch }, { timeout: 120000 });
        if (!r.success) { ok.disabled = false; ok.innerHTML = `${ic('upload', 16)} Import`; return U.toast(r.message, 'err'); }
        total += r.data.ditambah;
      }
      m.close();
      U.toast(`${U.num(total)} data surat diimpor.`, 'ok');
      AN.sel.clear(); AN.f.hal = 1;
      await this.muatData();
    };
  },
  act: {
    pilihTpl: (el) => { AN.tpl = el.value; AN.sel.clear(); AN.baris = ''; AN.mode = 'format'; App.render({ tetap: true }); },
    mode: (el) => { AN.mode = el.dataset.v; document.querySelectorAll('.an-prev-h .seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === AN.mode)); Pages.analisa.pratinjau(); },
    q: (el) => { AN.f.q = el.value; AN.f.hal = 1; Pages.analisa.segarData(); const i = document.querySelector('.an-q input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
    hal: (el) => { AN.f.hal = +el.dataset.v; Pages.analisa.segarData(); },
    per: (el) => { AN.f.per = +el.value; AN.f.hal = 1; Pages.analisa.segarData(); },
    sel: (el) => { el.checked ? AN.sel.add(el.dataset.id) : AN.sel.delete(el.dataset.id); Pages.analisa.segarData(); },
    selPage: (el) => { UI.halaman(Pages.analisa.rows(), AN.f).forEach((r) => (el.checked ? AN.sel.add(r.id) : AN.sel.delete(r.id))); Pages.analisa.segarData(); },
    selAll: () => { Pages.analisa.rows().forEach((r) => AN.sel.add(r.id)); Pages.analisa.segarData(); },
    selNone: () => { AN.sel.clear(); Pages.analisa.segarData(); },
    lihat: (el) => {
      AN.baris = el.dataset.id; AN.mode = 'data';
      document.querySelectorAll('.an-prev-h .seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'data'));
      const u = document.getElementById('anUnduh'); if (u) u.disabled = false;
      Pages.analisa.segarData(); Pages.analisa.pratinjau();
      if (window.innerWidth < 1100) { const p = document.querySelector('.an-prev-c'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    },
    unduhSatu: (el) => { if (AN.baris) Pages.analisa.unduhBaris(AN.baris, el); },
    unduhBaris: (el) => Pages.analisa.unduhBaris(el.dataset.id, el),
    zipSel: (el) => Pages.analisa.massal('zip', el),
    gabungSel: (el) => Pages.analisa.massal('gabung', el),
    hapusSel: async () => {
      const n = AN.sel.size;
      if (!n || !(await U.konfirmasi({ title: 'Hapus data surat?', body: `${U.num(n)} data surat terpilih akan dihapus dari database.`, ok: 'Hapus', bahaya: true }))) return;
      const r = await Api.call('analisa.data.hapus', { tpl: AN.tpl, ids: Array.from(AN.sel) });
      if (!r.success) return U.toast(r.message, 'err');
      if (AN.sel.has(AN.baris)) AN.baris = '';
      U.toast(r.message, 'ok'); AN.sel.clear();
      await Pages.analisa.muatData();
    },
    import: () => Pages.analisa.importDialog(),
    tplImport: async () => {
      const t = Pages.analisa.t();
      try {
        const fmt = {};
        try { (Surat.daftarPenanda(await Surat.unzip(await Pages.analisa.bytes(t)))).forEach((p) => { if (p.fmt) fmt[p.field] = p.fmt; }); } catch (e) { /* format opsional */ }
        U.unduh(await Surat.templateImport(t.nama, t.penanda, fmt), 'Template import - ' + t.nama + '.xlsx');
      } catch (e) { U.toast(e.message, 'err'); }
    },
    unduhFormat: async (el) => {
      const t = Pages.analisa.t();
      try { U.unduh(new Blob([await Pages.analisa.bytes(t)], { type: Surat.MIME_DOCX }), t.namaFile || t.nama + '.docx'); }
      catch (e) { U.toast(e.message, 'err'); }
    },
    unggah: () => Pages.analisa.unggah(false),
    ganti: () => Pages.analisa.unggah(true),
    contoh: async (el) => {
      el.disabled = true; el.innerHTML = '<span class="spin"></span> Menyiapkan…';
      const st = S.setting || {};
      const blob = await Surat.contohDocx({ institusi: st.NAMA_INSTITUSI || st.NAMA_APLIKASI, cabang: st.NAMA_CABANG });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const pen = Surat.daftarPenanda(await Surat.unzip(bytes)).map((p) => p.field);
      const r = await Api.call('analisa.template.simpan', { nama: 'Memo Analisa Kredit', namaFile: 'Memo Analisa Kredit.docx', base64: await Surat.keB64(bytes), penanda: pen }, { timeout: 120000 });
      if (!r.success) { el.disabled = false; return U.toast(r.message, 'err'); }
      U.toast('Contoh format "Memo Analisa Kredit" siap. Unduh, sesuaikan di Word, lalu Ganti file.', 'ok', 6000);
      AN.list = r.data.templates; AN.tpl = r.data.id; App.render({ tetap: true });
    },
    hapusTpl: async () => {
      const t = Pages.analisa.t(), n = (AN.data[AN.tpl] || []).length;
      if (!(await U.konfirmasi({ title: 'Hapus format surat?', body: `Format <b>${U.esc(t.nama)}</b> beserta <b>${U.num(n)}</b> data suratnya akan dihapus. File Word dipindah ke Sampah Google Drive.`, ok: 'Hapus', bahaya: true }))) return;
      const r = await Api.call('analisa.template.hapus', { id: t.id });
      if (!r.success) return U.toast(r.message, 'err');
      U.toast(r.message, 'ok'); delete AN.data[t.id]; delete AN.file[t.id]; AN.sel.clear(); AN.baris = '';
      await Pages.analisa.muatList();
    }
  }
};
window.addEventListener('resize', U.debounce(() => { if (App.halaman === 'analisa' && Pages.analisa._pas) Pages.analisa._pas(); }, 150));
