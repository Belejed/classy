# Changelog - Classy 🎓

Semua perubahan penting dan pembaruan fitur pada aplikasi Classy didokumentasikan di berkas ini.

Format changelog ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).

---

## [2.5.0] - 2026-09-14

### 🎙️ Discord-Style Stage Channel (Voice Lounge 2.0)
- **Transformasi Stage Channel**: Mengubah Voice Lounge biasa menjadi sistem *Stage Channel* ala Discord untuk mendukung kelas berkapasitas 30+ mahasiswa secara stabil.
- **Hierarki Peran (Role-Based Access)**:
  - **Host (Penyelenggara/Moderator)**: Diberikan secara otomatis kepada Komti, Koordinator, Dosen, atau Super Admin dengan hak kontrol panggung penuh.
  - **Speakers (Pembicara Panggung)**: Pengguna aktif di panggung yang memancarkan aliran mikrofon ke seluruh partisipan.
  - **Audience / Listeners (Penonton & Pendengar)**: Partisipan yang masuk dalam kondisi bisu (*Mute Total*) tanpa permintaan izin mikrofon di awal (*listen-only*).
- **Alur Angkat Tangan (Raise Hand Workflow)**:
  - Penonton dapat meminta izin bicara dengan menekan tombol ✋ **Minta Izin Bicara / Angkat Tangan**.
  - Host menerima *floating notification banner* dan dapat meninjau antrean permintaan bicara.
  - Opsi moderasi instan: **Izinkan** (otomatis naik ke panggung & aktifkan mic), **Tolak**, atau **Turunkan ke Penonton**.
- **Deteksi Berbicara Realtime (Green Ring Speaking Indicator)**:
  - Cincin hijau berkedip di sekeliling avatar saat suara pengguna terdeteksi melalui WebRTC AudioContext.
- **Efisiensi Bandwidth WebRTC**:
  - Mengurangi beban koneksi dari Full Mesh N×N menjadi model Stage Broadcast di mana puluhan penonton hanya menerima audio (*receive-only*), menghemat baterai HP dan kuota internet mahasiswa.

---

### 🔊 Sound Effects (Web Audio API)
- **Sintesis Audio 100% Native Browser**:
  - Diimplementasikan di `src/utils/soundEffects.js` menggunakan osilator Web Audio API tanpa file audio MP3/WAV eksternal (0ms latensi, bekerja offline, bebas kendala CORS/404).
- **Sound Effects Voice & Stage Call**:
  - **Masuk Stage Call (`playJoinCall`)**: Nada harmonik ganda naik khas Discord (`D5 -> A5`) dengan sentuhan overtone lembut saat terhubung atau saat dipromosikan ke panggung.
  - **Keluar Stage Call (`playLeaveCall`)**: Nada menurun lembut (`A5 -> D5`) saat memutuskan panggilan atau turun dari panggung.
  - **Angkat Tangan (`playRaiseHand`)**: Nada denting lonceng manis (*bell ding*) saat penonton mengangkat tangan.
- **Sound Effects Kocok Giliran & Randomizer**:
  - **Putaran Nama / Roda Keberuntungan (`playPickerTick`)**: Suara detak roda mekanik (*crisp wheel click*) dengan *pitch ramp* yang semakin tinggi mendekati putaran akhir untuk membangun antusiasme kelas.
  - **Pemenang Terpilih (`playWinnerFanfare`)**: Musik selebrasi kemenangan riang (*Ta-da! 🎉* arpeggio nada `C5 -> E5 -> G5 -> C6` dengan akor shimmer harmonik).
  - **Acak Kelompok & Materi (`playDiceRoll`)**: Efek suara ketukan dadu acak saat menekan tombol acak.

---

### 🛠️ Class Tools & Generator Hub (Forum 2.0)
- **Transformasi Tab Forum**:
  - Mengubah fungsi Forum dari obrolan teks (karena mahasiswa terbiasa koordinasi di WhatsApp) menjadi **Pusat Alat Bantu Perkuliahan (Class Tools Hub)** yang super praktis.
- **🎲 Generator Acak Kelompok (Group Randomizer)**:
  - Pembagian kelompok fleksibel berdasarkan jumlah kelompok atau jumlah mahasiswa per kelompok.
  - Filter dan checklist anggota (bisa mengecualikan mahasiswa yang tidak hadir/izin).
  - Opsi penunjukan Ketua Kelompok otomatis (`👑 Ketua`).
  - **Tombol Salin Format WhatsApp**: Satu klik untuk menyalin hasil pembagian kelompok rapi siap kirim ke grup WA kelas.
- **📚 Generator Acak Materi & Topik Presentasi**:
  - Mengocok pembagian bab materi / topik riset ke kelompok atau langsung per mahasiswa.
  - Fitur *"Muat dari Jadwal"* untuk mengisi materi otomatis dari mata kuliah kelas.
  - Ekspor salin ke format WhatsApp.
