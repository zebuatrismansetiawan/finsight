# Panduan Instalasi FinSight v1.1.0

Monitoring Portofolio Kredit & Penagihan — Google Apps Script (backend REST API) + GitHub Pages (frontend PWA)

---

## ⬆️ Upgrade dari v1.0.0 ke v1.1.0 (aplikasi yang sudah berjalan)

Data, akun, kata sandi, authenticator yang sudah aktif, token Fonnte, dan URL `/exec` **tidak berubah**. Pengguna tidak perlu mendaftar ulang.

**Yang berubah di v1.1.0**

| # | Perubahan |
|---|---|
| 1 | Pengaturan → Import Data: kotak URL & 3 kotak nama sheet (Debitur, Pengguna, Template WA) tidak lagi keluar kotak |
| 2 | QR Microsoft Authenticator **sekali pakai & satu perangkat**: berlaku 3 menit, kunci manual tidak ditampilkan, QR baru otomatis membatalkan QR lama (jendela/HP lain), QR hangus permanen setelah kode pertama terverifikasi |
| 3 | Dashboard: "Total Limit Plafon" → **Total Maks Kredit**; baris "Plafon Belum Terserap" kini sejajar & rata kanan seperti "Angsuran Tertagih" |
| 4 | Ikon abu-abu bertanda (—) dihapus di semua halaman |
| 5 | **Pengaturan → Logo Aplikasi** (Admin): unggah logo + atur ukuran (24–80 px) + tampil/sembunyikan nama aplikasi |
| 6 | Subjudul & keterangan ditulis format **Proper** (kecuali *dan, untuk, dengan, per*) |
| 7 | Halaman "Risiko Gagal Bayar" → **Penagihan** (alamat `#/risiko` tetap) |
| 8–9 | Kotak berdampingan di Dashboard dan Kualitas Kredit sama tinggi |
| 10 | Daftar Debitur: kolom Debitur/CIF dihapus; urutan kolom **Entitas/Kontak, Rek Pinjaman, Rek Afil, Produk, Plafon, Baki Debet, Angsuran, Saldo Blokir, Saldo Akhir**, lalu Jatuh Tempo, Kol. OJK, Status, Aksi |
| 11 | **Keluar otomatis setelah 5 menit tanpa aktivitas** (peringatan muncul 30 detik sebelumnya) |
| 12 | Kartu "Insight portofolio" di Dashboard dihapus |

**A. Backend (Apps Script)** — ganti 5 berkas, 3 lainnya tetap

1. Buka proyek Apps Script FinSight. Di `Setup.gs`, **salin dulu baris `const ADMIN_AWAL = …` milik Anda** (berisi NPP Anda).
2. Ganti seluruh isi berkas **`Kode`, `Auth`, `Data`, `Migrasi`, `Setup`** dengan berkas baru. Di `Setup.gs`, tempel kembali baris `ADMIN_AWAL` Anda. (`Blast`, `Ekspor`, `appsscript.json` tidak berubah.)
3. Simpan (Ctrl+S) → jalankan **`setupAppEnvironment`** sekali. Fungsi ini hanya menambah kolom `Rek_Pinjaman` & `Rek_Afiliasi` di sheet Debitur (format teks) dan 3 baris `LOGO_*` di sheet Pengaturan — data, sandi, dan rahasia tidak disentuh.
4. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.** Jangan membuat deployment baru (URL `/exec` harus tetap sama).
5. Isi kolom `Rek_Pinjaman` dan `Rek_Afiliasi` di sheet Debitur (atau lewat menu Import). Selama `Rek_Pinjaman` kosong, kolom Rek Pinjaman menampilkan `ID_Debitur`.

**B. Frontend (GitHub Pages)**

1. Ekstrak `finsight-frontend-v1.1.0.zip`, lalu **salin semua isinya ke folder repository lama Anda** dan pilih *Ganti/Replace* bila ditanya. ZIP ini sengaja **tidak berisi `js/config.js`**, jadi URL `/exec` Anda tetap aman.
2. Dari terminal di folder repository tersebut:
   ```bash
   git add .
   git commit -m "FinSight v1.1.0"
   git push
   ```
