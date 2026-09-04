import React, { useState } from 'react';
import { dbService } from '../utils/db';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import { 
  Plus, 
  Users, 
  ArrowRight, 
  Copy, 
  Check, 
  X, 
  BookOpen, 
  LogOut, 
  Search,
  UserCheck
} from 'lucide-react';

export default function ClassLobby({ 
  currentUser, 
  classes = [], 
  classesLoading = false,
  onSelectClass, 
  onRefreshClasses, 
  onOpenProfile,
  onLogout 
}) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdClassInfo, setCreatedClassInfo] = useState(null);

  // Join Class Form State
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [previewClass, setPreviewClass] = useState(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Create Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassId, setNewClassId] = useState('TI-3A');
  const [newLecturer, setNewLecturer] = useState('');
  const [newPeriod, setNewPeriod] = useState('2026/2027 Ganjil');
  const [creatorRole, setCreatorRole] = useState('komti'); // 'komti' | 'lecturer'
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Determine greeting based on local time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : (hour < 17 ? 'Good afternoon' : 'Good evening');
  const firstName = currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Student';

  // Handle checking join code
  const handleCheckCode = async (code) => {
    setJoinCodeInput(code.toUpperCase());
    if (code.trim().length >= 5) {
      setIsCheckingCode(true);
      try {
        const preview = await dbService.classes.previewByCode(code.trim());
        setPreviewClass(preview);
      } catch (e) {
        setPreviewClass(null);
      } finally {
        setIsCheckingCode(false);
      }
    } else {
      setPreviewClass(null);
    }
  };

  const handleConfirmJoin = async () => {
    if (!joinCodeInput.trim()) return;
    setIsJoining(true);
    try {
      const joined = await dbService.classes.joinByCode(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName,
        joinCodeInput.trim()
      );
      toast.success(`Berhasil bergabung ke ${joined.name}!`);
      setShowJoinModal(false);
      setJoinCodeInput('');
      setPreviewClass(null);
      await onRefreshClasses();
      onSelectClass(joined);
    } catch (err) {
      toast.error(err.message || 'Gagal bergabung ke kelas');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast.error('Nama kelas wajib diisi');
      return;
    }
    setIsCreating(true);
    try {
      const created = await dbService.classes.create(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName,
        {
          name: newClassName.trim(),
          classIdentifier: newClassId.trim(),
          lecturer: newLecturer.trim(),
          academicPeriod: newPeriod.trim(),
          creatorRole
        }
      );
      toast.success('Kelas baru berhasil dibuat!');
      setCreatedClassInfo(created);
      await onRefreshClasses();
    } catch (err) {
      toast.error(err.message || 'Gagal membuat kelas');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Kode kelas disalin ke clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen w-screen bg-[#FDFBF7] text-[#1E293B] flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="w-full border-b border-[#E2E8F0] bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Classy" className="w-8 h-8 object-contain shrink-0" />
            <span className="font-bold text-lg text-[#0F172A] tracking-tight">Classy</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-medium ml-1">
              Class Lobby
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors text-xs font-semibold text-[#0F172A]"
            >
              <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-bold">
                {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
              </div>
              <span className="max-w-[120px] truncate">{currentUser?.displayName || 'Student'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        
        {/* Editorial Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm text-[#64748B]">
            Select a class workspace below or join a new one using your class join code.
          </p>
        </div>

        {/* Classes Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
                {classes.length > 0 ? 'Ruang Kelas Anda' : 'Ruang Kelas'}
              </h2>
              <p className="text-xs text-[#64748B]">
                {classes.length > 0 
                  ? 'Setiap akun mahasiswa/dosen terdaftar di 1 ruang kelas aktif.' 
                  : 'Pilih untuk bergabung dengan kode kelas atau buat ruang kelas baru.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {classes.length === 0 ? (
                <>
                  <button
                    onClick={() => {
                      setJoinCodeInput('');
                      setPreviewClass(null);
                      setShowJoinModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-white transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus size={13} />
                    <span>Join Class</span>
                  </button>
                  <button
                    onClick={() => {
                      setNewClassName('');
                      setNewLecturer('');
                      setCreatedClassInfo(null);
                      setShowCreateModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Create Class</span>
                  </button>
                </>
              ) : (
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>1 Akun = 1 Kelas Aktif</span>
                </span>
              )}
            </div>
          </div>

          {/* Loading Skeleton, Empty State, or Class Cards */}
          {classesLoading ? (
            <div className="max-w-xl">
              <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="w-20 h-6 bg-[#E2E8F0] rounded-full" />
                  <div className="w-24 h-5 bg-[#E2E8F0] rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="w-52 h-6 bg-[#E2E8F0] rounded-lg" />
                  <div className="w-32 h-4 bg-[#F1F5F9] rounded" />
                </div>
                <div className="pt-4 border-t border-[#F1F5F9] flex justify-between items-center">
                  <div className="w-28 h-4 bg-[#F1F5F9] rounded" />
                  <div className="w-32 h-9 bg-[#E2E8F0] rounded-xl" />
                </div>
              </div>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="font-bold text-base text-[#0F172A]">Kamu belum terdaftar di kelas manapun.</h3>
                <p className="text-xs text-[#64748B]">
                  Silakan bergabung menggunakan kode kelas yang dibagikan oleh Komti/Dosen, atau buat ruang kelas baru.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors shadow-xs"
                >
                  Gabung Kelas
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-white transition-colors"
                >
                  Buat Kelas Baru
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-xl">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white border border-[#E2E8F0] hover:border-[#0F172A]/30 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                        {cls.classIdentifier || 'Rombel'}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        {cls.userRole === 'komti' || cls.userRole === 'coordinator' ? '👑 Komti' : cls.userRole === 'lecturer' ? '🎓 Dosen' : '👤 Mahasiswa'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-xl text-[#0F172A] tracking-tight leading-snug">
                        {cls.name}
                      </h3>
                      <div className="mt-2 space-y-1 text-xs text-[#64748B]">
                        <p className="flex items-center gap-1.5">
                          <span>👨‍🏫</span>
                          <span className="font-medium text-[#334155]">{cls.lecturer || 'Dosen Pengampu'}</span>
                        </p>
                        {cls.academicPeriod && (
                          <p className="flex items-center gap-1.5">
                            <span>📅</span>
                            <span>{cls.academicPeriod}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                    <span className="text-xs text-[#64748B] flex items-center gap-1.5 font-medium">
                      <Users size={14} className="text-[#94A3B8]" />
                      <span>{cls.memberCount} Anggota terdaftar</span>
                    </span>

                    <button
                      onClick={() => onSelectClass(cls)}
                      className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs hover:gap-3"
                    >
                      <span>Masuk ke Kelas</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* MODAL 1: JOIN CLASS */}
      {showJoinModal && (
        <ModalPortal onClose={() => setShowJoinModal(false)} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-base text-[#0F172A]">Join a Class</h3>
              <button onClick={() => setShowJoinModal(false)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Enter your 6-character class code</label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. A7K29P"
                  value={joinCodeInput}
                  onChange={(e) => handleCheckCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-center font-mono font-bold tracking-widest text-lg uppercase text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Class Preview Card */}
              {isCheckingCode && (
                <p className="text-xs text-center text-[#64748B]">Mengecek kode kelas...</p>
              )}

              {previewClass && (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 animate-in fade-in">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Kelas Ditemukan:</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[#0F172A]">{previewClass.name}</h4>
                    <p className="text-xs text-[#475569]">{previewClass.classIdentifier} · {previewClass.academicPeriod}</p>
                    <p className="text-xs text-[#64748B]">Dosen: {previewClass.lecturer}</p>
                    <p className="text-xs text-[#64748B]">Anggota: {previewClass.memberCount} siswa terdaftar</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!previewClass || isJoining}
                onClick={handleConfirmJoin}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50 shadow-xs"
              >
                {isJoining ? 'Joining...' : 'Join Class'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: CREATE CLASS */}
      {showCreateModal && (
        <ModalPortal onClose={() => setShowCreateModal(false)} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-base text-[#0F172A]">
                {createdClassInfo ? 'Class Created' : 'Create Class'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            {createdClassInfo ? (
              <div className="space-y-5 text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-lg text-[#0F172A]">{createdClassInfo.name}</h4>
                  <p className="text-xs text-[#64748B]">{createdClassInfo.classIdentifier}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <span className="text-[11px] font-semibold text-[#64748B] block">Class Join Code</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono font-extrabold text-2xl tracking-widest text-[#0F172A]">
                      {createdClassInfo.joinCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(createdClassInfo.joinCode)}
                      className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-white"
                      title="Copy code"
                    >
                      {copiedCode ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#64748B] pt-1">
                    Share this code with your classmates so they can join.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    onSelectClass(createdClassInfo);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-xs"
                >
                  Enter Class Workspace
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Class Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Pemrograman Web"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Peran Anda di Kelas Ini</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreatorRole('komti')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        creatorRole === 'komti'
                          ? 'border-[#0F172A] bg-[#F8FAFC] ring-1 ring-[#0F172A]'
                          : 'border-[#CBD5E1] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F172A]">
                        <span>👑</span>
                        <span>Komti (Admin)</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Ketua kelas / pengurus</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatorRole('lecturer')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        creatorRole === 'lecturer'
                          ? 'border-[#0F172A] bg-[#F8FAFC] ring-1 ring-[#0F172A]'
                          : 'border-[#CBD5E1] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F172A]">
                        <span>🎓</span>
                        <span>Dosen (Lecturer)</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Dosen pengampu mata kuliah</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Class Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. TI-3A"
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Lecturer (Dosen Pengampu)</label>
                  <input
                    type="text"
                    placeholder="e.g. Pak Budi Raharjo, M.T."
                    value={newLecturer}
                    onChange={(e) => setNewLecturer(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Academic Period</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026/2027 Ganjil"
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-xs disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Class'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
