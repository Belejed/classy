import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  UploadCloud, 
  Users, 
  Radio, 
  Volume2, 
  Dices, 
  ShieldCheck, 
  KeyRound, 
  Hand, 
  X, 
  CalendarDays,
  Crown,
  FileSpreadsheet,
  Layers,
  MessageSquare
} from 'lucide-react';
import ModalPortal from './ModalPortal';
import { 
  CURRENT_CHANGELOG, 
  getLocalDateString, 
  shouldShowChangelogAuto, 
  markChangelogSeen 
} from '../utils/changelogHelper';

export { 
  CURRENT_CHANGELOG, 
  getLocalDateString, 
  shouldShowChangelogAuto, 
  markChangelogSeen 
};

export default function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleDismiss = () => {
    markChangelogSeen();
    onClose?.();
  };

  return (
    <ModalPortal onClose={handleDismiss} maxWidth="max-w-xl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden font-sans text-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with decorative background */}
        <div className="relative p-6 pb-5 bg-gradient-to-br from-slate-900 via-[#1E293B] to-indigo-950 text-white overflow-hidden shrink-0">
          {/* Subtle decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold text-sky-200 shadow-2xs">
                <Sparkles size={13} className="text-amber-300 animate-pulse" />
                <span>Pembaruan Sistem • {CURRENT_CHANGELOG.version}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Apa yang Baru di Classy? 🚀
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                Berikut rangkuman fitur baru, sistem peran kelas, dan peningkatan kemudahan pengelolaan anggota minggu ini.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Tutup jendela pembaruan"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Changelog Highlights List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4.5 custom-scrollbar divide-y divide-slate-100">
          
          {/* 1. Sistem Peran Baru */}
          <div className="pt-3.5 first:pt-0 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Sistem Peran Baru: Wakil Komti & Kadiv</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Utama</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Pembagian wewenang kelas kini semakin aman dan terstruktur: <span className="font-semibold text-slate-800">Komti</span> memiliki kendali penuh dan hak menghapus data, <span className="font-semibold text-slate-800">Wakil Komti</span> memiliki wewenang manajerial (jadwal, tugas, pengumuman, materi) dengan proteksi anti-hapus, dan <span className="font-semibold text-slate-800">Kepala Divisi</span> memiliki akses fokus untuk input tugas dan pengunggahan berkas materi kelas.
            </p>
          </div>

          {/* 2. Redesain Manajemen Anggota & Custom Dropdown */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Users size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Manajemen Anggota 2.0 & Custom Role Dropdown</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Baru</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Daftar anggota kini dilengkapi <span className="font-semibold text-slate-800">6 kartu metrik interaktif</span> untuk filter instan berdasarkan peran, <span className="font-semibold text-slate-800">dropdown peran kustom melayang</span> yang modern, tombol salin 1-klik email & WhatsApp mahasiswa, serta tombol <span className="font-semibold text-slate-800">Ekspor Rekap Anggota</span> yang siap ditempel langsung ke Excel/Spreadsheet atau pesan WhatsApp.
            </p>
          </div>

          {/* 3. Kirim Perubahan Password Mahasiswa */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <KeyRound size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Kirim Perubahan Password & Bantuan Mahasiswa</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Praktis</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Komti dan Wakil Komti dapat membantu mahasiswa yang lupa kata sandi langsung dari daftar anggota. Sistem akan mengirim instruksi ganti sandi resmi via email Supabase Auth, disertai template pesan konfirmasi otomatis yang siap dikirim langsung ke WhatsApp mahasiswa bersangkutan.
            </p>
          </div>

          {/* 4. Panggung Suara Kelas & Multi-Device Isolation */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <Radio size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Panggung Suara Kelas & Isolasi Multi-Device</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Peningkatan</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Pembaruan nama resmi menjadi <span className="font-semibold text-slate-800">Panggung Suara Kelas</span>. Arsitektur WebRTC diperkuat dengan isolasi sesi per perangkat sehingga mahasiswa dapat bergabung dari Laptop & HP sekaligus tanpa tabrakan sinyal suara dan tanpa umpan balik dengung (feedback loopback).
            </p>
          </div>

          {/* 5. Antarmuka Detail Tugas yang Lebih Bersih */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
                <Layers size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Penyempurnaan Antarmuka & Modal Tugas</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Menghapus tombol ganda pada header rincian tugas agar tampilan lebih rapi, fokus, dan nyaman dibaca saat mahasiswa meninjau deskripsi atau mengumpulkan tugas kuliah.
            </p>
          </div>

        </div>

        {/* Footer with confirmation button */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 text-center sm:text-left leading-tight">
            <CalendarDays size={13} className="text-indigo-600 shrink-0" />
            <span>Pemberitahuan ini otomatis muncul setiap awal pekan (Senin) saat membuka Classy.</span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer min-h-[42px]"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Mengerti & Lanjutkan</span>
          </button>
        </div>

      </div>
    </ModalPortal>
  );
}