3. Tunggu 1–2 menit, buka situs, tekan **Ctrl+Shift+R**. Di HP/PWA akan muncul pemberitahuan "Versi baru tersedia" → muat ulang. Footer menampilkan **v1.1.0**.

> **Catatan QR "1 perangkat".** Standar TOTP (dipakai Microsoft Authenticator) tidak memberi tahu server berapa HP yang memindai sebuah QR. Karena itu v1.1.0 menutup celahnya dari sisi lain: QR hanya tampil 3 menit, tidak ada kunci teks yang bisa disalin, hanya satu QR yang berlaku pada satu waktu, dan QR tidak bisa ditampilkan lagi setelah aktivasi. Pindah ke HP lain hanya bisa lewat **Admin → Pengguna → Reset 2FA**, yang sekaligus mengeluarkan semua sesi lama.

---

## 0. Isi paket & gambaran arsitektur

```
HP / Laptop  →  GitHub Pages (frontend PWA)  ──fetch JSON──►  Google Apps Script (REST API)  ──►  Google Sheets + Drive
                 index.html, css/, js/                         Kode.gs, Auth.gs, Data.gs, ...       database & folder ekspor
```

| Berkas | Dipasang di | Keterangan |
|---|---|---|
| `Kode.gs` | Apps Script | Router API, hak akses (RBAC) per panggilan, audit log |
| `Auth.gs` | Apps Script | Login NPP, ganti sandi wajib, 2FA Microsoft Authenticator (TOTP), sesi |
| `Data.gs` | Apps Script | Baca Sheets, cache berlapis, dataset debitur, snapshot kolektibilitas, pengaturan |
| `Blast.gs` | Apps Script | Template WA, antrean WA blast (Fonnte), log |
| `Ekspor.gs` | Apps Script | Laporan PDF ke folder Drive |
| `Migrasi.gs` | Apps Script | Import data dari spreadsheet lama (dry-run, aman diulang) |
| `Setup.gs` | Apps Script | Instalasi otomatis, data contoh, fungsi darurat |
| `appsscript.json` | Apps Script | Zona waktu Asia/Jakarta & setelan Web App |
| `finsight-frontend-v1.1.0.zip` | GitHub Pages | Isi folder ini = isi repository (index.html di root). Tidak berisi `js/config.js` — instalasi baru: salin `js/config.js` dari paket v1.0.0 atau buat sesuai langkah 3.2 |

> **Mode demo.** Sebelum backend terpasang, frontend otomatis berjalan dengan data fiktif. Buka `index.html` lewat server lokal atau GitHub Pages lalu login dengan NPP `10001` (Admin), `20001` (RM), atau `30001` (Manager). Kata sandi pertama = NPP. Kode authenticator demo ditampilkan di layar.

---

## 1. Pasang backend (Google Apps Script)

Gunakan **akun Google yang akan memiliki data** (sebaiknya akun kerja yang disetujui unit Anda).

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `FinSight API`.
2. Di **⚙️ Setelan Proyek**: centang **Tampilkan file manifes "appsscript.json"**. Pastikan **Zona waktu = (GMT+07:00) Jakarta**.
3. Buat 7 berkas skrip (ikon **+** → *Skrip*) dengan nama persis: `Kode`, `Auth`, `Data`, `Blast`, `Ekspor`, `Migrasi`, `Setup`. Hapus isi bawaan, lalu tempel isi berkas `.gs` yang sesuai.
4. Buka `appsscript.json`, ganti seluruh isinya dengan berkas `appsscript.json` dari paket.
5. Buka `Setup.gs`, **ganti NPP admin awal** dengan NPP Anda (5 digit):
   ```js
   const ADMIN_AWAL = { npp: '12345', nama: 'Nama Anda' };
   ```
