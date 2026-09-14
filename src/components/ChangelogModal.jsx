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
  CalendarDays
} from 'lucide-react';
import ModalPortal from './ModalPortal';

/**
 * Current release changelog information
 */
export const CURRENT_CHANGELOG = {
  version: 'v2.5.0',
  title: 'Pembaruan Pekan Ini • v2.5.0',
  releaseDate: '2026-09-14', // Format YYYY-MM-DD
};

/**
 * Formats a Date object into YYYY-MM-DD
 */
export function getLocalDateString(dateInput = new Date()) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determines whether the changelog modal should automatically pop up:
 * 1. SETIAP SENIN: Otomatis muncul pada kunjungan pertama setiap hari Senin.
 * 2. ATAU: Jika terdapat rilis versi baru yang belum pernah dilihat sama sekali.
 */
export function shouldShowChangelogAuto() {
  if (typeof window === 'undefined') return false;
  try {
    const now = new Date();
    const todayKey = getLocalDateString(now);
    const isMonday = now.getDay() === 1; // 1 = Monday (Senin)

    // 1. Setiap hari Senin: Muncul sekali di pembukaan pertama hari Senin tersebut
    if (isMonday) {
      const seenThisMonday = localStorage.getItem(`classy_monday_changelog_${todayKey}`);
      if (!seenThisMonday) {
        return true;
      }
    }

    // 2. Jika ada pembaruan versi baru yang belum pernah dilihat sama sekali
    const seenVersion = localStorage.getItem('classy_changelog_seen_version');
    if (seenVersion !== CURRENT_CHANGELOG.version) {
      const seenToday = localStorage.getItem(`classy_changelog_seen_date_${todayKey}`);
      if (!seenToday) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Record that the user has seen/dismissed the changelog
 */
export function markChangelogSeen() {
  if (typeof window === 'undefined') return;
  try {
    const now = new Date();
    const todayKey = getLocalDateString(now);

    // Tandai sudah dilihat untuk hari Senin ini
    localStorage.setItem(`classy_monday_changelog_${todayKey}`, 'true');
    localStorage.setItem(`classy_changelog_seen_date_${todayKey}`, 'true');
    localStorage.setItem('classy_changelog_seen_version', CURRENT_CHANGELOG.version);
    localStorage.setItem('classy_changelog_last_seen_at', Date.now().toString());
  } catch {}
}

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
                <span>Pembaruan Pekan Ini • {CURRENT_CHANGELOG.version}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Apa yang Baru di Classy? 🚀
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                Selamat memulai pekan kuliah baru! Berikut rangkuman fitur baru dan peningkatan sistem Classy minggu ini.
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
          
          {/* 1. Stage Channel Discord */}
          <div className="pt-3.5 first:pt-0 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Radio size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Discord-Style Stage Channel (Voice 2.0)</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Utama</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Ruang suara kini menggunakan sistem panggung: Komti & Dosen sebagai Host, pembicara di panggung, dan mahasiswa masuk sebagai penonton dalam kondisi bisu (<span className="font-semibold text-slate-700">Mute Default</span>) tanpa popup izin mic. Penonton dapat menekan tombol <span className="font-semibold text-slate-700">✋ Angkat Tangan</span> untuk meminta izin berbicara.
            </p>
          </div>

          {/* 2. Web Audio Sound Effects */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
                <Volume2 size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Sound Effects Interaktif (Web Audio API)</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Baru</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Dilengkapi efek suara sintetis instan tanpa unduhan: nada masuk & keluar call khas Discord, nada denting angkat tangan, detak roda mekanik kocok nama, dan musik selebrasi kemenangan (<span className="font-semibold text-slate-700">Ta-da! 🎉</span>).
            </p>
          </div>

          {/* 3. Class Tools Hub (Tab Forum) */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Dices size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Pusat Alat Bantu Kelas & Generator Hub</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Praktis</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Tab Forum kini menjadi generator perkuliahan: <span className="font-semibold text-slate-700">Acak Kelompok</span> (+ pilih ketua otomatis), <span className="font-semibold text-slate-700">Acak Materi Presentasi</span> (+ format WhatsApp 1-klik), <span className="font-semibold text-slate-700">Kocok Giliran Mahasiswa</span>, serta <span className="font-semibold text-slate-700">Indikator Mahasiswa Online Realtime</span>.
            </p>
          </div>

          {/* 4. Login Fleksibel (WhatsApp / Email & 123456) */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <KeyRound size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Login Fleksibel (No. WhatsApp / Email)</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Penting</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Mahasiswa kini bisa login menggunakan <span className="font-semibold text-slate-700">No. WhatsApp</span> atau alamat Email. Dilengkapi tombol cepat <span className="font-semibold text-slate-700">"Isi 123456"</span>, pembersihan otomatis spasi liar keyboard ponsel, dan tombol intip kata sandi.
            </p>
          </div>

          {/* 5. Rapikan Tugas & PIN Komti */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Tab Rapikan Tugas & Proteksi PIN</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Khusus pengelola kelas untuk merapikan teman kelompok tugas mahasiswa (1-klik add langsung mengubah status tugas teman jadi "Sudah Dikerjakan"), memindahkan pengumpulan antar tugas, dan diproteksi PIN keamanan.
            </p>
          </div>

          {/* 6. Multi-File Upload */}
          <div className="pt-3.5 space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <UploadCloud size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Multi-File Upload & Background Drive Queue</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
              Pilih banyak berkas sekaligus tanpa auto-submit. Pengguna dapat meninjau staging preview berkas sebelum mengklik tombol submit manual, lalu diunggah di latar belakang dengan aman.
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
