import React, { useState, lazy, Suspense } from 'react';
import { dbService, isSuperAdmin, isClassBlocked } from '../utils/db';
import { getRoleDisplayName } from '../utils/permissions';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import EmptyState from './EmptyState';
const SuperadminDashboardModal = lazy(() => import('./SuperadminDashboardModal'));
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
  UserCheck, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ShieldAlert 
} from 'lucide-react';

export default function ClassLobby({ 
  currentUser, 
  classes = [], 
  classesLoading = false,
  onSelectClass, 
  onRefreshClasses, 
  onCancelJoinRequest,
  onOpenProfile,
  onLogout 
}) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuperadminModal, setShowSuperadminModal] = useState(false);
  const [createdClassInfo, setCreatedClassInfo] = useState(null);

  // Join Class Form State
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [previewClass, setPreviewClass] = useState(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Create Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassId, setNewClassId] = useState('TI-3A');
  const [newLecturer, setNewLecturer] = useState('');
  const [newPeriod, setNewPeriod] = useState('2026/2027 Ganjil');
  const [creatorRole, setCreatorRole] = useState('komti'); // 'komti' | 'lecturer'
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [blockingClassId, setBlockingClassId] = useState(null);

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
    if (previewClass && isClassBlocked(previewClass) && !isSuperAdmin(currentUser)) {
      toast.error('Kelas ini saat ini diblokir. Hubungi arya@exars.my.id untuk meminta aktivasi.');
      return;
    }
    setIsJoining(true);
    try {
      const joined = await dbService.classes.joinByCode(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName,
        joinCodeInput.trim(),
        'student',
        currentUser.phoneNumber || ''
      );
      setShowJoinModal(false);
      setJoinCodeInput('');
      setPreviewClass(null);
      await onRefreshClasses();

      if (joined.membershipStatus === 'pending') {
        toast.success(`Permintaan terkirim! Mohon tunggu persetujuan Komti/Dosen untuk masuk ke ${joined.name}.`, { duration: 5000 });
      } else {
        toast.success(`Berhasil bergabung ke ${joined.name}!`);
        onSelectClass(joined);
      }
    } catch (err) {
      toast.error(err.message || 'Gagal bergabung ke kelas');
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleBlock = async (classId, newBlockedState) => {
    setBlockingClassId(classId);
    const toastId = toast.loading(newBlockedState ? 'Memblokir kelas...' : 'Membuka blokir kelas...');
    try {
      await dbService.classes.updateBlockStatus(classId, newBlockedState);
      await onRefreshClasses();
      toast.success(newBlockedState ? 'Kelas berhasil diblokir!' : 'Kelas berhasil dibuka blokirnya / diaktifkan!', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status kelas', { id: toastId });
    } finally {
      setBlockingClassId(null);
    }
  };

  const handleCancelRequest = async (classId) => {
    if (!onCancelJoinRequest) return;
    setIsCancelling(true);
    try {
      await onCancelJoinRequest(classId);
    } finally {
      setIsCancelling(false);
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
          creatorRole,
          phoneNumber: currentUser.phoneNumber || ''
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
    <div className="min-h-screen w-screen bg-[#FDFBF7] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* Top Navbar */}
      <header className="w-full border-b border-[#E2E8F0] dark:border-slate-800 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-20 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Classy" className="w-8 h-8 object-contain shrink-0" />
            <span className="font-bold text-lg text-[#0F172A] dark:text-white tracking-tight">Classy</span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 font-medium ml-1">
              Class Lobby
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isSuperAdmin(currentUser) && (
              <button
                type="button"
                onClick={() => setShowSuperadminModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                title="Buka Pusat Kendali Superadmin"
              >
                <ShieldCheck size={14} />
                <span className="hidden sm:inline">Superadmin Panel</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E2E8F0] dark:border-slate-800 hover:border-[#CBD5E1] dark:hover:border-slate-700 transition-colors text-xs font-semibold text-[#0F172A] dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              <div className="w-6 h-6 rounded-full bg-[#0F172A] dark:bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
              </div>
              <span className="max-w-[120px] truncate">{currentUser?.displayName || 'Student'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        
        {/* Editorial Greeting Hero */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 dark:from-[#151D2F] dark:via-[#151D2F] dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1.5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span>Portal Akademik & Kolaborasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
              {greeting}, {firstName}.
            </h1>
            <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-xl">
              Pilih ruang kelas aktifmu di bawah ini untuk mengakses tugas, jadwal kuliah, dan berkas materi.
            </p>
          </div>
        </div>

        {/* Classes Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                {classes.length > 0 ? 'Ruang Kelas Anda' : 'Ruang Kelas'}
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                {classes.length > 0 
                  ? 'Setiap akun mahasiswa/dosen terdaftar di 1 ruang kelas aktif.' 
                  : 'Pilih untuk bergabung dengan kode kelas atau buat ruang kelas baru.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {classes.length === 0 || isSuperAdmin(currentUser) ? (
                <>
                  <button
                    onClick={() => {
                      setJoinCodeInput('');
                      setPreviewClass(null);
                      setShowJoinModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-2xs"
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
                    className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white dark:bg-indigo-600 text-xs font-semibold hover:bg-[#1E293B] dark:hover:bg-indigo-500 transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Create Class</span>
                  </button>
                </>
              ) : (
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>1 Akun = 1 Kelas Aktif</span>
                </span>
              )}
            </div>
          </div>

          {/* Superadmin Stealth Mode Indicator (Only visible to superadmin) */}
          {isSuperAdmin(currentUser) && (
            <div className="max-w-xl mb-4 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold shrink-0 text-sm">
                  ⚡
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Mode Superadmin (Ghost)</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold uppercase tracking-wider">Hidden</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 truncate">
                    Akses penuh ke seluruh workspace kelas tanpa terlihat di daftar anggota publik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Skeleton, Empty State, or Class Cards */}
          {classesLoading ? (
            <div className="max-w-xl">
              <div className="bg-white dark:bg-[#151D2F] border border-[#E2E8F0] dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-20 h-6 rounded-full animate-shimmer" />
                  <div className="w-24 h-5 rounded-full animate-shimmer" />
                </div>
                <div className="space-y-2">
                  <div className="w-52 h-6 rounded-lg animate-shimmer" />
                  <div className="w-32 h-4 rounded animate-shimmer" />
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div className="w-28 h-4 rounded animate-shimmer" />
                  <div className="w-32 h-9 rounded-xl animate-shimmer" />
                </div>
              </div>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white dark:bg-[#151D2F] border border-[#E2E8F0] dark:border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-2xs">
              <EmptyState
                variant="tasks"
                title="Kamu belum terdaftar di kelas manapun"
                description="Silakan bergabung menggunakan kode kelas yang dibagikan oleh Komti/Dosen, atau muat ulang jika Anda baru saja mendaftar."
                actionLabel="Gabung Kelas"
                onAction={() => setShowJoinModal(true)}
              />
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onRefreshClasses()}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-[#0F172A] dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={13} className={classesLoading ? "animate-spin" : ""} />
                  <span>Muat Ulang Kelas</span>
                </button>
                {currentUser?.email && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Akun: <strong className="text-slate-700 dark:text-slate-300 font-mono">{currentUser.email}</strong>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-xl space-y-4">
              {classes.map((cls) => {
                const isPending = cls.membershipStatus === 'pending';

                if (isPending) {
                  return (
                    <div
                      key={cls.id}
                      className="bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-150 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                          <Clock size={12} className="animate-spin text-amber-700 dark:text-amber-300" />
                          <span>Menunggu Persetujuan</span>
                        </span>
                        <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 font-bold">
                          Kode: {cls.joinCode}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="font-bold text-xl text-[#0F172A] dark:text-white tracking-tight leading-snug">
                          {cls.name}
                        </h3>
                        <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                          Permintaan bergabung Anda telah terkirim. Untuk mencegah akun penyusup, Komti atau Dosen kelas ini harus menyetujui akun Anda terlebih dahulu sebelum Anda dapat mengakses ruang kelas.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800/60 text-xs text-[#475569] dark:text-slate-300 space-y-1">
                        <p><strong className="text-[#0F172A] dark:text-white">Rombel:</strong> {cls.classIdentifier || '-'}</p>
                        <p><strong className="text-[#0F172A] dark:text-white">Dosen:</strong> {cls.lecturer || 'Dosen Pengajar'}</p>
                        <p><strong className="text-[#0F172A] dark:text-white">Periode:</strong> {cls.academicPeriod || '-'}</p>
                      </div>

                      <div className="pt-3 border-t border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => handleCancelRequest(cls.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Batalkan Permintaan
                        </button>

                        <button
                          type="button"
                          onClick={() => onRefreshClasses()}
                          className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <RefreshCw size={13} />
                          <span>Cek Status</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                const isBlocked = isClassBlocked(cls);
                const isSuper = isSuperAdmin(currentUser);

                return (
                  <div
                    key={cls.id}
                    className={`relative overflow-hidden bg-white dark:bg-[#151D2F] border rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 group ${
                      isBlocked
                        ? 'border-rose-300/80 dark:border-rose-900/60 bg-gradient-to-b from-white to-rose-50/20 dark:from-[#151D2F] dark:to-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-500/50'
                    }`}
                  >
                    {/* Top gradient accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isBlocked 
                        ? 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500' 
                        : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500'
                    }`} />

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {cls.classIdentifier || 'Rombel'}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {isBlocked && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                              <Lock size={10} />
                              <span>Terblokir</span>
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {getRoleDisplayName(cls.userRole)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className={`font-extrabold text-xl tracking-tight leading-snug transition-colors ${
                          isBlocked 
                            ? 'text-slate-800 dark:text-slate-200' 
                            : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}>
                          {cls.name}
                        </h3>
                        <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p className="flex items-center gap-1.5">
                            <span>👨‍🏫</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{cls.lecturer || 'Dosen Pengajar'}</span>
                          </p>
                          {cls.academicPeriod && (
                            <p className="flex items-center gap-1.5">
                              <span>📅</span>
                              <span>{cls.academicPeriod}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Notice if class is blocked */}
                      {isBlocked && (
                        <div className="p-3 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-xs">
                            <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Akses Kelas Dibatasi / Menunggu Aktivasi</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-rose-700/90 dark:text-rose-300/90">
                            Kelas ini memerlukan persetujuan aktivasi dari Superadmin. Silakan hubungi admin via email di bawah untuk verifikasi dan pembukaan akses.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                        <Users size={14} className="text-slate-400" />
                        <span>{cls.memberCount} Anggota terdaftar</span>
                      </span>

                      {/* Action buttons depending on blocked & superadmin status */}
                      {isSuper ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(cls.id, !isBlocked)}
                            disabled={blockingClassId === cls.id}
                            className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 ${
                              isBlocked
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                            }`}
                            title={isBlocked ? "Setujui / Buka Blokir Kelas Ini" : "Blokir Kelas Ini"}
                          >
                            {isBlocked ? <ShieldCheck size={14} /> : <Lock size={14} />}
                            <span>{blockingClassId === cls.id ? '...' : (isBlocked ? '⚡ Buka Blokir' : '🔒 Blokir')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectClass(cls)}
                            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <span>Masuk</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      ) : isBlocked ? (
                        <a
                          href={`mailto:arya@exars.my.id?subject=${encodeURIComponent(`Permintaan Buka Blokir Kelas: ${cls.name} (${cls.classIdentifier || ''})`)}&body=${encodeURIComponent(`Halo Superadmin Arya,\n\nSaya ingin meminta pembukaan blokir / verifikasi kelas berikut di Classy:\n- Nama Kelas: ${cls.name}\n- Kode/Rombel: ${cls.classIdentifier || '-'}\n- Dosen: ${cls.lecturer || '-'}\n- Pemohon: ${currentUser?.displayName || '-'} (${currentUser?.email || '-'})\n\nMohon bantuannya untuk membuka blokir kelas ini agar mahasiswa dapat mengaksesnya. Terima kasih.`)}`}
                          className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Mail size={14} />
                          <span>Email arya@exars.my.id</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectClass(cls)}
                          className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs group-hover:gap-3 cursor-pointer"
                        >
                          <span>Masuk ke Kelas</span>
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
              <button 
                onClick={() => setShowJoinModal(false)} 
                className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">Kelas Ditemukan:</span>
                    {isClassBlocked(previewClass) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <Lock size={10} />
                        <span>Terblokir</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[#0F172A]">{previewClass.name}</h4>
                    <p className="text-xs text-[#475569]">{previewClass.classIdentifier} · {previewClass.academicPeriod}</p>
                    <p className="text-xs text-[#64748B]">Dosen: {previewClass.lecturer}</p>
                    <p className="text-xs text-[#64748B]">Anggota: {previewClass.memberCount} siswa terdaftar</p>
                  </div>

                  {isClassBlocked(previewClass) && !isSuperAdmin(currentUser) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1 text-rose-700">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>Kelas Belum Diaktivasi</span>
                      </p>
                      <p className="leading-relaxed">
                        Kelas ini diblokir atau belum disetujui Superadmin. Silakan hubungi Arya di <strong className="font-mono">arya@exars.my.id</strong>.
                      </p>
                    </div>
                  )}
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
                disabled={!previewClass || isJoining || (isClassBlocked(previewClass) && !isSuperAdmin(currentUser))}
                onClick={handleConfirmJoin}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50 shadow-xs cursor-pointer"
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
                {createdClassInfo ? (isClassBlocked(createdClassInfo) ? 'Permintaan Terkirim' : 'Kelas Berhasil Dibuat') : 'Create Class'}
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {createdClassInfo ? (
              <div className="space-y-4 text-center py-2">
                {isClassBlocked(createdClassInfo) ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                      <Clock size={24} />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-lg text-[#0F172A]">{createdClassInfo.name}</h4>
                      <p className="text-xs text-[#64748B]">{createdClassInfo.classIdentifier || 'Rombel Baru'}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-left space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                        <span>Menunggu Persetujuan Admin</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Email notifikasi telah otomatis dikirimkan ke <strong className="font-mono">arya@exars.my.id</strong>. Ruang kelas ini otomatis diblokir sampai disetujui / diaktivasi oleh Superadmin.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-[11px] font-semibold text-[#64748B] block">Kode Undangan Kelas</span>
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
                        Simpan kode ini. Anggota dapat bergabung setelah kelas dibuka blokirnya oleh Superadmin.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <a
                        href={`mailto:arya@exars.my.id?subject=${encodeURIComponent(`Pengajuan Aktivasi Kelas: ${createdClassInfo.name}`)}&body=${encodeURIComponent(`Halo Superadmin Arya,\n\nSaya telah membuat kelas baru di Classy:\n- Nama Kelas: ${createdClassInfo.name}\n- Kode: ${createdClassInfo.joinCode}\n- Pembuat: ${currentUser?.displayName || '-'} (${currentUser?.email || '-'})\n\nMohon bantuannya untuk menyetujui dan membuka blokir kelas ini. Terima kasih!`)}`}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Mail size={14} />
                        <span>Kirim Email Konfirmasi ke arya@exars.my.id</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setCreatedClassInfo(null);
                        }}
                        className="w-full py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                      >
                        Selesai & Kembali ke Lobby
                      </button>
                    </div>
                  </>
                ) : (
                  <>
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
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        onSelectClass(createdClassInfo);
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-xs cursor-pointer"
                    >
                      Enter Class Workspace
                    </button>
                  </>
                )}
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
                      <p className="text-[10px] text-[#64748B] mt-0.5">Dosen pengajar mata kuliah</p>
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
                  <label className="text-xs font-semibold text-[#334155]">Lecturer (Dosen Pengajar)</label>
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

                {/* Admin Approval Notice */}
                <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <ShieldAlert size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Konfirmasi Admin Diperlukan</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90">
                    Setiap pembuatan kelas baru akan otomatis dikonfirmasi via email ke <strong>arya@exars.my.id</strong> dan berstatus terblokir sementara hingga disetujui oleh Superadmin.
                  </p>
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

      {/* MODAL 3: SUPERADMIN COMMAND CENTER */}
      {showSuperadminModal && (
        <Suspense fallback={null}>
          <SuperadminDashboardModal
            currentUser={currentUser}
            isOpen={showSuperadminModal}
            onClose={() => setShowSuperadminModal(false)}
            onSelectClass={onSelectClass}
            onRefreshParentClasses={onRefreshClasses}
          />
        </Suspense>
      )}

    </div>
  );
}