6. Simpan semua (Ctrl+S). Pilih fungsi **`setupAppEnvironment`** di toolbar → **▶ Jalankan** → **Tinjau izin** → pilih akun → **Izinkan**.
7. Buka **Log eksekusi**. Harus muncul `✅ Setup selesai` beserta tautan spreadsheet. Setup membuat:
   - Folder Drive `📁 FinSight` berisi spreadsheet `🗃️ FinSight — Database` dan folder `📂 Ekspor Laporan`.
   - Sheet: `Debitur`, `Produk`, `Template_WA`, `Log_Blast`, `Pengguna`, `Snapshot_Kol`, `Snapshot_Debitur`, `Pengaturan`, `Audit_Log`, `AppConfig`.
   - 3 template WA awal, 5 produk, akun Admin awal, serta 4 pemicu otomatis (lihat bagian 7).
   > Setup **aman dijalankan ulang**: tidak menimpa data, sandi, atau rahasia yang sudah ada.
8. *(Opsional, untuk UAT)* Jalankan **`isiDataContoh`** → 150 debitur fiktif berawalan `DEMO-`. Hapus nanti dengan **`hapusDataContoh`**.
9. **Deploy** → **Deployment baru** → ikon roda gigi → **Aplikasi web**:
   - *Jalankan sebagai*: **Saya**
   - *Siapa yang memiliki akses*: **Siapa saja (Anyone)**
   - Klik **Deploy** → salin **URL yang berakhiran `/exec`**.

> **Mengapa "Anyone", bukan "Anyone with Google account"?** Frontend di GitHub Pages memanggil API dengan `fetch()` lintas domain; browser tidak bisa menyertakan sesi Google ke Apps Script sehingga opsi "with Google account" akan selalu gagal. Keamanan dijaga di server: setiap panggilan wajib membawa token sesi hasil login NPP + kata sandi + kode authenticator, dan peran dicek ulang di setiap permintaan.

**Setiap kali mengubah kode `.gs`:** Deploy → **Kelola deployment** → ✏️ Edit → Versi: **Versi baru** → Deploy. URL `/exec` tetap sama.

---

## 2. Isi data debitur

Data debitur **diedit langsung di Google Sheets** (aplikasi bersifat monitoring). Ada dua cara:

**A. Salin-tempel** ke sheet `Debitur` mulai baris 2. Kolom dibaca berdasarkan **nama header**, jadi urutan bebas.

| Kolom | Isi | Nama lain yang juga dikenali |
|---|---|---|
| `ID_Debitur` *(wajib, unik)* | ID / no. rekening pinjaman | ID, No Rekening, No Pinjaman |
| `Nama` | Nama debitur | Nama Debitur |
| `No_WA` | 08xx / 62xx (format **teks**) | No HP, WA, Telepon |
| `Produk` | BWU / CCC / KUR / KUR PMI / KPP | Jenis Produk |
| `Plafon`, `Baki_Debet` | Angka | Plafond, OS, Outstanding |
| `Tgl_Jatuh_Tempo` | Tanggal | Jatuh Tempo |
| `Status` | Aktif / Lunas | — |
| `Kolektibilitas` | 1–5 (boleh "Kol 2") | Kol |
| `Saldo_Blokir` | Angka; **kosong = dianggap belum diblokir** | — |
| `Saldo_Akhir`, `Angsuran` | Angka | Saldo, Angsuran Bulanan |
| `Opt_Out_WA` | `Ya` bila tidak ingin dihubungi | Opt Out |
| `Rek_Pinjaman` | No. rekening pinjaman (format **teks**). Kosong = tampil `ID_Debitur` | Rek Pinjaman, No Rek Pinjaman, Rekening Kredit |
| `Rek_Afiliasi` | No. rekening afiliasi/autodebet (format **teks**) | Rek Afil, Rekening Afiliasi, Rek Tabungan, Rek Autodebet |
| `CIF`, `Kontak`, `RM` | Opsional, untuk tampilan | — |

**B. Menu Import** (Admin → Pengaturan → Import Data): tempel URL spreadsheet lama → **Pindai (dry-run)** → **Jalankan import**. Sumber hanya dibaca, kunci `ID_Debitur` mencegah baris ganda, nomor WA diperbaiki (angka 0 di depan yang hilang dipulihkan), dan rumus di sheet tujuan dipertahankan. Import aman diulang sebelum *go-live* untuk menangkap data terbaru (delta).

