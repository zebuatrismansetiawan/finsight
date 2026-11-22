/* ==========================================================================
   FinSight — pages.js : komponen UI bersama + halaman
   Semua halaman dirender dari state di memori (S) → pindah menu instan.
   ========================================================================== */
'use strict';

// ============================================================================
//  KOMPONEN UI
// ============================================================================
const UI = (() => {
  const { esc, ic } = U;
  const warnaProd = (k) => (S.prodMap[k] || {}).warna || '#64748B';
  const prod = (k) => `<span class="chip-p" style="--c:${warnaProd(k)}">${esc(k)}</span>`;
  const kol = (k, kecil) => `<span class="kol k${k}"><i></i>Kol. ${k}${kecil ? '' : ' <em>(' + KOL[k].s + ')</em>'}</span>`;
  const status = (s) => `<span class="pill ${s === 'Aktif' ? 'pill-pos' : 'pill-grey'}">${esc(s)}</span>`;
  function jtInfo(d) {
    if (!d.aktif) return '<small class="jt muted">Lunas</small>';
    if (d.dd === null) return '';
    if (d.dd < 0) return `<small class="jt neg"><i></i>Lewat ${-d.dd} hr</small>`;
    if (d.dd === 0) return '<small class="jt warn"><i></i>Hari ini</small>';
    return `<small class="jt ${d.dd <= 3 ? 'warn' : 'pos'}"><i></i>${d.dd <= 7 ? 'H-' + d.dd : d.dd + ' hr lagi'}</small>`;
  }
  function logStatus(s) {
    const m = { Terkirim: ['pill-pos', 'check'], Gagal: ['pill-neg', 'x'], Antre: ['pill-info', 'hourglass'], Batal: ['pill-grey', 'ban'], Mengirim: ['pill-info', 'send'] }[s] || ['pill-grey', 'info'];
    return `<span class="pill ${m[0]}">${ic(m[1], 12)}${esc(s)}</span>`;
  }
  /** pill perubahan %. buruk=true → kenaikan diberi warna merah. */
  function delta(v, buruk, suffix = '') {
    if (v === null || v === undefined || !isFinite(v)) return '';
    const naik = v > 0.05, turun = v < -0.05;
    const baik = buruk ? turun : naik, jelek = buruk ? naik : turun;
    return `<span class="dl ${baik ? 'good' : jelek ? 'bad' : 'flat'}">${ic(naik ? 'arrowup' : turun ? 'arrowdown' : 'arrowright', 12)}${v > 0 ? '+' : ''}${U.dec(v, 1)}%${suffix}</span>`;
  }
  function kpi({ icon, c, label, v, unit = '', badge = '', foot = null, vcls = '', tip = '' }) {
    return `<div class="card kpi" ${tip ? `data-tip="${esc(tip)}"` : ''}><div class="kpi-glow" style="--c:${c}"></div>
      <div class="kpi-top"><span class="kpi-ic" style="--c:${c}">${ic(icon, 21)}</span>${badge}</div>
      <div class="kpi-l">${esc(label)}</div>
      <div class="kpi-v tnum ${vcls}">${v}${unit ? ` <small>${esc(unit)}</small>` : ''}</div>
      ${foot ? `<div class="kpi-f"><span>${foot[0]}</span><b class="tnum ${foot[2] || ''}">${foot[1]}</b></div>` : ''}</div>`;
  }
  function head({ crumb, title, sub, actions = '', pre = '' }) {
    return `<section class="ph">${pre}<div class="ph-l">${crumb ? `<div class="crumb">${crumb.map((c, i) => `<span class="${i === crumb.length - 1 ? 'on' : ''}">${esc(c)}</span>`).join('<i>/</i>')}</div>` : ''}
      <h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="ph-a">${actions}</div></section>`;
  }
  function pager(total, hal, per, opsiPer = [10, 25, 50, 100]) {
    const n = Math.max(1, Math.ceil(total / per));
    hal = Math.min(Math.max(1, hal), n);
    const a = total ? (hal - 1) * per + 1 : 0, b = Math.min(total, hal * per);
    const nomor = [];
    const add = (x) => { if (!nomor.includes(x)) nomor.push(x); };
    add(1); for (let i = hal - 1; i <= hal + 1; i++) if (i > 1 && i < n) add(i); if (n > 1) add(n);
    nomor.sort((x, y) => x - y);
    let btn = '', prev = 0;
    nomor.forEach((x) => { if (x - prev > 1) btn += '<span class="pg-gap">…</span>'; btn += `<button class="pg-b ${x === hal ? 'on' : ''}" data-act="hal" data-v="${x}">${x}</button>`; prev = x; });
    return `<div class="pager"><div class="pg-info">Menampilkan <b>${U.num(a)}–${U.num(b)}</b> dari <b>${U.num(total)}</b>
      ${opsiPer ? `<label class="pg-per">Baris <select data-act="per">${opsiPer.map((o) => `<option ${o === per ? 'selected' : ''}>${o}</option>`).join('')}</select></label>` : ''}</div>
      <div class="pg"><button class="pg-b" data-act="hal" data-v="${hal - 1}" ${hal <= 1 ? 'disabled' : ''} aria-label="Sebelumnya">${ic('left', 15)}</button>${btn}<button class="pg-b" data-act="hal" data-v="${hal + 1}" ${hal >= n ? 'disabled' : ''} aria-label="Selanjutnya">${ic('right', 15)}</button></div></div>`;
  }
  const th = (label, k, f, cls = '') => `<th class="sort ${cls} ${f.sort === k ? 'on' : ''}" data-act="sort" data-k="${k}" aria-sort="${f.sort === k ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}">${label}<span class="sa">${f.sort === k ? ic(f.dir > 0 ? 'arrowup' : 'arrowdown', 12) : ''}</span></th>`;
  function urut(list, k, dir) {
    const v = (d) => (k === 'jt' ? (d.jt || '9999') : d[k]);
    return list.slice().sort((a, b) => { const x = v(a), y = v(b); return (typeof x === 'string' ? x.localeCompare(y, 'id') : x - y) * dir; });
  }
  const halaman = (list, f) => { const n = Math.max(1, Math.ceil(list.length / f.per)); if (f.hal > n) f.hal = n; if (f.hal < 1) f.hal = 1; return list.slice((f.hal - 1) * f.per, f.hal * f.per); };
  const uang = (n, cls = '') => `<td class="num ${cls}"><span class="rp">Rp</span>${U.num(n)}</td>`;
  const prodSelect = (val, act, semua = 'Semua Produk', kecuali = []) => `<select class="sel" data-act="${act}"><option value="">${semua}</option>${S.produk.filter((p) => !kecuali.includes(p.kode)).map((p) => `<option value="${esc(p.kode)}" ${val === p.kode ? 'selected' : ''}>${esc(p.kode)}</option>`).join('')}</select>`;
  const bisaKirim = () => App.boleh('blast');
  /** Mitra KUR PMI: nama PT dicocokkan tanpa membedakan huruf/tanda baca & awalan "PT". */
  const normPt = (v) => String(v || '').toLowerCase().replace(/^\s*p\.?\s*t\.?\s+/, '').replace(/[^a-z0-9]/g, '');
  function daftarPt() {
    let a = null; try { a = JSON.parse(S.setting.PMI_PT || ''); } catch (e) { a = null; }
    return (Array.isArray(a) ? a : ['PT Minori Pemagang', 'PT Minori SSW', 'PT Aji', 'PT Nagomi']).map((x) => String(x || '').trim()).filter(Boolean);
  }
  /** Nama PT baku (sesuai daftar Mitra KUR PMI) agar variasi penulisan tampil seragam. */
  function namaPt(v) { const k = normPt(v); return daftarPt().find((x) => normPt(x) === k) || String(v || '').trim(); }
  /** Kunci grup PT seorang debitur: 'k:<norm>' (terdaftar) | '__lain' | '__kosong'. */
  function grupPt(d, peta) {
    if (!d.pt) return '__kosong';
    const k = normPt(d.pt);
    return peta[k] !== undefined ? 'k:' + k : '__lain';
  }
  const snapBanner = () => S.periode !== S.periodeIni
    ? `<div class="alert alert-info">${U.ic('calendar', 16)}<div>Menampilkan <b>snapshot akhir ${U.periodeLabel(S.periode, true)}</b>. Angka per debitur (jatuh tempo, risiko) hanya tersedia untuk periode berjalan. <a href="#" data-per-ini="1">Kembali ke periode berjalan</a></div></div>` : '';
  function chipsFilter(items) {
    if (!items.length) return '';
    return `<div class="fchips"><span class="muted">Filter:</span>${items.map((x) => `<span class="fchip">${esc(x[0])}<button data-act="unf" data-k="${x[1]}" aria-label="Hapus filter">${ic('x', 12)}</button></span>`).join('')}<button class="btn-link sm" data-act="reset">Reset</button></div>`;
  }
  return { prod, kol, status, jtInfo, logStatus, delta, kpi, head, pager, th, urut, halaman, uang, prodSelect, bisaKirim, snapBanner, chipsFilter, warnaProd, normPt, daftarPt, grupPt, namaPt };
})();

/** Delegasi event per halaman: data-act → handler di Pages[x].act */
function pasangAksi(root, page) {
  const go = (e, tipe) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const fn = page.act && page.act[el.dataset.act];
    if (!fn) return;
    const tag = el.tagName;
    if (tipe === 'click' && (tag === 'SELECT' || (tag === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'button'))) return;
    if (tipe === 'change' && !(tag === 'SELECT' || (tag === 'INPUT' && ['checkbox', 'radio', 'date', 'file'].includes(el.type)))) return;
    if (tipe === 'input' && !((tag === 'INPUT' && !['checkbox', 'radio', 'date', 'file'].includes(el.type)) || tag === 'TEXTAREA')) return;
    if (tipe === 'click' && tag === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) return;
    if (tag === 'A' || (tag === 'BUTTON' && el.type !== 'submit')) e.preventDefault();
    fn(el, e);
  };
  root.onclick = (e) => go(e, 'click');
  root.onchange = (e) => go(e, 'change');
  const tunda = U.debounce((e) => go(e, 'input'), 140);
  root.oninput = (e) => (e.target.type === 'range' ? go(e, 'input') : tunda(e));
}

const Pages = {};

