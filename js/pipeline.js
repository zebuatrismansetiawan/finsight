/* ==========================================================================
   FinSight — pipeline.js : v1.7 Pipeline kredit
   Sub halaman: Pipeline SME (RM) & Pipeline SBP (PRM/ARM).
   - Mini dashboard: jumlah pipeline, total nominal pipeline & total baki debet portofolio
     RM / PRM / ARM di pipeline (base data tanggal terbaru — dihitung server).
   - Hak lihat & ubah dicek di server (RM/PRM: atas nama sendiri, BBM/BM: bawahannya, Super Admin: semua).
   ========================================================================== */
'use strict';

const PIPE = {
  data: null, muat: false, t: 0,
  KOL_SME: [['nm', 'Nama Debitur'], ['bu', 'Bidang Usaha'], ['rm', 'Nama RM'], ['sf', 'Sifat Kredit'], ['jk', 'Jenis Kredit'], ['mk', 'Maks Kredit Saat Ini'], ['mm', 'Maks. Menjadi'], ['rc', 'Rencana Pencairan'], ['sp', 'Spoke'],
    ['w1', 'Progress W1'], ['w2', 'Progress W2'], ['w3', 'Progress W3'], ['w4', 'Progress W4'], ['w5', 'Progress W5'], ['pt', 'PHR Tabungan'], ['pk', 'PHR Kartu Kredit'], ['pp', 'PHR Payroll']],
  KOL_SBP: [['nm', 'Nama Debitur'], ['bu', 'Bidang Usaha'], ['rm', 'Nama PRM/ARM'], ['sf', 'Sifat Kredit'], ['os', 'Outstanding Saat Ini'], ['jk', 'Jenis Kredit'], ['fk', 'Fasilitas Kredit'], ['nom', 'Nominal Pengajuan'], ['net', 'Net Baki Debet'],
    ['kw', 'Kewenangan'], ['rb', 'Rencana Booking']]
};

