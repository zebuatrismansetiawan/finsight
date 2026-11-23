/* ==========================================================================
   FinSight — Service Worker (PWA)
   - Cangkang aplikasi (HTML/CSS/JS/ikon) disajikan dari cache → buka instan,
     lalu diperbarui di latar belakang (stale-while-revalidate).
   - Panggilan ke Google Apps Script TIDAK PERNAH di-cache (data rahasia & selalu terbaru).
   - Naikkan VERSI setiap kali merilis perubahan frontend.
   ========================================================================== */
const VERSI = 'finsight-v1.4.0';
const ASET = ['./', './index.html', './css/style.css?v=1.4.0', './js/config.js?v=1.4.0', './js/icons.js?v=1.4.0', './js/util.js?v=1.4.0',
  './js/api.js?v=1.4.0', './js/qr.js?v=1.4.0', './js/xlsx.js?v=1.4.0', './js/charts.js?v=1.4.0', './js/laporan.js?v=1.4.0', './js/auth.js?v=1.4.0', './js/pages.js?v=1.4.0', './js/surat.js?v=1.4.0', './js/pak.js?v=1.4.0', './js/pakui.js?v=1.4.0', './js/analisa.js?v=1.4.0',
  './js/app.js?v=1.4.0', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                                  // POST API → langsung ke jaringan
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return; // API GAS: jangan di-cache
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return;
  if (url.pathname.endsWith('/js/config.js') || req.mode === 'navigate') {
    // network-first: konfigurasi & halaman selalu yang terbaru bila online
    e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(VERSI).then((c) => c.put(req, cp)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(VERSI).then((c) => c.put(req, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