// ============================================================================
//  DASHBOARD
// ============================================================================
Pages.dashboard = {
  judul: 'Dashboard',
  render() {
    const { esc, ic } = U;
    const f = S.f.dash || (S.f.dash = { pr: 'ALL', mode: 'rp' });
    const p = S.periode, live = p === S.periodeIni, prev = U.periodeGeser(p, -1);
    const A = M.agregat(p, f.pr), B = M.agregat(prev, f.pr);
    const K = live ? M.kpi(f.pr) : null;
    const jh = Number(S.setting.JT_HARI) || 30;
    const prodNama = f.pr === 'ALL' ? `Semua Produk (${S.produk.length})` : f.pr;
    const actions = `
      <label class="sel-wrap">${ic('layers', 16)}<select class="sel plain" data-act="pr"><option value="ALL">Semua Produk (${S.produk.length})</option>${S.produk.map((x) => `<option value="${esc(x.kode)}" ${f.pr === x.kode ? 'selected' : ''}>${esc(x.nama)}</option>`).join('')}</select></label>
      ${UI.bisaKirim() ? `<a class="btn btn-primary" href="#/blast">${ic('send', 17)} Kirim WA Blast</a>` : ''}`;
    const pre = `<div class="ph-tags"><span class="tag">Portofolio ${esc(p.slice(0, 4))}</span><span class="live-t"><i></i>${live ? 'Terhubung — hampir real-time' : 'Snapshot ' + U.periodeLabel(p)}</span></div>`;
    let h = UI.head({ pre, title: 'Dashboard', sub: `Ringkasan kondisi portofolio kredit & performa ${S.produk.length} produk per ${live ? U.tgl(S.hariIni, true) : 'akhir ' + U.periodeLabel(p, true)}`, actions });
    h += UI.snapBanner();
    if (!A) return h + App.kosong('calendar', 'Belum ada snapshot untuk periode ini', 'Snapshot dibuat otomatis setiap malam oleh pemicu harian.');

    const pl = U.rpParts(A.plafon), bk = U.rpParts(A.baki);
    const util = A.plafon ? A.baki / A.plafon * 100 : 0;
    h += `<section class="grid g3">` +
      UI.kpi({ icon: 'users', c: '#8B5CF6', label: 'Jumlah Debitur', v: U.num(A.n), unit: 'Debitur', badge: UI.delta(B ? M.delta(A.n, B.n) : null), foot: ['Aktif • Lunas', `${U.num(A.aktif)} • ${U.num(A.lunas)}`], tip: B ? `Bulan lalu: ${U.num(B.n)} debitur` : 'Belum ada snapshot bulan lalu' }) +
      UI.kpi({ icon: 'wallet', c: '#F43F7A', label: 'Total Maks Kredit', v: esc(pl.a), unit: pl.u, badge: UI.delta(B ? M.delta(A.plafon, B.plafon) : null), foot: ['Perubahan vs bulan lalu', B ? (A.plafon - B.plafon >= 0 ? '+' : '') + U.rpS(A.plafon - B.plafon) : '—', B && A.plafon >= B.plafon ? 'pos' : ''] }) +
      UI.kpi({ icon: 'bank', c: '#3B82F6', label: 'Total Baki Debet (OS)', v: esc(bk.a), unit: bk.u, badge: UI.delta(B ? M.delta(A.baki, B.baki) : null), foot: ['Utilisasi kredit', U.pct(util) + ' dari plafon'] }) +
      UI.kpi({ icon: 'ok', c: '#16A34A', label: 'Kredit Lunas', v: U.num(A.lunas), unit: 'Debitur', badge: UI.delta(B ? M.delta(A.lunas, B.lunas) : null), foot: K ? ['Total plafon lunas', U.rpS(K.plLunas), 'pos'] : ['Sumber', 'Snapshot'] }) +
      UI.kpi({ icon: 'calclock', c: '#EA580C', label: `Jatuh Tempo ≤ ${jh} Hari`, v: K ? U.num(K.jt) : '—', unit: K ? 'Debitur' : '', vcls: 'warn', badge: K && K.jt ? `<span class="badge-w">${ic('alert', 12)} Perlu tindakan</span>` : '', foot: K ? ['Angsuran tertagih', U.rpS(K.jtAn)] : ['Tersedia untuk', 'periode berjalan'] }) +
      UI.kpi({ icon: 'up', c: '#2563EB', label: 'Baki Debet < 50% Plafon', v: K ? U.num(K.lt50) : '—', unit: K ? 'Debitur' : '', badge: K && K.lt50 ? `<span class="badge-i">${ic('zap', 12)} Potensi top-up</span>` : '', foot: K ? ['Plafon belum terserap', U.rpS(K.lt50Sisa), 'info'] : ['Tersedia untuk', 'periode berjalan'] }) +
      `</section>`;

    // --- grafik per produk & donut
    const pp = live ? M.perProduk() : S.produk.map((x) => Object.assign({ kode: x.kode, nama: x.nama, warna: x.warna }, (A.pp && A.pp[x.kode]) || { n: 0, plafon: 0, baki: 0 }));
    const totBaki = pp.reduce((s, x) => s + x.baki, 0), totPl = pp.reduce((s, x) => s + x.plafon, 0);
    const cats = pp.map((x) => f.mode === 'n'
      ? { label: x.kode, color: x.warna, a: x.n, b: live ? x.aktif : x.n, extra: live ? `Berisiko: ${U.num(x.risiko)}` : '' }
      : { label: x.kode, color: x.warna, a: x.plafon, b: x.baki, extra: `${U.num(x.n)} debitur` });
    const bar = f.mode === 'n'
      ? Chart.barGroup({ cats, la: 'Total debitur', lb: 'Debitur aktif', fmt: (v) => U.num(v) + ' deb.', fmtAxis: (v) => U.num(v) })
      : Chart.barGroup({ cats, la: 'Plafon disetujui', lb: 'Baki debet berjalan', fmt: U.rpS, fmtAxis: (v) => U.rpS(v) });
    const nRisk = K ? K.risiko : 0;
    h += `<section class="grid g12 eq">
      <div class="card c8 pad-l">
        <div class="card-h"><div><h3><span class="sq"></span>Performa per Produk Kredit</h3><p>${f.mode === 'n' ? 'Total debitur vs debitur aktif per produk' : 'Plafon disetujui vs baki debet berjalan per produk'}</p></div>
          <div class="seg"><button class="${f.mode !== 'n' ? 'on' : ''}" data-act="mode" data-v="rp">Nominal</button><button class="${f.mode === 'n' ? 'on' : ''}" data-act="mode" data-v="n">Debitur</button></div></div>
        <div class="chart-wrap">${bar}</div>
        <div class="card-f"><div class="legend"><span><i class="lg-a"></i>${f.mode === 'n' ? 'Total debitur' : 'Plafon disetujui'}</span><span><i class="lg-b"></i>${f.mode === 'n' ? 'Debitur aktif' : 'Baki debet berjalan'}</span></div>
          <span class="muted">Plafon terserap: <b class="tx">${U.pct(totPl ? totBaki / totPl * 100 : 0)}</b> • Buffer tersisa: <b class="pos">${U.rpS(totPl - totBaki)}</b></span></div>
      </div>
      <div class="card c4 pad-l">
          <div class="card-h"><h3>Komposisi Baki Debet</h3><span class="tag">${U.periodeLabel(p)}</span></div>
          <div class="donut-box">${Chart.donut({ segs: pp.map((x) => ({ label: x.nama, value: x.baki, color: x.warna })), center: U.rpS(totBaki), sub: 'Total OS', fmt: U.rpS })}</div>
          <ul class="dleg">${pp.map((x) => `<li><span><i style="background:${x.warna}"></i>${esc(x.nama)}</span><span class="tnum muted">${U.rpS(x.baki)}</span><b class="tnum">${U.pct(totBaki ? x.baki / totBaki * 100 : 0, 0)}</b></li>`).join('')}</ul>
      </div></section>`;

    // --- pita produk
    h += `<section class="ribbon">${pp.map((x) => {
      const bp = B && B.pp ? B.pp[x.kode] : null;
      const icn = { BWU: 'store', CCC: 'card', KUR: 'building', 'KUR PMI': 'plane', KPP: 'factory' }[x.kode] || 'layers';
      return `<button class="card rb" data-act="prod" data-v="${esc(x.kode)}" style="--c:${x.warna}"><span class="rb-ic">${ic(icn, 21)}</span><span class="rb-t"><span class="rb-h"><b>${esc(x.kode)}</b>${bp ? UI.delta(M.delta(x.baki, bp.baki)) : ''}</span><b class="tnum">${U.rpS(x.baki)}</b><small>${U.num(x.n)} debitur</small></span></button>`;
    }).join('')}</section>`;

    // --- prioritas tindakan
    if (live) {
      const top = M.risiko(f.pr).slice().sort((a, b) => b.kurang - a.kurang).slice(0, 5);
      h += `<section class="card tbl-card">
        <div class="card-h pad"><div><h3>${ic('alert', 19, 'neg')} Prioritas Tindakan: Debitur Berisiko Menunggak</h3><p>Kekurangan saldo terbesar pada rekening autodebet menjelang jatuh tempo angsuran</p></div>
        <div class="row-g">${UI.bisaKirim() && nRisk ? `<button class="btn btn-soft" data-act="blastRisk">${ic('send', 16)} Kirim pengingat massal (${U.num(nRisk)})</button>` : ''}</div></div>
        ${top.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">#</th><th>Nama Debitur / Rek</th><th>Produk</th><th>Kolektibilitas</th><th class="num">Baki Debet</th><th class="num">Angsuran / Bln</th><th class="num">Saldo Rekening</th><th class="num">Kekurangan Saldo</th><th class="c">Aksi</th></tr></thead><tbody>
        ${top.map((d, i) => `<tr><td class="c muted">${i + 1}</td><td class="stick"><button class="lnk" data-detail="${esc(d.id)}"><b>${esc(d.nm)}</b></button><small class="muted">${esc(d.rek)} • ${d.dd === null ? '-' : d.dd < 0 ? 'Lewat ' + -d.dd + ' hr' : 'H-' + d.dd} jatuh tempo</small></td><td>${UI.prod(d.pr)}</td><td>${UI.kol(d.kol)}</td>${UI.uang(d.bd)}${UI.uang(d.an, 'muted')}${UI.uang(d.sa, 'warn b')}<td class="num"><span class="short">-Rp ${U.num(d.kurang)}</span></td>
          <td class="c">${UI.bisaKirim() ? `<button class="btn btn-sm btn-secondary" data-wa="${esc(d.id)}" ${d.wv && !d.oo ? '' : 'disabled title="Nomor tidak valid / opt-out"'}>${ic('chat', 15, 'pink')} Kirim WA</button>` : `<button class="btn btn-sm btn-secondary" data-detail="${esc(d.id)}">${ic('eye', 15)} Detail</button>`}</td></tr>`).join('')}
        </tbody></table></div>` : App.kosong('ok', 'Tidak ada debitur berisiko', 'Semua debitur aktif memiliki saldo cukup untuk angsuran.')}
        <div class="card-f pad"><span class="muted">Menampilkan ${top.length} dari ${U.num(nRisk)} debitur berisiko</span><a href="#/risiko" class="lnk-a">Lihat semua debitur berisiko ${ic('arrowright', 15)}</a></div></section>`;
    }
    return h;
  },
  mount(root) { pasangAksi(root, this); },
  act: {
    pr: (el) => { S.f.dash.pr = el.value; App.render({ tetap: true }); },
    mode: (el) => { S.f.dash.mode = el.dataset.v; App.render({ tetap: true }); },
    prod: (el) => { S.f.deb = Object.assign(S.f.deb || {}, { pr: el.dataset.v, hal: 1 }); App.go('debitur'); },
    blastRisk: () => App.blastKe(M.risiko(S.f.dash.pr).map((d) => d.id), 'Dashboard — debitur berisiko')
  }
};

// ============================================================================
//  KUALITAS KREDIT (KOL. 1–5)
// ============================================================================
Pages.kualitas = {
  judul: 'Kualitas Kredit',
  render() {
    const { esc, ic } = U;
    const f = S.f.kual || (S.f.kual = { pr: 'ALL', donut: 'n', tren: 'n', q: '', mv: '', hal: 1, per: 10 });
    const p = S.periode, live = p === S.periodeIni, prev = U.periodeGeser(p, -1);
    const A = M.agregat(p, f.pr), B = M.agregat(prev, f.pr);
    const actions = `<button class="btn btn-secondary" data-act="unduh">${ic('download', 17)} Unduh Ringkasan</button>
      ${UI.bisaKirim() && live ? `<button class="btn btn-primary" data-act="tindak">${ic('send', 17)} Buat Tindak Lanjut Kol</button>` : ''}`;
    let h = UI.head({ crumb: ['Pengawasan Kredit', 'Kolektibilitas OJK'], title: 'Kualitas Kredit', sub: 'Komposisi dan pergerakan kolektibilitas kredit (Kolektibilitas 1 sampai 5) — debitur aktif', actions });
    h += UI.snapBanner();
    const nAll = live ? M.kol('ALL').n : (M.agregat(p, 'ALL') || { aktif: 0 }).aktif;
    const K = A ? A.kol : null;
    const tot = K ? [1, 2, 3, 4, 5].reduce((s, k) => s + K[k].n, 0) : 0;
    const totB = K ? [1, 2, 3, 4, 5].reduce((s, k) => s + K[k].b, 0) : 0;
    const npl = totB ? (K[3].b + K[4].b + K[5].b) / totB * 100 : 0;
    h += `<div class="card fbar"><div class="chips"><span class="lbl">Produk pinjaman:</span>
      <button class="chip ${f.pr === 'ALL' ? 'on' : ''}" data-act="pr" data-v="ALL">Semua Produk (${U.num(nAll)})</button>
      ${S.produk.map((x) => `<button class="chip ${f.pr === x.kode ? 'on' : ''}" data-act="pr" data-v="${esc(x.kode)}" style="--c:${x.warna}">${esc(x.nama)}</button>`).join('')}</div>
      <div class="row-g"><span class="tag lg">Total portofolio: <b class="tnum">${U.rpS(totB)}</b></span><span class="tag lg neg" data-tip="NPL gross = baki Kol. 3–5 ÷ total baki debitur aktif"><i class="pulse"></i>NPL (Kol. 3–5): <b class="tnum">${U.pct(npl, 2)}</b></span></div></div>`;
    if (!A) return h + App.kosong('calendar', 'Belum ada snapshot untuk periode ini', '');

    const ket = { 1: 'Porsi portofolio', 2: 'Dalam perhatian khusus', 3: 'Menunggak 91–120 hari', 4: 'Menunggak 121–180 hari', 5: 'Menunggak > 180 hari' };
    const icn = { 1: 'badge', 2: 'eye', 3: 'hourglass', 4: 'alert', 5: 'gavel' };
    h += `<section class="grid g5">${[1, 2, 3, 4, 5].map((k) => {
      const x = K[k], porsi = tot ? x.n / tot * 100 : 0, bp = B && B.kol ? B.kol[k] : null;
      return `<div class="card kolc k${k}"><div class="kpi-glow" style="--c:${KOL[k].c}"></div><div class="kpi-top"><span class="kpi-ic soft" style="--c:${KOL[k].c}">${ic(icn[k], 21)}</span>${UI.delta(bp ? M.delta(x.n, bp.n) : null, k > 1, ' MoM')}</div>
        <div class="kolc-l"><i style="background:${KOL[k].c}"></i>Kol. ${k} <em>${KOL[k].n}</em></div>
        <div class="kpi-v tnum ${k === 5 ? 'neg' : ''}">${U.num(x.n)}</div>
        <div class="kolc-b"><span>Baki debet</span><b class="tnum">${U.rpS(x.b)}</b></div>
        <div class="bar thin"><i style="width:${Math.max(porsi, 0.6)}%;background:${KOL[k].c}"></i></div>
        <div class="kolc-f"><span>${ket[k]}</span><b class="tnum">${U.pct(porsi)}</b></div></div>`;
    }).join('')}</section>`;

    // donut + tren
    const val = (k) => (f.donut === 'b' ? K[k].b : K[k].n);
    const totD = [1, 2, 3, 4, 5].reduce((s, k) => s + val(k), 0);
    const perf = totD ? (val(1) + val(2)) / totD * 100 : 0;
    const per = M.periodes().filter((x) => x <= p).slice(-6);
    const series = [1, 2, 3, 4, 5].map((k) => ({ label: 'Kol. ' + k, color: KOL[k].c, values: per.map((x) => { const a = M.agregat(x, f.pr); return a ? (f.tren === 'b' ? a.kol[k].b : a.kol[k].n) : null; }) }));
    h += `<section class="grid g12 eq">
      <div class="card c5 pad-l"><div class="card-h"><div><h3>Komposisi Kolektibilitas</h3><p>Berdasarkan ${f.donut === 'b' ? 'baki debet' : 'jumlah debitur'} per ${U.periodeLabel(p)}</p></div>
        <div class="seg"><button class="${f.donut !== 'b' ? 'on' : ''}" data-act="donut" data-v="n">Debitur</button><button class="${f.donut === 'b' ? 'on' : ''}" data-act="donut" data-v="b">Baki</button></div></div>
        <div class="kol-donut">${Chart.donut({ segs: [1, 2, 3, 4, 5].map((k) => ({ label: 'Kol. ' + k + ' — ' + KOL[k].n, value: val(k), color: KOL[k].c })), center: f.donut === 'b' ? U.rpS(totD) : U.num(totD), sub: f.donut === 'b' ? 'Total baki' : 'Total debitur', size: 176, fmt: f.donut === 'b' ? U.rpS : (v) => U.num(v) + ' debitur' })}
          <ul class="kleg">${[1, 2, 3, 4, 5].map((k) => `<li><span><i style="background:${KOL[k].c}"></i>Kol. ${k}</span><span class="r"><b class="tnum ${k === 5 ? 'neg' : ''}">${U.pct(totD ? val(k) / totD * 100 : 0)}</b><small>${f.donut === 'b' ? U.rpS(val(k)) : U.num(val(k)) + ' deb.'}</small></span></li>`).join('')}</ul></div>
        <div class="alert alert-pos sm">${ic('shield', 16)}<div>Tingkat kesehatan kredit: <b>${U.pct(perf)}</b> portofolio berada dalam kategori <i>performing</i> (Kol. 1 & 2).</div></div></div>
      <div class="card c7 pad-l"><div class="card-h"><div><h3>Tren Pergerakan Kolektibilitas</h3><p>Evolusi ${per.length} bulan terakhir (${U.periodeLabel(per[0])} – ${U.periodeLabel(per[per.length - 1])}) dari Snapshot_Kol</p></div>
        <div class="seg"><button class="${f.tren === 'b' ? 'on' : ''}" data-act="tren" data-v="b">Baki (Rp)</button><button class="${f.tren !== 'b' ? 'on' : ''}" data-act="tren" data-v="n">Debitur</button></div></div>
        <div class="chart-wrap">${Chart.lines({ labels: per.map((x) => U.periodeLabel(x)), series, fmt: f.tren === 'b' ? U.rpS : (v) => U.num(v), fmtAxis: f.tren === 'b' ? (v) => U.rpS(v) : (v) => U.num(v) })}</div>
        <div class="legend c">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div>
        ${per.length < 2 ? `<p class="muted sm c">${ic('info', 13)} Tren terbentuk otomatis setiap akhir bulan dari pemicu snapshot harian.</p>` : ''}</div>
    </section>`;

    // tabel pergerakan
    if (!live) return h + `<div class="card pad">${App.kosong('info', 'Pergerakan per debitur', 'Tabel pergerakan hanya tersedia untuk periode berjalan (dibandingkan dengan kondisi awal bulan).')}</div>`;
    let L = M.gerak(f.pr);
    const nTurun = L.filter((d) => d.mv > 0).length, nNaik = L.length - nTurun;
    if (f.mv === 'turun') L = L.filter((d) => d.mv > 0); else if (f.mv === 'naik') L = L.filter((d) => d.mv < 0);
    if (f.q) { const q = f.q.toLowerCase(); L = L.filter((d) => d.q.includes(q)); }
    L = L.slice().sort((a, b) => b.mv - a.mv || b.bd - a.bd);
    const rows = UI.halaman(L, f);
    const adaBase = S.ds && S.ds.adaBaseline !== false;
    h += `<section class="card tbl-card"><div class="card-h pad"><div><h3>Pergerakan Kolektibilitas Debitur <span class="tag pink">${U.num(nTurun + nNaik)} perubahan bulan ini</span></h3>
        <p>Debitur yang mengalami kenaikan (upgrade) atau penurunan (downgrade) kol. dibanding awal ${U.periodeLabel(S.periodeIni, true)} — ${U.num(nTurun)} turun, ${U.num(nNaik)} naik.</p></div>
      <div class="row-g"><div class="inp-ic sm">${ic('search', 16)}<input type="search" data-act="q" placeholder="Cari nama, ID, CIF…" value="${esc(f.q)}"></div>
      <select class="sel" data-act="mv"><option value="">Semua pergerakan</option><option value="turun" ${f.mv === 'turun' ? 'selected' : ''}>Hanya downgrade (perburukan)</option><option value="naik" ${f.mv === 'naik' ? 'selected' : ''}>Hanya upgrade (pemulihan)</option></select></div></div>
      <div id="kualTbl">${this.tabel(rows, L.length, f, adaBase)}</div></section>`;
    return h;
  },
  tabel(rows, total, f, adaBase) {
    const { esc, ic } = U;
    if (!adaBase) return App.kosong('info', 'Baseline awal bulan belum tersedia', 'Baseline dibuat otomatis oleh snapshot. Super Admin dapat menjalankan “Snapshot sekarang” di Pengaturan → Sinkronisasi.');
    if (!total) return App.kosong('ok', 'Tidak ada pergerakan', 'Belum ada debitur yang berubah kolektibilitas pada periode ini (atau tidak cocok dengan filter).');
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">#</th><th>Nama Debitur</th><th>Produk</th><th class="c">Kol. Lalu</th><th></th><th class="c">Kol. Kini</th><th>Status Perubahan</th><th class="num">Baki Debet</th><th class="num">Saldo Rekening</th><th class="c">Tindakan</th></tr></thead><tbody>
      ${rows.map((d, i) => {
        const turun = d.mv > 0, npl = turun && d.kl <= 2 && d.kol >= 3, macet = d.kol === 5 && turun;
        const st = macet ? `<span class="pill pill-neg strong">${ic('alert', 12)} Jatuh ke NPL macet</span>` : npl ? `<span class="pill pill-neg">${ic('arrowdown', 12)} Turun (DPK → NPL)</span>` : turun ? `<span class="pill pill-neg">${ic('arrowdown', 12)} Turun (downgrade)</span>` : `<span class="pill pill-pos">${ic('arrowup', 12)} Naik (upgrade)</span>`;
        const aksi = turun && UI.bisaKirim() ? `<button class="btn btn-sm ${macet ? 'btn-danger' : 'btn-secondary'}" data-wa="${esc(d.id)}">${ic(macet ? 'gavel' : 'send', 14)} ${macet ? 'Tindak lanjut' : 'Tindak lanjut'}</button>` : `<button class="btn btn-sm btn-ghost" data-detail="${esc(d.id)}">${ic('eye', 14)} Detail</button>`;
        return `<tr class="${macet ? 'row-neg' : ''}"><td class="c muted">${(f.hal - 1) * f.per + i + 1}</td>
        <td class="stick"><button class="lnk" data-detail="${esc(d.id)}"><b class="${macet ? 'neg' : ''}">${esc(d.nm)}</b></button><small class="muted">${esc(d.pic || '')}${d.rm ? ' • RM ' + esc(d.rm) : ''}</small></td>
        <td>${UI.prod(d.pr)}</td><td class="c">${UI.kol(d.kl, true)}</td><td class="c ${turun ? 'neg' : 'pos'}">${ic('arrowright', 17)}</td><td class="c">${UI.kol(d.kol, true)}</td><td>${st}</td>
        <td class="num b ${macet ? 'neg' : ''}">${U.rpS(d.bd)}</td><td class="num muted">${U.rpS(d.sa)}</td><td class="c">${aksi}</td></tr>`;
      }).join('')}</tbody></table></div>${UI.pager(total, f.hal, f.per)}`;
  },
  mount(root) { pasangAksi(root, this); },
  segar() {
    const f = S.f.kual;
    let L = M.gerak(f.pr);
    if (f.mv === 'turun') L = L.filter((d) => d.mv > 0); else if (f.mv === 'naik') L = L.filter((d) => d.mv < 0);
    if (f.q) { const q = f.q.toLowerCase(); L = L.filter((d) => d.q.includes(q)); }
    L = L.slice().sort((a, b) => b.mv - a.mv || b.bd - a.bd);
    const el = document.getElementById('kualTbl');
    if (el) el.innerHTML = this.tabel(UI.halaman(L, f), L.length, f, S.ds.adaBaseline !== false);
  },
  act: {
    pr: (el) => { S.f.kual.pr = el.dataset.v; S.f.kual.hal = 1; App.render({ tetap: true }); },
    donut: (el) => { S.f.kual.donut = el.dataset.v; App.render({ tetap: true }); },
    tren: (el) => { S.f.kual.tren = el.dataset.v; App.render({ tetap: true }); },
    q: (el) => { S.f.kual.q = el.value; S.f.kual.hal = 1; Pages.kualitas.segar(); },
    mv: (el) => { S.f.kual.mv = el.value; S.f.kual.hal = 1; Pages.kualitas.segar(); },
    hal: (el) => { S.f.kual.hal = +el.dataset.v; Pages.kualitas.segar(); },
    per: (el) => { S.f.kual.per = +el.value; S.f.kual.hal = 1; Pages.kualitas.segar(); },
    tindak: () => {
      const ids = M.gerak(S.f.kual.pr).filter((d) => d.mv > 0).map((d) => d.id);
      if (!ids.length) return U.toast('Tidak ada debitur yang turun kolektibilitas.', 'info');
      App.blastKe(ids, 'Tindak lanjut penurunan Kol.');
    },
    unduh: () => {
      const f = S.f.kual, p = S.periode, A = M.agregat(p, f.pr);
      if (!A) return;
      const tot = [1, 2, 3, 4, 5].reduce((s, k) => s + A.kol[k].n, 0), totB = [1, 2, 3, 4, 5].reduce((s, k) => s + A.kol[k].b, 0);
      const ring = [1, 2, 3, 4, 5].map((k) => ['Kol. ' + k, KOL[k].n, A.kol[k].n, tot ? A.kol[k].n / tot : 0, A.kol[k].b, totB ? A.kol[k].b / totB : 0]);
      const gerak = M.gerak(f.pr).map((d) => [{ v: d.nm, l2: [d.pic, d.rm ? 'RM ' + d.rm : ''].filter(Boolean).join(' • ') }, d.pr, d.kl, d.kol, d.mv > 0 ? { v: 'Turun (downgrade)', c: 'neg' } : 'Naik (upgrade)', d.bd, d.sa]);
      const pp = [];
      S.produk.forEach((x) => { const a = M.agregat(p, x.kode); if (a) [1, 2, 3, 4, 5].forEach((k) => pp.push([x.kode, 'Kol. ' + k, a.kol[k].n, a.kol[k].b])); });
      App.eksporXlsx('Ringkasan Kualitas Kredit', [{ h: 'Kolektibilitas', t: 'kol', w: 14 }, { h: 'Kategori', w: 26 }, { h: 'Jumlah Debitur', t: 'num', w: 15, sum: true }, { h: 'Porsi Debitur', t: 'pct', w: 13 }, { h: 'Baki Debet', t: 'rp', w: 20, sum: true }, { h: 'Porsi Baki', t: 'pct', w: 12 }], ring,
        `Periode ${U.periodeLabel(p, true)}; Produk ${f.pr === 'ALL' ? 'semua' : f.pr}`,
        [{ name: 'Per Produk', judul: 'Kolektibilitas per Produk', cols: [{ h: 'Produk', t: 'prod', w: 12 }, { h: 'Kolektibilitas', t: 'kol', w: 14 }, { h: 'Jumlah Debitur', t: 'num', w: 15, sum: true }, { h: 'Baki Debet', t: 'rp', w: 20, sum: true }], rows: pp.map((r) => [r[0], r[1], r[2], r[3]]), satuan: 'baris' },
          { name: 'Pergerakan', judul: 'Pergerakan Kolektibilitas Debitur', cols: [{ h: 'Nama Debitur', t: 'ent', w: 34 }, { h: 'Produk', t: 'prod', w: 11 }, { h: 'Kol. Lalu', t: 'kol', w: 11 }, { h: 'Kol. Kini', t: 'kol', w: 11 }, { h: 'Status Perubahan', w: 20 }, { h: 'Baki Debet', t: 'rp', w: 18, sum: true }, { h: 'Saldo Rekening', t: 'rp', w: 17, sum: true }], rows: gerak, satuan: 'debitur' }],
        { ringkasan: [['Total debitur', U.num(tot)], ['Total baki debet', U.rpS(totB)], ['NPL (Kol. 3–5)', U.pct(tot ? (A.kol[3].n + A.kol[4].n + A.kol[5].n) / tot * 100 : 0)]], satuan: 'kolektibilitas' });
    }
  }
};

