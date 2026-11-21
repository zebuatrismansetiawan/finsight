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
    if (d.dd === null) return '<small class="jt muted">—</small>';
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
    if (v === null || v === undefined || !isFinite(v)) return '<span class="dl flat">—</span>';
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
  const prodSelect = (val, act, semua = 'Semua Produk') => `<select class="sel" data-act="${act}"><option value="">${semua}</option>${S.produk.map((p) => `<option value="${esc(p.kode)}" ${val === p.kode ? 'selected' : ''}>${esc(p.kode)}</option>`).join('')}</select>`;
  const bisaKirim = () => ['Admin', 'RM'].includes(S.me.peran);
  const snapBanner = () => S.periode !== S.periodeIni
    ? `<div class="alert alert-info">${U.ic('calendar', 16)}<div>Menampilkan <b>snapshot akhir ${U.periodeLabel(S.periode, true)}</b>. Angka per debitur (jatuh tempo, risiko) hanya tersedia untuk periode berjalan. <a href="#" data-per-ini="1">Kembali ke periode berjalan</a></div></div>` : '';
  function chipsFilter(items) {
    if (!items.length) return '';
    return `<div class="fchips"><span class="muted">Filter:</span>${items.map((x) => `<span class="fchip">${esc(x[0])}<button data-act="unf" data-k="${x[1]}" aria-label="Hapus filter">${ic('x', 12)}</button></span>`).join('')}<button class="btn-link sm" data-act="reset">Reset</button></div>`;
  }
  return { prod, kol, status, jtInfo, logStatus, delta, kpi, head, pager, th, urut, halaman, uang, prodSelect, bisaKirim, snapBanner, chipsFilter, warnaProd };
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
    if (tipe === 'change' && !(tag === 'SELECT' || (tag === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio' || el.type === 'date')))) return;
    if (tipe === 'input' && !((tag === 'INPUT' && !['checkbox', 'radio', 'date'].includes(el.type)) || tag === 'TEXTAREA')) return;
    if (tipe === 'click' && tag === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) return;
    if (tag === 'A' || (tag === 'BUTTON' && el.type !== 'submit')) e.preventDefault();
    fn(el, e);
  };
  root.onclick = (e) => go(e, 'click');
  root.onchange = (e) => go(e, 'change');
  root.oninput = U.debounce((e) => go(e, 'input'), 140);
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
      UI.kpi({ icon: 'wallet', c: '#F43F7A', label: 'Total Limit Plafon', v: esc(pl.a), unit: pl.u, badge: UI.delta(B ? M.delta(A.plafon, B.plafon) : null), foot: ['Perubahan vs bulan lalu', B ? (A.plafon - B.plafon >= 0 ? '+' : '') + U.rpS(A.plafon - B.plafon) : '—', B && A.plafon >= B.plafon ? 'pos' : ''] }) +
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
    const k2 = live ? M.kol(f.pr) : A.kol, k2p = B ? B.kol : null;
    const share = (k) => { const n = k[2].b + k[3].b + k[4].b + k[5].b, t = n + k[1].b; return t ? n / t * 100 : 0; };
    const s2 = share(k2), s2p = k2p ? share(k2p) : null;
    const nRisk = K ? K.risiko : 0;
    const topProdRisk = live ? M.perProduk().slice().sort((a, b) => b.risiko - a.risiko)[0] : null;
    const insight = s2p === null
      ? `Porsi baki debet Kol. 2–5 saat ini <b>${U.pct(s2)}</b>. Perbandingan bulanan tersedia setelah snapshot bulan lalu terbentuk.`
      : `Porsi baki Kol. 2–5 ${s2 >= s2p ? 'naik' : 'turun'} <b>${U.dec(Math.abs(s2 - s2p), 1)} poin</b> dibanding ${U.periodeLabel(prev)} (kini ${U.pct(s2)}).`;
    h += `<section class="grid g12">
      <div class="card c8 pad-l">
        <div class="card-h"><div><h3><span class="sq"></span>Performa per Produk Kredit</h3><p>${f.mode === 'n' ? 'Total debitur vs debitur aktif per produk' : 'Plafon disetujui vs baki debet berjalan per produk'}</p></div>
          <div class="seg"><button class="${f.mode !== 'n' ? 'on' : ''}" data-act="mode" data-v="rp">Nominal</button><button class="${f.mode === 'n' ? 'on' : ''}" data-act="mode" data-v="n">Debitur</button></div></div>
        <div class="chart-wrap">${bar}</div>
        <div class="card-f"><div class="legend"><span><i class="lg-a"></i>${f.mode === 'n' ? 'Total debitur' : 'Plafon disetujui'}</span><span><i class="lg-b"></i>${f.mode === 'n' ? 'Debitur aktif' : 'Baki debet berjalan'}</span></div>
          <span class="muted">Plafon terserap: <b class="tx">${U.pct(totPl ? totBaki / totPl * 100 : 0)}</b> • Buffer tersisa: <b class="pos">${U.rpS(totPl - totBaki)}</b></span></div>
      </div>
      <div class="c4 col-stack">
        <div class="card pad-l">
          <div class="card-h"><h3>Komposisi Baki Debet</h3><span class="tag">${U.periodeLabel(p)}</span></div>
          <div class="donut-box">${Chart.donut({ segs: pp.map((x) => ({ label: x.nama, value: x.baki, color: x.warna })), center: U.rpS(totBaki), sub: 'Total OS', fmt: U.rpS })}</div>
          <ul class="dleg">${pp.map((x) => `<li><span><i style="background:${x.warna}"></i>${esc(x.nama)}</span><span class="tnum muted">${U.rpS(x.baki)}</span><b class="tnum">${U.pct(totBaki ? x.baki / totBaki * 100 : 0, 0)}</b></li>`).join('')}</ul>
        </div>
        <div class="card insight ${s2p !== null && s2 > s2p ? 'neg' : ''}">
          <span class="ins-ic">${ic(s2p !== null && s2 > s2p ? 'alert' : 'spark', 19)}</span>
          <div><div class="ins-t">${s2p !== null && s2 > s2p ? 'Peringatan portofolio' : 'Insight portofolio'}</div>
          <p>${insight}${live && nRisk ? ` Segera tinjau <b>${U.num(nRisk)} debitur berisiko</b>${topProdRisk && topProdRisk.risiko ? `, terbanyak pada produk <b>${esc(topProdRisk.kode)}</b>` : ''}.` : ''}</p>
          <a href="#/risiko" class="ins-a">Tinjau daftar risiko debitur ${ic('arrowright', 15)}</a></div>
        </div>
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
        ${top.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">#</th><th>Nama Debitur / ID</th><th>Produk</th><th>Kolektibilitas</th><th class="num">Baki Debet</th><th class="num">Angsuran / Bln</th><th class="num">Saldo Rekening</th><th class="num">Kekurangan Saldo</th><th class="c">Aksi</th></tr></thead><tbody>
        ${top.map((d, i) => `<tr><td class="c muted">${i + 1}</td><td class="stick"><button class="lnk" data-detail="${esc(d.id)}"><b>${esc(d.nm)}</b></button><small class="muted">${esc(d.id)} • ${d.dd === null ? '-' : d.dd < 0 ? 'Lewat ' + -d.dd + ' hr' : 'H-' + d.dd} jatuh tempo</small></td><td>${UI.prod(d.pr)}</td><td>${UI.kol(d.kol)}</td>${UI.uang(d.bd)}${UI.uang(d.an, 'muted')}${UI.uang(d.sa, 'warn b')}<td class="num"><span class="short">-Rp ${U.num(d.kurang)}</span></td>
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
    h += `<section class="grid g12">
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
    if (!adaBase) return App.kosong('info', 'Baseline awal bulan belum tersedia', 'Baseline dibuat otomatis oleh snapshot. Admin dapat menjalankan “Snapshot sekarang” di Pengaturan → Sinkronisasi.');
    if (!total) return App.kosong('ok', 'Tidak ada pergerakan', 'Belum ada debitur yang berubah kolektibilitas pada periode ini (atau tidak cocok dengan filter).');
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">#</th><th>ID Debitur</th><th>Nama Debitur</th><th>Produk</th><th class="c">Kol. Lalu</th><th></th><th class="c">Kol. Kini</th><th>Status Perubahan</th><th class="num">Baki Debet</th><th class="num">Saldo Rekening</th><th class="c">Tindakan</th></tr></thead><tbody>
      ${rows.map((d, i) => {
        const turun = d.mv > 0, npl = turun && d.kl <= 2 && d.kol >= 3, macet = d.kol === 5 && turun;
        const st = macet ? `<span class="pill pill-neg strong">${ic('alert', 12)} Jatuh ke NPL macet</span>` : npl ? `<span class="pill pill-neg">${ic('arrowdown', 12)} Turun (DPK → NPL)</span>` : turun ? `<span class="pill pill-neg">${ic('arrowdown', 12)} Turun (downgrade)</span>` : `<span class="pill pill-pos">${ic('arrowup', 12)} Naik (upgrade)</span>`;
        const aksi = turun && UI.bisaKirim() ? `<button class="btn btn-sm ${macet ? 'btn-danger' : 'btn-secondary'}" data-wa="${esc(d.id)}">${ic(macet ? 'gavel' : 'send', 14)} ${macet ? 'Tindak lanjut' : 'Tindak lanjut'}</button>` : `<button class="btn btn-sm btn-ghost" data-detail="${esc(d.id)}">${ic('eye', 14)} Detail</button>`;
        return `<tr class="${macet ? 'row-neg' : ''}"><td class="c muted">${(f.hal - 1) * f.per + i + 1}</td><td><span class="idtag ${macet ? 'neg' : ''}">${esc(d.id)}</span></td>
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
      const gerak = M.gerak(f.pr).map((d) => [d.id, d.nm, d.pr, d.kl, d.kol, d.mv > 0 ? 'Turun' : 'Naik', d.bd, d.sa, d.rm]);
      const pp = [];
      S.produk.forEach((x) => { const a = M.agregat(p, x.kode); if (a) [1, 2, 3, 4, 5].forEach((k) => pp.push([x.kode, 'Kol. ' + k, a.kol[k].n, a.kol[k].b])); });
      App.eksporXlsx('Ringkasan Kualitas Kredit', [{ h: 'Kolektibilitas', w: 14 }, { h: 'Kategori', w: 24 }, { h: 'Jumlah Debitur', t: 'n' }, { h: 'Porsi Debitur', t: 'p' }, { h: 'Baki Debet', t: 'n', w: 18 }, { h: 'Porsi Baki', t: 'p' }], ring,
        `Periode ${U.periodeLabel(p, true)}; Produk ${f.pr === 'ALL' ? 'semua' : f.pr}`,
        [{ name: 'Per Produk', cols: [{ h: 'Produk' }, { h: 'Kol' }, { h: 'Jumlah Debitur', t: 'n' }, { h: 'Baki Debet', t: 'n', w: 18 }], rows: pp },
          { name: 'Pergerakan', cols: [{ h: 'ID Debitur', w: 14 }, { h: 'Nama', w: 32 }, { h: 'Produk' }, { h: 'Kol Awal', t: 'n' }, { h: 'Kol Kini', t: 'n' }, { h: 'Arah' }, { h: 'Baki Debet', t: 'n', w: 18 }, { h: 'Saldo', t: 'n', w: 16 }, { h: 'RM', w: 20 }], rows: gerak }]);
    }
  }
};

