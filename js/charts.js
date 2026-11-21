/* ==========================================================================
   FinSight — charts.js : grafik SVG ringan (tanpa library)
   barGroup (batang berkelompok), donut, lines (garis halus monoton + area)
   Tooltip memakai atribut data-tip (lihat U.initTip).
   ========================================================================== */
'use strict';

const Chart = (() => {
  const esc = U.esc;
  function niceStep(max, n = 4) {
    if (max <= 0) return 1;
    const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  let uid = 0;

  /** cats: [{label, color, a, b, tipA, tipB}] — a = seri latar (plafon), b = seri utama (baki). */
  function barGroup({ cats, la = 'Plafon', lb = 'Baki Debet', fmt = U.rpS, fmtAxis = (v) => U.rpS(v), h = 270 }) {
    const W = 760, H = h, L = 64, R = 12, T = 22, B = 34;
    const max = Math.max(1, ...cats.map((c) => Math.max(c.a || 0, c.b || 0)));
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const slot = (W - L - R) / Math.max(1, cats.length);
    const bw = Math.min(34, slot * 0.28), gap = 6;
    const id = 'bg' + (++uid);
    let g = '', defs = '';
    for (let v = 0; v <= top + 1e-9; v += step) {
      g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'ax' : 'grid'}"/><text x="${L - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${esc(v === 0 ? '0' : fmtAxis(v))}</text>`;
    }
    cats.forEach((c, i) => {
      const cx = L + slot * i + slot / 2;
      const xa = cx - bw - gap / 2, xb = cx + gap / 2;
      defs += `<linearGradient id="${id}g${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c.color}"/><stop offset="1" stop-color="${c.color}" stop-opacity=".78"/></linearGradient>`;
      const ha = Math.max(0, y(0) - y(c.a || 0)), hb = Math.max(0, y(0) - y(c.b || 0));
      const tip = `<b>${esc(c.label)}</b><br>${esc(la)}: ${esc(fmt(c.a || 0))}<br>${esc(lb)}: ${esc(fmt(c.b || 0))}` + (c.a ? `<br>Utilisasi: ${U.pct((c.b || 0) / c.a * 100)}` : '') + (c.extra ? '<br>' + esc(c.extra) : '');
      g += `<g class="bar-g" data-tip="${esc(tip)}"><rect x="${cx - slot / 2 + 4}" y="${T}" width="${slot - 8}" height="${H - T - B}" class="hov"/>` +
        `<rect x="${xa}" y="${y(c.a || 0)}" width="${bw}" height="${ha}" rx="6" class="bar-a"/>` +
        `<rect x="${xb}" y="${y(c.b || 0)}" width="${bw}" height="${hb}" rx="6" fill="url(#${id}g${i})"/>` +
        (c.b ? `<text x="${xb + bw / 2}" y="${y(c.b) - 6}" text-anchor="middle" class="val" fill="${c.color}">${esc(fmt(c.b, { noUnit: false }).replace('Rp ', ''))}</text>` : '') +
        `<text x="${cx}" y="${H - 12}" text-anchor="middle" class="cat">${esc(c.label)}</text></g>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grafik ${esc(la)} dan ${esc(lb)} per kategori"><defs>${defs}</defs>${g}</svg>`;
  }

  /** segs: [{label, value, color}] */
  function donut({ segs, center = '', sub = '', size = 190, thick = 22, fmt = (v) => U.num(v) }) {
    const total = segs.reduce((s, x) => s + (x.value || 0), 0);
    const r = 62, C = 2 * Math.PI * r;
    let off = 0, arcs = '';
    if (!total) arcs = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="#EEEDF5" stroke-width="${thick}"/>`;
    else {
      arcs = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="#F1F0F7" stroke-width="${thick}"/>`;
      const celah = segs.filter((s) => s.value > 0).length > 1 ? 1.6 : 0;
      segs.forEach((s) => {
        if (!s.value) return;
        const len = (s.value / total) * C;
        const tampil = Math.max(0.6, len - celah);
        const tip = `<b>${esc(s.label)}</b><br>${esc(fmt(s.value))} • ${U.pct(s.value / total * 100)}`;
        arcs += `<circle class="seg" cx="80" cy="80" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thick}" stroke-dasharray="${tampil} ${C - tampil}" stroke-dashoffset="${-off}" data-tip="${esc(tip)}"/>`;
        off += len;
      });
    }
    return `<div class="donut" style="width:${size}px;height:${size}px"><svg viewBox="0 0 160 160" width="${size}" height="${size}" style="transform:rotate(-90deg)" role="img" aria-label="Komposisi">${arcs}</svg>` +
      `<div class="donut-c"><div class="donut-v tnum">${esc(center)}</div><div class="donut-s">${esc(sub)}</div></div></div>`;
  }

  // Interpolasi kubik monoton (tidak "melenceng" di bawah nol)
  function monotonePath(pts) {
    const n = pts.length;
    if (n < 2) return n ? `M${pts[0][0]},${pts[0][1]}` : '';
    const dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dy[i] / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const c1 = [pts[i][0] + dx[i] / 3, pts[i][1] + t[i] * dx[i] / 3], c2 = [pts[i + 1][0] - dx[i] / 3, pts[i + 1][1] - t[i + 1] * dx[i] / 3];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
    }
    return d;
  }

  /** labels: [..], series: [{label, color, values:[..]}] */
  function lines({ labels, series, fmt = (v) => U.num(v), fmtAxis, h = 230, area = true }) {
    const W = 640, H = h, L = 58, R = 18, T = 14, B = 30;
    fmtAxis = fmtAxis || fmt;
    const all = series.flatMap((s) => s.values.filter((v) => v !== null && v !== undefined));
    const max = Math.max(1, ...all);
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const x = (i) => L + (labels.length < 2 ? (W - L - R) / 2 : (W - L - R) * i / (labels.length - 1));
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const id = 'ln' + (++uid);
    let g = '', defs = '';
    for (let v = 0; v <= top + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'ax' : 'grid'}"/><text x="${L - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${esc(v === 0 ? '0' : fmtAxis(v))}</text>`;
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => (v === null || v === undefined ? null : [x(i), y(v)])).filter(Boolean);
      if (!pts.length) return;
      const d = monotonePath(pts);
      if (area && si === 0) {
        defs += `<linearGradient id="${id}a" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".22"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
        g += `<path d="${d} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z" fill="url(#${id}a)"/>`;
      }
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${si === 0 ? 2.6 : 2.1}" stroke-linecap="round"/>`;
      const lp = pts[pts.length - 1];
      g += `<circle cx="${lp[0]}" cy="${lp[1]}" r="4.2" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
    });
    const colW = labels.length < 2 ? W - L - R : (W - L - R) / (labels.length - 1);
    labels.forEach((lb, i) => {
      const tip = `<b>${esc(lb)}</b>` + series.map((s) => `<br><span style="color:${s.color}">●</span> ${esc(s.label)}: <b>${esc(s.values[i] === null || s.values[i] === undefined ? '-' : fmt(s.values[i]))}</b>`).join('');
      g += `<g class="hcol" data-tip="${esc(tip)}"><rect x="${x(i) - colW / 2}" y="${T}" width="${colW}" height="${H - T - B}" fill="transparent"/><line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}" class="guide"/></g>`;
      g += `<text x="${x(i)}" y="${H - 9}" text-anchor="${i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}" class="cat${i === labels.length - 1 ? ' now' : ''}">${esc(lb)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grafik tren"><defs>${defs}</defs>${g}</svg>`;
  }

  return { barGroup, donut, lines };
})();
