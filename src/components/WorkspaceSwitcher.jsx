import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronDown, 
  Plus, 
  Users, 
  Copy, 
  Check, 
  Layers,
  X,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkspaceSwitcher({
  workspaces = [],
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onJoinWorkspace,
  currentUser,
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form states
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsIcon, setNewWsIcon] = useState('🎓');
  const [newWsColor, setNewWsColor] = useState('emerald');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const handleCopyInviteCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Kode undangan disalin ke clipboard!');
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
        icon: newWsIcon,
        color: newWsColor
      });
      setNewWsName('');
      setNewWsDesc('');
      setShowCreateModal(false);
      setIsOpen(false);
      toast.success('Workspace baru berhasil dibuat! 🚀');
    } catch (err) {
      toast.error(err.message || 'Gagal membuat workspace');
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) {
      toast.error('Masukkan kode undangan.');
      return;
    }
    try {
      await onJoinWorkspace(joinInviteCode.trim());
      setJoinInviteCode('');
      setShowJoinModal(false);
      setIsOpen(false);
      toast.success('Berhasil bergabung ke Workspace! 🤝');
    } catch (err) {
      toast.error(err.message || 'Kode undangan tidak valid.');
    }
  };

  const icons = ['🎓', '📚', '💻', '🧪', '💼', '🚀', '🔬', '🎨', '📝', '⚡'];

  const personalWorkspace = workspaces.find(w => w.isPersonal || w.id.startsWith('personal_') || w.inviteCode === 'PERSONAL');
  const sharedWorkspaces = workspaces.filter(w => !w.isPersonal && !w.id.startsWith('personal_') && w.inviteCode !== 'PERSONAL');
  const isPersonalActive = currentWorkspace?.id?.startsWith('personal_') || currentWorkspace?.isPersonal;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between gap-2 rounded-2xl bg-brand-app/80 border border-brand-sidebar hover:border-brand-active transition-all text-left shadow-xs group ${
            compact ? 'p-1.5 px-2.5 max-w-[180px]' : 'w-full p-2.5'
          } ${isPersonalActive ? 'border-indigo-500/30' : ''}`}
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <span className={`${compact ? 'text-base p-1' : 'text-xl p-1.5'} flex-shrink-0 rounded-xl bg-brand-card shadow-xs border border-brand-sidebar`}>
              {currentWorkspace?.icon || (isPersonalActive ? '👤' : '🎓')}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand-active truncate font-display leading-tight">
                {currentWorkspace?.name || (isPersonalActive ? 'Ruang Belajar Pribadi' : 'Academic Workspace')}
              </p>
              {!compact && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isPersonalActive ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/20">
                      Ruang Pribadi
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-muted">
                        <Users size={10} />
                        {currentWorkspace?.members?.length || 1} Anggota
                      </span>
                      {currentWorkspace?.inviteCode && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-brand-active text-brand-app font-mono font-bold">
                          {currentWorkspace.inviteCode}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <ChevronDown 
            size={compact ? 13 : 15} 
            className={`text-brand-muted transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute left-0 top-full mt-2 z-50 min-w-[280px] max-w-[340px] bg-brand-card border border-brand-sidebar rounded-3xl shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              
              {/* 1. Ruang Pribadi Button (Prominent) */}
              {personalWorkspace && (
                <div>
                  <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-2 block mb-1">
                    Ruang Pribadi (Personal)
                  </span>
                  <button
                    onClick={() => {
                      onSelectWorkspace(personalWorkspace.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all text-xs font-semibold ${
                      currentWorkspace?.id === personalWorkspace.id
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'hover:bg-brand-app text-brand-active border border-indigo-500/20 bg-indigo-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-lg p-1.5 rounded-xl bg-brand-card shadow-xs border border-brand-sidebar text-brand-active">
                        👤
                      </span>
                      <div className="truncate">
                        <p className="truncate leading-tight font-bold">{personalWorkspace.name}</p>
                        <p className={`text-[10px] ${currentWorkspace?.id === personalWorkspace.id ? 'text-white/80' : 'text-brand-muted'}`}>
                          Agenda, To-Do & Catatan Mandiri
                        </p>
                      </div>
                    </div>
                    {currentWorkspace?.id === personalWorkspace.id && <Check size={14} className="flex-shrink-0 ml-1" />}
                  </button>
                </div>
              )}

              {/* 2. Workspace Kolaborasi Kelas */}
              <div className="pt-1 border-t border-brand-sidebar">
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                    Workspace Kelas ({sharedWorkspaces.length})
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                  {sharedWorkspaces.length === 0 ? (
                    <p className="px-3 py-2 text-center text-xs text-brand-muted">
                      Belum ada workspace kelas.
                    </p>
                  ) : (
                    sharedWorkspaces.map((ws) => {
                      const isActive = ws.id === currentWorkspace?.id;
                      return (
                        <button
                          key={ws.id}
                          onClick={() => {
                            onSelectWorkspace(ws.id);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs font-semibold ${
                            isActive 
                              ? 'bg-brand-active text-brand-app font-bold shadow-xs' 
                              : 'hover:bg-brand-app text-brand-active'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-base">{ws.icon || '🎓'}</span>
                            <div className="truncate">
                              <p className="truncate leading-tight">{ws.name}</p>
                              <p className={`text-[10px] ${isActive ? 'text-brand-app/70' : 'text-brand-muted'}`}>
                                {ws.members?.length || 1} Anggota • {ws.inviteCode}
                              </p>
                            </div>
                          </div>
                          {isActive && <Check size={14} className="flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Action Buttons */}
              <div className="border-t border-brand-sidebar pt-1.5 space-y-1">
                {!isPersonalActive && (
                  <button
                    onClick={() => {
                      setShowMembersModal(true);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-active hover:bg-brand-app rounded-xl transition-colors"
                  >
                    <Share2 size={13} className="text-brand-active" />
                    Kelola Anggota & Kode Undangan
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-active hover:bg-brand-app rounded-xl transition-colors"
                >
                  <Plus size={13} className="text-emerald-500" />
                  Buat Workspace Kelas Baru
                </button>

                <button
                  onClick={() => {
                    setShowJoinModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-active hover:bg-brand-app rounded-xl transition-colors"
                >
                  <Layers size={13} className="text-blue-500" />
                  Gabung via Kode Undangan
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: Buat Workspace Baru */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-brand-card border border-brand-sidebar rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-brand-active">
            
            <div className="px-6 py-4 border-b border-brand-sidebar flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{newWsIcon}</span>
                <div>
                  <h3 className="font-display font-bold text-sm">Buat Workspace Akademik</h3>
                  <p className="text-[11px] text-brand-muted">Semester baru, kelompok tugas, atau riset</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-brand-app text-brand-muted hover:text-brand-active"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block">
                  Nama Workspace / Semester *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Semester 6 - Teknik Informatika"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-brand-app/80 border border-brand-sidebar focus:border-brand-active rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none text-brand-active"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block">
                  Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jadwal kuliah & tugas kelompok"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full bg-brand-app/80 border border-brand-sidebar focus:border-brand-active rounded-xl px-3.5 py-2 text-xs outline-none text-brand-active"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block">
                  Pilih Ikon
                </label>
                <div className="flex flex-wrap gap-2">
                  {icons.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setNewWsIcon(ic)}
                      className={`text-lg p-2 rounded-xl border transition-all ${
                        newWsIcon === ic 
                          ? 'bg-brand-active/10 border-brand-active scale-110 shadow-xs' 
                          : 'bg-brand-app border-brand-sidebar hover:border-brand-active/40'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-brand-sidebar flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-brand-sidebar font-bold text-xs hover:bg-brand-app transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-active text-brand-app rounded-xl font-bold text-xs hover:opacity-90 transition-opacity shadow-sm"
                >
                  Buat Workspace
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Gabung Workspace via Kode */}
      {showJoinModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-brand-card border border-brand-sidebar rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-brand-active">
            <div className="flex items-center justify-between border-b border-brand-sidebar pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-blue-500" size={20} />
                <div>
                  <h3 className="font-display font-bold text-sm">Gabung Workspace</h3>
                  <p className="text-[11px] text-brand-muted">Masukkan kode undangan dari teman</p>
                </div>
              </div>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="p-1.5 rounded-full hover:bg-brand-app text-brand-muted hover:text-brand-active"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block">
                  Kode Undangan (Invite Code)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SEM5-7X9K"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-brand-app/80 border border-brand-sidebar focus:border-brand-active rounded-xl px-4 py-2.5 text-center text-sm font-mono font-bold tracking-widest outline-none text-brand-active uppercase"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-brand-sidebar font-bold text-xs hover:bg-brand-app transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:opacity-90 transition-opacity shadow-sm"
                >
                  Gabung Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Kelola & Undang Anggota Workspace */}
      {showMembersModal && currentWorkspace && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-brand-card border border-brand-sidebar rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-brand-active">
            <div className="flex items-center justify-between border-b border-brand-sidebar pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{currentWorkspace.icon}</span>
                <div>
                  <h3 className="font-display font-bold text-sm">{currentWorkspace.name}</h3>
                  <p className="text-[11px] text-brand-muted">Kolaborasi Jadwal & Tugas Bersama Anggota</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMembersModal(false)}
                className="p-1.5 rounded-full hover:bg-brand-app text-brand-muted hover:text-brand-active"
              >
                <X size={18} />
              </button>
            </div>

            {/* Invite Code Box */}
            <div className="p-4 rounded-2xl bg-brand-app/80 border border-brand-sidebar space-y-2">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block">
                Kode Undangan Workspace
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-mono font-extrabold tracking-widest text-brand-active">
                  {currentWorkspace.inviteCode || 'N/A'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyInviteCode(currentWorkspace.inviteCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-active text-brand-app font-bold text-xs hover:opacity-90 transition-opacity shadow-xs"
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                  {copiedCode ? 'Disalin!' : 'Salin Kode'}
                </button>
              </div>
              <p className="text-[10px] text-brand-muted">
                Bagikan kode ini ke teman kelasmu agar jadwal dan tugas di workspace ini tersinkronisasi bersama.
              </p>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-brand-active font-display block">
                Daftar Anggota ({currentWorkspace.members?.length || 1})
              </span>

              <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {(currentWorkspace.members || [{ email: currentUser?.email || 'Admin', role: 'owner' }]).map((m, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-brand-app/40 border border-brand-sidebar text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-active/10 text-brand-active flex items-center justify-center font-bold text-[10px]">
                        {(m.email || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-brand-active truncate max-w-[180px]">
                        {m.email}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      m.role === 'owner' 
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {m.role || 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMembersModal(false)}
              className="w-full py-2.5 rounded-xl bg-brand-active text-brand-app font-bold text-xs hover:opacity-90 transition-opacity shadow-sm"
            >
              Tutup
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
