import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  UploadCloud, 
  Users, 
  Clock, 
  ShieldCheck, 
  X, 
  FolderSync
} from 'lucide-react';
import ModalPortal from './ModalPortal';

/**
 * Current release changelog information
 */
export const CURRENT_CHANGELOG = {
  version: 'v1.5.0',
  title: 'Pembaruan Versi 1.5.0',
  releaseDate: '2026-09-11', // Format YYYY-MM-DD
};

/**
 * Returns ISO week string, e.g. "2026-W37"
 */
export function getIsoWeekKey(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'unknown';
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Determines whether the changelog modal should automatically pop up:
 * 1. Must have an update released in the current week (within last 7 days).
 * 2. Must not have already seen/dismissed an update in the current week (max 1x a week).
 * 3. Must not have already seen this specific version.
 */
export function shouldShowChangelogAuto() {
  if (typeof window === 'undefined') return false;
  try {
    const now = new Date();
    const currentWeekKey = getIsoWeekKey(now);
    const updateReleaseDate = new Date(CURRENT_CHANGELOG.releaseDate);
    const updateWeekKey = getIsoWeekKey(updateReleaseDate);

    // 1. Check if there is an update in the current week (calendar week or within 7 days)
    const diffDays = (now.getTime() - updateReleaseDate.getTime()) / (1000 * 60 * 60 * 24);
    const isUpdateThisWeek = (currentWeekKey === updateWeekKey) || (diffDays >= 0 && diffDays <= 7);
    if (!isUpdateThisWeek) {
      // Tidak ada update di minggu ini -> jangan muncul
      return false;
    }

    // 2. Has this specific version already been seen?
    const seenVersion = localStorage.getItem('classy_changelog_seen_version');
    if (seenVersion === CURRENT_CHANGELOG.version) {
      return false;
    }

    // 3. Has the user already dismissed an update in this week? (Only 1x per week)
    const seenWeek = localStorage.getItem('classy_changelog_seen_week');
    if (seenWeek === currentWeekKey) {
      return false;
    }

    // 4. Frequency throttle (minimum 7 days cooldown)
    const lastSeenTimestamp = parseInt(localStorage.getItem('classy_changelog_last_seen_at') || '0', 10);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (lastSeenTimestamp && (now.getTime() - lastSeenTimestamp < sevenDaysMs)) {
      return false;
    }

    return true;
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
    const currentWeekKey = getIsoWeekKey(new Date());
    localStorage.setItem('classy_changelog_seen_version', CURRENT_CHANGELOG.version);
    localStorage.setItem('classy_changelog_seen_week', currentWeekKey);
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
                <span>Pembaruan Minggu Ini • {CURRENT_CHANGELOG.version}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Apa yang Baru di Classy?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                Ringkasan fitur baru, stabilitas pengunggahan berkas, dan penyempurnaan sistem minggu ini.
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar divide-y divide-slate-100">
          
          {/* 1. Multi-File Upload */}
          <div className="pt-3 first:pt-0 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <UploadCloud size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Pengumpulan Berkas Fleksibel (Multi-File)</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Baru</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10">
              Sekarang pengumpulan tugas mendukung lebih dari 1 file sekaligus (PDF, PPTX, DOCX, ZIP, gambar, dll.) dalam satu kali pengumpulan dengan total kalkulasi ukuran berkas otomatis.
            </p>
          </div>

          {/* 2. Group Member Selection Float to Top */}
          <div className="pt-3 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
                <Users size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Penyortiran Cerdas Anggota Kelompok</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Peningkatan</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10">
              Nama teman yang dicentang otomatis melompat ke urutan teratas daftar anggota, dilengkapi panel chip ringkasan untuk mempermudah melihat dan membatalkan pilihan.
            </p>
          </div>

          {/* 3. Google Drive Auto Folder Integration */}
          <div className="pt-3 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <FolderSync size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Penataan Otomatis Folder Google Drive</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Perbaikan</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10">
              Semua berkas yang diunggah dipindahkan secara otomatis ke dalam subfolder kelas dan tugas yang sah (<code className="text-emerald-800 bg-emerald-50 px-1 rounded">[Kelas] ➔ Tugas: [Nama]</code>). Tidak ada lagi file yang tercecer di root Google Drive.
            </p>
          </div>

          {/* 4. Anti-Refresh Guard & Crash Recovery */}
          <div className="pt-3 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Proteksi Anti-Refresh & Deteksi Gagal Upload</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Penting</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10">
              Browser akan menahan konfirmasi jika tidak sengaja me-refresh halaman saat upload sedang berjalan. Jika terputus paksa, sistem mendeteksi kegagalan dan menampilkan informasi jelas serta panduan kirim ulang.
            </p>
          </div>

          {/* 5. Modern Custom Date & Time Picker */}
          <div className="pt-3 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Pemilih Jam & Kalender Deadline Modern</span>
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-10">
              Tampilan tanggal dan pemilih jam baru dengan preset cepat (Pagi, Siang, Sore, 23:59 WIB) dan layout tinggi sejajar yang rapi.
            </p>
          </div>

        </div>

        {/* Footer with confirmation button */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 text-center sm:text-left leading-tight">
            Pemberitahuan ini hanya muncul maksimal seminggu sekali jika terdapat update di minggu tersebut.
          </p>
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
