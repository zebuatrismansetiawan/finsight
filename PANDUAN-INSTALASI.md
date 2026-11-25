# Panduan Instalasi FinSight v1.7.0

Monitoring Portofolio Kredit & Penagihan — Google Apps Script (backend REST API) + frontend PWA (GitHub Pages / Vercel) + Cloudflare (opsional, disarankan)

---

## ⬆️ Upgrade dari v1.6.0 ke v1.7.0 (aplikasi yang sudah berjalan)

Data, akun, kata sandi, authenticator, token Fonnte, logo, URL `/exec`, **Cloudflare Worker, `GATEWAY_SECRET`, dan `js/config.js` Anda tidak berubah.** Kolom & sheet baru dibuat otomatis (lihat langkah A). Fitur lain di luar 10 poin di bawah tidak diubah.

**Yang berubah di v1.7.0**

| # | Perubahan |
|---|---|
| 1 | **Kebijakan kata sandi (semua akun)**: berlaku **30 hari** lalu wajib membuat sandi baru • sandi yang **pernah dipakai ditolak** (pengguna diberi tahu) • sandi **tidak boleh mengandung NPP** login • salah **5× → dikunci 15 menit**, **7× → 30 menit**, **10× → DIBLOKIR** (hanya Super Admin yang dapat membuka) • **Super Admin hanya 1** — peran Super Admin tidak bisa diberikan ke pengguna lain |
| 2 | **Upliner & downliner**: Super Admin memilih **Upliner (atasan langsung)** tiap pengguna dari daftar pengguna terdaftar (**Pengguna & Peran → Edit**). Data Dashboard, Kualitas Kredit, Daftar Debitur & Penagihan untuk **Business Banking Manager, SME Credit Risk & Branch Manager** mengikuti seluruh bawahannya (rekursif, sesuai NPP RM pengelola). Diatur per peran di **Pengaturan → Akses Data → kolom "Data bawahan (downliner)"** |
| 3 | Tombol **Sinkronkan Google Sheets** hanya tampil (dan hanya diizinkan server) untuk **Super Admin** |
| 4 | **Produk tetap**: SME = **BCM, CCC, SCF, KPP SUPPLY** • SBP = **BWU, CCC, KUR, KPP DEMAND, KUR PMI**. Tulisan produk di database dikenali (`KPP SUP…` → KPP SUPPLY; `KPP DEM…` atau `KPP` saja → KPP DEMAND; `SCF …` → SCF). Produk di luar daftar (mis. OTHERS / LAINNYA) **tidak ditampilkan** di menu, Dashboard, Daftar Debitur, Detail, Penagihan & laporan — jumlahnya dilaporkan di **Sinkronisasi & Data → Cek kecocokan data per produk** |
| 5 | **Dashboard**: grafik *Performa per Produk Kredit* menggabungkan seluruh produk SME (BCM, CCC SME, SCF, KPP SUPPLY) menjadi **BCM**; pita produk berurutan **BCM, SCF, KPP SUPPLY, CCC, BWU, KUR, KPP DEMAND, KUR PMI**; tabel **Prioritas Tindakan** memakai satuan **Jt / M** seperti Penagihan & Daftar Debitur |
| 6 | **Jangka Waktu**: kolom baru `Jangka_Waktu` di sheet Debitur & pemetaan **Import Data** (Debitur Umum & KUR PMI) — KUR PMI tidak lagi kosong; Jangka Waktu juga tampil di **Detail Debitur SME & SBP** |
| 7 | **Tanggal Base Data**: kolom baru `Tgl_Data` (petakan di **Import Data → Atur kolom → Tanggal Base Data**; format `25/11/2026`, `2026-11-25`, `20261125`, `25 Nov 2026`, tanggal Excel dikenali). Satu rekening disimpan **per tanggal**. Dashboard, Kualitas Kredit, Daftar Debitur & Penagihan **otomatis menampilkan tanggal terbaru** ("Ringkasan … per <tanggal terbaru>") |
| 8 | Tombol **Posisi data** (mencolok, berlabel *TERBARU*) di Dashboard, Kualitas Kredit, Daftar Debitur & Penagihan untuk memilih tanggal lain yang ada di database. Saat melihat tanggal lama tampil banner oranye + tautan **Kembali ke data terbaru**. Super Admin dapat menghapus 1 tanggal di **Import Data → Tanggal Base Data** |
| 9 | **Analisa → tab baru "Format Excel"**: sheet **INPUT, CALL MEMO & BNI 105** digabung jadi 1 format yang sama dengan Excel (font, ukuran, lebar kolom, tinggi baris, margin, skala, pemisah halaman), rumus Excel dihitung otomatis dari data sheet **BATCH** & **No Surat** Anda, **link interaktif** (klik sel → kolom data sumbernya disorot; ubah data → format dihitung ulang & tersimpan; mode **Edit teks** untuk mengubah isi sel langsung), **Cetak / PDF A4**, dan **simulasi angsuran metode anuitas** |
| 10 | **Menu baru Pipeline** dengan sub halaman **Pipeline SME (RM)** dan **Pipeline SBP (PRM / ARM)** + mini dashboard **Total nominal pipeline** & **Total baki debet** RM/PRM/ARM yang ada di pipeline (dari base data tanggal terbaru) |

> ⚠️ **Sebelum upgrade — hanya boleh 1 Super Admin.** Buka sheet `Pengguna`. Bila ada lebih dari 1 baris berperan *Super Admin*, ubah dulu yang lain ke peran lain (mis. *Manager*). Bila tidak diubah, yang dipertahankan adalah Super Admin di **baris teratas** sheet `Pengguna`; Super Admin lainnya **tidak dapat masuk** sampai Super Admin memberinya peran lain di **Pengguna & Peran**.

**A. Backend (Apps Script)** — ganti **8 berkas** + buat **1 berkas baru**

1. Buka proyek Apps Script FinSight. Ganti **seluruh isi** berkas **`Kode`, `Auth`, `Data`, `Akses`, `Migrasi`, `Analisa`, `Setup`, `Keamanan`** dengan berkas baru dari paket.
2. Buat berkas skrip baru (ikon **+** → *Skrip*) bernama persis **`Pipeline`** → hapus isi bawaannya → tempel isi `Pipeline.gs`.
   (`Blast`, `Ekspor`, `appsscript.json` **tidak berubah**.)
3. Simpan (Ctrl+S). Pilih fungsi **`setupAppEnvironment`** → **▶ Jalankan** (aman diulang, tidak menimpa data/sandi). Setup v1.7 otomatis:
   - menambah kolom **`Upliner`** di sheet `Pengguna`, kolom **`Jangka_Waktu`** & **`Tgl_Data`** di sheet `Debitur`, dan sheet baru **`Pipeline`**;
   - menambahkan menu **Pipeline** ke peran yang sudah punya Dashboard/Daftar Debitur (sekali saja; bisa dicabut di **Peran & Hak Akses Menu**);
   - mengunci **1 Super Admin**.
   > Bila lupa menjalankan setup, langkah yang sama berjalan sendiri lewat pemicu `warmupCache` (±5 menit).
4. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.** (URL `/exec` tetap sama.)

**B. Frontend (Vercel / GitHub Pages)**

1. Ekstrak `finsight-frontend-v1.7.0.zip` ke folder baru → **pilih semua isinya** (Ctrl+A) → salin (Ctrl+C) → buka folder repository `finsight` → tempel (Ctrl+V) → pilih **"Replace the files in the destination / Ganti file di tujuan"** (**jangan Skip**). ZIP tidak berisi `js/config.js`.
2. Dari terminal di folder repository, pastikan berkas benar-benar terganti:
   ```bash
   git status
   ```
   Harus muncul **modified** antara lain `index.html`, `sw.js`, `css/style.css`, `js/app.js`, `js/pages.js`, dan berkas **baru** (*untracked*) `js/pipeline.js`, `js/xlkur.js`, `js/xlkur-data.js`. Lalu:
   ```bash
   git add .
   git commit -m "FinSight v1.7.0"
   git push
   ```
3. Tunggu Vercel **Ready** → buka **https://finsightbbjba.vercel.app/sw.js** harus tertulis `finsight-v1.7.0` → buka aplikasi → **Ctrl+Shift+R** → footer **v1.7.0**.

**C. Setelah upgrade (Super Admin)**

| # | Tugas | Di mana |
|---|---|---|
| 1 | Petakan **Jangka Waktu** & **Tanggal Base Data** lalu import ulang | **Pengaturan → Import Data → Atur kolom** (Debitur Umum & Debitur KUR PMI) → *Jangka Waktu* ← kolom jangka waktu/tenor database, *Tanggal Base Data* ← kolom tanggal posisi data → **Pindai** → **Jalankan import**. Import tanggal berikutnya menambah posisi baru tanpa menimpa tanggal lama |
| 2 | Isi **Upliner** tiap pengguna | **Pengguna & Peran → ✏️ Edit → Upliner (atasan langsung)** — mis. RM/PRM/ARM → BBM / Branch Manager; BBM → Branch Manager. Atau isi kolom `Upliner` (NPP atasan) di sheet `Pengguna` |
| 3 | Pastikan peran atasan memakai data bawahan | **Pengaturan → Akses Data → Cakupan data per peran** → centang **Data bawahan (downliner)** untuk Business Banking Manager, SME Credit Risk, Branch Manager (bawaan sudah tercentang bila nama perannya mengandung kata tersebut) → **Simpan** |
| 4 | Penanda tangan **Format Excel** | **Analisa → Perangkat Analisa KUR PMI → Atur format → Penanda tangan → Komite Kredit — anggota (format Excel)** |
| 5 | Uji **Format Excel** | **Analisa → Format Excel → Import data Excel** → pilih file Excel Anda yang berisi sheet **BATCH** (+ **No Surat**) → isi nomor batch bila hanya sebagian → **Import** |
| 6 | Uji kebijakan sandi | Login dengan sandi lama setelah 30 hari, atau coba ganti dengan sandi yang pernah dipakai → ditolak dengan pesan |

> **Catatan v1.7**
> - **Sandi lama sebelum upgrade** mulai dihitung 30 hari sejak login pertama setelah upgrade. Riwayat sandi yang dicek: 24 sandi terakhir (disimpan sebagai *hash*, tidak bisa dibaca siapa pun).
> - **Akun diblokir** (10× salah): Super Admin → **Pengguna & Peran → Reset akses → Buka kunci / blokir akun**. Bila yang diblokir **Super Admin sendiri**: editor Apps Script → jalankan `bukaBlokirAkun('NPP_ANDA')` (ganti dengan NPP Super Admin).
> - **Memindahkan peran Super Admin** ke orang lain (hanya 1): editor Apps Script → jalankan `pindahkanSuperAdmin('NPP_BARU', 'Manager')` — NPP baru menjadi Super Admin, Super Admin lama menjadi peran *Manager* (ganti sesuai kebutuhan).
> - **Upliner** hanya bisa diubah Super Admin, harus pengguna terdaftar, tidak boleh dirinya sendiri, dan tidak boleh melingkar (atasan tidak boleh bawahannya sendiri). Bila peran atasan belum punya bawahan, datanya kembali mengikuti segmen perannya.
> - **Tanggal Base Data**: baris lama tanpa tanggal tetap tampil di semua tanggal sampai digantikan baris bertanggal (rekening yang sama tidak dihitung ganda). Kirim WA & penagihan selalu memakai data terbaru. Baseline *Kol awal bulan* diambil dari posisi tanggal terakhir bulan sebelumnya bila ada.
> - **Format Excel**: sheet **No Surat** dan **BATCH** di file Anda adalah database — aplikasi hanya membacanya saat import (file tidak diunggah ke server, hanya datanya). Nomor surat (kolom AM) diambil dari sheet No Surat (kolom A, dicocokkan dengan nama di kolom C) bila kosong; kurs dari sel **AO1**, tanggal surat dari **AP1**; Gaji Rupiah (AI) = Gaji Yen × kurs. Template import (.xlsx) = susunan sheet BATCH (judul baris 2, data mulai baris 3).
> - Huruf **Calibri** dipakai seperti Excel. Di perangkat tanpa Calibri, browser memakai pengganti dengan ukuran setara (Carlito); cetak dari laptop Windows/Mac agar identik 100%.

<details>
<summary><b>Riwayat: upgrade dari v1.5.0 ke v1.6.0</b></summary>


Data, akun, kata sandi, authenticator, token Fonnte, logo, URL `/exec`, **Cloudflare Worker, `GATEWAY_SECRET`, dan `js/config.js` Anda tidak berubah.** Tidak ada kolom/sheet baru yang wajib dibuat. Fitur lain di luar 5 poin di bawah tidak diubah.

**Yang berubah di v1.6.0**

| # | Perubahan |
|---|---|
| 1 | **Detail Debitur di HP** tampil **2 kolom ringkas** seperti di laptop (sebelumnya 1 kolom memanjang) |
| 2 | **KUR PMI — Perusahaan**: data baru **Perusahaan** (tempat debitur bekerja, mis. *Fuji Co., Ltd.*) diambil dari sheet PT di database KUR PMI dan **dapat diatur kolomnya** di **Pengaturan → Mitra KUR PMI → Atur kolom** tiap PT (PT Minori Pemagang, PT Minori SSW, PT Aji, PT Nagomi, dan PT tambahan). Judul "Perusahaan" / "Nama Perusahaan" dikenali otomatis |
| 3 | **Daftar Debitur KUR PMI** tidak lagi menampilkan kolom PT Penempatan. **Perusahaan** (dan Mitra KUR PMI) tampil saat nama debitur diklik (**Detail Debitur**). Excel/PDF/Cetak mengikuti tabel |
| 4 | **SME**: sub menu **SME → BCM, CCC, SCF, OTHER**. Debitur SME dengan **CIF sama & lebih dari 1 Rek Pinjaman tampil 1 baris** (label *"n rekening"*) dengan **total** Plafon, Baki Debet, Angsuran, Saldo Blokir, Saldo Akhir (Kol = terburuk, Jatuh Tempo = terdekat). Klik nama → Detail berisi total + **rincian tiap rekening** (Rek Pinjaman, Plafon, Baki Debet, Angsuran, Jatuh Tempo, Saldo Blokir, Saldo Akhir, Kol. awal bulan, Tgl booking). Debitur SBP tetap 1 baris per rekening |
| 5 | **Data cocok dengan database**: (a) produk database dinormalkan — **KPP DEMAND → KPP**, **OTHERS → OTHER**, SCF; produk yang ada di data tetapi belum ada di master produk (BCM, SCF, OTHER) ikut tampil di Dashboard & filter. (b) **NPP login = kunci**: bila filter NPP aktif, pengguna menerima **semua** debitur yang NPP RM pengelolanya = NPP login-nya (apa pun segmen/produknya) — mis. ARM/PRM 67221 melihat BWU, KUR & KPP miliknya walau perannya tercatat "RM". NPP di data dibaca toleran (`061531`, `61531.0`, `NPP 61531`). (c) Bawaan **PRM / ARM = SBP + NPP sendiri**. (d) Alat cek baru: **Pengaturan → Akses Data → Cek NPP** dan **Pengaturan → Sinkronisasi & Data → Cek kecocokan data per produk** |

