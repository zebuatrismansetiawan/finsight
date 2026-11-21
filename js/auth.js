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

  function sisi() {
    return `<div class="lg-brand">
      <div class="lg-logo">${App.logoSvg(46)}<div><b>FinSight</b><span>Business Banking</span></div></div>
      <h1>Monitoring portofolio kredit & penagihan dalam satu layar.</h1>
      <ul class="lg-feat">
        <li>${ic('pie', 18)} Kualitas kredit Kol. 1–5 & pergerakannya, hampir real-time</li>
        <li>${ic('alert', 18)} Deteksi dini debitur berisiko gagal bayar</li>
        <li>${ic('send', 18)} WA blast penagihan dengan template & log lengkap</li>
      </ul>
      <div class="lg-sec">${ic('shield', 18)}<span>Dilindungi kata sandi pribadi + <b>autentikasi dua faktor</b> (Microsoft Authenticator).</span></div>
    </div>`;
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
    return `<h2>Masuk</h2><p class="lg-sub">Gunakan NPP 5 digit dan kata sandi Anda.</p>${pesan()}
      <form id="fLogin" autocomplete="on" novalidate>
        <label class="fld"><span>NPP</span><div class="inp-ic">${ic('user', 17)}<input id="iNpp" name="username" inputmode="numeric" pattern="\\d{5}" maxlength="5" placeholder="5 digit angka" value="${esc(st.npp)}" autocomplete="username" required ${st.npp ? '' : 'autofocus'}></div></label>
        <label class="fld"><span>Kata sandi</span><div class="inp-ic">${ic('lock', 17)}<input id="iPw" name="password" type="password" placeholder="Kata sandi" autocomplete="current-password" required ${st.npp ? 'autofocus' : ''}><button type="button" class="eye" data-eye="iPw" aria-label="Tampilkan sandi">${ic('eye', 17)}</button></div></label>
        <button class="btn btn-primary btn-block" type="submit">${st.sibuk ? '<span class="spin"></span> Memeriksa…' : 'Masuk ' + ic('arrowright', 17)}</button>
      </form>
      <div class="lg-hint">${ic('info', 15)}<span><b>Login pertama kali?</b> Kata sandi awal = NPP Anda. Setelah itu Anda wajib mengganti sandi dan memindai QR dengan Microsoft Authenticator.</span></div>
      ${Api.DEMO ? `<div class="lg-demo"><b>Mode demo</b> — akun: <code>10001</code> Admin, <code>20001</code> RM, <code>30001</code> Manager. Sandi pertama = NPP.</div>` : ''}`;
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
        <label class="fld"><span>Ulangi kata sandi baru</span><div class="inp-ic">${ic('key', 17)}<input id="iUlang" type="password" autocomplete="new-password" placeholder="Ketik ulang" required></div></label>
        <ul class="rules" id="rules"></ul>
        <button class="btn btn-primary btn-block" type="submit" id="bGanti" disabled>${st.sibuk ? '<span class="spin"></span> Menyimpan…' : 'Simpan & lanjutkan ' + ic('arrowright', 17)}</button>
      </form>
      <button class="btn-link" data-a="ulang">${ic('left', 15)} Kembali ke halaman masuk</button>`;
  }

  function form2fa() {
    const d = st.data || {};
    let qr = '';
    try { qr = QR.svg(d.otpauth, 184); } catch (e) { qr = '<p class="neg">Gagal membuat QR. Gunakan kode manual.</p>'; }
    return `${stepper()}<h2>Daftarkan Microsoft Authenticator</h2><p class="lg-sub">Langkah terakhir login pertama: hubungkan akun ke aplikasi authenticator di HP Anda.</p>${pesan()}
      <div class="tfa">
        <div class="tfa-qr">${qr}<small>Pindai dengan HP</small></div>
        <ol class="tfa-steps">
          <li>Pasang <b>Microsoft Authenticator</b> dari Play Store / App Store.</li>
          <li>Buka aplikasi → <b>+</b> (Tambah akun) → <b>Akun lainnya (Google, Facebook, dll.)</b> → <b>Pindai kode QR</b>.</li>
          <li>Masukkan <b>6 digit</b> kode yang muncul untuk “${esc(d.issuer || 'FinSight')}” di bawah ini.</li>
        </ol>
      </div>
      <details class="tfa-man"><summary>Tidak bisa memindai? Masukkan kode secara manual</summary>
        <div class="tfa-key"><div><small>Nama akun</small><b>${esc(d.akun || st.npp)}</b></div><div><small>Kunci rahasia</small><code id="tfaKey">${esc(d.secret || '')}</code></div>
        <button type="button" class="btn btn-secondary btn-sm" data-a="salin">${ic('copy', 15)} Salin kunci</button></div>
        <small class="muted">Pilih jenis “Berbasis waktu (TOTP)”. Jangan bagikan kunci ini kepada siapa pun.</small>
      </details>
      <form id="fOtp" novalidate>
        <label class="fld"><span>Kode 6 digit dari aplikasi</span><input class="otp" id="iOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" placeholder="••••••" autofocus></label>
        ${Api.DEMO && window.DemoAPI ? `<div class="lg-demo">Demo: kode saat ini <b id="demoKode">…</b></div>` : ''}
        <button class="btn btn-primary btn-block" type="submit">${st.sibuk ? '<span class="spin"></span> Memverifikasi…' : 'Verifikasi & masuk ' + ic('check', 17)}</button>
      </form>`;
  }

  function formOtp() {
    return `<h2>Verifikasi dua langkah</h2><p class="lg-sub">Buka <b>Microsoft Authenticator</b> dan masukkan kode 6 digit untuk akun <b>FinSight</b> (NPP ${esc(st.npp)}).</p>${pesan()}
      <form id="fOtp" novalidate>
        <div class="otp-wrap">${ic('phonem', 30)}<input class="otp" id="iOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" placeholder="••••••" autofocus aria-label="Kode authenticator"></div>
        ${Api.DEMO && window.DemoAPI ? `<div class="lg-demo">Demo: kode saat ini <b id="demoKode">…</b></div>` : ''}
        <button class="btn btn-primary btn-block" type="submit">${st.sibuk ? '<span class="spin"></span> Memverifikasi…' : 'Masuk ' + ic('arrowright', 17)}</button>
      </form>
      <div class="lg-hint">${ic('info', 15)}<span>Kode berganti setiap 30 detik. HP hilang atau ganti HP? Hubungi Admin untuk <b>Reset 2FA</b>.</span></div>
      <button class="btn-link" data-a="ulang">${ic('left', 15)} Ganti akun</button>`;
  }

  function render() {
    const app = $('#app');
    const isi = { LOGIN: formLogin, GANTI_SANDI: formGanti, SETUP_2FA: form2fa, OTP: formOtp }[st.langkah]();
    app.innerHTML = `<div class="login"><div class="blob blob-a"></div><div class="blob blob-b"></div>${sisi()}<div class="lg-card-wrap"><div class="lg-card">${isi}</div><p class="lg-foot">© ${new Date().getFullYear()} FinSight • Akses terbatas untuk pegawai terdaftar</p></div></div>`;
    pasang();
  }

  let demoTimer = null;
  function pasang() {
    const app = $('#app');
    app.querySelectorAll('[data-eye]').forEach((b) => b.onclick = () => {
      const i = document.getElementById(b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password';
      b.innerHTML = ic(i.type === 'password' ? 'eye' : 'eyeoff', 17);
    });
    app.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => {
      if (b.dataset.a === 'ulang') tampil();
      if (b.dataset.a === 'salin') U.salin(($('#tfaKey') || {}).textContent.replace(/\s/g, ''));
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
        st.npp = n; localStorage.setItem('fs_npp_akhir', n);
        await kirim('auth.login', { npp: n, password: pw });
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

  async function kirim(action, data) {
    st.sibuk = true; st.pesan = ''; render();
    const r = await Api.call(action, data, { token: '', publik: true });
    st.sibuk = false;
    if (!r.success) {
      if (r.data && r.data.tiket) st.tiket = r.data.tiket;
      if (r.code === 'AUTH' || /kedaluwarsa|sudah dipakai|tidak valid\. Masuk ulang/i.test(r.message)) { tampil(r.message); return; }
      return salah(r.message);
    }
    const d = r.data;
    st.tiket = d.tiket || st.tiket; st.nama = d.nama || st.nama;
    if (d.langkah === 'GANTI_SANDI') { st.langkah = 'GANTI_SANDI'; st.pertama = d.pertama; st.alurPertama = true; st.pesan = d.pertama ? 'Login pertama berhasil. Silakan buat kata sandi baru.' : 'Admin meminta Anda mengganti kata sandi.'; st.jenis = 'ok'; }
    else if (d.langkah === 'SETUP_2FA') { st.langkah = 'SETUP_2FA'; st.data = d; st.alurPertama = true; st.pesan = r.message || ''; st.jenis = 'ok'; }
    else if (d.langkah === 'OTP') { st.langkah = 'OTP'; st.pesan = r.message || ''; st.jenis = 'ok'; }
    else if (d.langkah === 'SELESAI') {
      clearInterval(demoTimer);
      Api.simpanSesi(d.token, d.me, Api.expDariToken(d.token));
      U.toast('Selamat datang, ' + d.me.nama + '.', 'ok');
      App.mulai();
      return;
    }
    render();
  }

  return { tampil };
})();
