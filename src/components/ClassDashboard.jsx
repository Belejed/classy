import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Megaphone, 
  AlertCircle, 
  ArrowRight, 
  UserCheck, 
  FileText, 
  MapPin, 
  ChevronRight,
  ChevronLeft,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Search,
  User,
  GraduationCap,
  BookOpen,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parseLecturerInfo } from '../utils/db';
import { isTaskOverdue } from './ClassTasks';
import EmptyState from './EmptyState';

export default function ClassDashboard({
  currentClass,
  currentUser,
  schedules = [],
  tasks = [],
  announcements = [],
  onNavigateTab,
  onOpenTaskDetail,
  onOpenAnnouncementDetail
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

  // Day names helper
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDayName = dayNamesIndo[new Date().getDay()];
  const todayIsoDate = new Date().toISOString().split('T')[0];

  // Safe arrays
  const safeSchedules = schedules || [];
  const safeTasks = tasks || [];
  const safeAnnouncements = announcements || [];

  // Active announcement for top hero card
  const currentAnnouncement = safeAnnouncements.length > 0 
    ? safeAnnouncements[Math.min(activeAnnouncementIndex, safeAnnouncements.length - 1)] 
    : null;

  const isImportant = currentAnnouncement?.type?.toLowerCase() === 'important';

  // Filter items for Today
  const todaySchedules = safeSchedules
    .filter(s => s.day === todayDayName)
    .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

  // Pending tasks that are not submitted yet by current user (including overdue)
  const pendingTasks = safeTasks
    .filter(t => {
      const isSubmitted = t.submissions?.some(s => s.userId === currentUser?.uid);
      return !isSubmitted;
    })
    .sort((a, b) => {
      const isOverdueA = isTaskOverdue(a.dueDate, a.dueTime);
      const isOverdueB = isTaskOverdue(b.dueDate, b.dueTime);
      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    })
    .slice(0, 4);

  const hasCompletedTasks = safeTasks.some(t => t.submissions?.some(s => s.userId === currentUser?.uid));
  const pendingTasksCount = safeTasks.filter(t => {
    const isSubmitted = t.submissions?.some(s => s.userId === currentUser?.uid);
    return !isSubmitted;
  }).length;

  const overdueTasksCount = safeTasks.filter(t => {
    const isSubmitted = t.submissions?.some(s => s.userId === currentUser?.uid);
    return !isSubmitted && isTaskOverdue(t.dueDate, t.dueTime);
  }).length;


  // Overview Counts
  const tasksDueCount = safeTasks.filter(t => {
    const isSubmitted = t.submissions?.some(s => s.userId === currentUser?.uid);
    return t.dueDate === todayIsoDate && !isSubmitted;
  }).length;
  const classesTodayCount = todaySchedules.length;
  const announcementsCount = safeAnnouncements.length;

  const coordinatorMember = currentClass?.members?.find(m => m.role === 'komti' || m.role === 'coordinator') || 
    (currentClass?.members?.length > 0 ? currentClass.members[0] : { name: 'Komti Kelas', role: 'Komti' });

  // Extract unique course lecturers count
  const courseLecturers = useMemo(() => {
    const list = [];
    const seen = new Set();

    safeSchedules.forEach((sch) => {
      const info = parseLecturerInfo(sch.lecturerRaw || sch.lecturer, sch.description, sch.lecturerPhone);
      const name = info.name || sch.lecturer || '';
      if (!name) return;

      const courseTitle = sch.course || sch.title || 'Mata Kuliah';
      const key = `${name.toLowerCase()}_${courseTitle.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: sch.id,
          lecturer: name,
          course: courseTitle
        });
      }
    });

    return list;
  }, [safeSchedules]);

  const handleCopyPhone = (phone, id) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    toast.success(`Nomor ${phone} disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrevAnnouncement = (e) => {
    e.stopPropagation();
    setActiveAnnouncementIndex(prev => (prev > 0 ? prev - 1 : safeAnnouncements.length - 1));
  };

  const handleNextAnnouncement = (e) => {
    e.stopPropagation();
    setActiveAnnouncementIndex(prev => (prev < safeAnnouncements.length - 1 ? prev + 1 : 0));
  };

  const formatAnnouncementDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Check for upcoming deadlines (< 24 hours) for current user
  const urgentTasks = useMemo(() => {
    const now = new Date();
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return safeTasks.filter(t => {
      const isSubmitted = t.submissions?.some(s => s.userId === currentUser?.uid);
      if (isSubmitted || !t.dueDate) return false;

      try {
        const [y, m, d] = t.dueDate.split('-').map(Number);
        const [hr, min] = (t.dueTime || '23:59').split(':').map(Number);
        const dueDateTime = new Date(y, m - 1, d, hr || 23, min || 59);
        return dueDateTime > now && dueDateTime <= oneDayLater;
      } catch {
        return false;
      }
    });
  }, [safeTasks, currentUser]);

  // Check for today's classes with room updates or special notes
  const todaySchedulesWithNotes = useMemo(() => {
    return todaySchedules.filter(s => (s.room && s.room.trim()) || (s.description && s.description.trim()));
  }, [todaySchedules]);

  return (
    <div className="space-y-6 font-sans">

      {/* FORCE ALERT BANNER: Urgent Deadlines (< 24 Jam) */}
      {urgentTasks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 rounded-2xl p-4 sm:p-4.5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
              <Clock size={20} className="text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-black/20 tracking-wider">
                  ⚠️ Peringatan Tenggat Tugas
                </span>
                <span className="text-xs text-white/90">
                  {urgentTasks.length} tugas mendekati batas waktu (&lt; 24 jam)
                </span>
              </div>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                Tugas: {urgentTasks.map(t => `"${t.title}" (${t.dueTime || '23:59'} WIB)`).join(', ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="px-4 py-2 rounded-xl bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 shadow-sm transition-all shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Kumpulkan Sekarang →
          </button>
        </div>
      )}

      {/* 1. TOP HERO: BIG ANNOUNCEMENT BANNER */}
      {currentAnnouncement ? (
        <div 
          onClick={() => onOpenAnnouncementDetail(currentAnnouncement)}
          className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-xs transition-all cursor-pointer group ${
            isImportant
              ? 'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/40 border-2 border-rose-400 ring-4 ring-rose-500/10 hover:border-rose-500'
              : 'bg-gradient-to-br from-white via-indigo-50/25 to-slate-50 border border-indigo-150 hover:border-indigo-300/80'
          }`}
        >
          {/* Subtle Ambient Background Highlights */}
          <div className={`absolute -right-10 -top-10 w-44 h-44 rounded-full blur-2xl pointer-events-none ${
            isImportant ? 'bg-rose-500/10 animate-pulse' : 'bg-indigo-500/5'
          }`} />
          <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar: Badges, Date, and Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${
                isImportant 
                  ? 'bg-rose-900 text-rose-50 border border-rose-800' 
                  : 'bg-[#0F172A] text-white'
              }`}>
                {isImportant ? (
                  <AlertCircle size={13} className="text-rose-300 animate-pulse" />
                ) : (
                  <Megaphone size={12} className="text-amber-400" />
                )}
                <span>PENGUMUMAN {isImportant ? 'PENTING' : 'UTAMA'}</span>
              </span>

              {isImportant ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-sm border border-rose-700 animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span>IMPORTANT</span>
                </span>
              ) : (
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  currentAnnouncement.type === 'assignment'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-indigo-100/70 text-indigo-800 border border-indigo-200/60'
                }`}>
                  {currentAnnouncement.type || 'General'}
                </span>
              )}

              <span className="text-xs text-[#94A3B8] hidden sm:inline">·</span>

              <span className="text-xs text-[#64748B] flex items-center gap-1 font-medium">
                <Clock size={12} className="text-[#94A3B8]" />
                <span>{formatAnnouncementDate(currentAnnouncement.createdAt)}</span>
              </span>
            </div>

            {/* Announcement Controls: Prev/Next & View All */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {safeAnnouncements.length > 1 && (
                <div className="flex items-center gap-1.5 bg-white border border-[#CBD5E1] rounded-xl px-2 py-0.5 text-xs font-semibold text-[#475569] shadow-2xs">
                  <button 
                    onClick={handlePrevAnnouncement}
                    className="p-1 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                    title="Pengumuman sebelumnya"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-mono text-[11px] font-bold px-0.5">
                    {activeAnnouncementIndex + 1} / {safeAnnouncements.length}
                  </span>
                  <button 
                    onClick={handleNextAnnouncement}
                    className="p-1 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                    title="Pengumuman berikutnya"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <button 
                onClick={() => onNavigateTab('announcements')}
                className="text-xs font-bold text-[#0F172A] hover:text-indigo-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-[#CBD5E1] shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Semua Pengumuman ({safeAnnouncements.length})</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Announcement Body */}
          <div className="mt-3.5 space-y-2">
            <h3 className={`text-lg sm:text-xl font-extrabold leading-snug transition-colors ${
              isImportant 
                ? 'text-rose-950 group-hover:text-rose-700' 
                : 'text-[#0F172A] group-hover:text-indigo-900'
            }`}>
              {currentAnnouncement.title}
            </h3>
            <p className="text-sm text-[#334155] leading-relaxed line-clamp-3 sm:line-clamp-4 whitespace-pre-line">
              {currentAnnouncement.message}
            </p>
          </div>

          {/* Announcement Footer */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0]/80 flex items-center justify-between text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                isImportant ? 'bg-rose-600' : 'bg-[#0F172A]'
              }`}>
                {currentAnnouncement.author ? currentAnnouncement.author[0].toUpperCase() : 'K'}
              </div>
              <span className="font-semibold text-[#334155]">
                Diposting oleh {currentAnnouncement.author || 'Komti Kelas'}
              </span>
            </div>

            <div className={`flex items-center gap-1 font-semibold transition-colors ${
              isImportant 
                ? 'text-rose-700 group-hover:text-rose-900' 
                : 'text-[#0F172A] group-hover:text-indigo-600'
            }`}>
              <span>Buka Detail Lengkap</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => onNavigateTab('announcements')}
          className="bg-white dark:bg-[#151D2F] border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-6 text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors shadow-2xs"
        >
          <EmptyState
            variant="announcements"
            title="Belum Ada Pengumuman Kelas"
            description="Pengumuman penting perkuliahan dari Komti atau Dosen pengajar akan disematkan di sini."
            actionLabel="Buka Tab Pengumuman"
            onAction={() => onNavigateTab('announcements')}
          />
        </div>
      )}

      {/* 3. SUMMARY METRICS ROW (3 Cards with Hover Elevation) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: Tasks Today */}
        <div 
          onClick={() => onNavigateTab('tasks')}
          className="bg-gradient-to-br from-white via-white to-emerald-50/40 dark:from-[#151D2F] dark:via-[#151D2F] dark:to-emerald-950/20 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 p-4 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Tugas Aktif
            </span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {pendingTasksCount === 0 ? 'Semua selesai ✨' : `${pendingTasksCount} tugas pending`}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
            pendingTasksCount === 0 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 2: Classes Today */}
        <div 
          onClick={() => onNavigateTab('schedule')}
          className="bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-[#151D2F] dark:via-[#151D2F] dark:to-blue-950/20 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 p-4 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Kuliah Hari Ini ({todayDayName})
            </span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {classesTodayCount} {classesTodayCount === 1 ? 'mata kuliah' : 'mata kuliah'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-110">
            <Calendar size={20} />
          </div>
        </div>

        {/* Card 3: Dosen Pengajar & Kontak */}
        <div 
          onClick={() => onNavigateTab('contacts')}
          className="bg-gradient-to-br from-white via-white to-indigo-50/40 dark:from-[#151D2F] dark:via-[#151D2F] dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 p-4 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Dosen Pengajar
            </span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {courseLecturers.length} dosen pengajar
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-transform group-hover:scale-110">
            <GraduationCap size={20} />
          </div>
        </div>

      </div>

      {/* 4. BALANCED 3-COLUMN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* COLUMN 1: Today's Tasks & Deadlines */}
        <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Tasks & Deadlines</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Tugas aktif dan deadline yang perlu dikerjakan.</p>
              </div>
              <button 
                onClick={() => onNavigateTab('tasks')}
                className="text-xs font-semibold text-slate-900 dark:text-white hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {pendingTasks.length === 0 ? (
              <EmptyState
                variant={hasCompletedTasks ? 'completed' : 'tasks'}
                title={hasCompletedTasks ? 'Semua Tugas Selesai! 🎉' : 'Belum Ada Tugas Aktif'}
                description={hasCompletedTasks 
                  ? 'Kerja bagus! Seluruh tugas aktif kelas sudah berhasil kamu kumpulkan.' 
                  : 'Tidak ada tugas atau deadline yang perlu dikerjakan saat ini.'}
                actionLabel="Lihat Riwayat Pengumpulan"
                onAction={() => onNavigateTab('tasks')}
                actionIcon={Check}
              />
            ) : (
              <div className="space-y-2.5">
                {overdueTasksCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="text-[11px] font-medium">
                      Ada <strong className="font-bold">{overdueTasksCount} tugas</strong> yang telah melewati batas tenggat!
                    </span>
                  </div>
                )}

                {pendingTasks.map((t) => {
                  const isDueToday = t.dueDate === todayIsoDate;
                  const isOverdue = isTaskOverdue(t.dueDate, t.dueTime);

                  return (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskDetail(t)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-xs ${
                        isOverdue 
                          ? 'border-l-4 border-l-rose-500 border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20' 
                          : isDueToday
                          ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
                          : 'border-l-4 border-l-indigo-400 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {t.title}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {t.course && (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {t.course}
                            </span>
                          )}
                          <span className={isOverdue ? 'font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1' : isDueToday ? 'font-bold text-amber-600 dark:text-amber-400' : ''}>
                            {isOverdue && <Clock size={11} className="text-rose-600 dark:text-rose-400 animate-pulse" />}
                            <span>Due {t.dueDate || 'No deadline'} {t.dueTime ? `· ${t.dueTime}` : ''}</span>
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isOverdue ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 animate-pulse">
                            <AlertCircle size={10} className="text-rose-600 dark:text-rose-400" />
                            <span>Terlewat</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('tasks')}
              className="w-full py-1.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Lihat Daftar Tugas Selengkapnya →
            </button>
          </div>
        </div>

        {/* COLUMN 2: Today's Schedule */}
        <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Schedule ({todayDayName})</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Kuliah dan agenda perkuliahan hari ini.</p>
              </div>
              <button 
                onClick={() => onNavigateTab('schedule')}
                className="text-xs font-semibold text-slate-900 dark:text-white hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Timetable</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {todaySchedules.length === 0 ? (
              <EmptyState
                variant="schedule"
                title="Tidak Ada Kuliah Hari Ini"
                description="Hari bebas perkuliahan atau waktu belajar mandiri ✨"
                actionLabel="Buka Timetable Mingguan"
                onAction={() => onNavigateTab('schedule')}
                actionIcon={Calendar}
              />
            ) : (
              <div className="space-y-3">
                {todaySchedules.map((sch) => {
                  const info = parseLecturerInfo(sch.lecturerRaw || sch.lecturer, sch.description, sch.lecturerPhone);

                  return (
                    <div key={sch.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:-translate-y-0.5 hover:shadow-2xs transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {sch.startTime} - {sch.endTime} WIB
                        </span>
                        {sch.room && (
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                            <MapPin size={11} className="text-rose-500" />
                            Ruang {sch.room}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{sch.title}</h4>

                      {/* Lecturer info & WhatsApp contact */}
                      {(info.name || sch.lecturer) && (
                        <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            <User size={11} className="text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {(info.name || sch.lecturer).split(',')[0]}
                            </span>
                          </div>

                          {info.cleanPhone ? (
                            <a
                              href={`https://wa.me/${info.cleanPhone}?text=${encodeURIComponent(`Halo Bapak/Ibu ${info.name || sch.lecturer}, saya mahasiswa kelas ${currentClass?.name || ''} untuk perkuliahan ${sch.title}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors shrink-0"
                            >
                              <MessageCircle size={10} />
                              <span>WA</span>
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('schedule')}
              className="w-full py-1.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Buka Jadwal Mingguan Pas 1 Layar →
            </button>
          </div>
        </div>

        {/* COLUMN 3: Contact Person & Info Kelas */}
        <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Contact Person & Info</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Koordinator kelas dan informasi akademik.</p>
            </div>

            {/* Class Coordinator Card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {coordinatorMember?.name ? coordinatorMember.name[0].toUpperCase() : 'K'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{coordinatorMember?.name || 'Komti Kelas'}</p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Class Coordinator / Komti</span>
                </div>
              </div>

              {coordinatorMember?.phoneNumber ? (
                <a
                  href={`https://wa.me/${coordinatorMember.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${coordinatorMember.name}, saya mahasiswa kelas ${currentClass?.name || ''}...`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors shrink-0"
                  title="Chat WA Komti"
                >
                  <MessageCircle size={15} />
                </a>
              ) : null}
            </div>

            {/* Official WhatsApp Class Group Button */}
            {currentClass?.waGroupLink && (
              <a
                href={currentClass.waGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-between gap-2 shadow-xs transition-colors cursor-pointer group"
                title="Buka Grup WhatsApp Resmi Kelas"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate">Grup WhatsApp Kelas</p>
                    <span className="text-[10px] text-emerald-100 block">Gabung diskusi & info resmi</span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-white/80 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </a>
            )}

            {/* Dosen Pengajar Directory Quick Card */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <GraduationCap size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Dosen Pengajar</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 shadow-2xs">
                  {courseLecturers.length} Dosen
                </span>
              </div>
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                Direktori kontak WhatsApp, telepon, dan ruangan seluruh dosen pengajar.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('contacts')}
                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Buka Tab Kontak Dosen</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Class Academic Metadata */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <p><strong className="text-slate-700 dark:text-slate-200">Class ID:</strong> {currentClass?.classIdentifier || '-'}</p>
              <p><strong className="text-slate-700 dark:text-slate-200">Period:</strong> {currentClass?.academicPeriod || '-'}</p>
              <p><strong className="text-slate-700 dark:text-slate-200">Members:</strong> {currentClass?.memberCount || 0} terdaftar</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('contacts')}
              className="w-full py-1.5 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Lihat Direktori Dosen & Kontak →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