// ============================================================================
//  DAFTAR DEBITUR
// ============================================================================
// v1.2: dua sub-page — "Debitur Umum" (#/debitur, semua produk kecuali KUR PMI) dan
//       "Debitur KUR PMI" (#/debitur-pmi, dikelompokkan per PT penempatan yang diatur Super Admin).
const KODE_PMI = 'KUR PMI';
const PD = () => (App.halaman === 'debitur-pmi' ? Pages['debitur-pmi'] : Pages.debitur);
Pages.debitur = {
  judul: 'Daftar Debitur',
  mode: 'umum', kunciF: 'deb',
  f() { return S.f[this.kunciF] = Object.assign({ q: '', pr: '', pt: '', bt: '', st: 'Aktif', kol: '', jt: '', dari: '', sampai: '', sort: 'jt', dir: 1, hal: 1, per: 10 }, S.f[this.kunciF] || {}); },
  dasar() { return this.mode === 'pmi' ? S.D.filter((d) => d.pr === KODE_PMI) : S.D.filter((d) => d.pr !== KODE_PMI); },
  petaPt() { const m = {}; UI.daftarPt().forEach((n, i) => { m[UI.normPt(n)] = i; }); return m; },
  data(f) {
    let L = this.dasar();
    const q = (f.q || '').trim().toLowerCase(), h = S.hariIni;
    if (this.mode === 'pmi' && f.pt) { const pt = this.petaPt(); L = L.filter((d) => UI.grupPt(d, pt) === f.pt); }
    if (this.mode === 'pmi' && f.bt) L = L.filter((d) => (f.bt === '__kosong' ? !d.bt : d.bt === f.bt));
    if (f.pr && this.mode !== 'pmi') L = L.filter((d) => d.pr === f.pr);
    if (f.st) L = L.filter((d) => d.st === f.st);
    if (f.kol) L = L.filter((d) => (f.kol === 'npl' ? d.kol >= 3 : d.kol === +f.kol));
    if (f.jt === 'lewat') L = L.filter((d) => d.aktif && d.dd !== null && d.dd < 0);
    else if (f.jt === '7' || f.jt === '30') L = L.filter((d) => d.aktif && d.dd !== null && d.dd >= 0 && d.dd <= +f.jt);
    else if (f.jt === 'bulan') L = L.filter((d) => d.jt && d.jt.slice(0, 7) === h.slice(0, 7));
    else if (f.jt === 'rentang') L = L.filter((d) => d.jt && (!f.dari || d.jt >= f.dari) && (!f.sampai || d.jt <= f.sampai));
    if (q) L = L.filter((d) => d.q.includes(q) || d.wa.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'));
    return UI.urut(L, f.sort, f.dir);
  },
  labelFilter(f) {
    const jt = { lewat: 'Lewat jatuh tempo', 7: 'JT ≤ 7 hari', 30: 'JT ≤ 30 hari', bulan: 'JT bulan ini', rentang: `JT ${f.dari ? U.tgl(f.dari) : '…'} – ${f.sampai ? U.tgl(f.sampai) : '…'}` }[f.jt];
    const out = [];
    if (f.q) out.push(['Cari: “' + f.q + '”', 'q']);
    if (f.pr && this.mode !== 'pmi') out.push(['Produk: ' + f.pr, 'pr']);
    if (f.pt && this.mode === 'pmi') out.push(['PT: ' + this.namaGrup(f.pt), 'pt']);
    if (f.bt && this.mode === 'pmi') out.push(['Batch: ' + (f.bt === '__kosong' ? 'belum ada' : f.bt), 'bt']);
    if (f.st) out.push(['Status: ' + f.st, 'st']);
    if (f.kol) out.push([f.kol === 'npl' ? 'Kol. 3–5 (NPL)' : 'Kol. ' + f.kol, 'kol']);
    if (jt) out.push([jt, 'jt']);
    return out;
  },
  namaGrup(g) {
    if (g === '__kosong') return 'Belum diisi';
    if (g === '__lain') return 'PT lain (belum terdaftar)';
    const k = String(g).slice(2);
    return UI.daftarPt().find((n) => UI.normPt(n) === k) || k;
  },
  subNav() {
    const { ic } = U;
    const nU = S.D.filter((d) => d.pr !== KODE_PMI).length, nP = S.D.length - nU;
    return `<nav class="subnav" aria-label="Sub halaman Daftar Debitur">
      <a href="#/debitur" class="${this.mode === 'umum' ? 'on' : ''}">${ic('users', 16)}<span>Debitur Umum</span><em>${U.num(nU)}</em></a>
      <a href="#/debitur-pmi" class="${this.mode === 'pmi' ? 'on' : ''}">${ic('plane', 16)}<span>Debitur KUR PMI</span><em>${U.num(nP)}</em></a></nav>`;
  },
  chipsPt(f) {
    const { esc, ic } = U;
    const base = this.dasar(), pt = this.petaPt(), n = {};
    base.forEach((d) => { const g = UI.grupPt(d, pt); n[g] = (n[g] || 0) + 1; });
    const item = [['', 'Semua PT', base.length]].concat(UI.daftarPt().map((x) => ['k:' + UI.normPt(x), x, n['k:' + UI.normPt(x)] || 0]));
    if (n.__lain) item.push(['__lain', 'PT lain (belum terdaftar)', n.__lain]);
    if (n.__kosong) item.push(['__kosong', 'PT belum diisi', n.__kosong]);
    return `<div class="card pt-bar"><div class="pt-h"><span class="kpi-ic sm soft" style="--c:#7C3AED">${ic('building', 17)}</span><div><b>PT Penempatan</b><small>Kelompok debitur KUR PMI per PT mitra</small></div>
      ${S.me.peran === 'Admin' ? `<a class="lnk-a" href="#/pengaturan" data-act="kelolaPt">${ic('settings', 14)} Kelola daftar PT</a>` : ''}</div>
      <div class="pt-chips">${item.map((x) => `<button class="pt-c ${f.pt === x[0] ? 'on' : ''} ${x[0] === '__lain' || x[0] === '__kosong' ? 'warn' : ''}" data-act="pt" data-v="${esc(x[0])}">${esc(x[1])}<em>${U.num(x[2])}</em></button>`).join('')}</div></div>`;
  },
  render() {
    const { esc, ic } = U;
    const f = this.f(), pmi = this.mode === 'pmi';
    const actions = `<button class="btn btn-secondary" data-act="xlsx">${ic('xls', 17, 'pos')} Unduh Excel (.xlsx)</button>
      <button class="btn btn-secondary" data-act="pdf">${ic('pdf', 17, 'neg')} Unduh PDF Laporan</button>
      <button class="btn btn-primary" data-act="sync">${ic('refresh', 17)} Sinkronkan Google Sheets</button>`;
    let h = UI.head({ crumb: ['Portofolio Kredit', 'Daftar Debitur', pmi ? 'Debitur KUR PMI' : 'Debitur Umum'], title: pmi ? 'Debitur KUR PMI' : 'Daftar Debitur',
      sub: pmi ? 'Debitur KUR Pekerja Migran Indonesia, dikelompokkan per PT penempatan.' : 'Pencarian, pemfilteran komprehensif, dan ekspor data debitur portofolio (selain KUR PMI).', actions });
    h += this.subNav();
    h += this.bannerKunci();
    if (pmi) h += this.infoSumber() + this.chipsPt(f);
    h += `<div class="card fbar col">
      <div class="fgrid${pmi ? ' pmi' : ''}">
        <div class="inp-ic f4">${ic('search', 16)}<input type="search" id="debQ" data-act="q" placeholder="Cari nama, rek, CIF, kontak, no. HP…  (tekan /)" value="${esc(f.q)}"></div>
        ${pmi ? this.pilihBatch(f) : UI.prodSelect(f.pr, 'pr', 'Semua Produk', [KODE_PMI])}
        <select class="sel" data-act="st"><option value="">Semua Status</option><option value="Aktif" ${f.st === 'Aktif' ? 'selected' : ''}>Status: Aktif</option><option value="Lunas" ${f.st === 'Lunas' ? 'selected' : ''}>Status: Lunas</option></select>
        <select class="sel" data-act="kol"><option value="">Semua Kol (1–5)</option>${[1, 2, 3, 4, 5].map((k) => `<option value="${k}" ${String(f.kol) === String(k) ? 'selected' : ''}>Kol. ${k} (${KOL[k].n})</option>`).join('')}<option value="npl" ${f.kol === 'npl' ? 'selected' : ''}>Kol. 3–5 (NPL)</option></select>
        <select class="sel" data-act="jt"><option value="">Semua jatuh tempo</option><option value="lewat" ${f.jt === 'lewat' ? 'selected' : ''}>Lewat jatuh tempo</option><option value="7" ${f.jt === '7' ? 'selected' : ''}>≤ 7 hari ke depan</option><option value="30" ${f.jt === '30' ? 'selected' : ''}>≤ 30 hari ke depan</option><option value="bulan" ${f.jt === 'bulan' ? 'selected' : ''}>Bulan ini</option><option value="rentang" ${f.jt === 'rentang' ? 'selected' : ''}>Rentang tanggal…</option></select>
      </div>
      ${f.jt === 'rentang' ? `<div class="row-g sm"><label class="mini">Dari <input type="date" data-act="dari" value="${esc(f.dari)}"></label><label class="mini">Sampai <input type="date" data-act="sampai" value="${esc(f.sampai)}"></label></div>` : ''}
      <div id="debChips"></div></div>
      <div id="debArea"></div>
      <div class="card sync-banner"><span class="sb-ic">${ic('cloud', 22)}</span><div><b>Sinkronisasi spreadsheet aktif <span class="tag pos">Otomatis • cek tiap ${esc(S.setting.POLLING_DETIK || 30)} dtk</span></b>
        <p>Data debitur dibaca langsung dari Google Sheets. Penambahan & perubahan data dilakukan di spreadsheet; aplikasi bersifat monitoring (tidak mengubah data debitur).</p></div>
        ${S.adminSet && S.adminSet.sistem ? `<a class="lnk-a" href="${esc(S.adminSet.sistem.spreadsheetUrl)}" target="_blank" rel="noopener">Buka Google Sheets ${ic('ext', 15)}</a>` : ''}</div>`;
    return h;
  },
  mount(root) { pasangAksi(root, this); this.segar(); },
  segar() {
    const { esc, ic } = U;
    const f = this.f();
    const L = this.data(f);
    const ch = document.getElementById('debChips');
    if (ch) ch.innerHTML = UI.chipsFilter(this.labelFilter(f)) + `<div class="fcount"><i class="dotp"></i>Total: <b>${U.num(L.length)}</b> debitur</div>`;
    const akt = L.filter((d) => d.aktif), tb = L.reduce((s, d) => s + d.bd, 0);
    const k = { 1: 0, 2: 0, npl: 0 };
    akt.forEach((d) => { if (d.kol === 1) k[1]++; else if (d.kol === 2) k[2]++; else k.npl++; });
    const pc = (n) => (akt.length ? U.pct(n / akt.length * 100) : '0%');
    const rows = UI.halaman(L, f);
    const allSel = rows.length && rows.every((d) => S.sel.deb.has(d.id));
    const kirim = UI.bisaKirim(), pmi = this.mode === 'pmi';
    const area = document.getElementById('debArea');
    if (!area) return;
    area.innerHTML = `<div class="grid g4 mini-kpi">
        <div class="card mk"><div><span>Total baki debet</span><b class="tnum">${U.rpS(tb)}</b></div><i class="mk-ic" style="--c:#2563EB">${ic('wallet', 17)}</i></div>
        <div class="card mk"><div><span>Lancar (Kol. 1)</span><b class="tnum pos">${U.num(k[1])} <small>(${pc(k[1])})</small></b></div><i class="mk-ic" style="--c:#16A34A">${ic('badge', 17)}</i></div>
        <div class="card mk"><div><span>Perhatian (Kol. 2)</span><b class="tnum info">${U.num(k[2])} <small>(${pc(k[2])})</small></b></div><i class="mk-ic" style="--c:#2563EB">${ic('eye', 17)}</i></div>
        <div class="card mk"><div><span>NPL / Macet (Kol. 3–5)</span><b class="tnum neg">${U.num(k.npl)} <small>(${pc(k.npl)})</small></b></div><i class="mk-ic" style="--c:#E11D48">${ic('alert', 17)}</i></div></div>
      <div class="card tbl-card">
        <div class="bbar">${kirim ? `<label class="chk"><input type="checkbox" data-act="selPage" ${allSel ? 'checked' : ''}><span>Pilih semua (${rows.length} di halaman ini)</span></label>
          ${L.length > rows.length ? `<button class="btn-link sm" data-act="selAll">Pilih semua ${U.num(L.length)} hasil filter</button>` : ''}
          ${S.sel.deb.size ? `<button class="btn-link sm" data-act="selNone">Batal pilih</button>` : ''}` : `<span class="muted">${ic('eye', 14)} Mode lihat saja</span>`}
          <span class="sp"></span>
          ${S.setting.NAMA_CABANG ? `<span class="muted hide-m">Unit: <b class="tx">${esc(S.setting.NAMA_CABANG)}</b></span>` : ''}
          ${kirim ? `<button class="btn btn-sm btn-secondary" data-act="blastSel" ${S.sel.deb.size ? '' : 'disabled'}>${ic('send', 14)} Blast terpilih (${U.num(S.sel.deb.size)})</button>` : ''}
          <button class="btn btn-sm btn-secondary" data-act="cetak">${ic('print', 14)} Cetak</button></div>
        ${L.length ? `<div class="tbl-wrap"><table class="tbl tbl-deb"><thead><tr>${kirim ? '<th class="c w1"><span class="sr">Pilih</span></th>' : ''}
          ${UI.th('Entitas / Kontak', 'nm', f, 'stick-h')}${UI.th('Rek Pinjaman', 'rp', f)}${UI.th('Rek Afil', 'ra', f)}${pmi ? UI.th('PT Penempatan', 'pt', f) + UI.th('Batch', 'bt', f) + UI.th('Jangka Waktu', 'jw', f) : UI.th('Produk', 'pr', f, 'c')}${UI.th('Plafon', 'pl', f, 'num')}${UI.th('Baki Debet', 'bd', f, 'num')}${UI.th('Angsuran', 'an', f, 'num')}${UI.th('Saldo Blokir', 'sb', f, 'num')}${UI.th('Saldo Akhir', 'sa', f, 'num')}${UI.th('Jatuh Tempo', 'jt', f)}${UI.th('Kol. OJK', 'kol', f, 'c')}${UI.th('Status', 'st', f, 'c')}<th class="c">Aksi</th></tr></thead><tbody>
          ${rows.map((d) => `<tr class="${d.aktif ? '' : 'row-off'} ${S.sel.deb.has(d.id) ? 'row-sel' : ''}">${kirim ? `<td class="c"><input type="checkbox" data-act="sel" data-id="${esc(d.id)}" ${S.sel.deb.has(d.id) ? 'checked' : ''} aria-label="Pilih ${esc(d.nm)}"></td>` : ''}
            <td class="stick"><div class="ent"><span class="avatar xs" style="--c:${UI.warnaProd(d.pr)}">${esc(U.inisial(d.nm))}</span><div><button class="lnk" data-detail="${esc(d.id)}"><b>${esc(d.nm)}</b></button><small class="muted">${ic('phone', 11, d.wv ? 'pos' : 'neg')} ${esc(d.wa || 'tidak valid')}${d.pic ? ' • ' + esc(d.pic) : ''}${d.oo ? ' • <span class="neg">opt-out</span>' : ''}</small></div></div></td>
            <td class="rek tnum">${d.rek ? esc(d.rek) : '<span class="muted">—</span>'}</td><td class="rek tnum">${esc(d.ra)}</td>
            ${pmi ? `<td class="pt-cell"${d.pt && UI.namaPt(d.pt) !== d.pt ? ` title="Tertulis di data: ${esc(d.pt)}"` : ''}>${d.pt ? esc(UI.namaPt(d.pt)) : '<span class="muted">Belum diisi</span>'}</td><td class="nw">${d.bt ? esc(d.bt) : '<span class="muted">—</span>'}</td><td class="nw">${d.jw ? esc(d.jw) : '<span class="muted">—</span>'}</td>` : `<td class="c">${UI.prod(d.pr)}</td>`}<td class="num muted">${U.rpS(d.pl)}</td><td class="num b ${d.kol === 5 ? 'neg' : ''}">${U.rpS(d.bd)}</td><td class="num">${U.rpS(d.an)}</td>
            <td class="num ${d.fBlokir ? 'neg b' : ''}">${d.sb === null || d.sb === undefined ? (d.aktif ? '<span class="neg">Kosong</span>' : '') : U.rpS(d.sb)}</td><td class="num ${d.fSaldo ? 'neg b' : ''}">${U.rpS(d.sa)}</td>
            <td><b class="dt">${U.tgl2(d.jt)}</b>${UI.jtInfo(d)}</td><td class="c">${d.aktif ? UI.kol(d.kol, true) : ''}</td><td class="c">${UI.status(d.st)}</td>
            <td class="c"><div class="acts">${kirim && d.aktif ? `<button class="btn-icon sm pos" data-wa="${esc(d.id)}" title="Kirim WA" ${d.wv && !d.oo ? '' : 'disabled'}>${ic('chat', 15)}</button>` : ''}<button class="btn-icon sm" data-detail="${esc(d.id)}" title="Detail">${ic('eye', 15)}</button></div></td></tr>`).join('')}
          </tbody></table></div>${UI.pager(L.length, f.hal, f.per)}` : App.kosong('search', 'Tidak ada debitur yang cocok', 'Ubah kata kunci atau reset filter.')}
      </div>`;
  },
  /** v1.3: daftar batch KUR PMI (dari spreadsheet KUR PMI) untuk filter. */
  pilihBatch(f) {
    const { esc } = U;
    const n = {}; let kosong = 0;
    this.dasar().forEach((d) => { if (d.bt) n[d.bt] = (n[d.bt] || 0) + 1; else kosong++; });
    const ks = Object.keys(n).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    if (!ks.length) return `<select class="sel" data-act="bt" disabled><option>Batch (belum ada data)</option></select>`;
    return `<select class="sel" data-act="bt" aria-label="Filter batch"><option value="">Semua Batch</option>${ks.map((k) => `<option value="${esc(k)}" ${f.bt === k ? 'selected' : ''}>${esc(k)} (${U.num(n[k])})</option>`).join('')}${kosong ? `<option value="__kosong" ${f.bt === '__kosong' ? 'selected' : ''}>Batch belum ada (${U.num(kosong)})</option>` : ''}</select>`;
  },
  /** v1.3: keterangan sumber detail KUR PMI (spreadsheet terpisah). */
  infoSumber() {
    const { esc, ic } = U;
    const sp = S.ds && S.ds.sumberPmi, admin = S.me.peran === 'Admin';
    const nP = S.D.filter((d) => d.pr === KODE_PMI).length, nS = S.D.filter((d) => d.pr === KODE_PMI && d.sx).length;
    if (!sp) return admin ? `<div class="alert alert-info">${ic('link', 16)}<div>Detail KUR PMI (Nama, Nama Perusahaan, Jangka Waktu, Batch) masih dari sheet Debitur. <a href="#" data-act="aturSumber">Hubungkan spreadsheet KUR PMI</a> agar diambil otomatis lewat Rek Afil.</div></div>` : '';
    return `<div class="card src-bar">${ic('link', 16, 'pos')}<span>Detail KUR PMI dari <b>${esc(sp.nama)}</b> — cocok lewat Rek Afil: <b class="tnum">${U.num(nS)}</b> dari ${U.num(nP)} debitur${nP - nS ? ` • <span class="warn">${U.num(nP - nS)} belum ditemukan</span>` : ''}</span>${admin ? `<a href="#" class="lnk-a" data-act="aturSumber">${ic('settings', 14)} Atur</a>` : ''}</div>`;
  },
  /** v1.3: peringatan kunci ganda / kosong (CIF untuk Debitur Umum, Rek Afil untuk KUR PMI) — Super Admin. */
  bannerKunci() {
    const { esc, ic } = U;
    const k = S.ds && S.ds.kunci;
    if (!k || S.me.peran !== 'Admin' || (!k.nDup && !k.nTanpa)) return '';
    const dup = k.dup.slice(0, 4).map((x) => `baris ${x.baris} (${esc(x.kunci === 'CIF' ? 'CIF' : 'Rek Afil')} ${esc(x.nilai)} sama dengan baris ${x.sama})`).join('; ');
    const tanpa = k.tanpa.slice(0, 4).map((x) => `baris ${x.baris}${x.nama ? ' “' + esc(x.nama) + '”' : ''}`).join(', ');
    return `<div class="alert alert-warn kunci-bar">${ic('alertc', 16)}<div><b>Periksa kunci data di sheet Debitur.</b>
      ${k.nDup ? `<br>${U.num(k.nDup)} baris diabaikan karena kunci ganda (1 CIF / 1 Rek Afil = 1 debitur): ${dup}${k.nDup > 4 ? ', …' : ''}.` : ''}
      ${k.nTanpa ? `<br>${U.num(k.nTanpa)} debitur belum punya kunci (CIF untuk Debitur Umum, Rek_Afiliasi untuk KUR PMI) — sementara memakai Rek Pinjaman: ${tanpa}${k.nTanpa > 4 ? ', …' : ''}.` : ''}</div></div>`;
  },
  /** Spesifikasi laporan = format tabel di aplikasi (dipakai Excel, PDF & Cetak). */
  laporan() {
    const f = this.f(), L = this.data(f), pmi = this.mode === 'pmi';
    const filt = this.labelFilter(f).map((x) => x[0]).join('; ') || 'Semua debitur';
    const akt = L.filter((d) => d.aktif);
    return {
      judul: pmi ? 'Debitur KUR PMI' : 'Daftar Debitur', sub: pmi ? (f.pt ? this.namaGrup(f.pt) : 'Semua PT penempatan') : 'Debitur Umum', satuan: 'debitur',
      filter: filt, data: L, kolom: Laporan.kolomDebitur({ pt: pmi }),
      ringkasan: [['Jumlah debitur', U.num(L.length)], ['Total plafon', U.rpS(L.reduce((s, d) => s + d.pl, 0))], ['Total baki debet', U.rpS(L.reduce((s, d) => s + d.bd, 0))],
        ['Berisiko', U.num(akt.filter((d) => d.risiko).length)], ['NPL (Kol. 3–5)', U.num(akt.filter((d) => d.kol >= 3).length)]]
    };
  },
  ekspor(jenis, btn) {
    const sp = this.laporan();
    if (!sp.data.length) return U.toast('Tidak ada data untuk diekspor.', 'warn');
    if (jenis === 'xlsx') return Laporan.xlsx(sp);
    if (jenis === 'cetak') return Laporan.cetak(sp);
    return Laporan.pdf(sp, btn);
  },
  act: {
    q: (el) => { const f = PD().f(); f.q = el.value; f.hal = 1; PD().segar(); },
    pr: (el) => { const f = PD().f(); f.pr = el.value; f.hal = 1; PD().segar(); },
    st: (el) => { const f = PD().f(); f.st = el.value; f.hal = 1; PD().segar(); },
    kol: (el) => { const f = PD().f(); f.kol = el.value; f.hal = 1; PD().segar(); },
    jt: (el) => { const f = PD().f(); f.jt = el.value; f.hal = 1; App.render({ tetap: true }); },
    dari: (el) => { const f = PD().f(); f.dari = el.value; f.hal = 1; PD().segar(); },
    sampai: (el) => { const f = PD().f(); f.sampai = el.value; f.hal = 1; PD().segar(); },
    unf: (el) => { const f = PD().f(); f[el.dataset.k] = ''; f.hal = 1; App.render({ tetap: true }); },
    reset: () => { S.f[PD().kunciF] = { st: '' }; App.render({ tetap: true }); },
    pt: (el) => { const f = PD().f(); f.pt = el.dataset.v; f.hal = 1; App.render({ tetap: true }); },
    bt: (el) => { const f = PD().f(); f.bt = el.value; f.hal = 1; PD().segar(); },
    aturSumber: (el, e) => { if (e) e.preventDefault(); S.f.set = Object.assign(S.f.set || {}, { tab: 'pmi' }); App.go('pengaturan'); },
    kelolaPt: (el, e) => { if (e) e.preventDefault(); S.f.set = Object.assign(S.f.set || {}, { tab: 'pmi' }); App.go('pengaturan'); },
    sort: (el) => { const f = PD().f(); const k = el.dataset.k; f.dir = f.sort === k ? -f.dir : (['pl', 'bd', 'an', 'kol'].includes(k) ? -1 : 1); f.sort = k; PD().segar(); },
    hal: (el) => { PD().f().hal = +el.dataset.v; PD().segar(); document.getElementById('debArea').scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    per: (el) => { const f = PD().f(); f.per = +el.value; f.hal = 1; PD().segar(); },
    sel: (el) => { el.checked ? S.sel.deb.add(el.dataset.id) : S.sel.deb.delete(el.dataset.id); PD().segar(); },
    selPage: (el) => { const f = PD().f(); UI.halaman(PD().data(f), f).forEach((d) => (el.checked ? S.sel.deb.add(d.id) : S.sel.deb.delete(d.id))); PD().segar(); },
    selAll: () => { PD().data(PD().f()).forEach((d) => S.sel.deb.add(d.id)); PD().segar(); },
    selNone: () => { S.sel.deb.clear(); PD().segar(); },
    blastSel: () => App.blastKe(Array.from(S.sel.deb), (PD().mode === 'pmi' ? 'Debitur KUR PMI' : 'Daftar Debitur') + ' — pilihan'),
    cetak: () => PD().ekspor('cetak'),
    xlsx: () => PD().ekspor('xlsx'),
    pdf: (el) => PD().ekspor('pdf', el),
    sync: async (el) => {
      el.disabled = true; el.innerHTML = `<span class="spin"></span> Menyinkronkan…`;
      const r = await Api.call('cache.refresh', {});
      if (r.success && r.data.berubah) await App.muatData(false);
      U.toast(r.success ? r.message : r.message, r.success ? 'ok' : 'err');
      el.disabled = false; el.innerHTML = `${U.ic('refresh', 17)} Sinkronkan Google Sheets`;
    }
  }
};

Pages['debitur-pmi'] = Object.assign(Object.create(Pages.debitur), { judul: 'Debitur KUR PMI', mode: 'pmi', kunciF: 'debp' });

// ============================================================================
//  RISIKO GAGAL BAYAR
// ============================================================================
Pages.risiko = {
  judul: 'Penagihan',
  f() { return S.f.risk = Object.assign({ tab: 'all', sort: 'kurang', pr: '', q: '', hal: 1, per: 10, tpl: '' }, S.f.risk || {}); },
  data(f) {
    let L = M.risiko('ALL');
    if (f.pr) L = L.filter((d) => d.pr === f.pr);
    if (f.tab === 'blokir') L = L.filter((d) => d.fBlokir);
    else if (f.tab === 'saldo') L = L.filter((d) => d.fSaldo);
    else if (f.tab === 'jt') L = L.filter((d) => d.dd !== null && d.dd <= 3);
    if (f.q) { const q = f.q.toLowerCase(); L = L.filter((d) => d.q.includes(q)); }
    const s = { kurang: (a, b) => b.kurang - a.kurang, jt: (a, b) => (a.jt || '9').localeCompare(b.jt || '9'), kol: (a, b) => b.kol - a.kol || b.kurang - a.kurang, baki: (a, b) => b.bd - a.bd }[f.sort];
    return L.slice().sort(s);
  },
  render() {
    const { esc, ic } = U;
    const f = this.f();
    const all = M.risiko('ALL'), kirim = UI.bisaKirim();
    const nBlk = all.filter((d) => d.fBlokir).length, nSal = all.filter((d) => d.fSaldo).length, nJt = all.filter((d) => d.dd !== null && d.dd <= 3).length;
    const bakiR = all.reduce((s, d) => s + d.bd, 0), kurang = all.reduce((s, d) => s + d.kurang, 0);
    const nextJt = all.filter((d) => d.dd !== null && d.dd >= 0).sort((a, b) => a.dd - b.dd)[0];
    const h3 = nextJt ? all.filter((d) => d.jt === nextJt.jt).length : 0;
    const sel = S.sel.risk;
    let h = `<section class="card hero">
      <div><div class="ph-tags"><span class="tag neg"><i class="pulse"></i>Deteksi hampir real-time saldo rekening</span><span class="tag violet">${ic('shield', 13)} ${kirim ? 'Mode ' + App.labelPeran(S.me.peran) + ': akses penuh penagihan' : 'Mode ' + App.labelPeran(S.me.peran) + ': lihat saja'}</span></div>
        <h1>Penagihan</h1><p>Deteksi dini debitur berisiko sebelum jatuh tempo (saldo blokir kosong atau saldo akhir &lt; angsuran).</p></div>
      ${kirim ? `<div class="hero-a"><button class="btn btn-soft" data-act="semua">${ic('zap', 16)} Pilih semua berisiko (${U.num(this.data(f).length)})</button>
        <button class="btn btn-primary" data-act="lanjut" ${sel.size ? '' : 'disabled'}>${ic('chat', 17)} Lanjut ke WA Blast (${U.num(sel.size)} dipilih)</button></div>` : ''}</section>`;
    // v1.2: kartu ringkas yang rapi di HP — nilai, satuan, tanggal-bulan-tahun selalu 1 baris & sejajar
    const rpK = U.rpParts ? U.rpParts(kurang) : null;
    h += `<section class="grid rk-g">
      <div class="card rk"><div class="rk-t"><span class="kpi-ic soft" style="--c:#E11D48">${ic('target', 22)}</span><div class="rk-m"><span class="kpi-l">Total debitur berisiko</span><div class="rk-v tnum">${U.num(all.length)}<small>Debitur</small></div></div></div>
        <div class="rk-f"><span>Baki debet terdampak</span><b class="tnum">${U.rpS(bakiR)}</b></div></div>
      <div class="card rk"><div class="rk-t"><span class="kpi-ic soft" style="--c:#DB2777">${ic('wallet', 22)}</span><div class="rk-m"><span class="kpi-l">Total kekurangan saldo</span><div class="rk-v tnum pink">${rpK ? `<small class="pre">Rp</small>${esc(rpK.a.replace(/^(-?)Rp\s*/, '$1'))}<small>${esc(rpK.u)}</small>` : esc(U.rpS(kurang))}</div></div><span class="badge-w">Defisit aktif</span></div>
        <div class="rk-f"><span>Blokir kosong <b class="tnum">${U.num(nBlk)}</b></span><span>Saldo &lt; angsuran <b class="tnum">${U.num(nSal)}</b></span></div></div>
      <div class="card rk"><div class="rk-t"><span class="kpi-ic soft" style="--c:#7C3AED">${ic('calclock', 22)}</span><div class="rk-m"><span class="kpi-l">Jatuh tempo terdekat</span><div class="rk-v">${nextJt ? `<span class="tnum">${+nextJt.jt.slice(8)}</span><small>${U.BLN[+nextJt.jt.slice(5, 7) - 1]} ${nextJt.jt.slice(0, 4)}</small>` : '<small>Tidak ada</small>'}</div></div>${nextJt ? `<span class="badge-w">H-${nextJt.dd}${nextJt.dd <= 3 ? ' urgent' : ''}</span>` : ''}</div>
        <div class="rk-f"><span>Jatuh tempo ≤ 3 hari</span><b class="tnum">${U.num(nJt)} rekening</b></div></div></section>`;
    h += `<div class="card fbar"><div class="tabs">${[['all', 'Semua risiko', all.length], ['blokir', 'Saldo blokir kosong', nBlk], ['saldo', 'Saldo < angsuran', nSal], ['jt', 'Jatuh tempo ≤ 3 hari', nJt]].map((t) => `<button class="tab ${f.tab === t[0] ? 'on' : ''}" data-act="tab" data-v="${t[0]}">${t[1]} <em>${U.num(t[2])}</em></button>`).join('')}</div>
      <div class="row-g"><div class="inp-ic sm">${ic('search', 15)}<input type="search" data-act="q" placeholder="Cari debitur…" value="${esc(f.q)}"></div>${UI.prodSelect(f.pr, 'pr')}
      <label class="sel-wrap">${ic('filter', 15)}<select class="sel plain" data-act="sort"><option value="kurang" ${f.sort === 'kurang' ? 'selected' : ''}>Urutkan: defisit terbesar</option><option value="jt" ${f.sort === 'jt' ? 'selected' : ''}>Urutkan: jatuh tempo terdekat</option><option value="kol" ${f.sort === 'kol' ? 'selected' : ''}>Urutkan: kolektibilitas tertinggi</option><option value="baki" ${f.sort === 'baki' ? 'selected' : ''}>Urutkan: baki terbesar</option></select></label>
      <button class="btn btn-secondary btn-sm" data-act="xlsx">${ic('download', 15)} Ekspor XLSX</button></div></div>
      <section class="card tbl-card" id="riskArea"></section>`;
    h += `<section class="grid g12 gap-b">
      <div class="card c8 pad-l"><div class="card-h"><h3>${ic('list', 19, 'pink')} Prosedur Penagihan Preventif via WA</h3></div>
        <p class="muted">Penagihan preventif dikirim berjenjang melalui gateway WhatsApp. Gunakan template yang sesuai tahapan:</p>
        <div class="grid g3 play">${[['TPL-001', 'H-7 Reminder', 'Pemberitahuan ramah jadwal angsuran & ketersediaan saldo.', 'info'], ['TPL-002', 'H-3 Alert Defisit', 'Peringatan kekurangan saldo untuk mencegah denda keterlambatan.', 'warn'], ['TPL-003', 'H-1 Kontak Langsung', 'Eskalasi pesan dengan permintaan konfirmasi setoran ke RM.', 'neg']].map((x, i) => `<div class="pl pl-${x[3]}"><b>${i + 1}. ${x[1]}</b><p>${x[2]}</p>${kirim ? `<button class="btn-link sm" data-act="pakaiTpl" data-v="${x[0]}">Pakai template ini ${ic('arrowright', 13)}</button>` : ''}</div>`).join('')}</div>
        ${App.boleh('template') ? `<div class="card-f"><span class="muted">${ic('check', 14, 'pos')} Template dapat disesuaikan di menu Template WA</span><a class="lnk-a" href="#/template">Kelola template ${ic('arrowright', 14)}</a></div>` : ''}</div>
      <div class="card c4 pad-l">${Pages.risiko.gw()}</div></section>`;
    if (kirim) h += `<aside class="floatbar ${sel.size ? 'show' : ''}" id="floatbar"></aside>`;
    return h;
  },
  gw() {
    const { ic } = U;
    const g = S.gw || { mode: '-', kuota: 0, terkirim: 0, gagal: 0, antre: 0 };
    const pk = g.kuota ? Math.min(100, (g.terkirim + g.antre) / g.kuota * 100) : 0;
    const total = g.terkirim + g.gagal;
    return `<div class="card-h"><h3>Status Gateway Blast</h3><span class="pill ${g.mode === 'fonnte' ? (g.tokenAda ? 'pill-pos' : 'pill-neg') : 'pill-warn'}">${g.mode === 'fonnte' ? (g.tokenAda ? '● Siap digunakan' : '● Token belum diisi') : '● Mode simulasi'}</span></div>
      <div class="gw-q"><div><span>Kuota pesan hari ini</span><b class="tnum">${U.num(g.terkirim + g.antre)} / ${U.num(g.kuota)}</b></div><div class="bar grad"><i style="width:${pk}%"></i></div></div>
      <div class="gw-s"><span class="gw-ic">${ic('ok', 19)}</span><div><b>${total ? U.pct(g.terkirim / total * 100) : '—'} terkirim</b><small>${U.num(g.terkirim)} terkirim • ${U.num(g.gagal)} gagal • ${U.num(g.antre)} antre (hari ini)</small></div></div>
      <div class="card-f"><span class="muted">Gateway</span><b>${g.mode === 'fonnte' ? 'Fonnte WhatsApp API' : 'Simulasi (tanpa kirim)'}</b></div>`;
  },
  mount(root) { pasangAksi(root, this); this.segar(); },
  segar() {
    const { esc, ic } = U;
    const f = this.f(), L = this.data(f), rows = UI.halaman(L, f), kirim = UI.bisaKirim(), sel = S.sel.risk;
    const area = document.getElementById('riskArea');
    if (!area) return;
    const allSel = rows.length && rows.every((d) => sel.has(d.id));
    area.innerHTML = `<div class="card-h pad"><div class="row-g"><span class="kpi-ic sm soft" style="--c:#7C3AED">${ic('layers', 17)}</span><div><h3>Daftar Debitur Berisiko Tinggi</h3><p>Sinkron dengan Google Sheets • diperbarui ${S.lastSync ? U.jam(S.lastSync) : '—'}</p></div></div><span class="muted">Menampilkan ${rows.length} dari ${U.num(L.length)} debitur</span></div>
      ${L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${kirim ? `<th class="c w1"><input type="checkbox" data-act="selPage" ${allSel ? 'checked' : ''} aria-label="Pilih semua di halaman"></th>` : ''}<th class="c">#</th><th class="stick-h">Debitur & Kontak</th><th>Produk</th><th>Kolektibilitas</th><th class="num">Saldo Akhir</th><th class="num">Angsuran</th><th class="num">Kekurangan Saldo</th><th>Jatuh Tempo</th><th>Indikator Risiko</th>${kirim ? '<th class="c">Aksi Cepat</th>' : '<th class="c">Detail</th>'}</tr></thead><tbody>
      ${rows.map((d, i) => `<tr class="${sel.has(d.id) ? 'row-sel' : ''}">${kirim ? `<td class="c"><input type="checkbox" data-act="sel" data-id="${esc(d.id)}" ${sel.has(d.id) ? 'checked' : ''} aria-label="Pilih ${esc(d.nm)}"></td>` : ''}<td class="c muted">${(f.hal - 1) * f.per + i + 1}</td>
        <td class="stick"><button class="lnk" data-detail="${esc(d.id)}"><b>${esc(d.nm)}</b></button><small class="muted">Rek ${esc(d.rek)} • <span class="tnum">${esc(d.wa || 'nomor tidak valid')}</span>${d.oo ? ' • <span class="neg">opt-out</span>' : ''}</small></td>
        <td>${UI.prod(d.pr)}</td><td>${UI.kol(d.kol, true)}</td>${UI.uang(d.sa, 'muted')}${UI.uang(d.an, 'b')}<td class="num"><span class="short">-Rp ${U.num(d.kurang)}</span></td>
        <td><b class="dt ${d.dd !== null && d.dd <= 3 ? 'neg' : ''}">${U.tgl(d.jt)}</b><small class="muted">${d.dd === null ? '' : d.dd < 0 ? 'Lewat ' + -d.dd + ' hari' : d.dd === 0 ? 'Jatuh tempo hari ini' : 'H-' + d.dd + ' jatuh tempo'}</small></td>
        <td><div class="ind">${d.fBlokir ? `<span class="pill pill-neg">${ic('alert', 12)} Saldo blokir kosong</span>` : ''}${d.fSaldo ? `<span class="pill pill-warn">${ic('wallet', 12)} Saldo &lt; angsuran</span>` : ''}</div></td>
        <td class="c">${kirim ? `<button class="btn btn-sm btn-secondary" data-wa="${esc(d.id)}" ${d.wv && !d.oo ? '' : 'disabled title="Nomor tidak valid / opt-out"'}>${ic('send', 14, 'pink')} Kirim WA</button>` : `<button class="btn-icon sm" data-detail="${esc(d.id)}">${ic('eye', 15)}</button>`}</td></tr>`).join('')}
      </tbody></table></div>${UI.pager(L.length, f.hal, f.per)}` : App.kosong('ok', 'Tidak ada debitur berisiko', 'Semua debitur pada filter ini memiliki saldo cukup untuk angsuran.')}`;
    this.floatbar();
  },
  floatbar() {
    const { ic } = U;
    const fb = document.getElementById('floatbar');
    if (!fb) return;
    const sel = Array.from(S.sel.risk).map((id) => S.byId[id]).filter(Boolean);
    fb.classList.toggle('show', sel.length > 0);
    const f = this.f();
    const tpls = S.tpl || [];
    if (!f.tpl && tpls.length) f.tpl = (tpls.find((t) => t.id === 'TPL-002') || tpls[0]).id;
    fb.innerHTML = `<span class="fb-ic">${ic('list', 21)}</span><div class="fb-t"><b><em>${U.num(sel.length)}</em> debitur terpilih untuk penagihan preventif</b>
      <small>Total baki debet: <b>${U.rpS(sel.reduce((s, d) => s + d.bd, 0))}</b> • Total kekurangan saldo: <b class="negl">${U.rpS(sel.reduce((s, d) => s + d.kurang, 0))}</b></small></div>
      <div class="fb-a"><button class="btn btn-dark" data-act="batal">Batal pilih</button>
      <select class="sel dark" data-act="tpl">${tpls.map((t) => `<option value="${U.esc(t.id)}" ${f.tpl === t.id ? 'selected' : ''}>Template: ${U.esc(t.nama)}</option>`).join('')}</select>
      <button class="btn btn-primary" data-act="lanjut">${ic('send', 16)} Proses WA Blast →</button></div>`;
    const lb = document.querySelector('.hero-a [data-act="lanjut"]');
    if (lb) { lb.disabled = !sel.length; lb.innerHTML = `${ic('chat', 17)} Lanjut ke WA Blast (${U.num(sel.length)} dipilih)`; }
  },
  act: {
    tab: (el) => { const f = Pages.risiko.f(); f.tab = el.dataset.v; f.hal = 1; App.render({ tetap: true }); },
    q: (el) => { const f = Pages.risiko.f(); f.q = el.value; f.hal = 1; Pages.risiko.segar(); },
    pr: (el) => { const f = Pages.risiko.f(); f.pr = el.value; f.hal = 1; Pages.risiko.segar(); },
    sort: (el) => { Pages.risiko.f().sort = el.value; Pages.risiko.segar(); },
    hal: (el) => { Pages.risiko.f().hal = +el.dataset.v; Pages.risiko.segar(); document.getElementById('riskArea').scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    per: (el) => { const f = Pages.risiko.f(); f.per = +el.value; f.hal = 1; Pages.risiko.segar(); },
    sel: (el) => { el.checked ? S.sel.risk.add(el.dataset.id) : S.sel.risk.delete(el.dataset.id); Pages.risiko.segar(); },
    selPage: (el) => { const f = Pages.risiko.f(); UI.halaman(Pages.risiko.data(f), f).forEach((d) => (el.checked ? S.sel.risk.add(d.id) : S.sel.risk.delete(d.id))); Pages.risiko.segar(); },
    semua: () => { Pages.risiko.data(Pages.risiko.f()).forEach((d) => S.sel.risk.add(d.id)); Pages.risiko.segar(); U.toast(`${U.num(S.sel.risk.size)} debitur berisiko dipilih.`, 'info'); },
    batal: () => { S.sel.risk.clear(); Pages.risiko.segar(); },
    tpl: (el) => { Pages.risiko.f().tpl = el.value; },
    pakaiTpl: (el) => { Pages.risiko.f().tpl = el.dataset.v; if (S.sel.risk.size) Pages.risiko.floatbar(); else U.toast('Pilih debitur terlebih dahulu.', 'info'); },
    lanjut: () => { if (!S.sel.risk.size) return; App.blastKe(Array.from(S.sel.risk), 'Penagihan', Pages.risiko.f().tpl); },
    xlsx: () => {
      const f = Pages.risiko.f(), L = Pages.risiko.data(f);
      if (!L.length) return U.toast('Tidak ada data untuk diekspor.', 'warn');
      const kontak = (d) => [d.wa || 'WA tidak valid', d.oo ? 'opt-out' : ''].filter(Boolean).join(' • ');
      Laporan.xlsx({
        judul: 'Penagihan', sub: 'Debitur berisiko', satuan: 'debitur', data: L,
        filter: { all: 'Semua risiko', blokir: 'Saldo blokir kosong', saldo: 'Saldo < angsuran', jt: 'Jatuh tempo ≤ 3 hari' }[f.tab] + (f.pr ? '; Produk ' + f.pr : '') + (f.q ? '; Cari “' + f.q + '”' : ''),
        ringkasan: [['Debitur berisiko', U.num(L.length)], ['Total kekurangan saldo', U.rpS(L.reduce((a, d) => a + d.kurang, 0))], ['Baki debet terdampak', U.rpS(L.reduce((a, d) => a + d.bd, 0))]],
        kolom: [{ h: 'No', t: 'no' }, { h: 'Debitur & Kontak', t: 'ent', x: (d) => d.nm + '\n' + kontak(d) }, { h: 'Rek Pinjaman', t: 'rek', x: (d) => d.rek }, { h: 'Produk', t: 'prod', x: (d) => d.pr },
          { h: 'Kol. OJK', t: 'kol', x: (d) => d.kol }, { h: 'Saldo Blokir', t: 'rp', sum: true, x: (d) => (d.sb === null || d.sb === undefined ? { v: 'Kosong', c: 'neg' } : d.sb) },
          { h: 'Saldo Akhir', t: 'rp', sum: true, x: (d) => d.sa }, { h: 'Angsuran', t: 'rp', sum: true, x: (d) => d.an }, { h: 'Kekurangan Saldo', t: 'rp', sum: true, x: (d) => ({ v: d.kurang, c: 'neg' }) },
          { h: 'Jatuh Tempo', t: 'tgl', x: (d) => d.jt }, { h: 'Indikasi Risiko', w: 34, x: (d) => [d.fBlokir ? 'Saldo blokir kosong' : '', d.fSaldo ? 'Saldo < angsuran' : ''].filter(Boolean).join(' & ') },
          { h: 'Baki Debet', t: 'rp', sum: true, x: (d) => d.bd }]
      });
    }
  }
};

// ============================================================================
//  WA BLAST (wizard 3 langkah) + pemantauan antrean
// ============================================================================
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function renderPesan(isi, d) {
  const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const tg = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? +m[3] + ' ' + BULAN_ID[+m[2] - 1] + ' ' + m[1] : '-'; };
  const v = { nama: d.nm || 'Bapak/Ibu', produk: d.pr, angsuran: rp(d.an), jatuh_tempo: tg(d.jt), baki_debet: rp(d.bd), kekurangan: rp(Math.max(0, d.an - d.sa)), saldo_akhir: rp(d.sa), id_debitur: d.id, cabang: S.setting.NAMA_CABANG || S.setting.NAMA_APLIKASI || 'FinSight' };
  return String(isi || '').replace(/\{([a-z_]+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m));
}
function waFormat(t) {   // *tebal* _miring_ ~coret~ ala WhatsApp → HTML aman
  return U.esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>').replace(/\n/g, '<br>');
}

Pages.blast = {
  judul: 'WA Blast',
  st() { const b = S.blast; if (!b.pilih) b.pilih = new Set(b.ids); if (!b.step) b.step = 1; b.hal = b.hal || 1; b.q = b.q || ''; return b; },
  terkirimHariIni() {
    const set = new Set();
    if (S.log && S.log.rows) S.log.rows.forEach((r) => { if (U.isoLokal(new Date(r[2])) === S.hariIni && r[9] !== 'Gagal' && r[9] !== 'Batal') set.add(r[5] + '|' + r[7]); });
    return set;
  },
  cek(id) {
    const d = S.byId[id];
    if (!d) return { ok: false, alasan: 'Tidak ditemukan' };
    if (!d.aktif) return { ok: false, alasan: 'Kredit lunas', d };
    if (d.oo) return { ok: false, alasan: 'Opt-out WA', d };
    if (!d.wv) return { ok: false, alasan: 'Nomor tidak valid', d };
    return { ok: true, d };
  },
  presets() {
    const ids = (fn) => S.D.filter(fn).map((d) => d.id);
    const p = [];
    if (S.blast.sumber && S.blast.ids.length) p.push(['pilihan', S.blast.sumber, 'Dibawa dari halaman sebelumnya', S.blast.ids, 'list']);
    p.push(['risiko', 'Semua berisiko gagal bayar', 'Saldo blokir kosong atau saldo < angsuran', ids((d) => d.risiko), 'alert'],
      ['blokir', 'Saldo blokir kosong', 'Rekening angsuran belum diblokir', ids((d) => d.fBlokir), 'ban'],
      ['saldo', 'Saldo akhir < angsuran', 'Berpotensi gagal autodebet', ids((d) => d.fSaldo), 'wallet'],
      ['jt7', 'Jatuh tempo ≤ 7 hari', 'Reminder jadwal angsuran (aktif)', ids((d) => d.aktif && d.dd !== null && d.dd >= 0 && d.dd <= 7), 'calclock'],
      ['kol25', 'Kol. 2–5', 'Debitur aktif dalam perhatian / NPL', ids((d) => d.aktif && d.kol >= 2), 'layers'],
      ['turun', 'Turun kolektibilitas bulan ini', 'Downgrade dibanding awal bulan', ids((d) => d.mv > 0), 'downtrend']);
    return p;
  },
  render() {
    const { esc, ic } = U;
    const b = this.st();
    let h = UI.head({ crumb: ['Penagihan', 'WA Blast'], title: 'WA Blast Penagihan', sub: 'Pilih segmen debitur, pilih template, periksa pratinjau, lalu kirim. Pesan masuk antrean dan dikirim bertahap.', actions: `<a class="btn btn-secondary" href="#/log">${ic('history', 17)} Lihat Log Blast</a>` });
    h += `<div id="bpCard">${this.progres()}</div>`;
    const steps = [['Segmen debitur', 'users'], ['Template pesan', 'template'], ['Pratinjau & kirim', 'send']];
    h += `<ol class="wiz">${steps.map((s, i) => `<li class="${b.step === i + 1 ? 'on' : b.step > i + 1 ? 'done' : ''}"><button data-act="step" data-v="${i + 1}" ${i + 1 > b.step && !(i + 1 === 2 && b.pilih.size) && !(i + 1 === 3 && b.pilih.size && b.tplId) ? 'disabled' : ''}><i>${b.step > i + 1 ? ic('check', 14) : i + 1}</i><span>${s[0]}</span></button></li>`).join('')}</ol>`;
    h += `<section class="grid g12"><div class="c8 col-stack">${[this.step1, this.step2, this.step3][b.step - 1].call(this)}</div>
      <div class="c4 col-stack"><div class="card pad-l">${Pages.risiko.gw()}</div>
      <div class="card pad-l rules-card"><h3>${ic('shield', 18, 'pink')} Aturan pengiriman</h3><ul>
        <li>${ic('phone', 15)}<span>Nomor dinormalkan ke format <b>62xxx</b>; nomor tidak valid dilewati.</span></li>
        <li>${ic('ban', 15)}<span>Debitur dengan <b>Opt_Out_WA</b> tidak pernah dikirimi pesan.</span></li>
        <li>${ic('copy', 15)}<span>Template sama ke debitur yang sama di hari yang sama → <b>peringatan</b>.</span></li>
        <li>${ic('hourglass', 15)}<span>Dikirim bertahap ±${esc(S.setting.WA_BATCH || 25)} pesan/menit dengan jeda ${esc(S.setting.WA_JEDA || '3-8')} detik.</span></li>
        <li>${ic('history', 15)}<span>100% pengiriman tercatat di Log Blast & Audit_Log.</span></li></ul></div></div></section>`;
    return h;
  },
  step1() {
    const { esc, ic } = U;
    const b = S.blast;
    const pr = this.presets();
    let L = b.ids.map((id) => this.cek(id));
    if (b.q) { const q = b.q.toLowerCase(); L = L.filter((x) => x.d && x.d.q.includes(q)); }
    const valid = b.ids.filter((id) => this.cek(id).ok).length;
    const per = 10, n = Math.max(1, Math.ceil(L.length / per)); b.hal = Math.min(b.hal, n);
    const rows = L.slice((b.hal - 1) * per, b.hal * per);
    return `<div class="card pad-l"><div class="card-h"><div><h3>1. Pilih segmen debitur</h3><p>Gunakan segmen siap pakai atau bawa pilihan dari halaman Risiko / Daftar Debitur.</p></div></div>
      <div class="presets">${pr.map((p) => `<button class="preset ${b.preset === p[0] || (!b.preset && p[0] === 'pilihan') ? 'on' : ''}" data-act="preset" data-v="${p[0]}">${ic(p[4], 19)}<span><b>${esc(p[1])}</b><small>${esc(p[2])}</small></span><em class="tnum">${U.num(p[3].length)}</em></button>`).join('')}</div></div>
      <div class="card tbl-card"><div class="card-h pad"><div><h3>Penerima <span class="tag pink">${U.num(b.pilih.size)} dipilih</span></h3><p>${U.num(b.ids.length)} debitur di segmen • ${U.num(valid)} dapat dikirimi • ${U.num(b.ids.length - valid)} otomatis dilewati</p></div>
        <div class="row-g"><div class="inp-ic sm">${ic('search', 15)}<input type="search" data-act="bq" placeholder="Cari di segmen…" value="${esc(b.q)}"></div>
        <button class="btn btn-sm btn-secondary" data-act="pilihSemua">Pilih semua valid</button><button class="btn btn-sm btn-ghost" data-act="kosongkan">Kosongkan</button></div></div>
      ${b.ids.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c w1"></th><th class="stick-h">Debitur</th><th>Produk</th><th>Kol</th><th>No. WA</th><th class="num">Angsuran</th><th class="num">Kekurangan</th><th>Status kirim</th></tr></thead><tbody>
        ${rows.map((x) => { const d = x.d; if (!d) return ''; return `<tr class="${x.ok ? '' : 'row-off'}"><td class="c"><input type="checkbox" data-act="pilih" data-id="${esc(d.id)}" ${b.pilih.has(d.id) && x.ok ? 'checked' : ''} ${x.ok ? '' : 'disabled'}></td>
          <td class="stick"><button class="lnk" data-detail="${esc(d.id)}"><b>${esc(d.nm)}</b></button><small class="muted">${esc(d.id)}</small></td><td>${UI.prod(d.pr)}</td><td>${UI.kol(d.kol, true)}</td><td class="tnum">${esc(d.wa || '—')}</td>${UI.uang(d.an)}<td class="num">${d.kurang ? `<span class="short">-Rp ${U.num(d.kurang)}</span>` : '<span class="muted">—</span>'}</td>
          <td>${x.ok ? '<span class="pill pill-pos">' + ic('check', 12) + ' Siap</span>' : `<span class="pill pill-grey">${ic('ban', 12)} ${esc(x.alasan)}</span>`}</td></tr>`; }).join('')}
        </tbody></table></div>${L.length > per ? `<div class="pager"><div class="pg-info">Halaman ${b.hal} dari ${n}</div><div class="pg"><button class="pg-b" data-act="bhal" data-v="${b.hal - 1}" ${b.hal <= 1 ? 'disabled' : ''}>${ic('left', 15)}</button><button class="pg-b" data-act="bhal" data-v="${b.hal + 1}" ${b.hal >= n ? 'disabled' : ''}>${ic('right', 15)}</button></div></div>` : ''}`
        : App.kosong('users', 'Belum ada segmen', 'Pilih salah satu segmen di atas.')}
      <div class="card-f pad"><span class="muted">${U.num(b.pilih.size)} penerima akan dikirimi</span><button class="btn btn-primary" data-act="step" data-v="2" ${b.pilih.size ? '' : 'disabled'}>Lanjut pilih template ${ic('arrowright', 16)}</button></div></div>`;
  },
  step2() {
    const { esc, ic } = U;
    const b = S.blast, tpl = S.tpl || [];
    const contoh = S.byId[Array.from(b.pilih)[0]] || S.D[0];
    return `<div class="card pad-l"><div class="card-h"><div><h3>2. Pilih template pesan</h3><p>Placeholder seperti {nama} dan {angsuran} terisi otomatis per debitur.</p></div>${App.boleh('template') ? `<a class="btn btn-sm btn-secondary" href="#/template">${ic('edit', 14)} Kelola template</a>` : ''}</div>
      ${tpl.length ? `<div class="tpl-pick">${tpl.map((t) => `<label class="tp ${b.tplId === t.id ? 'on' : ''}"><input type="radio" name="tpl" data-act="tpl" value="${esc(t.id)}" ${b.tplId === t.id ? 'checked' : ''}><div><b>${esc(t.nama)}</b><small class="muted">${esc(t.id)}</small><p>${waFormat(renderPesan(t.isi, contoh || {})).slice(0, 400)}</p></div></label>`).join('')}</div>`
        : App.kosong('template', 'Belum ada template aktif', 'Template dapat ditambahkan di menu Template WA.')}
      <div class="card-f"><button class="btn btn-ghost" data-act="step" data-v="1">${ic('left', 16)} Kembali</button><button class="btn btn-primary" data-act="step" data-v="3" ${b.tplId ? '' : 'disabled'}>Lanjut ke pratinjau ${ic('arrowright', 16)}</button></div></div>`;
  },
  step3() {
    const { esc, ic } = U;
    const b = S.blast;
    const t = (S.tpl || []).find((x) => x.id === b.tplId);
    if (!t) { b.step = 2; return this.step2(); }
    const valid = Array.from(b.pilih).filter((id) => this.cek(id).ok);
    const sudah = this.terkirimHariIni();
    const dup = valid.filter((id) => sudah.has(id + '|' + t.id));
    if (!b.contoh || !valid.includes(b.contoh)) b.contoh = valid[0];
    const d = S.byId[b.contoh];
    const g = S.gw || {};
    const sisa = Math.max(0, (g.kuota || 0) - (g.terkirim || 0) - (g.antre || 0));
    const batch = Number(S.setting.WA_BATCH) || 25;
    const menit = Math.ceil(valid.length / batch);
    return `<div class="card pad-l"><div class="card-h"><div><h3>3. Pratinjau & konfirmasi</h3><p>Periksa isi pesan untuk contoh debitur sebelum mengirim.</p></div>
        <span class="pill ${g.mode === 'fonnte' ? 'pill-pos' : 'pill-warn'}">${g.mode === 'fonnte' ? 'Gateway Fonnte' : 'MODE SIMULASI'}</span></div>
      <div class="prev">
        <div class="phone"><div class="ph-bar">${ic('user', 16)}<div><b>${esc(d ? d.nm : '-')}</b><small>${esc(d ? d.wa : '')}</small></div></div>
          <div class="ph-chat"><div class="bubble">${d ? waFormat(renderPesan(t.isi, d)) : ''}<span class="bt">${U.jam(Date.now()).slice(0, 5)} ✓✓</span></div></div></div>
        <div class="prev-s">
          <label class="fld"><span>Contoh debitur</span><select class="sel" data-act="contoh">${valid.slice(0, 200).map((id) => `<option value="${esc(id)}" ${id === b.contoh ? 'selected' : ''}>${esc(S.byId[id].nm)} — ${esc(id)}</option>`).join('')}</select></label>
          <div class="sum"><div><span>Template</span><b>${esc(t.nama)}</b></div><div><span>Penerima valid</span><b class="tnum">${U.num(valid.length)} debitur</b></div>
            <div><span>Dilewati otomatis</span><b class="tnum">${U.num(b.pilih.size - valid.length)}</b></div><div><span>Sudah menerima template ini hari ini</span><b class="tnum ${dup.length ? 'warn' : ''}">${U.num(dup.length)}</b></div>
            <div><span>Estimasi selesai</span><b>± ${menit} menit</b></div><div><span>Sisa kuota hari ini</span><b class="tnum ${valid.length > sisa ? 'neg' : ''}">${U.num(sisa)} pesan</b></div></div>
          ${dup.length ? `<div class="alert alert-warn sm">${ic('alertc', 15)}<div>${U.num(dup.length)} debitur sudah menerima template yang sama hari ini. Anda akan diminta memilih: lewati atau tetap kirim.</div></div>` : ''}
          ${g.mode !== 'fonnte' ? `<div class="alert alert-info sm">${ic('info', 15)}<div>Mode <b>simulasi</b>: alur & log berjalan, namun pesan tidak benar-benar dikirim ke WhatsApp.</div></div>` : ''}
        </div></div>
      <div class="card-f"><button class="btn btn-ghost" data-act="step" data-v="2">${ic('left', 16)} Kembali</button><button class="btn btn-primary" data-act="kirim" ${valid.length ? '' : 'disabled'}>${ic('send', 16)} Kirim ${U.num(valid.length)} pesan sekarang</button></div></div>`;
  },
  progres() {
    const { esc, ic } = U;
    const a = S.batchAktif;
    if (!a) return '';
    const sel = a.terkirim + a.gagal + a.batal, pct = a.total ? sel / a.total * 100 : 0;
    return `<div class="card bp ${a.selesai ? 'done' : ''}"><span class="bp-ic">${a.selesai ? ic('ok', 22) : '<span class="spin lg"></span>'}</span>
      <div class="bp-t"><b>${a.selesai ? 'Pengiriman selesai' : 'Mengirim pesan WA…'} <small class="muted">Batch ${esc(a.id)}${a.mode === 'simulasi' ? ' • SIMULASI' : ''}</small></b>
        <div class="bar grad"><i style="width:${pct}%"></i></div>
        <small><b class="pos">${U.num(a.terkirim)} terkirim</b> • <b class="neg">${U.num(a.gagal)} gagal</b> • ${U.num(a.antre)} antre${a.batal ? ' • ' + U.num(a.batal) + ' dibatalkan' : ''} dari ${U.num(a.total)}</small></div>
      <div class="bp-a">${!a.selesai && a.antre ? `<button class="btn btn-sm btn-secondary" data-act="batalBatch">${ic('ban', 14)} Batalkan sisa</button>` : ''}<a class="btn btn-sm btn-secondary" href="#/log" data-act="lihatLog">${ic('history', 14)} Log</a>${a.selesai ? `<button class="btn-icon sm" data-act="tutupBp" aria-label="Tutup">${ic('x', 15)}</button>` : ''}</div></div>`;
  },
  timer: null,
  async pantau() {
    clearTimeout(this.timer);
    const a = S.batchAktif;
    if (!a || a.selesai) return;
    const r = await Api.call('log.list', { batch: a.id, dari: S.hariIni });
    if (r.success) {
      const g = r.data.ringkas;
      Object.assign(a, { terkirim: g.terkirim, gagal: g.gagal, antre: g.antre, batal: g.batal });
      if (!g.antre && g.total) { a.selesai = true; U.toast(`Batch selesai: ${U.num(g.terkirim)} terkirim, ${U.num(g.gagal)} gagal.`, g.gagal ? 'warn' : 'ok', 6000); App.muatLog(); }
      const el = document.getElementById('bpCard');
      if (el) el.innerHTML = this.progres();
    }
    if (!a.selesai) {
      a.putaran = (a.putaran || 0) + 1;
      if (a.putaran % 4 === 0) Api.call('blast.proses', {});        // percepat tanpa menunggu pemicu 1 menit
      this.timer = setTimeout(() => this.pantau(), 5000);
    }
  },
  async kirim(opsi = {}) {
    const b = S.blast;
    const ids = Array.from(b.pilih).filter((id) => this.cek(id).ok);
    const r = await Api.call('blast.kirim', Object.assign({ ids, templateId: b.tplId }, opsi));
    if (!r.success && r.code === 'CONFIRM') {
      const dup = r.data.duplikat || [];
      const m = U.modal({
        title: 'Kirim ganda terdeteksi', size: 'md',
        body: `<p>${U.esc(r.message)}</p><ul class="dup">${dup.slice(0, 8).map((x) => `<li><b>${U.esc(x.nama)}</b> <small class="muted">${U.esc(x.id)}</small></li>`).join('')}${dup.length > 8 ? `<li class="muted">… dan ${dup.length - 8} lainnya</li>` : ''}</ul><p class="muted">Disarankan melewati debitur tersebut agar tidak menerima pesan yang sama dua kali.</p>`,
        footer: `<button class="btn btn-ghost" data-x="batal">Batal</button><button class="btn btn-secondary" data-x="paksa">Tetap kirim semua</button><button class="btn btn-primary" data-x="lewati">Lewati duplikat (${U.num(r.data.siap - dup.length)})</button>`
      });
      m.el.querySelectorAll('[data-x]').forEach((x) => x.onclick = () => { m.close(); if (x.dataset.x === 'paksa') this.kirim({ paksa: true }); if (x.dataset.x === 'lewati') this.kirim({ lewatiDuplikat: true }); });
      return;
    }
    if (!r.success) return U.toast(r.message, 'err', 6000);
    const d = r.data;
    S.batchAktif = { id: d.batchId, total: d.antre, mode: d.mode, terkirim: 0, gagal: 0, antre: d.antre, batal: 0, selesai: false };
    U.toast(r.message + (d.dilewati && d.dilewati.length ? ` ${d.dilewati.length} dilewati.` : ''), 'ok', 5000);
    S.blast = { ids: [], sumber: '', tplId: b.tplId, step: 1, pilih: new Set() };
    S.sel.risk.clear();
    App.render();
    Api.call('blast.proses', {}).then(() => this.pantau());
  },
  mount(root) { pasangAksi(root, this); if (S.batchAktif && !S.batchAktif.selesai && !this.timer) this.pantau(); },
  act: {
    step: (el) => { S.blast.step = +el.dataset.v; App.render({ tetap: true }); },
    preset: (el) => {
      const p = Pages.blast.presets().find((x) => x[0] === el.dataset.v);
      if (!p) return;
      S.blast.preset = p[0]; S.blast.ids = p[3].slice(); if (p[0] !== 'pilihan') S.blast.sumber = '';
      S.blast.pilih = new Set(S.blast.ids.filter((id) => Pages.blast.cek(id).ok)); S.blast.hal = 1;
      if (p[0] !== 'pilihan') S.blast.sumber = p[1];
      App.render({ tetap: true });
    },
    pilih: (el) => { el.checked ? S.blast.pilih.add(el.dataset.id) : S.blast.pilih.delete(el.dataset.id); App.render({ tetap: true }); },
    pilihSemua: () => { S.blast.ids.forEach((id) => { if (Pages.blast.cek(id).ok) S.blast.pilih.add(id); }); App.render({ tetap: true }); },
    kosongkan: () => { S.blast.pilih.clear(); App.render({ tetap: true }); },
    bq: (el) => { S.blast.q = el.value; S.blast.hal = 1; const v = document.getElementById('view'); App.render({ tetap: true }); const i = v.querySelector('[data-act="bq"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
    bhal: (el) => { S.blast.hal = +el.dataset.v; App.render({ tetap: true }); },
    tpl: (el) => { S.blast.tplId = el.value; App.render({ tetap: true }); },
    contoh: (el) => { S.blast.contoh = el.value; App.render({ tetap: true }); },
    kirim: async (el) => {
      const n = Array.from(S.blast.pilih).filter((id) => Pages.blast.cek(id).ok).length;
      const t = (S.tpl || []).find((x) => x.id === S.blast.tplId);
      const ok = await U.konfirmasi({ title: 'Kirim WA Blast?', body: `<p><b>${U.num(n)} pesan</b> dengan template <b>${U.esc(t ? t.nama : '')}</b> akan dimasukkan ke antrean dan dikirim bertahap.</p><p class="muted">Tindakan ini tercatat di Log Blast & Audit_Log atas nama Anda (NPP ${U.esc(S.me.npp)}).</p>`, ok: 'Ya, kirim sekarang' });
      if (!ok) return;
      el.disabled = true; el.innerHTML = '<span class="spin"></span> Memasukkan antrean…';
      await Pages.blast.kirim();
      el.disabled = false;
    },
    batalBatch: async () => {
      const a = S.batchAktif; if (!a) return;
      if (!await U.konfirmasi({ title: 'Batalkan sisa antrean?', body: 'Pesan yang belum terkirim pada batch ini akan dibatalkan.', ok: 'Batalkan', bahaya: true })) return;
      const r = await Api.call('blast.batal', { batchId: a.id });
      U.toast(r.message, r.success ? 'ok' : 'err');
      Pages.blast.pantau();
    },
    lihatLog: () => { S.f.log = Object.assign(S.f.log || {}, { q: S.batchAktif ? S.batchAktif.id : '' }); App.go('log'); },
    tutupBp: () => { S.batchAktif = null; const el = document.getElementById('bpCard'); if (el) el.innerHTML = ''; }
  }
};

// ============================================================================
//  TEMPLATE WA (Admin)
// ============================================================================
Pages.template = {
  judul: 'Template WA',
  render() {
    const { esc, ic } = U;
    const list = S.tplAll || S.tpl || [];
    let h = UI.head({ crumb: ['Penagihan', 'Template WA'], title: 'Template WA', sub: 'Kelola isi pesan penagihan. Template nonaktif tidak bisa dipilih RM.', actions: `<button class="btn btn-primary" data-act="baru">${ic('plus', 17)} Tambah Template</button>` });
    h += `<div class="alert alert-info">${ic('info', 16)}<div>Placeholder tersedia: ${['nama', 'produk', 'angsuran', 'jatuh_tempo', 'baki_debet', 'kekurangan', 'saldo_akhir', 'id_debitur', 'cabang'].map((p) => `<code>{${p}}</code>`).join(' ')}. Format WhatsApp: <code>*tebal*</code> <code>_miring_</code>.</div></div>`;
    if (!S.tplAll) h += `<p class="muted"><span class="spin"></span> Memuat semua template…</p>`;
    h += `<section class="grid g3">${list.map((t) => `<div class="card tpl ${t.aktif ? '' : 'off'}"><div class="tpl-h"><div><b>${esc(t.nama)}</b><small class="muted">${esc(t.id)}</small></div><span class="pill ${t.aktif ? 'pill-pos' : 'pill-grey'}">${t.aktif ? 'Aktif' : 'Nonaktif'}</span></div>
      <div class="tpl-b">${waFormat(t.isi)}</div>
      <div class="tpl-f"><small class="muted">${t.diperbarui ? 'Diperbarui ' + U.tglJam(new Date(t.diperbarui).getTime()) : ''}${t.oleh ? ' • ' + esc(t.oleh) : ''}</small>
      <div class="acts"><button class="btn btn-sm btn-ghost" data-act="toggle" data-id="${esc(t.id)}">${t.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button><button class="btn btn-sm btn-secondary" data-act="edit" data-id="${esc(t.id)}">${ic('edit', 14)} Edit</button></div></div></div>`).join('')}</section>`;
    return h;
  },
  async mount(root) {
    pasangAksi(root, this);
    if (!S.tplAll) {
      const r = await Api.call('template.list', {});
      if (r.success) { S.tplAll = r.data.templates; if (App.halaman === 'template') App.render({ tetap: true }); }
    }
  },
  editor(t) {
    const { esc, ic } = U;
    t = t || { id: '', nama: '', isi: '', aktif: true };
    const contoh = M.risiko('ALL')[0] || S.D[0] || {};
    const ph = ['nama', 'produk', 'angsuran', 'jatuh_tempo', 'baki_debet', 'kekurangan', 'saldo_akhir', 'id_debitur', 'cabang'];
    const m = U.modal({
      title: t.id ? 'Edit Template ' + t.id : 'Tambah Template', size: 'lg',
      body: `<div class="tpl-ed"><div><label class="fld"><span>Nama template</span><input id="tNama" maxlength="80" value="${esc(t.nama)}" placeholder="mis. Reminder H-3 (Defisit Saldo)" autofocus></label>
        <label class="fld"><span>Isi pesan</span><textarea id="tIsi" rows="11" maxlength="2000" placeholder="Yth. Bapak/Ibu {nama}, …">${esc(t.isi)}</textarea></label>
        <div class="ph-btns">${ph.map((p) => `<button type="button" class="chip sm" data-ph="${p}">{${p}}</button>`).join('')}</div>
        <div class="row-g sb"><label class="chk"><input type="checkbox" id="tAktif" ${t.aktif ? 'checked' : ''}><span>Aktif (bisa dipilih RM)</span></label><small class="muted" id="tCnt"></small></div></div>
        <div><div class="fld"><span>Pratinjau (contoh: ${esc(contoh.nm || '-')})</span></div><div class="phone sm"><div class="ph-chat"><div class="bubble" id="tPrev"></div></div></div></div></div>`,
      footer: `<button class="btn btn-ghost" data-x="0">Batal</button><button class="btn btn-primary" data-x="1">${ic('check', 16)} Simpan template</button>`
    });
    const isi = m.el.querySelector('#tIsi');
    const upd = () => { m.el.querySelector('#tPrev').innerHTML = waFormat(renderPesan(isi.value, contoh)) || '<span class="muted">Ketik isi pesan…</span>'; m.el.querySelector('#tCnt').textContent = isi.value.length + ' / 2000 karakter'; };
    isi.oninput = upd; upd();
    m.el.querySelectorAll('[data-ph]').forEach((b) => b.onclick = () => {
      const s = isi.selectionStart || isi.value.length, e = isi.selectionEnd || s, v = '{' + b.dataset.ph + '}';
      isi.value = isi.value.slice(0, s) + v + isi.value.slice(e); isi.focus(); isi.setSelectionRange(s + v.length, s + v.length); upd();
    });
    m.el.querySelector('[data-x="0"]').onclick = m.close;
    m.el.querySelector('[data-x="1"]').onclick = async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true;
      const r = await Api.call('template.simpan', { id: t.id || '', nama: m.el.querySelector('#tNama').value, isi: isi.value, aktif: m.el.querySelector('#tAktif').checked });
      btn.disabled = false;
      if (!r.success) return U.toast(r.message, 'err');
      Pages.template.setList(r.data.templates);
      m.close(); U.toast(r.message, 'ok');
    };
  },
  setList(list) { S.tplAll = list; S.tpl = list.filter((x) => x.aktif); App.simpanLokal(); App.render({ tetap: true }); },
  act: {
    baru: () => Pages.template.editor(null),
    edit: (el) => Pages.template.editor((S.tplAll || S.tpl).find((t) => t.id === el.dataset.id)),
    toggle: async (el) => {
      const t = (S.tplAll || S.tpl).find((x) => x.id === el.dataset.id);
      const r = await Api.call('template.simpan', { id: t.id, nama: t.nama, isi: t.isi, aktif: !t.aktif });
      if (!r.success) return U.toast(r.message, 'err');
      Pages.template.setList(r.data.templates); U.toast(`Template ${t.aktif ? 'dinonaktifkan' : 'diaktifkan'}.`, 'ok');
    }
  }
};

// ============================================================================
//  LOG BLAST
// ============================================================================
Pages.log = {
  judul: 'Log Blast',
  f() { return S.f.log = Object.assign({ dari: U.tambahHari(S.hariIni, -29), sampai: S.hariIni, pengirim: '', status: '', q: '', hal: 1, per: 25 }, S.f.log || {}); },
  data(f) {
    if (!S.log) return [];
    let L = S.log.rows;
    if (f.pengirim) L = L.filter((r) => r[3] === f.pengirim);
    if (f.status) L = L.filter((r) => r[9] === f.status);
    if (f.q) { const q = f.q.toLowerCase(); L = L.filter((r) => (r[6] + ' ' + r[5] + ' ' + r[1] + ' ' + r[8] + ' ' + r[4]).toLowerCase().includes(q)); }
    return L;
  },
  render() {
    const { esc, ic } = U;
    const f = this.f();
    let h = UI.head({ crumb: ['Penagihan', 'Log Blast'], title: 'Log Blast', sub: 'Riwayat pengiriman WA blast & efektivitas penagihan. Seluruh pengiriman tercatat.', actions: `<button class="btn btn-secondary" data-act="muat">${ic('refresh', 17)} Muat ulang</button><button class="btn btn-secondary" data-act="xlsx">${ic('download', 17)} Ekspor XLSX</button>` });
    const peng = S.log ? S.log.pengirim : {};
    h += `<div class="card fbar col"><div class="fgrid">
      <label class="mini">Dari <input type="date" data-act="dari" value="${esc(f.dari)}" max="${esc(S.hariIni)}"></label>
      <label class="mini">Sampai <input type="date" data-act="sampai" value="${esc(f.sampai)}" max="${esc(S.hariIni)}"></label>
      <select class="sel" data-act="pengirim"><option value="">Semua pengirim</option>${Object.keys(peng).map((k) => `<option value="${esc(k)}" ${f.pengirim === k ? 'selected' : ''}>${esc(peng[k])} (${esc(k)})</option>`).join('')}</select>
      <select class="sel" data-act="status"><option value="">Semua status</option>${['Terkirim', 'Gagal', 'Antre', 'Batal'].map((s) => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <div class="inp-ic">${ic('search', 15)}<input type="search" data-act="q" placeholder="Cari debitur, batch, template…" value="${esc(f.q)}"></div></div></div>
      <div id="logArea">${S.log ? '' : '<div class="card pad"><span class="spin"></span> Memuat log…</div>'}</div>`;
    return h;
  },
  async mount(root) {
    pasangAksi(root, this);
    const f = this.f();
    if (!S.log || !S.logQ || S.logQ.dari !== f.dari || S.logQ.sampai !== f.sampai) await this.muat();
    else this.segar();
  },
  async muat() {
    const f = this.f();
    const area = document.getElementById('logArea');
    if (area && S.log) area.style.opacity = .55;
    const r = await Api.call('log.list', { dari: f.dari, sampai: f.sampai });
    if (r.success) { S.log = r.data; S.logQ = { dari: f.dari, sampai: f.sampai }; }
    else U.toast(r.message, 'err');
    if (App.halaman === 'log') App.render({ tetap: true });
  },
  segar() {
    const { esc, ic } = U;
    const f = this.f(), L = this.data(f);
    const area = document.getElementById('logArea');
    if (!area) return;
    area.style.opacity = 1;
    const c = { total: L.length, Terkirim: 0, Gagal: 0, Antre: 0, Batal: 0 };
    const perTpl = {};
    L.forEach((r) => { c[r[9]] = (c[r[9]] || 0) + 1; const t = perTpl[r[8]] || (perTpl[r[8]] = { n: 0, ok: 0, g: 0 }); t.n++; if (r[9] === 'Terkirim') t.ok++; if (r[9] === 'Gagal') t.g++; });
    const rate = c.Terkirim + c.Gagal ? c.Terkirim / (c.Terkirim + c.Gagal) * 100 : 0;
    const rows = UI.halaman(L, f);
    area.innerHTML = `<section class="grid g5 mini-kpi">
      <div class="card mk"><div><span>Total pesan</span><b class="tnum">${U.num(c.total)}</b></div><i class="mk-ic" style="--c:#7C3AED">${ic('send', 17)}</i></div>
      <div class="card mk"><div><span>Terkirim</span><b class="tnum pos">${U.num(c.Terkirim)}</b></div><i class="mk-ic" style="--c:#16A34A">${ic('check', 17)}</i></div>
      <div class="card mk"><div><span>Gagal</span><b class="tnum neg">${U.num(c.Gagal)}</b></div><i class="mk-ic" style="--c:#E11D48">${ic('x', 17)}</i></div>
      <div class="card mk"><div><span>Antre</span><b class="tnum info">${U.num(c.Antre)}</b></div><i class="mk-ic" style="--c:#2563EB">${ic('hourglass', 17)}</i></div>
      <div class="card mk"><div><span>Tingkat keberhasilan</span><b class="tnum">${U.pct(rate)}</b></div><i class="mk-ic" style="--c:#DB2777">${ic('target', 17)}</i></div></section>
      <section class="grid g12"><div class="card c8 tbl-card"><div class="card-h pad"><h3>Riwayat pengiriman</h3><span class="muted">${S.log && S.log.terpotong ? 'Menampilkan 3.000 terbaru — persempit rentang tanggal' : U.num(L.length) + ' baris'}</span></div>
      ${L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th class="stick-h">Debitur</th><th>Template</th><th>Pengirim</th><th>Status</th><th class="c">Coba</th><th>Keterangan</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td class="nowrap"><b class="dt">${U.tglJam(r[2])}</b><small class="muted">${esc(r[1])}</small></td><td class="stick"><button class="lnk" data-detail="${esc(r[5])}"><b>${esc(r[6])}</b></button><small class="muted">${esc(r[5])}</small></td><td>${esc(r[8])}</td><td>${esc(r[4])}<small class="muted">${esc(r[3])}</small></td><td>${UI.logStatus(r[9])}</td><td class="c tnum">${r[10]}</td><td class="ket">${esc(r[11] || '—')}</td></tr>`).join('')}
      </tbody></table></div>${UI.pager(L.length, f.hal, f.per, [25, 50, 100])}` : App.kosong('history', 'Belum ada log', 'Tidak ada pengiriman pada rentang & filter ini.')}</div>
      <div class="card c4 pad-l"><div class="card-h"><h3>Efektivitas per template</h3></div>
      ${Object.keys(perTpl).length ? `<ul class="eff">${Object.keys(perTpl).sort((a, b) => perTpl[b].n - perTpl[a].n).map((k) => { const t = perTpl[k], rr = t.ok + t.g ? t.ok / (t.ok + t.g) * 100 : 0; return `<li><div><b>${esc(k)}</b><small class="muted">${U.num(t.n)} pesan • ${U.num(t.g)} gagal</small></div><div class="r"><b class="tnum">${U.pct(rr)}</b><div class="bar thin"><i style="width:${rr}%"></i></div></div></li>`; }).join('')}</ul>` : '<p class="muted">Belum ada data.</p>'}</div></section>`;
  },
  act: {
    dari: (el) => { Pages.log.f().dari = el.value; Pages.log.f().hal = 1; Pages.log.muat(); },
    sampai: (el) => { Pages.log.f().sampai = el.value; Pages.log.f().hal = 1; Pages.log.muat(); },
    pengirim: (el) => { const f = Pages.log.f(); f.pengirim = el.value; f.hal = 1; Pages.log.segar(); },
    status: (el) => { const f = Pages.log.f(); f.status = el.value; f.hal = 1; Pages.log.segar(); },
    q: (el) => { const f = Pages.log.f(); f.q = el.value; f.hal = 1; Pages.log.segar(); },
    hal: (el) => { Pages.log.f().hal = +el.dataset.v; Pages.log.segar(); },
    per: (el) => { const f = Pages.log.f(); f.per = +el.value; f.hal = 1; Pages.log.segar(); },
    muat: () => Pages.log.muat(),
    xlsx: () => {
      const f = Pages.log.f(), L = Pages.log.data(f);
      if (!L.length) return U.toast('Tidak ada data untuk diekspor.', 'warn');
      App.eksporXlsx('Log Blast', [{ h: 'Waktu', w: 18 }, { h: 'Batch', w: 22 }, { h: 'Rek Pinjaman', t: 'rek', w: 16 }, { h: 'Nama Debitur', w: 30 }, { h: 'Template', w: 28 }, { h: 'Pengirim (NPP)', t: 'rek' }, { h: 'Nama Pengirim', w: 22 }, { h: 'Status', w: 12 }, { h: 'Percobaan', t: 'num', w: 11 }, { h: 'Keterangan', w: 40 }],
        L.map((r) => [U.tglJam(r[2]), r[1], r[5], r[6], r[8], r[3], r[4], r[9], r[10], r[11]]), `Periode ${U.tgl(f.dari)} – ${U.tgl(f.sampai)}${f.status ? '; status ' + f.status : ''}${f.pengirim ? '; pengirim ' + f.pengirim : ''}`);
    }
  }
};

// ============================================================================
//  PENGGUNA & PERAN (Admin)
// ============================================================================
const WARNA_PERAN = ['info', 'warn', 'violet', 'pos', 'neg'];
Pages.pengguna = {
  judul: 'Pengguna & Peran',
  /** { namaPeran: [menu] } dari pengaturan (Super Admin tidak termasuk — selalu semua menu). */
  peranAkses() {
    let m = null; try { m = JSON.parse(S.setting.PERAN_AKSES || ''); } catch (e) { m = null; }
    if (!m || typeof m !== 'object' || Array.isArray(m)) m = { RM: ['dashboard', 'kualitas', 'debitur', 'risiko', 'blast', 'log'], Manager: ['dashboard', 'kualitas', 'debitur', 'risiko', 'log'] };
    return m;
  },
  warna(peran) { if (peran === 'Admin') return 'pink'; const k = Object.keys(this.peranAkses()); const i = k.indexOf(peran); return WARNA_PERAN[(i < 0 ? 0 : i) % WARNA_PERAN.length]; },
  render() {
    const { esc, ic } = U;
    const L = S.users;
    const f = S.f.usr || (S.f.usr = { tab: 'list' });
    let h = UI.head({ crumb: ['Administrasi', 'Pengguna & Peran'], title: 'Pengguna & Peran', sub: 'Kelola akses berbasis NPP, peran, dan menu yang boleh dibuka tiap peran. Hak akses dicek di server pada setiap permintaan.',
      actions: f.tab === 'list' ? `<button class="btn btn-primary" data-act="baru">${ic('userplus', 17)} Tambah Pengguna</button>` : `<button class="btn btn-primary" data-act="peranBaru">${ic('plus', 17)} Tambah Peran</button>` });
    h += `<nav class="subnav" aria-label="Sub halaman pengguna"><a href="#" class="${f.tab === 'list' ? 'on' : ''}" data-act="tabU" data-v="list">${ic('users', 16)}<span>Daftar Pengguna</span>${L ? `<em>${U.num(L.length)}</em>` : ''}</a>
      <a href="#" class="${f.tab === 'peran' ? 'on' : ''}" data-act="tabU" data-v="peran">${ic('shield', 16)}<span>Peran & Hak Akses Menu</span><em>${Object.keys(this.peranAkses()).length + 1}</em></a></nav>`;
    if (f.tab === 'peran') return h + this.renderPeran();
    h += `<div class="alert alert-info">${ic('key', 16)}<div><b>Alur login pertama:</b> pengguna masuk dengan NPP & kata sandi = NPP → wajib membuat kata sandi baru → memindai QR dengan Microsoft Authenticator. Gunakan <b>Reset akses</b> bila lupa sandi atau ganti HP. Satu akun hanya bisa aktif di <b>1 perangkat</b>.</div></div>`;
    if (!L) return h + '<div class="card pad"><span class="spin"></span> Memuat pengguna…</div>';
    const n = (fn) => L.filter(fn).length;
    const peranLain = Object.keys(this.peranAkses()).slice(0, 3);
    const ikonPeran = ['user', 'building', 'briefcase2'];
    h += `<section class="grid g5 mini-kpi">
      <div class="card mk"><div><span>Total pengguna</span><b class="tnum">${U.num(L.length)}</b></div><i class="mk-ic" style="--c:#7C3AED">${ic('users', 17)}</i></div>
      <div class="card mk"><div><span>Super Admin</span><b class="tnum">${n((u) => u.peran === 'Admin')}</b></div><i class="mk-ic" style="--c:#DB2777">${ic('shield', 17)}</i></div>
      ${peranLain.map((p, i) => `<div class="card mk"><div><span>${esc(App.labelPeran(p))}</span><b class="tnum">${n((u) => u.peran === p)}</b></div><i class="mk-ic" style="--c:${['#2563EB', '#F97316', '#8B5CF6'][i]}">${ic(ikonPeran[i] === 'briefcase2' ? 'user' : ikonPeran[i], 17)}</i></div>`).join('')}
      ${peranLain.length < 3 ? `<div class="card mk"><div><span>2FA aktif</span><b class="tnum pos">${n((u) => u.keamanan === '2FA aktif')}</b></div><i class="mk-ic" style="--c:#16A34A">${ic('phonem', 17)}</i></div>` : ''}</section>
      <section class="card tbl-card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>NPP</th><th class="stick-h">Nama</th><th>Peran</th><th>Status</th><th>Keamanan</th><th>Login terakhir</th><th class="c">Aksi</th></tr></thead><tbody>
      ${L.map((u) => {
        const kc = { '2FA aktif': 'pill-pos', 'Terkunci': 'pill-neg', 'Belum aktivasi': 'pill-grey', 'Wajib ganti sandi': 'pill-warn', 'Belum 2FA': 'pill-warn' }[u.keamanan] || 'pill-grey';
        return `<tr class="${u.status === 'Aktif' ? '' : 'row-off'}"><td><span class="idtag tnum">${esc(u.npp)}</span></td><td class="stick"><div class="ent"><span class="avatar xs">${esc(U.inisial(u.nama))}</span><div><b>${esc(u.nama)}</b>${u.npp === S.me.npp ? ' <span class="tag">Anda</span>' : ''}<small class="muted">${esc(u.email || '—')}</small></div></div></td>
          <td><span class="tag ${this.warna(u.peran)}">${esc(u.peran ? App.labelPeran(u.peran) : 'Peran tidak dikenal')}</span></td><td>${UI.status(u.status)}</td><td><span class="pill ${kc}">${esc(u.keamanan)}</span></td>
          <td class="muted nowrap">${u.login ? U.tglJam(new Date(u.login).getTime()) : 'Belum pernah'}</td>
          <td class="c"><div class="acts"><button class="btn btn-sm btn-secondary" data-act="edit" data-npp="${esc(u.npp)}">${ic('edit', 14)} Edit</button><button class="btn btn-sm btn-ghost" data-act="reset" data-npp="${esc(u.npp)}">${ic('key', 14)} Reset akses</button></div></td></tr>`;
      }).join('')}</tbody></table></div></section>`;
    return h;
  },
  /** Matriks peran × menu. Super Admin selalu semua menu (termasuk Pengguna & Pengaturan). */
  renderPeran() {
    const { esc, ic } = U;
    const d = this.draf || (this.draf = JSON.parse(JSON.stringify(this.peranAkses())));
    const pakai = {}; (S.users || []).forEach((u) => { pakai[u.peran] = (pakai[u.peran] || 0) + 1; });
    const ubah = JSON.stringify(d) !== JSON.stringify(this.peranAkses());
    const cek = (on, attrs) => `<label class="sw-cell"><input type="checkbox" ${on ? 'checked' : ''} ${attrs}><i></i></label>`;
    return `<div class="alert alert-info">${ic('shield', 16)}<div>Centang menu yang boleh dibuka tiap peran. Menu <b>Pengguna & Peran</b> serta pengaturan aplikasi hanya untuk <b>Super Admin</b>. Perubahan berlaku langsung untuk semua pengguna (dicek ulang di server).</div></div>
      <section class="card tbl-card"><div class="tbl-wrap"><table class="tbl tbl-peran"><thead><tr><th class="stick-h">Peran</th>${MENU_PERAN.map((m) => `<th class="c">${esc(LABEL_MENU[m])}</th>`).join('')}<th class="c">Pengguna</th><th class="c">Aksi</th></tr></thead><tbody>
        <tr class="row-super"><td class="stick"><span class="tag pink">${ic('shield', 12)} Super Admin</span><small class="muted">Semua menu + Pengguna & Pengaturan</small></td>${MENU_PERAN.map(() => `<td class="c">${cek(true, 'disabled')}</td>`).join('')}<td class="c tnum">${U.num(pakai.Admin || 0)}</td><td class="c muted">—</td></tr>
        ${Object.keys(d).map((p) => `<tr><td class="stick"><span class="tag ${this.warna(p)}">${esc(App.labelPeran(p))}</span><small class="muted">${d[p].length} dari ${MENU_PERAN.length} menu</small></td>
          ${MENU_PERAN.map((m) => `<td class="c">${cek(d[p].includes(m), `data-act="cekMenu" data-p="${esc(p)}" data-m="${m}" aria-label="${esc(p)} — ${esc(LABEL_MENU[m])}"`)}</td>`).join('')}
          <td class="c tnum">${U.num(pakai[p] || 0)}</td>
          <td class="c">${pakai[p] ? `<span class="muted sm" title="Pindahkan penggunanya dulu">Dipakai</span>` : `<button class="btn-icon sm" data-act="hapusPeran" data-p="${esc(p)}" title="Hapus peran">${ic('trash', 15)}</button>`}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="card-f pad"><span class="muted">${ubah ? `<b class="warn">${ic('info', 14)} Ada perubahan yang belum disimpan.</b>` : `${ic('check', 14, 'pos')} Hak akses tersimpan.`}</span>
        <div class="row-g">${ubah ? `<button class="btn btn-ghost" data-act="batalPeran">Batal</button>` : ''}<button class="btn btn-primary" data-act="simpanPeran" ${ubah ? '' : 'disabled'}>${ic('check', 16)} Simpan hak akses</button></div></div></section>`;
  },
  async mount(root) {
    pasangAksi(root, this);
    if (!S.users) await this.muat();
  },
  async muat() {
    const r = await Api.call('user.list', {});
    if (r.success) { S.users = r.data.users; if (App.halaman === 'pengguna') App.render({ tetap: true }); }
    else U.toast(r.message, 'err');
  },
  form(u) {
    const { esc, ic } = U;
    const baru = !u;
    const akses = this.peranAkses();
    u = u || { npp: '', nama: '', email: '', peran: Object.keys(akses)[0] || 'Admin', status: 'Aktif' };
    const opsi = [['Admin', 'Super Admin — semua menu, kelola pengguna, peran & pengaturan']].concat(Object.keys(akses).map((p) => [p, App.labelPeran(p) + ' — ' + (akses[p].map((m) => LABEL_MENU[m]).join(', ') || 'tanpa menu')]));
    const diri = !baru && u.npp === S.me.npp;
    const m = U.modal({
      title: baru ? 'Tambah Pengguna' : 'Edit Pengguna ' + u.npp, size: 'md',
      body: `<div class="form-g"><label class="fld"><span>NPP (5 digit)</span><input id="uNpp" inputmode="numeric" maxlength="5" value="${esc(u.npp)}" ${baru ? 'autofocus' : ''}>${baru ? '' : `<small>Ganti NPP bila perlu (mis. NPP Super Admin berubah). Kata sandi & authenticator tetap; sesi lama diakhiri${diri ? ' dan Anda perlu masuk ulang dengan NPP baru' : ''}.</small>`}</label>
        <label class="fld"><span>Nama lengkap</span><input id="uNama" maxlength="80" value="${esc(u.nama)}" ${baru ? '' : 'autofocus'}></label>
        <label class="fld"><span>Email (opsional)</span><input id="uEmail" type="email" value="${esc(u.email || '')}" placeholder="nama@kantor.co.id"></label>
        <label class="fld"><span>Peran</span><select id="uPeran" class="sel" ${diri ? 'disabled' : ''}>${opsi.map((p) => `<option value="${esc(p[0])}" ${u.peran === p[0] ? 'selected' : ''}>${esc(p[1])}</option>`).join('')}</select>${diri ? '<small>Anda tidak dapat menurunkan peran akun Anda sendiri.</small>' : ''}</label>
        <label class="fld"><span>Status</span><select id="uStatus" class="sel" ${diri ? 'disabled' : ''}><option ${u.status === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${u.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></label></div>
        ${baru ? `<div class="alert alert-info sm">${ic('info', 15)}<div>Kata sandi awal = NPP. Pengguna wajib menggantinya & mendaftarkan Microsoft Authenticator saat login pertama.</div></div>` : ''}`,
      footer: `<button class="btn btn-ghost" data-x="0">Batal</button><button class="btn btn-primary" data-x="1">${ic('check', 16)} Simpan</button>`
    });
    m.el.querySelector('#uNpp').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); };
    m.el.querySelector('[data-x="0"]').onclick = m.close;
    m.el.querySelector('[data-x="1"]').onclick = async (ev) => {
      const btn = ev.currentTarget;
      let npp = m.el.querySelector('#uNpp').value.trim();
      if (!/^\d{5}$/.test(npp)) return U.toast('NPP harus 5 digit angka.', 'warn');
      btn.disabled = true;
      if (!baru && npp !== u.npp) {
        if (!await U.konfirmasi({ title: 'Ganti NPP?', body: `NPP <b>${esc(u.npp)}</b> akan diganti menjadi <b>${esc(npp)}</b>. ${esc(u.nama)} selanjutnya masuk dengan NPP baru; semua sesi lama diakhiri.`, ok: 'Ya, ganti NPP' })) { btn.disabled = false; return; }
        const g = await Api.call('user.gantiNpp', { npp: u.npp, baru: npp });
        if (!g.success) { btn.disabled = false; return U.toast(g.message, 'err'); }
        if (g.data && g.data.keluar) { m.close(); return App.keluarPaksa(g.message); }
        U.toast(g.message, 'ok', 6000);
      }
      const r = await Api.call('user.simpan', { mode: baru ? 'tambah' : 'edit', npp, nama: m.el.querySelector('#uNama').value, email: m.el.querySelector('#uEmail').value, peran: m.el.querySelector('#uPeran').value, status: m.el.querySelector('#uStatus').value });
      btn.disabled = false;
      if (!r.success) { this.muat(); return U.toast(r.message, 'err'); }
      m.close(); U.toast(r.message, 'ok'); this.muat();
    };
  },
  async simpanPeran(d) {
    const r = await Api.call('peran.simpan', { peran: d });
    if (!r.success) { U.toast(r.message, 'err', 7000); return false; }
    S.setting = Object.assign(S.setting, r.data.setting || {});
    if (S.adminSet) S.adminSet.setting = Object.assign(S.adminSet.setting || {}, r.data.setting || {});
    this.draf = null; App.simpanLokal();
    U.toast(r.message, 'ok');
    App.render({ tetap: true });
    return true;
  },
  act: {
    tabU: (el) => { S.f.usr = { tab: el.dataset.v }; Pages.pengguna.draf = null; App.render(); },
    baru: () => Pages.pengguna.form(null),
    edit: (el) => Pages.pengguna.form(S.users.find((u) => u.npp === el.dataset.npp)),
    cekMenu: (el) => {
      const P = Pages.pengguna, d = P.draf || (P.draf = JSON.parse(JSON.stringify(P.peranAkses())));
      const p = el.dataset.p, mn = el.dataset.m;
      d[p] = el.checked ? MENU_PERAN.filter((x) => x === mn || d[p].includes(x)) : d[p].filter((x) => x !== mn);
      App.render({ tetap: true });
    },
    batalPeran: () => { Pages.pengguna.draf = null; App.render({ tetap: true }); },
    simpanPeran: (el) => { el.disabled = true; Pages.pengguna.simpanPeran(Pages.pengguna.draf || Pages.pengguna.peranAkses()); },
    hapusPeran: async (el) => {
      const P = Pages.pengguna, p = el.dataset.p;
      if (!await U.konfirmasi({ title: 'Hapus peran?', body: `Peran <b>${U.esc(p)}</b> akan dihapus. Lanjutkan lalu klik Simpan hak akses.`, ok: 'Hapus', bahaya: true })) return;
      const d = P.draf || (P.draf = JSON.parse(JSON.stringify(P.peranAkses())));
      delete d[p]; App.render({ tetap: true });
    },
    peranBaru: () => {
      const { ic, esc } = U;
      const m = U.modal({
        title: 'Tambah peran baru', size: 'md',
        body: `<div class="form-g"><label class="fld"><span>Nama peran</span><input id="pNama" maxlength="30" placeholder="mis. Kepala Cabang, Collection, Auditor" autofocus><small>2–30 huruf/angka. Tidak boleh "Admin" atau "Super Admin".</small></label>
          <div class="fld"><span>Menu yang boleh dibuka</span><div class="menu-pick">${MENU_PERAN.map((mn) => `<label class="chk"><input type="checkbox" value="${mn}" ${['dashboard', 'kualitas', 'debitur'].includes(mn) ? 'checked' : ''}><span>${esc(LABEL_MENU[mn])}</span></label>`).join('')}</div></div></div>`,
        footer: `<button class="btn btn-ghost" data-x="0">Batal</button><button class="btn btn-primary" data-x="1">${ic('check', 16)} Tambah & simpan</button>`
      });
      m.el.querySelector('[data-x="0"]').onclick = m.close;
      m.el.querySelector('[data-x="1"]').onclick = async (ev) => {
        const nama = m.el.querySelector('#pNama').value.replace(/\s+/g, ' ').trim();
        const menu = [...m.el.querySelectorAll('.menu-pick input:checked')].map((x) => x.value);
        if (!/^[A-Za-z0-9][A-Za-z0-9 .&()\/-]{1,29}$/.test(nama)) return U.toast('Nama peran 2–30 huruf/angka.', 'warn');
        if (/^(super\s*-?\s*)?admin$/i.test(nama)) return U.toast('Nama itu dipakai Super Admin.', 'warn');
        if (!menu.length) return U.toast('Pilih minimal 1 menu.', 'warn');
        const P = Pages.pengguna, d = JSON.parse(JSON.stringify(P.draf || P.peranAkses()));
        if (Object.keys(d).some((k) => k.toLowerCase() === nama.toLowerCase())) return U.toast('Peran "' + nama + '" sudah ada.', 'warn');
        d[nama] = menu;
        ev.currentTarget.disabled = true;
        if (await P.simpanPeran(d)) m.close(); else ev.currentTarget.disabled = false;
      };
    },
    reset: (el) => {
      const { ic, esc } = U;
      const u = S.users.find((x) => x.npp === el.dataset.npp);
      const m = U.modal({
        title: 'Reset akses ' + u.npp + ' — ' + u.nama, size: 'md',
        body: `<div class="opts">
          <button class="opt" data-m="semua">${ic('key', 20)}<span><b>Reset sandi & 2FA</b><small>Sandi kembali = NPP, wajib ganti sandi & scan QR baru. Untuk lupa sandi.</small></span></button>
          <button class="opt" data-m="2fa">${ic('phonem', 20)}<span><b>Reset 2FA saja</b><small>Sandi tetap; QR authenticator baru muncul saat login. Untuk ganti/hilang HP.</small></span></button>
          <button class="opt" data-m="buka" ${u.keamanan === 'Terkunci' ? '' : 'disabled'}>${ic('lock', 20)}<span><b>Buka kunci akun</b><small>Akun terkunci 15 menit setelah 5x salah.</small></span></button></div>
          <p class="muted sm">Semua sesi aktif pengguna ini akan diakhiri. Tindakan tercatat di Audit_Log.</p>`
      });
      m.el.querySelectorAll('[data-m]').forEach((b) => b.onclick = async () => {
        if (!await U.konfirmasi({ title: 'Konfirmasi reset', body: `Lanjutkan <b>${esc(b.querySelector('b').textContent)}</b> untuk ${esc(u.nama)}?`, ok: 'Ya, reset', bahaya: true })) return;
        const r = await Api.call('user.reset', { npp: u.npp, mode: b.dataset.m });
        U.toast(r.message, r.success ? 'ok' : 'err', 6000);
        if (r.success) { m.close(); Pages.pengguna.muat(); }
      });
    }
  }
};

// ============================================================================
//  PENGATURAN
// ============================================================================
Pages.pengaturan = {
  judul: 'Pengaturan',
  render() {
    const { esc, ic } = U;
    const admin = S.me.peran === 'Admin';
    const f = S.f.set || (S.f.set = { tab: 'profil' });
    if (!f.tab) f.tab = 'profil';
    if (!admin) f.tab = 'profil';
    const tabs = [['profil', 'Profil & Keamanan', 'user']].concat(admin ? [['umum', 'Umum', 'settings'], ['logo', 'Logo Aplikasi', 'image'], ['pmi', 'Mitra KUR PMI', 'plane'], ['keamanan', 'Keamanan Sistem', 'shieldalert'], ['gateway', 'Gateway WA', 'send'], ['sinkron', 'Sinkronisasi & Data', 'cloud'], ['impor', 'Import Data', 'upload']] : []);
    let h = UI.head({ crumb: ['Administrasi', 'Pengaturan'], title: 'Pengaturan', sub: admin ? 'Profil, keamanan akun, konfigurasi aplikasi, gateway WA, dan migrasi data.' : 'Profil dan keamanan akun Anda.' });
    h += `<div class="set-wrap"><nav class="set-nav">${tabs.map((t) => `<button class="${f.tab === t[0] ? 'on' : ''}" data-act="tab" data-v="${t[0]}">${ic(t[2], 17)}<span>${t[1]}</span></button>`).join('')}</nav><div class="set-body">`;
    if (admin && f.tab !== 'profil' && !S.adminSet) h += '<div class="card pad"><span class="spin"></span> Memuat pengaturan…</div>';
    else h += this['tab_' + f.tab]();
    return h + '</div></div>';
  },
  async mount(root) {
    pasangAksi(root, this);
    if (S.me.peran === 'Admin' && !S.adminSet) await this.muat();
    const tab = (S.f.set || {}).tab;
    if (S.me.peran === 'Admin' && S.adminSet && tab === 'pmi' && !this.src && !this._srcMuat) this.muatSumber();
    if (S.me.peran === 'Admin' && S.adminSet && tab === 'keamanan' && !this.kam && !this._kamMuat) this.muatKeamanan();
  },
  async muatSumber() {
    this._srcMuat = true;
    const r = await Api.call('pmi.sumber.info', {});
    this._srcMuat = false;
    this.src = r.success ? r.data : { aktif: false, galat: r.message };
    // ganti kartu sumber saja (jangan render ulang seluruh tab — daftar PT yang sedang diketik tetap utuh)
    const el = document.getElementById('srcCard');
    if (el) el.outerHTML = this.kartuSumber();
    else if (App.halaman === 'pengaturan' && (S.f.set || {}).tab === 'pmi') App.render({ tetap: true });
  },
  async muatKeamanan() {
    this._kamMuat = true;
    const r = await Api.call('keamanan.status', {});
    this._kamMuat = false;
    this.kam = r.success ? r.data : { galat: r.message };
    if (App.halaman === 'pengaturan') App.render({ tetap: true });
  },
  /** v1.3: spreadsheet KUR PMI terpisah (Nama, Nama Perusahaan, Jangka Waktu, Batch, Rek Afil). */
  kartuSumber() {
    const { esc, ic } = U;
    const s = this.src;
    if (!s) return `<div class="card pad-l" id="srcCard"><h3>Sumber detail KUR PMI</h3><p class="muted"><span class="spin"></span> Memeriksa…</p></div>`;
    return `<div class="card pad-l" id="srcCard"><h3>${ic('link', 18)} Sumber detail KUR PMI (spreadsheet terpisah)</h3>
      <p class="muted">Nama, Nama Perusahaan, Jangka Waktu, dan Batch debitur KUR PMI diambil dari spreadsheet lain, dicocokkan lewat <b>Rek Afil</b>. Baki debet, saldo, kol & jatuh tempo tetap dari sheet Debitur. Spreadsheet hanya <b>dibaca</b>.</p>
      ${s.aktif ? `<div class="src-st ${s.galat ? 'bad' : 'ok'}">${ic(s.galat ? 'alertc' : 'ok', 18)}<div><b>${s.galat ? 'Tidak dapat dibaca' : esc(s.nama)}</b>
          <small>${s.galat ? esc(s.galat) : `${U.num(s.baris)} baris • kolom: ${(s.kolom || []).map(esc).join(', ')}${s.tanpaSumber ? ` • <span class="warn">${U.num(s.tanpaSumber)} debitur KUR PMI belum ditemukan</span>` : ' • semua debitur KUR PMI cocok'}`}</small></div>
          <a class="lnk-a" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Buka ${ic('ext', 13)}</a></div>` : `<div class="src-st">${ic('info', 18)}<div><b>Belum terhubung</b><small>Detail KUR PMI saat ini dari kolom sheet Debitur (PT_PMI).</small></div></div>`}
      <div class="form-g g2 mt">
        <label class="fld"><span>Link spreadsheet KUR PMI</span><input id="srcUrl" placeholder="https://docs.google.com/spreadsheets/d/…/edit" value="${esc(s.aktif ? s.url : '')}" autocomplete="off"><small class="muted">Akun pemilik Apps Script harus punya akses (minimal pembaca).</small></label>
        <label class="fld"><span>Nama sheet (opsional)</span><input id="srcSheet" placeholder="Kosong = sheet pertama" value="${esc(s.sheet || '')}" maxlength="100"><small class="muted">Kolom wajib: Rek Afil. Kolom lain: Nama, Nama Perusahaan, Jangka Waktu, Batch.</small></label>
      </div>
      <div class="card-f"><span class="muted">${ic('info', 14)} Perubahan di spreadsheet KUR PMI terbaca otomatis ±5 menit.</span><div class="row-g">${s.aktif ? `<button class="btn btn-danger-soft" data-act="srcPutus">${ic('unlink', 16)} Putuskan</button>` : ''}<button class="btn btn-primary" data-act="srcSimpan">${ic('link', 16)} ${s.aktif ? 'Perbarui' : 'Hubungkan'}</button></div></div></div>`;
  },
  /** v1.3: Keamanan sistem — Cloudflare (Turnstile & gerbang Worker), berbagi Drive, akun. */
  tab_keamanan() {
    const { esc, ic } = U;
    const k = this.kam;
    if (!k) return `<div class="card pad"><span class="spin"></span> Memeriksa keamanan…</div>`;
    if (k.galat) return `<div class="alert alert-neg">${ic('alertc', 16)}<div>${esc(k.galat)}</div></div>`;
    const item = (ok, judul, ket, warn) => `<li class="${ok ? 'ok' : warn ? 'warn' : 'bad'}">${ic(ok ? 'ok' : warn ? 'alertc' : 'xcircle', 18)}<div><b>${judul}</b><small>${ket}</small></div></li>`;
    const a = k.akun;
    const cek = [
      ...k.berbagi.map((b) => item(!!b.aman, esc(b.jenis) + (b.nama ? ' — ' + esc(b.nama) : ''), b.galat ? esc(b.galat) : b.publik ? '<b>Dibagikan ke siapa saja yang punya link!</b> Ubah berbagi di Google Drive menjadi "Dibatasi".' : b.domain ? 'Dibagikan ke seluruh domain organisasi. Sebaiknya "Dibatasi".' : `Dibatasi • ${U.num(b.editor)} editor, ${U.num(b.pembaca)} pembaca — pastikan hanya orang yang berwenang.`, !b.publik)),
      item(k.gerbang.aktif, 'Gerbang Cloudflare Worker', k.gerbang.aktif ? 'Aktif — URL Apps Script tidak bisa dipakai langsung; permintaan dibatasi per IP.' : 'Belum aktif. Disarankan: blokir bot, batasi tebak sandi per IP, sembunyikan URL Apps Script.', true),
      item(k.turnstile.aktif, 'Cloudflare Turnstile di halaman masuk', k.turnstile.aktif ? 'Aktif — login wajib lolos verifikasi Cloudflare.' : 'Belum aktif. Menahan robot penebak sandi.', true),
      item(a.superAdmin <= 3, 'Jumlah Super Admin', U.num(a.superAdmin) + ' akun Super Admin aktif' + (a.superAdmin > 3 ? ' — kurangi bila tidak perlu.' : '.'), true),
      item(!a.tanpa2fa.length, 'Authenticator (2FA)', a.tanpa2fa.length ? U.num(a.tanpa2fa.length) + ' akun belum menyelesaikan 2FA: ' + a.tanpa2fa.map(esc).join(', ') : 'Semua akun aktif memakai authenticator.', true),
      item(!a.kedaluwarsa.length, 'Sandi awal (= NPP)', a.belumAktif.length ? `${U.num(a.belumAktif.length)} akun belum aktivasi (berlaku ${k.aktivasiJam} jam sejak dibuat/direset)${a.kedaluwarsa.length ? '; ' + U.num(a.kedaluwarsa.length) + ' sudah kedaluwarsa: ' + a.kedaluwarsa.map(esc).join(', ') + ' — Reset akses bila masih dipakai' : ''}.` : 'Tidak ada akun yang masih memakai sandi awal.', true),
      item(!(k.wa.mode === 'fonnte' && !k.wa.tokenAda), 'Gateway WhatsApp', k.wa.mode === 'fonnte' ? (k.wa.tokenAda ? 'Mode kirim sungguhan, token tersimpan di Script Properties.' : 'Mode kirim tanpa token!') : 'Mode simulasi.', true),
      item(k.log24.gagalLogin < 20, 'Aktivitas 24 jam', `${U.num(k.log24.gagalLogin)} gagal login, ${U.num(k.log24.ditolak)} akses ditolak (lihat Audit_Log).`, true)
    ];
    const t = k.turnstile, g = k.gerbang;
    return `<div class="card pad-l"><div class="row-g sb"><h3>${ic('shieldalert', 18)} Pemeriksaan keamanan</h3><button class="btn btn-secondary btn-sm" data-act="kamSegar">${ic('refresh', 15)} Periksa ulang</button></div>
        <ul class="kam-list">${cek.join('')}</ul>
        <p class="muted sm">${ic('info', 13)} Data tersimpan di Google Sheets milik akun Anda dan hanya diakses lewat Apps Script ("Execute as: Me"). Browser tidak pernah membuka spreadsheet langsung. Lindungi akun Google pemilik dengan verifikasi 2 langkah.</p></div>
      <div class="card pad-l"><h3>${ic('fingerprint', 18)} Cloudflare Turnstile (halaman masuk)</h3>
        <p class="muted">Buat widget di dasbor Cloudflare → Turnstile → <b>Add widget</b> (hostname: domain aplikasi Anda). Tempel Site key & Secret key di sini. Secret disimpan di Script Properties dan tidak pernah dikirim ke browser.</p>
        <div class="form-g g2"><label class="fld"><span>Site key</span><input id="tsSite" value="${esc(t.siteKey || '')}" placeholder="0x4AAAAAAA…" autocomplete="off"></label>
          <label class="fld"><span>Secret key ${t.secretAda ? `<em class="muted">(tersimpan: ${esc(t.secretSamar)})</em>` : ''}</span><input id="tsSecret" type="password" placeholder="${t.secretAda ? 'Kosongkan bila tidak diubah' : '0x4AAAAAAA…'}" autocomplete="off"></label></div>
        <div class="card-f"><span class="muted">${ic('info', 14)} Bila halaman masuk bermasalah, jalankan <code>matikanTurnstile</code> dari editor Apps Script.</span><div class="row-g">${t.aktif ? `<button class="btn btn-danger-soft" data-act="tsOff">Matikan</button>` : ''}<button class="btn btn-primary" data-act="tsSimpan">${ic('check', 16)} ${t.aktif ? 'Simpan' : 'Aktifkan Turnstile'}</button></div></div></div>
      <div class="card pad-l"><h3>${ic('cloud', 18)} Gerbang Cloudflare Worker</h3>
        <p class="muted">Semua permintaan aplikasi lewat Cloudflare: hanya dari alamat aplikasi Anda, dibatasi per IP, ukuran dibatasi, dan URL Apps Script tersembunyi. Ikuti panduan bagian <b>Cloudflare</b> (berkas <code>worker.js</code>).</p>
        <div class="src-st ${g.lewatSekarang ? 'ok' : ''}">${ic(g.lewatSekarang ? 'ok' : 'info', 18)}<div><b>${g.aktif ? 'Gerbang aktif' : g.rahasiaCocok ? 'Aplikasi sudah lewat Worker — siap diaktifkan' : 'Aplikasi belum lewat Worker'}</b><small>${g.lewatSekarang ? 'Permintaan ini lewat Cloudflare' + (g.ip ? ' • IP ' + esc(g.ip) : '') + (g.negara ? ' • ' + esc(g.negara) : '') : 'GAS_URL di js/config.js masih menunjuk langsung ke Apps Script.'}</small></div></div>
        ${g.aktif ? '' : `<ol class="kam-steps"><li>Buat rahasia acak: <button class="btn btn-secondary btn-sm" data-act="gwAcak">${ic('dice', 14)} Buat rahasia</button> lalu salin.</li><li>Pasang <code>worker.js</code> di Cloudflare; isi variabel <code>GAS_URL</code>, <code>ALLOWED_ORIGINS</code>, dan secret <code>GATEWAY_SECRET</code> (rahasia di atas).</li><li>Ganti <code>GAS_URL</code> di <code>js/config.js</code> ke alamat Worker, push, muat ulang aplikasi.</li><li>Tempel rahasia yang sama di bawah → <b>Aktifkan gerbang</b>.</li></ol>`}
        <div class="row-g">${g.aktif ? '' : `<input id="gwSecret" type="password" class="grow" placeholder="Rahasia gerbang (≥ 32 karakter)" autocomplete="off"><button class="btn btn-primary" data-act="gwAktif">${ic('lock', 16)} Aktifkan gerbang</button>`}${g.aktif ? `<button class="btn btn-danger-soft" data-act="gwOff">Matikan gerbang</button>` : ''}</div>
        <p class="muted sm">${ic('info', 13)} Darurat (Worker bermasalah): jalankan <code>matikanGerbang</code> dari editor Apps Script, lalu kembalikan GAS_URL ke URL /exec.</p></div>
      <div class="card pad-l"><h3>${ic('key', 18)} Masa berlaku sandi awal</h3><p class="muted">Sandi awal (= NPP) hanya berlaku sekian jam sejak akun dibuat atau direset. Setelah itu wajib Reset akses — mencegah orang lain mengaktifkan akun yang belum dipakai.</p>
        <div class="row-g"><input id="aktJam" type="number" min="1" max="720" value="${esc(k.aktivasiJam)}" style="max-width:120px"><span class="muted">jam</span><button class="btn btn-primary" data-act="aktSimpan">${ic('check', 16)} Simpan</button></div></div>`;
  },
  async muat() {
    const r = await Api.call('setting.get', {});
    if (r.success) { S.adminSet = r.data; if (App.halaman === 'pengaturan') App.render({ tetap: true }); }
  },
  inp(k, tipe = 'text', extra = '') {
    const s = S.adminSet.setting, ket = S.adminSet.keterangan[k] || '';
    return `<label class="fld"><span>${U.esc(k.replace(/_/g, ' '))}</span><input data-k="${k}" type="${tipe}" value="${U.esc(s[k])}" ${extra}><small class="muted">${U.esc(ket)}</small></label>`;
  },
  tab_profil() {
    const { esc, ic } = U;
    const exp = Api.sesi && Api.sesi.exp;
    return `<div class="card pad-l"><div class="prof-card"><span class="avatar lg">${esc(U.inisial(S.me.nama))}</span><div><h3>${esc(S.me.nama)}</h3><p class="muted">NPP ${esc(S.me.npp)} • ${esc(App.labelPeran(S.me.peran))}${S.me.email ? ' • ' + esc(S.me.email) : ''}</p>
      <div class="row-g sm"><span class="pill pill-pos">${ic('phonem', 12)} 2FA Microsoft Authenticator aktif</span>${exp ? `<span class="pill pill-grey">${ic('clock', 12)} Sesi berakhir ${U.tglJam(exp)}</span>` : ''}</div></div></div></div>
      <div class="card pad-l"><h3>Ubah kata sandi</h3><p class="muted">Demi keamanan, perubahan sandi memerlukan kode authenticator dan akan mengakhiri sesi di perangkat lain.</p>
        <form id="fUbah" class="form-g" novalidate autocomplete="off">
          <label class="fld"><span>Kata sandi saat ini</span><input type="password" id="pLama" autocomplete="current-password"></label>
          <label class="fld"><span>Kata sandi baru</span><input type="password" id="pBaru" autocomplete="new-password" placeholder="Min. 8 karakter, huruf + angka"></label>
          <label class="fld"><span>Ulangi kata sandi baru</span><input type="password" id="pUlang" autocomplete="new-password"></label>
          <label class="fld"><span>Kode authenticator (6 digit)</span><input id="pKode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></label>
          <div><button class="btn btn-primary" data-act="ubahSandi" type="button">${ic('key', 16)} Perbarui kata sandi</button></div></form></div>
      <div class="card pad-l"><h3>Sesi & perangkat</h3><p class="muted">Keluar dari semua browser/HP yang sedang login dengan akun ini (mis. bila HP hilang). Minta Admin melakukan <b>Reset 2FA</b> bila authenticator hilang.</p>
        <button class="btn btn-danger-soft" data-act="keluarSemua">${ic('logout', 16)} Keluar dari semua perangkat</button></div>`;
  },
  tab_umum() {
    const { ic } = U;
    return `<div class="card pad-l"><h3>Identitas aplikasi</h3><div class="form-g g2" id="fSet">${this.inp('NAMA_APLIKASI')}${this.inp('SUBJUDUL')}${this.inp('NAMA_INSTITUSI')}${this.inp('NAMA_CABANG')}${this.inp('TOTP_ISSUER')}${this.inp('SESI_JAM', 'number', 'min="1" max="24"')}</div>
      <div class="card-f"><span class="muted">${ic('info', 14)} Perubahan TOTP_ISSUER hanya berlaku untuk pendaftaran authenticator berikutnya.</span><button class="btn btn-primary" data-act="simpan">${ic('check', 16)} Simpan</button></div></div>`;
  },
  draf() {
    const st = S.adminSet.setting;
    if (!this.logo) this.logo = { data: st.LOGO_DATA || '', ukuran: Math.max(24, Math.min(80, Number(st.LOGO_UKURAN) || 34)), teks: st.LOGO_TEKS !== 'tidak' };
    return this.logo;
  },
  /** Daftar PT penempatan KUR PMI (dikelola Super Admin). Ganti nama → sel PT_PMI di sheet ikut diperbarui. */
  tab_pmi() {
    const { esc, ic } = U;
    const L = this.pmi || (this.pmi = UI.daftarPt().map((n) => ({ nama: n, lama: n })));
    const n = {}; S.D.filter((d) => d.pr === 'KUR PMI').forEach((d) => { const k = UI.normPt(d.pt); n[k] = (n[k] || 0) + 1; });
    const tersimpan = JSON.stringify(UI.daftarPt()), ubah = JSON.stringify(L.map((x) => x.nama.trim()).filter(Boolean)) !== tersimpan;
    const terdaftar = {}; L.forEach((x) => { terdaftar[UI.normPt(x.lama || x.nama)] = 1; terdaftar[UI.normPt(x.nama)] = 1; });
    const lain = S.D.filter((d) => d.pr === 'KUR PMI' && d.pt && !terdaftar[UI.normPt(d.pt)]).reduce((o, d) => { o[d.pt] = (o[d.pt] || 0) + 1; return o; }, {});
    return `<div class="card pad-l"><h3>Mitra KUR PMI (PT penempatan)</h3><p class="muted">Debitur produk <b>KUR PMI</b> dikelompokkan per PT pada halaman <b>Daftar Debitur → Debitur KUR PMI</b>. PT tiap debitur diambil dari kolom <code>PT_PMI</code> di sheet Debitur (huruf besar/kecil & awalan "PT" diabaikan).</p>
      <div class="pmi-list">${L.map((x, i) => `<div class="pmi-row"><span class="pmi-no">${i + 1}</span><input class="inp" maxlength="60" value="${esc(x.nama)}" data-act="pmiNama" data-i="${i}" aria-label="Nama PT ${i + 1}">
        <span class="pmi-n tnum" title="Debitur dengan PT ini">${U.num(n[UI.normPt(x.lama || x.nama)] || 0)} debitur</span>
        <button class="btn-icon sm" data-act="pmiNaik" data-i="${i}" ${i ? '' : 'disabled'} title="Naikkan">${ic('up', 15)}</button>
        <button class="btn-icon sm" data-act="pmiHapus" data-i="${i}" title="Hapus">${ic('trash', 15)}</button></div>`).join('')}</div>
      <button class="btn btn-secondary btn-sm mt" data-act="pmiTambah">${ic('plus', 15)} Tambah PT</button>
      ${Object.keys(lain).length ? `<div class="alert alert-warn mt">${ic('info', 16)}<div>Nilai <code>PT_PMI</code> yang belum terdaftar: ${Object.keys(lain).map((k) => `<b>${esc(k)}</b> (${lain[k]})`).join(', ')}. Tambahkan ke daftar atau perbaiki di sheet.</div></div>` : ''}
      <div class="card-f"><span class="muted">${ic('info', 14)} ${ubah ? '<b class="warn">Ada perubahan yang belum disimpan.</b>' : 'Mengganti nama PT juga memperbarui kolom PT_PMI debitur terkait di sheet.'}</span><div class="row-g">${ubah ? `<button class="btn btn-ghost" data-act="pmiBatal">Batal</button>` : ''}<button class="btn btn-primary" data-act="pmiSimpan" ${ubah ? '' : 'disabled'}>${ic('check', 16)} Simpan daftar PT</button></div></div></div>` + this.kartuSumber();
  },
  tab_logo() {
    const { esc, ic } = U;
    const L = this.draf(), st = S.adminSet.setting;
    const b = { nama: st.NAMA_APLIKASI || 'FinSight', sub: st.SUBJUDUL || 'Business Banking', logo: L.data, ukuran: L.ukuran, teks: L.teks };
    const ubah = L.data !== (st.LOGO_DATA || '') || String(L.ukuran) !== String(st.LOGO_UKURAN || 34) || (L.teks ? 'ya' : 'tidak') !== (st.LOGO_TEKS || 'ya');
    return `<div class="card pad-l"><h3>Logo aplikasi</h3><p class="muted">Logo tampil di sidebar dan halaman masuk untuk semua pengguna. Gunakan PNG/JPG/WEBP/SVG (maks. 5 MB) — gambar otomatis diperkecil & disimpan di sheet Pengaturan.</p>
      <div class="logo-ed">
        <div class="logo-prev"><small class="muted">Pratinjau sidebar</small><div class="brand${b.teks ? '' : ' no-teks'}" id="logoPrev" style="--logo:${b.ukuran}px">${App.logoHtml(b, b.ukuran)}${b.teks ? `<div class="brand-t"><b>${esc(b.nama)}</b><span>${esc(b.sub)}</span></div>` : ''}</div></div>
        <div class="form-g">
          <label class="fld"><span>Unggah logo baru</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-act="logoFile" id="logoFile"><small class="muted">Disarankan logo persegi/horizontal berlatar transparan.</small></label>
          <label class="fld"><span>Ukuran logo: <b class="tnum" id="logoUkTx">${L.ukuran} px</b></span><input type="range" min="24" max="80" step="1" value="${L.ukuran}" data-act="logoUk" id="logoUk"><small class="muted">Tinggi logo di sidebar (24–80 piksel). Di halaman masuk tampil sedikit lebih besar.</small></label>
          <label class="chk"><input type="checkbox" data-act="logoTeks" ${L.teks ? 'checked' : ''}><span>Tampilkan nama aplikasi (${esc(b.nama)}) di samping logo</span></label>
        </div>
      </div>
      <div class="card-f"><span class="muted">${ic('info', 14)} ${ubah ? '<b class="warn">Ada perubahan yang belum disimpan.</b>' : 'Nama & subjudul diubah di tab Umum.'}</span><div class="row-g">${st.LOGO_DATA || L.data ? `<button class="btn btn-secondary" data-act="logoBawaan">${ic('undo', 16)} Logo bawaan</button>` : ''}<button class="btn btn-primary" data-act="logoSimpan" ${ubah ? '' : 'disabled'}>${ic('check', 16)} Simpan logo</button></div></div></div>`;
  },
  /** Perkecil gambar ke ≤ 256 px lalu kompres sampai muat 1 sel Sheets (< 48.000 karakter). */
  async olahLogo(file) {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error('Format tidak didukung. Gunakan PNG, JPG, WEBP, atau SVG.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran berkas maksimal 5 MB.');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, gagal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => gagal(new Error('Gambar tidak dapat dibaca.')); i.src = url; });
      const w0 = img.naturalWidth || 256, h0 = img.naturalHeight || 256;
      for (const maks of [256, 200, 160, 128, 96]) {
        const k = Math.min(1, maks / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
        const kandidat = [c.toDataURL('image/png')];
        [0.92, 0.85, 0.75].forEach((q) => kandidat.push(c.toDataURL('image/webp', q)));
        const hasil = kandidat.filter((d) => /^data:image\/(png|webp);base64,/.test(d)).sort((a, b) => a.length - b.length)[0];
        if (hasil && hasil.length < 46000) return hasil;
      }
      throw new Error('Logo terlalu detail untuk disimpan. Coba gambar yang lebih sederhana.');
    } finally { URL.revokeObjectURL(url); }
  },
  tab_gateway() {
    const { esc, ic } = U;
    const s = S.adminSet.setting, tok = S.adminSet.rahasia.FONNTE_TOKEN, dv = S.devStatus;
    return `<div class="card pad-l"><h3>Mode pengiriman</h3><div class="opts row">
        <label class="opt ${s.WA_MODE !== 'fonnte' ? 'on' : ''}"><input type="radio" name="mode" data-k="WA_MODE" value="simulasi" ${s.WA_MODE !== 'fonnte' ? 'checked' : ''}>${ic('play', 20)}<span><b>Simulasi (UAT)</b><small>Alur, antrean & log berjalan tanpa mengirim pesan sungguhan.</small></span></label>
        <label class="opt ${s.WA_MODE === 'fonnte' ? 'on' : ''}"><input type="radio" name="mode" data-k="WA_MODE" value="fonnte" ${s.WA_MODE === 'fonnte' ? 'checked' : ''}>${ic('send', 20)}<span><b>Fonnte (kirim sungguhan)</b><small>Wajib token Fonnte. Pastikan disetujui kebijakan keamanan informasi.</small></span></label></div></div>
      <div class="card pad-l"><h3>Token Fonnte</h3><p class="muted">Disimpan di <b>Script Properties</b> (tidak di Sheets/kode/browser). Hanya ditampilkan tersamar.</p>
        <div class="tok"><span class="pill ${tok.ada ? 'pill-pos' : 'pill-grey'}">${tok.ada ? ic('lock', 12) + ' Tersimpan: ' + esc(tok.samar) : 'Belum diisi'}</span></div>
        <div class="row-g"><input type="password" id="tokIn" class="grow" placeholder="Tempel token baru dari dashboard Fonnte" autocomplete="off"><button class="btn btn-primary" data-act="simpanTok">${ic('lock', 16)} Simpan token</button>${tok.ada ? `<button class="btn btn-danger-soft" data-act="hapusTok">${ic('trash', 16)} Hapus</button>` : ''}</div>
        ${dv ? `<div class="dev ${dv.status ? 'ok' : 'bad'}">${ic(dv.status ? 'ok' : 'alertc', 18)}<div><b>Perangkat: ${esc(dv.perangkat || (dv.status ? 'terhubung' : 'tidak diketahui'))}</b><small>${dv.kuota ? 'Kuota Fonnte: ' + esc(dv.kuota) : ''}${dv.paket ? ' • Paket ' + esc(dv.paket) : ''}${dv.alasan ? esc(dv.alasan) : ''}</small></div></div>` : ''}</div>
      <div class="card pad-l"><h3>Batas & jeda</h3><div class="form-g g3" id="fSet">${this.inp('WA_KUOTA_HARIAN', 'number', 'min="1"')}${this.inp('WA_BATCH', 'number', 'min="5" max="40"')}${this.inp('WA_JEDA')}</div>
        <div class="card-f"><span></span><button class="btn btn-primary" data-act="simpan">${ic('check', 16)} Simpan pengaturan gateway</button></div></div>
      <div class="card pad-l"><h3>Tes kirim</h3><div class="row-g"><input id="tesNo" inputmode="tel" placeholder="Nomor WA (08xx / 62xx)" class="grow"><input id="tesPesan" class="grow" placeholder="Pesan tes (opsional)"><button class="btn btn-secondary" data-act="tes">${ic('send', 16)} Kirim tes</button></div></div>`;
  },
  tab_sinkron() {
    const { esc, ic } = U;
    const si = S.adminSet.sistem;
    return `<div class="card pad-l"><h3>Sinkronisasi hampir real-time</h3><p class="muted">Pemicu <b>onChange</b> menandai data berubah; browser memeriksa versi data secara berkala lalu memuat ulang otomatis. Pemicu <b>warmup</b> (5 menit) menangkap perubahan dari impor/skrip.</p>
        <div class="form-g g2" id="fSet">${this.inp('POLLING_DETIK', 'number', 'min="15" max="120"')}${this.inp('JT_HARI', 'number', 'min="1" max="180"')}</div>
        <div class="card-f"><div class="row-g"><button class="btn btn-secondary" data-act="sinkron">${ic('refresh', 16)} Sinkronkan sekarang</button><button class="btn btn-secondary" data-act="snapshot">${ic('calendar', 16)} Jalankan snapshot</button></div><button class="btn btn-primary" data-act="simpan">${ic('check', 16)} Simpan</button></div></div>
      <div class="card pad-l"><h3>Informasi sistem</h3><dl class="info-dl">
        <dt>Versi aplikasi</dt><dd>${esc(si.versi)}</dd><dt>Versi data</dt><dd class="tnum">${esc(si.dataVer)}</dd><dt>Jumlah debitur</dt><dd class="tnum">${U.num(S.D.length)}</dd>
        <dt>Spreadsheet database</dt><dd><a href="${esc(si.spreadsheetUrl)}" target="_blank" rel="noopener">Buka Google Sheets ${ic('ext', 13)}</a></dd>
        <dt>Folder ekspor PDF</dt><dd>${si.folderEkspor ? `<a href="${esc(si.folderEkspor)}" target="_blank" rel="noopener">Buka di Drive ${ic('ext', 13)}</a>` : '—'}</dd>
        <dt>Pemicu aktif</dt><dd>${si.pemicu.length ? si.pemicu.map((p) => `<span class="tag">${esc(p)}</span>`).join(' ') : '<span class="neg">Belum ada — jalankan setupAppEnvironment()</span>'}</dd></dl></div>`;
  },
  tab_impor() {
    const { esc, ic } = U;
    const r = this.hasil;
    return `<div class="card pad-l"><h3>Import data dari spreadsheet lain</h3><p class="muted">Sumber <b>hanya dibaca</b>. Kolom dicocokkan berdasarkan <b>nama header</b> (mis. “OS”, “Plafond”, “No HP” dikenali). Aman diulang — tidak membuat baris ganda. Jalankan <b>Pindai</b> dulu.</p>
      <div class="form-g"><label class="fld"><span>URL atau ID spreadsheet sumber</span><input id="impSrc" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(this.src || '')}"></label>
      <div class="imp-g">${[['Debitur', 'Debitur'], ['Pengguna', 'Pengguna'], ['Template_WA', 'Template_WA']].map((x) => `<label class="imp"><input type="checkbox" data-imp="${x[0]}" ${x[0] === 'Debitur' ? 'checked' : ''}><span><b>${x[0].replace('_', ' ')}</b><small>Nama sheet di sumber</small><input data-impn="${x[0]}" value="${x[1]}"></span></label>`).join('')}</div>
      <label class="chk"><input type="checkbox" id="impTimpa"><span>Timpa data yang sudah ada (default: hanya menambah yang baru). Rumus di sheet tujuan tetap dipertahankan.</span></label></div>
      <div class="card-f"><span class="muted">${ic('shield', 14)} Kredensial pengguna tidak pernah diimpor.</span><div class="row-g"><button class="btn btn-secondary" data-act="pindai">${ic('search', 16)} Pindai (dry-run)</button><button class="btn btn-primary" data-act="impor">${ic('upload', 16)} Jalankan import</button></div></div></div>
      ${r ? `<div class="card pad-l"><h3>${r.dryRun ? 'Hasil pindai' : 'Hasil import'} — ${esc(r.sumber.nama)}</h3><table class="tbl sm"><thead><tr><th>Data</th><th class="num">Di sumber</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>
        ${Object.keys(r.laporan).map((k) => `<tr><td><b>${esc(k)}</b></td><td class="num">${U.num(r.laporan[k].sumber)}</td><td class="num pos">${U.num(r.laporan[k].ditambah)}</td><td class="num info">${U.num(r.laporan[k].diperbarui)}</td><td class="num muted">${U.num(r.laporan[k].dilewati)}</td></tr>`).join('')}</tbody></table>
        ${r.peringatan.length ? `<ul class="warn-l">${r.peringatan.map((p) => `<li>${ic('alertc', 14)} ${esc(p)}</li>`).join('')}</ul>` : ''}</div>` : ''}`;
  },
  kumpul() {
    const o = {};
    document.querySelectorAll('#view [data-k]').forEach((el) => { if (el.type === 'radio') { if (el.checked) o[el.dataset.k] = el.value; } else o[el.dataset.k] = el.value; });
    return o;
  },
  async impor(dryRun, el) {
    const src = document.getElementById('impSrc').value.trim();
    if (!src) return U.toast('Isi URL/ID spreadsheet sumber.', 'warn');
    const sheets = {};
    document.querySelectorAll('[data-imp]').forEach((c) => { if (c.checked) sheets[c.dataset.imp] = document.querySelector(`[data-impn="${c.dataset.imp}"]`).value.trim(); });
    if (!Object.keys(sheets).length) return U.toast('Pilih minimal satu jenis data.', 'warn');
    if (!dryRun && !await U.konfirmasi({ title: 'Jalankan import?', body: 'Data akan ditulis ke spreadsheet database FinSight. Disarankan sudah menjalankan Pindai.', ok: 'Jalankan' })) return;
    this.src = src;
    el.disabled = true; const l = el.innerHTML; el.innerHTML = '<span class="spin"></span> Memproses…';
    const r = await Api.call('import.run', { sumber: src, sheets, dryRun, timpa: document.getElementById('impTimpa').checked }, { timeout: 300000 });
    el.disabled = false; el.innerHTML = l;
    if (!r.success) return U.toast(r.message, 'err', 6000);
    this.hasil = r.data; U.toast(r.message, 'ok');
    if (!dryRun) { App.muatData(true); S.users = null; }
    App.render({ tetap: true });
  },
  act: {
    tab: (el) => { S.f.set.tab = el.dataset.v; App.render(); },
    pmiNama: (el) => { const L = Pages.pengaturan.pmi; L[+el.dataset.i].nama = el.value; const b = document.querySelector('[data-act="pmiSimpan"]'); if (b) b.disabled = false; },
    pmiTambah: () => { (Pages.pengaturan.pmi || (Pages.pengaturan.pmi = UI.daftarPt().map((n) => ({ nama: n, lama: n })))).push({ nama: '', lama: '' }); App.render({ tetap: true }); setTimeout(() => { const x = document.querySelectorAll('.pmi-row input'); if (x.length) x[x.length - 1].focus(); }, 30); },
    pmiHapus: async (el) => {
      const L = Pages.pengaturan.pmi, x = L[+el.dataset.i];
      if (x.nama && !await U.konfirmasi({ title: 'Hapus PT?', body: `<b>${U.esc(x.nama)}</b> dihapus dari daftar. Data debitur di sheet tidak dihapus (akan tampil sebagai “PT lain”).`, ok: 'Hapus', bahaya: true })) return;
      L.splice(+el.dataset.i, 1); App.render({ tetap: true });
    },
    pmiNaik: (el) => { const L = Pages.pengaturan.pmi, i = +el.dataset.i; if (i > 0) { [L[i - 1], L[i]] = [L[i], L[i - 1]]; App.render({ tetap: true }); } },
    pmiBatal: () => { Pages.pengaturan.pmi = null; App.render({ tetap: true }); },
    pmiSimpan: async (el) => {
      const L = (Pages.pengaturan.pmi || []).map((x) => ({ nama: x.nama.replace(/\s+/g, ' ').trim(), lama: x.lama })).filter((x) => x.nama);
      el.disabled = true;
      const r = await Api.call('pmi.simpan', { daftar: L });
      if (!r.success) { el.disabled = false; return U.toast(r.message, 'err', 6000); }
      S.setting = Object.assign(S.setting, r.data.setting || {}); if (S.adminSet) S.adminSet.setting = Object.assign(S.adminSet.setting || {}, r.data.setting || {});
      Pages.pengaturan.pmi = null;
      if (r.data.diganti) await App.muatData(false);
      App.simpanLokal(); U.toast(r.message, 'ok', 5000); App.render({ tetap: true });
    },
    logoFile: async (el) => {
      const f = el.files && el.files[0];
      if (!f) return;
      try { Pages.pengaturan.draf().data = await Pages.pengaturan.olahLogo(f); App.render({ tetap: true }); }
      catch (e) { el.value = ''; U.toast(e.message, 'err'); }
    },
    logoUk: (el) => {
      const L = Pages.pengaturan.draf(); L.ukuran = Math.max(24, Math.min(80, +el.value || 34));
      const p = document.getElementById('logoPrev'), t = document.getElementById('logoUkTx');
      if (p) { p.style.setProperty('--logo', L.ukuran + 'px'); const g = p.querySelector('img,svg'); if (g) { g.style.height = L.ukuran + 'px'; if (g.tagName.toLowerCase() === 'svg') { g.setAttribute('width', L.ukuran); g.setAttribute('height', L.ukuran); } } }
      if (t) t.textContent = L.ukuran + ' px';
      clearTimeout(Pages.pengaturan._tLogo);
      Pages.pengaturan._tLogo = setTimeout(() => { if (App.halaman === 'pengaturan') App.render({ tetap: true }); }, 500);
    },
    logoTeks: (el) => { Pages.pengaturan.draf().teks = el.checked; App.render({ tetap: true }); },
    logoBawaan: (el) => { const L = Pages.pengaturan.draf(); L.data = ''; L.ukuran = 34; L.teks = true; App.render({ tetap: true }); },
    logoSimpan: async (el) => {
      const L = Pages.pengaturan.draf();
      el.disabled = true; const lbl = el.innerHTML; el.innerHTML = '<span class="spin"></span> Menyimpan…';
      const r = await Api.call('setting.simpan', { setting: { LOGO_DATA: L.data, LOGO_UKURAN: String(L.ukuran), LOGO_TEKS: L.teks ? 'ya' : 'tidak' } });
      el.disabled = false; el.innerHTML = lbl;
      if (!r.success) return U.toast(r.message, 'err');
      S.adminSet.setting = r.data.setting; S.setting = Object.assign(S.setting, r.data.setting);
      Pages.pengaturan.logo = null;
      App.segarBrand(); App.simpanLokal();
      U.toast('Logo disimpan — tampil untuk semua pengguna.', 'ok'); App.render({ tetap: true });
    },
    simpan: async (el) => {
      el.disabled = true;
      const r = await Api.call('setting.simpan', { setting: Pages.pengaturan.kumpul() });
      el.disabled = false;
      if (!r.success) return U.toast(r.message, 'err');
      S.adminSet.setting = r.data.setting; S.setting = Object.assign(S.setting, r.data.setting);
      U.toast(r.message, 'ok'); App.simpanLokal(); App.render({ tetap: true });
    },
    ubahSandi: async (el) => {
      const g = (id) => document.getElementById(id).value;
      if (g('pBaru') !== g('pUlang')) return U.toast('Konfirmasi kata sandi tidak cocok.', 'warn');
      el.disabled = true;
      const r = await Api.call('auth.ubahSandi', { lama: g('pLama'), baru: g('pBaru'), kode: g('pKode') });
      el.disabled = false;
      if (!r.success) return U.toast(r.message, 'err');
      Api.simpanSesi(r.data.token, S.me, Api.expDariToken(r.data.token));
      document.getElementById('fUbah').reset();
      U.toast(r.message, 'ok', 6000);
    },
    keluarSemua: async () => {
      if (!await U.konfirmasi({ title: 'Keluar dari semua perangkat?', body: 'Semua sesi termasuk di perangkat ini akan diakhiri.', ok: 'Keluar semua', bahaya: true })) return;
      await Api.call('auth.logout', { semua: true });
      Api.simpanSesi(null); App.hapusLokal(); location.hash = ''; location.reload();
    },
    simpanTok: async () => {
      const v = document.getElementById('tokIn').value.trim();
      if (!v) return U.toast('Tempel token terlebih dahulu.', 'warn');
      const r = await Api.call('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: v });
      document.getElementById('tokIn').value = '';
      if (!r.success) return U.toast(r.message, 'err');
      S.adminSet.rahasia.FONNTE_TOKEN = { ada: r.data.ada, samar: r.data.samar };
      if (S.gw) S.gw.tokenAda = r.data.ada;
      U.toast('Token tersimpan aman di Script Properties.', 'ok'); App.render({ tetap: true });
    },
    hapusTok: async () => {
      if (!await U.konfirmasi({ title: 'Hapus token Fonnte?', body: 'Pengiriman mode Fonnte akan berhenti sampai token baru diisi.', ok: 'Hapus', bahaya: true })) return;
      const r = await Api.call('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: '__HAPUS__' });
      if (!r.success) return U.toast(r.message, 'err');
      S.adminSet.rahasia.FONNTE_TOKEN = { ada: false, samar: '' };
      if (S.gw) S.gw.tokenAda = false;
      App.render({ tetap: true });
    },
    tes: async (el) => {
      el.disabled = true;
      const r = await Api.call('wa.tes', { nomor: document.getElementById('tesNo').value, pesan: document.getElementById('tesPesan').value });
      el.disabled = false;
      U.toast(r.message, r.success ? 'ok' : 'err', 6000);
    },
    sinkron: async (el) => {
      el.disabled = true;
      const r = await Api.call('cache.refresh', {});
      if (r.success && r.data.berubah) await App.muatData(false);
      el.disabled = false; U.toast(r.message, r.success ? 'ok' : 'err');
    },
    snapshot: async (el) => {
      el.disabled = true;
      const r = await Api.call('snapshot.jalankan', {});
      el.disabled = false;
      if (r.success) { S.snap = r.data.snap; M.reset(); App.simpanLokal(); }
      U.toast(r.message, r.success ? 'ok' : 'err');
    },
    pindai: (el) => Pages.pengaturan.impor(true, el),
    impor: (el) => Pages.pengaturan.impor(false, el),
    // ----- v1.3: sumber KUR PMI
    srcSimpan: async (el) => {
      const url = document.getElementById('srcUrl').value.trim(), sheet = document.getElementById('srcSheet').value.trim();
      if (!url) return U.toast('Tempel link spreadsheet KUR PMI.', 'warn');
      el.disabled = true; const lbl = el.innerHTML; el.innerHTML = '<span class="spin"></span> Membaca…';
      const r = await Api.call('pmi.sumber.simpan', { url, sheet }, { timeout: 90000 });
      el.disabled = false; el.innerHTML = lbl;
      if (!r.success) return U.toast(r.message, 'err', 7000);
      U.toast(r.message, 'ok', 5000);
      await App.muatData(false);
      await Pages.pengaturan.muatSumber();
    },
    srcPutus: async () => {
      if (!(await U.konfirmasi({ title: 'Putuskan spreadsheet KUR PMI?', body: 'Detail KUR PMI kembali diambil dari sheet Debitur. Spreadsheet KUR PMI tidak diubah.', ok: 'Putuskan' }))) return;
      const r = await Api.call('pmi.sumber.hapus', {});
      if (!r.success) return U.toast(r.message, 'err');
      U.toast(r.message, 'ok'); await App.muatData(false); await Pages.pengaturan.muatSumber();
    },
    // ----- v1.3: keamanan sistem
    kamSegar: () => { Pages.pengaturan.kam = null; App.render({ tetap: true }); },
    tsSimpan: async (el) => {
      const siteKey = document.getElementById('tsSite').value.trim(), secret = document.getElementById('tsSecret').value.trim();
      el.disabled = true;
      const r = await Api.call('keamanan.simpan', { aksi: 'turnstile', siteKey, secret });
      el.disabled = false;
      if (!r.success) return U.toast(r.message, 'err');
      S.setting.TURNSTILE_SITEKEY = siteKey; App.simpanBrand(); App.simpanLokal();
      U.toast(r.message, 'ok'); Pages.pengaturan.kam = null; App.render({ tetap: true });
    },
    tsOff: async () => {
      if (!(await U.konfirmasi({ title: 'Matikan Turnstile?', body: 'Halaman masuk tidak lagi memakai verifikasi Cloudflare.', ok: 'Matikan', bahaya: true }))) return;
      const r = await Api.call('keamanan.simpan', { aksi: 'turnstileOff' });
      if (!r.success) return U.toast(r.message, 'err');
      S.setting.TURNSTILE_SITEKEY = ''; App.simpanBrand(); App.simpanLokal();
      U.toast(r.message, 'ok'); Pages.pengaturan.kam = null; App.render({ tetap: true });
    },
    gwAcak: async () => {
      const b = crypto.getRandomValues(new Uint8Array(32));
      const v = Array.from(b).map((x) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789-_'[x % 58]).join('') + Array.from(crypto.getRandomValues(new Uint8Array(16))).map((x) => x.toString(16).padStart(2, '0')).join('');
      const i = document.getElementById('gwSecret'); if (i) { i.value = v; i.type = 'text'; }
      U.salin(v);
    },
    gwAktif: async (el) => {
      const secret = document.getElementById('gwSecret').value.trim();
      el.disabled = true;
      const r = await Api.call('keamanan.simpan', { aksi: 'gerbang', secret });
      el.disabled = false;
      if (!r.success) return U.toast(r.message, 'err', 9000);
      U.toast(r.message, 'ok', 6000); Pages.pengaturan.kam = null; App.render({ tetap: true });
    },
    gwOff: async () => {
      if (!(await U.konfirmasi({ title: 'Matikan gerbang Cloudflare?', body: 'URL Apps Script kembali bisa dipanggil langsung (tanpa pembatasan per IP).', ok: 'Matikan', bahaya: true }))) return;
      const r = await Api.call('keamanan.simpan', { aksi: 'gerbangOff' });
      U.toast(r.message, r.success ? 'ok' : 'err'); Pages.pengaturan.kam = null; App.render({ tetap: true });
    },
    aktSimpan: async () => {
      const r = await Api.call('keamanan.simpan', { aksi: 'aktivasi', jam: document.getElementById('aktJam').value });
      U.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { Pages.pengaturan.kam = null; App.render({ tetap: true }); }
    }
  }
};
