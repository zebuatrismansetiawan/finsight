/* ==========================================================================
   FinSight — pak.js : Perangkat Analisa KUR PMI (v1.4)
   Format dokumen dibuat SAMA dengan berkas "ANALISA KREDIT" (8 halaman A4):
     1–3  Perangkat Analisa KUR      4–5  Struktur Fasilitas Kredit
     6    Call Memo (penyelenggara)   7    Call Memo (debitur)
     8    Check List Syarat Disposisi KUR PMI
   - Perhitungan angsuran: metode ANUITAS (= rumus PMT/IPMT/PPMT di SIM KUR.xlsx).
   - Halaman disusun di browser (diukur per blok → dipecah per halaman A4), lalu
     pratinjau = hasil cetak (Cetak / Simpan sebagai PDF).
   - Isi teks, penandatangan, kantor, profil penyelenggara & kolom data diatur
     Super Admin (disimpan di server — lihat Analisa.gs).
   ========================================================================== */
'use strict';

const PAK = (() => {
  const ID = 'PAK-KUR';
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const e = (v) => String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const br = (v) => e(v).replace(/\r?\n/g, '<br>');

  // ------------------------------------------------------------------------
  //  Kolom data bawaan (kunci sama dengan server). inti = dipakai format, tidak bisa dihapus.
  // ------------------------------------------------------------------------
  const KOLOM = [
    { k: 'nama', label: 'Nama', tipe: 'teks', wajib: true, inti: true },
    { k: 'pt', label: 'Perusahaan', tipe: 'teks', wajib: true, inti: true, ket: 'Penyelenggara pemagangan / LPK, mis. PT. Minori' },
    { k: 'nik', label: 'NIK', tipe: 'teks', wajib: true, inti: true, ket: '16 digit (ditulis sebagai teks)' },
    { k: 'hp', label: 'No HP', tipe: 'teks', inti: true },
    { k: 'tempat', label: 'Tempat Penempatan Kerja', tipe: 'teks', inti: true, ket: 'Perusahaan tempat magang, mis. Daihatsu Motor Co., Ltd.' },
    { k: 'pekerjaan', label: 'Jenis Pekerjaan', tipe: 'teks', inti: true, ket: 'mis. Pekerjaan Perakitan Mobil' },
    { k: 'lama', label: 'Lama Penempatan', tipe: 'teks', inti: true, ket: 'Angka = bulan (mis. 12) atau teks (mis. 3 tahun)' },
    { k: 'gaji', label: 'Gaji Perbulan', tipe: 'angka', inti: true, ket: 'Rupiah per bulan' },
    { k: 'status', label: 'Status', tipe: 'pilihan', opsi: ['Menikah', 'Belum Menikah', 'Janda', 'Duda'], inti: true },
    { k: 'tmplahir', label: 'Tempat Lahir', tipe: 'teks', inti: true },
    { k: 'tgllahir', label: 'Tgl Lahir', tipe: 'tanggal', inti: true },
    { k: 'jk', label: 'Jenis Kelamin (L/P)', tipe: 'pilihan', opsi: ['L', 'P'], inti: true },
    { k: 'jw', label: 'Jangka Waktu', tipe: 'angka', wajib: true, inti: true, ket: 'Bulan' },
    { k: 'berangkat', label: 'Rencana Berangkat', tipe: 'tanggal', inti: true },
    { k: 'slik', label: 'Hasil SLIK', tipe: 'panjang', inti: true, ket: 'Lanjutan kalimat setelah nama, mis. "ditemukan riwayat fasilitas kredit di Bank … dengan status lancar."' },
    { k: 'plafond', label: 'Plafond Pinjaman', tipe: 'angka', wajib: true, inti: true, ket: 'Rupiah' },
    { k: 'alamat', label: 'Alamat', tipe: 'panjang', inti: true },
    { k: 'nopak', label: 'Nomor PAK', tipe: 'teks', inti: true, ket: 'mis. JBA/4/KUR PMI/897/2026' },
    { k: 'tglpak', label: 'Tanggal PAK', tipe: 'tanggal', inti: true },
    { k: 'tglmohon', label: 'Tanggal Permohonan', tipe: 'tanggal', inti: true },
    { k: 'lain', label: 'Kewajiban Bank Lain', tipe: 'angka', inti: true, ket: 'Rupiah per bulan (0 bila tidak ada)' },
    { k: 'negara', label: 'Negara Penempatan', tipe: 'teks', ket: 'Opsional — kosong = negara bawaan di pengaturan' },
    { k: 'gaji_yen', label: 'Gaji (Yen)', tipe: 'angka', ket: 'Opsional — untuk kalimat gaji di Call Memo' },
    { k: 'kurs', label: 'Kurs Yen', tipe: 'angka', ket: 'Opsional — Rupiah per ¥1 (mis. 113,41)' }
  ];

  // ------------------------------------------------------------------------
  //  Teks bawaan = kalimat di berkas ANALISA KREDIT (apa adanya). {{kunci}} / {{kunci:format}}
  //  diganti data. Format: rp, angka, tgl (17 Nov 2026), tglpanjang (17 November 2026), terbilang, besar, kecil.
  // ------------------------------------------------------------------------
  const TEKS = {
    keperluan: 'Pembiayaan atas biaya pelatihan, perijinan dan lain-lain sebagai Pekerja Magang ke {{negara}} sesuai Struktur Biaya (Cost Structure).',
    verifikasi: 'Hasil verifikasi telah sesuai dengan informasi yang diberikan pemohon atas nama {{nama}} yang bersangkutan akan melaksankan magang pada perusahaan {{tempat}} yang berada di {{negara}}, cfm surat Permohonan debitur Tgl {{tglmohon:tgl}} dan telah di lakukan verifikasi kepada penyelenggara pemagangan dalam hal ini {{penyelenggara}} yang telah tertuang didalam call memo verifikasi.',
    slik: 'Cfm. Hasil SLIK OJK tanggal {{tglmohon:tgl}} atas nama {{nama}} {{slik}}',
    ots: '{{penyelenggara}}\ntgl {{tglmohon:tgl}}',
    layak1: 'Pekerja Magang di Luar Negeri an. {{nama}} dinilai layak untuk dibiayai.',
    layak2: 'Diusulkan untuk mendapat  Fasilitas KUR PMI',
    tlayak1: 'Pekerja Magang di Luar Negeri an. {{nama}} dinilai tidak layak untuk dibiayai.',
    tlayak2: 'Tidak diusulkan untuk mendapat  Fasilitas Kredit KUR PMI.',
    pencairan: 'PKS antara BNI dan Penyelenggara Pemagangan telah ditandatangani oleh pihak yang berwenang\nPerjanjian Kredit telah ditandatangani oleh Debitur\nBiaya administrasi telah disetorkan efektif.\nTelah diterima surat permohonan pencairan kredit dari Debitur ke BNI & dilengkapi dokumen pendukung sebagai berikut :\n- Fotocopy dokumen keberangkatan Debitur ke luar negeri\n- Fotocopy buku tabungan BNI atas nama Debitur dan Surat Kuasa kepada BNI untuk mendebet rekening tersebut guna penyelesaian kewajiban Pekerja Magang.\n- Daftar rincian biaya yang akan dibiayai BNI.\nPencairan dilaksanakan paling lambat 5 (lima) hari setelah Debitur sampai di negara penempatan.\nMenandatangani Surat Pernyataan yang menyatakan akan membebaskan BNI dan pegawai BNI dari tuntutan hukum yang berlaku dan akan berlaku terkait fasilitas kredit di BNI.\nPencairan dilakukan ke rekeining afiliasi debitur kemudian dipindahbukan ke rekening operasional {{penyelenggara}} untuk biaya pelatihan pemagangan.\nPencairan dapat dilakukan setelah data saudara berhasil ditambahkan ke SIKP',
    lainlain: 'Aktivitas keuangan disalurkan melalui BNI.\nCalon debitur harus memiliki rekening giro/tabungan BNI yang dipergunakan sebagai rekening afiliasi (pembayaran angsuran).\nPembebanan angsuran pokok dan bunga dilakukan pada tanggal 25 setiap bulannya dan wajib dibayarkan pada tanggal tersebut (jika tanggal 25 jatuh pada hari Sabtu / Minggu atau hari libur, maka pembebanan akan dilakukan sebelum tanggal 25), Saudara tidak diperkenankan menunggak angsuran pokok dan bunga pinjaman serta kewajiban lainya.\nApabila terjadi pelunasan kredit sebelum jatuh tempo masa kredit, tidak dikenakan denda / penalti\nSeluruh biaya yang timbul karena dan untuk pelaksanaan Perjanjian Kredit, akan menjadi beban Saudara.\nSelama mendapatkan kredit dari BNI, tidak diperkenankan mengajukan pinjaman ke Bank lain.\nLain - lain sesuai ketentuan yang berlaku di PT. Bank Negara Indonesia (Persero) Tbk',
    m1_tujuan: 'Verifikasi kebenaran dan keabsahan data calon debitur KUR PMI',
    m1_poin: 'Bpk. {{kontak}} merupakan  {{jabatan_kontak}}  {{penyelenggara}} yang mengkoordinir terkait proses penyaluran KUR PMI .\nCf. Informasi ybs bahwa benar an. {{nama}} adalah salah satu pemagang  LPK {{penyelenggara}} yang akan di berangkatkan Ke {{negara}} untuk magang di perusahaan {{tempat}} yang bergerak di bidang {{pekerjaan}}.\nBpk. {{kontak}} mengiformasikan atas nama {{nama}} magang selama {{lama_teks}} dengan gaji sebesar {{gaji_memo}}.\nYbs juga menyampaikan bahwa benar sdr {{nama}} bermohon untuk pembiayaan KUR PMI yang digunakan untuk membiayai keperluan pelatihan dan keberangkatan pemagangan oleh {{lpk}}.',
    m2_tujuan: 'Verifikasi calon debitur terkait penyaluran KUR PMI (Pemagang)',
    m2_poin: 'Telah dilakukan verifikasi kepada Sdr. {{nama}} calon debitur KUR PMI BNI {{unit}}, diketahui bahwa benar ybs merupakan pemagang yang akan berangkat ke {{negara}} melalui {{lpk}}.\nSdr. {{nama}} akan melakukan kegiatan pemagangan di Perusahaan {{tempat}} yang bergerak dibidang {{pekerjaan}} dan berlokasi di {{negara}} dengan keberangkatan pada tanggal {{berangkat:tglpanjang}}\nYbs bermohon kepada BNI {{unit}} untuk mendapatkan fasilitas KUR PMI yang digunakan untuk membayar biaya keperluan pemagangan dan keberangkatan ke {{negara}} melalui {{lpk}}.\nLain-lain terkait penyaluran KUR PMI kepada ybs telah sesuai persyaratan dan akan diproses sesuai dengan ketentuan internal BNI.',
    followup: 'Menindaklanjuti permohonan debitur',
    ck_akad: 'KTP\nKartu Keluarga\nAkte Lahir\nSurat Perjanjian Kontrak Kerja ke {{negara}}\nSurat Perjanjian Kontrak Kerja ke {{lpk_singkat}}\nSlip Gaji\nHasil MCU\nPasphoto',
    ck_cair: 'Paspor\nVisa\nTiket Pesawat\nSurat Permohonan Pengajuan Fasilitas Kredit\nSurat Pernyataan Pengajuan KUR PMI\nSurat Pernyataan Permohonan Pencairan Kredit\nPhoto Akad Kredit\nPhoto Selfie dengan Debitur\nSurat Pernyataan orang tua / pasangan'
  };
  const LABEL_TEKS = {
    keperluan: 'A.4 Keperluan Kredit', verifikasi: 'B.1 Hasil Verifikasi', slik: 'B.3 Hubungan dengan Bank (SLIK) — dipakai bila Hasil SLIK tidak diawali "Cfm"',
    ots: 'Kolom OTS (tabel sumber data)', layak1: 'Hasil analisa — layak (baris 1)', layak2: 'Hasil analisa — layak (baris 2)', tlayak1: 'Hasil analisa — tidak layak (baris 1)', tlayak2: 'Hasil analisa — tidak layak (baris 2)',
    pencairan: '1.1.9 Syarat Pencairan (1 baris = 1 butir; awali "- " untuk sub-butir)', lainlain: '1.1.10 Syarat Lain-lain (1 baris = 1 butir)',
    m1_tujuan: 'Call Memo penyelenggara — Tujuan Call', m1_poin: 'Call Memo penyelenggara — Hasil Call (1 baris = 1 poin)',
    m2_tujuan: 'Call Memo debitur — Tujuan Call', m2_poin: 'Call Memo debitur — Hasil Call (1 baris = 1 poin)', followup: 'Call Memo — Follow Up',
    ck_akad: 'Check List — Persyaratan Akad Kredit (1 baris = 1 dokumen)', ck_cair: 'Check List — Persyaratan Pencairan Kredit (1 baris = 1 dokumen)'
  };

  /** Konfigurasi contoh (mode demo — nama fiktif). Aplikasi sungguhan memakai konfigurasi dari server. */
  const CONTOH = {
    nama: 'Perangkat Analisa KUR PMI',
    kolom: KOLOM,
    ttd: { prm: { nama: 'Andi Pratama', jabatan: 'PRM', panjang: 'Program Relationship Manager' }, bbm: { nama: 'Sari Wulandari', jabatan: 'Business Banking Manager' }, bm: { nama: 'Budi Santoso', jabatan: 'Branch Manager' }, cop: { nama: 'Rudi', jabatan: 'COP' } },
    kantor: { bank: 'PT. BANK NEGARA INDONESIA (Persero) Tbk.', cabang: 'Kantor Cabang Contoh', unit: 'Contoh', booking: 'KCU Contoh', kota: 'Bekasi', formulir: 'BNI - 115 C' },
    kredit: { bunga: 6, perihal: 'KUR PMI Aflopend', keperluan: 'Kredit Usaha Rakyat untuk Pembiayaan Pekerja Magang', jenis: 'BNI Kredit Usaha Rakyat – PMI', negara: 'Jepang', batas: 60, propisi: 'Tidak dikenakan', admin: 'Tidak dikenakan' },
    pt: [{ nama: 'PT. Minori', kata: 'minori', lpk: 'LPK Minori', kontak: 'Hendra', jabatan: 'General Manager', telp: '08xx-xxxx-xxxx', narasumber: ['Narasumber Satu', 'Hendra', 'Narasumber Tiga'] }],
    teks: {}
  };

  // ------------------------------------------------------------------------
  //  Nilai & format
  // ------------------------------------------------------------------------
  function angka(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    let s = String(v === null || v === undefined ? '' : v).replace(/[Rr][Pp]\.?|¥|\s/g, '');
    if (!s) return NaN;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
    if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  const n0 = (v) => { const n = angka(v); return isNaN(n) ? 0 : n; };
  function tanggal(v) {
    if (v instanceof Date) return isNaN(v) ? null : v;
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
    const s = String(v === null || v === undefined ? '' : v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) return new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1]);
    m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) { const k = m[2].slice(0, 3).toLowerCase(); const i = BLS.findIndex((b) => b.toLowerCase() === k) > -1 ? BLS.findIndex((b) => b.toLowerCase() === k) : ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(k); if (i > -1) return new Date(+m[3], i, +m[1]); }
    if (/^\d{5}(\.\d+)?$/.test(s)) return tanggal(Number(s));
    return null;
  }
  const dua = (x) => ('0' + x).slice(-2);
  const titik = (n) => Math.round(n).toLocaleString('id-ID');
  const desimal = (n) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));
  function terbilang(n) {
    n = Math.round(Math.abs(n));
    const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    const t = (x) => {
      if (x < 12) return s[x];
      if (x < 20) return t(x - 10) + ' belas';
      if (x < 100) return t(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + t(x % 10) : '');
      if (x < 200) return 'seratus' + (x - 100 ? ' ' + t(x - 100) : '');
      if (x < 1000) return t(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + t(x % 100) : '');
      if (x < 2000) return 'seribu' + (x - 1000 ? ' ' + t(x - 1000) : '');
      if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + t(x % 1000) : '');
      if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta' + (x % 1e6 ? ' ' + t(x % 1e6) : '');
      if (x < 1e12) return t(Math.floor(x / 1e9)) + ' miliar' + (x % 1e9 ? ' ' + t(x % 1e9) : '');
      return t(Math.floor(x / 1e12)) + ' triliun' + (x % 1e12 ? ' ' + t(x % 1e12) : '');
    };
    return n === 0 ? 'nol' : t(n).replace(/\s+/g, ' ').trim();
  }
  function fmt(v, f) {
    if (v === null || v === undefined || v === '') return '';
    f = String(f || '').toLowerCase();
    if (f === 'rp') { const n = angka(v); return isNaN(n) ? String(v) : 'Rp' + titik(n); }
    if (f === 'angka') { const n = angka(v); return isNaN(n) ? String(v) : titik(n); }
    if (f === 'terbilang') { const n = angka(v); return isNaN(n) ? String(v) : terbilang(n); }
    if (f === 'tgl') { const d = tanggal(v); return d ? dua(d.getDate()) + ' ' + BLS[d.getMonth()] + ' ' + d.getFullYear() : String(v); }
    if (f === 'tglpanjang') { const d = tanggal(v); return d ? dua(d.getDate()) + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : String(v); }
    if (f === 'besar') return String(v).toUpperCase();
    if (f === 'kecil') return String(v).toLowerCase();
    return typeof v === 'number' ? desimal(v) : String(v);
  }
  const persen = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',') + '%';
  const persenBunga = (b) => desimal(Math.round(b * 1000) / 1000) + '%';

  // ------------------------------------------------------------------------
  //  Perhitungan ANUITAS (sama dengan SIM KUR.xlsx: PMT, IPMT, PPMT — angsuran akhir bulan)
  // ------------------------------------------------------------------------
  function hitung(d, k) {
    const P = n0(d.plafond), n = Math.max(0, Math.round(n0(d.jw))), b = Number((k.kredit || {}).bunga) || 0, r = b / 100 / 12;
    const pmt = !P || !n ? 0 : (r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n);
    const bunga1 = P * r, pokok1 = pmt - bunga1;
    const yen = n0(d.gaji_yen), kurs = n0(d.kurs);
    const gaji = n0(d.gaji) || (yen && kurs ? yen * kurs : 0);
    const lain = n0(d.lain);
    const rasio = gaji ? (pmt + lain) / gaji * 100 : null;
    return { P, n, b, r, pmt, bunga1, pokok1, lain, gaji, yen, kurs, rasio };
  }
  /** Tabel angsuran (seperti sheet SIM- KUR): bulan ke, pokok awal, cicilan pokok, bunga, angsuran, saldo. */
  function tabel(h) {
    const out = [];
    let saldo = h.P;
    for (let i = 1; i <= h.n; i++) {
      const bunga = saldo * h.r, cicil = h.pmt - bunga;
      out.push({ ke: i, awal: saldo, cicil, bunga, angsuran: h.pmt, saldo: Math.max(0, saldo - cicil) });
      saldo -= cicil;
    }
    return out;
  }
  function usia(d) {
    const lahir = tanggal(d.tgllahir);
    if (!lahir) return null;
    const ref = tanggal(d.tglpak) || tanggal(d.tglmohon) || new Date();
    let u = ref.getFullYear() - lahir.getFullYear();
    if (ref.getMonth() < lahir.getMonth() || (ref.getMonth() === lahir.getMonth() && ref.getDate() < lahir.getDate())) u--;
    return u;
  }

  // ------------------------------------------------------------------------
  //  Profil penyelenggara (PT) & variabel teks
  // ------------------------------------------------------------------------
  const normPt = (v) => String(v || '').toLowerCase().replace(/\bpt\b\.?/g, '').replace(/[^a-z0-9]/g, '');
  function profilPt(k, nama) {
    const n = normPt(nama);
    if (!n) return null;
    const L = k.pt || [];
    return L.find((p) => normPt(p.nama) === n) || L.find((p) => p.kata && n.includes(normPt(p.kata))) || L.find((p) => normPt(p.nama) && (n.includes(normPt(p.nama)) || normPt(p.nama).includes(n))) || null;
  }
  function vars(k, d) {
    const h = hitung(d, k), p = profilPt(k, d.pt) || {};
    const kr = k.kredit || {}, ka = k.kantor || {}, t = k.ttd || {};
    const peny = p.nama || String(d.pt || '').trim();
    const lpk = p.lpk || ('LPK ' + peny.replace(/^PT\.?\s*/i, '')).trim();
    const lama = String(d.lama === undefined || d.lama === null ? '' : d.lama).trim();
    const tp = tanggal(d.tglpak);
    let gajiMemo = h.gaji ? 'Rp' + titik(h.gaji) : '';
    if (h.yen && h.kurs) {
      gajiMemo = '¥ ' + String(Math.round(h.yen * 100) / 100).replace('.', ',') + ' atau sebesar Rp.' + (h.yen * h.kurs).toFixed(2).replace('.', ',') +
        ' dengan rate ' + desimal(h.kurs) + (tp ? ' tanggal ' + tp.getDate() + ' ' + BLN[tp.getMonth()] + ' ' + tp.getFullYear() : '');
    }
    const V = Object.assign({}, d, {
      negara: String(d.negara || '').trim() || kr.negara || 'Jepang', penyelenggara: peny, lpk, lpk_singkat: lpk.replace(/^LPK\s*/i, ''),
      kontak: p.kontak || '', jabatan_kontak: p.jabatan || '', telp_kontak: p.telp || '',
      lama_teks: /^\d+(\.\d+)?$/.test(lama) ? Number(lama) + ' bulan' : lama, gaji_memo: gajiMemo,
      bunga: persenBunga(h.b), angsuran: 'Rp' + titik(h.pmt), plafond_rp: 'Rp' + titik(h.P),
      prm: (t.prm || {}).nama || '', bbm: (t.bbm || {}).nama || '', bm: (t.bm || {}).nama || '', cop: (t.cop || {}).nama || '',
      cabang: ka.cabang || '', unit: ka.unit || '', kota: ka.kota || '', booking: ka.booking || '', bank: ka.bank || ''
    });
    return { V, h, p };
  }
  const RE = /\{\{\s*([a-zA-Z0-9_]+)(?::([a-zA-Z]+))?\s*\}\}/g;
  function isi(teks, V) {
    return String(teks || '').replace(RE, (m, kk, f) => { const v = V[kk.toLowerCase()]; return v === undefined || v === null ? '' : fmt(v, f); });
  }
  const teksDari = (k, kunci) => { const t = (k.teks || {})[kunci]; return t === undefined || t === null || t === '' ? TEKS[kunci] : t; };
  const baris = (s) => String(s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

  // ------------------------------------------------------------------------
  //  CSS dokumen (dipakai pratinjau & cetak) — satuan pt, A4 595,2 × 841,8 pt
  // ------------------------------------------------------------------------
  const CSS = `
.pak{--sal:#F4B084;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pak *{box-sizing:border-box;margin:0;padding:0}
.pak-hal{width:595.2pt;height:841.8pt;background:#fff;position:relative;overflow:hidden;padding:28.75pt 34.5pt 24pt 33pt}
.pak-hal+.pak-hal{margin-top:14px}
.pk-cal{font-family:Calibri,Carlito,'Segoe UI',Arial,sans-serif;font-size:10.45pt;line-height:13.8pt}
.pk-ari{font-family:Arial,'Liberation Sans',Helvetica,sans-serif;font-size:11pt;line-height:13.7pt}
.pk-tah{font-family:Tahoma,'Segoe UI','DejaVu Sans',Verdana,sans-serif;font-size:10pt;line-height:15.1pt}
.pak b,.pak .b{font-weight:700}.pak u{text-decoration:underline}.pak s{text-decoration:line-through}
.pk-c{text-align:center}.pk-r{text-align:right}.pk-j{text-align:justify}
.pk-t1{text-align:center;font-weight:700;font-size:15.2pt;line-height:18.4pt}
.pk-t2{text-align:center;font-weight:700;line-height:14pt}
.pk-sek{border:1pt solid #000;height:14.6pt;line-height:13.2pt;text-align:center;font-weight:700;font-size:11.4pt;margin-left:-.3pt;margin-right:-2.4pt}
.pk-kv{display:grid;grid-template-columns:23.8pt 161.2pt 14.9pt 1fr}
.pk-kv>span:first-child{padding-left:8.8pt}
.pk-ind{padding-left:23.8pt}
.pk-n{display:grid;grid-template-columns:23.8pt 1fr}.pk-n>span:first-child{padding-left:8.8pt}
.pk-tb{border-collapse:collapse;table-layout:fixed}
.pk-tb td{border:.75pt solid #000;padding:0 1.7pt;vertical-align:top;overflow:hidden;line-height:13pt}
.pk-tb td.pk-kecil{line-height:12.5pt}
.pk-tb .h td{background:var(--sal);font-weight:700;text-align:center;vertical-align:middle}
.pk-tb .hn td{background:var(--sal);text-align:center}
.pk-row td{border-top:0}
.pk-row.awal td{border-top:1.4pt solid #000}
.pk-tb td.ol{border-left-width:1.4pt}.pk-tb td.or{border-right-width:1.4pt}
.pk-tb.ak tr:last-child td{border-bottom-width:1.4pt}
.pk-tb.tep td{border-color:#000}
.pk-mid{vertical-align:middle!important}
.pk-kecil{font-size:9.5pt;line-height:12.5pt}
.pk-box{display:inline-block;border:.9pt solid #000;text-align:center}
.pk-dot{display:block;width:371.8pt;overflow:hidden;white-space:nowrap}
.pk-cf,.pk-mf{flex:none}
.pk-st{display:grid;grid-template-columns:64pt 30.1pt 80.9pt 10pt 14.9pt 1fr}
.pk-sub{display:grid;grid-template-columns:212pt 22.9pt 1fr}
.pk-sub>span:nth-child(2){align-self:center}
.pk-ssub{display:grid;grid-template-columns:241.6pt 12.8pt 1fr}
.pk-ssub>span:nth-child(2){align-self:center}
/* Call memo */
.pk-mf{border:1pt solid #000;margin-left:.4pt;width:528.9pt;margin-top:-3.25pt}
.pk-ms{border-bottom:1pt solid #000;position:relative}
.pk-ms:last-child{border-bottom:0}
.pk-a8{font-size:8pt;line-height:14.5pt;font-weight:700}
.pk-a9{font-size:10pt;line-height:14.5pt}
.pk-mbox{border:1pt solid #000;margin-left:49.6pt;width:429pt;height:30pt;padding-top:2.4pt;padding-left:202.4pt;font-weight:700;font-size:10pt;line-height:14.5pt}
.pk-mg{display:grid}
.pk-pt{display:grid;grid-template-columns:51.8pt 1fr;margin-top:10.6pt}
.pk-pt>span:first-child{padding-left:23.6pt}
/* Check list */
.pk-cf{border:1.4pt solid #000;margin-left:-21.9pt;width:572.9pt;margin-top:-3.25pt}
.pk-cs{border-bottom:1.4pt solid #000}
.pk-cs:last-child{border-bottom:0}
.pk-ck td{border:.75pt solid #000;text-align:center;padding:0}
@media print{@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}.pak-hal{box-shadow:none!important;margin:0!important;break-after:page;page-break-after:always}.pak-hal:last-child{break-after:auto;page-break-after:auto}}
`;

  // ------------------------------------------------------------------------
  //  Pembangun blok (HTML) — tiap bagian = daftar blok; blok tidak pernah dipecah
  // ------------------------------------------------------------------------
  const tbl = (lebar, kiri, kolom, isiTr, kls) => `<table class="pk-tb ${kls || ''}" style="width:${lebar}pt;margin-left:${kiri}pt"><colgroup>${kolom.map((w) => `<col style="width:${w}pt">`).join('')}</colgroup><tbody>${isiTr}</tbody></table>`;
  const tdx = (isi, i, n, ex, st) => `<td class="${i === 0 ? 'ol ' : ''}${i === n - 1 ? 'or ' : ''}${ex || ''}"${st ? ` style="${st}"` : ''}>${isi}</td>`;
  /** Satu baris tabel yang bisa terpisah halaman (pk-row). akhir = baris terakhir (garis bawah tebal). */
  function barisTbl(spec, sel, tinggi, akhir) {
    const n = sel.length;
    return { tr: true, h: tbl(spec.w, spec.l, spec.k, `<tr class="pk-row" style="height:${tinggi}pt">${sel.map((c, i) => tdx(c[0], i, n, c[1], (akhir ? 'border-bottom-width:1.4pt;' : '') + (c[2] || ''))).join('')}</tr>`) };
  }

  function bagianPak(k, d, V, h) {
    const kr = k.kredit || {}, t = k.ttd || {}, pr = t.prm || {}, bb = t.bbm || {}, bm = t.bm || {};
    const B = [];
    // ---- Halaman 1: A & B
    B.push({ h: `<div style="padding-top:1.2pt"><div class="pk-t1">PERANGKAT ANALISA KUR</div><div class="pk-t2">No. ${e(d.nopak || '')} Tgl. ${e(fmt(d.tglpak, 'tgl'))}</div></div>` });
    B.push({ h: `<div style="padding-top:14.2pt"><div class="pk-sek">A. KETERANGAN DEBITUR / CALON DEBITUR</div></div>` });
    const hp = String(d.hp || '').trim();
    const kv = (n, l, c, v, st) => `<div class="pk-kv"${st ? ` style="${st}"` : ''}><span>${n}</span><span>${l}</span><span>${c}</span><span${st && /justify/.test(st) ? ' class="pk-j"' : ''}>${v}</span></div>`;
    B.push({ h: `<div style="padding-top:13.4pt">${kv('1', 'Nama Debitur / Calon Debitur', ':', e(d.nama))}${kv('2', 'Alamat Rumah/No. Telp', ':', br(String(d.alamat || '') + (hp ? ' / ' + hp : '')))}${kv('3', 'Nomor &amp; Tgl. KTP', ':', e(d.nik))}${kv('4', 'Permohonan Kredit', '', '')}
      ${kv('', 'Cfm. Form Aplikasi KUR TKI BNI', ':', `Tgl ${e(fmt(d.tglmohon, 'tgl'))} atas nama ${e(d.nama)}`)}<div class="pk-kv"><span></span><span>Keperluan Kredit</span><span></span><span class="pk-j">${br(isi(teksDari(k, 'keperluan'), V))}</span></div></div>` });
    B.push({ h: `<div style="padding-top:19.6pt">${kv('', 'Fasilitas Kredit', ':', '')}<div style="padding-top:13.6pt">${tbl(207.5, 92, [106, 101.5],
      `<tr class="h" style="height:13.8pt;--sal:#fff"><td class="ol" style="border-top-width:1.4pt">Perihal</td><td class="or" style="border-top-width:1.4pt">${e(kr.perihal || '')}</td></tr>
       <tr style="height:13.8pt"><td class="ol">Maks. Kredit (Rp)</td><td class="or pk-r">${e('Rp' + titik(h.P))}</td></tr>
       <tr style="height:13.8pt"><td class="ol" style="border-bottom-width:1.4pt">Jangka Waktu</td><td class="or" style="border-bottom-width:1.4pt"><span style="display:inline-block;width:34pt;padding-left:10.4pt">${e(h.n)}</span><span style="padding-left:20.4pt">bulan</span></td></tr>`)}</div></div>` });
    B.push({ h: `<div style="padding-top:14.3pt"><div class="pk-sek">B. HASIL VERIFIKASI DEBITUR / CALON DEBITUR</div></div>` });
    B.push({ h: `<div style="padding-top:14.2pt"><div class="pk-n"><span>1</span><span>Hasil Verifikasi</span></div><div class="pk-ind pk-j" style="padding-top:6.7pt">${br(isi(teksDari(k, 'verifikasi'), V))}</div></div>` });
    const rp = (x) => 'Rp' + titik(x);
    const rasio = h.rasio === null ? '' : persen(h.rasio, 2);
    B.push({ h: `<div style="padding-top:19.9pt"><div class="pk-n"><span>2</span><span>Repayment Capacity</span></div><div style="padding-top:13.8pt">${tbl(306, 62, [170.8, 135.2],
      `<tr class="h" style="height:13.8pt"><td class="ol" style="border-top-width:1.4pt"></td><td class="or" style="border-top-width:1.4pt">${e(kr.perihal || '')}</td></tr>
       ${[['Suku Bunga', persenBunga(h.b)], ['Beban Bunga / bulan*', rp(h.bunga1)], ['Angsuran Pokok / bulan*', rp(h.pokok1)], ['Total Kewajiban BNI / bulan', rp(h.pmt)], ['Total Kewajiban Bank Lain / bulan', rp(h.lain)]]
        .map((r) => `<tr style="height:13.8pt"><td class="ol">${r[0]}</td><td class="or pk-r">${e(r[1])}</td></tr>`).join('')}
       <tr style="height:13.8pt"><td class="ol">Gaji/Upah/Uang saku per bulan</td><td class="or pk-r" style="padding-right:5pt">${h.gaji ? e(titik(h.gaji)) : ''}</td></tr>
       <tr style="height:41.4pt"><td class="ol pk-j" style="border-bottom-width:1.4pt">Nilai % Total Kewajiban / Bulan Dibanding Gaji / Upah / Uang Saku per bulan</td><td class="or pk-r" style="border-bottom-width:1.4pt">${e(rasio)}</td></tr>`)}</div></div>` });
    const slikRaw = String(d.slik || '').trim();
    const slik = /^cfm/i.test(slikRaw) ? slikRaw : isi(teksDari(k, 'slik'), V);
    B.push({ h: `<div style="padding-top:13.3pt"><div class="pk-n"><span>3</span><span>Hubungan Dengan Bank atau Lembaga Keuangan Bukan Bank - jika ada</span></div><div style="display:grid;grid-template-columns:44.5pt 1fr"><span style="padding-left:30.8pt;padding-top:8pt">-</span><span class="pk-j">${br(slik)}</span></div></div>` });
    // ---- Halaman 2+: sumber data, C. Kesimpulan & usulan
    const NS = { w: 508, l: 21.3, k: [21.6, 130.9, 125.7, 68.7, 161.1] };
    const petugas = `${e(pr.nama)}/ ${e(pr.panjang || pr.jabatan)} - ${e(bb.nama)}/${e(bb.jabatan)}`;
    const nar = (V.__nar && V.__nar.length ? V.__nar : ['']);
    const ots = br(isi(teksDari(k, 'ots'), V));
    const hdrNs = tbl(NS.w, NS.l, NS.k, `<tr class="h" style="height:13.8pt"><td class="ol" rowspan="2" style="border-top-width:1.4pt">No.</td><td rowspan="2" style="border-top-width:1.4pt">Narasumber / Jabatan</td><td rowspan="2" style="border-top-width:1.4pt">Petugas Verifikasi</td><td class="or" colspan="2" style="border-top-width:1.4pt">Sarana Verifikasi</td></tr><tr class="h" style="height:13.8pt"><td>Call</td><td class="or">OTS</td></tr>`);
    nar.forEach((nm, i) => {
      const r = barisTbl(NS, [[String(i + 1), 'pk-c pk-mid'], [e(nm), 'pk-c pk-mid'], [petugas, 'pk-c pk-mid'], ['', ''], [ots, 'pk-c pk-mid']], i ? 72.3 : 69.4, i === nar.length - 1);
      if (i === 0) B.push({ pecah: true, h: `<div style="line-height:13.8pt;padding-left:23.8pt">Seluruh data / informasi di atas diperoleh dari sumber-sumber sbb :</div>${hdrNs}${r.h}` });
      else B.push(r);
    });
    B.push({ h: `<div style="padding-top:13.7pt"><div class="pk-sek">C. KESIMPULAN &amp; USULAN</div></div>` });
    const KS = { w: 508, l: 21.3, k: [21.6, 189.9, 135.4, 114, 47.1] };
    const ya = (ok, a, b) => ok ? [e(a), `<s>${e(b)}</s>`] : [`<s>${e(a)}</s>`, e(b)];
    const u = usia(d), usiaOk = u === null ? true : u >= 18;
    const batas = Number(kr.batas) || 60, rasioOk = h.rasio === null ? true : h.rasio <= batas + 1e-9;
    const dok = 'Menyerahkan dokumen Persyaratan Calon Debitur Cfm Prosedur KUR TKI &nbsp; &nbsp; &nbsp; Dokumen yang terlampir<br>1. Copy/Scan KTP &amp; Pasangan (Jika sudah menikah<br>2. Copy/ScanNPWP(Jika ada)<br>3. Copy/Scan KK<br>4. Copy/Scan Buku Nikah (Jika sudah menikah)<br>5. Surat Permohonan Kredit (Draft/Template akan dikirimkan)<br>6. Surat Pernyataan Orang Tua/Wali bagi yang belum menikah (Pemberian Izin)<br>7. Surat Hasil Pemeriksaan Kesehatan &amp; Psikologi<br>8. Surat Kontrak Kerja dari Penyelenggara Pemagangan<br>9. Copy Perjanjian antara Pemagang dan Penerima Pemagangan<br>10. Pas Foto 3x4 (2 Lembar)<br>11. Surat Kuasa Pendebetan/Pemindah Bukuan Rekening';
    const rowsK = [
      ['1', 'Program pemagangan ke luar negeri melalui Penyelenggara Pemagangan', ya(true, 'Ya', 'Tidak'), 29.5, ''],
      ['2', 'Usia ≥ 18 tahun', ya(usiaOk, 'Ya', 'Tidak'), 13.8, ''],
      ['3', 'Memiliki kompetensi yang diperlukan sesuai dengan kebutuhan program pemagangan dan belum pernah diikutsertakan dalam program pemagangan yang sama dari Penyelenggara Pemagangan', ya(true, 'Ya', 'Tidak'), 89, 'pk-j'],
      ['4', 'Hubungan Dengan Bank', ['Sudah Berbank<br>(Nasabah/<s>Debitur Lancar/Debitur Non Lancar</s>)', '<s>Belum Berbank</s>'], 57, ''],
      ['5', dok, ya(true, 'Ya', 'Tidak'), 271, 'pk-kecil'],
      ['6', 'Total Kewajiban per bulan ≤ ' + e(batas) + '% dari gaji / upah / uang saku per bulan', ya(rasioOk, 'Ya', 'Tidak'), 29, ''],
      ['7', 'Itikad Pemohon', ya(true, 'Baik', 'Tidak Baik'), 13.8, ''],
      ['8', 'Keterbukaan Saat wawancara', ya(true, 'Kooperatif', 'Tidak Kooperatif'), 13.8, '']
    ];
    const hdrK = tbl(KS.w, KS.l, KS.k, `<tr class="h" style="height:13.8pt"><td class="ol" style="border-top-width:1.4pt">No</td><td style="border-top-width:1.4pt">Perihal</td><td colspan="2" style="border-top-width:1.4pt">Penilaian*</td><td class="or" style="border-top-width:1.4pt">Ket</td></tr>`);
    rowsK.forEach((r, i) => {
      const x = barisTbl(KS, [[r[0], 'pk-c pk-mid'], [r[1], r[4] + (i === 3 ? '' : '')], [r[2][0], 'pk-c pk-mid'], [r[2][1], 'pk-c pk-mid'], ['', '']], r[3], i === rowsK.length - 1);
      if (i === 0) B.push({ h: `<div style="padding-top:13.4pt"><div class="pk-n"><span>1</span><span>Kesimpulan Penilaian Debitur / Calon Debitur</span></div></div>${hdrK}${x.h}` });
      else B.push(x);
    });
    B.push({ h: `<div style="padding-top:11.7pt;line-height:13.8pt"><div style="padding-left:28.6pt">*) Coret yang tidak perlu</div><div style="padding-left:23.8pt">Note :</div><div style="padding-left:23.8pt;line-height:13.5pt">Disamping penilaian tersebut di<br>atas dapat ditambahkan</div></div>` });
    const layak = usiaOk && rasioOk;
    const kotak = (x) => `<span class="pk-box" style="position:absolute;left:41.6pt;top:1.2pt;width:21pt;height:25pt;line-height:23pt">${x ? 'x' : ''}</span>`;
    const ds = (t) => `<div style="position:relative;padding-left:94.1pt"><span style="position:absolute;left:76pt">-</span>${t}</div>`;
    B.push({ h: `<div style="padding-top:13.35pt"><div style="padding-left:44.5pt">Hasil Analisa Kredit &amp; Usul</div><div style="padding-left:44.5pt">Berdasarkan data tersebut di atas, dengan ini kami sampaikan :</div>
      <div style="position:relative">${kotak(layak)}${ds(e(isi(teksDari(k, 'layak1'), V)))}${ds(e(isi(teksDari(k, 'layak2'), V)).replace(/  /g, ' &nbsp;'))}<div style="padding-left:94.1pt"><span style="display:inline-block;width:128.1pt">sebesar Maksimum</span><b style="display:inline-block;width:79.4pt">${e('Rp' + titik(h.P))}</b>dengan Usulan Struktur Fasilitas terlampir.</div></div>
      <div style="position:relative;margin-top:13.5pt">${kotak(!layak)}${ds(e(isi(teksDari(k, 'tlayak1'), V)))}${ds(e(isi(teksDari(k, 'tlayak2'), V)).replace(/  /g, ' &nbsp;'))}</div></div>` });
    B.push({ h: `<div style="padding-top:28.35pt"><div style="padding-left:44.5pt;font-weight:700">Pengusul Kredit</div><div style="padding-top:12.9pt">${tbl(390.2, 92, [160.4, 229.8],
      `<tr class="hn" style="height:13.8pt"><td class="ol" style="border-top-width:1.4pt">Mengetahui</td><td class="or" style="border-top-width:1.4pt">Dipersiapkan Oleh</td></tr>
       <tr style="height:82.25pt"><td class="ol pk-c" style="vertical-align:bottom;border-bottom-width:1.4pt;font-weight:700"><u>${e(bb.nama)}</u><br>${e(bb.jabatan)}</td><td class="or pk-c" style="vertical-align:bottom;border-bottom-width:1.4pt;font-weight:700"><u>${e(pr.nama)}</u><br>${e(pr.jabatan)}</td></tr>`)}</div>
      <div style="padding-left:94.1pt;padding-top:13.6pt">*) Disetujui oleh seluruh Pengusul Kredit lainnya (jika ada)</div></div>` });
    const cb = (t) => `<div style="position:relative;padding-left:64pt"><span class="pk-box" style="position:absolute;left:47.5pt;top:.6pt;width:13.4pt;height:13.4pt"></span>${t}</div>`;
    B.push({ h: `<div style="padding-top:15pt"><div style="padding-left:23.8pt;font-weight:700">Keputusan Komite Kredit</div><div style="padding-top:13.8pt">${cb('SETUJU')}${cb('SETUJU DENGAN PERUBAHAN *)')}${cb('TIDAK SETUJU')}</div>
      <div style="padding-left:44.5pt;padding-top:13.8pt">*) Dengan Perubahan sbb :</div><div style="padding-left:44.5pt"><span class="pk-dot">…${'.'.repeat(240)}</span><span class="pk-dot">…${'.'.repeat(240)}</span></div>
      <div style="padding-left:370.2pt;padding-top:13.8pt">${e(V.kota)}, ${e(fmt(d.tglpak, 'tgl'))}</div></div>` });
    B.push({ h: `<div style="padding-top:28pt">${tbl(439.9, 42.3, [131.5, 125.7, 182.7],
      `<tr class="pk-c" style="height:14.4pt;font-weight:700;font-size:11.4pt"><td class="ol" style="border-top-width:1.4pt;vertical-align:middle">JABATAN</td><td style="border-top-width:1.4pt;vertical-align:middle">SETUJU</td><td class="or" style="border-top-width:1.4pt;vertical-align:middle">TIDAK SETUJU</td></tr>
       <tr style="height:45pt"><td class="ol pk-c pk-mid" style="border-bottom-width:1.4pt;font-weight:700"><u>${e(bm.nama)}</u><br>${e(bm.jabatan)}</td><td style="border-bottom-width:1.4pt"></td><td class="or" style="border-bottom-width:1.4pt"></td></tr>`)}</div>` });
    return B;
  }

  function bagianStruktur(k, d, V, h) {
    const kr = k.kredit || {}, B = [];
    const st = (no, label, colon, isiV, ex) => `<div class="pk-st"${ex ? ` style="${ex}"` : ''}><span></span><span style="align-self:center">${no}</span><span style="align-self:center;white-space:${/Penandatan/.test(label) ? 'nowrap' : 'normal'}">${label}</span><span></span><span style="align-self:center">${colon}</span><span style="align-self:center">${isiV}</span></div>`;
    B.push({ h: `<div style="padding-top:.7pt;text-align:center;font-weight:700;font-size:11.4pt;line-height:14.4pt">STRUKTUR FASILITAS KREDIT</div>` });
    B.push({ h: `<div style="padding-top:13.8pt;padding-left:35.4pt;font-weight:700"><span style="display:inline-block;width:11.4pt">1</span>FASILITAS KREDIT</div>` });
    B.push({ h: `<div style="padding-top:13.8pt;padding-left:47pt"><span style="display:inline-block;width:17pt">1,1</span>KREDIT ${e(String(kr.perihal || 'KUR PMI').replace(/\s*aflopend\s*/i, '').toUpperCase())}</div>` });
    B.push({ h: `<div style="padding-top:7.5pt">${st('1.1.1.', 'Maksimum Kredit', ':', `<span style="display:inline-block;width:101.7pt">${e('Rp' + titik(h.P))}</span>(${e(terbilang(h.P))} rupiah)`)}</div>` });
    B.push({ h: `<div style="padding-top:7.2pt">${st('1.1.2.', 'Keperluan', ':', e(kr.keperluan || ''))}</div>` });
    B.push({ h: `<div style="padding-top:.3pt">${st('1.1.3.', 'Jenis / Bentuk Kredit', ':', e(kr.jenis || '') + ' dengan angsuran sbb :')}</div>` });
    const nb = dua(h.n);
    B.push({ h: `<div style="padding-top:0"><div class="pk-sub"><span></span><span>-</span><span>Pembayaran angsuran pokok dan bunga bulan ke 01 s/d ke ${e(nb)}</span></div>
      <div class="pk-sub" style="padding-top:5.2pt"><span></span><span></span><span style="display:grid;grid-template-columns:76.5pt 58.8pt 1fr"><span style="align-self:center">sebesar</span><b style="align-self:center">${e('Rp' + titik(h.pmt))}</b><span>(${e(terbilang(h.pmt))} rupiah)</span></span></div></div>` });
    B.push({ h: `<div style="padding-top:6.9pt">${st('1.1.4.', 'Jangka Waktu', ':', `<span style="display:inline-block;width:35pt;padding-left:10.7pt">${e(h.n)}</span>(${e(terbilang(h.n))} ) bulan`)}${st('1.1.5.', 'Propisi', ':', e(kr.propisi || 'Tidak dikenakan'))}${st('1.1.6.', 'Tarif Bunga', ':', e(persenBunga(h.b)) + ' efektif anuitas per tahun.')}${st('1.1.7.', 'Biaya Administrasi', ':', e(kr.admin || 'Tidak dikenakan'))}${st('1.1.8.', 'Syarat Penandatan', ':', '<span style="display:block;max-width:282pt">Menyetujui Surat Keputusan Kredit dengan membubuhkan tanda tangan oleh Debitur.</span>', 'padding-top:1.1pt')}</div>` });
    // jarak antarbutir (pt) mengikuti tinggi baris berkas asli; teks kustom memakai jarak standar
    const daftar = (kunci, no, label, jarak, jarakSub) => {
      const L = baris(isi(teksDari(k, kunci), V));
      let huruf = 0;
      const grup = [];
      L.forEach((t) => { if (/^-\s*/.test(t) && grup.length) grup[grup.length - 1].sub.push(t.replace(/^-\s*/, '')); else grup.push({ t, sub: [] }); });
      grup.forEach((g, i) => {
        const hr = String.fromCharCode(97 + (huruf++)) + '.';
        const sub = g.sub.map((s, j) => `<div class="pk-ssub" style="padding-top:${jarakSub[j] !== undefined ? jarakSub[j] : 4.6}pt"><span></span><span>-</span><span style="padding-right:4pt">${e(s)}</span></div>`).join('');
        const isiG = `<div class="pk-sub"><span${i === 0 ? ` style="display:grid;grid-template-columns:64pt 30.1pt 80.9pt 10pt 14.9pt;align-self:center"><span></span><span>${no}</span><span style="white-space:nowrap">${label}</span><span></span><span>:</span` : ''}></span><span>${hr}</span><span class="${g.t.length > 250 ? 'pk-j' : ''}" style="padding-right:${g.t.length > 250 ? 0 : 4}pt">${e(g.t)}</span></div>${sub}`;
        B.push({ h: `<div style="padding-top:${jarak[i] !== undefined ? jarak[i] : (g.t.length > 70 ? 3 : 1.5)}pt">${isiG}</div>` });
      });
    };
    daftar('pencairan', '1.1.9.', 'Syarat Pencairan', [0.3, 2.3, 1.4, 0.4, 0.3, 3.1, 5.1, 4.5], [4.1, 6.5, 6.8]);
    daftar('lainlain', '1.1.10.', 'Syarat Lain-lain', [2.2, 0.3, 1.8, 4.7, 2.2, 8, 1.8], []);
    B.push({ h: `<div style="padding-top:.4pt">${st('1.1.11.', 'Booking Office', ':', e((k.kantor || {}).booking || ''))}</div>` });
    return B;
  }

  function memo(k, d, V, jenis) {
    const ka = k.kantor || {}, t = k.ttd || {}, pr = t.prm || {}, bb = t.bbm || {}, bm = t.bm || {};
    const satu = jenis === 1;
    const kunciPoin = satu ? 'm1_poin' : 'm2_poin';
    const poin = baris(isi(teksDari(k, kunciPoin), V));
    const asli = teksDari(k, kunciPoin) === TEKS[kunciPoin], jarak = satu ? [10.6, 12.6, 7.2] : [10.1, 13.7, 9.5];
    const ttdK = (n, j, w, al) => `<div style="width:${w}pt;text-align:${al};font-weight:700;font-size:9.9pt;line-height:14.5pt"><u>${e(n)}</u><br>${e(j)}</div>`;
    return { h: `<div class="pk-mf">
      <div class="pk-ms" style="height:87.1pt"><div class="pk-a8" style="padding-left:1.5pt;padding-top:1.4pt">${e(ka.bank)}<br>${e(ka.cabang)}</div><div class="pk-mbox" style="margin-top:9pt${satu ? '' : ';text-align:center;padding-left:52pt'}">${e(ka.formulir || 'BNI - 115 C')}<br>CALL &nbsp;MEMO</div></div>
      <div class="pk-ms pk-a9" style="height:${satu ? 77.2 : 58.3}pt;padding-top:${satu ? 31.5 : 12.6}pt"><div style="display:grid;grid-template-columns:252pt 128.9pt 49.8pt 1fr"><span></span><span>Tanggal Call</span><span>:</span><span>${e(fmt(d.tglmohon, 'tgl'))}</span><span></span><span>Tanggal Call sebelumnya</span><span>:</span><span>-</span></div></div>
      <div class="pk-ms" style="height:${satu ? 72 : 72.7}pt;padding-top:12.8pt"><div style="display:grid;grid-template-columns:152.4pt 178.6pt 1fr;line-height:14.4pt">
        <span class="pk-a9 b" style="padding-left:1.8pt">${satu ? 'Bentuk Call :' : 'Bentuk Verifikasi :'}</span><span class="pk-a9 b">Pejabat yang melakukan Call</span><span class="pk-a9 b">Pejabat yang di call</span>
        <span style="padding-left:2pt">${satu ? 'Telp \'' : 'Kunjungan'}<br>${satu ? e(V.telp_kontak) : ''}</span><span class="b">${e(pr.nama)}</span><span>${satu ? `${e(V.kontak)}<br>(${e(V.jabatan_kontak)} &nbsp;${e(V.penyelenggara)})` : `${e(d.nama)}<br>Pemagang (${e(V.lpk)})`}</span></div></div>
      <div class="pk-ms" style="height:43.2pt;padding-top:14.4pt"><div style="display:grid;grid-template-columns:51.8pt ${satu ? '84pt 16.8pt' : '76.1pt 24.7pt'} 1fr"><span></span><i class="b">Tujuan &nbsp;Call</i><i class="b">:</i><span>${e(isi(teksDari(k, satu ? 'm1_tujuan' : 'm2_tujuan'), V))}</span></div></div>
      <div class="pk-ms" style="min-height:${satu ? 247 : 265.7}pt;padding-top:14.6pt;padding-right:.6pt;padding-bottom:4pt"><div style="padding-left:51.8pt"><b><u>${satu ? 'Hasil Call' : '<i>Hasil Call</i>'}</u></b></div>
        <div style="display:grid;grid-template-columns:51.8pt ${satu ? '193.6pt 85.8pt' : '173.5pt 155.8pt'} 1fr${satu ? '' : ';font-size:10pt'}"><span></span><span>Berdasarkan informasi ${satu ? 'Bpk' : 'Bpk / Ibu'}</span><span>${e(satu ? V.kontak : d.nama)}</span><span>${satu ? 'diperoleh data sbb :' : 'di peroleh data sbb:'}</span></div>
        ${poin.map((p, i) => `<div class="pk-pt" style="margin-top:${i === 0 ? 0 : (asli ? jarak[i - 1] : 10.6)}pt"><span>-</span><span class="${satu ? 'pk-j' : ''}">${e(p).replace(/  /g, ' &nbsp;')}</span></div>`).join('')}</div>
      <div class="pk-ms" style="height:21pt"><div style="display:grid;grid-template-columns:51.8pt 75.9pt 74.9pt 1fr;padding-top:.6pt"><span></span><span class="pk-a9 b">Follow Up</span><span class="pk-a9 b">:</span><span>${e(isi(teksDari(k, 'followup'), V))}</span></div></div>
      <div class="pk-ms pk-a9" style="height:116.5pt;padding-top:13.5pt"><div style="display:grid;grid-template-columns:51.8pt ${satu ? 300.1 : 329.2}pt 1fr"><span></span><span>Dipersiapkan oleh:</span><span>Mengetahui,</span></div>
        <div style="display:flex;padding-top:43.7pt;padding-left:51.8pt">${ttdK(pr.nama, pr.jabatan, 171, 'left')}${ttdK(bb.nama, bb.jabatan, 133.6, 'center')}<div style="width:45.9pt"></div>${ttdK(bm.nama, bm.jabatan, 104, 'center')}</div></div>
    </div>` };
  }

  function checklist(k, d, V) {
    const t = k.ttd || {}, pr = t.prm || {}, bb = t.bbm || {}, cop = t.cop || {};
    const akad = baris(isi(teksDari(k, 'ck_akad'), V)), cair = baris(isi(teksDari(k, 'ck_cair'), V));
    const item = (L, mulai) => L.map((x, i) => `<div style="display:grid;grid-template-columns:17.1pt 16.2pt 263.1pt 5.2pt 136.9pt 133.6pt;height:15.1pt;line-height:15.1pt"><span class="pk-r">${mulai + i}</span><span></span><span style="white-space:nowrap;overflow:hidden">${e(x)}</span><span>:</span><span class="pk-c" style="border:.75pt solid #000;border-top:${i ? 0 : '.75pt solid #000'}">V</span><span style="border:.75pt solid #000;border-left:0;border-top:${i ? 0 : '.75pt solid #000'}"></span></div>`).join('');
    const alamat = br(String(d.alamat || ''));
    return { h: `<div class="pk-cf">
      <div class="pk-cs" style="height:45.2pt;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11pt">CHECK LIST SYARAT DISPOSISI KUR PMI</div>
      <div class="pk-cs" style="height:95.6pt;display:grid;grid-template-columns:302.4pt 1fr">
        <div style="border-right:.75pt solid #000;display:grid;grid-template-columns:124pt 1fr;align-items:start;padding-top:24.4pt"><span class="pk-c" style="line-height:13.1pt">NAMA DEBITUR<br>/ CALON DEBITUR :</span><span class="pk-c" style="padding-top:6.5pt">${e(d.nama)}</span></div>
        <div style="display:grid;grid-template-columns:62pt 1fr;align-items:start;padding-top:24.4pt"><span style="padding-left:11.3pt;padding-top:6.5pt">ALAMAT :</span><span class="pk-r" style="line-height:13.1pt;padding-right:1.5pt">${alamat}</span></div></div>
      <div class="pk-cs" style="height:32.1pt;display:grid;grid-template-columns:302.4pt 1fr;align-items:center">
        <div style="border-right:.75pt solid #000;height:100%;display:grid;grid-template-columns:124pt 1fr;align-items:center"><span style="padding-left:31.6pt">T A N G G A L :</span><span class="pk-c">${e(fmt(d.tglpak, 'tgl'))}</span></div>
        <div style="display:grid;grid-template-columns:110pt 1fr;align-items:center"><span style="padding-left:6.4pt">ARM/PRM &nbsp; :</span><span class="pk-c" style="padding-right:42pt;white-space:nowrap">${e(pr.nama)}</span></div></div>
      <div class="pk-cs" style="height:561.6pt;position:relative;padding-top:45.3pt">
        <div style="display:grid;grid-template-columns:302.4pt 1fr"><div style="padding-left:33.2pt;line-height:15.1pt">DOKUMEN :<br><b>Persyaratan Akad Kredit</b></div>
          <table class="pk-ck" style="border-collapse:collapse;width:270.5pt;table-layout:fixed"><colgroup><col style="width:136.9pt"><col style="width:133.6pt"></colgroup><tr style="height:15.6pt"><td colspan="2" class="b">Checklist Pemenuhan Dokumen</td></tr><tr style="height:30pt"><td style="line-height:13.1pt">sudah Terpenuhi<br>(V)</td><td style="line-height:13.1pt">Belum Terpenuhi<br>(X)</td></tr></table></div>
        ${item(akad, 1)}
        <div style="padding-left:33.2pt;line-height:15.1pt;padding-top:15.1pt">DOKUMEN :<br><b>Persyaratan Pencairan Kredit</b></div><div style="height:15.1pt"></div>
        ${item(cair, akad.length + 1)}
        <div style="position:absolute;left:1.9pt;top:${45.3 + 30 + 15.6 + 15.1 * (akad.length + cair.length + 4) + 23}pt;font-weight:700">Note:<span style="position:absolute;left:54pt;font-weight:400">-</span></div>
        <div style="position:absolute;left:0;right:0;bottom:16pt;display:grid;grid-template-columns:221pt 175pt 1fr;text-align:center;white-space:nowrap">
          <span>ARM / PRM</span><span>${e(bb.jabatan)}</span><span style="padding-left:43.6pt">${e(cop.jabatan)}</span>
          <b style="padding-top:53pt">${e(pr.nama)}</b><b style="padding-top:53pt">${e(bb.nama)}</b><b style="padding-top:53pt;padding-left:43.6pt">${e(cop.nama)}</b></div></div>
    </div>` };
  }

  /** Semua bagian dokumen untuk 1 debitur: [{kelas, blok[]}] — tiap bagian mulai di halaman baru. */
  function bagian(k, d) {
    const { V, h, p } = vars(k, d);
    V.__nar = (p.narasumber || []).filter(Boolean).slice(0, 6);
    if (!V.__nar.length && p.kontak) V.__nar = [p.kontak];
    return [
      { kelas: 'pk-cal', blok: bagianPak(k, d, V, h) },
      { kelas: 'pk-cal', blok: bagianStruktur(k, d, V, h) },
      { kelas: 'pk-ari', blok: [memo(k, d, V, 1)] },
      { kelas: 'pk-ari', blok: [memo(k, d, V, 2)] },
      { kelas: 'pk-tah', blok: [checklist(k, d, V)] }
    ];
  }

  // ------------------------------------------------------------------------
  //  Pemecah halaman: ukur tinggi tiap blok di wadah tersembunyi, susun per A4
  // ------------------------------------------------------------------------
  let gayaTerpasang = false;
  function pasangGaya() {
    if (gayaTerpasang) return;
    const s = document.createElement('style');
    s.setAttribute('data-pak', '1');
    s.textContent = CSS;
    document.head.appendChild(s);
    gayaTerpasang = true;
  }
  const TINGGI = 841.8 - 28.75 - 24;          // tinggi isi halaman (pt)
  async function halaman(k, daftarData) {
    pasangGaya();
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (err) { /* abaikan */ }
    const ukur = document.createElement('div');
    ukur.className = 'pak';
    ukur.setAttribute('aria-hidden', 'true');
    ukur.style.cssText = 'position:absolute;left:-20000px;top:0;visibility:hidden;width:529.2pt';
    document.body.appendChild(ukur);
    const PT = 96 / 72;
    const hasil = [];
    try {
      daftarData.forEach((d) => {
        bagian(k, d).forEach((bg) => {
          ukur.className = 'pak ' + bg.kelas;
          ukur.innerHTML = bg.blok.map((b) => `<div class="pk-blk">${b.h}</div>`).join('');
          const tinggi = Array.from(ukur.children).map((el) => el.getBoundingClientRect().height / PT);
          let hal = [], terpakai = 0;
          bg.blok.forEach((b, i) => {
            const t = tinggi[i];
            if (hal.length && (b.pecah || terpakai + t > TINGGI + 0.5)) { hasil.push({ kelas: bg.kelas, isi: hal }); hal = []; terpakai = 0; }
            const awal = !hal.length;
            hal.push(awal && b.tr ? b.h.replace(/class="pk-row"/, 'class="pk-row awal"') : b.h);
            terpakai += t;
          });
          if (hal.length) hasil.push({ kelas: bg.kelas, isi: hal });
        });
      });
    } finally { ukur.remove(); }
    return hasil.map((x) => `<div class="pak-hal ${x.kelas}">${x.isi.map((h) => `<div class="pk-blk">${h}</div>`).join('')}</div>`);
  }

  /** HTML lengkap untuk dicetak (iframe). */
  function dokumen(hal, judul) {
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${e(judul || 'Perangkat Analisa KUR')}</title><style>${CSS}</style></head><body><div class="pak">${hal.join('')}</div></body></html>`;
  }
  async function cetak(k, daftarData, judul) {
    const hal = await halaman(k, daftarData);
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    const w = fr.contentWindow;
    w.document.open(); w.document.write(dokumen(hal, judul)); w.document.close();
    try { if (w.document.fonts && w.document.fonts.ready) await w.document.fonts.ready; } catch (err) { /* abaikan */ }
    await new Promise((ok) => setTimeout(ok, 150));
    w.focus(); w.print();
    setTimeout(() => fr.remove(), 60000);
    return hal.length;
  }

  // ------------------------------------------------------------------------
  //  Template import (.xlsx) & pembaca import
  // ------------------------------------------------------------------------
  const kolomAktif = (k) => (Array.isArray(k.kolom) && k.kolom.length ? k.kolom : KOLOM);
  const normH = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const xe = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const kolHuruf = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

  async function templateXlsx(k) {
    const K = kolomAktif(k);
    const st = (f) => (f.tipe === 'angka' ? 3 : f.tipe === 'tanggal' ? 4 : 2);
    const sel = (ref, v, s) => `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
    const lebar = (f) => Math.max(14, Math.min(46, f.label.length + 4, f.tipe === 'panjang' ? 46 : 99));
    const val = K.map((f, i) => (f.tipe === 'pilihan' && (f.opsi || []).length ? `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Pilihan tidak valid" error="Pilih salah satu dari daftar." sqref="${kolHuruf(i)}2:${kolHuruf(i)}2000"><formula1>"${xe(f.opsi.join(','))}"</formula1></dataValidation>` : '')).filter(Boolean);
    const lembar1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>${K.map((f, i) => `<col min="${i + 1}" max="${i + 1}" width="${lebar(f)}" style="${st(f)}" customWidth="1"/>`).join('')}</cols><sheetData><row r="1" ht="30" customHeight="1">${K.map((f, i) => sel(kolHuruf(i) + '1', f.label, f.wajib ? 1 : 5)).join('')}</row></sheetData>${val.length ? `<dataValidations count="${val.length}">${val.join('')}</dataValidations>` : ''}</worksheet>`;
    const contoh = { nama: 'NAMA DEBITUR', pt: 'PT. Nama Penyelenggara', nik: '3209xxxxxxxxxxxx', hp: '08xxxxxxxxxx', tempat: 'Nama Perusahaan Co., Ltd.', pekerjaan: 'Pekerjaan Perakitan Mobil', lama: '12', gaji: '17634801', status: 'Belum Menikah', tmplahir: 'Cirebon', tgllahir: '21/01/2001', jk: 'L', jw: '12', berangkat: '06/12/2026', slik: 'ditemukan riwayat fasilitas kredit di Bank … Outs. Rp. 0,- (lunas) dengan status lancar.', plafond: '9950000', alamat: 'Blok …, RT …/… Kec. … Kab. …', nopak: 'JBA/4/KUR PMI/001/2026', tglpak: '17/11/2026', tglmohon: '12/11/2026', lain: '0', negara: 'Jepang', gaji_yen: '155496', kurs: '113,41' };
    const ptj = [['Petunjuk import data — ' + (k.nama || 'Perangkat Analisa KUR PMI'), 6], ['1. Isi data mulai baris 2 di sheet "Data". Satu baris = satu debitur / satu berkas analisa.', 0], ['2. Jangan mengubah judul kolom di baris 1. Kolom berwarna merah muda = wajib diisi.', 0],
      ['3. Angka boleh ditulis biasa (9950000) atau bertitik (9.950.000). Tanggal: 17/11/2026 atau 2026-11-17.', 0], ['4. NIK, No HP & Nomor PAK ditulis sebagai teks agar angka 0 dan 16 digit NIK tidak berubah.', 0],
      ['5. Simpan sebagai .xlsx (atau .csv), lalu unggah lewat tombol "Import data" di halaman Analisa.', 0], ['', 0], ['Kolom  |  Wajib  |  Jenis  |  Contoh isian  |  Keterangan', 6]]
      .concat(K.map((f) => [`${f.label}  |  ${f.wajib ? 'Ya' : '-'}  |  ${({ teks: 'Teks', angka: 'Angka', tanggal: 'Tanggal', pilihan: 'Pilihan: ' + (f.opsi || []).join(' / '), panjang: 'Teks panjang' })[f.tipe] || 'Teks'}  |  ${contoh[f.k] || ''}  |  ${f.ket || ''}`, 0]));
    const lembar2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="16"/><cols><col min="1" max="1" width="150" customWidth="1"/></cols><sheetData>${ptj.map((r, i) => `<row r="${i + 1}">${r[0] ? sel('A' + (i + 1), r[0], r[1]) : ''}</row>`).join('')}</sheetData></worksheet>`;
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF9D174D"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDB2777"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7C3AED"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/><sheet name="Petunjuk" sheetId="2" r:id="rId2"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', styles], ['xl/worksheets/sheet1.xml', lembar1], ['xl/worksheets/sheet2.xml', lembar2]
    ];
    return Surat.zip(files, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  /** Baca file import → { rows:[{kunci: nilai}], cocok:[kunci], hilang:[label wajib], lebih:[judul], baris, galat:[...] } */
  async function bacaImport(file, k) {
    if (file.size > 15 * 1024 * 1024) throw new Error('File terlalu besar (maks 15 MB).');
    const K = kolomAktif(k);
    const buf = new Uint8Array(await file.arrayBuffer());
    const xlsx = buf[0] === 0x50 && buf[1] === 0x4b;
    const rows = xlsx ? await Surat.bacaXlsx(buf) : Surat.bacaCsv(new TextDecoder().decode(buf));
    const peta = {};
    K.forEach((f) => { [f.label, f.k, f.k.replace(/_/g, ' ')].concat(f.alias || []).forEach((a) => { const n = normH(a); if (n && !peta[n]) peta[n] = f.k; }); });
    let hi = -1, skor = 0;
    for (let i = 0; i < Math.min(rows.length, 15); i++) { const n = (rows[i] || []).filter((x) => peta[normH(x)]).length; if (n > skor) { skor = n; hi = i; } }
    if (hi < 0 || skor < 2) throw new Error('Baris judul kolom tidak ditemukan. Gunakan template import Perangkat Analisa KUR (judul kolom: Nama, Perusahaan, NIK, …).');
    const head = rows[hi].map((x) => peta[normH(x)] || '');
    const cocok = K.filter((f) => head.includes(f.k)).map((f) => f.k);
    const hilang = K.filter((f) => f.wajib && !head.includes(f.k)).map((f) => f.label);
    const lebih = rows[hi].filter((x, i) => String(x).trim() && !head[i]).map(String);
    const tipe = {}; K.forEach((f) => { tipe[f.k] = f; });
    const data = [], galat = [];
    rows.slice(hi + 1).forEach((r, ri) => {
      const o = {}; let ada = false;
      head.forEach((kk, i) => {
        if (!kk) return;
        let v = r[i];
        if (v === undefined || v === null) return;
        if (typeof v === 'string') v = v.trim();
        if (v === '') return;
        const f = tipe[kk];
        if (f.tipe === 'angka') { const n = angka(v); if (!isNaN(n)) v = n; else if (galat.length < 30) galat.push(`Baris ${hi + ri + 2}: "${f.label}" bukan angka (${String(v).slice(0, 20)}).`); }
        else if (f.tipe === 'tanggal') { const dd = tanggal(v); if (dd) v = dd.getFullYear() + '-' + dua(dd.getMonth() + 1) + '-' + dua(dd.getDate()); else if (galat.length < 30) galat.push(`Baris ${hi + ri + 2}: "${f.label}" bukan tanggal (${String(v).slice(0, 20)}).`); }
        else if (f.tipe === 'pilihan' && (f.opsi || []).length) { const cari = f.opsi.find((x) => normH(x) === normH(v)) || (kk === 'jk' ? ({ lakilaki: 'L', laki: 'L', pria: 'L', perempuan: 'P', wanita: 'P' })[normH(v)] : ''); if (cari) v = cari; }
        else v = String(v);
        if (typeof v === 'number' && (kk === 'nik' || kk === 'hp' || kk === 'nopak')) v = String(v);
        o[kk] = v; ada = true;
      });
      if (ada) data.push(o);
    });
    return { rows: data, cocok, hilang, lebih, baris: data.length, galat };
  }

  return { ID, KOLOM, TEKS, LABEL_TEKS, CONTOH, CSS, hitung, tabel, vars, isi, fmt, angka, tanggal, terbilang, usia, profilPt, halaman, dokumen, cetak, templateXlsx, bacaImport, kolomAktif, pasangGaya };
})();
