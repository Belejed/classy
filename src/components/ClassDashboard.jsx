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

  const todayTasks = safeTasks
    .filter(t => t.dueDate === todayIsoDate || t.dueDate >= todayIsoDate)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 4);

  // Overview Counts
  const tasksDueCount = safeTasks.filter(t => t.dueDate === todayIsoDate).length;
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

  return (
    <div className="space-y-6 font-sans">
      
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
          className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-6 text-center space-y-2 cursor-pointer hover:border-[#94A3B8] transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Megaphone size={18} />
          </div>
          <h4 className="font-bold text-sm text-[#0F172A]">Belum Ada Pengumuman Kelas</h4>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Pengumuman penting perkuliahan dari Komti atau Dosen pengampu akan disematkan di bagian atas ini.
          </p>
        </div>
      )}

      {/* 2. SUMMARY METRICS ROW (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: Tasks Today */}
        <div 
          onClick={() => onNavigateTab('tasks')}
          className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] p-4 rounded-2xl shadow-2xs transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
              Tasks Today
            </span>
            <p className="text-xl font-bold text-[#0F172A] tracking-tight">
              {tasksDueCount} {tasksDueCount === 1 ? 'assignment' : 'assignments'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 2: Classes Today */}
        <div 
          onClick={() => onNavigateTab('schedule')}
          className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] p-4 rounded-2xl shadow-2xs transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
              Classes Today
            </span>
            <p className="text-xl font-bold text-[#0F172A] tracking-tight">
              {classesTodayCount} {classesTodayCount === 1 ? 'class' : 'classes'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar size={18} />
          </div>
        </div>

        {/* Card 3: Dosen Pengampu & Kontak */}
        <div 
          onClick={() => onNavigateTab('contacts')}
          className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] p-4 rounded-2xl shadow-2xs transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
              Dosen Pengampu
            </span>
            <p className="text-xl font-bold text-[#0F172A] tracking-tight">
              {courseLecturers.length} dosen pengajar
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap size={18} />
          </div>
        </div>

      </div>

      {/* 3. BALANCED 3-COLUMN CONTENT GRID (NO EMPTY HOLES AT THE BOTTOM) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* COLUMN 1: Today's Tasks & Deadlines */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Tasks & Deadlines</h3>
                <p className="text-[11px] text-[#64748B]">Tugas aktif dan deadline terdekat.</p>
              </div>
              <button 
                onClick={() => onNavigateTab('tasks')}
                className="text-xs font-semibold text-[#0F172A] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-[#64748B]">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={16} />
                </div>
                <p className="text-xs font-semibold text-[#0F172A]">Semua Tugas Terselesaikan</p>
                <p className="text-[11px] text-[#64748B] max-w-[220px] mx-auto">
                  Tidak ada tugas aktif atau deadline dalam waktu dekat.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayTasks.map((t) => {
                  const isSubmitted = t.submissions?.some(s => s.userId === currentUser?.uid);
                  const isDueToday = t.dueDate === todayIsoDate;

                  return (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskDetail(t)}
                      className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F172A] truncate">
                            {t.title}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[#64748B]">
                          {t.course && (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-[#F1F5F9] text-[#475569] truncate max-w-[120px]">
                              {t.course}
                            </span>
                          )}
                          <span className={isDueToday ? 'font-bold text-rose-600' : ''}>
                            Due {t.dueDate}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSubmitted 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#F1F5F9]">
            <button
              onClick={() => onNavigateTab('tasks')}
              className="w-full py-1.5 text-center text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Lihat Daftar Tugas Selengkapnya →
            </button>
          </div>
        </div>

        {/* COLUMN 2: Today's Schedule */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Schedule ({todayDayName})</h3>
                <p className="text-[11px] text-[#64748B]">Kuliah dan agenda perkuliahan hari ini.</p>
              </div>
              <button 
                onClick={() => onNavigateTab('schedule')}
                className="text-xs font-semibold text-[#0F172A] hover:underline flex items-center gap-1"
              >
                <span>Timetable</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-[#64748B]">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Calendar size={16} />
                </div>
                <p className="text-xs font-semibold text-[#0F172A]">Tidak Ada Kuliah Hari Ini</p>
                <p className="text-[11px] text-[#64748B] max-w-[220px] mx-auto">
                  Hari bebas perkuliahan atau waktu belajar mandiri.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('schedule')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Calendar size={13} />
                  <span>Buka Timetable Mingguan</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules.map((sch) => {
                  const info = parseLecturerInfo(sch.lecturerRaw || sch.lecturer, sch.description, sch.lecturerPhone);

                  return (
                    <div key={sch.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#0F172A]">
                          {sch.startTime} - {sch.endTime} WIB
                        </span>
                        {sch.room && (
                          <span className="text-[10px] font-medium text-[#64748B] flex items-center gap-1">
                            <MapPin size={11} />
                            Ruang {sch.room}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-[#0F172A] line-clamp-1">{sch.title}</h4>

                      {/* Lecturer info & WhatsApp contact */}
                      {(info.name || sch.lecturer) && (
                        <div className="pt-1.5 border-t border-[#E2E8F0]/70 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-[11px] text-[#475569] truncate">
                            <User size={11} className="text-[#64748B] shrink-0" />
                            <span className="font-semibold text-[#0F172A] truncate">
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

          <div className="pt-2 border-t border-[#F1F5F9]">
            <button
              onClick={() => onNavigateTab('schedule')}
              className="w-full py-1.5 text-center text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Buka Jadwal Mingguan Pas 1 Layar →
            </button>
          </div>
        </div>

        {/* COLUMN 3: Contact Person & Info Kelas */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="pb-1 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-sm text-[#0F172A]">Contact Person & Info</h3>
              <p className="text-[11px] text-[#64748B]">Koordinator kelas dan informasi akademik.</p>
            </div>

            {/* Class Coordinator Card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {coordinatorMember?.name ? coordinatorMember.name[0].toUpperCase() : 'K'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F172A] truncate">{coordinatorMember?.name || 'Komti Kelas'}</p>
                  <span className="text-[10px] text-[#64748B] block">Class Coordinator / Komti</span>
                </div>
              </div>

              {coordinatorMember?.phoneNumber ? (
                <a
                  href={`https://wa.me/${coordinatorMember.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${coordinatorMember.name}, saya mahasiswa kelas ${currentClass?.name || ''}...`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shrink-0"
                  title="Chat WA Komti"
                >
                  <MessageCircle size={15} />
                </a>
              ) : null}
            </div>

            {/* Dosen Pengampu Directory Quick Card */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between text-indigo-950">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <GraduationCap size={15} className="text-indigo-600" />
                  <span>Dosen Pengampu</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                  {courseLecturers.length} Dosen
                </span>
              </div>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                Direktori kontak WhatsApp, telepon, dan ruangan seluruh dosen pengajar.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('contacts')}
                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Buka Tab Kontak Dosen</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Class Academic Metadata */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-[#E2E8F0] text-[11px] text-[#64748B] space-y-1">
              <p><strong className="text-[#334155]">Class ID:</strong> {currentClass?.classIdentifier || '-'}</p>
              <p><strong className="text-[#334155]">Period:</strong> {currentClass?.academicPeriod || '-'}</p>
              <p><strong className="text-[#334155]">Members:</strong> {currentClass?.memberCount || 0} terdaftar</p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F1F5F9]">
            <button
              onClick={() => onNavigateTab('contacts')}
              className="w-full py-1.5 text-center text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer"
            >
              Lihat Direktori Dosen & Kontak →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
