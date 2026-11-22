# FinSight — Frontend (PWA)

Monitoring portofolio kredit, kualitas kredit Kol. 1–5, deteksi risiko gagal bayar, dan WA blast penagihan.
Frontend statis (HTML/CSS/JS murni, tanpa framework) untuk GitHub Pages; backend = Google Apps Script REST API.

## Konfigurasi
Satu-satunya berkas yang perlu diubah: `js/config.js` → isi `GAS_URL` dengan URL Web App `/exec`.
Selama masih `GANTI_...`, aplikasi berjalan dalam **mode demo** (data fiktif; akun 10001/20001/30001, sandi pertama = NPP).

## Struktur
```
index.html        manifest.json      sw.js (service worker PWA)
css/style.css
js/config.js      URL backend (publik, bukan rahasia)
js/api.js         klien REST (POST text/plain, dedupe, batch, retry)
js/app.js         state, router, sinkronisasi polling, notifikasi
js/pages.js       9 halaman: Dashboard, Kualitas Kredit, Debitur, Penagihan, WA Blast, Template, Log, Pengguna, Pengaturan
js/auth.js        login NPP + ganti sandi + QR Microsoft Authenticator (sekali pakai, 3 menit)
js/qr.js          pembuat QR lokal (rahasia TOTP tidak dikirim ke layanan luar)
js/xlsx.js        ekspor Excel di browser   js/charts.js  grafik SVG   js/icons.js  ikon Lucide (ISC)
js/demo.js        backend tiruan, hanya dimuat di mode demo
icons/            ikon PWA
```

## Keamanan
Tidak ada rahasia di repository ini. Token gateway, hash sandi, dan rahasia TOTP hanya ada di Script Properties backend.
Panduan lengkap: `PANDUAN-INSTALASI.md`.
