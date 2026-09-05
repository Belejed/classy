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
      {/* Mobile Top Header */}
      <header className="md:hidden w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-30 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-xl border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="font-bold text-xs text-[#0F172A] truncate">
              {currentClass?.name || 'Classy'}
            </h2>
            <p className="text-[10px] text-[#64748B] capitalize">
              {activeTab} · {getRoleLabel()}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenProfile}
          className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold"
        >
          {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity ${
              isClosingMobileMenu ? 'animate-classy-backdrop-out' : 'animate-classy-backdrop'
            }`} 
            onClick={handleCloseMobileMenu} 
          />
          <div className={`relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 ${
            isClosingMobileMenu ? 'animate-classy-drawer-out' : 'animate-in slide-in-from-left duration-200'
          }`}>
            <NavContent />
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
