/* ==========================================================================
   FinSight — akses.js (v1.5) : Pengaturan tambahan Super Admin
   1. Mitra KUR PMI → sumber data per PT: 1 sheet per PT di spreadsheet KUR PMI,
      baris judul & pemetaan kolom per PT (mis. Nama Debitur ← B5 "Nama Deb").
   2. Akses Data → daftar Unit, kolom NPP RM / Unit / Segmen, produk SME & SBP,
      dan cakupan data per peran (segmen + hanya debitur dengan NPP sendiri).
   ========================================================================== */
'use strict';

(() => {
  const P = Pages.pengaturan;
  const { esc, ic } = U;
  const FIELD_PT = [['nm', 'Nama Debitur'], ['pu', 'Perusahaan (tempat kerja)'], ['ra', 'Rek Afil'], ['rp', 'Rek Pinjaman'], ['cif', 'CIF'], ['wa', 'No. HP'], ['pic', 'Kontak (PIC)'],
    ['pl', 'Plafon'], ['bd', 'Baki Debet'], ['an', 'Angsuran'], ['sb', 'Saldo Blokir'], ['sa', 'Saldo Akhir'], ['jt', 'Jatuh Tempo'], ['tb', 'Tgl Booking'],
    ['kol', 'Kol'], ['st', 'Status'], ['bt', 'Batch'], ['jw', 'Jangka Waktu'], ['un', 'Unit'], ['np', 'NPP RM']];
  const KUNCI_PT = [['auto', 'Otomatis (Rek Afil → Rek Pinjaman → CIF)'], ['ra', 'Rek Afil'], ['rp', 'Rek Pinjaman'], ['cif', 'CIF']];
  const normSh = (x) => String(x || '').toLowerCase().replace(/^\s*p\.?\s*t\.?\s+/, '').replace(/[^a-z0-9]/g, '');

  // ------------------------------------------------------------------ 1. Sumber KUR PMI per PT
  Object.assign(P, {
    async muatPt() {
      this._ptMuat = true;
      const r = await Api.call('pmi.pt.info', {}, { timeout: 120000 });
      this._ptMuat = false;
      const d = r.success ? r.data : { aktif: false, galat: r.message, daftar: UI.daftarPt() };
      this.ptInfo = d;
      const st = { url: d.url || '', sheets: d.sheets || [], buka: '', pt: {} };
      (d.pt || UI.daftarPt().map((n) => ({ nama: n }))).forEach((p) => {
        st.pt[p.nama] = { aktif: p.aktif !== false, sheet: p.sheet || '', baris: p.baris || 1, kunci: p.kunci || 'auto', kolom: Object.assign({}, p.kolom || {}),
          judul: p.judul && p.judul.length ? p.judul : null, n: p.n || 0, cocok: p.cocok || 0, baru: p.baru || 0, galat: p.galat || '', pakai: p.pakai || {} };
      });
      if (!d.aktif) (d.daftar || UI.daftarPt()).forEach((n) => { if (!st.pt[n]) st.pt[n] = { aktif: true, sheet: '', baris: 1, kunci: 'auto', kolom: {}, judul: null, n: 0, galat: '' }; });
      if (this.ptS && this.ptS.urlKetik) st.url = this.ptS.urlKetik;
      this.ptS = st;
      this.segarPt();
      if (!d.aktif && !this.src && !this._srcMuat) this.muatSumber();               // kartu cara lama (alternatif)
    },
    segarPt() {
      const el = document.getElementById('ptCard'), alt = document.querySelector('.src-alt'), aktif = !!(this.ptInfo && this.ptInfo.aktif);
      if (el && (aktif ? alt : !alt)) { App.render({ tetap: true }); return; }            // kartu alternatif muncul/hilang
      if (el) el.outerHTML = this.kartuPt();
      else if (App.halaman === 'pengaturan' && (S.f.set || {}).tab === 'pmi') App.render({ tetap: true });
    },
    kartuPt() {
      const I = this.ptInfo, St = this.ptS;
      if (!I || !St) return `<div class="card pad-l" id="ptCard"><h3>${ic('link', 18)} Sumber data KUR PMI per PT</h3><p class="muted"><span class="spin"></span> Memeriksa…</p></div>`;
      const daftar = UI.daftarPt();
      const nCocok = (I.pt || []).reduce((s, p) => s + (p.cocok || 0) + (p.baru || 0), 0);
      const status = I.aktif
        ? `<div class="src-st ${I.galat ? 'bad' : 'ok'}">${ic(I.galat ? 'alertc' : 'ok', 18)}<div><b>${I.galat ? 'Tidak dapat dibaca' : esc(I.nama)}</b><small>${I.galat ? esc(I.galat) : `${U.num(nCocok)} debitur KUR PMI dari ${U.num((I.pt || []).filter((p) => p.n).length)} sheet PT${I.disembunyikan ? ` • <span class="warn">${U.num(I.disembunyikan)} debitur KUR PMI di base data tidak ada di sheet PT mana pun (tidak ditampilkan)</span>` : ''}`}</small></div>${I.url ? `<a class="lnk-a" href="${esc(I.url)}" target="_blank" rel="noopener noreferrer">Buka ${ic('ext', 13)}</a>` : ''}</div>`
        : `<div class="src-st">${ic('info', 18)}<div><b>Belum terhubung</b><small>Debitur KUR PMI saat ini dari sheet Debitur (kolom Produk & PT_PMI)${I.lama ? ' + sumber detail lama (1 sheet)' : ''}.</small></div></div>`;
      const sheetSel = (nama, p) => St.sheets.length
        ? `<select class="sel" data-act="ptSheet" data-k="${esc(nama)}"><option value="">— pilih sheet —</option>${p.sheet && !St.sheets.includes(p.sheet) ? `<option selected>${esc(p.sheet)}</option>` : ''}${St.sheets.map((x) => `<option ${x === p.sheet ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`
        : `<input class="inp" data-act="ptSheetTx" data-k="${esc(nama)}" value="${esc(p.sheet)}" placeholder="Nama sheet, mis. ${esc(nama)}">`;
      const kartu = (nama, i) => {
        const p = St.pt[nama] || (St.pt[nama] = { aktif: true, sheet: '', baris: 1, kunci: 'auto', kolom: {}, judul: null });
        const nPeta = Object.keys(p.kolom).filter((k) => p.kolom[k]).length, buka = St.buka === nama;
        const info = p.galat ? `<span class="neg">${esc(p.galat)}</span>` : p.n ? `<b class="tnum">${U.num(p.n)}</b> baris${I.aktif && p.tersimpan !== false ? ` • <span class="pos">${U.num(p.cocok || 0)} cocok base data</span>${p.baru ? ` • ${U.num(p.baru)} hanya di sheet PT` : ''}` : ''}` : p.sheet ? 'Belum dibaca' : '<span class="muted">Belum dipetakan</span>';
        return `<div class="imp-prof pt-src ${p.aktif ? 'on' : ''}"><div class="imp-prof-h">
            <label class="chk"><input type="checkbox" data-act="ptAktif" data-k="${esc(nama)}" ${p.aktif ? 'checked' : ''}><span><b>${esc(nama)}</b><small class="muted d-b">${info}</small></span></label>
            <div class="imp-prof-f"><label class="fld sm"><span>Sheet</span>${sheetSel(nama, p)}</label>
              <label class="fld sm w-baris"><span>Baris judul</span><input class="inp" type="number" min="1" max="50" data-act="ptBaris" data-k="${esc(nama)}" value="${esc(p.baris)}"></label>
              <label class="fld sm"><span>Dicocokkan lewat</span><select class="sel" data-act="ptKunci" data-k="${esc(nama)}">${KUNCI_PT.map((k) => `<option value="${k[0]}" ${p.kunci === k[0] ? 'selected' : ''}>${esc(k[1])}</option>`).join('')}</select></label>
              <button class="btn btn-secondary btn-sm" data-act="ptBuka" data-k="${esc(nama)}">${ic('sliders', 15)} Atur kolom${nPeta ? ` <span class="tag">${nPeta}</span>` : ''}</button></div></div>
          ${buka ? `<div class="imp-peta">${p.judul ? `<p class="muted sm">${ic('info', 13)} Kolom dibaca dari baris judul ${esc(p.baris)} sheet <b>${esc(p.sheet)}</b>. <b>Otomatis</b> = judul dikenali (mis. Nama Deb, Perusahaan, Rek Afil, Batch); bila tidak ada, diambil dari base data (sheet Debitur). <b>Dari base data</b> = abaikan kolom sheet PT.</p>`
              : `<p class="muted sm">${ic('info', 13)} Pilih sheet & baris judul, lalu klik <b>Baca kolom</b> agar huruf & judul kolom bisa dipilih.</p>`}
            <div class="row-g"><button class="btn btn-secondary btn-sm" data-act="ptBacaKolom" data-k="${esc(nama)}">${ic('search', 14)} Baca kolom</button>${p.judul ? `<span class="muted sm">${U.num(p.judul.length)} kolom terbaca.</span>` : ''}</div>
            <div class="tbl-wrap"><table class="tbl sm imp-tbl"><thead><tr><th>Data di Daftar Debitur KUR PMI</th><th>Ambil dari sheet ${esc(p.sheet || 'PT')}</th><th>Contoh</th></tr></thead><tbody>
              <tr><td><b>Mitra KUR PMI</b></td><td><span class="pill pill-grey">${esc(nama)} (nama PT)</span></td><td></td></tr>
              <tr><td><b>Produk</b></td><td><span class="pill pill-grey">KUR PMI (otomatis)</span></td><td></td></tr>
              ${FIELD_PT.map((f) => `<tr><td><b>${esc(f[1])}</b></td><td class="imp-sel">${P.pilihKolom(p.kolom[f[0]], p.judul, i + '.' + f[0], 'pt', { auto: 'Otomatis (judul / base data)', skip: '— Dari base data —' })}</td><td class="muted"><small>${esc(P.contohNilai(p.kolom[f[0]], p.judul) || (!p.kolom[f[0]] && p.pakai && p.pakai[f[0]] ? 'otomatis: ' + p.pakai[f[0]] : ''))}</small></td></tr>`).join('')}
            </tbody></table></div></div>` : ''}</div>`;
      };
      return `<div class="card pad-l" id="ptCard"><h3>${ic('link', 18)} Sumber data KUR PMI per PT</h3>
        <p class="muted">Tiap PT mitra membaca <b>sheet</b>-nya sendiri di spreadsheet database KUR PMI (mis. sheet <b>PT Minori Pemagang</b>). Atur baris judul & kolom sumber tiap data agar <b>Daftar Debitur KUR PMI</b> cocok dengan PT penempatan. Debitur KUR PMI yang tidak ada di sheet PT terdaftar <b>tidak ditampilkan</b>. Spreadsheet hanya dibaca.</p>
        ${status}
        <div class="imp-src mt"><label class="fld grow"><span>Link spreadsheet database KUR PMI</span><input id="ptUrl" data-act="ptUrlTx" placeholder="https://docs.google.com/spreadsheets/d/…/edit" value="${esc(St.url)}" autocomplete="off"><small class="muted">Akun pemilik Apps Script harus punya akses (minimal pembaca).</small></label>
          <button class="btn btn-secondary" data-act="ptBaca">${ic('search', 16)} Baca spreadsheet</button></div>
        ${St.sheets.length ? `<p class="muted sm">${ic('ok', 13, 'pos')} ${U.num(St.sheets.length)} sheet: ${St.sheets.map(esc).join(', ')}</p>` : ''}
        <div class="pt-src-l">${daftar.map(kartu).join('')}</div>
        <div class="card-f"><span class="muted">${ic('info', 14)} PT diambil dari daftar di atas. Perubahan di spreadsheet KUR PMI terbaca otomatis ±5 menit.</span><div class="row-g">${I.aktif ? `<button class="btn btn-danger-soft" data-act="ptPutus">${ic('unlink', 16)} Putuskan</button>` : ''}<button class="btn btn-primary" data-act="ptSimpan">${ic('check', 16)} ${I.aktif ? 'Simpan & terapkan' : 'Hubungkan'}</button></div></div></div>`;
    },
    ptPayload() {
      const St = this.ptS, out = {};
      UI.daftarPt().forEach((n) => { const p = St.pt[n]; if (p && (p.sheet || Object.keys(p.kolom).length)) out[n] = { aktif: !!p.aktif, sheet: p.sheet, baris: p.baris, kunci: p.kunci, kolom: p.kolom }; });
      return { url: ((document.getElementById('ptUrl') || {}).value || St.url || '').trim(), pt: out };
    },
    async bacaKolomPt(nama, diam) {
      const St = this.ptS, p = St.pt[nama], url = ((document.getElementById('ptUrl') || {}).value || St.url || '').trim();
      if (!url || !p.sheet) { if (!diam) U.toast('Isi link spreadsheet & pilih sheet dulu.', 'warn'); return; }
      const r = await Api.call('pmi.pt.baca', { url, sheet: p.sheet, baris: p.baris }, { timeout: 90000 });
      if (!r.success) { p.galat = r.message; if (!diam) U.toast(r.message, 'err', 6000); return; }
      p.judul = r.data.judul; p.galat = ''; p.n = r.data.n;
    }
  });

  // ------------------------------------------------------------------ 2. Akses Data
  Object.assign(P, {
    async muatAkses() {
      this._akMuat = true;
      const r = await Api.call('akses.info', {});
      this._akMuat = false;
      this.ak = r.success ? r.data : { galat: r.message };
      this.akD = r.success ? JSON.parse(JSON.stringify(r.data.akses)) : null;
      if (this.akD) Object.keys(r.data.peran || {}).forEach((p) => { if (!this.akD.peran[p]) this.akD.peran[p] = Object.assign({}, r.data.peran[p]); });
      this._akAsli = this.akD ? JSON.stringify(this.akD) : undefined;
      if (App.halaman === 'pengaturan' && (S.f.set || {}).tab === 'akses') App.render({ tetap: true });
    },
    /** v1.6: Cek NPP — cocokkan NPP login dengan NPP RM pengelola di database (Super Admin). */
    kartuCekNpp() {
      const R = this.akCekR, nppIsi = this.akCekNpp || '';
      const rp = (n) => U.rpJ(n);
      const tabel = (L) => `<div class="tbl-wrap"><table class="tbl sm"><thead><tr><th>Produk</th><th class="num">Rekening</th><th class="num">CIF</th><th class="num">Plafon</th><th class="num">Baki debet</th><th class="num">SME</th><th class="num">SBP</th></tr></thead><tbody>
        ${L.map((x) => `<tr><td>${UI.prod(x.pr)}</td><td class="num tnum">${U.num(x.n)}</td><td class="num tnum">${U.num(x.cif)}</td><td class="num tnum">${rp(x.pl)}</td><td class="num tnum">${rp(x.bd)}</td><td class="num tnum">${U.num(x.sme)}</td><td class="num tnum">${U.num(x.sbp)}</td></tr>`).join('')}
        <tr class="tot"><td><b>Total</b></td><td class="num tnum"><b>${U.num(L.reduce((s, x) => s + x.n, 0))}</b></td><td class="num tnum">${U.num(L.reduce((s, x) => s + x.cif, 0))}</td><td class="num tnum"><b>${rp(L.reduce((s, x) => s + x.pl, 0))}</b></td><td class="num tnum"><b>${rp(L.reduce((s, x) => s + x.bd, 0))}</b></td><td></td><td></td></tr></tbody></table></div>`;
      let isi = '';
      if (R && R.galat) isi = `<div class="alert alert-neg mt">${ic('alertc', 16)}<div>${esc(R.galat)}</div></div>`;
      else if (R) {
        const u = R.pengguna, l = R.lihat;
        isi = `<div class="cek-npp mt">
          <div class="src-st ${R.n ? 'ok' : 'bad'}">${ic(R.n ? 'ok' : 'alertc', 18)}<div><b>NPP ${esc(R.npp)} — ${U.num(R.n)} rekening di database</b><small>Kolom NPP RM di sheet Debitur: <b>${esc(R.kolom || 'NPP_RM')}</b>${R.adaNpp ? '' : ' (belum berisi data — filter NPP belum berlaku)'} • total ${U.num(R.total)} rekening.</small></div></div>
          <div class="src-st">${ic('user', 18)}<div><b>${u ? esc(u.nama) + ' • ' + esc(App.labelPeran(u.peran)) + (u.status !== 'Aktif' ? ' • Nonaktif' : '') : 'NPP ini belum terdaftar sebagai pengguna'}</b>
            <small>${l ? `Setelah login menerima <b>${U.num(l.n)}</b> debitur — ${l.nppAktif ? 'filter NPP aktif (NPP = kunci)' : l.filterNpp ? 'filter NPP dicentang, tetapi kolom NPP RM belum berisi data' : l.segmen ? 'segmen ' + esc(l.segmen) + ' saja, tanpa filter NPP' : 'seluruh portofolio'}.${l.filterNpp ? '' : ` <span class="warn">Centang "Hanya debitur dengan NPP RM sendiri" untuk peran ini agar yang tampil sama dengan ${U.num(R.n)} rekening di atas.</span>`}` : 'Tambahkan di menu Pengguna & Peran dengan NPP yang sama.'}</small></div></div>
          ${R.produk.length ? tabel(R.produk) : `<div class="alert alert-warn">${ic('info', 16)}<div><b>Tidak ada debitur dengan NPP RM ${esc(R.npp)}.</b> Periksa kolom NPP RM yang dipetakan (Import Data → Atur kolom → NPP RM, atau kartu "Filter NPP RM" di atas). Nilai NPP terbanyak di data: ${R.contoh.map((c) => `<code>${esc(c.npp)}</code> (${U.num(c.n)}${c.nama ? ' — ' + esc(c.nama) : ''})`).join(', ')}.</div></div>`}
        </div>`;
      }
      return `<div class="card pad-l" id="akCek"><h3>${ic('search', 18)} Cek NPP — cocokkan NPP login dengan NPP RM pengelola</h3>
        <p class="muted">Masukkan NPP pengguna (mis. 67221) untuk melihat berapa debitur di database yang NPP RM pengelolanya sama, per produk, dan apa yang akan ia lihat setelah login. Gunakan untuk mencocokkan jumlah dengan pivot database.</p>
        <div class="row-g"><input class="inp w-npp" id="akCekNpp" inputmode="numeric" maxlength="7" placeholder="NPP, mis. 67221" value="${esc(nppIsi)}" autocomplete="off" aria-label="NPP">
          <button class="btn btn-secondary" type="button" data-act="akCek">${ic('search', 15)} Cek NPP</button></div>${isi}</div>`;
    },
    tab_akses() {
      const A = this.ak, D = this.akD;
      if (!A) { if (!this._akMuat) setTimeout(() => this.muatAkses(), 0); return `<div class="card pad"><span class="spin"></span> Memuat pengaturan akses data…</div>`; }
      if (A.galat) return `<div class="alert alert-neg">${ic('alertc', 16)}<div>${esc(A.galat)}</div></div>`;
      const kolSel = (f, label) => `<select class="sel" data-act="akKol" data-k="${f}"><option value="" ${!D.kol[f] ? 'selected' : ''}>Otomatis (${esc(label)})</option>${A.header.map((h) => `<option value="hdr:${esc(h)}" ${D.kol[f] === 'hdr:' + h ? 'selected' : ''}>${esc(h)}</option>`).join('')}<option value="skip" ${D.kol[f] === 'skip' ? 'selected' : ''}>— Tidak dipakai —</option></select>`;
      const peran = Object.keys(D.peran).sort();
      const prodAll = S.produk.map((p) => p.kode);            // v1.7: hanya 8 produk terdaftar
      const nUnit = A.perUnit || {};
      const ubah = JSON.stringify(D) !== this._akAsli;
      return `<div class="card pad-l"><h3>${ic('shield', 18)} Cakupan data per peran</h3>
          <p class="muted">Menentukan sub menu Daftar Debitur (SME / SBP) yang tampil dan debitur yang dikirim ke perangkat tiap peran. Disaring di <b>server</b> — berlaku di Dashboard, Kualitas Kredit, Daftar Debitur, Penagihan, WA Blast, dan pencarian. Super Admin selalu melihat semua.</p>
          ${S.ds && S.ds.kolom && !S.ds.kolom.np ? `<div class="alert alert-warn mt">${ic('info', 16)}<div>Kolom <b>NPP RM</b> di sheet Debitur belum berisi data, jadi filter <i>Hanya debitur dengan NPP RM sendiri</i> <b>belum berlaku</b> (peran tersebut melihat semua debitur segmennya). Isi kolom <code>NPP_RM</code> atau petakan lewat <b>Import Data → Atur kolom → NPP RM</b>.</div></div>` : ''}
          <div class="tbl-wrap"><table class="tbl sm ak-tbl"><thead><tr><th>Peran</th><th>Segmen Daftar Debitur</th><th class="c">Hanya debitur dengan NPP RM sendiri</th><th class="c">Data bawahan (downliner)</th></tr></thead><tbody>
          ${peran.map((p) => `<tr><td><b>${esc(App.labelPeran(p))}</b></td><td><select class="sel" data-act="akSeg" data-k="${esc(p)}">${[['', 'Semua (SME & SBP)'], ['SME', 'SME saja'], ['SBP', 'SBP saja']].map((o) => `<option value="${o[0]}" ${(D.peran[p].s || '') === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></td>
            <td class="c"><label class="sw-cell"><input type="checkbox" data-act="akNpp" data-k="${esc(p)}" ${D.peran[p].n ? 'checked' : ''} aria-label="Hanya NPP sendiri"><i></i></label></td>
            <td class="c"><label class="sw-cell"><input type="checkbox" data-act="akDown" data-k="${esc(p)}" ${D.peran[p].d ? 'checked' : ''} aria-label="Data mengikuti bawahan (downliner)"><i></i></label></td></tr>`).join('')}
          </tbody></table></div>
          <p class="muted sm">${ic('info', 13)} Bawaan: <b>RM</b> = SME + NPP sendiri; <b>PRM / ARM</b> = SBP + NPP sendiri; <b>Business Banking Manager, Branch Manager, SME Credit Risk</b> = data bawahan (downliner). Peran baru diatur di menu Pengguna & Peran.</p>
          <p class="muted sm">${ic('users', 13)} <b>Data bawahan (downliner):</b> pengguna peran ini melihat debitur milik seluruh bawahannya (rekursif, sesuai NPP RM pengelola). Upliner/downliner diatur Super Admin di <b>Pengguna & Peran → Edit → Upliner</b>. Bila bawahannya belum diatur, cakupan kembali ke segmen peran.</p>
          <p class="muted sm">${ic('key', 13)} <b>NPP = kunci.</b> Bila "Hanya debitur dengan NPP RM sendiri" dicentang dan kolom NPP RM sudah berisi data, pengguna menerima <b>semua</b> debitur yang NPP RM pengelolanya sama dengan NPP login-nya — apa pun segmen/produknya. Segmen hanya menyaring peran yang tidak memakai filter NPP.</p></div>
        <div class="card pad-l pmi-buka ${D.pmiBuka ? 'on' : ''}"><div class="pmi-row"><span class="pmi-ic">${ic('plane', 22)}</span><div class="pmi-tx">
            <h3>KUR PMI tampil untuk semua peran <span class="pill ${D.pmiBuka ? 'pill-pos' : 'pill-grey'}">${D.pmiBuka ? 'ON' : 'OFF'}</span></h3>
            <p class="muted">${D.pmiBuka ? '<b>ON:</b> debitur produk <b>KUR PMI</b> terlihat oleh semua peran <b>tanpa filter</b> NPP RM, segmen, maupun downliner — mis. PRM / ARM NPP 67221 dapat melihat KUR PMI kelolaan NPP 53221, begitu juga sebaliknya.' : '<b>OFF:</b> debitur <b>KUR PMI</b> disaring seperti produk lain (mengikuti cakupan peran di atas).'} Produk lain tetap mengikuti cakupan per peran.</p></div>
            <label class="sw-tgl" title="KUR PMI tampil untuk semua peran"><input type="checkbox" data-act="akPmi" ${D.pmiBuka ? 'checked' : ''} aria-label="KUR PMI tampil untuk semua peran tanpa filter"><i></i></label></div></div>
        <div class="card pad-l"><h3>${ic('user', 18)} Filter NPP RM</h3>
          <p class="muted">Kolom di sheet Debitur (database) yang berisi NPP RM pengelola. Peran yang dicentang "Hanya debitur dengan NPP RM sendiri" hanya menerima debitur dengan NPP yang sama dengan NPP login-nya. Isi kolom ini lewat <b>Import Data → Atur kolom → NPP RM</b>.</p>
          <div class="form-g g2"><label class="fld"><span>Kolom NPP RM</span>${kolSel('np', 'NPP_RM')}</label>
            <div class="src-st ${A.kolom.np ? 'ok' : ''}">${ic(A.kolom.np ? 'ok' : 'info', 18)}<div><b>${A.kolom.np ? U.num(A.hitung.np) + ' dari ' + U.num(A.total) + ' debitur punya NPP RM' : 'Kolom NPP RM belum ada'}</b><small>${A.kolom.np ? 'Filter NPP aktif untuk peran yang dicentang.' : 'Selama kolom belum ada, filter NPP belum diterapkan (peran tetap melihat seluruh segmennya).'}</small></div></div></div></div>
        ${this.kartuCekNpp()}
        <div class="card pad-l"><h3>${ic('layers', 18)} Segmen SME & SBP</h3>
          <p class="muted">Produk tiap segmen menjadi sub menu Daftar Debitur. Produk yang ada di kedua segmen (mis. CCC) ditentukan dari <b>kolom Segmen</b> base data; bila kosong, ikut segmen peran RM pengelola (NPP RM).</p>
          <div class="form-g g2">${['SME', 'SBP'].map((g) => `<div class="fld"><span>Produk ${g}</span><div class="ak-prod">${prodAll.map((k) => `<label class="chk sm"><input type="checkbox" data-act="akProd" data-g="${g}" data-k="${esc(k)}" ${D.seg[g].includes(k) ? 'checked' : ''}><span>${esc(k)}</span></label>`).join('')}</div></div>`).join('')}
            <label class="fld"><span>Kolom Segmen</span>${kolSel('sg', 'Segmen')}<small class="muted">Nilai berisi "SME" atau "SBP" (juga dikenali: Small Business, Kecil, Menengah).</small></label>
            <div class="src-st">${ic('info', 18)}<div><b>${U.num(A.hitung.SME)} SME • ${U.num(A.hitung.SBP)} SBP</b><small>${U.num(A.hitung.tanpaSeg)} debitur belum diketahui segmennya (tampil di kedua segmen untuk produk bersama).</small></div></div></div></div>
        <div class="card pad-l"><h3>${ic('mappin', 18)} Unit / kantor</h3>
          <p class="muted">Daftar filter <b>Unit</b> di Daftar Debitur. Unit tiap debitur dibaca dari kolom Unit di sheet Debitur — berisi kode (mis. 31102) atau nama kantor (mis. KC Cikarang).</p>
          <label class="fld"><span>Kolom Unit</span>${kolSel('un', 'Unit / Kode Unit')}</label>
          <div class="tbl-wrap mt"><table class="tbl sm ak-tbl"><thead><tr><th style="width:130px">Kode</th><th>Nama kantor</th><th class="num">Debitur</th><th></th></tr></thead><tbody>
          ${D.unit.map((u, i) => `<tr><td><input class="inp" data-act="akUnit" data-i="${i}" data-f="k" value="${esc(u.k)}" maxlength="12" inputmode="numeric"></td><td><input class="inp" data-act="akUnit" data-i="${i}" data-f="n" value="${esc(u.n)}" maxlength="60"></td>
            <td class="num tnum">${U.num(nUnit[u.k || u.n] || 0)}</td><td class="c"><button class="btn-icon sm" data-act="akUnitHapus" data-i="${i}" title="Hapus">${ic('trash', 14)}</button></td></tr>`).join('')}
          </tbody></table></div>
          <div class="row-g mt"><button class="btn btn-secondary btn-sm" data-act="akUnitTambah">${ic('plus', 15)} Tambah unit</button><button class="btn btn-ghost btn-sm" data-act="akUnitBawaan">${ic('refresh', 14)} Kembalikan daftar bawaan</button></div></div>
        <div class="card pad-l ak-foot"><div class="card-f"><span class="muted">${ic('info', 14)} ${ubah ? '<b class="warn">Ada perubahan yang belum disimpan.</b>' : 'Perubahan berlaku langsung untuk semua pengguna.'}</span><div class="row-g">${ubah ? `<button class="btn btn-ghost" data-act="akBatal">Batal</button>` : ''}<button class="btn btn-primary" data-act="akSimpan" ${ubah ? '' : 'disabled'}>${ic('check', 16)} Simpan pengaturan akses</button></div></div></div>`;
    }
  });

  // ------------------------------------------------------------------ aksi
  const ulang = () => App.render({ tetap: true });
  Object.assign(P.act, {
    ptUrlTx: (el) => { P.ptS.url = el.value; P.ptS.urlKetik = el.value; },
    ptBaca: async (el) => {
      const St = P.ptS, url = (document.getElementById('ptUrl').value || '').trim();
      if (!url) return U.toast('Tempel link spreadsheet database KUR PMI.', 'warn');
      St.url = url; el.disabled = true; const l = el.innerHTML; el.innerHTML = '<span class="spin"></span> Membaca…';
      const r = await Api.call('pmi.pt.baca', { url }, { timeout: 90000 });
      if (!r.success) { el.disabled = false; el.innerHTML = l; return U.toast(r.message, 'err', 6000); }
      St.sheets = r.data.sheets;
      for (const n of UI.daftarPt()) {
        const p = St.pt[n] || (St.pt[n] = { aktif: true, sheet: '', baris: 1, kunci: 'auto', kolom: {}, judul: null });
        if (!p.sheet || !St.sheets.includes(p.sheet)) { const c = St.sheets.find((x) => normSh(x) === normSh(n)); if (c) p.sheet = c; }
        if (p.sheet && St.sheets.includes(p.sheet)) await P.bacaKolomPt(n, true);
      }
      el.disabled = false; el.innerHTML = l;
      U.toast(`Terbaca ${r.data.sheets.length} sheet di “${r.data.nama}”. Atur kolom tiap PT bila judulnya berbeda.`, 'ok', 5000);
      P.segarPt();
    },
    ptAktif: (el) => { P.ptS.pt[el.dataset.k].aktif = el.checked; P.segarPt(); },
    ptSheet: async (el) => { const p = P.ptS.pt[el.dataset.k]; p.sheet = el.value; p.judul = null; p.n = 0; if (p.sheet) await P.bacaKolomPt(el.dataset.k, true); P.segarPt(); },
    ptSheetTx: (el) => { const p = P.ptS.pt[el.dataset.k]; p.sheet = el.value.trim(); p.judul = null; },
    ptBaris: (el) => { const p = P.ptS.pt[el.dataset.k]; p.baris = Math.max(1, Math.min(50, Math.round(+el.value) || 1)); p.judul = null; clearTimeout(P._tPt); P._tPt = setTimeout(async () => { await P.bacaKolomPt(el.dataset.k, true); P.segarPt(); }, 600); },
    ptKunci: (el) => { P.ptS.pt[el.dataset.k].kunci = el.value; },
    ptBuka: async (el) => { const St = P.ptS, n = el.dataset.k; St.buka = St.buka === n ? '' : n; if (St.buka && !St.pt[n].judul && St.pt[n].sheet) await P.bacaKolomPt(n, true); P.segarPt(); },
    ptBacaKolom: async (el) => { el.disabled = true; await P.bacaKolomPt(el.dataset.k, false); P.segarPt(); },
    ptSpek: (el) => {
      const [i, f] = el.dataset.k.split('.'), n = UI.daftarPt()[+i], p = P.ptS.pt[n];
      if (el.value === 'tetap') p.kolom[f] = 'tetap:' + (p.kolom[f] && p.kolom[f].indexOf('tetap:') === 0 ? p.kolom[f].slice(6) : '');
      else if (el.value) p.kolom[f] = el.value; else delete p.kolom[f];
      P.segarPt();
      if (el.value === 'tetap') setTimeout(() => { const x = document.querySelector(`[data-act="ptTetap"][data-k="${el.dataset.k}"]`); if (x) x.focus(); }, 30);
    },
    ptTetap: (el) => { const [i, f] = el.dataset.k.split('.'); P.ptS.pt[UI.daftarPt()[+i]].kolom[f] = 'tetap:' + el.value; },
    ptSimpan: async (el) => {
      const d = P.ptPayload();
      if (!d.url) return U.toast('Tempel link spreadsheet database KUR PMI.', 'warn');
      if (!Object.keys(d.pt).length) return U.toast('Pilih sheet untuk minimal 1 PT.', 'warn');
      el.disabled = true; const l = el.innerHTML; el.innerHTML = '<span class="spin"></span> Membaca & menerapkan…';
      const r = await Api.call('pmi.pt.simpan', d, { timeout: 180000 });
      el.disabled = false; el.innerHTML = l;
      if (!r.success) return U.toast(r.message, 'err', 8000);
      U.toast(r.message, r.data.peringatan && r.data.peringatan.length ? 'warn' : 'ok', 8000);
      P.ptS.urlKetik = '';
      await App.muatData(false);
      await P.muatPt();
    },
    ptPutus: async () => {
      if (!(await U.konfirmasi({ title: 'Putuskan sumber KUR PMI per PT?', body: 'Debitur KUR PMI kembali diambil dari sheet Debitur (kolom Produk & PT_PMI). Spreadsheet KUR PMI tidak diubah.', ok: 'Putuskan' }))) return;
      const r = await Api.call('pmi.pt.hapus', {});
      if (!r.success) return U.toast(r.message, 'err');
      U.toast(r.message, 'ok'); await App.muatData(false); await P.muatPt();
    },
    // --- akses data
    akSeg: (el) => { P.akD.peran[el.dataset.k].s = el.value; ulang(); },
    akNpp: (el) => { P.akD.peran[el.dataset.k].n = el.checked ? 1 : 0; ulang(); },
    akDown: (el) => { P.akD.peran[el.dataset.k].d = el.checked ? 1 : 0; ulang(); },     // v1.7
    akPmi: (el) => { P.akD.pmiBuka = el.checked; ulang(); },                            // v1.8: KUR PMI tanpa filter peran
    akKol: (el) => { if (el.value) P.akD.kol[el.dataset.k] = el.value; else delete P.akD.kol[el.dataset.k]; ulang(); },
    akProd: (el) => { const l = P.akD.seg[el.dataset.g], k = el.dataset.k; if (el.checked) { if (!l.includes(k)) l.push(k); } else l.splice(l.indexOf(k), 1); ulang(); },
    akUnit: (el) => { P.akD.unit[+el.dataset.i][el.dataset.f] = el.value.trim(); const b = document.querySelector('[data-act="akSimpan"]'); if (b) b.disabled = false; },
    akUnitHapus: (el) => { P.akD.unit.splice(+el.dataset.i, 1); ulang(); },
    akUnitTambah: () => { P.akD.unit.push({ k: '', n: '' }); ulang(); setTimeout(() => { const x = document.querySelectorAll('[data-act="akUnit"][data-f="k"]'); if (x.length) x[x.length - 1].focus(); }, 30); },
    akUnitBawaan: () => { P.akD.unit = JSON.parse(JSON.stringify(P.ak.bawaan.unit)); ulang(); },
    akBatal: () => { P.akD = JSON.parse(P._akAsli); ulang(); },
    akCek: async (el) => {
      const i = document.getElementById('akCekNpp'), v = (i && i.value || '').trim();
      if (!v) return U.toast('Isi NPP dulu, mis. 67221.', 'warn');
      P.akCekNpp = v; el.disabled = true; const l = el.innerHTML; el.innerHTML = '<span class="spin"></span> Memeriksa…';
      const r = await Api.call('akses.cek', { npp: v }, { timeout: 90000 });
      el.disabled = false; el.innerHTML = l;
      P.akCekR = r.success ? r.data : { galat: r.message };
      const k = document.getElementById('akCek'); if (k) k.outerHTML = P.kartuCekNpp(); else ulang();
    },
    akSimpan: async (el) => {
      const D = P.akD;
      D.segV = 3;                                     // v1.7: daftar produk segmen terbaru (KPP SUPPLY / KPP DEMAND)
      D.unit = D.unit.filter((u) => u.k || u.n);
      el.disabled = true; const l = el.innerHTML; el.innerHTML = '<span class="spin"></span> Menyimpan…';
      const r = await Api.call('akses.simpan', { akses: D }, { timeout: 120000 });
      el.disabled = false; el.innerHTML = l;
      if (!r.success) return U.toast(r.message, 'err', 6000);
      S.setting = Object.assign(S.setting, r.data.setting || {}); if (S.adminSet) S.adminSet.setting = Object.assign(S.adminSet.setting || {}, r.data.setting || {});
      P._akAsli = undefined; P.ak = null;
      await App.muatData(false);
      App.segarNav(); App.simpanLokal();
      U.toast(r.message, 'ok', 5000);
      ulang();
    }
  });
})();