Pages.pipeline = {
  judul: 'Pipeline',
  /** Segmen aktif: dari rute (#/pipeline?seg=SBP) atau bawaan peran (PRM/ARM → SBP). */
  seg() {
    const p = App.param();
    if (p.seg === 'SME' || p.seg === 'SBP') return p.seg;
    const d = PIPE.data;
    if (d && d.opsi && d.opsi.rm) { if (!d.opsi.rm.SME.length && d.opsi.rm.SBP.length) return 'SBP'; }
    const c = (S.ds && S.ds.cakupan) || S.cakupan;
    return c && c.s === 'SBP' ? 'SBP' : 'SME';
  },
  f() { return S.f.pipe = Object.assign({ q: '', per: '', np: '' }, S.f.pipe || {}); },
  rows(seg) {
    const f = this.f(), q = f.q.trim().toLowerCase();
    return ((PIPE.data && PIPE.data.rows) || []).filter((r) => r.seg === seg && (!f.per || r.per === f.per) && (!f.np || r.np === f.np) &&
      (!q || [r.nm, r.bu, r.rm, r.np, r.jk, r.sp].join(' ').toLowerCase().includes(q)));
  },
  ringkas(seg, L) {
    const bd = (PIPE.data && PIPE.data.bd) || {};
    const rm = {};
    L.forEach((r) => {
      const x = rm[r.np] || (rm[r.np] = { np: r.np, nm: r.rm, n: 0, nom: 0, net: 0, bd: (bd[r.np] || {}).bd || 0, deb: (bd[r.np] || {}).n || 0 });
      x.n++; x.nom += seg === 'SME' ? r.rc : r.nom; x.net += seg === 'SME' ? r.mm : r.net;
    });
    const per = Object.keys(rm).map((k) => rm[k]).sort((a, b) => b.nom - a.nom);
    return { n: L.length, nom: per.reduce((s, x) => s + x.nom, 0), net: per.reduce((s, x) => s + x.net, 0), bd: per.reduce((s, x) => s + x.bd, 0),
      mk: L.reduce((s, r) => s + (r.mk || 0), 0), os: L.reduce((s, r) => s + (r.os || 0), 0), baru: L.filter((r) => r.sf === 'Baru').length, per };
  },
  render() {
    const { esc, ic } = U;
    const seg = this.seg(), f = this.f(), D = PIPE.data;
    const actions = `${D ? `<button class="btn btn-secondary" data-act="xlsx">${ic('xls', 17, 'pos')} Unduh Excel</button>` : ''}
      <button class="btn btn-primary pipe-add" data-act="tambah" ${D ? '' : 'disabled'}>${ic('plus', 17)} Tambah pipeline</button>`;
    let h = UI.head({ crumb: ['Portofolio Kredit', 'Pipeline', seg], title: 'Pipeline ' + seg,
      sub: seg === 'SME' ? 'Rencana kredit segmen SME yang dikelola <b>RM</b> — progress mingguan W1–W5 & potensi PHR (Tabungan, Kartu Kredit, Payroll).' : 'Rencana kredit segmen SBP yang dikelola <b>PRM / ARM</b> — nominal pengajuan, net baki debet & rencana booking W1–W5.', actions });
    h += `<nav class="subnav pipe-nav" aria-label="Sub halaman pipeline">${['SME', 'SBP'].map((g) => {
      const n = D ? D.rows.filter((r) => r.seg === g).length : 0;
      return `<a href="#/pipeline?seg=${g}" class="${seg === g ? 'on' : ''}">${ic(g === 'SME' ? 'building' : 'store', 16)}<span>Pipeline ${g} <small>${g === 'SME' ? 'RM' : 'PRM/ARM'}</small></span>${D ? `<em>${U.num(n)}</em>` : ''}</a>`;
    }).join('')}</nav>`;
    if (!D) return h + `<div class="card pad">${PIPE.galat ? `<div class="alert alert-neg">${ic('alertc', 16)}<div>${esc(PIPE.galat)}</div></div>` : '<span class="spin"></span> Memuat pipeline…'}</div>`;
    const L = this.rows(seg), R = this.ringkas(seg, L);
    const opsiRm = (D.opsi.rm[seg] || []);
    const periodes = Array.from(new Set(D.rows.filter((r) => r.seg === seg).map((r) => r.per).concat([D.periode]))).filter(Boolean).sort().reverse();
    // --- mini dashboard
    const kartu = (icon, c, label, v, sub) => `<div class="card pipe-k" style="--c:${c}"><span class="pipe-ki">${ic(icon, 20)}</span><div><span class="pipe-kl">${label}</span><b class="pipe-kv tnum">${v}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
    h += `<section class="pipe-dash">
      ${kartu('kanban', '#7C3AED', 'Jumlah pipeline', U.num(R.n), `${U.num(R.baru)} baru • ${U.num(R.n - R.baru)} tambahan`)}
      ${kartu('wallet', '#DB2777', 'Total nominal pipeline', U.rpJ(R.nom), seg === 'SME' ? 'Σ Rencana Pencairan' : 'Σ Nominal Pengajuan')}
      ${kartu(seg === 'SME' ? 'up' : 'zap', '#0EA5E9', seg === 'SME' ? 'Total maks. menjadi' : 'Total net baki debet', U.rpJ(R.net), seg === 'SME' ? 'dari maks. saat ini ' + U.rpJ(R.mk) : 'Nominal − outstanding ' + U.rpJ(R.os))}
      ${kartu('bank', '#16A34A', 'Total baki debet ' + (seg === 'SME' ? 'RM' : 'PRM/ARM'), U.rpJ(R.bd), `${U.num(R.per.length)} ${seg === 'SME' ? 'RM' : 'PRM/ARM'} • data ${D.tgl ? esc(U.tgl(D.tgl)) : 'terbaru'}`)}
    </section>`;
    if (R.per.length) {
      const mx = Math.max(1, ...R.per.map((x) => x.nom));
      h += `<section class="card pipe-rm"><div class="card-h pad"><div><h3>${ic('users', 18, 'pink')} Per ${seg === 'SME' ? 'RM' : 'PRM / ARM'}</h3><p>Nominal pipeline dibanding baki debet portofolio (base data tanggal terbaru)</p></div></div>
        <div class="pipe-rm-l">${R.per.map((x) => `<div class="pipe-rm-i"><div class="pipe-rm-h"><span class="avatar xs">${esc(U.inisial(x.nm))}</span><div><b>${esc(x.nm)}</b><small class="tnum">NPP ${esc(x.np)} • ${U.num(x.n)} pipeline</small></div></div>
          <div class="pipe-bar"><i style="width:${Math.max(3, x.nom / mx * 100)}%"></i></div>
          <div class="pipe-rm-v"><span>Pipeline <b class="tnum">${U.rpJ(x.nom)}</b></span><span>Baki debet <b class="tnum">${U.rpJ(x.bd)}</b> <small class="muted">${U.num(x.deb)} deb.</small></span></div></div>`).join('')}</div></section>`;
    }
    // --- filter
    h += `<div class="card fbar"><div class="row-g wrap">
      <div class="inp-ic sm">${ic('search', 16)}<input type="search" data-act="q" placeholder="Cari debitur, bidang usaha, RM…" value="${esc(f.q)}"></div>
      <label class="sel-wrap">${ic('calendar', 15)}<select class="sel plain" data-act="per"><option value="">Semua periode</option>${periodes.map((p) => `<option value="${esc(p)}" ${f.per === p ? 'selected' : ''}>${esc(U.periodeLabel(p, true))}</option>`).join('')}</select></label>
      ${opsiRm.length > 1 ? `<label class="sel-wrap">${ic('user', 15)}<select class="sel plain" data-act="np"><option value="">Semua ${seg === 'SME' ? 'RM' : 'PRM/ARM'}</option>${opsiRm.map((u) => `<option value="${esc(u.npp)}" ${f.np === u.npp ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}</select></label>` : ''}
      <span class="sp"></span><span class="muted">${ic('shield', 14)} Cakupan: <b class="tx">${esc({ semua: 'semua pipeline', SME: 'pipeline SME', SBP: 'pipeline SBP', bawahan: 'Anda & bawahan', sendiri: 'atas nama Anda' }[D.cakupan] || D.cakupan)}</b></span></div></div>`;
    h += `<section class="card tbl-card" id="pipeTbl">${this.tabel(seg, L)}</section>`;
    return h;
  },
  tabel(seg, L) {
    const { esc, ic } = U;
    if (!L.length) return App.kosong('kanban', 'Belum ada pipeline', 'Klik <b>Tambah pipeline</b> untuk mencatat rencana kredit ' + seg + '.');
    const rp = (v) => `<td class="num tnum">${v ? U.rpJ(v) : '<span class="muted">—</span>'}</td>`;
    const tx = (v, cls) => `<td class="${cls || ''}">${v ? esc(v) : '<span class="muted">—</span>'}</td>`;
    const sifat = (v) => `<td class="c"><span class="pill ${v === 'Baru' ? 'pill-pos' : 'pill-info'}">${esc(v)}</span></td>`;
    const aksi = (r) => `<td class="c"><div class="acts"><button class="btn-icon sm" data-act="edit" data-id="${esc(r.id)}" title="Ubah">${ic('edit', 15)}</button><button class="btn-icon sm" data-act="hapus" data-id="${esc(r.id)}" title="Hapus">${ic('trash', 15)}</button></div></td>`;
    const namaDeb = (r) => `<td class="stick"><div class="pipe-nm"><b>${esc(r.nm)}</b><small class="muted">${esc(r.bu || '—')}</small></div></td>`;
    const rmC = (r) => `<td><div class="pipe-nm"><b>${esc(r.rm || r.np)}</b><small class="muted tnum">NPP ${esc(r.np)} • ${esc(U.periodeLabel(r.per))}</small></div></td>`;
    let head, body;
    if (seg === 'SME') {
      head = `<th class="c">No</th><th class="stick-h">Nama Debitur / Bidang Usaha</th><th>Nama RM</th><th class="c">Sifat</th><th>Jenis Kredit</th><th class="num">Maks Kredit Saat Ini</th><th class="num">Maks. Menjadi</th><th class="num">Rencana Pencairan</th><th>Spoke</th>${[1, 2, 3, 4, 5].map((w) => `<th class="pipe-w">W${w}</th>`).join('')}<th>PHR Tabungan</th><th>PHR Kartu Kredit</th><th>PHR Payroll</th><th class="c">Aksi</th>`;
      body = L.map((r, i) => `<tr><td class="c muted">${i + 1}</td>${namaDeb(r)}${rmC(r)}${sifat(r.sf)}${tx(r.jk)}${rp(r.mk)}${rp(r.mm)}<td class="num tnum b pink">${U.rpJ(r.rc)}</td>${tx(r.sp, 'nw')}
        ${[1, 2, 3, 4, 5].map((w) => `<td class="pipe-w">${r['w' + w] ? `<span class="pipe-wt">${esc(r['w' + w])}</span>` : '<span class="muted">—</span>'}</td>`).join('')}${tx(r.pt)}${tx(r.pk)}${tx(r.pp)}${aksi(r)}</tr>`).join('');
    } else {
      head = `<th class="c">No</th><th class="stick-h">Nama Debitur / Bidang Usaha</th><th>Nama PRM/ARM</th><th class="c">Sifat</th><th>Jenis Kredit</th><th class="c">Fasilitas</th><th class="num">Outstanding Saat Ini</th><th class="num">Nominal Pengajuan</th><th class="num">Net Baki Debet</th><th>Kewenangan</th><th class="c">Rencana Booking</th><th class="c">Aksi</th>`;
      body = L.map((r, i) => `<tr><td class="c muted">${i + 1}</td>${namaDeb(r)}${rmC(r)}${sifat(r.sf)}<td>${UI.prod(r.jk)}</td><td class="c"><span class="tag">${esc(r.fk)}</span></td>${rp(r.sf === 'Tambahan' ? r.os : 0)}<td class="num tnum b">${U.rpJ(r.nom)}</td><td class="num tnum b pink">${U.rpJ(r.net)}</td>${tx(r.kw)}<td class="c"><span class="pipe-wk">${esc(r.rb)}</span></td>${aksi(r)}</tr>`).join('');
    }
    const R = this.ringkas(seg, L);
    const foot = seg === 'SME'
      ? `<tr class="tot"><td></td><td><b>Total</b></td><td></td><td></td><td></td><td class="num tnum"><b>${U.rpJ(R.mk)}</b></td><td class="num tnum"><b>${U.rpJ(R.net)}</b></td><td class="num tnum"><b>${U.rpJ(R.nom)}</b></td><td colspan="10"></td></tr>`
      : `<tr class="tot"><td></td><td><b>Total</b></td><td></td><td></td><td></td><td></td><td class="num tnum"><b>${U.rpJ(R.os)}</b></td><td class="num tnum"><b>${U.rpJ(R.nom)}</b></td><td class="num tnum"><b>${U.rpJ(R.net)}</b></td><td colspan="3"></td></tr>`;
    return `<div class="card-h pad"><div><h3>${ic('list', 18, 'pink')} Daftar Pipeline ${esc(seg)}</h3><p>${U.num(L.length)} pipeline • nominal dalam Juta (Jt) / Miliar (M)</p></div></div>
      <div class="tbl-wrap"><table class="tbl tbl-pipe"><thead><tr>${head}</tr></thead><tbody>${body}${foot}</tbody></table></div>`;
  },
  async mount(root) {
    pasangAksi(root, this);
    if ((!PIPE.data || Date.now() - PIPE.t > 60000) && !PIPE.muat) await this.muatData();     // segarkan bila > 1 menit
  },
  async muatData() {
    PIPE.muat = true;
    const r = await Api.call('pipeline.list', {});
    PIPE.muat = false; PIPE.t = Date.now();
    if (r.success) { PIPE.data = r.data; PIPE.galat = ''; } else PIPE.galat = r.message;
    if (App.halaman === 'pipeline') App.render({ tetap: true });
  },
  /** Angka rupiah dari input bertitik (1.500.000.000) → 1500000000. */
  angka(v) { const n = Number(String(v || '').replace(/[^\d]/g, '')); return isFinite(n) ? n : 0; },
  form(r) {
    const { esc, ic } = U;
    const seg = r ? r.seg : this.seg(), D = PIPE.data, baru = !r;
    const opsiRm = D.opsi.rm[seg] || [];
    if (!opsiRm.length) return U.toast(seg === 'SME' ? 'Belum ada pengguna peran RM yang dapat dipilih.' : 'Belum ada pengguna peran PRM / ARM yang dapat dipilih.', 'warn', 6000);
    r = r || { seg, nm: '', bu: '', np: opsiRm.length === 1 ? opsiRm[0].npp : (opsiRm.find((u) => u.npp === S.me.npp) || {}).npp || '', sf: 'Baru', jk: '', fk: '', mk: 0, mm: 0, rc: 0, os: 0, nom: 0, net: 0, sp: '', kw: '', rb: '', per: D.periode,
      w1: '', w2: '', w3: '', w4: '', w5: '', pt: '', pk: '', pp: '' };
    const uang = (id, v, ph) => `<div class="inp-ic rp-in"><span class="rp-pre">Rp</span><input id="${id}" inputmode="numeric" value="${v ? U.num(v) : ''}" placeholder="${ph || '0'}" autocomplete="off"></div>`;
    const pilih = (id, L, v, kosong) => `<select id="${id}" class="sel">${kosong ? `<option value="">${kosong}</option>` : ''}${L.map((x) => { const val = Array.isArray(x) ? x[0] : x, lbl = Array.isArray(x) ? x[1] : x; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lbl)}</option>`; }).join('')}</select>`;
    const spoke = (D.opsi.spoke || []).map((u) => { const l = (u.k ? u.k + ' - ' : '') + (u.n || ''); return [l, l]; });
    if (r.sp && !spoke.some((x) => x[0] === r.sp)) spoke.unshift([r.sp, r.sp]);
    const rmL = opsiRm.map((u) => [u.npp, u.nama + ' (' + u.npp + ')']);
    const umum = `<div class="form-g g2">
        <label class="fld span2"><span>Nama Debitur <b class="neg">*</b></span><input id="pNm" maxlength="100" value="${esc(r.nm)}" placeholder="mis. PT Maju Bersama" autofocus></label>
        <label class="fld"><span>Bidang Usaha</span><input id="pBu" maxlength="120" value="${esc(r.bu)}" placeholder="mis. Distributor bahan bangunan"></label>
        <label class="fld"><span>${seg === 'SME' ? 'Nama RM' : 'Nama PRM / ARM'} <b class="neg">*</b></span>${pilih('pNp', rmL, r.np, opsiRm.length > 1 ? '— Pilih —' : '')}${opsiRm.length === 1 ? '<small class="muted">Sesuai akun Anda.</small>' : ''}</label>
        <label class="fld"><span>Sifat Kredit <b class="neg">*</b></span>${pilih('pSf', ['Baru', 'Tambahan'], r.sf)}</label>
        <label class="fld"><span>Periode pipeline</span><input id="pPer" type="month" value="${esc(r.per || D.periode)}"></label></div>`;
    const sme = `<div class="form-g g3">
        <label class="fld"><span>Jenis Kredit</span><input id="pJk" maxlength="60" value="${esc(r.jk)}" placeholder="mis. KMK RC"></label>
        <label class="fld"><span>Maks Kredit Saat Ini</span>${uang('pMk', r.mk)}</label>
        <label class="fld"><span>Maks. Menjadi</span>${uang('pMm', r.mm)}</label>
        <label class="fld"><span>Rencana Pencairan</span>${uang('pRc', r.rc)}</label>
        <label class="fld span2"><span>Spoke (unit / kantor)</span>${pilih('pSp', spoke, r.sp, '— Pilih unit —')}</label></div>
      <h5 class="dt-sub">${ic('calendar', 14)} Progress mingguan</h5>
      <div class="form-g g5 pipe-wf">${[1, 2, 3, 4, 5].map((w) => `<label class="fld"><span>W${w}</span><textarea id="pW${w}" rows="2" maxlength="300" placeholder="Progress minggu ${w}">${esc(r['w' + w])}</textarea></label>`).join('')}</div>
      <h5 class="dt-sub">${ic('spark', 14)} PHR</h5>
      <div class="form-g g3"><label class="fld"><span>PHR Tabungan</span><input id="pPt" maxlength="120" value="${esc(r.pt)}"></label><label class="fld"><span>PHR Kartu Kredit</span><input id="pPk" maxlength="120" value="${esc(r.pk)}"></label><label class="fld"><span>PHR Payroll</span><input id="pPp" maxlength="120" value="${esc(r.pp)}"></label></div>`;
    const sbp = `<div class="form-g g3">
        <label class="fld"><span>Jenis Kredit <b class="neg">*</b></span>${pilih('pJk', D.opsi.jenis, r.jk, '— Pilih —')}</label>
        <label class="fld"><span>Fasilitas Kredit <b class="neg">*</b></span>${pilih('pFk', D.opsi.fasilitas, r.fk, '— Pilih —')}</label>
        <label class="fld"><span>Kewenangan <b class="neg">*</b></span>${pilih('pKw', D.opsi.kewenangan, r.kw, '— Pilih —')}</label>
        <label class="fld" id="fOs"><span>Outstanding Saat Ini</span>${uang('pOs', r.os)}<small class="muted">Diisi bila sifat kredit Tambahan.</small></label>
        <label class="fld"><span>Nominal Pengajuan <b class="neg">*</b></span>${uang('pNom', r.nom)}</label>
        <label class="fld"><span>Net Baki Debet <small class="muted">(otomatis)</small></span><div class="pipe-net tnum" id="pNet">Rp 0</div><small class="muted" id="pNetK"></small></label>
        <label class="fld"><span>Rencana Booking <b class="neg">*</b></span>${pilih('pRb', D.opsi.booking, r.rb, '— Pilih minggu —')}</label></div>`;
    const m = U.modal({
      title: (baru ? 'Tambah' : 'Ubah') + ' Pipeline ' + seg, size: 'lg', cls: 'pipe-modal',
      body: umum + (seg === 'SME' ? sme : sbp),
      footer: `<button class="btn btn-ghost" data-x="0">Batal</button><button class="btn btn-primary" data-x="1">${ic('check', 16)} Simpan pipeline</button>`
    });
    const $m = (s) => m.el.querySelector(s);
    if (opsiRm.length === 1) $m('#pNp').disabled = true;
    m.el.querySelectorAll('.rp-in input').forEach((i) => { i.oninput = () => { const n = this.angka(i.value); i.value = n ? U.num(n) : ''; hitung(); }; });
    const hitung = () => {
      if (seg !== 'SBP') return;
      const tam = $m('#pSf').value === 'Tambahan';
      $m('#fOs').classList.toggle('off', !tam); $m('#pOs').disabled = !tam;
      const nom = this.angka($m('#pNom').value), os = tam ? this.angka($m('#pOs').value) : 0;
      $m('#pNet').textContent = U.rp(nom - os);
      $m('#pNet').classList.toggle('neg', nom - os < 0);
      $m('#pNetK').textContent = tam ? 'Nominal Pengajuan − Outstanding Saat Ini' : 'Kredit baru: Net = Nominal Pengajuan';
    };
    $m('#pSf').onchange = hitung; hitung();
    $m('[data-x="0"]').onclick = m.close;
    $m('[data-x="1"]').onclick = async (ev) => {
      const b = ev.currentTarget, v = (id) => { const e = $m(id); return e ? e.value : ''; };
      const d = { id: baru ? '' : r.id, seg, nm: v('#pNm'), bu: v('#pBu'), np: v('#pNp'), sf: v('#pSf'), per: v('#pPer') };
      if (seg === 'SME') Object.assign(d, { jk: v('#pJk'), mk: this.angka(v('#pMk')), mm: this.angka(v('#pMm')), rc: this.angka(v('#pRc')), sp: v('#pSp'),
        w1: v('#pW1'), w2: v('#pW2'), w3: v('#pW3'), w4: v('#pW4'), w5: v('#pW5'), pt: v('#pPt'), pk: v('#pPk'), pp: v('#pPp') });
      else Object.assign(d, { jk: v('#pJk'), fk: v('#pFk'), kw: v('#pKw'), os: this.angka(v('#pOs')), nom: this.angka(v('#pNom')), rb: v('#pRb') });
      if (!d.nm.trim()) return U.toast('Nama Debitur wajib diisi.', 'warn');
      if (!d.np) return U.toast('Pilih ' + (seg === 'SME' ? 'RM' : 'PRM / ARM') + '.', 'warn');
      b.disabled = true; b.innerHTML = '<span class="spin"></span> Menyimpan…';
      const res = await Api.call('pipeline.simpan', d);
      b.disabled = false; b.innerHTML = `${ic('check', 16)} Simpan pipeline`;
      if (!res.success) return U.toast(res.message, 'err', 6000);
      m.close(); U.toast(res.message, 'ok');
      await this.muatData();
    };
  },
  act: {
    tambah: () => Pages.pipeline.form(null),
    edit: (el) => { const r = (PIPE.data.rows || []).find((x) => x.id === el.dataset.id); if (r) Pages.pipeline.form(r); },
    hapus: async (el) => {
      const r = (PIPE.data.rows || []).find((x) => x.id === el.dataset.id);
      if (!r || !await U.konfirmasi({ title: 'Hapus pipeline?', body: `Pipeline <b>${U.esc(r.nm)}</b> (${U.esc(r.rm)}) akan dihapus.`, ok: 'Hapus', bahaya: true })) return;
      const res = await Api.call('pipeline.hapus', { id: r.id });
      U.toast(res.message, res.success ? 'ok' : 'err');
      if (res.success) await Pages.pipeline.muatData();
    },
    q: (el) => { Pages.pipeline.f().q = el.value; const P = Pages.pipeline, t = document.getElementById('pipeTbl'); if (t) t.innerHTML = P.tabel(P.seg(), P.rows(P.seg())); },
    per: (el) => { Pages.pipeline.f().per = el.value; App.render({ tetap: true }); },
    np: (el) => { Pages.pipeline.f().np = el.value; App.render({ tetap: true }); },
    xlsx: () => {
      const P = Pages.pipeline, seg = P.seg(), L = P.rows(seg);
      if (!L.length) return U.toast('Tidak ada pipeline untuk diunduh.', 'warn');
      const K = seg === 'SME' ? PIPE.KOL_SME : PIPE.KOL_SBP, uangK = ['mk', 'mm', 'rc', 'os', 'nom', 'net'];
      const cols = [{ h: 'No', t: 'num', w: 6 }, { h: 'Periode', w: 12 }, { h: 'NPP', w: 9 }].concat(K.map((k) => ({ h: k[1], t: uangK.includes(k[0]) ? 'rp' : '', w: uangK.includes(k[0]) ? 18 : k[0] === 'nm' ? 30 : 18, sum: uangK.includes(k[0]) })));
      const rows = L.map((r, i) => [i + 1, U.periodeLabel(r.per, true), r.np].concat(K.map((k) => (uangK.includes(k[0]) ? (k[0] === 'os' && r.sf !== 'Tambahan' ? 0 : r[k[0]] || 0) : r[k[0]] || ''))));
      App.eksporXlsx('Pipeline ' + seg, cols, rows, 'Pipeline ' + seg + (P.f().per ? ' — ' + U.periodeLabel(P.f().per, true) : ''), [], { satuan: 'pipeline', lembar: 'Pipeline ' + seg });
    }
  }
};
