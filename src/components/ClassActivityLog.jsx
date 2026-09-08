import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  RefreshCw, 
  UserPlus, 
  UserMinus, 
  Shield, 
  FileCheck, 
  CheckSquare, 
  Trash2, 
  Megaphone, 
  Settings, 
  Calendar, 
  Clock, 
  Lock, 
  ChevronRight,
  Info,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from './EmptyState';

export default function ClassActivityLog({
  currentClass,
  currentUser,
  logs = [],
  loading = false,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const role = currentClass?.userRole || 'student';
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen', 'superadmin'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
      toast.success('Log aktivitas diperbarui!');
    } catch {
      toast.error('Gagal memperbarui log.');
    } finally {
      setRefreshing(false);
    }
  };

  // Helper formatting relative time
  const formatTimestamp = (isoDate) => {
    if (!isoDate) return 'Baru saja';
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays === 1) {
        return `Kemarin, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoDate;
    }
  };

  // Helper get event visual properties
  const getEventVisuals = (actionType) => {
    switch (actionType) {
      case 'member_join':
        return {
          icon: UserPlus,
          badgeText: 'Anggota Masuk',
          bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          iconBg: 'bg-emerald-500 text-white'
        };
      case 'member_leave':
        return {
          icon: UserMinus,
          badgeText: 'Keluar Kelas',
          bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
          iconBg: 'bg-amber-500 text-white'
        };
      case 'member_kick':
        return {
          icon: UserMinus,
          badgeText: 'Dikeluarkan',
          bgClass: 'bg-rose-50 text-rose-700 border-rose-200',
          iconBg: 'bg-rose-500 text-white'
        };
      case 'member_role':
        return {
          icon: Shield,
          badgeText: 'Ubah Peran',
          bgClass: 'bg-purple-50 text-purple-700 border-purple-200',
          iconBg: 'bg-purple-500 text-white'
        };
      case 'task_submit':
        return {
          icon: FileCheck,
          badgeText: 'Kumpul Tugas',
          bgClass: 'bg-sky-50 text-sky-700 border-sky-200',
          iconBg: 'bg-sky-500 text-white'
        };
      case 'task_create':
        return {
          icon: CheckSquare,
          badgeText: 'Tugas Baru',
          bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
          iconBg: 'bg-blue-600 text-white'
        };
      case 'task_delete':
        return {
          icon: Trash2,
          badgeText: 'Hapus Tugas',
          bgClass: 'bg-rose-50 text-rose-700 border-rose-200',
          iconBg: 'bg-rose-500 text-white'
        };
      case 'announcement_create':
        return {
          icon: Megaphone,
          badgeText: 'Pengumuman',
          bgClass: 'bg-amber-50 text-amber-800 border-amber-200',
          iconBg: 'bg-amber-500 text-white'
        };
      case 'announcement_delete':
        return {
          icon: Trash2,
          badgeText: 'Hapus Pengumuman',
          bgClass: 'bg-slate-50 text-slate-700 border-slate-200',
          iconBg: 'bg-slate-500 text-white'
        };
      case 'class_create':
      case 'class_update':
        return {
          icon: Settings,
          badgeText: 'Info Kelas',
          bgClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          iconBg: 'bg-indigo-600 text-white'
        };
      default:
        return {
          icon: History,
          badgeText: 'Aktivitas',
          bgClass: 'bg-slate-50 text-slate-700 border-slate-200',
          iconBg: 'bg-slate-600 text-white'
        };
    }
  };

  // Filter categories
  const filterTabs = [
    { id: 'all', label: 'Semua Aktivitas' },
    { id: 'members', label: 'Anggota (Masuk/Keluar)' },
    { id: 'submissions', label: 'Pengumpulan Tugas' },
    { id: 'tasks', label: 'Tugas Kuliah' },
    { id: 'announcements', label: 'Pengumuman' },
    { id: 'settings', label: 'Pengaturan Kelas' }
  ];

  // Filter and search logic
  const filteredLogs = useMemo(() => {
    return (logs || []).filter(item => {
      // Filter by category
      if (activeFilter === 'members') {
        if (!['member_join', 'member_leave', 'member_kick', 'member_role'].includes(item.actionType)) return false;
      } else if (activeFilter === 'submissions') {
        if (item.actionType !== 'task_submit') return false;
      } else if (activeFilter === 'tasks') {
        if (!['task_create', 'task_delete'].includes(item.actionType)) return false;
      } else if (activeFilter === 'announcements') {
        if (!['announcement_create', 'announcement_delete'].includes(item.actionType)) return false;
      } else if (activeFilter === 'settings') {
        if (!['class_create', 'class_update'].includes(item.actionType)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const detailsMatch = (item.details || '').toLowerCase().includes(q);
        const actorMatch = (item.actorName || '').toLowerCase().includes(q);
        const targetMatch = (item.targetName || '').toLowerCase().includes(q);
        return titleMatch || detailsMatch || actorMatch || targetMatch;
      }

      return true;
    });
  }, [logs, activeFilter, searchQuery]);

  // If not Komti / Dosen, show permission notice
  if (!isManager) {
    return (
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 md:p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <Lock size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Akses Khusus Komti & Dosen</h2>
          <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
            Halaman log aktivitas dan audit riwayat kelas ini hanya dapat diakses oleh Komti (Koordinator Kelas) atau Dosen Pengajar demi privasi data akademik.
          </p>
        </div>
      </div>
    );
  }

  // Activity counts
  const memberEventCount = (logs || []).filter(l => ['member_join', 'member_leave', 'member_kick', 'member_role'].includes(l.actionType)).length;
  const submissionCount = (logs || []).filter(l => l.actionType === 'task_submit').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
              <History size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Log Aktivitas Kelas</h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  Khusus Komti
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Audit riwayat transparan: siapa yang masuk/keluar, kumpul tugas, dan perubahan ruang kelas {currentClass?.name}.
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-60"
            title="Muat ulang riwayat aktivitas"
          >
            <RefreshCw size={14} className={refreshing || loading ? 'animate-spin text-indigo-600' : 'text-[#64748B]'} />
            <span>{refreshing ? 'Memuat...' : 'Perbarui'}</span>
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#F1F5F9]">
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">Total Log Tercatat</span>
            <p className="text-lg font-bold text-[#0F172A] mt-0.5">{logs?.length || 0}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Riwayat Anggota</span>
            <p className="text-lg font-bold text-emerald-800 mt-0.5">{memberEventCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">Pengumpulan Tugas</span>
            <p className="text-lg font-bold text-sky-800 mt-0.5">{submissionCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-[#0F172A] text-white shadow-2xs font-bold'
                  : 'bg-white text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Cari mahasiswa / aktivitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-4 sm:p-6 shadow-2xs">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#94A3B8] mx-auto" />
            <p className="text-xs text-[#64748B] font-medium">Memuat riwayat log kelas...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            variant="announcements"
            title="Belum Ada Aktivitas Tercatat"
            description={
              searchQuery || activeFilter !== 'all'
                ? 'Tidak ada aktivitas yang sesuai dengan filter atau kata kunci pencarian Anda.'
                : 'Aktivitas seperti anggota bergabung, keluar, pengumpulan tugas, dan pembuatan tugas baru akan otomatis tercatat di sini.'
            }
          />
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
            {filteredLogs.map((log) => {
              const visuals = getEventVisuals(log.actionType);
              const EventIcon = visuals.icon;

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline dot */}
                  <div className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-xl flex items-center justify-center ring-4 ring-white shadow-xs ${visuals.iconBg}`}>
                    <EventIcon size={12} />
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]/70 hover:border-[#CBD5E1] transition-all group-hover:bg-white group-hover:shadow-xs group-hover:-translate-y-0.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${visuals.bgClass}`}>
                          {visuals.badgeText}
                        </span>
                        <h4 className="font-bold text-xs text-[#0F172A]">
                          {log.title}
                        </h4>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[11px] font-medium text-[#94A3B8] flex items-center gap-1 shrink-0">
                        <Clock size={12} />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    {/* Details Body */}
                    {log.details && (
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {log.details}
                      </p>
                    )}

                    {/* Actor Footer */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-[#64748B]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#0F172A]">{log.actorName || 'Sistem'}</span>
                        {log.actorRole && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 font-semibold uppercase">
                            {log.actorRole === 'komti' ? 'Komti' : log.actorRole === 'lecturer' ? 'Dosen' : 'Mahasiswa'}
                          </span>
                        )}
                        {log.actorEmail && (
                          <span className="text-[10px] text-[#94A3B8] hidden sm:inline">
                            ({log.actorEmail})
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-[#94A3B8]">
                        ID: {log.id.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