- **🎯 Kocok Giliran Mahasiswa (Lucky Student Picker)**:
  - Mengundi 1 mahasiswa secara acak untuk maju presentasi atau menjawab kuis dosen dengan animasi putaran nama dinamis (*rolling shuffle*).
  - Riwayat mahasiswa terpilih otomatis tersimpan agar tidak terpanggil dua kali (dilengkapi tombol Reset).
- **🟢 Indikator Mahasiswa Online Realtime (Who's Online)**:
  - Roster kehadiran live yang memperlihatkan siapa saja teman sekelas yang saat ini sedang membuka website secara *real-time* lengkap dengan avatar dan indikator hijau berkedip.

---

### 🔐 Autentikasi & Akun Mahasiswa (Firebase Auth Migration)
- **Login Email Standar & Aman**:
  - Input form login standar menggunakan alamat email resmi pengguna.
- **Auto-Trim Whitespace**:
  - Pembersihan otomatis spasi liar di awal/akhir email dan password akibat autofill keyboard ponsel atau salin-tempel.
- **Toggle Visibilitas Kata Sandi**:
  - Tombol lihat/sembunyikan sandi (*Show/Hide Password*) dengan ikon mata untuk mempermudah pengecekan karakter.
- **Pesan Kesalahan Ramah Berbahasa Indonesia**:
  - Mengubah kode error mentah Firebase (`auth/invalid-credential`, dll.) menjadi pesan yang informatif dan ramah pengguna dalam Bahasa Indonesia tanpa membocorkan kredensial.
- **Migrasi Penuh Reset Password**:
  - Seluruh alur lupa kata sandi dialihkan 100% menggunakan Firebase Auth (`sendPasswordResetEmail`), menghapus seluruh dependensi legacy Supabase.
- **Sinkronisasi Akun Mahasiswa & Riwayat Pengumpulan**:
  - Seluruh 36 akun mahasiswa telah disinkronkan ke Firebase Auth.
  - 62 rekaman pengumpulan tugas di seluruh mata kuliah berhasil dipetakan ke UID Firebase baru dengan verifikasi ganda (`userId` + `userEmail`), memastikan tidak ada data tugas yang hilang.

---

### ✨ Studio Merapikan Pengumpulan (Tab Rapikan Tugas)
- **Navigasi & Keamanan PIN**:
  - Tab baru khusus pengelola kelas (Komti / Dosen / Superadmin) dengan layar proteksi PIN (PIN default: `123456` atau kode kelas).
  - Keypad numerik virtual untuk pengguna smartphone serta dukungan keyboard fisik.
  - Fitur ganti PIN mandiri oleh Komti.
- **Manajemen Pengumpulan Tugas**:
  - Deteksi otomatis pengumpulan tugas kelompok yang belum memiliki anggota (*"⚠️ Perlu Dirapikan"*).
  - Tambah teman sekelompok langsung dari daftar anggota kelas (*1-click add*) atau input manual nama/NIM.
  - Mahasiswa yang dimasukkan ke kelompok otomatis status tugasnya berubah menjadi *"Sudah Dikerjakan"*.
  - Pemindahan pengumpulan antar tugas (*move submission*) dan penggantian nama berkas.

---

### 📁 Multi-File Upload & Background Drive Queue (Tab Berkas)
- **Pemilihan Berkas Ganda (Multi-File Selection)**:
  - Mendukung upload beberapa berkas sekaligus via dialog file maupun *drag-and-drop*.
  - Menghilangkan *auto-submit*: pengguna dapat meninjau staging preview berkas, menentukan Mata Kuliah, dan Folder tujuan sebelum mengklik tombol submit manual.
- **Staging Preview & Estimasi Ukuran**:
  - Menampilkan ringkasan jumlah berkas dan akumulasi ukuran (misal `3 Berkas • 12.4 MB`).
- **Background Upload Queue**:
  - Pengunggahan berkas berjalan di latar belakang ke Google Drive & database kelas dengan floating progress widget responsif.

---

### 🚀 Performa, Kestabilan, & Maintenance Mode
- **Eliminasi Tab-Switch Lag (SWR Caching)**:
  - Menghilangkan *page reload* agresif saat berpindah tab. Transisi antar tab kini berlangsung instan dengan sinkronisasi tenang di latar belakang.
- **Global Maintenance Mode**:
  - Fitur mode pemeliharaan global dengan sinkronisasi *real-time* Firestore, kontrol Superadmin, dan layar pemeliharaan bertema palet ivory resmi Classy.
- **Optimasi Kuota Google Drive**:
  - Membatasi loop pengecekan Google Drive yang berulang untuk menjaga kuota API tetap hemat dan aman.