**A. Backend (Apps Script)** — ganti **3 berkas** saja

1. Buka proyek Apps Script FinSight. Ganti **seluruh isi** berkas **`Kode`, `Data`, `Akses`** dengan berkas baru dari paket.
   (`Auth`, `Ekspor`, `Setup`, `Keamanan`, `Migrasi`, `Blast`, `Analisa`, `appsscript.json` **tidak berubah**.)
2. Simpan (Ctrl+S). **Tidak perlu** menjalankan `setupAppEnvironment`.
3. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.** (URL `/exec` tetap sama.)

**B. Frontend (Vercel / GitHub Pages)**

1. Ekstrak `finsight-frontend-v1.6.0.zip` ke folder baru → **pilih semua isinya** (Ctrl+A) → salin (Ctrl+C) → buka folder repository `finsight` → tempel (Ctrl+V) → pilih **"Replace the files in the destination / Ganti file di tujuan"** (**jangan Skip**). ZIP tidak berisi `js/config.js`.
2. Dari terminal di folder repository, pastikan berkas benar-benar terganti:
   ```bash
   git status
   ```
   Harus muncul **modified** antara lain `index.html`, `sw.js`, `css/style.css`, `js/app.js`, `js/pages.js`, `js/akses.js`, `js/laporan.js`. Lalu:
   ```bash
   git add .
   git commit -m "FinSight v1.6.0"
   git push
   ```
3. Tunggu Vercel **Ready** → buka **https://finsightbbjba.vercel.app/sw.js** harus tertulis `finsight-v1.6.0` → buka aplikasi → **Ctrl+Shift+R** → footer **v1.6.0**.

**C. Setelah upgrade (Super Admin)**

| # | Tugas | Di mana |
|---|---|---|
| 1 | Petakan **Perusahaan** tiap PT | **Pengaturan → Mitra KUR PMI → Sumber data KUR PMI per PT → Atur kolom** (tiap PT) → baris **Perusahaan (tempat kerja)** ← kolom "Perusahaan" di sheet PT → **Simpan & terapkan** |
| 2 | Pastikan filter NPP peran RM & PRM/ARM | **Pengaturan → Akses Data** → centang **Hanya debitur dengan NPP RM sendiri** untuk RM dan PRM / ARM → **Simpan** |
| 3 | Uji NPP pengguna | **Akses Data → Cek NPP** → ketik mis. `67221` → bandingkan jumlah per produk dengan pivot database; baris "Setelah login menerima … debitur" harus sama |
| 4 | Cocokkan angka dengan pivot database | **Sinkronisasi & Data → Cek kecocokan data per produk** — kolom *Baris*, *Plafon* (makskrd), *Baki debet* per nilai produk/flag di sheet Debitur |

> **Catatan v1.6**
> - Bila jumlah di aplikasi berbeda dengan pivot database, lihat tabel rekonsiliasi: kolom **Ganda** (Rek Pinjaman sama dihitung 1×), **Tanpa kunci**, baris **Pindah ke KUR PMI** (rekening KUR yang cocok dengan sheet PT mitra), dan apakah sheet Debitur sudah di-import ulang dari database terbaru (**Import Data → Jalankan import**).
> - **Jumlah debitur SME** di Daftar Debitur dihitung **per CIF** (rekening ganda digabung); Dashboard, Kualitas Kredit & Penagihan tetap per rekening pinjaman.
> - **Saldo Akhir** total per CIF dijumlah per **rekening afiliasi** (rekening afiliasi yang sama tidak dihitung dua kali).
> - Pengaturan segmen yang disimpan di v1.5 otomatis mendapat **SCF & OTHER** di SME; bisa diubah di Akses Data.

</details>

<details>
<summary><b>Riwayat: upgrade dari v1.4.0 ke v1.5.0</b></summary>


Data, akun, kata sandi, authenticator, token Fonnte, logo, URL `/exec`, **Cloudflare Worker, `GATEWAY_SECRET`, dan `js/config.js` Anda tidak berubah.** Fitur lain di luar 16 poin di bawah tidak diubah.

**Yang berubah di v1.5.0**

| # | Perubahan |
|---|---|
| 1 | **Mitra KUR PMI — sumber per PT**: tiap PT (PT Minori Pemagang, PT Minori SSW, PT Aji, PT Nagomi) membaca **sheet-nya sendiri** di spreadsheet database KUR PMI. Baris judul & asal tiap kolom diatur sendiri (mis. *Nama Debitur* ← kolom **B** "Nama Deb", baris judul **5**). Debitur KUR PMI yang tidak ada di sheet PT mana pun **tidak ditampilkan**; PT yang tidak terdaftar / tidak punya sheet tidak ikut tampil |
| 2 | **Nominal ringkas dipotong, bukan dibulatkan**: Rp 999.568.274 → **Rp 999,56 Jt** (bukan Rp 1.000 Jt); ≥ 1 miliar → **Rp x,xx M**. Detail Debitur tetap nominal penuh |
| 3 | **Penagihan**: kolom Nama Debitur, Rek Pinjaman, Rek Afil, Produk, Kol, Tgl Booking, Jatuh Tempo, Plafon, Baki Debet, Angsuran, Saldo Akhir, Kekurangan Saldo, Indikator Risiko, Aksi Cepat. No HP yang belum ada = **kosong** (tanpa "nomor tidak valid"). Di **Detail Debitur**, semua peran hanya bisa **menambah / mengubah No HP** |
| 4 | Sub menu **Daftar Debitur bisa diciutkan** (status buka/tutup diingat) |
| 5 | **Kotak produk Dashboard** lebih ringkas: laptop 6 kotak sebaris, tablet 3, HP 2 — tidak tumpang tindih |
| 6 | **Hasil pencarian di HP** rapi: nama, rekening, CIF, produk & Kol tersusun per baris |
| 7 | **Import**: **CIF sama + Rek Pinjaman berbeda** = pinjaman terpisah → **diimpor & ditampilkan**; hasil pindai memuat daftarnya |
| 8 | **Filter Unit** di Daftar Debitur — 15 kantor bawaan (31100 KCU Jababeka … 31166 KC Delta Mas), **bisa ditambah / diubah Super Admin** |
| 9 | **Perangkat Analisa → Edit di Word** (Super Admin): membuat dokumen Google Docs berisi semua format (penanda tangan, kantor & kredit, semua kalimat). Perubahan di dokumen **otomatis masuk ke aplikasi** |
| 10 | **Filter NPP RM**: peran RM hanya menerima debitur dengan NPP-nya — di Dashboard, Kualitas, Daftar Debitur, Penagihan, WA Blast & pencarian (disaring di server). **Kolom NPP diatur Super Admin** |
| 11 | "Entitas / Kontak" → **Nama Debitur**; Penagihan "Debitur & Kontak" → **Nama Debitur** |
| 12 | Kolom **#** di Penagihan dihapus; "Kolektibilitas" & "Kol. OJK" → **Kol** |
| 13 | **Penagihan: unduh Excel, PDF & Cetak** untuk semua peran (kop, 5 kotak ringkasan, indikator risiko berwarna) |
| 14 | Sub menu **SME** (BCM, CCC) & **SBP** (BWU, CCC, KUR, KPP, KUR PMI). RM → SME; PRM / ARM → SBP; Business Banking Manager, Branch Manager, SME Credit Risk → semua (bisa diubah di **Pengaturan → Akses Data**) |
| 15 | **Salam di Dashboard** sesuai waktu (Selamat Pagi / Siang / Sore / Malam **Bpk/Ibu NAMA**) + **kata motivasi yang berganti tiap hari** |
| 16 | **Halaman masuk**: paragraf rata kanan-kiri (judul besar tetap rata kiri agar tidak berlubang), jarak logo ↔ "Selamat Datang" dirapatkan |

**A. Backend (Apps Script)** — ganti **5 berkas**, **tambah 1 berkas baru**

1. Buka proyek Apps Script FinSight. Ganti **seluruh isi** berkas **`Kode`, `Data`, `Migrasi`, `Blast`, `Analisa`** dengan berkas baru dari paket.
   (`Auth`, `Ekspor`, `Setup`, `Keamanan`, `appsscript.json` **tidak berubah** — baris `ADMIN_AWAL` di `Setup.gs` tidak perlu disentuh.)
2. Ikon **+** → *Skrip* → beri nama persis **`Akses`** → hapus isi bawaan → tempel isi **`Akses.gs`**.
3. Simpan (Ctrl+S).
4. Jalankan **`setupAppEnvironment`** sekali. Fungsi ini hanya **menambah 4 kolom di ujung kanan sheet `Debitur`** — `Tgl_Booking`, `Unit`, `NPP_RM`, `Segmen` — dan sheet baru **`Kontak_Debitur`** (No HP yang ditambahkan lewat aplikasi). Data, sandi & rahasia tidak disentuh. Bila dilewati, kolom dibuat otomatis saat import berikutnya.
5. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.** Jangan membuat deployment baru (URL `/exec` yang dipakai Worker harus tetap sama).

> **Pasang backend dulu, baru frontend.** Frontend v1.5 memanggil fitur baru di server (akses data, No HP, sumber per PT, Edit di Word).

**B. Frontend (GitHub Pages / Vercel)**

1. Ekstrak `finsight-frontend-v1.5.0.zip` → salin semua isinya ke folder repository lama → *Replace*. ZIP **tidak berisi `js/config.js`**, jadi `GAS_URL` Anda (URL Worker) tetap aman. Berkas baru: **`js/akses.js`**.
2. Dari terminal di folder repository:
   ```bash
   git add .
   git commit -m "FinSight v1.5.0"
   git push
   ```
3. Tunggu 1–2 menit → buka **https://finsightbbjba.vercel.app** → **Ctrl+Shift+R**. Footer menampilkan **v1.5.0**. Di HP/PWA akan muncul "Versi baru tersedia" → muat ulang.

**C. Setelah upgrade (Super Admin) — urutan yang disarankan**

| # | Tugas | Di mana |
|---|---|---|
| 1 | **Petakan kolom baru** Tgl Booking, Unit, NPP RM, Segmen | **Pengaturan → Import Data → Baca spreadsheet → Atur kolom** → pilih asalnya (mis. *NPP RM* ← kolom "NPP RM") → **Pindai (dry-run)** → periksa tabel *CIF sama dengan Rek Pinjaman berbeda* → **Jalankan import** (lihat **Bagian 2-B**). Bila kartu *Debitur KUR PMI* membaca **sheet yang sama** dengan *Debitur Umum* (mis. JBA), **hapus centangnya** — KUR PMI sudah ikut dari Debitur Umum |
| 2 | **Atur akses data per peran** | **Pengaturan → Akses Data**: kolom Unit / NPP RM / Segmen di sheet, produk tiap segmen (SME / SBP), segmen & filter NPP per peran, daftar unit (lihat **Bagian 4-B**) |
| 3 | **Hubungkan database KUR PMI per PT** | **Pengaturan → Mitra KUR PMI → Sumber data KUR PMI per PT** (lihat **Bagian 2-C**) |
| 4 | **Edit format analisa di Word** (opsional) | **Analisa → Perangkat Analisa KUR PMI → Edit di Word** (lihat **Bagian 6c-C**) |
| 5 | Periksa nama di salam Dashboard | Diambil dari **nama pengguna** (Pengguna & Peran) dan ditulis huruf besar, mis. *Selamat Pagi Bpk/Ibu BUDI SANTOSO* |

> **Catatan penting v1.5**
> - **RM yang belum punya data NPP**: filter NPP baru berlaku setelah kolom `NPP_RM` **berisi data**. Selama kolom masih kosong, RM melihat semua debitur segmen SME (Pengaturan → Akses Data menampilkan peringatan). Setelah terisi, RM hanya melihat debitur dengan NPP-nya — pastikan NPP di sheet sama dengan NPP login RM.
> - **Segmen CCC**: CCC ada di SME dan SBP. Segmennya diambil dari kolom `Segmen` bila terisi; bila kosong, dari peran RM pengelola (NPP RM → RM = SME, PRM/ARM = SBP).
> - **Grafik tren Kol bulanan** tidak ditampilkan untuk peran dengan filter NPP aktif, karena snapshot disimpan per produk, bukan per RM. Peran dengan filter segmen saja tetap melihat tren produk segmennya.

</details>

<details>
<summary><b>Riwayat: upgrade dari v1.3.0 ke v1.4.0</b></summary>


Data, akun, kata sandi, authenticator, token Fonnte, logo, URL `/exec`, **Cloudflare Worker, `GATEWAY_SECRET`, dan `js/config.js` Anda tidak berubah.** Fitur lain di luar 4 poin di bawah tidak diubah.

**Yang berubah di v1.4.0**

| # | Perubahan |
|---|---|
| 1 | **Halaman login hanya menampilkan logo** (nama aplikasi & subjudul disembunyikan) dengan logo lebih besar — bawaan 96 px, bisa diatur 48–160 px |
| 2 | **Super Admin bisa menampilkan / menyembunyikan** nama aplikasi & subjudul di halaman login (Pengaturan → Logo Aplikasi → *Halaman login*) |
| 3 | **Analisa → Perangkat Analisa KUR PMI**: dokumen 8 halaman sesuai format berkas *ANALISA KREDIT* (Perangkat Analisa, Struktur Fasilitas, 2 Call Memo, Check List), **import data massal** + **template Excel** (21 kolom), penanda tangan & semua isian diatur Super Admin, perhitungan **Beban Bunga, Angsuran Pokok, Total Kewajiban BNI/bulan** dengan **metode anuitas** (sama dengan rumus sheet *SIM KUR*), simulasi & tabel angsuran, cetak / simpan PDF |
| 4 | **Import data dapat dipetakan per kolom**: Debitur Umum & Debitur KUR PMI masing-masing memilih sheet sumber, baris judul, dan kolom sumber untuk tiap data di Daftar Debitur (mis. *Entitas* ← sheet **JBA** kolom **A** "Nama Deb"). Berlaku juga untuk **Sumber detail KUR PMI** |

