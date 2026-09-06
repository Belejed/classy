import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Folder, 
  Megaphone, 
  MessageSquare, 
  Phone, 
  Users, 
  History, 
  Copy, 
  Check, 
  MessageCircle, 
  Sun, 
  Moon, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassTopHeader({
  currentClass,
  activeTab,
  currentUser,
  currentTheme = 'light',
  onToggleTheme,
  onOpenProfile
}) {
  const [copiedCode, setCopiedCode] = useState(false);

  // Tab metadata
  const tabMeta = {
    dashboard: { label: 'Dashboard', icon: LayoutDashboard },
    schedule: { label: 'Jadwal Kuliah', icon: Calendar },
    tasks: { label: 'Tugas & Deadline', icon: CheckSquare },
    files: { label: 'Berkas & Drive', icon: Folder },
    announcements: { label: 'Pengumuman', icon: Megaphone },
    forum: { label: 'Forum Diskusi', icon: MessageSquare },
    contacts: { label: 'Kontak Dosen', icon: Phone },
    members: { label: 'Anggota Kelas', icon: Users },
    logs: { label: 'Log Aktivitas', icon: History }
  };

  const currentMeta = tabMeta[activeTab] || { label: 'Classy', icon: LayoutDashboard };
  const TabIcon = currentMeta.icon;

  // Date formatted in Indonesian
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  const handleCopyJoinCode = (e) => {
    e.stopPropagation();
    if (!currentClass?.joinCode) return;
    navigator.clipboard.writeText(currentClass.joinCode);
    setCopiedCode(true);
    toast.success(`Kode kelas (${currentClass.joinCode}) disalin!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const role = currentClass?.userRole || 'student';
  const roleLabel = role === 'komti' || role === 'coordinator' ? '👑 Komti' : role === 'lecturer' || role === 'dosen' ? '🎓 Dosen' : '👤 Mahasiswa';

  const userInitial = currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-20 w-full bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        
        {/* Left Side: Breadcrumb Context */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline-block truncate max-w-[160px]">
              {currentClass?.name || 'Class'}
            </span>
            {currentClass?.classIdentifier && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
                {currentClass.classIdentifier}
              </span>
            )}
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
            
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white dark:bg-indigo-500/20 dark:text-indigo-400 dark:border dark:border-indigo-500/30 flex items-center justify-center shrink-0">
                <TabIcon size={14} />
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {currentMeta.label}
              </h1>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Today date pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{todayFormatted}</span>
          </div>

          {/* Quick Copy Join Code */}
          {currentClass?.joinCode && (
            <button
              onClick={handleCopyJoinCode}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
              title="Salin Kode Undangan Kelas"
            >
              {copiedCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
              <span className="font-mono font-bold tracking-wider">{currentClass.joinCode}</span>
            </button>
          )}

          {/* WhatsApp Group Shortcut */}
          {currentClass?.waGroupLink && (
            <a
              href={currentClass.waGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 transition-colors flex items-center gap-1.5 text-[11px] font-semibold shadow-2xs cursor-pointer"
              title="Buka Grup WhatsApp Kelas"
            >
              <MessageCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">Grup WA</span>
            </a>
          )}

          {/* Quick Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title={currentTheme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            >
              {currentTheme === 'dark' ? (
                <Sun size={15} className="text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon size={15} className="text-slate-700 animate-in spin-in-180 duration-300" />
              )}
            </button>
          )}

          {/* User Profile Avatar Capsule */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer group shadow-2xs"
            title="Buka Pengaturan Profil & Notifikasi"
          >
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold shrink-0">
              {userInitial}
            </div>
            <div className="hidden sm:block text-left pr-0.5 leading-tight">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block max-w-[100px]">
                {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'User'}
              </span>
              <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block -mt-0.5">
                {roleLabel}
              </span>
            </div>
          </button>

        </div>

      </div>
    </header>
  );
}
