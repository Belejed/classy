import React, { useState } from 'react';
import { 
  Home, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  BookOpen, 
  User, 
  LogOut, 
  Moon, 
  Sun,
  MessageSquare,
  ChevronDown,
  Layers,
  Share2,
  Plus,
  Users,
  Copy,
  Check,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TopNavbar({
  activeTab,
  onNavigateTab,
  user,
  onLogout,
  workspaces = [],
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onJoinWorkspace,
  onOpenWhatsAppModal,
  theme,
  setTheme
}) {
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [showJoinWsModal, setShowJoinWsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Workspace Form States
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsIcon, setNewWsIcon] = useState('🎓');
  const [joinCode, setJoinCode] = useState('');

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'schedules', label: 'Jadwal Kuliah', icon: CalendarIcon },
    { id: 'tasks', label: 'Tugas & PDF', icon: CheckSquare },
    { id: 'notes', label: 'Catatan Materi', icon: BookOpen },
    { id: 'profile', label: 'Profil & Akun', icon: User }
  ];

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Kode undangan disalin!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) {
      toast.error('Nama workspace wajib diisi!');
      return;
    }
    try {
      await onCreateWorkspace({
        name: newWsName.trim(),
        description: newWsDesc.trim(),
        icon: newWsIcon
      });
      setNewWsName('');
      setNewWsDesc('');
      setShowCreateWsModal(false);
      setWsDropdownOpen(false);
      toast.success('Workspace baru berhasil dibuat!');
    } catch (err) {
      toast.error(err.message || 'Gagal membuat workspace');
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Masukkan kode undangan.');
      return;
    }
    try {
      await onJoinWorkspace(joinCode.trim());
      setJoinCode('');
      setShowJoinWsModal(false);
      setWsDropdownOpen(false);
      toast.success('Berhasil bergabung ke Workspace!');
    } catch (err) {
      toast.error(err.message || 'Kode undangan tidak valid.');
    }
  };

  const iconsList = ['🎓', '📚', '💻', '🧪', '💼', '🚀', '🔬', '🎨', '📝', '⚡'];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-brand-card/90 backdrop-blur-md border-b border-brand-sidebar shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand & Workspace Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            <div 
              onClick={() => onNavigateTab('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <img 
                src="/logo.png" 
                alt="Classy" 
                className="w-9 h-9 object-contain font-bold transition-transform group-hover:scale-105" 
              />
              <div className="hidden sm:block">
                <h1 className="font-display font-black text-sm tracking-tight text-brand-active leading-tight">
                  Classy
                </h1>
                <p className="text-[9px] font-bold text-brand-muted tracking-widest uppercase">
                  Ruang Kelas
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-brand-sidebar" />

            {/* Workspace Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-app border border-brand-sidebar hover:border-brand-active transition-all text-xs font-bold text-brand-active shadow-xs"
              >
                <span>{currentWorkspace?.icon || '🎓'}</span>
                <span className="truncate max-w-[140px] md:max-w-[200px]">
                  {currentWorkspace?.name || 'Workspace'}
                </span>
                {currentWorkspace?.inviteCode && (
                  <span className="hidden md:inline-block text-[9px] px-1.5 py-0.2 rounded-md bg-brand-active text-brand-app font-mono font-bold">
                    {currentWorkspace.inviteCode}
                  </span>
                )}
                <ChevronDown size={14} className={`text-brand-muted transition-transform ${wsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Workspace Dropdown Panel */}
              {wsDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWsDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-brand-card border border-brand-sidebar rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 flex items-center justify-between border-b border-brand-sidebar pb-2 mb-1">
                      <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                        Workspace Mahasiswa
                      </span>
                      <span className="text-[10px] font-semibold text-brand-muted">
                        {workspaces.length} Ruang
                      </span>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar">
                      {workspaces.map((ws) => {
                        const isActive = ws.id === (currentWorkspace?.id || activeWorkspaceId);
                        return (
                          <button
                            key={ws.id}
                            onClick={() => {
                              onSelectWorkspace(ws.id);
                              setWsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all text-xs font-semibold ${
                              isActive 
                                ? 'bg-brand-active text-brand-app font-bold shadow-xs' 
                                : 'hover:bg-brand-app text-brand-active'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span>{ws.icon || '🎓'}</span>
                              <span className="truncate">{ws.name}</span>
                            </div>
                            {isActive && <Check size={14} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-brand-sidebar pt-2 mt-1 space-y-1">
                      <button
                        onClick={() => {
                          setShowMembersModal(true);
                          setWsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-active hover:bg-brand-app rounded-xl transition-colors"
                      >
                        <Share2 size={13} />
                        Kelola & Bagikan Kode Undangan
                      </button>

                      <button
                        onClick={() => {
                          setShowCreateWsModal(true);
                          setWsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-active hover:bg-brand-app rounded-xl transition-colors"
                      >
                        <Plus size={13} className="text-emerald-500" />
                        Buat Workspace Baru
                      </button>

                      <button
                        onClick={() => {
                          setShowJoinWsModal(true);
                          setWsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-active hover:bg-brand-app rounded-xl transition-colors"
                      >
                        <Layers size={13} className="text-blue-500" />
                        Gabung via Kode Undangan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center: Clean Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-brand-app border border-brand-sidebar rounded-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigateTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-active text-brand-app shadow-xs'
                      : 'text-brand-muted hover:text-brand-active hover:bg-brand-card/60'
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Actions, Theme & User */}
          <div className="flex items-center gap-2">
            {/* WhatsApp Integration Button */}
            <button
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-xs"
              title="Pengaturan WhatsApp"
            >
              <MessageSquare size={13} />
              <span className="hidden sm:inline">WhatsApp API</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-brand-app border border-brand-sidebar hover:border-brand-active text-brand-active transition-all"
              title="Ganti Tema"
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-brand-app transition-all border border-transparent hover:border-brand-sidebar"
              >
                <div className="w-8 h-8 rounded-xl bg-brand-active text-brand-app flex items-center justify-center font-bold text-xs shadow-xs uppercase">
                  {(user?.email || 'U')[0]}
                </div>
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-brand-card border border-brand-sidebar rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-brand-sidebar pb-2 mb-1">
                      <p className="text-xs font-bold text-brand-active truncate">
                        {user?.displayName || user?.email?.split('@')[0] || 'Mahasiswa'}
                      </p>
                      <p className="text-[10px] text-brand-muted truncate">
                        {user?.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onNavigateTab('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-active hover:bg-brand-app rounded-xl transition-colors"
                    >
                      <User size={14} />
                      Profil & Akun
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors border-t border-brand-sidebar pt-2"
                    >
                      <LogOut size={14} />
                      Keluar (Logout)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Mobile Subnav Strip */}
        <div className="md:hidden flex items-center justify-around border-t border-brand-sidebar px-2 py-1.5 bg-brand-app/70">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${
                  isActive
                    ? 'text-brand-active'
                    : 'text-brand-muted'
                }`}
              >
                <Icon size={16} />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Modal: Buat Workspace */}
      {showCreateWsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-gray-900 dark:text-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{newWsIcon}</span>
                <div>
                  <h3 className="font-display font-bold text-sm">Buat Workspace Akademik</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">Semester baru, kelompok tugas, atau riset</p>
                </div>
              </div>
              <button onClick={() => setShowCreateWsModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-800 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wide block">
                  Nama Workspace / Semester *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Semester 5 - Teknik Informatika"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wide block">
                  Pilih Ikon
                </label>
                <div className="flex flex-wrap gap-2">
                  {iconsList.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setNewWsIcon(ic)}
                      className={`text-lg p-2 rounded-xl border transition-all ${
                        newWsIcon === ic 
                          ? 'border-black dark:border-white scale-110 shadow-xs' 
                          : 'border-gray-200 dark:border-zinc-700 hover:border-gray-400'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateWsModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 font-bold text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs hover:opacity-90 shadow-sm"
                >
                  Buat Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gabung Workspace */}
      {showJoinWsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-blue-500" size={20} />
                <div>
                  <h3 className="font-display font-bold text-sm">Gabung Workspace</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">Masukkan kode undangan dari teman</p>
                </div>
              </div>
              <button onClick={() => setShowJoinWsModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-800 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wide block">
                  Kode Undangan
                </label>
                <input
                  type="text"
                  placeholder="SEM5-B3C9"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-center text-sm font-mono font-bold tracking-widest outline-none text-gray-900 dark:text-gray-100 uppercase"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinWsModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 font-bold text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:opacity-90 shadow-sm"
                >
                  Gabung
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kelola Anggota & Kode Undangan */}
      {showMembersModal && currentWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{currentWorkspace.icon}</span>
                <div>
                  <h3 className="font-display font-bold text-sm">{currentWorkspace.name}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">Kolaborasi Jadwal & Tugas Bersama</p>
                </div>
              </div>
              <button onClick={() => setShowMembersModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-800 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 space-y-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide block">
                Kode Undangan Workspace
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-mono font-extrabold tracking-widest text-gray-900 dark:text-gray-100">
                  {currentWorkspace.inviteCode || 'N/A'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(currentWorkspace.inviteCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 shadow-xs"
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                  {copiedCode ? 'Disalin!' : 'Salin Kode'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                Daftar Anggota ({currentWorkspace.members?.length || 1})
              </span>

              <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {(currentWorkspace.members || [{ email: user?.email || 'Admin', role: 'owner' }]).map((m, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-700 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 text-gray-900 dark:text-gray-100 flex items-center justify-center font-bold text-[10px]">
                        {(m.email || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                        {m.email}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      {m.role || 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMembersModal(false)}
              className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 shadow-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
