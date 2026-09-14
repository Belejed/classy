import React, { useState, useEffect } from 'react';
import ModalPortal from './ModalPortal';
import { dbService, authService, isProtectedClass } from '../utils/db';
import toast from 'react-hot-toast';
import { 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  RefreshCw, 
  Search, 
  Users, 
  BookOpen, 
  FileText, 
  Lock, 
  Unlock, 
  Trash2, 
  ArrowRight, 
  Copy, 
  Check, 
  AlertTriangle,
  GraduationCap,
  Calendar,
  Mail,
  KeyRound,
  MessageCircle,
  Phone,
  Wrench,
  Clock,
  Sparkles,
  Power
} from 'lucide-react';

export default function SuperadminDashboardModal({ 
  currentUser, 
  isOpen, 
  onClose, 
  onSelectClass,
  onRefreshParentClasses
}) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  
  // Navigation tabs: 'classes' | 'users' | 'maintenance'
  const [activeTab, setActiveTab] = useState('classes');

  // Classes search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'blocked'
  
  // Users search & filter
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // 'all' | 'komti' | 'lecturer' | 'student'

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [copiedUserEmail, setCopiedUserEmail] = useState(null);
  const [resettingEmail, setResettingEmail] = useState(null);

  // Maintenance Mode states
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    enabled: false,
    title: 'Sistem Sedang Dalam Pemeliharaan',
    message: 'Classy sedang menjalani pemeliharaan sistem berkala untuk peningkatan performa dan pembaruan fitur. Kami akan segera kembali!',
    estimatedEndTime: ''
  });
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);
  const [showConfirmMaintenanceModal, setShowConfirmMaintenanceModal] = useState(false);
  const [pendingTargetState, setPendingTargetState] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [data, maint] = await Promise.all([
        dbService.superadmin.getGlobalMetrics(),
        dbService.system.getMaintenanceConfig()
      ]);
      setMetrics(data);
      if (maint) {
        setMaintenanceConfig(maint);
      }
    } catch (err) {
      console.error('Error fetching superadmin metrics:', err);
      toast.error('Gagal memuat statistik Superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptToggleMaintenance = (targetState) => {
    setPendingTargetState(targetState);
    setShowConfirmMaintenanceModal(true);
  };

  const handleConfirmToggleMaintenance = async () => {
    setIsSavingMaintenance(true);
    const toastId = toast.loading(
      pendingTargetState ? 'Mengaktifkan Mode Pemeliharaan...' : 'Mematikan Mode Pemeliharaan...'
    );
    try {
      const updated = await dbService.system.setMaintenanceConfig({
        ...maintenanceConfig,
        enabled: pendingTargetState,
        updatedBy: currentUser?.displayName || currentUser?.email || 'Superadmin'
      });
      setMaintenanceConfig(updated);
      setShowConfirmMaintenanceModal(false);
      toast.success(
        pendingTargetState 
          ? 'Mode Pemeliharaan BERHASIL DIAKTIFKAN. Akses pengguna biasa saat ini diblokir.' 
          : 'Mode Pemeliharaan DIMATIKAN. Seluruh pengguna kini dapat mengakses web kembali.',
        { id: toastId, duration: 6000 }
      );
    } catch (err) {
      console.error('Error toggling maintenance:', err);
      toast.error('Gagal mengubah status pemeliharaan', { id: toastId });
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  const handleSaveMaintenanceDetails = async (e) => {
    if (e) e.preventDefault();
    setIsSavingMaintenance(true);
    const toastId = toast.loading('Menyimpan pesan pemeliharaan...');
    try {
      const updated = await dbService.system.setMaintenanceConfig({
        ...maintenanceConfig,
        updatedBy: currentUser?.displayName || currentUser?.email || 'Superadmin'
      });
      setMaintenanceConfig(updated);
      toast.success('Pengaturan pesan pemeliharaan berhasil diperbarui!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan pesan', { id: toastId });
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  const handleCopyCode = (classId, code) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(classId);
    toast.success(`Kode ${code} disalin ke clipboard!`);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyUserEmail = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedUserEmail(email);
    toast.success(`Email ${email} disalin!`);
    setTimeout(() => setCopiedUserEmail(null), 2000);
  };

  const handleSendPasswordReset = async (email) => {
    if (!email) return;
    setResettingEmail(email);
    const toastId = toast.loading(`Mengirim link reset password ke ${email}...`);
    try {
      await authService.resetPassword(email);
      toast.success(`Tautan reset password berhasil dikirim ke ${email}!`, { id: toastId, duration: 5000 });
    } catch (err) {
      toast.error(err.message || 'Gagal mengirim email reset password', { id: toastId });
    } finally {
      setResettingEmail(null);
    }
  };

  const handleToggleBlock = async (classId, currentBlockedState) => {
    const nextState = !currentBlockedState;
    setActionLoadingId(classId);
    const toastId = toast.loading(nextState ? 'Memblokir kelas...' : 'Membuka blokir kelas...');
    try {
      await dbService.classes.updateBlockStatus(classId, nextState);
      toast.success(nextState ? 'Kelas berhasil diblokir!' : 'Kelas berhasil dibuka blokirnya / diaktifkan!', { id: toastId });
      await fetchMetrics();
      if (typeof onRefreshParentClasses === 'function') {
        await onRefreshParentClasses();
      }
    } catch (err) {
      toast.error(err.message || 'Gagal mengubah status kelas', { id: toastId });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClass) return;
    setIsDeleting(true);
    const toastId = toast.loading(`Menghapus kelas ${deletingClass.name}...`);
    try {
      await dbService.classes.delete(deletingClass.id);
      toast.success(`Kelas "${deletingClass.name}" berhasil dihapus secara permanen.`, { id: toastId });
      setDeletingClass(null);
      await fetchMetrics();
      if (typeof onRefreshParentClasses === 'function') {
        await onRefreshParentClasses();
      }
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus kelas', { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Filter classes
  const filteredClasses = (metrics?.classes || []).filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      c.name.toLowerCase().includes(q) ||
      (c.classIdentifier && c.classIdentifier.toLowerCase().includes(q)) ||
      (c.lecturer && c.lecturer.toLowerCase().includes(q)) ||
      (c.joinCode && c.joinCode.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return !c.isBlocked;
    if (statusFilter === 'blocked') return c.isBlocked;
    return true;
  });

  // Filter users
  const filteredUsers = (metrics?.users || []).filter(u => {
    const q = userSearchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phoneNumber && u.phoneNumber.includes(q)) ||
      (u.classes && u.classes.some(c => c.name.toLowerCase().includes(q) || (c.classIdentifier && c.classIdentifier.toLowerCase().includes(q))));

    if (!matchesSearch) return false;
    const roleLower = (u.role || 'student').toLowerCase();
    if (userRoleFilter === 'komti') return roleLower === 'komti' || roleLower === 'coordinator';
    if (userRoleFilter === 'lecturer') return roleLower === 'lecturer' || roleLower === 'dosen';
    if (userRoleFilter === 'student') return roleLower === 'student';
    return true;
  });

  return (
    <ModalPortal onClose={onClose} maxWidth="max-w-5xl">
      <div className="bg-[#FDFBF7] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
        
        {/* Top Gradient Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#151D2F]/80 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>Superadmin Command Center</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                ({currentUser?.email || 'arya@exars.my.id'})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Pusat Kendali & Manajemen Platform
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Pantau analitik global, verifikasi persetujuan kelas, dan kelola seluruh pengguna di sistem.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Perbarui Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-600' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">

          {/* 1. Global Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Metric 1: Total Classes */}
            <div 
              onClick={() => setActiveTab('classes')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                activeTab === 'classes'
                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-[#151D2F] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold">Total Ruang Kelas</span>
                <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <GraduationCap size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
                  {loading ? '...' : (metrics?.totalClasses ?? 0)}
                </span>
                <span className="text-xs text-slate-400">Kelas</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-emerald-600 dark:text-emerald-400">{metrics?.activeClasses ?? 0} Aktif</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-rose-600 dark:text-rose-400">{metrics?.blockedClasses ?? 0} Terblokir</span>
              </div>
            </div>

            {/* Metric 2: Total Users */}
            <div 
              onClick={() => setActiveTab('users')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                activeTab === 'users'
                  ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 ring-2 ring-sky-500/20 shadow-xs'
                  : 'bg-white dark:bg-[#151D2F] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold">Pengguna Terdaftar</span>
                <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Users size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
                  {loading ? '...' : (metrics?.totalUsers ?? 0)}
                </span>
                <span className="text-xs text-slate-400">Akun</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
                <span>{metrics?.komtiCount ?? 0} Komti · {metrics?.lecturerCount ?? 0} Dosen · {metrics?.studentCount ?? 0} Mhs</span>
              </div>
            </div>

            {/* Metric 3: Total Tasks */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold">Tugas Perkuliahan</span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BookOpen size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
                  {loading ? '...' : (metrics?.totalTasks ?? 0)}
                </span>
                <span className="text-xs text-slate-400">Penugasan</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span>Di seluruh ruang kelas</span>
              </div>
            </div>

            {/* Metric 4: Total Files */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold">Berkas Materi & Foto</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileText size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
                  {loading ? '...' : (metrics?.totalFiles ?? 0)}
                </span>
                <span className="text-xs text-slate-400">Dokumen</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span>Tersimpan di Google Drive</span>
              </div>
            </div>

          </div>

          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap size={15} />
              <span>Direktori Ruang Kelas ({metrics?.totalClasses ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Users size={15} />
              <span>Direktori Pengguna ({metrics?.totalUsers ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'maintenance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Wrench size={15} className={maintenanceConfig.enabled ? 'text-amber-300 animate-bounce' : ''} />
              <span>Mode Pemeliharaan</span>
              {maintenanceConfig.enabled ? (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                  Aktif
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Off
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: CLASSES DIRECTORY */}
          {activeTab === 'classes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Filter & Search Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari kelas, rombel, dosen, atau kode join..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold self-start sm:self-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      statusFilter === 'all' 
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Semua ({metrics?.totalClasses ?? 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      statusFilter === 'active' 
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Aktif ({metrics?.activeClasses ?? 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter('blocked')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      statusFilter === 'blocked' 
                        ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Terblokir ({metrics?.blockedClasses ?? 0})
                  </button>
                </div>
              </div>

              {/* Classes Table */}
              <div className="bg-white dark:bg-[#151D2F] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                    Daftar Ruang Kelas ({filteredClasses.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Data diperbarui realtime
                  </span>
                </div>

                {loading ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                    <p className="text-xs text-slate-500">Memuat data direktori kelas...</p>
                  </div>
                ) : filteredClasses.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada kelas yang sesuai</p>
                    <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter status kelas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Kelas & Rombel</th>
                          <th className="py-3 px-4">Dosen Pengampu</th>
                          <th className="py-3 px-4 text-center">Kode Undangan</th>
                          <th className="py-3 px-4 text-center">Anggota</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Aksi Superadmin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredClasses.map((cls) => {
                          const isProtected = isProtectedClass(cls);
                          const isBlocked = cls.isBlocked;
                          const isRowLoading = actionLoadingId === cls.id;

                          return (
                            <tr 
                              key={cls.id} 
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              {/* Col 1: Class Name & Rombel */}
                              <td className="py-3.5 px-4 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                                    {cls.name}
                                  </span>
                                  {isProtected && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800" title="Kelas Utama Terproteksi">
                                      ⭐ Inti
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{cls.classIdentifier}</span>
                                  <span>·</span>
                                  <span>{cls.academicPeriod || '2026/2027'}</span>
                                </div>
                              </td>

                              {/* Col 2: Lecturer */}
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                                {cls.lecturer || '-'}
                              </td>

                              {/* Col 3: Join Code */}
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleCopyCode(cls.id, cls.joinCode)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-200 font-mono font-bold text-xs cursor-pointer transition-colors"
                                  title="Salin Kode Undangan"
                                >
                                  <span>{cls.joinCode}</span>
                                  {copiedCodeId === cls.id ? (
                                    <Check size={12} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={12} className="text-slate-400" />
                                  )}
                                </button>
                              </td>

                              {/* Col 4: Member Count */}
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                  <Users size={12} />
                                  <span>{cls.memberCount}</span>
                                </span>
                              </td>

                              {/* Col 5: Status */}
                              <td className="py-3.5 px-4 text-center">
                                {isBlocked ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-900">
                                    <Lock size={10} />
                                    <span>Terblokir</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900">
                                    <Check size={10} />
                                    <span>Aktif</span>
                                  </span>
                                )}
                              </td>

                              {/* Col 6: Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  
                                  {/* 1. Toggle Block Button */}
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleToggleBlock(cls.id, isBlocked)}
                                    className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                                      isBlocked
                                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    }`}
                                    title={isBlocked ? 'Buka blokir / setujui kelas ini' : 'Blokir kelas ini'}
                                  >
                                    {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                                  </button>

                                  {/* 2. Visit Class Workspace */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onSelectClass(cls);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title="Buka Workspace Kelas"
                                  >
                                    <span>Buka</span>
                                    <ArrowRight size={13} />
                                  </button>

                                  {/* 3. Force Delete Button */}
                                  {isProtected ? (
                                    <button
                                      type="button"
                                      disabled
                                      className="p-2 rounded-xl text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                      title="Kelas utama M.Log B dilindungi dan tidak dapat dihapus"
                                    >
                                      <Lock size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingClass(cls)}
                                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      title="Hapus permanen kelas ini (Force Delete)"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}

                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 2: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Filter & Search for Users */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama pengguna, email, no WA, atau nama kelas..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold self-start sm:self-auto">
                  <button
                    onClick={() => setUserRoleFilter('all')}
                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      userRoleFilter === 'all' 
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Semua ({metrics?.totalUsers ?? 0})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('komti')}
                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      userRoleFilter === 'komti' 
                        ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Komti ({metrics?.komtiCount ?? 0})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('lecturer')}
                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      userRoleFilter === 'lecturer' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Dosen ({metrics?.lecturerCount ?? 0})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('student')}
                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      userRoleFilter === 'student' 
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Mahasiswa ({metrics?.studentCount ?? 0})
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white dark:bg-[#151D2F] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                    Daftar Pengguna Platform ({filteredUsers.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Akun terverifikasi di seluruh kelas
                  </span>
                </div>

                {loading ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                    <p className="text-xs text-slate-500">Memuat data pengguna...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada pengguna yang sesuai</p>
                    <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter peran.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Nama & Email Pengguna</th>
                          <th className="py-3 px-4 text-center">Peran</th>
                          <th className="py-3 px-4">Kontak (WhatsApp)</th>
                          <th className="py-3 px-4">Kelas Terdaftar</th>
                          <th className="py-3 px-4 text-right">Aksi Superadmin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((u, idx) => {
                          const roleLower = (u.role || 'student').toLowerCase();
                          const isKomti = roleLower === 'komti' || roleLower === 'coordinator';
                          const isLecturer = roleLower === 'lecturer' || roleLower === 'dosen';
                          const cleanPhone = (u.phoneNumber || '').replace(/\D/g, '');
                          const waLink = cleanPhone ? (cleanPhone.startsWith('0') ? `https://wa.me/62${cleanPhone.slice(1)}` : `https://wa.me/${cleanPhone}`) : null;

                          return (
                            <tr key={u.email || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                              {/* Col 1: Name & Email */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                    isKomti ? 'bg-amber-600' : isLecturer ? 'bg-indigo-600' : 'bg-slate-800'
                                  }`}>
                                    {(u.name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="font-extrabold text-slate-900 dark:text-white text-xs">{u.name}</p>
                                    <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Col 2: Role */}
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isKomti
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    : isLecturer
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}>
                                  <span>{isKomti ? '👑 Komti' : isLecturer ? '🎓 Dosen' : '👤 Mahasiswa'}</span>
                                </span>
                              </td>

                              {/* Col 3: Contact (WA) */}
                              <td className="py-3 px-4">
                                {waLink ? (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium text-xs transition-colors"
                                    title="Buka Chat WhatsApp"
                                  >
                                    <MessageCircle size={13} className="text-emerald-600" />
                                    <span>{u.phoneNumber}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>

                              {/* Col 4: Classes */}
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {(u.classes || []).map((clsObj, cIdx) => (
                                    <span
                                      key={cIdx}
                                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700"
                                      title={`${clsObj.name} (${clsObj.classIdentifier || '-'})`}
                                    >
                                      {clsObj.name}
                                    </span>
                                  ))}
                                  {(!u.classes || u.classes.length === 0) && (
                                    <span className="text-slate-400 text-xs">Belum ada kelas</span>
                                  )}
                                </div>
                              </td>

                              {/* Col 5: Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUserEmail(u.email)}
                                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                    title="Salin Alamat Email"
                                  >
                                    {copiedUserEmail === u.email ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={resettingEmail === u.email}
                                    onClick={() => handleSendPasswordReset(u.email)}
                                    className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Kirim Tautan Reset Password Resmi ke Email User"
                                  >
                                    <KeyRound size={12} />
                                    <span>{resettingEmail === u.email ? 'Mengirim...' : 'Reset Password'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: MAINTENANCE MODE CONTROL */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Primary Master Switch Card */}
              <div className={`p-6 rounded-3xl border transition-all ${
                maintenanceConfig.enabled
                  ? 'bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-slate-900 border-rose-500/40 dark:border-rose-500/30'
                  : 'bg-white dark:bg-[#151D2F] border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      maintenanceConfig.enabled
                        ? 'bg-rose-500 text-white shadow-rose-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Power size={26} className={maintenanceConfig.enabled ? 'animate-pulse' : ''} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                          Status Mode Pemeliharaan
                        </h3>
                        {maintenanceConfig.enabled ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500 text-white shadow-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            Sedang Aktif (Website Terkunci)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Tidak Aktif (Website Terbuka)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                        {maintenanceConfig.enabled
                          ? 'Seluruh pengguna biasa (mahasiswa, dosen, dan pengunjung) saat ini tidak dapat mengakses aplikasi dan diarahkan ke Layar Pemeliharaan. Akun Superadmin tetap dapat login dan mengakses seluruh fitur.'
                          : 'Aplikasi berjalan normal dan dapat diakses oleh seluruh pengguna. Aktifkan mode ini jika Anda ingin melakukan perbaikan, migrasi database, atau pembaruan sistem besar.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0">
                    {maintenanceConfig.enabled ? (
                      <button
                        type="button"
                        disabled={isSavingMaintenance}
                        onClick={() => handlePromptToggleMaintenance(false)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Power size={15} />
                        <span>Matikan Pemeliharaan</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSavingMaintenance}
                        onClick={() => handlePromptToggleMaintenance(true)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Wrench size={15} />
                        <span>Aktifkan Pemeliharaan</span>
                      </button>
                    )}
                  </div>
                </div>

                {maintenanceConfig.updatedAt && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Terakhir diperbarui: {new Date(maintenanceConfig.updatedAt).toLocaleString('id-ID')}</span>
                    {maintenanceConfig.updatedBy && <span>Oleh: {maintenanceConfig.updatedBy}</span>}
                  </div>
                )}
              </div>

              {/* Maintenance Message Configuration Form */}
              <form onSubmit={handleSaveMaintenanceDetails} className="p-6 rounded-3xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                      Kustomisasi Pesan Pemeliharaan
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sesuaikan judul, pesan penjelasan, dan estimasi waktu yang akan ditampilkan kepada pengguna saat mode pemeliharaan aktif.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Judul Pemeliharaan
                    </label>
                    <input
                      type="text"
                      value={maintenanceConfig.title}
                      onChange={(e) => setMaintenanceConfig(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Contoh: Sistem Sedang Dalam Pemeliharaan"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Pesan Lengkap / Alasan Pemeliharaan
                    </label>
                    <textarea
                      rows={3}
                      value={maintenanceConfig.message}
                      onChange={(e) => setMaintenanceConfig(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tuliskan keterangan untuk pengguna yang membuka web..."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Estimasi Waktu Selesai (Opsional)
                    </label>
                    <div className="relative max-w-sm">
                      <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={maintenanceConfig.estimatedEndTime}
                        onChange={(e) => setMaintenanceConfig(prev => ({ ...prev, estimatedEndTime: e.target.value }))}
                        placeholder="Contoh: 14:00 WIB / 30 Menit Lagi"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Jika diisi, badge estimasi selesai akan muncul pada layar pemeliharaan pengguna.
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingMaintenance}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSavingMaintenance ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Simpan Pengaturan Pesan</span>
                  </button>
                </div>
              </form>

              {/* Live Preview Box */}
              <div className="p-5 rounded-3xl bg-slate-950 text-slate-100 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                  <span className="font-bold flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    Preview Tampilan Layar Pengguna
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    Live Preview
                  </span>
                </div>

                <div className="text-center py-6 px-4 space-y-3 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                    <Wrench size={22} />
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Mode Pemeliharaan Sedang Aktif
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {maintenanceConfig.title || 'Sistem Sedang Dalam Pemeliharaan'}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {maintenanceConfig.message || 'Kami sedang melakukan pembaruan berkala.'}
                  </p>
                  {maintenanceConfig.estimatedEndTime && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400">
                      <Clock size={13} />
                      <span>Estimasi Selesai: {maintenanceConfig.estimatedEndTime}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <span>
            Superadmin Access Active: Anda memiliki izin penuh di seluruh workspace.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            Tutup Panel
          </button>
        </div>

      </div>

      {/* SUB-MODAL: CONFIRM TOGGLE MAINTENANCE */}
      {showConfirmMaintenanceModal && (
        <ModalPortal onClose={() => !isSavingMaintenance && setShowConfirmMaintenanceModal(false)} maxWidth="max-w-md">
          <div className="bg-white dark:bg-[#151D2F] border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden font-sans">
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${pendingTargetState ? 'bg-rose-600' : 'bg-emerald-600'}`} />

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              pendingTargetState 
                ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Power size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                {pendingTargetState ? 'Aktifkan Mode Pemeliharaan?' : 'Matikan Mode Pemeliharaan?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {pendingTargetState
                  ? 'Saat diaktifkan, seluruh pengguna biasa (mahasiswa/dosen) yang sedang membuka web akan langsung dialihkan ke Layar Pemeliharaan secara realtime. Akses Superadmin tetap terbuka.'
                  : 'Saat dimatikan, seluruh pengguna akan langsung dapat mengakses kelas dan dashboard Classy kembali secara normal.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingMaintenance}
                onClick={() => setShowConfirmMaintenanceModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingMaintenance}
                onClick={handleConfirmToggleMaintenance}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                  pendingTargetState
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSavingMaintenance ? <RefreshCw size={13} className="animate-spin" /> : <Power size={13} />}
                <span>{isSavingMaintenance ? 'Memproses...' : (pendingTargetState ? 'Ya, Aktifkan' : 'Ya, Matikan')}</span>
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* SUB-MODAL: CONFIRM FORCE DELETE CLASS */}
      {deletingClass && (
        <ModalPortal onClose={() => !isDeleting && setDeletingClass(null)} maxWidth="max-w-md">
          <div className="bg-white dark:bg-[#151D2F] border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />

            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                Hapus Permanen Kelas?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anda akan menghapus ruang kelas <strong className="text-rose-600 dark:text-rose-400">"{deletingClass.name}"</strong> ({deletingClass.classIdentifier}).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <p className="font-bold">⚠️ Perhatian Khusus Superadmin:</p>
              <p className="leading-relaxed text-[11px]">
                Tindakan ini tidak dapat dibatalkan. Seluruh data penugasan, jadwal, dokumen materi, dan riwayat forum kelas ini akan dihapus secara permanen dari server database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}</span>
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

    </ModalPortal>
  );
}