> **Asumsi PRD yang perlu dikonfirmasi:** "Jatuh tempo 30 hari" dihitung **30 hari ke depan** dari hari ini (bisa diubah di Pengaturan → `JT_HARI`). Kolom `Tgl_Jatuh_Tempo` juga dipakai sebagai tanggal angsuran pada halaman Penagihan.

---

## 3. Pasang frontend di GitHub Pages

1. Ekstrak `finsight-frontend.zip`. Folder hasil ekstraksi (**berisi `index.html` langsung di dalamnya**) adalah folder yang akan di-*push*.
2. Buka `js/config.js`, tempel URL `/exec`:
   ```js
   window.APP_CONFIG = { GAS_URL: 'https://script.google.com/macros/s/AKfy..../exec' };
   ```
3. Buat repository baru di GitHub (**Public**, tanpa README). Lalu dari terminal **di dalam folder hasil ekstraksi**:
   ```bash
   dir            # Windows: pastikan index.html, css, js, icons terlihat di sini (Mac/Linux: ls)
   git init
   git add .
   git commit -m "FinSight v1.1.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/finsight.git
   git push -u origin main
   ```
   Saat diminta *password*, tempel **Personal Access Token** (github.com/settings/tokens → *Generate new token (classic)* → centang **repo**). Layar memang tidak menampilkan karakter saat token ditempel.
4. Di repository: **Settings → Pages** → *Source*: **Deploy from a branch** → *Branch*: **main / (root)** → Save → centang **Enforce HTTPS**.
5. Buka `https://USERNAME.github.io/finsight/` setelah 1–2 menit.

**Update frontend:** ubah berkas → `git add . && git commit -m "update" && git push`. Bila mengubah CSS/JS, naikkan `VERSI` di `sw.js` (mis. `finsight-v1.1.1`) dan angka `?v=` di `index.html` agar pengguna PWA mendapat versi baru.

> Ingin dipandu langkah demi langkah sambil kirim screenshot terminal? Minta saja — panduan GitHub Pages bisa dilakukan satu perintah per langkah.

---

## 4. Login pertama & manajemen pengguna

**Admin awal:**
1. Buka situs → NPP = NPP admin di `Setup.gs`, kata sandi = **NPP yang sama**.
2. Wajib **membuat kata sandi baru** (min. 8 karakter, huruf + angka, tidak memuat NPP).
3. Muncul **kode QR** (berlaku 3 menit, sekali pakai). Di HP: pasang **Microsoft Authenticator** → **+** → **Akun lainnya (Google, Facebook, dll.)** → **Pindai kode QR**. (Google Authenticator/Authy juga bisa.) Bila waktu habis, klik **Buat QR baru**.
4. Masukkan kode 6 digit → masuk ke dashboard. Setelah ini QR hangus dan tidak dapat ditampilkan lagi.

**Keluar otomatis:** bila 5 menit tidak ada aktivitas (klik, ketik, gulir, gerak mouse), aplikasi menampilkan peringatan 30 detik lalu keluar sendiri. Menutup tab lalu membukanya lagi setelah lebih dari 5 menit juga wajib login ulang. Pemeriksaan data otomatis di latar belakang tidak dihitung sebagai aktivitas.

**Logo aplikasi (Admin):** Pengaturan → **Logo Aplikasi** → unggah PNG/JPG/WEBP/SVG → geser **Ukuran logo** → **Simpan logo**. Gambar otomatis diperkecil dan disimpan di sheet Pengaturan (`LOGO_DATA`), lalu tampil di sidebar & halaman masuk semua pengguna. **Logo bawaan** mengembalikan logo FinSight.

**Login berikutnya:** NPP + kata sandi → kode 6 digit dari aplikasi authenticator.

**Menambah pengguna:** menu **Pengguna & Peran** → *Tambah Pengguna* (NPP, nama, peran Admin/RM/Manager). Pengguna baru mengikuti alur yang sama (sandi awal = NPP).

| Kejadian | Tindakan Admin (menu Pengguna → *Reset akses*) |
|---|---|
| Lupa kata sandi | **Reset sandi & 2FA** → login lagi dengan sandi = NPP |
| Ganti/hilang HP | **Reset 2FA saja** → QR baru (sekali pakai) muncul saat login berikutnya |
| Salah sandi 5x (terkunci 15 menit) | **Buka kunci akun** |