// ============================================================================
//  DAFTAR DEBITUR
// ============================================================================
Pages.debitur = {
  judul: 'Daftar Debitur',
  f() { return S.f.deb = Object.assign({ q: '', pr: '', st: 'Aktif', kol: '', jt: '', dari: '', sampai: '', sort: 'jt', dir: 1, hal: 1, per: 10 }, S.f.deb || {}); },
  data(f) {
    let L = S.D;
    const q = (f.q || '').trim().toLowerCase(), h = S.hariIni;
    if (f.pr) L = L.filter((d) => d.pr === f.pr);
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
    if (f.pr) out.push(['Produk: ' + f.pr, 'pr']);
    if (f.st) out.push(['Status: ' + f.st, 'st']);
    if (f.kol) out.push([f.kol === 'npl' ? 'Kol. 3–5 (NPL)' : 'Kol. ' + f.kol, 'kol']);
    if (jt) out.push([jt, 'jt']);
    return out;
  },
  render() {
    const { esc, ic } = U;
    const f = this.f();
    const actions = `<button class="btn btn-secondary" data-act="xlsx">${ic('xls', 17, 'pos')} Unduh Excel (.xlsx)</button>
      <button class="btn btn-secondary" data-act="pdf">${ic('pdf', 17, 'neg')} Unduh PDF Laporan</button>
      <button class="btn btn-primary" data-act="sync">${ic('refresh', 17)} Sinkronkan Google Sheets</button>`;
    let h = UI.head({ crumb: ['Portofolio Kredit', 'Daftar Debitur'], title: 'Daftar Debitur', sub: 'Pencarian, pemfilteran komprehensif, dan ekspor data debitur portofolio.', actions });
    h += `<div class="card fbar col">
      <div class="fgrid">
        <div class="inp-ic f4">${ic('search', 16)}<input type="search" id="debQ" data-act="q" placeholder="Cari nama, ID, CIF, kontak, no. HP…  (tekan /)" value="${esc(f.q)}"></div>
        ${UI.prodSelect(f.pr, 'pr')}
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
    const kirim = UI.bisaKirim();
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
          ${UI.th('Debitur / CIF', 'id', f, 'stick-h')}${UI.th('Entitas & Kontak', 'nm', f)}${UI.th('Produk', 'pr', f, 'c')}${UI.th('Plafon', 'pl', f, 'num')}${UI.th('Baki Debet', 'bd', f, 'num')}${UI.th('Jatuh Tempo', 'jt', f)}${UI.th('Kol. OJK', 'kol', f, 'c')}${UI.th('Angsuran', 'an', f, 'num')}${UI.th('Status', 'st', f, 'c')}<th class="c">Aksi</th></tr></thead><tbody>
          ${rows.map((d) => `<tr class="${d.aktif ? '' : 'row-off'} ${S.sel.deb.has(d.id) ? 'row-sel' : ''}">${kirim ? `<td class="c"><input type="checkbox" data-act="sel" data-id="${esc(d.id)}" ${S.sel.deb.has(d.id) ? 'checked' : ''} aria-label="Pilih ${esc(d.nm)}"></td>` : ''}
            <td class="stick"><b class="tnum">${esc(d.id)}</b><small class="muted">${d.cif ? 'CIF ' + esc(d.cif) : '—'}</small></td>
            <td><div class="ent"><span class="avatar xs" style="--c:${UI.warnaProd(d.pr)}">${esc(U.inisial(d.nm))}</span><div><button class="lnk" data-detail="${esc(d.id)}"><b>${esc(d.nm)}</b></button><small class="muted">${ic('phone', 11, d.wv ? 'pos' : 'neg')} ${esc(d.wa || 'tidak valid')}${d.pic ? ' • ' + esc(d.pic) : ''}${d.oo ? ' • <span class="neg">opt-out</span>' : ''}</small></div></div></td>
            <td class="c">${UI.prod(d.pr)}</td><td class="num muted">${U.rpS(d.pl)}</td><td class="num b ${d.kol === 5 ? 'neg' : ''}">${U.rpS(d.bd)}</td>
            <td><b class="dt">${U.tgl2(d.jt)}</b>${UI.jtInfo(d)}</td><td class="c">${d.aktif ? UI.kol(d.kol, true) : '<span class="kol k0"><i></i>—</span>'}</td><td class="num">${U.rpS(d.an)}</td><td class="c">${UI.status(d.st)}</td>
            <td class="c"><div class="acts">${kirim && d.aktif ? `<button class="btn-icon sm pos" data-wa="${esc(d.id)}" title="Kirim WA" ${d.wv && !d.oo ? '' : 'disabled'}>${ic('chat', 15)}</button>` : ''}<button class="btn-icon sm" data-detail="${esc(d.id)}" title="Detail">${ic('eye', 15)}</button></div></td></tr>`).join('')}
          </tbody></table></div>${UI.pager(L.length, f.hal, f.per)}` : App.kosong('search', 'Tidak ada debitur yang cocok', 'Ubah kata kunci atau reset filter.')}
      </div>`;
  },
  ekspor(jenis, btn) {
    const f = this.f(), L = this.data(f), filt = this.labelFilter(f).map((x) => x[0]).join('; ') || 'Semua debitur';
    if (!L.length) return U.toast('Tidak ada data untuk diekspor.', 'warn');
    if (jenis === 'xlsx') {
      App.eksporXlsx('Daftar Debitur', [{ h: 'ID Debitur', w: 14 }, { h: 'CIF', w: 12 }, { h: 'Nama Debitur', w: 34 }, { h: 'Kontak', w: 16 }, { h: 'No. WA (tersamar)', w: 18 }, { h: 'Produk', w: 10 },
        { h: 'Plafon', t: 'n', w: 17 }, { h: 'Baki Debet', t: 'n', w: 17 }, { h: 'Tgl Jatuh Tempo', t: 'd', w: 14 }, { h: 'Status', w: 9 }, { h: 'Kol', t: 'n', w: 6 },
        { h: 'Saldo Blokir', t: 'n', w: 15 }, { h: 'Saldo Akhir', t: 'n', w: 15 }, { h: 'Angsuran', t: 'n', w: 15 }, { h: 'Berisiko', w: 10 }, { h: 'Opt-out WA', w: 10 }, { h: 'RM', w: 18 }],
        L.map((d) => [d.id, d.cif, d.nm, d.pic, d.wa, d.pr, d.pl, d.bd, d.jt, d.st, d.kol, d.sb, d.sa, d.an, d.risiko ? 'Ya' : '', d.oo ? 'Ya' : '', d.rm]), filt);
    } else {
      App.eksporPdf('Daftar Debitur', ['ID', 'Nama Debitur', 'Produk', 'Plafon', 'Baki Debet', 'Jatuh Tempo', 'Kol', 'Angsuran', 'Status'],
        L.map((d) => [d.id, d.nm, d.pr, U.rp(d.pl), U.rp(d.bd), U.tgl2(d.jt), d.kol, U.rp(d.an), d.st]), [3, 4, 7], filt,
        [['Jumlah debitur', U.num(L.length)], ['Total plafon', U.rpS(L.reduce((s, d) => s + d.pl, 0))], ['Total baki debet', U.rpS(L.reduce((s, d) => s + d.bd, 0))]], btn);
    }
  },
  act: {
    q: (el) => { const f = Pages.debitur.f(); f.q = el.value; f.hal = 1; Pages.debitur.segar(); },
    pr: (el) => { const f = Pages.debitur.f(); f.pr = el.value; f.hal = 1; Pages.debitur.segar(); },
    st: (el) => { const f = Pages.debitur.f(); f.st = el.value; f.hal = 1; Pages.debitur.segar(); },
    kol: (el) => { const f = Pages.debitur.f(); f.kol = el.value; f.hal = 1; Pages.debitur.segar(); },
    jt: (el) => { const f = Pages.debitur.f(); f.jt = el.value; f.hal = 1; App.render({ tetap: true }); },
    dari: (el) => { const f = Pages.debitur.f(); f.dari = el.value; f.hal = 1; Pages.debitur.segar(); },
    sampai: (el) => { const f = Pages.debitur.f(); f.sampai = el.value; f.hal = 1; Pages.debitur.segar(); },
    unf: (el) => { const f = Pages.debitur.f(); f[el.dataset.k] = ''; f.hal = 1; App.render({ tetap: true }); },
    reset: () => { S.f.deb = { st: '' }; App.render({ tetap: true }); },
    sort: (el) => { const f = Pages.debitur.f(); const k = el.dataset.k; f.dir = f.sort === k ? -f.dir : (['pl', 'bd', 'an', 'kol'].includes(k) ? -1 : 1); f.sort = k; Pages.debitur.segar(); },
    hal: (el) => { Pages.debitur.f().hal = +el.dataset.v; Pages.debitur.segar(); document.getElementById('debArea').scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    per: (el) => { const f = Pages.debitur.f(); f.per = +el.value; f.hal = 1; Pages.debitur.segar(); },
    sel: (el) => { el.checked ? S.sel.deb.add(el.dataset.id) : S.sel.deb.delete(el.dataset.id); Pages.debitur.segar(); },
    selPage: (el) => { const f = Pages.debitur.f(); UI.halaman(Pages.debitur.data(f), f).forEach((d) => (el.checked ? S.sel.deb.add(d.id) : S.sel.deb.delete(d.id))); Pages.debitur.segar(); },
    selAll: () => { Pages.debitur.data(Pages.debitur.f()).forEach((d) => S.sel.deb.add(d.id)); Pages.debitur.segar(); },
    selNone: () => { S.sel.deb.clear(); Pages.debitur.segar(); },
    blastSel: () => App.blastKe(Array.from(S.sel.deb), 'Daftar Debitur — pilihan'),
    cetak: () => App.cetak('Daftar Debitur', Pages.debitur.labelFilter(Pages.debitur.f()).map((x) => x[0]).join('; ')),
    xlsx: () => Pages.debitur.ekspor('xlsx'),
    pdf: (el) => Pages.debitur.ekspor('pdf', el),
    sync: async (el) => {
      el.disabled = true; el.innerHTML = `<span class="spin"></span> Menyinkronkan…`;
      const r = await Api.call('cache.refresh', {});
      if (r.success && r.data.berubah) await App.muatData(false);
      U.toast(r.success ? r.message : r.message, r.success ? 'ok' : 'err');
      el.disabled = false; el.innerHTML = `${U.ic('refresh', 17)} Sinkronkan Google Sheets`;
    }
  }
};

// ============================================================================
//  RISIKO GAGAL BAYAR
// ============================================================================
Pages.risiko = {
  judul: 'Risiko Gagal Bayar',
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
      <div><div class="ph-tags"><span class="tag neg"><i class="pulse"></i>Deteksi hampir real-time saldo rekening</span><span class="tag violet">${ic('shield', 13)} ${kirim ? 'Mode ' + (S.me.peran === 'RM' ? 'Relationship Manager' : 'Admin') + ': akses penuh penagihan' : 'Mode Manager: lihat saja'}</span></div>
        <h1>Deteksi Risiko Gagal Bayar</h1><p>Deteksi dini debitur berisiko sebelum jatuh tempo (saldo blokir kosong atau saldo akhir &lt; angsuran).</p></div>
      ${kirim ? `<div class="hero-a"><button class="btn btn-soft" data-act="semua">${ic('zap', 16)} Pilih semua berisiko (${U.num(this.data(f).length)})</button>
        <button class="btn btn-primary" data-act="lanjut" ${sel.size ? '' : 'disabled'}>${ic('chat', 17)} Lanjut ke WA Blast (${U.num(sel.size)} dipilih)</button></div>` : ''}</section>`;
    h += `<section class="grid g3">
      <div class="card rk"><div class="rk-t"><span class="kpi-ic soft" style="--c:#E11D48">${ic('target', 22)}</span><div><span class="kpi-l">Total debitur berisiko</span><div class="kpi-v tnum">${U.num(all.length)} <small>Debitur</small></div></div></div><div class="rk-f"><span>Baki debet terdampak</span><b class="tnum">${U.rpS(bakiR)}</b></div></div>
      <div class="card rk"><div class="rk-t"><span class="kpi-ic soft" style="--c:#DB2777">${ic('wallet', 22)}</span><div><span class="kpi-l">Total kekurangan saldo</span><div class="kpi-v tnum pink">${U.rpS(kurang)}</div></div><span class="badge-w">Defisit aktif</span></div><div class="rk-f"><span>Saldo blokir kosong • saldo &lt; angsuran</span><b class="tnum">${U.num(nBlk)} • ${U.num(nSal)}</b></div></div>
      <div class="card rk"><div class="rk-t"><span class="kpi-ic soft" style="--c:#7C3AED">${ic('calclock', 22)}</span><div><span class="kpi-l">Jatuh tempo terdekat</span><div class="kpi-v">${nextJt ? `<span class="tnum">${+nextJt.jt.slice(8)}</span> <small>${U.BLN[+nextJt.jt.slice(5, 7) - 1]} ${nextJt.jt.slice(0, 4)}</small>` : '—'}</div></div>${nextJt ? `<span class="badge-w">H-${nextJt.dd}${nextJt.dd <= 3 ? ' urgent' : ''}</span>` : ''}</div><div class="rk-f"><span>Debitur berisiko jatuh tempo ≤ 3 hari</span><b class="tnum">${U.num(nJt)} rekening</b></div></div></section>`;
    h += `<div class="card fbar"><div class="tabs">${[['all', 'Semua risiko', all.length], ['blokir', 'Saldo blokir kosong', nBlk], ['saldo', 'Saldo < angsuran', nSal], ['jt', 'Jatuh tempo ≤ 3 hari', nJt]].map((t) => `<button class="tab ${f.tab === t[0] ? 'on' : ''}" data-act="tab" data-v="${t[0]}">${t[1]} <em>${U.num(t[2])}</em></button>`).join('')}</div>
      <div class="row-g"><div class="inp-ic sm">${ic('search', 15)}<input type="search" data-act="q" placeholder="Cari debitur…" value="${esc(f.q)}"></div>${UI.prodSelect(f.pr, 'pr')}
      <label class="sel-wrap">${ic('filter', 15)}<select class="sel plain" data-act="sort"><option value="kurang" ${f.sort === 'kurang' ? 'selected' : ''}>Urutkan: defisit terbesar</option><option value="jt" ${f.sort === 'jt' ? 'selected' : ''}>Urutkan: jatuh tempo terdekat</option><option value="kol" ${f.sort === 'kol' ? 'selected' : ''}>Urutkan: kolektibilitas tertinggi</option><option value="baki" ${f.sort === 'baki' ? 'selected' : ''}>Urutkan: baki terbesar</option></select></label>
      <button class="btn btn-secondary btn-sm" data-act="xlsx">${ic('download', 15)} Ekspor XLSX</button></div></div>
      <section class="card tbl-card" id="riskArea"></section>`;
    h += `<section class="grid g12 gap-b">
      <div class="card c8 pad-l"><div class="card-h"><h3>${ic('list', 19, 'pink')} Prosedur Penagihan Preventif via WA</h3></div>
        <p class="muted">Penagihan preventif dikirim berjenjang melalui gateway WhatsApp. Gunakan template yang sesuai tahapan:</p>
        <div class="grid g3 play">${[['TPL-001', 'H-7 Reminder', 'Pemberitahuan ramah jadwal angsuran & ketersediaan saldo.', 'info'], ['TPL-002', 'H-3 Alert Defisit', 'Peringatan kekurangan saldo untuk mencegah denda keterlambatan.', 'warn'], ['TPL-003', 'H-1 Kontak Langsung', 'Eskalasi pesan dengan permintaan konfirmasi setoran ke RM.', 'neg']].map((x, i) => `<div class="pl pl-${x[3]}"><b>${i + 1}. ${x[1]}</b><p>${x[2]}</p>${kirim ? `<button class="btn-link sm" data-act="pakaiTpl" data-v="${x[0]}">Pakai template ini ${ic('arrowright', 13)}</button>` : ''}</div>`).join('')}</div>
        ${S.me.peran === 'Admin' ? `<div class="card-f"><span class="muted">${ic('check', 14, 'pos')} Template dapat disesuaikan oleh Admin</span><a class="lnk-a" href="#/template">Kelola template ${ic('arrowright', 14)}</a></div>` : ''}</div>
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
        <td class="stick"><button class="lnk" data-detail="${esc(d.id)}"><b>${esc(d.nm)}</b></button><small class="muted">ID ${esc(d.id)} • <span class="tnum">${esc(d.wa || 'nomor tidak valid')}</span>${d.oo ? ' • <span class="neg">opt-out</span>' : ''}</small></td>
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
    lanjut: () => { if (!S.sel.risk.size) return; App.blastKe(Array.from(S.sel.risk), 'Risiko Gagal Bayar', Pages.risiko.f().tpl); },
    xlsx: () => {
      const f = Pages.risiko.f(), L = Pages.risiko.data(f);
      if (!L.length) return U.toast('Tidak ada data untuk diekspor.', 'warn');
      App.eksporXlsx('Debitur Berisiko Gagal Bayar', [{ h: 'ID Debitur', w: 14 }, { h: 'Nama', w: 34 }, { h: 'Produk' }, { h: 'Kol', t: 'n', w: 6 }, { h: 'Saldo Blokir', t: 'n', w: 15 }, { h: 'Saldo Akhir', t: 'n', w: 15 }, { h: 'Angsuran', t: 'n', w: 15 }, { h: 'Kekurangan', t: 'n', w: 15 }, { h: 'Jatuh Tempo', t: 'd', w: 14 }, { h: 'Indikator', w: 34 }, { h: 'Baki Debet', t: 'n', w: 17 }],
        L.map((d) => [d.id, d.nm, d.pr, d.kol, d.sb, d.sa, d.an, d.kurang, d.jt, [d.fBlokir ? 'Saldo blokir kosong' : '', d.fSaldo ? 'Saldo < angsuran' : ''].filter(Boolean).join(' & '), d.bd]),
        { all: 'Semua risiko', blokir: 'Saldo blokir kosong', saldo: 'Saldo < angsuran', jt: 'Jatuh tempo ≤ 3 hari' }[f.tab] + (f.pr ? '; Produk ' + f.pr : ''));
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
    return `<div class="card pad-l"><div class="card-h"><div><h3>2. Pilih template pesan</h3><p>Placeholder seperti {nama} dan {angsuran} terisi otomatis per debitur.</p></div>${S.me.peran === 'Admin' ? `<a class="btn btn-sm btn-secondary" href="#/template">${ic('edit', 14)} Kelola template</a>` : ''}</div>
      ${tpl.length ? `<div class="tpl-pick">${tpl.map((t) => `<label class="tp ${b.tplId === t.id ? 'on' : ''}"><input type="radio" name="tpl" data-act="tpl" value="${esc(t.id)}" ${b.tplId === t.id ? 'checked' : ''}><div><b>${esc(t.nama)}</b><small class="muted">${esc(t.id)}</small><p>${waFormat(renderPesan(t.isi, contoh || {})).slice(0, 400)}</p></div></label>`).join('')}</div>`
        : App.kosong('template', 'Belum ada template aktif', 'Admin dapat menambahkan template di menu Template WA.')}
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
      App.eksporXlsx('Log Blast', [{ h: 'Waktu', w: 18 }, { h: 'Batch', w: 22 }, { h: 'ID Debitur', w: 14 }, { h: 'Nama Debitur', w: 30 }, { h: 'Template', w: 28 }, { h: 'Pengirim (NPP)' }, { h: 'Nama Pengirim', w: 22 }, { h: 'Status' }, { h: 'Percobaan', t: 'n' }, { h: 'Keterangan', w: 40 }],
        L.map((r) => [U.tglJam(r[2]), r[1], r[5], r[6], r[8], r[3], r[4], r[9], r[10], r[11]]), `Periode ${U.tgl(f.dari)} – ${U.tgl(f.sampai)}${f.status ? '; status ' + f.status : ''}${f.pengirim ? '; pengirim ' + f.pengirim : ''}`);
    }
  }
};

