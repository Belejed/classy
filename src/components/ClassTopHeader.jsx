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
  MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassTopHeader({
  currentClass,
  activeTab,
  currentUser,
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
  const roleLabel = role === 'superadmin' ? '⚡ Superadmin' : (role === 'komti' || role === 'coordinator' ? '👑 Komti' : role === 'lecturer' || role === 'dosen' ? '🎓 Dosen' : '👤 Mahasiswa');

  const userInitial = currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        
        {/* Left Side: Breadcrumb Context */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-500 hidden sm:inline-block truncate max-w-[160px]">
              {currentClass?.name || 'Class'}
            </span>
            {currentClass?.classIdentifier && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 hidden sm:inline-block">
                {currentClass.classIdentifier}
              </span>
            )}
            <span className="text-slate-300 hidden sm:inline">/</span>
            
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <TabIcon size={14} />
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                {currentMeta.label}
              </h1>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Today date pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/60 text-[11px] font-semibold text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{todayFormatted}</span>
          </div>

          {/* Quick Copy Join Code */}
          {currentClass?.joinCode && (
            <button
              onClick={handleCopyJoinCode}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-[11px] font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
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
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition-colors flex items-center gap-1.5 text-[11px] font-semibold shadow-2xs cursor-pointer"
              title="Buka Grup WhatsApp Kelas"
            >
              <MessageCircle size={14} className="text-emerald-600" />
              <span className="hidden xl:inline">Grup WA</span>
            </a>
          )}

          {/* User Profile Avatar Capsule */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 transition-all cursor-pointer group shadow-2xs"
            title="Buka Pengaturan Profil & Notifikasi"
          >
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {userInitial}
            </div>
            <div className="hidden sm:block text-left pr-0.5 leading-tight">
              <span className="text-xs font-bold text-slate-900 truncate block max-w-[100px]">
                {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'User'}
              </span>
              <span className="text-[9px] font-semibold text-slate-500 block -mt-0.5">
                {roleLabel}
              </span>
            </div>
          </button>

        </div>

      </div>
    </header>
  );
}