**A. Backend (Apps Script)** — ganti **4 berkas**, berkas lain tetap

1. Buka proyek Apps Script FinSight. Ganti **seluruh isi** berkas **`Kode`, `Data`, `Analisa`, `Migrasi`** dengan berkas baru dari paket.
   (`Auth`, `Blast`, `Ekspor`, `Setup`, `Keamanan`, `appsscript.json` **tidak berubah** — baris `ADMIN_AWAL` di `Setup.gs` tidak perlu disentuh.)
2. Simpan (Ctrl+S).
3. *(Opsional)* Jalankan **`setupAppEnvironment`** sekali — hanya menambah 2 baris pengaturan **`LOGIN_TEKS`** & **`LOGIN_LOGO`** di sheet Pengaturan. Bila dilewati, baris itu dibuat otomatis saat Super Admin menyimpan pengaturan logo. Data, sandi & rahasia tidak disentuh.
4. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.** Jangan membuat deployment baru (URL `/exec` yang dipakai Worker harus tetap sama).

> **Pasang backend dulu, baru frontend.** Frontend v1.4 memanggil fitur baru di server (format Perangkat Analisa & pemetaan import).

**B. Frontend (GitHub Pages / Vercel)**

1. Ekstrak `finsight-frontend-v1.4.0.zip` → salin semua isinya ke folder repository lama → *Replace*. ZIP **tidak berisi `js/config.js`**, jadi `GAS_URL` Anda (URL Worker) tetap aman. Berkas baru: **`js/pak.js`** dan **`js/pakui.js`**.
2. Dari terminal di folder repository:
   ```bash
   git add .
   git commit -m "FinSight v1.4.0"
   git push
   ```
3. Tunggu 1–2 menit (Vercel memperbarui otomatis) → buka **https://finsightbbjba.vercel.app** → **Ctrl+Shift+R**. Footer menampilkan **v1.4.0**. Di HP/PWA akan muncul "Versi baru tersedia" → muat ulang.

> Selalu buka lewat alamat utama (`finsightbbjba.vercel.app`), bukan tautan deployment lama (`finsightbbjba-xxxx-….vercel.app`) — tautan lama masih memuat versi lama.

**C. Setelah upgrade (Super Admin)**

| Tugas | Di mana |
|---|---|
| Atur logo halaman login | **Pengaturan → Logo Aplikasi → Halaman login**: geser *Ukuran logo login* (disarankan 88–120 px), centang *Tampilkan nama aplikasi & subjudul* bila ingin tampil → **Simpan logo**. Pratinjau tampil langsung |
| Periksa format Perangkat Analisa | **Analisa → Perangkat Analisa KUR PMI → Atur format** → periksa tab *Penanda tangan*, *Kantor & kredit*, *Penyelenggara*, *Kolom data*, *Kalimat* → **Simpan format** (lihat **Bagian 6c-A**) |
| Import data analisa | **Template import (.xlsx)** → isi 1 baris per debitur → **Import data** |
| Petakan kolom import debitur | **Pengaturan → Import Data** → **Baca spreadsheet** → atur *Debitur Umum* & *Debitur KUR PMI* → **Pindai (dry-run)** (lihat **Bagian 2-B**) |
| Petakan kolom sumber KUR PMI | **Pengaturan → Mitra KUR PMI → Sumber detail KUR PMI → Pemetaan kolom** → **Perbarui** (lihat **Bagian 2-C**) |
| Hak akses menu Analisa | Tetap seperti v1.3 (**Pengguna & Peran → Peran & Hak Akses Menu → Analisa**). Hanya Super Admin yang bisa *Atur format* |

</details>

<details>
<summary><b>Riwayat: upgrade dari v1.2.0 ke v1.3.0</b></summary>

Data, akun, kata sandi, authenticator, token Fonnte, logo, dan URL `/exec` **tidak berubah**.

**Yang berubah di v1.3.0**

| # | Perubahan |
|---|---|
| 1 | **HP — bottom bar**: Dashboard, Debitur, **Kualitas** (tengah), Penagihan, **Menu**. Tombol Menu membuka menu lengkap (semua halaman + Keluar) |
| 2 | **Kunci database**: Debitur Umum = **`CIF`**, Debitur KUR PMI = **`Rek_Afiliasi`** (1 CIF / 1 Rek Afil = 1 debitur). `Rek_Pinjaman` tetap ditampilkan sebagai nomor rekening |
| 3 | **HP — footer**: Bantuan rata kiri, Kebijakan Privasi di tengah, versi rata kanan |
| 4 | **Detail KUR PMI dari spreadsheet terpisah**: Nama, Nama Perusahaan, Jangka Waktu, Batch diambil dari spreadsheet KUR PMI (dicocokkan lewat **Rek Afil**). Tabel KUR PMI kini punya kolom & filter **Batch** dan **Jangka Waktu** |
| 5 | **Keamanan**: Cloudflare Turnstile di halaman masuk, gerbang **Cloudflare Worker** (pembatas per IP, URL Apps Script tersembunyi), Content-Security-Policy, header keamanan, pemeriksaan keamanan di Pengaturan, perbaikan celah (lihat **Bagian 6b**) |
| 6 | **Lihat / sembunyikan kata sandi** di semua kolom sandi (masuk, ganti sandi pertama, ubah sandi lama/baru, token & secret) |
| 7 | **Halaman Analisa**: format surat Word (.docx) yang diatur Super Admin, template import otomatis, import data massal (.xlsx/.csv), pratinjau surat, unduh Word per surat / ZIP / gabung 1 file |

**A. Backend (Apps Script)** — ganti 6 berkas, **tambah 2 berkas baru**

1. Di `Setup.gs`, **salin dulu baris `const ADMIN_AWAL = …` milik Anda**.
2. Ganti seluruh isi **`Kode`, `Auth`, `Data`, `Blast`, `Migrasi`, `Setup`**. Tempel kembali baris `ADMIN_AWAL` di `Setup.gs`. (`Ekspor` dan `appsscript.json` tidak berubah.)
3. Buat **2 berkas skrip baru** (ikon **+** → *Skrip*) bernama persis **`Keamanan`** dan **`Analisa`**, lalu tempel isinya.
   > ⚠️ **`worker.js` dan `wrangler.toml` BUKAN untuk Apps Script.** Keduanya dipasang di **Cloudflare** (Bagian 6b). Bila `worker.js` ditempel ke Apps Script, proyek tidak bisa disimpan (*SyntaxError: Unexpected token 'export'*) — hapus berkas itu dari Apps Script.
4. Simpan → jalankan **`setupAppEnvironment`** sekali. Fungsi ini menambah sheet **`Template_Surat`** & **`Data_Analisa`**, pengaturan `AKTIVASI_JAM` & `TURNSTILE_SITEKEY`, format teks kolom rekening di `Log_Blast`, lalu melaporkan di log **CIF / Rek Afil yang kosong atau ganda**. Data, sandi & rahasia tidak disentuh.
5. **Deploy → Kelola deployment → ✏️ Edit → Versi baru → Deploy** (URL `/exec` tetap sama).
6. Jalankan **`cekKeamanan`** sekali → baca ringkasannya di Log eksekusi.

**B. Frontend (GitHub Pages / Vercel)**

1. Ekstrak `finsight-frontend-v1.3.0.zip` → salin semua isinya ke folder repository lama → *Replace*. (Tanpa `js/config.js`.) Berkas baru: `js/surat.js`, `js/analisa.js`, `vercel.json` (header keamanan Vercel), `_headers` (header keamanan Cloudflare Pages/Netlify).
2. `git add .` → `git commit -m "FinSight v1.3.0"` → `git push`. Tunggu 1–2 menit → **Ctrl+Shift+R**. Footer menampilkan **v1.3.0**.

**C. Setelah upgrade — periksa data (penting)**

| Tugas | Keterangan |
|---|---|
| Isi `CIF` semua Debitur Umum & `Rek_Afiliasi` semua debitur KUR PMI | Wajib unik. Baris kedua dengan CIF/Rek Afil yang sama **diabaikan** dan dilaporkan (log setup + kotak peringatan kuning di Daftar Debitur untuk Super Admin, lengkap dengan nomor barisnya). Selama kosong, debitur sementara memakai `Rek_Pinjaman` |
| Hubungkan spreadsheet KUR PMI | **Pengaturan → Mitra KUR PMI → Sumber detail KUR PMI**: tempel link spreadsheet + nama sheet → **Hubungkan**. Kolom wajib `Rek Afil`; kolom lain: `Nama`, `Nama Perusahaan`, `Jangka Waktu`, `Batch`. Akun pemilik Apps Script harus punya akses baca. Spreadsheet itu **hanya dibaca** |
| Beri menu Analisa | **Pengguna & Peran → Peran & Hak Akses Menu** → centang **Analisa** untuk peran yang perlu (awalnya hanya Super Admin) |
| Siapkan format surat | **Analisa → Pakai contoh format** (Memo Analisa Kredit) atau **Unggah format Word (.docx)** |
| Aktifkan Cloudflare | Ikuti **Bagian 6b** (Turnstile ±10 menit, Worker ±20 menit) |

> ⚠️ **Sandi awal kini kedaluwarsa.** Sandi awal (= NPP) hanya berlaku **72 jam** sejak akun dibuat / direset (atur di Pengaturan → Keamanan Sistem). Akun lama yang **belum pernah login** sejak dibuat lebih dari 72 jam lalu akan melihat pesan "Sandi awal kedaluwarsa" → Super Admin cukup klik **Reset akses** di Pengguna & Peran, lalu pengguna segera masuk. Super Admin awal yang terkunci dengan cara ini: jalankan `resetAksesAdminAwal` dari editor.

> **Catatan Log Blast.** Kolom `Rek_Pinjaman` di `Log_Blast` tetap berisi nomor rekening pinjaman. Riwayat WA lama tetap tampil dan antrean lama tetap terkirim (aplikasi mencocokkan rekening lama ke kunci baru).

</details>

<details>
<summary><b>Riwayat: upgrade dari v1.1.0 ke v1.2.0</b></summary>

Data, akun, kata sandi, authenticator yang sudah aktif, token Fonnte, logo, dan URL `/exec` **tidak berubah**. Pengguna tidak perlu mendaftar ulang. Satu-satunya efek yang terasa: setelah upgrade setiap akun hanya bisa aktif di **1 perangkat**.

**Yang berubah di v1.2.0**

| # | Perubahan |
|---|---|
| 1 | **Halaman masuk baru**: kartu 2 panel (panel kiri berwarna + ilustrasi, panel kanan form "Selamat Datang"), tombol lihat sandi, "Lupa kata sandi?", lencana keamanan. Di HP tampil 1 kolom tanpa ilustrasi |
| 2 | **Penagihan (HP)**: kartu Total Debitur Berisiko, Total Kekurangan Saldo, dan Jatuh Tempo Terdekat ditumpuk 1 kolom; angka, "Rp", satuan (Jt/M), serta tanggal–bulan–tahun sejajar dalam 1 baris dan tidak keluar kotak |
| 3 | **Logo** yang diunggah kini dipakai di semua tempat: sidebar, bilah atas HP, halaman masuk, ikon tab browser (favicon), dan kop laporan Excel/PDF/Cetak |
| 4 | **Kualitas Kredit**: kolom ID Debitur dihapus. Di database, **`Rek_Pinjaman` menjadi kunci debitur**; `ID_Debitur` kini opsional |
| 5–6 | **Unduh Excel, PDF, dan Cetak** memakai tampilan yang sama dengan tabel aplikasi: kop berwarna + logo, filter & waktu cetak, kotak ringkasan, kolom sama persis (Entitas/Kontak … Status), chip Produk/Kol/Status berwarna, total, nomor halaman. Excel tetap berisi angka asli (bisa dijumlah/difilter) |
| 7 | **Daftar Debitur** punya 2 sub-halaman: **Debitur Umum** dan **Debitur KUR PMI**. KUR PMI dikelompokkan per PT (bawaan: PT Minori Pemagang, PT Minori SSW, PT Aji, PT Nagomi) dari kolom baru **`PT_PMI`**; daftar PT dapat diubah Super Admin |
| 8 | **Admin → Super Admin**. Super Admin dapat **mengganti NPP** (termasuk NPP sendiri), **membuat peran baru**, dan mencentang **menu apa saja** yang boleh dibuka tiap peran |
| 9 | **HP: Floating Bottom Navigation** — Dashboard, Debitur, **Kualitas** (tombol tengah menonjol), Penagihan, Keluar |
| 10 | Tombol tanggal di samping lonceng (bilah atas) dihapus |
| 11 | **1 akun = 1 perangkat** (semua peran): login di perangkat baru otomatis menutup paksa sesi di perangkat lama |

**A. Backend (Apps Script)** — ganti 7 berkas, `appsscript.json` tetap

1. Buka proyek Apps Script FinSight. Di `Setup.gs`, **salin dulu baris `const ADMIN_AWAL = …` milik Anda** (berisi NPP Anda).
2. Ganti seluruh isi berkas **`Kode`, `Auth`, `Data`, `Blast`, `Ekspor`, `Migrasi`, `Setup`** dengan berkas baru. Di `Setup.gs`, tempel kembali baris `ADMIN_AWAL` Anda.
3. Simpan (Ctrl+S) → jalankan **`setupAppEnvironment`** sekali. Fungsi ini hanya:
   - menambah kolom **`PT_PMI`** di sheet Debitur dan memastikan `Rek_Pinjaman` berformat teks;
   - mengubah tulisan peran `Admin` → **`Super Admin`** di sheet Pengguna;
   - menambah 2 baris pengaturan **`PERAN_AKSES`** (menu per peran) dan **`PMI_PT`** (daftar PT) di sheet Pengaturan;
   - melaporkan di log berapa debitur yang **belum punya `Rek_Pinjaman`**.
   Data, sandi, authenticator, dan rahasia tidak disentuh.
4. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.** Jangan membuat deployment baru (URL `/exec` harus tetap sama).
5. Di sheet Debitur: **isi `Rek_Pinjaman` untuk semua debitur** (unik per debitur) dan isi **`PT_PMI`** untuk debitur produk KUR PMI. Selama `Rek_Pinjaman` kosong, aplikasi sementara memakai `ID_Debitur`. Setelah semua `Rek_Pinjaman` terisi, kolom `ID_Debitur` boleh dihapus.

> **Ganti backend dan frontend bersamaan.** Frontend v1.2 membutuhkan backend v1.2 (menu per peran & 1 perangkat dicek di server).

**B. Frontend (GitHub Pages / Vercel)**

1. Ekstrak `finsight-frontend-v1.2.0.zip`, lalu **salin semua isinya ke folder repository lama Anda** dan pilih *Ganti/Replace* bila ditanya. ZIP ini sengaja **tidak berisi `js/config.js`**, jadi URL `/exec` Anda tetap aman. Ada 1 berkas baru: `js/laporan.js`.
2. Dari terminal di folder repository tersebut:
   ```bash
   git add .
   git commit -m "FinSight v1.2.0"
   git push
   ```
   GitHub Pages / Vercel memperbarui situs otomatis setelah *push*.
3. Tunggu 1–2 menit, buka situs, tekan **Ctrl+Shift+R**. Di HP/PWA akan muncul "Versi baru tersedia" → muat ulang. Footer menampilkan **v1.2.0**.

**C. Setelah upgrade (Super Admin)**

| Tugas | Di mana |
|---|---|
| Atur menu tiap peran / buat peran baru | **Pengguna & Peran → tab Peran & Hak Akses Menu** → centang menu → **Simpan hak akses**. **+ Tambah Peran** untuk peran baru (mis. Kepala Cabang). Peran yang masih dipakai pengguna tidak bisa dihapus |
| Ganti NPP pengguna (termasuk NPP sendiri) | **Pengguna & Peran → ✏️ Edit** → ubah NPP → konfirmasi. Kata sandi & authenticator ikut pindah; sesi lama ditutup. Bila NPP sendiri yang diganti, Anda keluar lalu masuk dengan NPP baru |
| Ubah daftar PT KUR PMI | **Pengaturan → Mitra KUR PMI** (atau tombol **Kelola PT** di halaman Debitur KUR PMI): ganti nama, urutkan, tambah, hapus → **Simpan daftar PT**. Mengganti nama PT juga memperbarui isi kolom `PT_PMI` di sheet. Penulisan berbeda (mis. `pt aji`, `PT. Aji`) otomatis dikelompokkan ke PT yang sama |

**Hak akses bawaan setelah upgrade** (sama seperti v1.1, bisa diubah):

| Menu | Super Admin | RM | Manager |
|---|:-:|:-:|:-:|
| Dashboard, Kualitas Kredit, Daftar Debitur, Penagihan, Log Blast | ✅ | ✅ | ✅ |
| WA Blast | ✅ | ✅ | — |
| Template WA (kelola) | ✅ | — | — |
| Pengguna & Peran, Pengaturan aplikasi | ✅ (khusus) | — | — |

> **Catatan "1 perangkat".** Sesi lama ditutup begitu login di perangkat baru **berhasil sampai kode authenticator** (percobaan login yang gagal tidak mengganggu sesi yang sedang aktif). Perangkat lama kembali ke halaman masuk dengan pesan *"Akun Anda baru saja masuk di perangkat lain"* saat aplikasinya memeriksa data berikutnya (±30–60 detik bila tab terbuka) atau saat pengguna mengklik apa pun. Dua tab di browser yang sama tetap dihitung 1 perangkat.

> **Catatan logo.** Ikon aplikasi yang sudah terpasang di layar utama HP (PWA) adalah ikon bawaan dan tidak bisa berganti otomatis oleh browser; selain itu semua tampilan memakai logo yang diunggah.

> **Catatan tombol tanggal.** Tombol tanggal di bilah atas dulu juga dipakai untuk memilih *snapshot* bulan lalu. Karena tombolnya dihapus sesuai permintaan, aplikasi selalu menampilkan periode berjalan; data `Snapshot_Kol` tetap terisi dan grafik tren di Dashboard/Kualitas Kredit tetap memakai data bulan-bulan sebelumnya.

</details>

<details>
<summary><b>Riwayat: upgrade dari v1.0.0 ke v1.1.0</b></summary>

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

> **Catatan QR "1 perangkat".** Standar TOTP (dipakai Microsoft Authenticator) tidak memberi tahu server berapa HP yang memindai sebuah QR. Karena itu v1.1.0 menutup celahnya dari sisi lain: QR hanya tampil 3 menit, tidak ada kunci teks yang bisa disalin, hanya satu QR yang berlaku pada satu waktu, dan QR tidak bisa ditampilkan lagi setelah aktivasi. Pindah ke HP lain hanya bisa lewat **Super Admin → Pengguna → Reset 2FA**, yang sekaligus mengeluarkan semua sesi lama.

</details>

---

## 0. Isi paket & gambaran arsitektur

```
HP / Laptop  →  Vercel / GitHub Pages (frontend PWA)  ──fetch JSON──►  [Cloudflare Worker, opsional]  ──►  Google Apps Script (REST API)  ──►  Google Sheets + Drive
                 index.html, css/, js/                                    batas per IP, rahasia gerbang       Kode.gs, Auth.gs, …                  database & folder
```

| Berkas | Dipasang di | Keterangan |
|---|---|---|
| `Kode.gs` | Apps Script | Router API, hak akses per menu & peran (dicek tiap panggilan), audit log |
| `Akses.gs` *(v1.5)* | Apps Script | Cakupan data per peran (segmen SME/SBP, filter NPP RM, unit), No HP debitur, sumber KUR PMI per PT |
| `Auth.gs` | Apps Script | Login NPP, ganti sandi wajib, 2FA Microsoft Authenticator (TOTP), sesi 1 perangkat, ganti NPP, kebijakan sandi 30 hari & riwayat sandi, penguncian bertingkat, 1 Super Admin, upliner/downliner *(v1.7)* |
| `Data.gs` | Apps Script | Baca Sheets, cache berlapis, dataset debitur, snapshot kolektibilitas, pengaturan, peran & Mitra KUR PMI |
| `Blast.gs` | Apps Script | Template WA, antrean WA blast (Fonnte), log |
| `Ekspor.gs` | Apps Script | Laporan PDF (tampilan sama dengan aplikasi) ke folder Drive |
| `Migrasi.gs` | Apps Script | Import data dari spreadsheet lain (dry-run, aman diulang, pemetaan kolom per data) |
| `Setup.gs` | Apps Script | Instalasi otomatis, data contoh, fungsi darurat |
| `Keamanan.gs` | Apps Script | Gerbang Cloudflare, Turnstile, blokir per IP, masa berlaku sandi awal, pemeriksaan keamanan (`cekKeamanan`, `matikanTurnstile`, `matikanGerbang`) |
| `Analisa.gs` | Apps Script | Perangkat Analisa KUR PMI (format, penanda tangan, data import massal), Format Excel *(v1.7)* & format surat Word (Drive) |
| `Pipeline.gs` *(v1.7)* | Apps Script | Pipeline SME (RM) & SBP (PRM/ARM): simpan, hak lihat sesuai cakupan, total baki debet RM/PRM/ARM |
| `worker.js` (+ `wrangler.toml` opsional) | **Cloudflare Workers — bukan Apps Script** | Gerbang API (lihat Bagian 6b). Jangan ditempel ke editor Apps Script |
| `appsscript.json` | Apps Script | Zona waktu Asia/Jakarta & setelan Web App |
| `finsight-frontend-v1.7.0.zip` | GitHub Pages / Vercel | Isi folder ini = isi repository (index.html di root). Tidak berisi `js/config.js` — instalasi baru: buat `js/config.js` sesuai langkah 3.2 |

> **Mode demo.** Sebelum backend terpasang, frontend otomatis berjalan dengan data fiktif. Buka `index.html` lewat server lokal atau GitHub Pages lalu login dengan NPP `10001` (Super Admin), `20001` (RM), atau `30001` (Manager). Kata sandi pertama = NPP. Kode authenticator demo ditampilkan di layar.

---

## 1. Pasang backend (Google Apps Script)

Gunakan **akun Google yang akan memiliki data** (sebaiknya akun kerja yang disetujui unit Anda).

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `FinSight API`.
2. Di **⚙️ Setelan Proyek**: centang **Tampilkan file manifes "appsscript.json"**. Pastikan **Zona waktu = (GMT+07:00) Jakarta**.
3. Buat 11 berkas skrip (ikon **+** → *Skrip*) dengan nama persis: `Kode`, `Auth`, `Data`, `Blast`, `Ekspor`, `Migrasi`, `Setup`, `Keamanan`, `Analisa`, `Akses`, `Pipeline`. Hapus isi bawaan, lalu tempel isi berkas `.gs` yang sesuai.
4. Buka `appsscript.json`, ganti seluruh isinya dengan berkas `appsscript.json` dari paket.
5. Buka `Setup.gs`, **ganti NPP admin awal** dengan NPP Anda (5 digit):
   ```js
   const ADMIN_AWAL = { npp: '12345', nama: 'Nama Anda' };
   ```
6. Simpan semua (Ctrl+S). Pilih fungsi **`setupAppEnvironment`** di toolbar → **▶ Jalankan** → **Tinjau izin** → pilih akun → **Izinkan**.
7. Buka **Log eksekusi**. Harus muncul `✅ Setup selesai` beserta tautan spreadsheet. Setup membuat:
   - Folder Drive `📁 FinSight` berisi spreadsheet `🗃️ FinSight — Database` dan folder `📂 Ekspor Laporan`.
   - Sheet: `Debitur`, `Produk`, `Template_WA`, `Log_Blast`, `Pengguna`, `Snapshot_Kol`, `Snapshot_Debitur`, `Pengaturan`, `Audit_Log`, `AppConfig`, `Template_Surat`, `Data_Analisa`, `Kontak_Debitur`, `Pipeline` *(v1.7)*.
   - 3 template WA awal, 8 produk (BCM, SCF, KPP SUPPLY, CCC, BWU, KUR, KPP DEMAND, KUR PMI), akun Super Admin awal, serta 4 pemicu otomatis (lihat bagian 7).
   > Setup **aman dijalankan ulang**: tidak menimpa data, sandi, atau rahasia yang sudah ada.
8. *(Opsional, untuk UAT)* Jalankan **`isiDataContoh`** → 150 debitur fiktif (CIF berawalan `DEMO`, sebagian KUR PMI lengkap dengan PT). Hapus nanti dengan **`hapusDataContoh`**.
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
| `Rek_Pinjaman` *(wajib, unik — kunci debitur sejak v1.5: 1 rekening pinjaman = 1 baris)* | No. rekening pinjaman (format **teks**) — dipakai di Log Blast & template WA `{id_debitur}` | Rek Pinjaman, No Rek Pinjaman, Rekening Kredit |
| `CIF` *(wajib)* | Nomor CIF nasabah (format **teks**). **CIF sama dengan Rek Pinjaman berbeda** = pinjaman terpisah, semuanya tampil | No CIF |
| `Rek_Afiliasi` *(wajib untuk KUR PMI)* | No. rekening afiliasi/autodebet (format **teks**) — pencocokan data KUR PMI | Rek Afil, Rekening Afiliasi, Rek Tabungan, Rek Autodebet |
| `Nama` | Nama debitur | Nama Debitur, Nama Deb, Nama Nasabah |
| `No_WA` | 08xx / 62xx (format **teks**) | No HP, WA, Telepon |
| `Produk` | **v1.7 — hanya 8 produk**: SME = BCM, CCC, SCF, KPP SUPPLY • SBP = BWU, CCC, KUR, KPP DEMAND, KUR PMI (tulisan seperti `KPP SUP`, `KPP DEMAND`, `SCF DISTRIBUTOR` dikenali). Produk lain tidak ditampilkan | Jenis Produk |
| `Plafon`, `Baki_Debet` | Angka | Plafond, OS, Outstanding |
| `Tgl_Jatuh_Tempo` | Tanggal | Jatuh Tempo |
| `Status` | Aktif / Lunas | — |
| `Kolektibilitas` | 1–5 (boleh "Kol 2") | Kol |
| `Saldo_Blokir` | Angka; **kosong = dianggap belum diblokir** | — |
| `Saldo_Akhir`, `Angsuran` | Angka | Saldo, Angsuran Bulanan |
| `Opt_Out_WA` | `Ya` bila tidak ingin dihubungi | Opt Out |
| `PT_PMI` | Khusus produk KUR PMI: nama PT penempatan (mis. PT Minori SSW). Huruf besar/kecil & awalan "PT" bebas | PT, PT Penempatan, Perusahaan, Mitra, P3MI, LPK |
| `Kontak`, `RM` | Opsional, untuk tampilan | — |
| `Tgl_Booking` *(v1.5)* | Tanggal booking / realisasi | Tgl Booking, Tgl Realisasi, Tgl Pencairan, Tgl Akad |
| `Unit` *(v1.5)* | Kode unit 5 digit (mis. `31102`) atau nama kantor (mis. *KC Cikarang*) — otomatis jadi kode | Kode Unit, Kode Cabang, Cabang, Uker |
| `NPP_RM` *(v1.5)* | NPP RM pengelola (5 digit) — dipakai filter NPP peran RM | NPP RM, NPP, NPP Pengelola, NPP AO |
| `Segmen` *(v1.5)* | `SME` atau `SBP` (boleh "SBP - Small Business"). Kosong = ditentukan dari produk / peran RM pengelola | Segment, Segmentasi, LOB |
| `Jangka_Waktu` *(v1.7)* | Jangka waktu / tenor kredit (mis. `36` atau `36 bulan`) — tampil di Detail Debitur SME, SBP & KUR PMI | Jangka Waktu, JW, Tenor, Lama Kredit |
| `Tgl_Data` *(v1.7)* | **Tanggal Base Data** (posisi data). Satu rekening boleh punya beberapa baris dengan tanggal berbeda — aplikasi menampilkan tanggal terbaru dan bisa memilih tanggal lain | Tanggal Data, Tgl Posisi, Posisi Data, Tanggal Base Data |
| `ID_Debitur` | *Opsional (data lama)*. Dipakai sementara bila CIF / Rek Afil / Rek Pinjaman kosong | ID, No Pinjaman |

