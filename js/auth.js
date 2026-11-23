/* ==========================================================================
   FinSight — auth.js : alur login NPP 5 digit + ganti sandi wajib +
   pendaftaran Microsoft Authenticator (QR TOTP) + kode OTP 6 digit.
   ========================================================================== */
'use strict';

const Auth = (() => {
  const { $, esc, ic } = U;
  let st = { langkah: 'LOGIN', tiket: '', nama: '', npp: '', pesan: '', jenis: 'err', data: null, sibuk: false };

  function tampil(pesan) {
    document.body.classList.add('is-login');
    st = { langkah: 'LOGIN', tiket: '', nama: '', npp: st.npp || localStorage.getItem('fs_npp_akhir') || '', pesan: pesan || '', jenis: 'warn', data: null, sibuk: false };
    render();
  }

  /** Panel kiri berwarna (desain mengikuti contoh, disesuaikan identitas FinSight). Ilustrasi = SVG orisinal. */
  function sisi() {
    return `<section class="lg-art" aria-hidden="false">
      <div class="lg-art-in">
        <h1>Monitoring portofolio kredit &amp; penagihan <span class="lg-u">dalam satu layar.<svg viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true"><path d="M3 10 C 60 2, 150 2, 217 8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg></span></h1>
        <p>Pantau kualitas kredit Kol. 1–5, deteksi dini debitur berisiko, dan kirim pengingat WA penagihan — hampir real-time dari Google Sheets.</p>
      </div>
      <div class="lg-ill">${ilustrasi()}</div>
    </section>`;
  }

  function ilustrasi() {
    return `<svg viewBox="0 0 440 300" role="img" aria-label="Ilustrasi dashboard portofolio kredit">
      <defs>
        <linearGradient id="lgBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F43F7A"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient>
        <linearGradient id="lgPh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#312E81"/><stop offset="1" stop-color="#4C1D95"/></linearGradient>
      </defs>
      <circle cx="398" cy="58" r="30" fill="#fff" opacity=".08"/><circle cx="22" cy="200" r="16" fill="#fff" opacity=".07"/>
      <g opacity=".9" fill="#fff"><path d="M402 118l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M28 70l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><circle cx="250" cy="22" r="2.5"/><circle cx="18" cy="160" r="2"/></g>
      <rect x="44" y="52" width="268" height="176" rx="20" fill="#4A0D2E" opacity=".18"/>
      <rect x="36" y="40" width="268" height="176" rx="20" fill="#fff"/>
      <circle cx="62" cy="66" r="9" fill="#FCE7F3"/><path d="M58 70v-5m4 5v-8m4 8v-3" stroke="#DB2777" stroke-width="2" stroke-linecap="round"/>
      <rect x="78" y="60" width="74" height="7" rx="3.5" fill="#E2E0EE"/><rect x="78" y="71" width="44" height="5" rx="2.5" fill="#F1F0F7"/>
      <rect x="236" y="58" width="52" height="18" rx="9" fill="#DCFCE7"/><circle cx="248" cy="67" r="3" fill="#16A34A"/><rect x="255" y="64" width="25" height="5" rx="2.5" fill="#86EFAC"/>
      <g><rect x="52" y="90" width="72" height="38" rx="10" fill="#F7F6FB"/><rect x="60" y="98" width="30" height="5" rx="2.5" fill="#CBD5E1"/><rect x="60" y="108" width="48" height="10" rx="3" fill="#0F172A" opacity=".85"/>
         <rect x="134" y="90" width="72" height="38" rx="10" fill="#F7F6FB"/><rect x="142" y="98" width="30" height="5" rx="2.5" fill="#CBD5E1"/><rect x="142" y="108" width="40" height="10" rx="3" fill="#DB2777"/>
         <rect x="216" y="90" width="72" height="38" rx="10" fill="#F7F6FB"/><rect x="224" y="98" width="30" height="5" rx="2.5" fill="#CBD5E1"/><rect x="224" y="108" width="44" height="10" rx="3" fill="#7C3AED"/></g>
      <g fill="url(#lgBar)"><rect x="62" y="172" width="16" height="30" rx="5"/><rect x="90" y="158" width="16" height="44" rx="5"/><rect x="118" y="166" width="16" height="36" rx="5"/><rect x="146" y="148" width="16" height="54" rx="5"/><rect x="174" y="156" width="16" height="46" rx="5"/><rect x="202" y="140" width="16" height="62" rx="5"/></g>
      <path d="M58 168 L86 152 L114 160 L142 140 L170 148 L198 130 L226 136" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
      <rect x="52" y="206" width="236" height="1.5" fill="#EEEDF5"/>
      <rect x="250" y="94" width="138" height="132" rx="20" fill="#4A0D2E" opacity=".16" transform="translate(6 8)"/>
      <rect x="250" y="94" width="138" height="132" rx="20" fill="#fff"/>
      <g transform="translate(319 150)" fill="none" stroke-width="13">
        <circle r="30" stroke="#F1F0F7"/>
        <circle r="30" stroke="#16A34A" stroke-dasharray="130 189" transform="rotate(-90)"/>
        <circle r="30" stroke="#2563EB" stroke-dasharray="24 189" stroke-dashoffset="-132" transform="rotate(-90)"/>
        <circle r="30" stroke="#F59E0B" stroke-dasharray="14 189" stroke-dashoffset="-158" transform="rotate(-90)"/>
        <circle r="30" stroke="#E11D48" stroke-dasharray="12 189" stroke-dashoffset="-174" transform="rotate(-90)"/>
      </g>
      <rect x="296" y="196" width="46" height="6" rx="3" fill="#E2E0EE"/><rect x="304" y="207" width="30" height="5" rx="2.5" fill="#F1F0F7"/>
      <g transform="translate(300 164) rotate(8)">
        <rect x="0" y="0" width="92" height="128" rx="18" fill="url(#lgPh)"/>
        <rect x="7" y="9" width="78" height="110" rx="12" fill="#F8FAFC"/>
        <rect x="34" y="13" width="24" height="4" rx="2" fill="#CBD5E1"/>
        <rect x="14" y="26" width="58" height="26" rx="9" fill="#DCF8C6"/><rect x="20" y="33" width="42" height="4" rx="2" fill="#16A34A" opacity=".55"/><rect x="20" y="41" width="30" height="4" rx="2" fill="#16A34A" opacity=".35"/>
        <rect x="24" y="58" width="54" height="20" rx="9" fill="#fff" stroke="#E2E8F0"/><rect x="31" y="64" width="34" height="4" rx="2" fill="#CBD5E1"/>
        <rect x="14" y="84" width="58" height="22" rx="9" fill="#DCF8C6"/><path d="M58 98l3 3 6-7" stroke="#16A34A" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g transform="translate(58 246)">
        <circle r="30" fill="#fff"/><circle r="30" fill="none" stroke="#FBCFE8" stroke-width="4"/>
        <path d="M0-15 L12-10 V0 C12 9 6 14 0 17 C-6 14 -12 9 -12 0 V-10 Z" fill="#DB2777"/>
        <path d="M-5 0 L-1 4 L6-4" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g transform="translate(150 252)">
        <ellipse cx="0" cy="14" rx="26" ry="8" fill="#B45309" opacity=".35"/>
        <ellipse cx="0" cy="10" rx="24" ry="8" fill="#F59E0B"/><ellipse cx="0" cy="4" rx="24" ry="8" fill="#FBBF24"/><ellipse cx="0" cy="-2" rx="24" ry="8" fill="#F59E0B"/><ellipse cx="0" cy="-8" rx="24" ry="8" fill="#FCD34D"/>
        <text x="0" y="-5" text-anchor="middle" font-size="9" font-weight="800" fill="#92400E" font-family="Inter,Arial">Rp</text>
      </g>
    </svg>`;
  }

  /** v1.4: halaman login default hanya logo (lebih besar); nama & subjudul bisa ditampilkan lagi oleh Super Admin. */
  function logoLogin() {
    const b = App.brand();
    const lu = Math.max(48, Math.min(160, Number(b.lu) || 96));
    return `${App.logoHtml(b, b.logo ? lu : Math.round(lu * 0.75))}${b.lt ? `<div><b>${esc(b.nama)}</b><span>${esc(b.sub)}</span></div>` : ''}`;
  }
  function kelasLogo() { return 'lg-logo' + (App.brand().lt ? '' : ' solo'); }
  let brandDicek = false;
  async function cekBrand() {
    if (brandDicek) return;
    brandDicek = true;
    const r = await Api.call('app.brand', {}, { token: '', publik: true });
    if (!r || !r.success) return;
    const lama = JSON.stringify(App.brand());
    const tsLama = App.brand().ts || '';
    App.simpanBrand({ nama: r.data.nama || 'FinSight', sub: r.data.sub || 'Business Banking', logo: r.data.logo || '', ukuran: Number(r.data.ukuran) || 34, teks: r.data.teks !== false, ts: r.data.ts || '',
      lt: r.data.lt === true, lu: Number(r.data.lu) || 96 });
    if ((r.data.ts || '') !== tsLama && st.langkah === 'LOGIN') { render(); return; }      // Turnstile baru diaktifkan/dimatikan
    const el = $('#lgLogo');
    if (el && JSON.stringify(App.brand()) !== lama) { el.className = kelasLogo(); el.innerHTML = logoLogin(); }
  }

  function stepper() {
    const urut = ['LOGIN', 'GANTI_SANDI', 'SETUP_2FA', 'OTP'];
    const pertama = st.langkah === 'GANTI_SANDI' || st.langkah === 'SETUP_2FA' || st.alurPertama;
    if (!pertama) return '';
    const lbl = [['GANTI_SANDI', 'Ganti sandi'], ['SETUP_2FA', 'Daftarkan authenticator']];
    const idx = urut.indexOf(st.langkah);
    return `<ol class="lg-steps">${lbl.map((l, i) => `<li class="${urut.indexOf(l[0]) < idx ? 'done' : l[0] === st.langkah ? 'on' : ''}"><i>${urut.indexOf(l[0]) < idx ? ic('check', 13) : i + 1}</i>${l[1]}</li>`).join('')}</ol>`;
  }

  function pesan() { return st.pesan ? `<div class="alert alert-${st.jenis === 'ok' ? 'pos' : st.jenis === 'warn' ? 'warn' : 'neg'}" role="alert">${ic(st.jenis === 'ok' ? 'ok' : 'alertc', 16)}<div>${esc(st.pesan)}</div></div>` : ''; }

  function formLogin() {
    return `<div class="lg-head"><h2>Selamat Datang</h2><p class="lg-sub">Silakan masuk ke akun Anda</p></div>${pesan()}
      <form id="fLogin" autocomplete="on" novalidate>
        <label class="lg-fld"><span class="sr">NPP</span>${ic('user', 18)}<input id="iNpp" name="username" inputmode="numeric" pattern="\\d{5}" maxlength="5" placeholder="NPP (5 digit angka)" value="${esc(st.npp)}" autocomplete="username" required ${st.npp ? '' : 'autofocus'}></label>
        <label class="lg-fld"><span class="sr">Kata sandi</span>${ic('lock', 18)}<input id="iPw" name="password" type="password" placeholder="Kata sandi" autocomplete="current-password" required ${st.npp ? 'autofocus' : ''}><button type="button" class="eye" data-eye="iPw" aria-label="Tampilkan sandi">${ic('eye', 18)}</button></label>
        <div class="lg-row"><button type="button" class="btn-link sm" data-a="lupa">Lupa kata sandi?</button></div>
        ${App.brand().ts ? `<div class="lg-ts"><div id="tsBox" aria-label="Verifikasi keamanan Cloudflare"></div><small class="muted">${ic('shield', 12)} Dilindungi Cloudflare Turnstile</small></div>` : ''}
        <button class="btn btn-primary btn-block lg-btn" type="submit">${st.sibuk ? '<span class="spin"></span> Memeriksa…' : 'Masuk'}</button>
      </form>
      <div class="lg-or"><span>Keamanan berlapis</span></div>
      <div class="lg-badges"><span>${ic('lock', 17)} Sandi pribadi</span><span>${ic('shield', 17)} Authenticator</span></div>
      <p class="lg-note">Login pertama? Kata sandi awal = <b>NPP Anda</b>.</p>
      ${Api.DEMO ? `<div class="lg-demo"><b>Mode demo</b> — akun: <code>10001</code> Super Admin, <code>20001</code> RM, <code>30001</code> Manager. Sandi pertama = NPP.</div>` : ''}`;
  }

  function aturanSandi(v, npp) {
    return [
      [v.length >= 8, 'Minimal 8 karakter'],
      [/[A-Za-z]/.test(v) && /\d/.test(v), 'Kombinasi huruf dan angka'],
      [v && v.indexOf(npp) === -1, 'Tidak mengandung NPP'],
      [v && !/^(.)\1+$/.test(v), 'Tidak berupa karakter berulang']
    ];
  }
  function kekuatan(v) {
    let s = 0;
    if (v.length >= 8) s++; if (v.length >= 12) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
    return Math.min(4, s);
  }

  function formGanti() {
    return `${stepper()}<h2>Ganti kata sandi</h2><p class="lg-sub">Halo <b>${esc(st.nama)}</b>, demi keamanan Anda wajib membuat kata sandi baru${st.pertama ? ' sebelum memakai aplikasi' : ''}.</p>${pesan()}
      <form id="fGanti" novalidate>
        <input type="text" name="username" value="${esc(st.npp)}" autocomplete="username" hidden>
        <label class="fld"><span>Kata sandi baru</span><div class="inp-ic">${ic('key', 17)}<input id="iBaru" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter, huruf + angka" autofocus required><button type="button" class="eye" data-eye="iBaru" aria-label="Tampilkan sandi">${ic('eye', 17)}</button></div></label>
        <div class="meter" id="meter"><i></i><i></i><i></i><i></i></div>
        <label class="fld"><span>Ulangi kata sandi baru</span><div class="inp-ic">${ic('key', 17)}<input id="iUlang" type="password" autocomplete="new-password" placeholder="Ketik ulang" required><button type="button" class="eye" data-eye="iUlang" aria-label="Tampilkan sandi">${ic('eye', 17)}</button></div></label>
        <ul class="rules" id="rules"></ul>
        <button class="btn btn-primary btn-block" type="submit" id="bGanti" disabled>${st.sibuk ? '<span class="spin"></span> Menyimpan…' : 'Simpan & lanjutkan ' + ic('arrowright', 17)}</button>
      </form>
      <button class="btn-link" data-a="ulang">${ic('left', 15)} Kembali ke halaman masuk</button>`;
  }

  function form2fa() {
    const d = st.data || {};
    const sisa = qrSisa(), habis = sisa <= 0;
    let qr = '';
    try { qr = QR.svg(d.otpauth, 184); } catch (e) { qr = '<p class="neg">Gagal membuat QR. Klik “Buat QR baru”.</p>'; }
    return `${stepper()}<h2>Daftarkan Microsoft Authenticator</h2><p class="lg-sub">Langkah terakhir login pertama: hubungkan akun ke aplikasi authenticator di HP Anda.</p>${pesan()}
      <div class="tfa">
        <div class="tfa-qr ${habis ? 'habis' : ''}" id="tfaQr"><div class="tfa-img">${qr}${habis ? `<div class="tfa-mati">${ic('clock', 22)}<b>QR kedaluwarsa</b><button type="button" class="btn btn-primary btn-sm" data-a="qrBaru">${ic('refresh', 15)} Buat QR baru</button></div>` : ''}</div>
          <small id="qrSisa" class="${habis ? 'neg' : sisa <= 30 ? 'warn' : ''}">${habis ? 'Tidak berlaku lagi' : 'Berlaku ' + mmss(sisa)}</small></div>
        <ol class="tfa-steps">
          <li>Pasang <b>Microsoft Authenticator</b> dari Play Store / App Store.</li>
          <li>Buka aplikasi → <b>+</b> (Tambah akun) → <b>Akun lainnya (Google, Facebook, dll.)</b> → <b>Pindai kode QR</b>.</li>
          <li>Masukkan <b>6 digit</b> kode yang muncul untuk “${esc(d.issuer || 'FinSight')}” di bawah ini.</li>
        </ol>
      </div>
      <div class="tfa-once">${ic('shield', 16)}<span><b>QR hanya untuk 1 kali pemindaian di 1 perangkat.</b> Setelah kode terverifikasi, QR hangus dan tidak dapat ditampilkan lagi. Membuka QR baru (di jendela/perangkat lain) otomatis membatalkan QR ini. Ganti HP? Minta Admin melakukan <b>Reset 2FA</b>.</span></div>
      <form id="fOtp" novalidate>
        <label class="fld"><span>Kode 6 digit dari aplikasi</span><input class="otp" id="iOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" placeholder="••••••" ${habis ? 'disabled' : 'autofocus'}></label>
        ${Api.DEMO && window.DemoAPI && !habis ? `<div class="lg-demo">Demo: kode saat ini <b id="demoKode">…</b></div>` : ''}
        <button class="btn btn-primary btn-block" type="submit" ${habis ? 'disabled' : ''}>${st.sibuk ? '<span class="spin"></span> Memverifikasi…' : 'Verifikasi & masuk ' + ic('check', 17)}</button>
      </form>
      <button class="btn-link" data-a="ulang">${ic('left', 15)} Kembali ke halaman masuk</button>`;
  }
  const qrSisa = () => Math.max(0, Math.ceil(((st.qrSampai || 0) - Date.now()) / 1000));
  const mmss = (n) => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  let qrTimer = null;
  function jalankanHitungMundur() {
    clearInterval(qrTimer);
    if (st.langkah !== 'SETUP_2FA') return;
    qrTimer = setInterval(() => {
      const el = $('#qrSisa');
      if (!el || st.langkah !== 'SETUP_2FA') return clearInterval(qrTimer);
      const n = qrSisa();
      if (n <= 0) { clearInterval(qrTimer); if (!st.sibuk) render(); return; }
      el.textContent = 'Berlaku ' + mmss(n);
      el.className = n <= 30 ? 'warn' : '';
    }, 1000);
  }

  function formOtp() {
    return `<h2>Verifikasi dua langkah</h2><p class="lg-sub">Buka <b>Microsoft Authenticator</b> dan masukkan kode 6 digit untuk akun <b>FinSight</b> (NPP ${esc(st.npp)}).</p>${pesan()}
      <form id="fOtp" novalidate>
        <div class="otp-wrap">${ic('phonem', 30)}<input class="otp" id="iOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" placeholder="••••••" autofocus aria-label="Kode authenticator"></div>
        ${Api.DEMO && window.DemoAPI ? `<div class="lg-demo">Demo: kode saat ini <b id="demoKode">…</b></div>` : ''}
        <button class="btn btn-primary btn-block" type="submit">${st.sibuk ? '<span class="spin"></span> Memverifikasi…' : 'Masuk ' + ic('arrowright', 17)}</button>
      </form>
      <div class="lg-hint">${ic('info', 15)}<span>Kode berganti setiap 30 detik. HP hilang atau ganti HP? Hubungi Super Admin untuk <b>Reset 2FA</b>.</span></div>
      <button class="btn-link" data-a="ulang">${ic('left', 15)} Ganti akun</button>`;
  }

  function render() {
    const app = $('#app');
    const isi = { LOGIN: formLogin, GANTI_SANDI: formGanti, SETUP_2FA: form2fa, OTP: formOtp }[st.langkah]();
    app.innerHTML = `<div class="login"><div class="lg-shell">${sisi()}<section class="lg-panel"><div class="lg-card"><div class="${kelasLogo()}" id="lgLogo">${logoLogin()}</div>${isi}</div></section></div><p class="lg-foot">© ${new Date().getFullYear()} ${esc(App.brand().nama)} • Akses terbatas untuk pegawai terdaftar</p></div>`;
    pasang();
    jalankanHitungMundur();
    cekBrand();
  }

  let demoTimer = null;
  function pasang() {
    const app = $('#app');
    app.querySelectorAll('[data-eye]').forEach((b) => b.onclick = () => {
      const i = document.getElementById(b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password';
      b.innerHTML = ic(i.type === 'password' ? 'eye' : 'eyeoff', 17);
      b.setAttribute('aria-label', i.type === 'password' ? 'Tampilkan sandi' : 'Sembunyikan sandi');
    });
    pasangTurnstile();
    app.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => {
      if (b.dataset.a === 'ulang') tampil();
      if (b.dataset.a === 'qrBaru') kirim('auth.qrBaru', { tiket: st.tiket });
      if (b.dataset.a === 'lupa') { st.pesan = 'Hubungi Super Admin untuk mereset kata sandi Anda (menu Pengguna & Peran → Reset akses). Setelah direset, kata sandi kembali = NPP.'; st.jenis = 'warn'; render(); }
    });
    const fL = $('#fLogin');
    if (fL) {
      const npp = $('#iNpp');
      npp.addEventListener('input', () => { npp.value = npp.value.replace(/\D/g, '').slice(0, 5); });
      fL.onsubmit = async (e) => {
        e.preventDefault();
        const n = npp.value.trim(), pw = $('#iPw').value;
        if (!/^\d{5}$/.test(n)) return salah('NPP harus 5 digit angka.');
        if (!pw) return salah('Masukkan kata sandi.');
        if (App.brand().ts && !tsToken) return salah('Selesaikan verifikasi keamanan (Cloudflare) terlebih dahulu.');
        st.npp = n; localStorage.setItem('fs_npp_akhir', n);
        const ts = tsToken; tsToken = '';
        await kirim('auth.login', Object.assign({ npp: n, password: pw }, ts ? { ts } : {}));
      };
    }
    const fG = $('#fGanti');
    if (fG) {
      const b = $('#iBaru'), u = $('#iUlang');
      const cek = () => {
        const v = b.value, rs = aturanSandi(v, st.npp).concat([[v && v === u.value, 'Konfirmasi cocok']]);
        $('#rules').innerHTML = rs.map((r) => `<li class="${r[0] ? 'ok' : ''}">${ic(r[0] ? 'check' : 'x', 13)}${r[1]}</li>`).join('');
        const k = kekuatan(v);
        $('#meter').className = 'meter m' + (v ? k : 0);
        $('#bGanti').disabled = !rs.every((r) => r[0]);
      };
      b.oninput = cek; u.oninput = cek; cek();
      fG.onsubmit = async (e) => { e.preventDefault(); if ($('#bGanti').disabled) return; await kirim('auth.gantiSandi', { tiket: st.tiket, baru: b.value }); };
    }
    const fO = $('#fOtp');
    if (fO) {
      const o = $('#iOtp');
      o.addEventListener('input', () => {
        o.value = o.value.replace(/\D/g, '').slice(0, 6);
        if (o.value.length === 6 && !st.sibuk) fO.requestSubmit();
      });
      fO.onsubmit = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(o.value)) return salah('Masukkan 6 digit kode dari aplikasi authenticator.');
        await kirim(st.langkah === 'SETUP_2FA' ? 'auth.verifikasi2fa' : 'auth.otp', { tiket: st.tiket, kode: o.value });
      };
      clearInterval(demoTimer);
      if (Api.DEMO && window.DemoAPI && $('#demoKode')) {
        const upd = async () => { const el = $('#demoKode'); if (!el) return clearInterval(demoTimer); el.textContent = await window.DemoAPI.kodeDemo(st.npp, st.langkah === 'SETUP_2FA'); };
        upd(); demoTimer = setInterval(upd, 3000);
      }
    }
  }

  function salah(m) { st.pesan = m; st.jenis = 'err'; render(); }

  // ---------- v1.3: Cloudflare Turnstile (bila diaktifkan Super Admin) ----------
  let tsToken = '', tsMuat = null;
  function muatTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (tsMuat) return tsMuat;
    tsMuat = new Promise((ok, gagal) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true; s.onload = () => ok(window.turnstile); s.onerror = () => { tsMuat = null; gagal(new Error('Verifikasi Cloudflare tidak dapat dimuat. Periksa koneksi.')); };
      document.head.appendChild(s);
    });
    return tsMuat;
  }
  function pasangTurnstile() {
    const box = $('#tsBox'), key = App.brand().ts;
    if (!box || !key) return;
    tsToken = '';
    muatTurnstile().then((t) => {
      if (!document.body.contains(box)) return;
      t.render(box, { sitekey: key, language: 'id', theme: 'light', size: 'flexible', action: 'login',
        callback: (tok) => { tsToken = tok; }, 'expired-callback': () => { tsToken = ''; }, 'error-callback': () => { tsToken = ''; } });
    }).catch((e) => { box.innerHTML = `<span class="neg sm">${esc(e.message)}</span>`; });
  }

  async function kirim(action, data) {
    st.sibuk = true; st.pesan = ''; render();
    const r = await Api.call(action, data, { token: '', publik: true });
    st.sibuk = false;
    if (!r.success) {
      if (r.data && r.data.tiket) st.tiket = r.data.tiket;
      if (r.code === 'QR_EXPIRED') { st.qrSampai = 0; return salah(r.message); }
      if (r.code === 'AUTH' || r.code === 'QR_USED' || r.code === 'QR_REPLACED' || /kedaluwarsa|sudah dipakai|tidak valid\. Masuk ulang/i.test(r.message)) { tampil(r.message); return; }
      return salah(r.message);
    }
    const d = r.data;
    st.tiket = d.tiket || st.tiket; st.nama = d.nama || st.nama;
    if (d.langkah === 'GANTI_SANDI') { st.langkah = 'GANTI_SANDI'; st.pertama = d.pertama; st.alurPertama = true; st.pesan = d.pertama ? 'Login pertama berhasil. Silakan buat kata sandi baru.' : 'Admin meminta Anda mengganti kata sandi.'; st.jenis = 'ok'; }
    else if (d.langkah === 'SETUP_2FA') { st.langkah = 'SETUP_2FA'; st.data = d; st.qrSampai = Date.now() + (Number(d.berlakuDetik) || 180) * 1000; st.alurPertama = true; st.pesan = r.message || ''; st.jenis = 'ok'; }
    else if (d.langkah === 'OTP') { st.langkah = 'OTP'; st.pesan = r.message || ''; st.jenis = 'ok'; }
    else if (d.langkah === 'SELESAI') {
      clearInterval(demoTimer); clearInterval(qrTimer);
      st.data = null;                       // QR dibuang dari memori setelah aktif
      Api.simpanSesi(d.token, d.me, Api.expDariToken(d.token));
      S.akses = Array.isArray(d.akses) ? d.akses : null;
      App.aktif();
      U.toast('Selamat datang, ' + d.me.nama + '.', 'ok');
      App.mulai();
      return;
    }
    render();
  }

  return { tampil };
})();
