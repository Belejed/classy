import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Folder, 
  Megaphone, 
  MessageSquare, 
  Users,
  Copy, 
  Check, 
  Plus, 
  Home,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  BookOpen,
  Phone,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassSidebar({
  currentClass,
  classes = [],
  activeTab,
  onSelectTab,
  onSelectClass,
  onBackToLobby,
  onOpenJoinModal,
  onOpenCreateModal,
  currentUser,
  onOpenProfile,
  onLogout
}) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClosingMobileMenu, setIsClosingMobileMenu] = useState(false);
  const switcherRef = useRef(null);

  const handleCloseMobileMenu = () => {
    if (isClosingMobileMenu) return;
    setIsClosingMobileMenu(true);
    setTimeout(() => {
      setMobileMenuOpen(false);
      setIsClosingMobileMenu(false);
    }, 180);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyJoinCode = () => {
    if (!currentClass?.joinCode) return;
    navigator.clipboard.writeText(currentClass.joinCode);
    setCopiedCode(true);
    toast.success('Kode kelas disalin!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const role = currentClass?.userRole || 'student';
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'forum', label: 'Forum', icon: MessageSquare },
    { id: 'contacts', label: 'Kontak Dosen', icon: Phone },
    { id: 'members', label: 'Members (Komti)', icon: Users, isSpecial: true },
    ...(isManager ? [{ id: 'logs', label: 'Log Aktivitas', icon: History, isSpecial: true }] : [])
  ];

  const getRoleLabel = () => {
    if (role === 'komti' || role === 'coordinator') return 'Komti';
    if (role === 'lecturer' || role === 'dosen') return 'Dosen';
    return 'Mahasiswa';
  };

  const getRoleBadgeStyle = () => {
    if (role === 'komti' || role === 'coordinator') {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (role === 'lecturer' || role === 'dosen') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const NavContent = () => (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      <div className="space-y-5">
        {/* Brand & Class Lobby Return */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBackToLobby}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left group"
            title="Kembali ke Class Lobby"
          >
            <img 
              src="/logo.png" 
              alt="Classy" 
              className="w-9 h-9 object-contain shrink-0 transition-transform group-hover:scale-105" 
            />
            <div>
              <span className="font-bold text-base text-[#0F172A] tracking-tight block leading-none">
                Classy
              </span>
              <span className="text-[10px] text-[#64748B] hover:underline flex items-center gap-1 mt-0.5">
                <Home size={10} /> Lobby Kelas
              </span>
            </div>
          </button>

          {/* Close button on mobile */}
          <button 
            onClick={handleCloseMobileMenu}
            className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Class Pill / Switcher */}
        <div className="relative" ref={switcherRef}>
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Kelas Aktif
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle()}`}>
                {getRoleLabel()}
              </span>
            </div>

            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="w-full flex items-center justify-between gap-2 p-1.5 -mx-1.5 rounded-xl hover:bg-white transition-colors text-left"
            >
              <div className="min-w-0">
                <h3 className="font-bold text-xs text-[#0F172A] truncate">
                  {currentClass?.name || 'Pilih Kelas'}
                </h3>
                <p className="text-[10px] text-[#64748B] truncate">
                  {currentClass?.classIdentifier || 'TI-3A'} · {currentClass?.lecturer || 'Dosen'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-[#64748B] shrink-0 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {/* Join Code Capsule */}
            {currentClass?.joinCode && (
              <div className="pt-2 border-t border-[#EDF2F7] flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-[#64748B]">Kode: <strong className="text-[#0F172A] tracking-wider">{currentClass.joinCode}</strong></span>
                <button
                  onClick={handleCopyJoinCode}
                  className="px-2 py-0.5 rounded-lg bg-white border border-[#CBD5E1] text-[10px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 flex items-center gap-1 transition-colors"
                  title="Salin Kode Kelas"
                >
                  {copiedCode ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copiedCode ? 'Disalin' : 'Salin'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Switcher Dropdown */}
          {showSwitcher && (
            <div className="absolute left-0 top-full mt-1.5 w-full rounded-2xl bg-white border border-[#E2E8F0] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Semua Kelas Anda
                </span>
              </div>

              <div className="py-1 max-h-48 overflow-y-auto space-y-0.5">
                {classes.map((cls) => {
                  const isSelected = cls.id === currentClass?.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => {
                        onSelectClass(cls);
                        setShowSwitcher(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-colors ${
                        isSelected ? 'bg-[#F1F5F9] text-[#0F172A] font-bold' : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate">{cls.name}</p>
                        <p className="text-[10px] text-[#94A3B8] font-normal">{cls.classIdentifier}</p>
                      </div>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0F172A] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 mt-1 border-t border-[#F1F5F9] space-y-0.5">
                <button
                  onClick={() => {
                    setShowSwitcher(false);
                    onBackToLobby();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                >
                  <Home size={14} className="text-[#94A3B8]" />
                  <span>Class Lobby</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vertical Navigation Links */}
        <nav className="space-y-1">
          <div className="px-2 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Menu Utama
            </span>
          </div>

          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  handleCloseMobileMenu();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-2xs font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-[#64748B]'} />
                  <span>{tab.label}</span>
                </div>
                {tab.id === 'members' && isManager && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase font-bold tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Manage
                  </span>
                )}
                {tab.id === 'logs' && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase font-bold tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    Audit
                  </span>
                )}
                {tab.id === 'forum' && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    Maintenance
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Actions */}
      <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left border border-transparent hover:border-[#E2E8F0]"
        >
          <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold shrink-0">
            {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#0F172A] truncate">
              {currentUser?.displayName || 'User Profile'}
            </p>
            <p className="text-[10px] text-[#64748B] truncate">
              {currentUser?.email}
            </p>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={14} />
          <span>Keluar Akun</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Single Unified Navigation on Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] shadow-lg px-2 py-1 flex items-center justify-around">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'schedule', label: 'Jadwal', icon: Calendar },
          { id: 'tasks', label: 'Tugas', icon: CheckSquare },
          { id: 'announcements', label: 'Info', icon: Megaphone },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 duration-150 ease-out ${
                isActive ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-[#0F172A] text-white shadow-2xs scale-105' : 'bg-transparent'
              }`}>
                <Icon size={17} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 transition-all ${
                isActive ? 'font-bold text-[#0F172A]' : 'font-medium text-[#64748B]'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th Tab: Menu Drawer Button (Files, Anggota, Kontak, Forum, Switch Class, Profile) */}
        {(() => {
          const isOtherTabActive = ['files', 'forum', 'contacts', 'members', 'logs'].includes(activeTab) || mobileMenuOpen;
          return (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 duration-150 ease-out ${
                isOtherTabActive ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                isOtherTabActive ? 'bg-[#0F172A] text-white shadow-2xs scale-105' : 'bg-transparent'
              }`}>
                <Menu size={17} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 transition-all ${
                isOtherTabActive ? 'font-bold text-[#0F172A]' : 'font-medium text-[#64748B]'
              }`}>
                Menu
              </span>
            </button>
          );
        })()}
      </nav>

      {/* Mobile Bottom Sheet Modal (Features not in the bottom taskbar) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity ${
              isClosingMobileMenu ? 'animate-classy-backdrop-out' : 'animate-classy-backdrop'
            }`} 
            onClick={handleCloseMobileMenu} 
          />

          {/* Bottom Sheet Container */}
          <div className={`relative w-full bg-white rounded-t-[28px] shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden ${
            isClosingMobileMenu ? 'animate-bottom-sheet-out' : 'animate-bottom-sheet-in'
          }`}>
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Sheet Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Menu & Fitur Kelas</h3>
                <p className="text-[11px] text-[#64748B]">Fitur lainnya di luar taskbar utama</p>
              </div>
              <button 
                onClick={handleCloseMobileMenu}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Active Class Card */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Kelas Aktif
                    </span>
                    <h4 className="font-bold text-xs text-[#0F172A] truncate">
                      {currentClass?.name || 'Classy'}
                    </h4>
                    <p className="text-[10px] text-[#64748B]">
                      {currentClass?.classIdentifier || 'TI-3A'} · {currentClass?.lecturer || 'Dosen'}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getRoleBadgeStyle()}`}>
                    {getRoleLabel()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 gap-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    Kode: <strong className="text-[#0F172A]">{currentClass?.joinCode || '------'}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyJoinCode}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      {copiedCode ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedCode ? 'Disalin' : 'Salin'}</span>
                    </button>
                    <button
                      onClick={() => {
                        handleCloseMobileMenu();
                        onBackToLobby();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-200 text-[10px] font-semibold text-[#0F172A] flex items-center gap-1 cursor-pointer"
                    >
                      <Home size={11} />
                      <span>Lobby</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of Other Features (Not on bottom taskbar) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Fitur Lainnya
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* 1. Anggota Kelas */}
                  <button
                    onClick={() => {
                      onSelectTab('members');
                      handleCloseMobileMenu();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer animate-sheet-item-1 active:scale-[0.98] ${
                      activeTab === 'members'
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        <Users size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">Anggota Kelas</p>
                        <p className={`text-[10px] truncate ${activeTab === 'members' ? 'text-white/80' : 'text-[#64748B]'}`}>
                          Mahasiswa, Komti & Dosen
                        </p>
                      </div>
                    </div>
                    {isManager && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-1 ${
                        activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        Kelola
                      </span>
                    )}
                  </button>

                  {/* 2. File & Materi */}
                  <button
                    onClick={() => {
                      onSelectTab('files');
                      handleCloseMobileMenu();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer animate-sheet-item-2 active:scale-[0.98] ${
                      activeTab === 'files'
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        activeTab === 'files' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
                      }`}>
                        <Folder size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">File & Materi</p>
                        <p className={`text-[10px] truncate ${activeTab === 'files' ? 'text-white/80' : 'text-[#64748B]'}`}>
                          Modul & berkas kuliah
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* 3. Kontak Dosen */}
                  <button
                    onClick={() => {
                      onSelectTab('contacts');
                      handleCloseMobileMenu();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer animate-sheet-item-3 active:scale-[0.98] ${
                      activeTab === 'contacts'
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        activeTab === 'contacts' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <Phone size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">Kontak Dosen</p>
                        <p className={`text-[10px] truncate ${activeTab === 'contacts' ? 'text-white/80' : 'text-[#64748B]'}`}>
                          WhatsApp & dosen pengampu
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* 4. Forum Diskusi */}
                  <button
                    onClick={() => {
                      onSelectTab('forum');
                      handleCloseMobileMenu();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer animate-sheet-item-4 active:scale-[0.98] ${
                      activeTab === 'forum'
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        activeTab === 'forum' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <MessageSquare size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">Forum Diskusi</p>
                        <p className={`text-[10px] truncate ${activeTab === 'forum' ? 'text-white/80' : 'text-[#64748B]'}`}>
                          Grup obrolan kelas
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider shrink-0 ml-1 ${
                      activeTab === 'forum' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      Info
                    </span>
                  </button>

                  {/* 5. Log Aktivitas (Managers Only) */}
                  {isManager && (
                    <button
                      onClick={() => {
                        onSelectTab('logs');
                        handleCloseMobileMenu();
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer animate-sheet-item-5 active:scale-[0.98] ${
                        activeTab === 'logs'
                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                          : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'
                        }`}>
                          <History size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">Log Aktivitas</p>
                          <p className={`text-[10px] truncate ${activeTab === 'logs' ? 'text-white/80' : 'text-[#64748B]'}`}>
                            Audit & transparansi
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-1 ${
                        activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        Audit
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Profile and Logout Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    handleCloseMobileMenu();
                    onOpenProfile();
                  }}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1.5 -ml-1.5 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#0F172A] truncate">
                      {currentUser?.displayName || 'Profil Pengguna'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {currentUser?.email}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleCloseMobileMenu();
                    onLogout();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Fixed Left Sidebar (Does not scroll with the main content) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-[#E2E8F0] fixed top-0 left-0 bottom-0 z-30 h-screen overflow-y-auto">
        <NavContent />
      </aside>
      {/* Spacer to keep flex layout width intact on desktop */}
      <div className="hidden md:block w-64 shrink-0 pointer-events-none" aria-hidden="true" />
    </>
  );
}