**B. Menu Import** (Super Admin → Pengaturan → Import Data): tempel URL spreadsheet lama → **Pindai (dry-run)** → **Jalankan import**. Sumber hanya dibaca, kunci `Rek_Pinjaman` (1 rekening pinjaman = 1 debitur; bila kosong → Rek Afil → CIF) mencegah baris ganda — **CIF yang sama dengan Rek Pinjaman berbeda diimpor sebagai pinjaman terpisah** dan didaftar di hasil pindai, teks berawalan `=`/`+`/`-`/`@` disimpan sebagai teks (bukan rumus), nomor WA diperbaiki (angka 0 di depan yang hilang dipulihkan), dan rumus di sheet tujuan dipertahankan. Import aman diulang sebelum *go-live* untuk menangkap data terbaru (delta).

**Pemetaan kolom (v1.4)** — agar data sumber yang judul kolomnya berbeda tetap tampil benar di Daftar Debitur:

1. Tempel URL / ID spreadsheet sumber → **Baca spreadsheet**. Muncul daftar sheet beserta jumlah barisnya.
2. Ada 2 kartu: **Debitur Umum** (kunci Rek Pinjaman) dan **Debitur KUR PMI** (produk otomatis *KUR PMI*). Bila kedua kartu membaca **sheet yang sama**, cukup centang *Debitur Umum* (aplikasi memberi peringatan). Centang yang ingin diimpor, pilih **Sheet sumber** (mis. `JBA`) dan **Baris judul** (baris tempat judul kolom berada, biasanya 1).
3. Klik **Atur kolom** → untuk setiap data di Daftar Debitur (Nama Debitur, Kontak, No. WA, CIF, Rek Pinjaman, Rek Afil, Produk, Plafon, Baki Debet, Angsuran, Saldo Blokir, Saldo Akhir, Jatuh Tempo, Kol, Status, RM, Opt-out WA, **Tgl Booking, Unit, NPP RM, Segmen**, ***Jangka Waktu*, *Tanggal Base Data*** *(v1.7)*; KUR PMI juga PT Penempatan) pilih asalnya:
   - **Otomatis (judul dikenali)** — bawaan; judul seperti Nama, CIF, OS, Plafond, No HP dikenali sendiri;
   - **kolom sumber** — tampil sebagai huruf + judul, mis. `A · Nama Deb`. Pilihan disimpan berdasarkan **judul**, jadi tetap benar walau kolom di sumber digeser; kolom tanpa judul disimpan berdasarkan **huruf**;
   - **Isi tetap…** — satu nilai untuk semua baris (mis. RM = `Andi`);
   - **— Tidak diimpor —**.
   Kolom *Contoh nilai baris pertama* membantu memastikan pilihan sudah tepat.
4. **Simpan pemetaan** (juga tersimpan otomatis saat Pindai / Import) → **Pindai (dry-run)**. Hasil pindai menampilkan **contoh hasil pemetaan** (3 baris pertama) per jenis debitur dengan asal kolomnya, serta tabel **CIF sama dengan Rek Pinjaman berbeda** (v1.5) → bila sesuai, **Jalankan import**.

Sheet `Debitur` gaya lama (1 sheet campuran) tetap bisa dipakai: centang *Debitur Umum*, pilih sheet-nya, dan biarkan **Produk = Otomatis** — debitur KUR PMI tetap dikenali dari kolom Produk.

**C. Debitur KUR PMI per PT (v1.5, disarankan)** — Pengaturan → **Mitra KUR PMI** → kartu **Sumber data KUR PMI per PT**. Cocok untuk spreadsheet database KUR PMI yang punya **1 sheet per PT** (mis. sheet `PT Minori Pemagang`, `PT Minori SSW`, `PT Aji`, `PT Nagomi`).

1. Pastikan daftar PT di kartu atas sudah benar (nama PT = nama yang tampil di aplikasi).
2. Tempel link spreadsheet database KUR PMI → **Baca spreadsheet**. Sheet tiap PT **dipilih otomatis** bila namanya sama dengan nama PT; ubah bila berbeda. Hapus centang PT yang tidak punya sheet.
3. Isi **Baris judul** — baris tempat judul kolom berada (mis. **5** bila judul "Nama Deb" ada di sel **B5**).
4. **Dicocokkan lewat**: *Otomatis* (Rek Afil → Rek Pinjaman → CIF) atau pilih salah satu. Baris PT yang cocok dengan base data **memperbarui** debitur itu (baki debet, kol, saldo tetap dari sheet Debitur bila tidak dipetakan); baris yang tidak cocok **ditambahkan** sebagai debitur KUR PMI baru.
5. **Atur kolom** → pilih asal tiap data, mis. *Nama Debitur* ← `B · Nama Deb`, **Perusahaan (tempat kerja)** ← `F · Perusahaan` *(v1.6)*, *Rek Afil* ← `C · No Rek Afiliasi`, *Batch* ← `D · Angkatan`, *Jangka Waktu* ← `E · Tenor`. Pilihan: *Otomatis*, kolom sumber, *Isi tetap…*, *Dari base data*. Kolom *Contoh* menampilkan nilai baris pertama.
6. **Hubungkan** (setelah aktif: **Simpan & terapkan**). Daftar Debitur → **SBP → KUR PMI** menampilkan *"Data KUR PMI dari … — sheet per PT"* beserta jumlah per PT.

> **Perusahaan** (tempat kerja, mis. *Fuji Co., Ltd.*) hanya tampil di **Detail Debitur** KUR PMI, bersama **Mitra KUR PMI (PT)**. Daftar Debitur KUR PMI dikelompokkan per mitra lewat chip di atas tabel.
>
> Selama sumber per PT aktif, **debitur KUR PMI di sheet Debitur yang tidak ada di sheet PT mana pun disembunyikan** (jumlahnya tampil untuk Super Admin di bilah sumber), dan PT yang tidak terdaftar tidak ditampilkan. Klik **Putuskan** untuk kembali ke cara lama. Perubahan di spreadsheet terbaca ±5 menit.

**C2. Alternatif (cara lama v1.3): satu spreadsheet untuk semua PT** — Pengaturan → Mitra KUR PMI → buka **Alternatif: satu spreadsheet untuk semua PT** (hanya tampil bila sumber per PT tidak aktif). Isi minimal kolom `Rek Afil`, lalu `Nama`, `Nama Perusahaan`, `Jangka Waktu` (angka = bulan), `Batch`. Nama & Nama Perusahaan dari spreadsheet ini menggantikan Nama & PT_PMI di sheet Debitur untuk debitur KUR PMI; data keuangan tetap dari sheet Debitur. Perubahan terbaca ±5 menit (pemicu `warmupCache`).

**Pemetaan kolom sumber KUR PMI (v1.4)**: bila judul kolom di spreadsheet KUR PMI berbeda (mis. `No Rek Afiliasi`, `Nama PMI`, `Tenor`) atau judulnya tidak di baris 1, isi **Baris judul** → buka **Pemetaan kolom** → **Baca kolom spreadsheet** → pilih asal kolom untuk *Rek Afil*, *Nama*, *Nama Perusahaan / PT Penempatan*, *Jangka Waktu*, *Batch* (Otomatis / kolom sumber / Isi tetap / Tidak diimpor) → **Hubungkan** atau **Perbarui**. Kartu sumber menampilkan kolom mana yang dipakai.

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
   git commit -m "FinSight v1.3.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/finsight.git
   git push -u origin main
   ```
   Saat diminta *password*, tempel **Personal Access Token** (github.com/settings/tokens → *Generate new token (classic)* → centang **repo**). Layar memang tidak menampilkan karakter saat token ditempel.
4. Di repository: **Settings → Pages** → *Source*: **Deploy from a branch** → *Branch*: **main / (root)** → Save → centang **Enforce HTTPS**.
5. Buka `https://USERNAME.github.io/finsight/` setelah 1–2 menit.

**Update frontend:** ubah berkas → `git add . && git commit -m "update" && git push`. Bila mengubah CSS/JS, naikkan `VERSI` di `sw.js` (mis. `finsight-v1.3.1`) dan angka `?v=` di `index.html` agar pengguna PWA mendapat versi baru.

> Ingin dipandu langkah demi langkah sambil kirim screenshot terminal? Minta saja — panduan GitHub Pages bisa dilakukan satu perintah per langkah.

---

## 4. Login pertama & manajemen pengguna

**Super Admin awal:**
1. Buka situs → NPP = NPP admin di `Setup.gs`, kata sandi = **NPP yang sama** (sandi awal berlaku 72 jam sejak setup; bila lewat, jalankan `resetAksesAdminAwal`).
2. Wajib **membuat kata sandi baru** (min. 8 karakter, huruf + angka, tidak memuat NPP).

   **Kebijakan sandi (v1.7, semua akun):** berlaku **30 hari** lalu wajib diganti • tidak boleh sama dengan sandi yang **pernah dipakai** • tidak boleh mengandung **NPP login** • salah sandi/kode **5× → dikunci 15 menit**, **7× → 30 menit**, **10× → diblokir** (hanya Super Admin yang dapat membuka). Hitungan salah kembali 0 setelah login berhasil.
3. Muncul **kode QR** (berlaku 3 menit, sekali pakai). Di HP: pasang **Microsoft Authenticator** → **+** → **Akun lainnya (Google, Facebook, dll.)** → **Pindai kode QR**. (Google Authenticator/Authy juga bisa.) Bila waktu habis, klik **Buat QR baru**.
4. Masukkan kode 6 digit → masuk ke dashboard. Setelah ini QR hangus dan tidak dapat ditampilkan lagi.

**Keluar otomatis:** bila 5 menit tidak ada aktivitas (klik, ketik, gulir, gerak mouse), aplikasi menampilkan peringatan 30 detik lalu keluar sendiri. Menutup tab lalu membukanya lagi setelah lebih dari 5 menit juga wajib login ulang. Pemeriksaan data otomatis di latar belakang tidak dihitung sebagai aktivitas.

**Logo aplikasi (Super Admin):** Pengaturan → **Logo Aplikasi** → unggah PNG/JPG/WEBP/SVG → geser **Ukuran logo** → **Simpan logo**. Gambar otomatis diperkecil dan disimpan di sheet Pengaturan (`LOGO_DATA`), lalu tampil di sidebar, bilah atas HP, halaman masuk, ikon tab browser, dan kop laporan Excel/PDF/Cetak semua pengguna. **Logo bawaan** mengembalikan logo FinSight.

**Login berikutnya:** NPP + kata sandi → kode 6 digit dari aplikasi authenticator.

**Menambah pengguna:** menu **Pengguna & Peran** → *Tambah Pengguna* (NPP, nama, peran RM/Manager/peran buatan sendiri, **Upliner**). Pengguna baru mengikuti alur yang sama (sandi awal = NPP).

**Super Admin hanya 1 (v1.7):** peran Super Admin tidak dapat diberikan ke pengguna lain (lewat menu maupun import). Untuk memindahkannya, jalankan `pindahkanSuperAdmin('NPP_BARU', 'Manager')` di editor Apps Script.

**Upliner & downliner (v1.7):** **✏️ Edit** pengguna → **Upliner (atasan langsung)** — dipilih dari pengguna terdaftar (tanpa dirinya sendiri & bawahannya). Tabel pengguna menampilkan kolom **Upliner** dan jumlah **Downliner**. Peran dengan **Data bawahan (downliner)** (bawaan: Business Banking Manager, SME Credit Risk, Branch Manager) melihat data dirinya + seluruh bawahannya di Dashboard, Kualitas Kredit, Daftar Debitur, Penagihan & Pipeline.

**Peran & menu:** tab **Peran & Hak Akses Menu** — centang menu yang boleh dibuka tiap peran, atau **+ Tambah Peran**. Menu yang tidak dicentang hilang dari sidebar & bottom bar dan ditolak server.

**B. Akses data per peran (v1.5)** — Pengaturan → **Akses Data** (Super Admin):

| Bagian | Isi |
|---|---|
| Cakupan data per peran | **Segmen** Daftar Debitur (Semua / SME saja / SBP saja), **Hanya debitur dengan NPP RM sendiri**, dan **Data bawahan (downliner)** *(v1.7)* per peran. Bawaan: RM → SME + NPP sendiri; PRM / ARM → SBP + NPP sendiri (v1.6); Business Banking Manager, Branch Manager, SME Credit Risk & peran lain → semua. Super Admin selalu melihat semua. **NPP = kunci (v1.6)**: bila filter NPP aktif & kolom NPP RM berisi data, pengguna menerima semua debitur dengan NPP RM = NPP login-nya, apa pun segmennya |
| Cek NPP (v1.6) | Ketik NPP → jumlah rekening/CIF/plafon/baki per produk dengan NPP RM itu, pemilik NPP (nama & peran), dan jumlah debitur yang ia terima setelah login. Bila 0, tampil nilai NPP terbanyak di data untuk memeriksa format kolom |
| Kolom di sheet Debitur | Kolom yang dibaca sebagai **Unit**, **NPP RM**, **Segmen** (bawaan: dikenali otomatis dari judulnya) |
| Produk per segmen | **v1.7:** SME: BCM, CCC, SCF, KPP SUPPLY • SBP: BWU, CCC, KUR, KPP DEMAND, KUR PMI (daftar produk tetap) |
| Daftar unit | 15 kantor bawaan (31100 KCU Jababeka … 31166 KC Delta Mas) — **Tambah unit**, ubah nama, hapus, atau **Kembalikan bawaan** |

Penyaringan dilakukan di **server** sebelum data dikirim ke perangkat, jadi debitur di luar cakupan tidak pernah sampai ke HP/laptop pengguna tersebut. **Simpan** → pengguna terkait memuat ulang data otomatis.

**Ganti NPP:** **✏️ Edit** pengguna → ubah NPP. Sandi & authenticator ikut pindah; pengguna masuk dengan NPP baru.

**1 akun = 1 perangkat:** login yang berhasil di perangkat baru menutup paksa sesi di perangkat lama.