// ============================================================================
//  PENGGUNA & PERAN (Admin)
// ============================================================================
Pages.pengguna = {
  judul: 'Pengguna & Peran',
  render() {
    const { esc, ic } = U;
    const L = S.users;
    let h = UI.head({ crumb: ['Administrasi', 'Pengguna & Peran'], title: 'Pengguna & Peran', sub: 'Kelola akses berbasis NPP. Hak akses dicek di server pada setiap permintaan.', actions: `<button class="btn btn-primary" data-act="baru">${ic('userplus', 17)} Tambah Pengguna</button>` });
    h += `<div class="alert alert-info">${ic('key', 16)}<div><b>Alur login pertama:</b> pengguna masuk dengan NPP & kata sandi = NPP → wajib membuat kata sandi baru → memindai QR dengan Microsoft Authenticator. Gunakan <b>Reset akses</b> bila lupa sandi atau ganti HP.</div></div>`;
    if (!L) return h + '<div class="card pad"><span class="spin"></span> Memuat pengguna…</div>';
    const n = (fn) => L.filter(fn).length;
    h += `<section class="grid g5 mini-kpi">
      <div class="card mk"><div><span>Total pengguna</span><b class="tnum">${U.num(L.length)}</b></div><i class="mk-ic" style="--c:#7C3AED">${ic('users', 17)}</i></div>
      <div class="card mk"><div><span>Admin</span><b class="tnum">${n((u) => u.peran === 'Admin')}</b></div><i class="mk-ic" style="--c:#DB2777">${ic('shield', 17)}</i></div>
      <div class="card mk"><div><span>Relationship Manager</span><b class="tnum">${n((u) => u.peran === 'RM')}</b></div><i class="mk-ic" style="--c:#2563EB">${ic('user', 17)}</i></div>
      <div class="card mk"><div><span>Manager</span><b class="tnum">${n((u) => u.peran === 'Manager')}</b></div><i class="mk-ic" style="--c:#F97316">${ic('building', 17)}</i></div>
      <div class="card mk"><div><span>2FA aktif</span><b class="tnum pos">${n((u) => u.keamanan === '2FA aktif')}</b></div><i class="mk-ic" style="--c:#16A34A">${ic('phonem', 17)}</i></div></section>
      <section class="card tbl-card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>NPP</th><th class="stick-h">Nama</th><th>Peran</th><th>Status</th><th>Keamanan</th><th>Login terakhir</th><th class="c">Aksi</th></tr></thead><tbody>
      ${L.map((u) => {
        const kc = { '2FA aktif': 'pill-pos', 'Terkunci': 'pill-neg', 'Belum aktivasi': 'pill-grey', 'Wajib ganti sandi': 'pill-warn', 'Belum 2FA': 'pill-warn' }[u.keamanan] || 'pill-grey';
        const pc = { Admin: 'pink', RM: 'info', Manager: 'warn' }[u.peran];
        return `<tr class="${u.status === 'Aktif' ? '' : 'row-off'}"><td><span class="idtag tnum">${esc(u.npp)}</span></td><td class="stick"><div class="ent"><span class="avatar xs">${esc(U.inisial(u.nama))}</span><div><b>${esc(u.nama)}</b>${u.npp === S.me.npp ? ' <span class="tag">Anda</span>' : ''}<small class="muted">${esc(u.email || '—')}</small></div></div></td>
          <td><span class="tag ${pc}">${esc(u.peran === 'RM' ? 'Relationship Manager' : u.peran)}</span></td><td>${UI.status(u.status)}</td><td><span class="pill ${kc}">${esc(u.keamanan)}</span></td>
          <td class="muted nowrap">${u.login ? U.tglJam(new Date(u.login).getTime()) : 'Belum pernah'}</td>
          <td class="c"><div class="acts"><button class="btn btn-sm btn-secondary" data-act="edit" data-npp="${esc(u.npp)}">${ic('edit', 14)} Edit</button><button class="btn btn-sm btn-ghost" data-act="reset" data-npp="${esc(u.npp)}">${ic('key', 14)} Reset akses</button></div></td></tr>`;
      }).join('')}</tbody></table></div></section>`;
    return h;
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
    u = u || { npp: '', nama: '', email: '', peran: 'RM', status: 'Aktif' };
    const m = U.modal({
      title: baru ? 'Tambah Pengguna' : 'Edit Pengguna ' + u.npp, size: 'md',
      body: `<div class="form-g"><label class="fld"><span>NPP (5 digit)</span><input id="uNpp" inputmode="numeric" maxlength="5" value="${esc(u.npp)}" ${baru ? 'autofocus' : 'disabled'}></label>
        <label class="fld"><span>Nama lengkap</span><input id="uNama" maxlength="80" value="${esc(u.nama)}" ${baru ? '' : 'autofocus'}></label>
        <label class="fld"><span>Email (opsional)</span><input id="uEmail" type="email" value="${esc(u.email || '')}" placeholder="nama@kantor.co.id"></label>
        <label class="fld"><span>Peran</span><select id="uPeran" class="sel">${[['Admin', 'Admin — kelola data, template, pengguna'], ['RM', 'Relationship Manager — pantau & kirim WA blast'], ['Manager', 'Manager — tinjau ringkasan (lihat saja)']].map((p) => `<option value="${p[0]}" ${u.peran === p[0] ? 'selected' : ''}>${p[1]}</option>`).join('')}</select></label>
        <label class="fld"><span>Status</span><select id="uStatus" class="sel"><option ${u.status === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${u.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></label></div>
        ${baru ? `<div class="alert alert-info sm">${ic('info', 15)}<div>Kata sandi awal = NPP. Pengguna wajib menggantinya & mendaftarkan Microsoft Authenticator saat login pertama.</div></div>` : ''}`,
      footer: `<button class="btn btn-ghost" data-x="0">Batal</button><button class="btn btn-primary" data-x="1">${ic('check', 16)} Simpan</button>`
    });
    m.el.querySelector('#uNpp').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); };
    m.el.querySelector('[data-x="0"]').onclick = m.close;
    m.el.querySelector('[data-x="1"]').onclick = async (ev) => {
      ev.currentTarget.disabled = true;
      const r = await Api.call('user.simpan', { mode: baru ? 'tambah' : 'edit', npp: m.el.querySelector('#uNpp').value, nama: m.el.querySelector('#uNama').value, email: m.el.querySelector('#uEmail').value, peran: m.el.querySelector('#uPeran').value, status: m.el.querySelector('#uStatus').value });
      ev.currentTarget.disabled = false;
      if (!r.success) return U.toast(r.message, 'err');
      m.close(); U.toast(r.message, 'ok'); this.muat();
    };
  },
  act: {
    baru: () => Pages.pengguna.form(null),
    edit: (el) => Pages.pengguna.form(S.users.find((u) => u.npp === el.dataset.npp)),
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
    if (!admin) f.tab = 'profil';
    const tabs = [['profil', 'Profil & Keamanan', 'user']].concat(admin ? [['umum', 'Umum', 'settings'], ['gateway', 'Gateway WA', 'send'], ['sinkron', 'Sinkronisasi & Data', 'cloud'], ['impor', 'Import Data', 'upload']] : []);
    let h = UI.head({ crumb: ['Administrasi', 'Pengaturan'], title: 'Pengaturan', sub: admin ? 'Profil, keamanan akun, konfigurasi aplikasi, gateway WA, dan migrasi data.' : 'Profil dan keamanan akun Anda.' });
    h += `<div class="set-wrap"><nav class="set-nav">${tabs.map((t) => `<button class="${f.tab === t[0] ? 'on' : ''}" data-act="tab" data-v="${t[0]}">${ic(t[2], 17)}<span>${t[1]}</span></button>`).join('')}</nav><div class="set-body">`;
    if (admin && f.tab !== 'profil' && !S.adminSet) h += '<div class="card pad"><span class="spin"></span> Memuat pengaturan…</div>';
    else h += this['tab_' + f.tab]();
    return h + '</div></div>';
  },
  async mount(root) {
    pasangAksi(root, this);
    if (S.me.peran === 'Admin' && !S.adminSet) await this.muat();
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
    return `<div class="card pad-l"><div class="prof-card"><span class="avatar lg">${esc(U.inisial(S.me.nama))}</span><div><h3>${esc(S.me.nama)}</h3><p class="muted">NPP ${esc(S.me.npp)} • ${esc(S.me.peran === 'RM' ? 'Relationship Manager' : S.me.peran)}${S.me.email ? ' • ' + esc(S.me.email) : ''}</p>
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
      <div class="card pad-l"><h3>Informasi sistem</h3><dl class="info">
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
    impor: (el) => Pages.pengaturan.impor(false, el)
  }
};
