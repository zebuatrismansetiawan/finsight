/* ==========================================================================
   FinSight — pakui.js : halaman Analisa › Perangkat Analisa KUR PMI (v1.4)
   Daftar data debitur (import massal dari Excel), pratinjau dokumen 8 halaman,
   cetak / simpan PDF (satu atau gabungan), tabel angsuran anuitas, dan
   pengaturan format oleh Super Admin. Format Word (v1.3) tetap di tab sebelah.
   ========================================================================== */
'use strict';

const PKU = { k: null, ubah: false, muat: false, ts: 0, sel: new Set(), baris: '', f: { q: '', hal: 1, per: 10 }, edit: null, tab: 'ttd' };

const PAKUI = {
  data() { return AN.data[PAK.ID] || null; },
  rows() {
    const L = this.data() || [];
    const q = PKU.f.q.trim().toLowerCase();
    return q ? L.filter((r) => Object.values(r.d).join(' ').toLowerCase().includes(q)) : L;
  },
  contoh() {
    const p = ((PKU.k || {}).pt || [])[0] || {};
    return { nama: 'NAMA DEBITUR (CONTOH)', pt: p.nama || 'PT. Contoh', nik: '3209xxxxxxxxxxxx', hp: '', tempat: 'Nama Perusahaan Co., Ltd.', pekerjaan: 'Pekerjaan Perakitan Mobil', lama: 12, gaji: 17634801, status: 'Belum Menikah',
      tmplahir: 'Cirebon', tgllahir: '2001-01-21', jk: 'L', jw: 12, berangkat: '2026-12-06', slik: 'ditemukan riwayat fasilitas kredit di Bank … Outs. Rp. 0,- (lunas) dengan status lancar.',
      plafond: 9950000, alamat: 'Blok …, RT …/… Kec. … Kab. …', nopak: 'JBA/4/KUR PMI/xxx/2026', tglpak: new Date().toISOString().slice(0, 10), tglmohon: new Date().toISOString().slice(0, 10), lain: 0 };
  },
  render(admin) {
    const { esc, ic } = U;
    const k = PKU.k;
    if (!k) return '<div class="card pad"><span class="spin"></span> Memuat format Perangkat Analisa…</div>';
    const t = k.ttd || {}, kr = k.kredit || {};
    const n = (this.data() || []).length;
    let h = `<div class="card an-tpl"><div class="an-tpl-h"><span class="kpi-ic soft" style="--c:#DB2777">${ic('pdf', 20)}</span>
        <div class="grow"><small class="muted">Format bawaan — sama dengan berkas Analisa Kredit KUR PMI</small><b class="an-tpl-n">${esc(k.nama)}</b>
          <small class="muted">8 halaman (Perangkat Analisa, Struktur Fasilitas, 2 Call Memo, Check List) • bunga ${esc(PAK.fmt(kr.bunga))}% efektif anuitas • ${U.num(k.kolom.length)} kolom data</small></div>
        <div class="row-g">
          <button class="btn btn-secondary btn-sm" data-act="pkSim">${ic('coins', 15)} Simulasi angsuran</button>
          ${PKU.ubah ? `<button class="btn btn-secondary btn-sm" data-act="pkAtur">${ic('settings', 15)} Atur format</button>` : ''}
        </div></div>
      <div class="pk-ttd">${[['Dipersiapkan', t.prm], ['Mengetahui', t.bbm], ['Pemutus', t.bm], ['COP', t.cop]].map((x) => `<span class="pk-tg"><small>${x[0]}</small><b>${esc((x[1] || {}).nama || '—')}</b><i>${esc((x[1] || {}).jabatan || '')}</i></span>`).join('')}</div></div>`;
    h += `<div class="an-grid"><section class="card tbl-card" id="pkData"></section>
      <section class="card an-prev-c"><div class="an-prev-h"><b>Pratinjau dokumen</b><div class="row-g">
          <button class="btn btn-secondary btn-sm" data-act="pkTabel" title="Tabel angsuran anuitas">${ic('grid', 15)} Tabel angsuran</button>
          <button class="btn btn-primary btn-sm" data-act="pkCetakSatu" id="pkCetak">${ic('print', 15)} Cetak / PDF</button></div></div>
        <div class="an-prev-i" id="pkInfo"></div>
        <div class="an-prev" id="pkPrev"><div class="an-load"><span class="spin"></span> Menyusun halaman…</div></div>
        <div class="an-prev-f"><span class="muted sm">${ic('info', 13)} Pratinjau = hasil cetak (A4). Pilih <b>Simpan sebagai PDF</b> di dialog cetak untuk file PDF.</span></div></section></div>`;
    if (!n && this.data()) h += '';
    return h + `<details class="card an-help"><summary>${ic('info', 16)} Cara memakai Perangkat Analisa KUR PMI</summary><div class="an-help-b"><ol>
      <li>Unduh <b>Template import (.xlsx)</b>. Kolom: ${k.kolom.filter((f) => f.inti).map((f) => esc(f.label)).join(', ')}${k.kolom.some((f) => !f.inti) ? `, ditambah kolom opsional (${k.kolom.filter((f) => !f.inti).map((f) => esc(f.label)).join(', ')})` : ''}.</li>
      <li>Isi 1 baris per debitur (tanggal: 17/11/2026, angka boleh bertitik), lalu klik <b>Import data</b>.</li>
      <li>Klik ikon ${ic('eye', 13)} untuk melihat dokumen, lalu <b>Cetak / PDF</b>. Centang beberapa baris → <b>Cetak terpilih</b> untuk mencetak sekaligus.</li>
      <li>Angsuran dihitung <b>metode anuitas</b> (sama dengan PMT/IPMT/PPMT di simulasi Excel): Beban Bunga = plafond × bunga/12, Angsuran Pokok = angsuran − bunga bulan pertama.</li>
      ${PKU.ubah ? '<li>Penanda tangan, kantor, suku bunga, profil penyelenggara (narasumber & kontak call memo), kolom data, dan semua kalimat diatur di <b>Atur format</b>.</li>' : ''}</ol></div></details>`;
  },
  async mount() {
    if (!PKU.k && !PKU.muat) { await this.muat(); return; }
    if (!PKU.k) return;
    this.segarData();
    if (!this.data()) this.muatData();
    this.pratinjau();
    if (!PKU.muat && Date.now() - PKU.ts > 60000) this.muat();
  },
  async muat() {
    PKU.muat = true;
    const r = await Api.call('analisa.pak.konfig', {});
    PKU.muat = false; PKU.ts = Date.now();
    if (!r.success) { U.toast(r.message, 'err'); return; }
    const lama = JSON.stringify(PKU.k) + AN.aver;
    PKU.k = r.data.konfig; PKU.ubah = r.data.bolehUbah;
    if (AN.aver && AN.aver !== r.data.aver) AN.data = {};
    AN.aver = r.data.aver;
    if (App.halaman === 'analisa' && AN.jenis === 'pak' && lama !== JSON.stringify(PKU.k) + AN.aver) App.render({ tetap: true });
  },
  async muatData() {
    const r = await Api.call('analisa.data.list', { tpl: PAK.ID });
    if (!r.success) return U.toast(r.message, 'err');
    AN.data[PAK.ID] = r.data.rows;
    if (App.halaman === 'analisa' && AN.jenis === 'pak') { this.segarData(); this.pratinjau(); }
  },
  segarData() {
    const { esc, ic } = U;
    const el = document.getElementById('pkData');
    if (!el || !PKU.k) return;
    const semua = this.data();
    if (!semua) { el.innerHTML = '<div class="pad"><span class="spin"></span> Memuat data analisa…</div>'; return; }
    const L = this.rows(), rows = UI.halaman(L, PKU.f);
    const allSel = rows.length && rows.every((r) => PKU.sel.has(r.id));
    const batas = Number((PKU.k.kredit || {}).batas) || 60;
    el.innerHTML = `<div class="an-data-h"><div><b>Data analisa</b> <span class="tag">${U.num(semua.length)}</span></div>
        <div class="inp-ic an-q">${ic('search', 15)}<input type="search" data-act="pkQ" placeholder="Cari nama, NIK, PT…" value="${esc(PKU.f.q)}" aria-label="Cari data analisa"></div></div>
      <div class="bbar"><label class="chk"><input type="checkbox" data-act="pkSelPage" ${allSel ? 'checked' : ''}><span>Pilih halaman ini</span></label>
        ${L.length > rows.length ? `<button class="btn-link sm" data-act="pkSelAll">Pilih semua ${U.num(L.length)}</button>` : ''}
        ${PKU.sel.size ? `<button class="btn-link sm" data-act="pkSelNone">Batal pilih (${U.num(PKU.sel.size)})</button>` : ''}
        <span class="sp"></span>
        <button class="btn btn-sm btn-secondary" data-act="pkCetakSel" ${PKU.sel.size ? '' : 'disabled'} title="Semua dokumen terpilih dalam 1 kali cetak">${ic('print', 14)} Cetak terpilih</button>
        <button class="btn btn-sm btn-danger-soft" data-act="pkHapusSel" ${PKU.sel.size ? '' : 'disabled'} aria-label="Hapus terpilih">${ic('trash', 14)}</button></div>
      ${L.length ? `<div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr><th class="c w1"><span class="sr">Pilih</span></th><th class="c w1">No</th><th>Nama</th><th>Perusahaan</th><th class="num">Plafond</th><th class="num">Angsuran/bln</th><th class="num">Rasio</th><th>Nomor PAK</th><th class="c">Aksi</th></tr></thead><tbody>
        ${rows.map((r, i) => {
          const hh = PAK.hitung(r.d, PKU.k);
          const lebih = hh.rasio !== null && hh.rasio > batas;
          return `<tr class="${PKU.baris === r.id ? 'row-sel' : ''}" title="Diimpor ${r.t ? esc(U.tglJam(r.t)) : ''}${r.o ? ' oleh ' + esc(r.o.replace(/^\d+\s/, '')) : ''}"><td class="c"><input type="checkbox" data-act="pkSel" data-id="${esc(r.id)}" ${PKU.sel.has(r.id) ? 'checked' : ''} aria-label="Pilih"></td>
          <td class="c muted tnum">${(PKU.f.hal - 1) * PKU.f.per + i + 1}</td>
          <td><button class="lnk" data-act="pkLihat" data-id="${esc(r.id)}"><b>${esc(r.d.nama || '—')}</b></button><small class="muted d-b">${esc(r.d.nik || '')}</small></td>
          <td>${esc(r.d.pt || '—')}</td><td class="num tnum">${hh.P ? U.rp(hh.P) : '—'}<small class="muted d-b">${hh.n ? hh.n + ' bln' : ''}</small></td>
          <td class="num tnum">${hh.pmt ? U.rp(Math.round(hh.pmt)) : '—'}</td><td class="num tnum ${lebih ? 'neg' : ''}">${hh.rasio === null ? '—' : hh.rasio.toFixed(2).replace('.', ',') + '%'}</td>
          <td><small>${esc(r.d.nopak || '—')}</small></td>
          <td class="c"><div class="acts"><button class="btn-icon sm" data-act="pkLihat" data-id="${esc(r.id)}" title="Pratinjau">${ic('eye', 15)}</button><button class="btn-icon sm pos" data-act="pkCetakBaris" data-id="${esc(r.id)}" title="Cetak / PDF">${ic('print', 15)}</button></div></td></tr>`;
        }).join('')}
        </tbody></table></div>${UI.pager(L.length, PKU.f.hal, PKU.f.per).replace(/data-act="hal"/g, 'data-act="pkHal"').replace(/data-act="per"/g, 'data-act="pkPer"')}`
    : App.kosong('upload', semua.length ? 'Tidak ada data yang cocok' : 'Belum ada data analisa', semua.length ? 'Ubah kata kunci pencarian.' : 'Unduh template import, isi data debitur, lalu klik Import data.')}`;
  },
  baris(id) { return (this.data() || []).find((x) => x.id === id) || null; },
  async pratinjau() {
    const el = document.getElementById('pkPrev'), info = document.getElementById('pkInfo');
    if (!el || !PKU.k) return;
    const r = PKU.baris ? this.baris(PKU.baris) : null;
    const d = r ? r.d : this.contoh();
    const hh = PAK.hitung(d, PKU.k), { ic, esc } = U;
    const lebih = hh.rasio !== null && hh.rasio > (Number(PKU.k.kredit.batas) || 60);
    if (info) info.innerHTML = `${r ? `${ic('check', 13)} <b>${esc(d.nama || '—')}</b>` : `${ic('info', 13)} <span class="pill pill-grey">Contoh data</span> pilih baris (${ic('eye', 12)}) untuk dokumen debitur.`}
      <span class="pk-hit">Angsuran <b>${PAK.fmt(hh.pmt, 'rp')}</b> • Bunga <b>${PAK.fmt(hh.bunga1, 'rp')}</b> • Pokok <b>${PAK.fmt(hh.pokok1, 'rp')}</b> • Rasio <b class="${lebih ? 'neg' : 'pos'}">${hh.rasio === null ? '—' : hh.rasio.toFixed(2).replace('.', ',') + '%'}</b></span>`;
    const tok = (this._tok = (this._tok || 0) + 1);
    try {
      const hal = await PAK.halaman(PKU.k, [d]);
      if (tok !== this._tok || !document.getElementById('pkPrev')) return;
      el.innerHTML = `<div class="pak an-pak">${hal.join('')}</div>`;
      const pas = () => { const box = document.getElementById('pkPrev'); if (!box) return; const w = box.clientWidth - 24; const z = Math.min(1, w / (595.2 * 96 / 72)); const p = box.querySelector('.an-pak'); if (p) p.style.zoom = String(Math.max(0.3, z)); };
      pas(); this._pas = pas;
    } catch (e) {
      if (tok === this._tok) el.innerHTML = `<div class="alert alert-neg">${ic('alertc', 16)}<div>Pratinjau gagal: ${esc(e.message)}</div></div>`;
    }
  },
  judulFile(d) { return ['Perangkat Analisa KUR', d.nama || '', String(d.nopak || '').replace(/[\/\\]/g, '-')].filter(Boolean).join(' - '); },
  async cetak(list, btn) {
    if (!list.length) return;
    if (list.length > 200) return U.toast('Maksimal 200 dokumen sekali cetak. Kurangi pilihan.', 'warn');
    const asli = btn && btn.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Menyusun…'; }
    try {
      const n = await PAK.cetak(PKU.k, list.map((r) => r.d), list.length === 1 ? this.judulFile(list[0].d) : 'Perangkat Analisa KUR - ' + list.length + ' debitur');
      Api.call('analisa.catat', { tpl: PAK.ID, jenis: 'cetak', jumlah: list.length });
      if (list.length > 1) U.toast(`${U.num(list.length)} dokumen (${U.num(n)} halaman) dikirim ke dialog cetak.`, 'ok');
    } catch (e) { U.toast('Gagal menyiapkan cetak: ' + e.message, 'err'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = asli; } }
  },

  // ---------------- Import ----------------
  importDialog() {
    const { esc, ic } = U;
    const k = PKU.k;
    const m = U.modal({
      title: 'Import data — Perangkat Analisa KUR PMI', size: 'lg',
      body: `<div class="form-g">
        <label class="fld"><span>File data (.xlsx atau .csv)</span><input type="file" id="pkFile" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"><small class="muted">Gunakan <a href="#" id="pkTpl">template import</a>. 1 baris = 1 debitur. Kolom wajib: ${k.kolom.filter((f) => f.wajib).map((f) => esc(f.label)).join(', ')}.</small></label>
        <div id="pkHasil"></div>
        <div class="opts row" id="pkMode" hidden>
          <label class="opt on"><input type="radio" name="pkMode" value="tambah" checked>${ic('plus', 18)}<span><b>Tambahkan</b><small>Data baru ditambahkan ke data yang sudah ada.</small></span></label>
          <label class="opt"><input type="radio" name="pkMode" value="ganti">${ic('refresh', 18)}<span><b>Ganti semua</b><small>Data analisa lama dihapus, diganti isi file.</small></span></label></div></div>`,
      footer: `<button class="btn btn-secondary" data-x="0">Batal</button><button class="btn btn-primary" data-x="1" disabled>${ic('upload', 16)} Import</button>`
    });
    let hasil = null, siap = [];
    const ok = m.el.querySelector('[data-x="1"]');
    m.el.querySelector('#pkTpl').onclick = (e) => { e.preventDefault(); PAKUI.unduhTemplate(); };
    m.el.querySelectorAll('input[name=pkMode]').forEach((r) => r.onchange = () => m.el.querySelectorAll('#pkMode .opt').forEach((o) => o.classList.toggle('on', o.querySelector('input').checked)));
    m.el.querySelector('[data-x="0"]').onclick = () => m.close();
    m.el.querySelector('#pkFile').onchange = async (e) => {
      const f = e.target.files[0], box = m.el.querySelector('#pkHasil');
      hasil = null; siap = []; ok.disabled = true; m.el.querySelector('#pkMode').hidden = true;
      if (!f) { box.innerHTML = ''; return; }
      box.innerHTML = '<span class="spin"></span> Membaca file…';
      try {
        hasil = await PAK.bacaImport(f, k);
        const wajib = k.kolom.filter((x) => x.wajib);
        const kurang = [];
        siap = hasil.rows.filter((o, i) => { const hl = wajib.filter((x) => o[x.k] === undefined || o[x.k] === ''); if (hl.length) { if (kurang.length < 10) kurang.push(`Baris data ke-${i + 1}${o.nama ? ' (' + o.nama + ')' : ''}: ${hl.map((x) => x.label).join(', ')} kosong`); return false; } return true; });
        if (!hasil.rows.length) throw new Error('Tidak ada baris data di bawah judul kolom.');
        box.innerHTML = `<div class="im-ring"><span class="pill pill-pos">${ic('check', 12)} ${U.num(siap.length)} baris siap</span><span class="pill pill-pos">${hasil.cocok.length} kolom cocok</span>
            ${hasil.rows.length - siap.length ? `<span class="pill pill-warn">${U.num(hasil.rows.length - siap.length)} baris dilewati (kolom wajib kosong)</span>` : ''}
            ${hasil.hilang.length ? `<span class="pill pill-neg">${hasil.hilang.length} kolom wajib tidak ada</span>` : ''}${hasil.lebih.length ? `<span class="pill pill-grey" title="${esc(hasil.lebih.join(', '))}">${hasil.lebih.length} kolom lain diabaikan</span>` : ''}</div>
          ${hasil.hilang.length ? `<p class="neg sm">${ic('alertc', 12)} Kolom wajib tidak ditemukan: ${hasil.hilang.map(esc).join(', ')}.</p>` : ''}
          ${kurang.length || hasil.galat.length ? `<ul class="warn-l">${kurang.concat(hasil.galat).slice(0, 12).map((x) => `<li>${ic('alertc', 13)} ${esc(x)}</li>`).join('')}</ul>` : ''}
          <div class="tbl-wrap im-prev"><table class="tbl"><thead><tr><th class="c">#</th><th>Nama</th><th>Perusahaan</th><th class="num">Plafond</th><th class="num">JW</th><th class="num">Angsuran/bln</th><th>Nomor PAK</th></tr></thead><tbody>
          ${siap.slice(0, 5).map((o, i) => { const hh = PAK.hitung(o, k); return `<tr><td class="c muted">${i + 1}</td><td>${esc(o.nama || '')}</td><td>${esc(o.pt || '')}</td><td class="num">${hh.P ? U.rp(hh.P) : '—'}</td><td class="num">${hh.n || '—'}</td><td class="num">${hh.pmt ? U.rp(Math.round(hh.pmt)) : '—'}</td><td><small>${esc(o.nopak || '')}</small></td></tr>`; }).join('')}</tbody></table></div>
          ${siap.length > 5 ? `<p class="muted sm">… dan ${U.num(siap.length - 5)} baris lainnya.</p>` : ''}`;
        m.el.querySelector('#pkMode').hidden = !siap.length;
        ok.disabled = !siap.length || hasil.hilang.length > 0;
      } catch (err) { box.innerHTML = `<div class="alert alert-neg">${ic('alertc', 16)}<div>${esc(err.message)}</div></div>`; }
    };
    ok.onclick = async () => {
      if (!siap.length) return;
      const mode = m.el.querySelector('input[name=pkMode]:checked').value;
      if (mode === 'ganti' && !(await U.konfirmasi({ title: 'Ganti semua data analisa?', body: `Semua data Perangkat Analisa (${U.num((this.data() || []).length)} baris) akan diganti isi file ini.`, ok: 'Ya, ganti', bahaya: true }))) return;
      ok.disabled = true;
      const CH = 400, batch = 'IMP-' + new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
      let total = 0;
      for (let i = 0; i < siap.length; i += CH) {
        ok.innerHTML = `<span class="spin"></span> ${U.num(Math.min(i + CH, siap.length))}/${U.num(siap.length)}`;
        const r = await Api.call('analisa.data.impor', { tpl: PAK.ID, rows: siap.slice(i, i + CH), mode: i === 0 ? mode : 'tambah', batch }, { timeout: 120000 });
        if (!r.success) { ok.disabled = false; ok.innerHTML = `${ic('upload', 16)} Import`; return U.toast(r.message, 'err'); }
        total += r.data.ditambah;
      }
      m.close();
      U.toast(`${U.num(total)} data analisa diimpor.`, 'ok');
      PKU.sel.clear(); PKU.f.hal = 1;
      await this.muatData();
    };
  },
  async unduhTemplate() {
    try { U.unduh(await PAK.templateXlsx(PKU.k), 'Template import - Perangkat Analisa KUR PMI.xlsx'); }
    catch (e) { U.toast(e.message, 'err'); }
  },

  // ---------------- Tabel angsuran (simulasi) ----------------
  simulasi(d) {
    const { esc, ic } = U;
    const k = PKU.k;
    const awal = d || this.contoh();
    const m = U.modal({
      title: 'Simulasi angsuran — metode anuitas', size: 'lg',
      body: `<div class="form-g g3"><label class="fld"><span>Plafond (Rp)</span><input id="smP" inputmode="numeric" value="${esc(PAK.fmt(awal.plafond, 'angka'))}"></label>
        <label class="fld"><span>Jangka waktu (bulan)</span><input id="smN" type="number" min="1" max="360" value="${esc(PAK.angka(awal.jw) || 12)}"></label>
        <label class="fld"><span>Bunga per tahun (%)</span><input id="smB" inputmode="decimal" value="${esc(String(k.kredit.bunga).replace('.', ','))}"></label></div>
        <div id="smHasil"></div>
        <p class="muted sm mt">${ic('info', 13)} Rumus sama dengan SIM KUR.xlsx: Angsuran = PMT(bunga/12; JW; plafond), Bunga = IPMT, Cicilan pokok = PPMT. Angka di dokumen: bulan pertama.</p>`,
      footer: '<button class="btn btn-secondary" data-x="0">Tutup</button>'
    });
    m.el.querySelector('[data-x="0"]').onclick = () => m.close();
    const hitungUlang = () => {
      const dd = { plafond: m.el.querySelector('#smP').value, jw: m.el.querySelector('#smN').value };
      const kk = { kredit: { bunga: PAK.angka(m.el.querySelector('#smB').value) || 0 } };
      const hh = PAK.hitung(dd, kk), T = PAK.tabel(hh);
      const tot = T.reduce((a, x) => ({ b: a.b + x.bunga, c: a.c + x.cicil, s: a.s + x.angsuran }), { b: 0, c: 0, s: 0 });
      const rp = (x) => U.num(Math.round(x));
      m.el.querySelector('#smHasil').innerHTML = hh.n && hh.P ? `<div class="sim-ring"><span>Angsuran / bulan <b>Rp${rp(hh.pmt)}</b></span><span>Bunga bulan 1 <b>Rp${rp(hh.bunga1)}</b></span><span>Pokok bulan 1 <b>Rp${rp(hh.pokok1)}</b></span><span>Total bunga <b>Rp${rp(tot.b)}</b></span></div>
        <div class="tbl-wrap sim-tbl"><table class="tbl sm"><thead><tr><th class="c">Bulan ke</th><th class="num">Pokok pinjaman</th><th class="num">Cicilan pokok</th><th class="num">Bunga</th><th class="num">Angsuran</th><th class="num">Saldo pokok</th></tr></thead><tbody>
        ${T.map((x) => `<tr><td class="c">${x.ke}</td><td class="num tnum">${rp(x.awal)}</td><td class="num tnum">${rp(x.cicil)}</td><td class="num tnum">${rp(x.bunga)}</td><td class="num tnum">${rp(x.angsuran)}</td><td class="num tnum">${rp(x.saldo)}</td></tr>`).join('')}
        </tbody><tfoot><tr><th class="c">Total</th><th></th><th class="num tnum">${rp(tot.c)}</th><th class="num tnum">${rp(tot.b)}</th><th class="num tnum">${rp(tot.s)}</th><th></th></tr></tfoot></table></div>` : `<p class="muted">Isi plafond dan jangka waktu.</p>`;
    };
    m.el.querySelectorAll('#smP,#smN,#smB').forEach((x) => x.oninput = U.debounce(hitungUlang, 120));
    hitungUlang();
  },

  // ---------------- Atur format (Super Admin) ----------------
  atur() {
    const E = PKU.edit = JSON.parse(JSON.stringify(PKU.k));
    E.ttd = E.ttd || {}; ['prm', 'bbm', 'bm', 'cop'].forEach((r) => { E.ttd[r] = E.ttd[r] || { nama: '', jabatan: '' }; });
    E.kantor = E.kantor || {}; E.kredit = E.kredit || { bunga: 6, batas: 60 }; E.pt = E.pt || []; E.kolom = E.kolom || []; E.teks = E.teks || {};
    PKU.tab = PKU.tab || 'ttd';
    const m = U.modal({ title: 'Atur format Perangkat Analisa KUR PMI', size: 'xl', cls: 'pk-atur', body: '<div id="pkAturB"></div>',
      footer: `<span class="muted sm grow">${U.ic('info', 13)} Berlaku untuk semua pengguna menu Analisa.</span><button class="btn btn-secondary" data-x="0">Batal</button><button class="btn btn-primary" data-x="1">${U.ic('check', 16)} Simpan format</button>` });
    this._m = m;
    m.el.querySelector('[data-x="0"]').onclick = () => m.close();
    m.el.querySelector('[data-x="1"]').onclick = async (ev) => {
      const b = ev.currentTarget;
      this.kumpulAtur();
      b.disabled = true; b.innerHTML = '<span class="spin"></span> Menyimpan…';
      const r = await Api.call('analisa.pak.simpan', { konfig: PKU.edit });
      b.disabled = false; b.innerHTML = `${U.ic('check', 16)} Simpan format`;
      if (!r.success) return U.toast(r.message, 'err', 6000);
      PKU.k = r.data.konfig; AN.aver = r.data.aver; delete AN.data[PAK.ID];
      m.close(); U.toast(r.message, 'ok');
      App.render({ tetap: true });
    };
    this.gambarAtur();
  },
  gambarAtur() {
    const { esc, ic } = U;
    const el = document.getElementById('pkAturB'), E = PKU.edit;
    if (!el) return;
    const tabs = [['ttd', 'Penanda tangan', 'user'], ['kantor', 'Kantor & kredit', 'settings'], ['pt', 'Penyelenggara', 'plane'], ['kolom', 'Kolom data', 'grid'], ['teks', 'Kalimat', 'pdf']];
    const inp = (id, label, val, ph, ex) => `<label class="fld"><span>${label}</span><input data-pk="${id}" value="${esc(val === undefined || val === null ? '' : val)}" placeholder="${esc(ph || '')}" ${ex || ''}></label>`;
    let b = '';
    if (PKU.tab === 'ttd') {
      const t = E.ttd;
      b = `<p class="muted sm">Nama & jabatan tampil di tanda tangan Perangkat Analisa, Call Memo, dan Check List.</p>
        <h4 class="pk-h4">Dipersiapkan oleh (ARM / PRM)</h4><div class="form-g g3">${inp('ttd.prm.nama', 'Nama', t.prm.nama)}${inp('ttd.prm.jabatan', 'Jabatan (singkat)', t.prm.jabatan, 'PRM')}${inp('ttd.prm.panjang', 'Jabatan (lengkap, tabel verifikasi)', t.prm.panjang, 'Program Relationship Manager')}</div>
        <h4 class="pk-h4">Mengetahui</h4><div class="form-g g2">${inp('ttd.bbm.nama', 'Nama', t.bbm.nama)}${inp('ttd.bbm.jabatan', 'Jabatan', t.bbm.jabatan, 'Business Banking Manager')}</div>
        <h4 class="pk-h4">Keputusan Komite / Pemutus</h4><div class="form-g g2">${inp('ttd.bm.nama', 'Nama', t.bm.nama)}${inp('ttd.bm.jabatan', 'Jabatan', t.bm.jabatan, 'Branch Manager')}</div>
        <h4 class="pk-h4">Check List — kolom ketiga</h4><div class="form-g g2">${inp('ttd.cop.nama', 'Nama', t.cop.nama)}${inp('ttd.cop.jabatan', 'Jabatan', t.cop.jabatan, 'COP')}</div>`;
    } else if (PKU.tab === 'kantor') {
      const ka = E.kantor, kr = E.kredit;
      b = `<h4 class="pk-h4">Kantor</h4><div class="form-g g3">${inp('kantor.bank', 'Nama bank (kop Call Memo)', ka.bank)}${inp('kantor.cabang', 'Kantor cabang (kop Call Memo)', ka.cabang)}${inp('kantor.unit', 'Sebutan unit ("BNI …" di Call Memo)', ka.unit)}
          ${inp('kantor.booking', 'Booking Office', ka.booking)}${inp('kantor.kota', 'Kota (tanggal keputusan)', ka.kota)}${inp('kantor.formulir', 'Nomor formulir Call Memo', ka.formulir)}</div>
        <h4 class="pk-h4">Kredit</h4><div class="form-g g3">${inp('kredit.bunga', 'Suku bunga per tahun (%)', String(kr.bunga).replace('.', ','), '6', 'inputmode="decimal"')}${inp('kredit.batas', 'Batas rasio kewajiban / gaji (%)', String(kr.batas).replace('.', ','), '60', 'inputmode="decimal"')}${inp('kredit.negara', 'Negara penempatan bawaan', kr.negara)}
          ${inp('kredit.perihal', 'Perihal / nama fasilitas', kr.perihal)}${inp('kredit.jenis', 'Jenis / bentuk kredit', kr.jenis)}${inp('kredit.keperluan', 'Keperluan (1.1.2)', kr.keperluan)}
          ${inp('kredit.propisi', 'Propisi', kr.propisi)}${inp('kredit.admin', 'Biaya administrasi', kr.admin)}</div>`;
    } else if (PKU.tab === 'pt') {
      b = `<p class="muted sm">Profil penyelenggara pemagangan dicocokkan dengan kolom <b>Perusahaan</b> di data (huruf besar/kecil, titik & awalan "PT" diabaikan; atau lewat kata kunci). Dipakai untuk tabel narasumber, OTS, dan Call Memo penyelenggara.</p>
        ${E.pt.map((p, i) => `<div class="pk-ptc"><div class="pk-ptc-h"><b>${esc(p.nama || 'Penyelenggara baru')}</b><button class="btn-icon sm" data-pkx="ptHapus" data-i="${i}" title="Hapus">${ic('trash', 15)}</button></div>
          <div class="form-g g3">${inp(`pt.${i}.nama`, 'Nama penyelenggara (tampil di dokumen)', p.nama, 'PT. Minori')}${inp(`pt.${i}.kata`, 'Kata kunci pencocokan', p.kata, 'minori')}${inp(`pt.${i}.lpk`, 'Sebutan LPK', p.lpk, 'LPK Minori')}
          ${inp(`pt.${i}.kontak`, 'Pejabat yang di-call (nama)', p.kontak)}${inp(`pt.${i}.jabatan`, 'Jabatan pejabat', p.jabatan, 'General Manager')}${inp(`pt.${i}.telp`, 'No. telepon (Bentuk Call)', p.telp)}</div>
          <label class="fld"><span>Narasumber verifikasi (1 baris = 1 nama, maks 6)</span><textarea rows="3" data-pk="pt.${i}.narasumber">${esc((p.narasumber || []).join('\n'))}</textarea></label></div>`).join('')}
        <button class="btn btn-secondary btn-sm" data-pkx="ptTambah">${ic('plus', 15)} Tambah penyelenggara</button>`;
    } else if (PKU.tab === 'kolom') {
      b = `<p class="muted sm">Judul kolom = judul di template Excel. Kolom bertanda <span class="pill pill-grey">inti</span> dipakai format dokumen (bisa diganti judulnya, tidak bisa dihapus). Kolom tambahan bisa dipakai di kalimat sebagai <code>{{kunci}}</code>.</p>
        <div class="tbl-wrap"><table class="tbl sm pk-kol"><thead><tr><th>Judul kolom</th><th>Kunci</th><th>Jenis</th><th>Pilihan (koma)</th><th class="c">Wajib</th><th></th></tr></thead><tbody>
        ${E.kolom.map((f, i) => `<tr><td><input class="inp" data-pk="kolom.${i}.label" value="${esc(f.label)}" maxlength="60"></td><td><code>${esc(f.k || '(otomatis)')}</code>${f.inti ? ' <span class="pill pill-grey">inti</span>' : ''}</td>
          <td><select class="sel" data-pk="kolom.${i}.tipe">${['teks', 'angka', 'tanggal', 'pilihan', 'panjang'].map((x) => `<option value="${x}" ${f.tipe === x ? 'selected' : ''}>${({ teks: 'Teks', angka: 'Angka', tanggal: 'Tanggal', pilihan: 'Pilihan', panjang: 'Teks panjang' })[x]}</option>`).join('')}</select></td>
          <td><input class="inp" data-pk="kolom.${i}.opsi" value="${esc((f.opsi || []).join(', '))}" ${f.tipe === 'pilihan' ? '' : 'disabled'}></td>
          <td class="c"><input type="checkbox" data-pk="kolom.${i}.wajib" ${f.wajib ? 'checked' : ''} aria-label="Wajib"></td>
          <td class="c">${f.inti ? '' : `<button class="btn-icon sm" data-pkx="kolHapus" data-i="${i}" title="Hapus kolom">${ic('trash', 14)}</button>`}</td></tr>`).join('')}</tbody></table></div>
        <button class="btn btn-secondary btn-sm mt" data-pkx="kolTambah">${ic('plus', 15)} Tambah kolom</button>`;
    } else {
      const v = ['nama', 'pt', 'nik', 'tempat', 'pekerjaan', 'tglmohon:tgl', 'tglpak:tglpanjang', 'berangkat:tglpanjang', 'plafond:rp', 'negara', 'penyelenggara', 'lpk', 'lpk_singkat', 'kontak', 'jabatan_kontak', 'lama_teks', 'gaji_memo', 'unit', 'kota'];
      b = `<p class="muted sm">Kalimat bawaan = isi berkas asli. Penanda: ${v.map((x) => `<code>{{${x}}}</code>`).join(' ')} dan semua kunci kolom. Format: <code>:rp</code> <code>:angka</code> <code>:tgl</code> (17 Nov 2026) <code>:tglpanjang</code> (17 November 2026) <code>:terbilang</code> <code>:besar</code>.</p>
        ${Object.keys(PAK.TEKS).map((kk) => { const ubah = E.teks[kk] !== undefined && E.teks[kk] !== PAK.TEKS[kk]; return `<div class="fld pk-tk"><span>${esc(PAK.LABEL_TEKS[kk] || kk)} ${ubah ? `<button class="btn-link sm" data-pkx="teksAsli" data-k="${kk}">${ic('undo', 12)} Kembalikan bawaan</button>` : ''}</span><textarea rows="${Math.min(10, Math.max(2, Math.ceil(String(E.teks[kk] || PAK.TEKS[kk]).length / 110) + (String(E.teks[kk] || PAK.TEKS[kk]).match(/\n/g) || []).length))}" data-pk="teks.${kk}">${esc(E.teks[kk] !== undefined ? E.teks[kk] : PAK.TEKS[kk])}</textarea></div>`; }).join('')}`;
    }
    el.innerHTML = `<div class="pk-at"><nav class="set-nav pk-nav">${tabs.map((t) => `<button class="${PKU.tab === t[0] ? 'on' : ''}" data-pkx="tab" data-v="${t[0]}">${ic(t[2], 16)}<span>${t[1]}</span></button>`).join('')}</nav><div class="pk-at-b">${b}</div></div>`;
    el.querySelectorAll('[data-pkx]').forEach((x) => x.onclick = () => this.aksiAtur(x));
    el.querySelectorAll('select[data-pk$=".tipe"]').forEach((x) => x.onchange = () => { this.kumpulAtur(); this.gambarAtur(); });
  },
  /** Salin isi formulir ke PKU.edit. */
  kumpulAtur() {
    const E = PKU.edit;
    document.querySelectorAll('#pkAturB [data-pk]').forEach((el) => {
      const p = el.dataset.pk.split('.');
      let val = el.type === 'checkbox' ? el.checked : el.value;
      if (p[0] === 'teks') { E.teks[p[1]] = String(val).trim() === String(PAK.TEKS[p[1]]).trim() ? undefined : val; if (E.teks[p[1]] === undefined) delete E.teks[p[1]]; return; }
      if (p[0] === 'pt' && p[2] === 'narasumber') val = String(val).split(/\n/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
      if (p[0] === 'kolom' && p[2] === 'opsi') val = String(val).split(',').map((x) => x.trim()).filter(Boolean);
      if (p[0] === 'kredit' && (p[1] === 'bunga' || p[1] === 'batas')) val = PAK.angka(val);
      let o = E;
      for (let i = 0; i < p.length - 1; i++) o = o[/^\d+$/.test(p[i]) ? +p[i] : p[i]];
      o[p[p.length - 1]] = val;
    });
  },
  aksiAtur(x) {
    this.kumpulAtur();
    const E = PKU.edit, a = x.dataset.pkx, i = +x.dataset.i;
    if (a === 'tab') PKU.tab = x.dataset.v;
    if (a === 'ptTambah') E.pt.push({ nama: '', kata: '', lpk: '', kontak: '', jabatan: 'General Manager', telp: '', narasumber: [] });
    if (a === 'ptHapus') E.pt.splice(i, 1);
    if (a === 'kolTambah') { if (E.kolom.length >= 60) return U.toast('Maksimal 60 kolom.', 'warn'); E.kolom.push({ k: '', label: 'Kolom baru ' + (E.kolom.length + 1), tipe: 'teks' }); }
    if (a === 'kolHapus') E.kolom.splice(i, 1);
    if (a === 'teksAsli') delete E.teks[x.dataset.k];
    this.gambarAtur();
  },
  act: {
    jenis: (el) => { AN.jenis = el.dataset.v; App.render({ tetap: true }); },
    pkQ: (el) => { PKU.f.q = el.value; PKU.f.hal = 1; PAKUI.segarData(); const i = document.querySelector('#pkData .an-q input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
    pkHal: (el) => { PKU.f.hal = +el.dataset.v; PAKUI.segarData(); },
    pkPer: (el) => { PKU.f.per = +el.value; PKU.f.hal = 1; PAKUI.segarData(); },
    pkSel: (el) => { el.checked ? PKU.sel.add(el.dataset.id) : PKU.sel.delete(el.dataset.id); PAKUI.segarData(); },
    pkSelPage: (el) => { UI.halaman(PAKUI.rows(), PKU.f).forEach((r) => (el.checked ? PKU.sel.add(r.id) : PKU.sel.delete(r.id))); PAKUI.segarData(); },
    pkSelAll: () => { PAKUI.rows().forEach((r) => PKU.sel.add(r.id)); PAKUI.segarData(); },
    pkSelNone: () => { PKU.sel.clear(); PAKUI.segarData(); },
    pkLihat: (el) => {
      PKU.baris = el.dataset.id; PAKUI.segarData(); PAKUI.pratinjau();
      if (window.innerWidth < 1100) { const p = document.querySelector('.an-prev-c'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    },
    pkCetakSatu: (el) => { const r = PKU.baris ? PAKUI.baris(PKU.baris) : null; if (!r) return U.toast('Pilih baris data (ikon mata) yang akan dicetak.', 'warn'); PAKUI.cetak([r], el); },
    pkCetakBaris: (el) => { const r = PAKUI.baris(el.dataset.id); if (r) PAKUI.cetak([r], el); },
    pkCetakSel: (el) => PAKUI.cetak((PAKUI.data() || []).filter((r) => PKU.sel.has(r.id)), el),
    pkHapusSel: async () => {
      const n = PKU.sel.size;
      if (!n || !(await U.konfirmasi({ title: 'Hapus data analisa?', body: `${U.num(n)} data terpilih akan dihapus dari database.`, ok: 'Hapus', bahaya: true }))) return;
      const r = await Api.call('analisa.data.hapus', { tpl: PAK.ID, ids: Array.from(PKU.sel) });
      if (!r.success) return U.toast(r.message, 'err');
      if (PKU.sel.has(PKU.baris)) PKU.baris = '';
      U.toast(r.message.replace('surat', 'analisa'), 'ok'); PKU.sel.clear();
      await PAKUI.muatData();
    },
    pkTabel: () => { const r = PKU.baris ? PAKUI.baris(PKU.baris) : null; PAKUI.simulasi(r ? r.d : null); },
    pkSim: () => PAKUI.simulasi(null),
    pkAtur: () => PAKUI.atur(),
    pkImport: () => PAKUI.importDialog(),
    pkTemplate: () => PAKUI.unduhTemplate()
  }
};