| Kejadian | Tindakan Super Admin (menu Pengguna → *Reset akses*) |
|---|---|
| Lupa kata sandi | **Reset sandi & 2FA** → login lagi dengan sandi = NPP |
| Ganti/hilang HP | **Reset 2FA saja** → QR baru (sekali pakai) muncul saat login berikutnya |
| Salah sandi 5× (dikunci 15 menit), 7× (30 menit), **10× (diblokir)** | **Buka kunci / blokir akun** |

**Super Admin sendiri terkunci/lupa sandi:** buka editor Apps Script → jalankan **`resetAksesAdminAwal`** (sandi kembali = NPP & blokir dibuka). Hanya membuka blokir: **`bukaBlokirAkun('NPP')`**.

---

## 5. Gateway WhatsApp (Fonnte)

1. Bawaan aplikasi adalah **mode SIMULASI**: alur, antrean, dan log berjalan tetapi pesan **tidak** dikirim — cocok untuk UAT.
2. Daftar di <https://fonnte.com>, hubungkan nomor WA, salin **token** perangkat.
3. Super Admin → **Pengaturan → Gateway WA** → tempel token → **Simpan token**. Token disimpan di Script Properties dan hanya tampil tersamar (`ABCD••••••xyz`).
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
| `LOCK_<NPP>`, `REV_<NPP>`, `REVA_<NPP>` | Otomatis | Penguncian akun, pencabutan sesi & alasan (mis. login di perangkat lain) |
| `FONNTE_TOKEN` | Super Admin lewat menu Gateway WA | Token gateway WA |
| `TURNSTILE_SECRET` | Super Admin lewat Pengaturan → Keamanan Sistem | Secret key Cloudflare Turnstile |
| `GATEWAY_SECRET` | Super Admin lewat Pengaturan → Keamanan Sistem (sama dengan secret di Worker) | Rahasia gerbang Cloudflare Worker |
| `PMI_SRC_ID`, `PMI_SRC_SHEET` | Super Admin lewat Mitra KUR PMI | ID spreadsheet KUR PMI (hanya dibaca) |
| `PMI_PT_SRC` *(v1.5)* | Super Admin lewat Mitra KUR PMI → sumber per PT | ID spreadsheet database KUR PMI + sheet, baris judul & pemetaan kolom tiap PT (hanya dibaca) |
| `PAK_DOC_ID`, `PAK_DOC_HASH`, `PAK_DOC_SYNC` *(v1.5)* | Otomatis saat **Edit di Word** | ID dokumen Google Docs format analisa & penanda sinkron |
| `AKT_<NPP>` | Otomatis | Awal masa berlaku sandi awal |
| `FOLDER_SURAT` | Otomatis | Folder Drive `📂 Template Surat` (file format surat Word) |
| `SPREADSHEET_ID`, `ROOT_FOLDER_ID`, `EXPORTS_FOLDER` | Otomatis saat setup | ID database & folder (dicatat juga di sheet AppConfig) |
| `VER_*`, `DATA_HASH`, `ANTRIAN_*` | Otomatis | Versi cache & penunjuk antrean |

- **Jangan** menambah editor proyek Apps Script sembarangan — editor dapat melihat Properti skrip.
- **Jangan** membagikan spreadsheet database ke pihak yang tidak berhak.
- Keluarkan **semua** pengguna sekaligus (mis. curiga kebocoran): jalankan **`rotasiSecretSesi`**.
- Kapasitas: ±1.500 pengguna (batas 500 KB Script Properties).

---

## 6b. Keamanan & Cloudflare (v1.3)

### Hasil pemeriksaan keamanan & perbaikan di v1.3

| Celah / risiko yang ditemukan | Perbaikan |
|---|---|
| **Formula injection** — teks dari pengguna/impor yang diawali `=`, `+`, `-`, `@` dijalankan Google Sheets sebagai rumus (mis. `=IMPORTXML(…)` dapat mengirim isi sheet ke situs luar) | Semua teks yang ditulis aplikasi ke Sheets (nama pengguna, template WA, nama PT, impor debitur, data Analisa, keterangan gateway, Audit_Log) disimpan sebagai **teks biasa** |
| **Sandi awal = NPP tanpa batas waktu** — siapa pun yang tahu NPP akun yang belum aktivasi bisa mengaktifkannya lebih dulu | Sandi awal hanya berlaku **72 jam** (dapat diatur) sejak akun dibuat / direset / diimpor |
| **Tebak sandi dari banyak NPP** — penguncian hanya per NPP | Dengan gerbang Cloudflare: **20× gagal dari 1 IP → IP diblokir 15 menit**, Worker membatasi **12 langkah login/menit per IP**; Turnstile menahan robot |
| **URL `/exec` bisa dipanggil langsung** oleh skrip siapa pun | Bila gerbang aktif, permintaan tanpa rahasia gerbang **ditolak**; hanya alamat aplikasi Anda yang diterima Worker |
| **Skrip sisipan (XSS) / clickjacking** | **Content-Security-Policy** (hanya skrip dari aplikasi & Cloudflare, tanpa `eval`), header `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy` (`vercel.json`) |
| **Database dibagikan terlalu luas** (link publik / seluruh domain) | **Pengaturan → Keamanan Sistem** dan fungsi `cekKeamanan` menandai spreadsheet/folder yang dibagikan publik, jumlah editor, akun tanpa 2FA, sandi awal kedaluwarsa, aktivitas gagal login 24 jam |
| Kolom `Log_Blast` rekening bisa kehilangan 0 di depan | Kolom rekening `Log_Blast` diformat teks |

Yang sudah aman sejak versi sebelumnya dan tetap dipertahankan: sandi di-hash + salt (tidak pernah tersimpan asli), 2FA wajib, token sesi bertanda tangan HMAC & bisa dicabut, 1 akun = 1 perangkat, keluar otomatis 5 menit, hak akses dicek server di **setiap** permintaan, nomor WA lengkap tidak pernah dikirim ke browser, rahasia hanya di Script Properties, dan semua aksi penting tercatat di `Audit_Log`.

> **Jujur soal batas:** tidak ada sistem yang bisa dijamin 100% tidak dapat diretas. Lapisan di atas menutup celah yang ditemukan dan mempersulit serangan umum (robot, tebak sandi, pencurian URL, skrip sisipan). Keamanan akhir juga bergantung pada: akun Google pemilik memakai **verifikasi 2 langkah**, editor proyek Apps Script dibatasi, spreadsheet tidak dibagikan sembarangan, dan pengguna tidak membagikan sandi/HP authenticator. Penggunaan Fonnte & Cloudflare (pihak ketiga) tetap perlu persetujuan unit Keamanan Informasi & Kepatuhan.

### A. Cloudflare Turnstile di halaman masuk (±10 menit)

1. Masuk / daftar di <https://dash.cloudflare.com> (paket gratis cukup) → menu **Turnstile** → **Add widget**.
2. *Widget name*: `FinSight`; *Hostname*: alamat aplikasi Anda, mis. `finsightbbjba.vercel.app`; *Widget mode*: **Managed** → **Create**.
3. Salin **Site key** dan **Secret key**.
4. Di FinSight: **Pengaturan → Keamanan Sistem → Cloudflare Turnstile** → tempel keduanya → **Aktifkan Turnstile**.
5. Keluar lalu buka halaman masuk: kotak verifikasi Cloudflare muncul di atas tombol **Masuk**.

Darurat (halaman masuk tidak bisa dipakai, mis. hostname salah): editor Apps Script → jalankan **`matikanTurnstile`**.

### B. Gerbang Cloudflare Worker (±20 menit, sangat disarankan)

1. Cloudflare → **Workers & Pages** → **Create** → **Create Worker** (*Start with Hello World* — **jangan** pilih *Import a repository*, karena repository GitHub Anda berisi frontend, bukan Worker) → nama `finsight-gateway` → **Deploy** → **Edit code** → hapus isi bawaan → tempel isi **`worker.js`** dari paket → **Deploy**.
2. Di FinSight: **Pengaturan → Keamanan Sistem → Gerbang Cloudflare Worker** → **Buat rahasia** (otomatis tersalin).
3. Worker → **Settings → Variables and Secrets** → **Add**:
   | Nama | Tipe | Isi |
   |---|---|---|
   | `GAS_URL` | Text | URL Web App Anda yang berakhiran `/exec` |
   | `ALLOWED_ORIGINS` | Text | Alamat aplikasi, mis. `https://finsightbbjba.vercel.app` (pisahkan koma bila lebih dari satu) |
   | `GATEWAY_SECRET` | **Secret** | Rahasia dari langkah 2 |
   → **Deploy**. Uji: buka `https://finsight-gateway.<akun>.workers.dev/health` → harus tampil `{"ok":true,…}`.
4. Di repository frontend, ubah `js/config.js`:
   ```js
   window.APP_CONFIG = { GAS_URL: 'https://finsight-gateway.<akun>.workers.dev' };
   ```
   `git add . && git commit -m "lewat Cloudflare" && git push` → tunggu 1–2 menit → buka aplikasi → **Ctrl+Shift+R** → login.
5. **Pengaturan → Keamanan Sistem**: status menunjukkan *"Aplikasi sudah lewat Worker"*. Tempel rahasia yang sama → **Aktifkan gerbang**. Sejak saat itu URL `/exec` tidak bisa dipakai langsung.
   (Aplikasi menolak mengaktifkan gerbang bila Anda belum lewat Worker — mencegah terkunci sendiri.)

Opsional (lewat terminal): `wrangler.toml` di paket sudah memuat pembatas permintaan bawaan Cloudflare (`RL_LOGIN` 12/menit, `RL_API` 240/menit per IP) → `npx wrangler deploy` lalu `npx wrangler secret put GATEWAY_SECRET`. Tanpa wrangler, Worker memakai pembatas sederhana di memori.

Bila memakai **domain sendiri** untuk Worker (bukan `*.workers.dev`), tambahkan domain itu di baris `connect-src` pada tag `Content-Security-Policy` di `index.html`.

Darurat (Worker bermasalah): editor Apps Script → **`matikanGerbang`**, lalu kembalikan `GAS_URL` di `js/config.js` ke URL `/exec`.

### C. Bila punya domain sendiri (opsional)

Pindahkan DNS domain ke Cloudflare (awan oranye / *Proxied*), arahkan subdomain aplikasi ke Vercel, lalu aktifkan **SSL/TLS: Full (strict)**, **Security → WAF → Managed rules**, **Bot Fight Mode**, dan **Always Use HTTPS**. Frontend juga bisa dipindah ke **Cloudflare Pages** (berkas `_headers` di paket sudah berisi header keamanan).

---

## 6c. Halaman Analisa

Halaman Analisa punya 3 tab: **Perangkat Analisa KUR PMI** (v1.4, tab bawaan), **Format Excel** (v1.7, Bagian D) dan **Format Word** (v1.3). Sejak v1.5, format Perangkat Analisa juga bisa diedit langsung di Google Docs (**Bagian C**).

### A. Perangkat Analisa KUR PMI

Dokumen 8 halaman A4 sesuai berkas *ANALISA KREDIT* KUR PMI: **Perangkat Analisa Kredit** (3 halaman), **Struktur Fasilitas Kredit**, **Call Memo I** (penyelenggara), **Call Memo II** (debitur), dan **Check List** (2 halaman).

1. **Template import (.xlsx)** → sheet *Data* berisi 21 kolom: Nama, Perusahaan, NIK, No HP, Tempat Penempatan Kerja, Jenis Pekerjaan, Lama Penempatan, Gaji Perbulan, Status (Menikah / Belum Menikah / Janda / Duda — pilihan daftar), Tempat Lahir, Tgl Lahir, Jenis Kelamin (L/P), Jangka Waktu, Rencana Berangkat, Hasil SLIK, Plafond Pinjaman, Alamat, Nomor PAK, Tanggal PAK, Tanggal Permohonan, Kewajiban Bank Lain. Judul **merah muda = wajib** (Nama, Perusahaan, NIK, Jangka Waktu, Plafond). Sheet *Petunjuk* menjelaskan cara mengisi tiap kolom. Ada 3 kolom opsional: Negara Penempatan, Gaji (Yen), Kurs Yen (untuk kalimat gaji di Call Memo II).
2. Isi 1 baris = 1 debitur. Tanggal `17/11/2026` atau tanggal Excel; angka boleh `9950000` atau `9.950.000`; NIK, No HP & Nomor PAK disimpan sebagai teks (angka 0 di depan tidak hilang). **Perusahaan** dicocokkan ke profil penyelenggara (mis. "PT. Minori") untuk narasumber & kontak Call Memo I.
3. **Import data** → pilih file .xlsx/.csv → periksa ringkasan (baris yang kolom wajibnya kosong dilewati & disebutkan) → **Tambahkan** atau **Ganti semua** (hanya mengganti data Perangkat Analisa; data Format Word tidak tersentuh). Data tersimpan di sheet `Data_Analisa`.
4. Klik ikon 👁 pada baris → **Pratinjau dokumen** (pratinjau = hasil cetak). **Cetak / PDF** → di dialog cetak pilih **Simpan sebagai PDF**, ukuran **A4**, margin **Tidak ada/Default**, skala **100%**. Centang beberapa baris → **Cetak terpilih** (maks. 200 debitur sekali cetak). Tanpa data terpilih, pratinjau memakai data contoh.
5. **Simulasi angsuran** = kalkulator cepat (Plafond, Jangka waktu, Bunga per tahun). **Tabel angsuran** = jadwal bulan ke-1 s.d. ke-n untuk debitur yang sedang dipratinjau (pokok awal, cicilan pokok, bunga, angsuran, saldo) — sama dengan sheet *SIM KUR*.

**Perhitungan (metode anuitas, sama dengan PMT/IPMT/PPMT di *SIM KUR.xlsx*)** — *r* = suku bunga per tahun ÷ 12, *n* = jangka waktu (bulan):

| Isian di dokumen | Rumus |
|---|---|
| Total Kewajiban BNI / bulan (angsuran) | Plafond × *r* ÷ (1 − (1 + *r*)<sup>−n</sup>) |
| Beban Bunga / bulan\* | Plafond × *r* (bulan pertama) |
| Angsuran Pokok / bulan\* | Angsuran − Beban Bunga (bulan pertama) |
| % Total Kewajiban dibanding gaji | (Angsuran + Kewajiban Bank Lain) ÷ Gaji Perbulan × 100% |

