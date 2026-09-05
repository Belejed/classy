# 🎓 Classy — Ruang Informasi & Kolaborasi Kelas

<div align="center">

![Classy Banner](public/logo.png)

**Platform manajemen perkuliahan modern, terpadu, dan terorganisir untuk mahasiswa, komti, dan dosen.**

[![Production URL](https://img.shields.io/badge/Live_Demo-classy.exars.my.id-0F172A?style=for-the-badge&logo=vercel&logoColor=white)](https://classy.exars.my.id)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

</div>

---

## 📌 Tentang Classy

**Classy** adalah platform *all-in-one* ruang kolaborasi kelas yang dirancang untuk mempermudah koordinasi perkuliahan sehari-hari antara Komti (Ketua Kelas), Pengajar (Dosen), dan Mahasiswa. 

Dilengkapi dengan sistem keamanan **Waiting Room** untuk verifikasi calon anggota, **Integrasi Google Drive** untuk penyimpanan tugas otomatis, **Notifikasi & Broadcast WhatsApp Grup**, hingga pengalaman **Mobile Native** beranimasi halus serta dukungan penuh **Progressive Web App (PWA)**.

---

## ✨ Fitur Utama

### 1. 🛡️ Waiting Room & Sistem Persetujuan Anggota (Approval / Deny)
- **Keamanan Ruang Kelas**: Anggota baru yang memasukkan kode kelas (*Join Code*) tidak langsung masuk, melainkan ditempatkan di ruang tunggu (*Waiting Room*) dengan status `pending` untuk mencegah penyusup.
- **Sisi Mahasiswa (Pending)**: Menampilkan kartu tunggu interaktif dengan status real-time, opsi batalkan permohonan, dan tombol perbarui status.
- **Sisi Komti & Dosen**: Tab khusus **"Permintaan Masuk"** berbadge merah di menu Anggota untuk menyetujui (*Approve*) atau menolak (*Deny*) calon anggota hanya dalam satu klik.

### 2. 🚨 Force Alert Banner — Peringatan Deadline Mendesak (< 24 Jam)
- Banner peringatan dinamis di bagian atas **Dashboard Kelas** yang mendeteksi tugas yang belum dikumpulkan dengan sisa waktu kurang dari 24 jam.
- Tampilan mencolok dengan countdown presisi dan tombol aksi cepat **"Kumpulkan Sekarang"** langsung menuju pengumpulan tugas.

### 3. 💬 Integrasi WhatsApp Grup Kelas
- **Tautan Grup Resmi**: Komti/Dosen dapat memasukkan tautan undangan grup WhatsApp kelas di Pengaturan Kelas, dapat diakses langsung oleh seluruh anggota.
- **Share & Blast Pengumuman ke WhatsApp**: Tombol *"Kirim ke WA"* pada detail pengumuman yang otomatis memformat judul, isi pengumuman, pengirim, dan tautan portal kelas.
- **Share Jadwal & Update Ruangan**: Kemudahan menyebarkan info pergantian ruangan atau jadwal kelas langsung ke format chat WhatsApp.

### 4. 📁 Manajemen Tugas & Google Drive Terpadu
- Pengumpulan tugas mahasiswa langsung terintegrasi dengan Google Drive Folder kelas tanpa server perantara.
- Pengelolaan berkas, status pengumpulan, batas waktu, dan tautan drive secara terpusat.

### 5. 📅 Jadwal Kuliah & Status Ruangan Real-time
- Tampilan jadwal mingguan per hari yang rapi dengan indikator warna per mata kuliah.
- Informasi dosen pengampu, jam perkuliahan, dan status ruangan terkini.

### 6. 📱 Desain Mobile-First & Micro-Interactions Halus
- **Single Unified Navigation**: Menghilangkan navbar ganda di layar ponsel, digantikan dengan **Bottom Navigation Bar** yang ringkas (*Home, Jadwal, Tugas, Info, Menu*).
- **Interactive Bottom Sheet**: Menu sekunder (*Anggota, Berkas, Kontak Dosen, Forum, Log*) terbuka dari bawah dengan kurva pegas elastis ala iOS/Android (*Spring Cubic-Bezier* `(0.22, 1, 0.36, 1)`).
- **Tactile Tap Feedback**: Respon sentuhan membal (*spring active bounce*) pada setiap tombol dan kartu menu.
- **Transisi Antar Tab**: Efek melayang lembut (*smooth page enter transition*) saat berpindah halaman.

### 7. ⚡ Progressive Web App (PWA) & One-Click Install
- **Instalasi Satu Klik**: Menangkap event native browser untuk memunculkan dialog instalasi Classy di Android, Windows, Mac, dan Linux (Chrome, Edge, Samsung Internet).
- **Panduan Visual iOS Safari**: Petunjuk langkah demi langkah interaktif bagi pengguna iPhone / iPad untuk *"Tambahkan ke Layar Utama"* (Add to Home Screen).
- **Pengalaman Native Standalone**: Berjalan dalam mode layar penuh tanpa address bar browser, lengkap dengan caching service worker (`sw.js`) untuk performa instan.

### 8. 📝 Audit Trail & Log Transparansi Kelas
- Mencatat setiap aktivitas penting di kelas (pembuatan tugas, pengumuman baru, persetujuan/penolakan anggota, perubahan jadwal) yang dapat dipantau oleh Komti dan Dosen.

---

## 🛠️ Tech Stack

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) | Library UI modern berbasis komponen |
| **Bundler & Build Tool** | [Vite 8](https://vitejs.dev/) | Tooling frontend secepat kilat dengan Rolldown |
| **Styling & Design** | [Tailwind CSS v3](https://tailwindcss.com/) | Framework utility-first CSS & custom spring animations |
| **Routing** | [React Router v7](https://reactrouter.com/) | Manajemen rute URL dan navigasi tab |
| **Database & Auth** | [Supabase](https://supabase.com/) | Backend-as-a-Service (PostgreSQL, Auth, RLS) |
| **Cloud Storage** | [Google Drive API](https://developers.google.com/drive) | Penyimpanan berkas tugas dan materi kuliah |
| **Icons** | [Lucide React](https://lucide.dev/) | Kumpulan ikon SVG konsisten dan ringan |
| **Notifications** | [React Hot Toast](https://react-hot-toast.com/) | Komponen toast notifikasi interaktif |
| **PWA** | Web App Manifest & Service Worker | Standard Web APIs untuk offline cache & instalasi |
| **Deployment** | [Vercel](https://vercel.com/) | Edge hosting dengan CI/CD otomatis |

---

## 📁 Struktur Direktori

```text
journaling/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png          # Ikon PWA standar & maskable
│   ├── icon-512.png          # Ikon PWA resolusi tinggi
│   ├── logo.png              # Logo identitas Classy
│   ├── manifest.json         # Web App Manifest PWA standar W3C
│   └── sw.js                 # Service Worker (Cache Strategy & Offline)
├── src/
│   ├── components/
│   │   ├── Auth.jsx                  # Autentikasi (Login, Register, Reset Sandi)
│   │   ├── ClassActivityLog.jsx      # Log audit aktivitas kelas
│   │   ├── ClassAnnouncements.jsx    # Pengumuman & share ke WhatsApp
│   │   ├── ClassContacts.jsx         # Direktori kontak dosen & WhatsApp
│   │   ├── ClassDashboard.jsx        # Beranda kelas & Force Alert Banner
│   │   ├── ClassFiles.jsx            # Repositori berkas & integrasi Google Drive
│   │   ├── ClassForum.jsx            # Forum diskusi kelompok
│   │   ├── ClassLobby.jsx            # Lobby pemilihan & pembuatan kelas
│   │   ├── ClassMembers.jsx          # Manajemen anggota & tab Waiting Room
│   │   ├── ClassSchedule.jsx         # Jadwal kuliah & update ruangan
│   │   ├── ClassSidebar.jsx          # Sidebar desktop & Mobile Bottom Sheet
│   │   ├── ClassTasks.jsx            # Manajemen & pengumpulan tugas
│   │   ├── PwaInstallPrompt.jsx      # Banner & panduan instalasi PWA
│   │   └── UserProfileModal.jsx      # Pengaturan profil pengguna
│   ├── utils/
│   │   ├── db.js                     # Layanan API database Supabase
│   │   ├── driveUpload.js            # Integrasi upload Google Drive
│   │   └── whatsapp.js               # Helper pemformat pesan WhatsApp
│   ├── App.jsx                       # Routing utama & root component
│   ├── index.css                     # Tailwind utilities & spring animation keyframes
│   ├── main.jsx                      # Pendaftaran service worker & ReactDOM render
│   └── supabase.js                   # Client Supabase initialization
├── index.html                        # HTML template & PWA meta tags
├── package.json                      # Daftar dependensi & npm scripts
├── tailwind.config.js                # Konfigurasi Tailwind CSS tema Classy
└── vite.config.js                    # Konfigurasi build Vite
```

---

## 🚀 Memulai (Local Development)

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 ke atas
- NPM atau PNPM

### Langkah Instalasi

1. **Clone repositori dari GitHub**:
   ```bash
   git clone https://github.com/Belejed/classy.git
   cd classy
   ```

2. **Install semua dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**:
   Buat berkas `.env` di root direktori proyek (opsional jika menggunakan default instance):
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Jalankan server pengembangan lokal**:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses melalui browser di `http://localhost:5173`.

---

## 📦 Build & Deployment

### Build Produksi
Untuk mengompilasi aplikasi ke bundle produksi yang dioptimalkan:
```bash
npm run build
```
Hasil kompilasi akan tersimpan di dalam folder `dist/`.

### Deployment ke Vercel
Proyek ini dikonfigurasi untuk deployment instan ke Vercel:
```bash
npx vercel --prod
```
Domain Produksi Resmi: **[https://classy.exars.my.id](https://classy.exars.my.id)**

---

## 📄 Lisensi & Kontribusi

Dikembangkan dengan dedikasi untuk mendukung ekosistem perkuliahan mahasiswa yang lebih produktif, kolaboratif, dan transparan.

© 2026 **Classy Team**. All rights reserved.
