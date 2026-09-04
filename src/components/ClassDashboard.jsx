import React from 'react';
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
  ChevronRight
} from 'lucide-react';

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
  // Day names helper
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDayName = dayNamesIndo[new Date().getDay()];
  const todayIsoDate = new Date().toISOString().split('T')[0];

  // Filter items for Today
  const todaySchedules = schedules
    .filter(s => s.day === todayDayName)
    .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

  const todayTasks = tasks
    .filter(t => t.dueDate === todayIsoDate || t.dueDate >= todayIsoDate)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 4);

  const recentAnnouncement = announcements.length > 0 ? announcements[0] : null;

  // Overview Counts
  const tasksDueCount = tasks.filter(t => t.dueDate === todayIsoDate).length;
  const classesTodayCount = todaySchedules.length;
  const announcementsCount = announcements.length;

  const coordinatorMember = currentClass?.members?.find(m => m.role === 'komti' || m.role === 'coordinator') || 
    (currentClass?.members?.length > 0 ? currentClass.members[0] : { name: 'Komti Kelas', role: 'Komti' });

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. TODAY'S OVERVIEW: 3 Small Summary Cards (Not oversized) */}
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

        {/* Card 3: New Announcements */}
        <div 
          onClick={() => onNavigateTab('announcements')}
          className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] p-4 rounded-2xl shadow-2xs transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
              Announcements
            </span>
            <p className="text-xl font-bold text-[#0F172A] tracking-tight">
              {announcementsCount} updates
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Megaphone size={18} />
          </div>
        </div>

      </div>

      {/* 2. Main Content 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Today's Tasks & Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Today's Tasks */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Today's Tasks & Deadlines</h3>
                <p className="text-[11px] text-[#64748B]">Active course assignments and upcoming deliverables.</p>
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
              <div className="py-8 text-center space-y-1 text-[#64748B]">
                <p className="text-xs font-semibold text-[#0F172A]">No assignments today.</p>
                <p className="text-[11px]">You're all caught up with your submissions.</p>
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
                          {t.course && (
                            <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-[#F1F5F9] text-[#475569] shrink-0">
                              {t.course}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                          <span className={isDueToday ? 'font-bold text-rose-600' : ''}>
                            Due {t.dueDate} · {t.dueTime || '23:59'}
                          </span>
                          {t.attachments?.length > 0 && (
                            <span>{t.attachments.length} attachments</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isSubmitted 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isSubmitted ? 'Submitted' : 'Not Submitted'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Today's Schedule Timeline */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Today's Schedule ({todayDayName})</h3>
                <p className="text-[11px] text-[#64748B]">Scheduled lectures and class sessions for today.</p>
              </div>
              <button 
                onClick={() => onNavigateTab('schedule')}
                className="text-xs font-semibold text-[#0F172A] hover:underline flex items-center gap-1"
              >
                <span>Full timetable</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="py-8 text-center space-y-1 text-[#64748B]">
                <p className="text-xs font-semibold text-[#0F172A]">No classes scheduled today.</p>
                <p className="text-[11px]">Enjoy your free time or work on group projects.</p>
              </div>
            ) : (
              <div className="space-y-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
                {todaySchedules.map((sch) => (
                  <div key={sch.id} className="relative flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A] -ml-[19px] mt-1.5 ring-4 ring-white shrink-0" />
                    
                    <div className="flex-1 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#0F172A]">
                          {sch.startTime} - {sch.endTime}
                        </span>
                        {sch.room && (
                          <span className="text-[10px] font-medium text-[#64748B] flex items-center gap-1">
                            <MapPin size={11} />
                            {sch.room}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-[#0F172A]">{sch.title}</h4>
                      {sch.lecturer && (
                        <p className="text-[11px] text-[#64748B]">Lecturer: {sch.lecturer}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Rail: Contact Person Card & Class Info */}
        <div className="space-y-6">
          
          {/* Contact Person Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#475569]">
              Contact Person
            </h3>

            <div className="space-y-3">
              {/* Class Coordinator */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                  {coordinatorMember?.name ? coordinatorMember.name[0].toUpperCase() : 'K'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F172A] truncate">{coordinatorMember.name}</p>
                  <span className="text-[10px] text-[#64748B] block">Class Coordinator / Komti</span>
                </div>
              </div>

              {/* Lecturer */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="w-9 h-9 rounded-xl bg-[#64748B] text-white flex items-center justify-center font-bold text-xs">
                  {currentClass?.lecturer ? currentClass.lecturer[0].toUpperCase() : 'L'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F172A] truncate">{currentClass?.lecturer || 'Dosen Pengampu'}</p>
                  <span className="text-[10px] text-[#64748B] block">Lecturer</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] space-y-1">
              <p><strong className="text-[#334155]">Class ID:</strong> {currentClass?.classIdentifier}</p>
              <p><strong className="text-[#334155]">Period:</strong> {currentClass?.academicPeriod}</p>
              <p><strong className="text-[#334155]">Members:</strong> {currentClass?.memberCount} registered</p>
            </div>
          </div>

          {/* Recent Announcement Preview */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#475569]">
                Recent Announcement
              </h3>
              <button
                onClick={() => onNavigateTab('announcements')}
                className="text-[10px] font-bold text-[#0F172A] hover:underline"
              >
                All
              </button>
            </div>

            {recentAnnouncement ? (
              <div 
                onClick={() => onOpenAnnouncementDetail(recentAnnouncement)}
                className="space-y-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    recentAnnouncement.type === 'important'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {recentAnnouncement.type}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {new Date(recentAnnouncement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-[#0F172A] line-clamp-2">
                  {recentAnnouncement.title}
                </h4>
                <p className="text-[11px] text-[#64748B] line-clamp-3">
                  {recentAnnouncement.message}
                </p>

                <p className="text-[10px] text-[#94A3B8] pt-1">
                  By {recentAnnouncement.author}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#64748B] py-4 text-center italic">
                No announcements yet.
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