Contoh: Plafond Rp9.950.000, 12 bulan, bunga 6% → angsuran **Rp856.361**, beban bunga Rp49.750, angsuran pokok Rp806.611 (sama dengan berkas contoh). Kesimpulan *Layak / Tidak layak* dan centang Ya/Tidak di Check List mengikuti usia (≥ 18 tahun dari Tgl Lahir) dan rasio (≤ batas, bawaan 60%).

**Atur format** (hanya Super Admin) — semua isian berikut berlaku untuk seluruh dokumen dan tersimpan di sheet `Pengaturan` (baris `ANALISA_KUR`):

| Tab | Isi |
|---|---|
| Penanda tangan | Nama & jabatan: **Dipersiapkan oleh** (ARM/PRM), **Mengetahui** (BBM), **Keputusan Komite / Pemutus** (BM), **Check List — kolom ketiga** (COP). Sudah terisi sesuai berkas yang Anda unggah |
| Kantor & kredit | Nama bank, kantor cabang, unit, kantor booking, kota, nomor formulir, suku bunga (% per tahun), perihal, keperluan, jenis kredit, negara penempatan, batas rasio (%), provisi & administrasi |
| Penyelenggara | Profil per PT penyelenggara/LPK (dicocokkan dengan kolom **Perusahaan**): nama, kata kunci pencocokan, sebutan LPK, pejabat yang di-call + jabatan + telepon, narasumber verifikasi (maks. 6). **Tambah penyelenggara** untuk PT lain |
| Kolom data | Ubah judul kolom, jenis (teks/angka/tanggal/pilihan/teks panjang), pilihan, tanda wajib; **Tambah kolom** baru (otomatis masuk template import dan bisa dipakai di kalimat sebagai `{{kunci}}`). Kolom bertanda *inti* tidak bisa dihapus |
| Kalimat | Semua kalimat baku (keperluan, verifikasi, SLIK, OTS, kesimpulan layak/tidak layak, pencairan, Call Memo, check list). Penanda seperti `{{nama}}`, `{{plafond:rp}}`, `{{tglpak:tglpanjang}}` diganti otomatis. Kalimat yang diubah punya tombol **Kembalikan bawaan** |

**Simpan format** menerapkan perubahan ke semua pengguna menu Analisa (dokumen yang dicetak berikutnya memakai format baru).

### B. Format Word (v1.3)

1. **Format surat** (Super Admin): buat surat di Microsoft Word seperti biasa (kop, logo, tabel, tanda tangan). Bagian yang berubah tiap surat ditulis sebagai penanda **`{{nama_field}}`**, mis. `{{nama_debitur}}`, `{{plafon:rp}}`, `{{tanggal_surat:tgl}}`. Simpan sebagai **.docx** → **Analisa → Unggah format Word**. Mulai cepat: **Pakai contoh format** (Memo Analisa Kredit) → **Unduh format** → edit di Word → **Ganti file**.
2. **Format tambahan penanda**: `:rp` (Rp 1.500.000), `:angka` (1.500.000), `:tgl` (22 November 2026), `:tglpendek` (22/11/2026), `:terbilang` (satu juta lima ratus ribu), `:besar` (HURUF BESAR), `:kecil`, `:judul` (Huruf Awal Kapital).
3. **Template import**: tombol **Template import (.xlsx)** — kolomnya otomatis sama dengan penanda. Isi 1 baris = 1 surat (angka boleh `1500000` atau `1.500.000`; tanggal `2026-11-22` atau `22/11/2026`).
4. **Import data**: pilih file .xlsx/.csv → periksa ringkasan & pratinjau 5 baris → **Tambahkan** atau **Ganti semua** → Import. Data tersimpan di sheet `Data_Analisa`.
5. **Pratinjau & unduh**: klik ikon 👁 pada data → pratinjau surat terisi (kolom kosong disorot kuning) → **Unduh Word**. Pilih beberapa data → **Word (ZIP)** (1 file per surat) atau **Gabung 1 file** (siap cetak sekaligus).

File format surat disimpan di folder Drive `📂 Template Surat`; mengganti/menghapus format memindahkan file lama ke Sampah Drive. Unduhan surat tercatat di `Audit_Log`.

> Pratinjau di aplikasi mendekati tampilan Word (teks, tabel, gambar, kop/kaki). Efek Word yang rumit (kotak teks melayang, WordArt, kolom koran) bisa tampil sedikit berbeda di pratinjau, tetapi **file Word hasil unduhan selalu memakai format asli**.

### C. Edit di Word / Google Docs (v1.5, Super Admin)

1. **Analisa → Perangkat Analisa KUR PMI → Edit di Word.** Aplikasi membuat dokumen **"Format Perangkat Analisa KUR PMI — FinSight"** di folder Drive `📂 Template Surat` lalu membukanya di tab baru. Super Admin aktif yang punya **email Google** di menu Pengguna otomatis mendapat akses edit (tanpa email pemberitahuan); pemilik akun Apps Script selalu bisa membukanya.
2. Dokumen berisi tabel **Bagian | Isi | Kode**: penanda tangan, kantor & kredit, serta **semua kalimat** dokumen. **Ubah hanya kolom *Isi*** — jangan mengubah kolom *Kode* atau menghapus baris. Penanda seperti `{{nama}}` atau `{{plafond:rp}}` boleh dipakai di kalimat.
3. Perubahan **masuk ke aplikasi otomatis** saat halaman Perangkat Analisa dibuka (diperiksa paling sering 1× per menit), atau klik **Sinkronkan**. Hanya bagian yang berubah yang diterapkan, lalu tercatat di Audit Log.
4. Bilah status menampilkan waktu sinkron terakhir, **Buka dokumen**, **Unduh Word (.docx)**, **Sinkronkan**, dan **Buat ulang isi** (menimpa isi dokumen dengan format terkini di aplikasi — tautan tetap).

> Tata letak 8 halaman (kop, tabel, posisi tanda tangan) tetap diatur aplikasi agar hasil cetak selalu rapi; yang diedit di dokumen adalah **isi teks** formatnya.

### D. Format Excel (v1.7)

Format bank dalam berkas Excel KUR PMI — sheet **INPUT** (Perangkat Analisa Kredit + Struktur Fasilitas Kredit), **CALL MEMO** (2 halaman) dan **BNI 105** (Check List) — dijadikan **1 format** di aplikasi. Tata letaknya diambil langsung dari berkas Excel: jenis & ukuran huruf, tebal/miring/garis bawah, warna isian, garis tabel, lebar kolom, **tinggi baris**, sel gabungan, baris/kolom tersembunyi, **margin kiri-kanan-atas-bawah**, skala cetak (INPUT 95%), dan pemisah halaman. Rumus Excel di format (VLOOKUP ke BATCH, CONCATENATE, terbilang, angsuran anuitas, rasio kewajiban, tanggal) **dihitung otomatis** di aplikasi.

**Data = database Anda** (tidak perlu format contoh):

| Sheet di file Excel Anda | Dibaca sebagai |
|---|---|
| **BATCH** | 1 baris = 1 debitur, kolom **A–AQ** (judul di baris 2, data mulai baris 3: NO, NAMA, Perusahaan, Kumiai, NIK, … Plafond Pinjaman, Usia, Keluarga, Alamat, Gaji Rupiah, Pasangan, No Surat, Kewajiban Bank Lain, …). **AO1** = kurs Yen, **AP1** = tanggal (jadi tanggal surat) |
| **No Surat** | Nomor surat (kolom A) dicocokkan dengan nama debitur (kolom C) — mengisi kolom AM bila kosong, sama dengan rumus `INDEX/MATCH` di BATCH |

Langkah:

1. **Analisa → tab Format Excel → Import data Excel** → pilih file `.xlsx` Anda (yang berisi sheet BATCH & No Surat). File hanya dibaca di browser; yang dikirim ke server hanya data barisnya.
2. Periksa ringkasan (jumlah debitur, kurs AO1, tanggal AP1, jumlah No Surat terbaca). Isi **Nomor batch** bila hanya sebagian yang diimpor (mis. `221-230, 245`). Centang **Ganti semua** bila ingin mengganti data lama → **Import**.
3. Klik nama debitur → format terisi. Kolom turunan dihitung seperti rumus BATCH: **Gaji Rupiah (AI) = Gaji Yen × kurs**, **teks tanggal berangkat (AQ)**.
4. **Link interaktif** (tombol di atas pratinjau):
   - **Tautan** — klik sel mana pun di format → kolom data sumbernya (mis. *Plafond Pinjaman*, *Jangka Waktu* untuk sel angsuran) **disorot** di formulir *Data debitur* di bawahnya. Ubah isian → format **dihitung ulang langsung** dan **tersimpan otomatis** (±1 detik).
   - **Edit teks** — klik sel lalu ketik untuk mengubah isi sel langsung (mis. kalimat khusus 1 debitur). Sel yang diubah berlatar kuning, tersimpan per debitur, dan bisa **dikembalikan** ke rumus/format semula.
5. **Simulasi anuitas** (centang) menambah halaman jadwal angsuran bulan ke-1 s.d. ke-n: angsuran = Plafond × *r* ÷ (1 − (1 + *r*)<sup>−n</sup>), *r* = bunga sel H31 ÷ 12 — sama dengan rumus sel **H34** di sheet INPUT.
6. **Cetak / PDF** → di dialog cetak pilih **Simpan sebagai PDF**, ukuran **A4**, margin **Default/Tidak ada**, skala **100%**, matikan *Header & footer*. Centang beberapa debitur → **Cetak terpilih**.
7. **Template import (.xlsx)** = susunan sheet BATCH (judul baris 2, rumus AI & AQ) + sheet No Surat — untuk menyiapkan data baru bila belum punya file.

> Nama penanda tangan di format Excel memakai **Analisa → Perangkat Analisa KUR PMI → Atur format → Penanda tangan** (Dipersiapkan oleh, Mengetahui, Keputusan Komite, COP, dan *Komite Kredit — anggota (format Excel)*), serta profil penyelenggara (kontak & narasumber Call Memo).

---

## 6d. Pipeline (v1.7)

Menu **Pipeline** punya 2 sub halaman. Data tersimpan di sheet `Pipeline`.

| Sub halaman | Diisi oleh | Kolom |
|---|---|---|
| **Pipeline SME** | RM | Nama Debitur / Bidang Usaha • Nama RM • Sifat Kredit (Baru / Tambahan) • Jenis Kredit • Maks Kredit Saat Ini • Maks. Menjadi • Rencana Pencairan • Spoke (unit) • Progress **W1–W5** • PHR Tabungan • PHR Kartu Kredit • PHR Payroll |
| **Pipeline SBP** | PRM / ARM | Nama Debitur / Bidang Usaha • Nama PRM/ARM • Sifat Kredit (Baru / Tambahan) • Jenis Kredit (BWU Prima, BWU Reguler, BWU Pandu, CCC, KUR, KPP, KUR PMI) • Fasilitas (KI / KMK) • Outstanding Saat Ini (bila Tambahan) • Nominal Pengajuan • **Net Baki Debet = Nominal Pengajuan − Outstanding** (otomatis) • Kewenangan (AH & SBX / AH / BM) • Rencana Booking (W1–W5) |

**Mini dashboard** tiap sub halaman: jumlah pipeline (baru/tambahan), **Total nominal pipeline** (SME = Σ Rencana Pencairan; SBP = Σ Nominal Pengajuan), total maks. menjadi / net baki debet, dan **Total baki debet** portofolio RM/PRM/ARM yang ada di pipeline (dari base data **tanggal terbaru**, semua produk aktif), lalu rincian per RM/PRM/ARM.