**Admin sendiri terkunci/lupa sandi:** buka editor Apps Script → jalankan **`resetAksesAdminAwal`**.

---

## 5. Gateway WhatsApp (Fonnte)

1. Bawaan aplikasi adalah **mode SIMULASI**: alur, antrean, dan log berjalan tetapi pesan **tidak** dikirim — cocok untuk UAT.
2. Daftar di <https://fonnte.com>, hubungkan nomor WA, salin **token** perangkat.
3. Admin → **Pengaturan → Gateway WA** → tempel token → **Simpan token**. Token disimpan di Script Properties dan hanya tampil tersamar (`ABCD••••••xyz`).
4. Pilih mode **Fonnte (kirim sungguhan)** → **Simpan**. Uji dengan **Kirim tes** ke nomor Anda.
5. Atur kuota harian, pesan per menit (`WA_BATCH`), dan jeda (`WA_JEDA`, mis. `3-8` detik) sesuai paket Fonnte.

Aturan kirim yang ditegakkan server: nomor dinormalkan ke 62xxx (tidak valid → dilewati), `Opt_Out_WA = Ya` tidak dikirimi, template sama ke debitur sama di hari yang sama → peringatan, kuota harian, dan seluruh pesan tercatat di `Log_Blast` + `Audit_Log`.

> ⚠️ **Kepatuhan:** nama, angsuran, dan nomor debitur dikirim melalui layanan pihak ketiga (Fonnte). Pastikan penggunaan ini disetujui unit Keamanan Informasi & Kepatuhan serta sesuai UU Pelindungan Data Pribadi sebelum mengaktifkan mode Fonnte dengan data nyata.

---

## 6. Di mana rahasia disimpan

Semua rahasia ada di **Apps Script → ⚙️ Setelan Proyek → Properti skrip** (tidak di kode, Sheets, atau browser).

| Properti | Diisi oleh | Isi |
|---|---|---|
| `SESSION_SECRET` | Otomatis saat setup | Kunci tanda tangan token sesi |
| `CRED_<NPP>` | Otomatis saat pengguna login | Hash + salt kata sandi & rahasia TOTP (bukan sandi asli) |
| `LOCK_<NPP>`, `REV_<NPP>` | Otomatis | Penguncian akun & pencabutan sesi |
| `FONNTE_TOKEN` | Admin lewat menu Gateway WA | Token gateway WA |
| `SPREADSHEET_ID`, `ROOT_FOLDER_ID`, `EXPORTS_FOLDER` | Otomatis saat setup | ID database & folder (dicatat juga di sheet AppConfig) |
| `VER_*`, `DATA_HASH`, `ANTRIAN_*` | Otomatis | Versi cache & penunjuk antrean |

- **Jangan** menambah editor proyek Apps Script sembarangan — editor dapat melihat Properti skrip.
- **Jangan** membagikan spreadsheet database ke pihak yang tidak berhak.
- Keluarkan **semua** pengguna sekaligus (mis. curiga kebocoran): jalankan **`rotasiSecretSesi`**.
- Kapasitas: ±1.500 pengguna (batas 500 KB Script Properties).

---

## 7. Sinkronisasi hampir real-time & pemicu otomatis

| Pemicu | Jadwal | Fungsi |
|---|---|---|
| `onChangeData` | Saat sheet diedit | Menaikkan versi data → browser memuat ulang |
| `prosesAntrian` | Tiap 1 menit | Mengirim antrean WA bertahap (berhenti cepat bila antrean kosong) |
| `warmupCache` | Tiap 5 menit | Menghangatkan cache & mendeteksi perubahan dari impor/skrip |
| `snapshotHarian` | ± 23:00 WIB | Mengisi `Snapshot_Kol` (tren) & baseline pergerakan Kol awal bulan |