**Hak akses:** RM / PRM / ARM hanya mengisi & melihat pipeline **atas namanya sendiri**; peran dengan data bawahan (BBM, Branch Manager, SME Credit Risk) melihat pipeline dirinya & **seluruh bawahannya**; Super Admin melihat semua. Pilihan *Nama RM / PRM/ARM* diambil dari pengguna aktif berperan RM atau PRM/ARM. **Unduh Excel** mengikuti filter (periode, RM, kata kunci).

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
| Peran & menu | Cabut 1 menu dari RM, login sebagai RM | Menu hilang dari sidebar & bottom bar; alamatnya dialihkan |
| Kunci Rek Pinjaman | Gandakan 1 Rek Pinjaman di sheet Debitur; buat 1 CIF dengan 2 Rek Pinjaman | Baris ganda diabaikan + peringatan (nomor baris) untuk Super Admin; CIF dengan 2 rekening: SBP tampil 2 baris, SME 1 baris "2 rekening" (v1.6) |
| Sumber KUR PMI | Ubah Batch di spreadsheet KUR PMI | Kolom Batch di Debitur KUR PMI ikut berubah ≤ 5 menit |
| Turnstile / Gerbang | Aktifkan sesuai Bagian 6b; panggil URL `/exec` langsung | Login wajib verifikasi Cloudflare; panggilan langsung ditolak |
| Analisa (Word) | Tab Format Word → pakai contoh format → template import → import 3 baris → unduh ZIP & gabung | 3 surat Word terisi, tanpa sisa `{{…}}` |
| Perangkat Analisa KUR PMI | Template import → isi 3 debitur → Import → Cetak terpilih | 24 halaman A4 (8 per debitur); angsuran sama dengan sheet *SIM KUR* untuk plafond, jangka waktu & bunga yang sama |
| Atur format | Ganti nama penanda tangan → Simpan format → buka pratinjau | Nama baru tampil di Perangkat Analisa, Call Memo & Check List |
| Halaman login | Pengaturan → Logo Aplikasi → ukuran 120 px, centang/hapus centang nama & subjudul → Simpan logo → buka halaman login | Logo & teks sesuai pengaturan |
| Pemetaan import | Pengaturan → Import Data → pilih sheet JBA, Nama Debitur ← kolom A → Pindai | Contoh hasil pemetaan menampilkan nama dari kolom A |
| Lihat sandi | Klik ikon mata di setiap kolom sandi | Sandi terlihat / tersembunyi |
| 1 perangkat | Login akun yang sama di HP lalu di laptop | HP kembali ke halaman masuk dengan pesan "perangkat lain" |
| Ganti NPP | Super Admin ganti NPP pengguna | Pengguna masuk dengan NPP baru, sandi & authenticator lama tetap |
| KUR PMI | Daftar Debitur → SBP → KUR PMI | Chip per PT + jumlah; SME tidak memuat KUR PMI |
| KUR PMI per PT (v1.5) | Hubungkan database per PT, baris judul 5, Nama Debitur ← "Nama Deb" | Nama sesuai sheet PT; debitur yang tidak ada di sheet PT tidak tampil |
| Akses data (v1.5–1.6) | Login sebagai RM (NPP terisi di `NPP_RM`) | Hanya debitur dengan NPP-nya (SME maupun SBP) di Dashboard, Daftar Debitur, Penagihan, pencarian; sub menu mengikuti debiturnya |
| Filter Unit (v1.5) | Daftar Debitur → Unit = 31102 - KC Cikarang | Jumlah sama dengan COUNTIF kolom Unit di sheet |
| Penagihan (v1.5) | Unduh Excel, PDF, Cetak sebagai RM & Manager | Kolom Nama Debitur … Aksi Cepat, tanpa #; nominal Excel tetap angka penuh |
| No HP (v1.5) | Detail Debitur → Tambah No HP → simpan | Nomor tersimpan di sheet `Kontak_Debitur` & tampil tersamar; tidak tertimpa import |
| Nominal (v1.5) | Debitur dengan baki Rp 999.568.274 | Tabel: Rp 999,56 Jt; Detail: Rp 999.568.274 |
| Edit di Word (v1.5) | Edit di Word → ubah 1 kalimat di Google Docs → buka lagi Perangkat Analisa | Kalimat baru tampil di pratinjau |
| Detail di HP (v1.6) | Buka Detail Debitur di HP | Kotak 2 kolom ringkas, tidak memanjang |
| Perusahaan KUR PMI (v1.6) | Atur kolom PT → Perusahaan ← "Perusahaan" → buka Detail debitur KUR PMI | Perusahaan sesuai database (mis. debitur contoh → Fuji Co., Ltd.); daftar tanpa kolom PT |
| SME per CIF (v1.6) | Debitur BCM dengan 2 Rek Pinjaman (CIF sama) | 1 baris "2 rekening" dengan total; Detail menampilkan kedua rekening |
| NPP = kunci (v1.6) | Login ARM/PRM 67221 | BWU, KUR, KPP dengan NPP RM 67221 tampil; jumlah = Cek NPP 67221 |
| Rekonsiliasi (v1.6) | Sinkronisasi & Data → Cek kecocokan data | Baris, Plafon, Baki per produk = pivot database (KPP DEMAND → KPP) |
| Login | NPP baru, sandi = NPP | Wajib ganti sandi → QR → kode 6 digit |
| QR sekali pakai | Buka QR di 2 jendela, biarkan 3 menit, login ulang setelah aktif | QR lama ditolak; QR kedaluwarsa wajib dibuat ulang; QR tidak tampil lagi setelah aktif |
| Keluar otomatis | Diamkan aplikasi 5 menit | Peringatan 30 detik → kembali ke halaman masuk |
| Keamanan (v1.7) | Salah sandi 5×, 7×, 10× | Dikunci 15 menit, 30 menit, lalu **diblokir** (Super Admin → Reset akses → Buka kunci / blokir akun) |
| Riwayat sandi (v1.7) | Ganti sandi dengan sandi yang pernah dipakai / mengandung NPP | Ditolak dengan pesan yang jelas |
| Masa berlaku sandi (v1.7) | Sandi berumur > 30 hari | Setelah login diminta membuat sandi baru |
| 1 Super Admin (v1.7) | Edit pengguna lain | Tidak ada pilihan Super Admin; server menolak |
| Upliner (v1.7) | Isi Upliner RM = NPP BBM, login sebagai BBM | Dashboard, Daftar Debitur, Penagihan & Pipeline = data BBM + seluruh bawahannya |
| Sinkronkan (v1.7) | Login sebagai RM | Tombol *Sinkronkan Google Sheets* tidak tampil |
| Produk (v1.7) | Sub menu SME & SBP, Dashboard | SME: BCM, CCC, SCF, KPP SUPPLY • SBP: BWU, CCC, KUR, KPP DEMAND, KUR PMI; grafik produk: BCM = gabungan SME |
| Tanggal Base Data (v1.7) | Import 2 tanggal berbeda → pilih tanggal lama di tombol *Posisi data* | Angka mengikuti tanggal itu + banner oranye; *Kembali ke data terbaru* |
| Jangka Waktu (v1.7) | Detail Debitur BCM, KUR & KUR PMI | Jangka waktu terisi |
| Format Excel (v1.7) | Import file Excel (BATCH + No Surat) → klik sel G6 → ubah Plafond → Cetak / PDF | Kolom Nama disorot; angsuran & rasio berubah; PDF A4 sama dengan cetak Excel |
| Pipeline (v1.7) | RM tambah pipeline SME; PRM tambah pipeline SBP Tambahan | Nama RM terkunci ke akunnya; Net Baki Debet = Nominal − Outstanding; total di mini dashboard |
| Akurasi | Bandingkan KPI dengan SUM/COUNT di Sheets | Sama (uji sampel per produk) |
| Sinkronisasi | Ubah, tambah, hapus baris Debitur | Tampil di web ≤ 60 detik |
| WA Blast | Nomor tidak valid, opt-out, kirim ganda, 200+ penerima | Dilewati / peringatan / terkirim bertahap |
| Ekspor | Excel, PDF & Cetak dengan filter aktif | Tampilan sama dengan tabel aplikasi; isi sesuai filter, mencantumkan logo, waktu cetak & nama pengguna; PDF tersimpan di Drive |
| Responsif | HP, tablet, desktop | Bottom bar mengambang di HP (Kualitas di tengah), kartu Penagihan rapi 1 kolom, tabel bisa digeser |
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
| Debitur KUR PMI masuk grup "Belum terdaftar" | Nama di `PT_PMI` tidak ada di daftar PT | Tambahkan di Pengaturan → Mitra KUR PMI, atau perbaiki tulisan di sheet |
| "Akun Anda baru saja masuk di perangkat lain" | Akun dipakai login di perangkat lain | Normal (1 akun = 1 perangkat). Bila bukan Anda, segera ganti sandi / minta Reset akses |
| Menu tertentu hilang | Menu tidak dicentang untuk peran Anda | Minta Super Admin mengatur di Pengguna & Peran → Peran & Hak Akses Menu |
| "Sandi awal akun ini sudah kedaluwarsa" | Akun belum aktivasi > 72 jam | Super Admin → Pengguna → **Reset akses**, lalu segera masuk |
| Apps Script tidak bisa disimpan: *SyntaxError: Unexpected token 'export'* (berkas `Worker.gs`) | `worker.js` (kode Cloudflare) ikut ditempel ke Apps Script | Di Apps Script: ⋮ di samping `Worker.gs` → **Hapus** → Ctrl+S. `worker.js` dipasang di Cloudflare (Bagian 6b) |
| "Akses langsung ke server ditolak" | Gerbang aktif, tetapi `GAS_URL` masih ke `/exec` atau rahasia Worker berbeda | Arahkan `GAS_URL` ke Worker / samakan `GATEWAY_SECRET`; darurat: `matikanGerbang` |
| Kotak Turnstile tidak muncul / gagal | Hostname widget tidak cocok | Tambahkan hostname aplikasi di widget Turnstile; darurat: `matikanTurnstile` |
| GitHub menampilkan ✗ **Workers Builds: finsight-gateway** setiap push (log: *Could not read package.json*) | Worker gerbang tersambung ke repository frontend (Git integration), jadi Cloudflare mencoba mem-build Worker dari folder frontend | Cloudflare → Workers & Pages → `finsight-gateway` → **Settings → Build → Git repository → Disconnect**. Worker tetap berjalan dengan versi terakhir. Jangan menambah `package.json` ke repository frontend |
| "Terlalu banyak permintaan" (429) | Batas per IP di Worker | Tunggu 1 menit; bila wajar sering terjadi, naikkan batas di `worker.js` |
| Halaman login masih menampilkan nama & subjudul | Frontend/backend belum v1.4, atau pengaturan dicentang | Cek footer v1.4.0; Pengaturan → Logo Aplikasi → hapus centang *Tampilkan nama aplikasi & subjudul* → Simpan logo |
| Analisa: "Aksi tidak dikenal" / format tidak termuat | Frontend v1.4 tetapi backend belum diperbarui / belum *Versi baru* | Ganti 4 berkas backend → Deploy → Kelola deployment → Edit → **Versi baru** |
| Hasil cetak terpotong / ada halaman kosong | Skala atau margin dialog cetak diubah | Dialog cetak: ukuran **A4**, margin **Default/Tidak ada**, skala **100%**, matikan *Header & footer* |
| Huruf di PDF sedikit berbeda dengan berkas asli | Font Calibri/Arial/Tahoma tidak terpasang (mis. di HP/Linux) | Cetak dari laptop Windows/Mac; di perangkat lain dipakai font pengganti yang ukurannya setara |
| Import analisa: baris dilewati | Kolom wajib (Nama, Perusahaan, NIK, Jangka Waktu, Plafond) kosong | Lengkapi baris yang disebutkan di ringkasan, import ulang |
| Pemetaan: daftar kolom sumber kosong | Spreadsheet belum dibaca atau Baris judul salah | Klik **Baca spreadsheet** / **Baca kolom spreadsheet**, cek nomor Baris judul |
| Detail KUR PMI "belum ditemukan" | Rek Afil di sheet Debitur tidak ada di spreadsheet KUR PMI | Samakan nomor Rek Afil (0 di depan boleh hilang) |
| Debitur hilang dari daftar | Rek Pinjaman ganda (atau Rek Afil / CIF ganda bila Rek Pinjaman kosong) | Lihat peringatan kuning di Daftar Debitur (nomor baris) & perbaiki di sheet |
| RM melihat 0 debitur (v1.5) | NPP di kolom `NPP_RM` tidak sama dengan NPP login RM, atau segmen RM tidak cocok | Periksa NPP di sheet (5 digit); Pengaturan → Akses Data → atur segmen / filter NPP peran tersebut |
| PT KUR PMI tidak tampil (v1.5) | PT belum terdaftar di Mitra KUR PMI, sheet-nya tidak ada / tidak dicentang | Tambahkan PT di daftar Mitra, pilih sheet-nya → **Simpan & terapkan** |
| Debitur KUR PMI lama hilang (v1.5) | Sumber per PT aktif dan debitur itu tidak ada di sheet PT mana pun | Normal — tambahkan ke sheet PT, atau periksa kolom pencocokan (Rek Afil / Rek Pinjaman) |
| Edit di Word: "Drive API … disabled" / gagal membuat dokumen | Layanan Drive belum aktif di proyek Apps Script | Editor Apps Script → **Layanan +** → **Drive API** → Tambahkan → Simpan → Deploy versi baru → coba lagi |
| Filter Unit kosong | Kolom `Unit` belum berisi data | Petakan *Unit* di Import Data atau isi kolom `Unit` di sheet |
| "Aksi tidak dikenal" setelah upgrade v1.5 | Backend belum v1.5 / belum *Versi baru* / berkas `Akses` belum dibuat | Lakukan langkah **Upgrade A** lengkap → Deploy → Kelola deployment → Edit → **Versi baru** |
| Jumlah debitur / baki di aplikasi beda dengan pivot database (v1.6) | Rek Pinjaman ganda, baris tanpa kunci, rekening KUR pindah ke KUR PMI, atau sheet Debitur belum di-import ulang | Pengaturan → Sinkronisasi & Data → **Cek kecocokan data per produk**; import ulang dari database terbaru |
| RM / PRM / ARM tidak melihat debiturnya (v1.6) | NPP login ≠ NPP RM pengelola di kolom NPP, filter NPP belum dicentang, atau kolom NPP salah | Akses Data → **Cek NPP**; centang "Hanya debitur dengan NPP RM sendiri"; petakan kolom NPP RM yang benar |
| Sub menu SCF / KPP SUPPLY kosong (v1.7) | Nilai produk di database berbeda | Diawali `SCF` → SCF; diawali `KPP SUP` → KPP SUPPLY. Cek **Sinkronisasi & Data → Cek kecocokan data per produk** (baris *Tidak ditampilkan*) |
| "Akun DIBLOKIR" (v1.7) | 10× salah sandi / kode | Super Admin → Pengguna & Peran → Reset akses → **Buka kunci / blokir akun**; Super Admin sendiri: `bukaBlokirAkun('NPP')` di editor |
| "Kata sandi ini pernah Anda gunakan" (v1.7) | Sandi baru = salah satu sandi lama | Buat sandi lain yang belum pernah dipakai |
| Super Admin kedua tidak bisa masuk (v1.7) | Hanya 1 Super Admin yang berlaku | Ubah perannya di Pengguna & Peran, atau pindahkan Super Admin dengan `pindahkanSuperAdmin` |
| Dashboard BBM / Branch Manager kosong atau masih semua data (v1.7) | Upliner bawahan belum diisi, atau *Data bawahan* tidak dicentang untuk perannya | Isi Upliner di Pengguna & Peran; Akses Data → centang **Data bawahan (downliner)** |
| Tombol *Posisi data* tidak bisa dipilih (v1.7) | Kolom `Tgl_Data` belum dipetakan / kosong | Import Data → Atur kolom → **Tanggal Base Data** → import ulang |
| Format Excel: "Judul kolom BATCH tidak ditemukan" (v1.7) | Sheet BATCH tidak punya judul NO / NAMA di kolom A/B | Pakai sheet BATCH dari file format KUR PMI, atau **Template import (.xlsx)** |
| Pipeline: "Anda hanya dapat mengisi pipeline atas nama …" (v1.7) | RM/PRM mengisi untuk orang lain | Normal — atasan (BBM/Branch Manager) atau Super Admin yang dapat mengisi untuk bawahan |
| Data baru tidak muncul | Pemicu belum terpasang | Pengaturan → Sinkronisasi → *Pemicu aktif* harus 4; bila kosong jalankan setup lagi |
| Tren Kol kosong | Snapshot baru 1 bulan | Normal — tren terisi otomatis tiap akhir bulan |
| Pesan WA "Antre" terus | Mode Fonnte tanpa token / kuota habis | Isi token, cek kuota di menu Gateway |
| Tampilan versi lama | Cache PWA | Naikkan `VERSI` di `sw.js`, atau Ctrl+Shift+R |
| 404 di GitHub Pages | Yang di-push folder induk | Push ulang dari folder yang berisi `index.html` (`git push --force`) |