Browser memeriksa versi data setiap 30 detik (Pengaturan → `POLLING_DETIK`, 15–120), melambat ke 60 detik saat pengguna diam, dan berhenti saat tab tidak aktif. Hasil: perubahan di Sheets tampil ≤ 30–60 detik tanpa muat ulang halaman. Tombol **Sinkronkan Google Sheets** memaksa pembaruan saat itu juga.

**Kecepatan:** dataset debitur dimuat sekali (±600 KB untuk 3.500 debitur, jauh lebih kecil bila terkompresi) lalu disimpan di browser; berikutnya hanya diunduh ulang bila data berubah. Pindah menu, filter, cari, urut, dan paging dihitung di perangkat (puluhan milidetik). Data lokal dihapus saat pengguna keluar.

---

## 8. Checklist uji penerimaan (UAT)

| Area | Uji | Hasil yang diharapkan |
|---|---|---|
| Hak akses | Login sebagai Manager | Menu WA Blast, Template, Pengguna tidak tampil; buka `#/blast` dialihkan; server menolak aksi kirim |
| Login | NPP baru, sandi = NPP | Wajib ganti sandi → QR → kode 6 digit |
| QR sekali pakai | Buka QR di 2 jendela, biarkan 3 menit, login ulang setelah aktif | QR lama ditolak; QR kedaluwarsa wajib dibuat ulang; QR tidak tampil lagi setelah aktif |
| Keluar otomatis | Diamkan aplikasi 5 menit | Peringatan 30 detik → kembali ke halaman masuk |
| Keamanan | Salah sandi 5x | Akun terkunci 15 menit |
| Akurasi | Bandingkan KPI dengan SUM/COUNT di Sheets | Sama (uji sampel per produk) |
| Sinkronisasi | Ubah, tambah, hapus baris Debitur | Tampil di web ≤ 60 detik |
| WA Blast | Nomor tidak valid, opt-out, kirim ganda, 200+ penerima | Dilewati / peringatan / terkirim bertahap |
| Ekspor | Excel & PDF dengan filter aktif | Isi sesuai filter, mencantumkan waktu cetak & nama pengguna; PDF tersimpan di Drive |
| Responsif | HP, tablet, desktop | Menu geser di HP, KPI 2 kolom, tabel bisa digeser |
| Kerahasiaan | Lihat Network di DevTools | Tidak ada nomor WA lengkap/token di respons; token sesi dikirim di body |

---

## 9. Pemecahan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Banner "Mode demo" masih tampil | `GAS_URL` belum diisi | Edit `js/config.js`, push ulang, Ctrl+Shift+R |
| "Respons server bukan JSON" | Akses Web App bukan *Anyone* / URL `/dev` | Deploy ulang: *Siapa saja*, pakai URL `/exec` |
| "Aplikasi belum di-setup" | `setupAppEnvironment` belum dijalankan | Jalankan dari editor |
| Kode authenticator selalu salah | Jam HP tidak otomatis | Aktifkan *tanggal & waktu otomatis* di HP |
| "QR sudah tidak berlaku" saat aktivasi | QR baru dibuat di jendela/HP lain, atau lewat 3 menit | Masuk ulang / klik **Buat QR baru**, lalu pindai QR terbaru saja |
| Tiba-tiba kembali ke halaman masuk | 5 menit tanpa aktivitas | Normal (keamanan). Login ulang |
| Kolom Rek Pinjaman/Afil kosong | Header belum ada di sheet Debitur | Jalankan `setupAppEnvironment` atau tambah header `Rek_Pinjaman` & `Rek_Afiliasi` |
| Data baru tidak muncul | Pemicu belum terpasang | Pengaturan → Sinkronisasi → *Pemicu aktif* harus 4; bila kosong jalankan setup lagi |
| Tren Kol kosong | Snapshot baru 1 bulan | Normal — tren terisi otomatis tiap akhir bulan |
| Pesan WA "Antre" terus | Mode Fonnte tanpa token / kuota habis | Isi token, cek kuota di menu Gateway |
| Tampilan versi lama | Cache PWA | Naikkan `VERSI` di `sw.js`, atau Ctrl+Shift+R |
| 404 di GitHub Pages | Yang di-push folder induk | Push ulang dari folder yang berisi `index.html` (`git push --force`) |
