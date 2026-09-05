import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CalendarDays,
  Clock, 
  MapPin, 
  Plus, 
  X, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  BookOpen, 
  Info, 
  Edit2, 
  Phone, 
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  ExternalLink,
  Filter,
  Check,
  Bookmark
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import { parseLecturerInfo } from '../utils/db';

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DEFAULT_START_HOUR = 6;  // 06:00
const DEFAULT_END_HOUR = 18;   // 18:00
const COMPACT_HOUR_HEIGHT = 42; // px per hour (fits 06:00-18:00 completely within 1 screen without scrolling)

const COURSE_PALETTES = [
  {
    // 0. Emerald (Mint Green)
    bg: 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-950 border-l-4 border-l-emerald-600 border border-emerald-200/90 shadow-2xs',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    dot: 'bg-emerald-600'
  },
  {
    // 1. Violet (Purple)
    bg: 'bg-violet-50/90 hover:bg-violet-100 text-violet-950 border-l-4 border-l-violet-600 border border-violet-200/90 shadow-2xs',
    badge: 'bg-violet-100 text-violet-800 border border-violet-200',
    dot: 'bg-violet-600'
  },
  {
    // 2. Amber (Warm Amber / Gold)
    bg: 'bg-amber-50/90 hover:bg-amber-100 text-amber-950 border-l-4 border-l-amber-600 border border-amber-200/90 shadow-2xs',
    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
    dot: 'bg-amber-600'
  },
  {
    // 3. Sky (Cyan / Light Blue)
    bg: 'bg-sky-50/90 hover:bg-sky-100 text-sky-950 border-l-4 border-l-sky-600 border border-sky-200/90 shadow-2xs',
    badge: 'bg-sky-100 text-sky-800 border border-sky-200',
    dot: 'bg-sky-600'
  },
  {
    // 4. Rose (Coral Pink)
    bg: 'bg-rose-50/90 hover:bg-rose-100 text-rose-950 border-l-4 border-l-rose-600 border border-rose-200/90 shadow-2xs',
    badge: 'bg-rose-100 text-rose-800 border border-rose-200',
    dot: 'bg-rose-600'
  },
  {
    // 5. Orange (Terracotta / Warm Orange)
    bg: 'bg-orange-50/90 hover:bg-orange-100 text-orange-950 border-l-4 border-l-orange-600 border border-orange-200/90 shadow-2xs',
    badge: 'bg-orange-100 text-orange-800 border border-orange-200',
    dot: 'bg-orange-600'
  },
  {
    // 6. Teal (Aqua Teal)
    bg: 'bg-teal-50/90 hover:bg-teal-100 text-teal-950 border-l-4 border-l-teal-600 border border-teal-200/90 shadow-2xs',
    badge: 'bg-teal-100 text-teal-800 border border-teal-200',
    dot: 'bg-teal-600'
  },
  {
    // 7. Indigo (Royal Indigo)
    bg: 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-950 border-l-4 border-l-indigo-600 border border-indigo-200/90 shadow-2xs',
    badge: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    dot: 'bg-indigo-600'
  },
  {
    // 8. Fuchsia (Bright Fuchsia)
    bg: 'bg-fuchsia-50/90 hover:bg-fuchsia-100 text-fuchsia-950 border-l-4 border-l-fuchsia-600 border border-fuchsia-200/90 shadow-2xs',
    badge: 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200',
    dot: 'bg-fuchsia-600'
  },
  {
    // 9. Blue (Classic Blue)
    bg: 'bg-blue-50/90 hover:bg-blue-100 text-blue-950 border-l-4 border-l-blue-600 border border-blue-200/90 shadow-2xs',
    badge: 'bg-blue-100 text-blue-800 border border-blue-200',
    dot: 'bg-blue-600'
  }
];

// Helper to check if a task deadline has passed
const isTaskOverdue = (dueDate, dueTime = '23:59') => {
  if (!dueDate) return false;
  try {
    const [year, month, day] = dueDate.split('-').map(Number);
    const [hours, minutes] = (dueTime || '23:59').split(':').map(Number);
    const dueDateTime = new Date(year, month - 1, day, hours || 23, minutes || 59, 59);
    return new Date() > dueDateTime;
  } catch {
    return false;
  }
};

const hasUserSubmitted = (task, user) => {
  if (!task?.submissions || !Array.isArray(task.submissions)) return false;
  return task.submissions.some(s => 
    s.userId === user?.uid || 
    s.userId === user?.id || 
    s.userName === user?.displayName
  );
};

const getTaskDayOfWeek = (dueDate) => {
  if (!dueDate) return null;
  try {
    const [y, m, d] = dueDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const idx = (date.getDay() + 6) % 7;
    return DAYS_OF_WEEK[idx];
  } catch {
    return null;
  }
};

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatDateIndonesian = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = DAYS_OF_WEEK[(date.getDay() + 6) % 7];
    return `${dayName}, ${d} ${MONTH_NAMES_ID[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
};

export default function ClassSchedule({
  currentClass,
  currentUser,
  schedules = [],
  tasks = [],
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onNavigateToTask
}) {
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'timetable' | 'day' | 'list'
  
  // Calendar View State
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [calendarFilter, setCalendarFilter] = useState('all'); // 'all' | 'tasks' | 'classes'
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [listFilter, setListFilter] = useState('all'); // 'all' | 'schedules' | 'tasks'

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth(); // 0-indexed

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
  };
  const handleGoToday = () => {
    const today = new Date();
    setCalendarDate(today);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedCalendarDateStr(`${y}-${m}-${d}`);
  };

  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7; // 0 for Monday, 6 for Sunday

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const cells = [];

    // 1. Prev month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(calYear, calMonth - 1, dayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayName = DAYS_OF_WEEK[(prevDate.getDay() + 6) % 7];
      cells.push({
        dateNum: dayNum,
        dateStr,
        dayName,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayIndex = (new Date(calYear, calMonth, day).getDay() + 6) % 7;
      const dayName = DAYS_OF_WEEK[dayIndex];
      cells.push({
        dateNum: day,
        dateStr,
        dayName,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // 3. Next month leading days (to fill 35 or 42 grid slots)
    const targetLength = cells.length > 35 ? 42 : 35;
    let nextDay = 1;
    while (cells.length < targetLength) {
      const nextDate = new Date(calYear, calMonth + 1, nextDay);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      const dayName = DAYS_OF_WEEK[(nextDate.getDay() + 6) % 7];
      cells.push({
        dateNum: nextDay,
        dateStr,
        dayName,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
      nextDay++;
    }

    return cells;
  }, [calYear, calMonth]);

  const selectedDateTasks = useMemo(() => {
    return (tasks || []).filter(t => t.dueDate === selectedCalendarDateStr);
  }, [tasks, selectedCalendarDateStr]);

  const selectedDateDayName = useMemo(() => {
    if (!selectedCalendarDateStr) return 'Senin';
    try {
      const [y, m, d] = selectedCalendarDateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return DAYS_OF_WEEK[(date.getDay() + 6) % 7];
    } catch {
      return 'Senin';
    }
  }, [selectedCalendarDateStr]);

  const selectedDateClasses = useMemo(() => {
    return (schedules || []).filter(s => s.day === selectedDateDayName);
  }, [schedules, selectedDateDayName]);

  // Current Day & Time calculation
  const todayIndex = (new Date().getDay() + 6) % 7; // 0 = Senin, 6 = Minggu
  const todayDayName = DAYS_OF_WEEK[todayIndex] || 'Senin';
  const [selectedDay, setSelectedDay] = useState(todayDayName);
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Form State for Add Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('class'); // 'class' | 'assignment' | 'deadline' | 'other'
  const [eventDay, setEventDay] = useState(selectedDay);
  const [eventStartTime, setEventStartTime] = useState('08:00');
  const [eventEndTime, setEventEndTime] = useState('09:40');
  const [eventRoom, setEventRoom] = useState('');
  const [eventLecturer, setEventLecturer] = useState(currentClass?.lecturer || '');
  const [eventLecturerPhone, setEventLecturerPhone] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  const role = currentClass?.userRole;
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  // Dynamic schedule boundaries to fit cleanly on 1 screen without unnecessary vertical scrolling
  const { startHour, endHour } = useMemo(() => {
    let minH = DEFAULT_START_HOUR;
    let maxH = DEFAULT_END_HOUR;

    (schedules || []).forEach(s => {
      if (s.startTime) {
        const [h] = s.startTime.split(':').map(Number);
        if (!isNaN(h) && h < minH) minH = Math.max(6, h);
      }
      if (s.endTime) {
        const [h, m] = s.endTime.split(':').map(Number);
        if (!isNaN(h)) {
          const ceilH = m > 0 ? h + 1 : h;
          if (ceilH > maxH) maxH = Math.min(22, ceilH);
        }
      }
    });

    return { startHour: minH, endHour: maxH };
  }, [schedules]);

  const hoursArray = useMemo(() => {
    return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  }, [startHour, endHour]);

  const totalMinutes = useMemo(() => {
    return Math.max((endHour - startHour) * 60, 60);
  }, [startHour, endHour]);

  // Real-time current time indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isWithinScheduleHours = currentHour >= startHour && currentHour < endHour;
  const currentTimeTopPercent = isWithinScheduleHours 
    ? (((currentHour - startHour) * 60 + currentMinute) / totalMinutes) * 100 
    : null;

  // Calculate top offset and height for events on the time grid (percentage-based to fill full screen)
  const calculatePosition = (startTimeStr, endTimeStr) => {
    const [rawStartH, rawStartM] = String(startTimeStr || '08:00').split(':').map(Number);
    const [rawEndH, rawEndM] = String(endTimeStr || '09:40').split(':').map(Number);

    const startH = isNaN(rawStartH) ? 8 : rawStartH;
    const startM = isNaN(rawStartM) ? 0 : rawStartM;
    const endH = isNaN(rawEndH) ? 10 : rawEndH;
    const endM = isNaN(rawEndM) ? 0 : rawEndM;

    const startMinutes = Math.max(startH * 60 + startM, startHour * 60);
    const endMinutes = Math.min(endH * 60 + endM, endHour * 60);

    const topOffsetMinutes = startMinutes - (startHour * 60);
    const durationMinutes = Math.max(endMinutes - startMinutes, 25);

    const top = `${(topOffsetMinutes / totalMinutes) * 100}%`;
    const height = `${Math.max((durationMinutes / totalMinutes) * 100, 5.5)}%`;

    return { top, height };
  };

  const getEventTypeStyles = (evt) => {
    const type = typeof evt === 'string' ? evt : evt?.type;
    const title = typeof evt === 'object' ? (evt.title || evt.course || evt.subject || evt.code || '') : '';
    const code = typeof evt === 'object' ? (evt.code || '') : '';

    if (type === 'deadline') {
      return {
        bg: 'bg-rose-50 hover:bg-rose-100/90 text-rose-950 border-l-4 border-l-rose-600 border border-rose-200 shadow-2xs',
        badge: 'bg-rose-200/80 text-rose-900',
        dot: 'bg-rose-600'
      };
    }
    if (type === 'assignment') {
      return {
        bg: 'bg-amber-50 hover:bg-amber-100/90 text-amber-950 border-l-4 border-l-amber-600 border border-amber-200 shadow-2xs',
        badge: 'bg-amber-200/80 text-amber-900',
        dot: 'bg-amber-600'
      };
    }

    // Direct distinctive color assignment per course
    const lower = (title + ' ' + code).toLowerCase();
    if (lower.includes('manajemen') || lower.includes('b10pra11')) {
      return COURSE_PALETTES[0]; // Emerald
    }
    if (lower.includes('inovasi') || lower.includes('bisnis') || lower.includes('b10pbi11')) {
      return COURSE_PALETTES[7]; // Indigo
    }
    if (lower.includes('akuntansi') || lower.includes('b10pak11')) {
      return COURSE_PALETTES[2]; // Amber
    }
    if (lower.includes('transportasi') || lower.includes('b10ptr11')) {
      return COURSE_PALETTES[3]; // Sky
    }
    if (lower.includes('logistik') || lower.includes('b10plo11')) {
      return COURSE_PALETTES[5]; // Orange
    }
    if (lower.includes('matematika') || lower.includes('b10mte11')) {
      return COURSE_PALETTES[1]; // Violet
    }
    if (lower.includes('mikro') || lower.includes('b10emi11')) {
      return COURSE_PALETTES[6]; // Teal
    }
    if (lower.includes('pancasila') || lower.includes('b10ppa11')) {
      return COURSE_PALETTES[4]; // Rose
    }

    // Deterministic hash fallback for any other course
    let hash = 0;
    const str = title || code || type || 'class';
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i) * (i + 1);
      hash |= 0;
    }
    return COURSE_PALETTES[Math.abs(hash) % COURSE_PALETTES.length];
  };

  const handleStartEdit = (schedule) => {
    setEditingSchedule(schedule);
    setEventTitle(schedule.title || schedule.course || '');
    setEventType(schedule.type || 'class');
    setEventDay(schedule.day || selectedDay);
    setEventStartTime(schedule.startTime || '08:00');
    setEventEndTime(schedule.endTime || '09:40');
    setEventRoom(schedule.room || '');
    const parsed = parseLecturerInfo(schedule.lecturer || '', schedule.description || '', schedule.lecturerPhone || '');
    setEventLecturer(parsed.lecturerName || schedule.lecturer || '');
    setEventLecturerPhone(schedule.lecturerPhone || parsed.lecturerPhone || '');
    setEventDesc(schedule.description || '');
    setSelectedEvent(null);
    setShowAddModal(true);
  };

  const handleOpenAdd = (dayOverride, startTimeOverride, endTimeOverride) => {
    setEditingSchedule(null);
    setEventTitle('');
    setEventType('class');
    setEventDay(dayOverride || selectedDay);
    setEventStartTime(startTimeOverride || '08:00');
    setEventEndTime(endTimeOverride || '09:40');
    setEventRoom('');
    setEventLecturer(currentClass?.lecturer || '');
    setEventLecturerPhone('');
    setEventDesc('');
    setShowAddModal(true);
  };

  const handleOpenAddAtSlot = (dayName, hour) => {
    if (!isManager) return;
    const formattedHour = String(hour).padStart(2, '0');
    const nextHour = String(hour + 2).padStart(2, '0');
    handleOpenAdd(dayName, `${formattedHour}:00`, `${nextHour}:00`);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      toast.error('Judul mata kuliah / agenda wajib diisi');
      return;
    }
    const schedulePayload = {
      title: eventTitle.trim(),
      course: eventTitle.trim(),
      type: eventType,
      day: eventDay,
      startTime: eventStartTime,
      endTime: eventEndTime,
      room: eventRoom.trim(),
      lecturer: eventLecturer.trim(),
      lecturerPhone: eventLecturerPhone.trim(),
      description: eventDesc.trim()
    };

    try {
      if (editingSchedule) {
        await onUpdateSchedule(editingSchedule.id, schedulePayload);
        toast.success('Jadwal berhasil diperbarui!');
      } else {
        await onAddSchedule(schedulePayload);
        toast.success('Jadwal berhasil ditambahkan!');
      }
      setShowAddModal(false);
      setEditingSchedule(null);
      setEventTitle('');
      setEventRoom('');
      setEventLecturerPhone('');
      setEventDesc('');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan jadwal');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    try {
      await onDeleteSchedule(id);
      setSelectedEvent(null);
      toast.success('Jadwal berhasil dihapus');
    } catch (err) {
      toast.error('Gagal menghapus jadwal');
    }
  };

  return (
    <div className="space-y-3 font-sans">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Class Schedule & Calendar</h2>
            {viewMode === 'calendar' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {(tasks || []).length} Tenggat Tugas
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {String(startHour).padStart(2, '0')}:00 – {String(endHour).padStart(2, '0')}:00 WIB
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {(schedules || []).length} Jadwal Kuliah
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Kalender jadwal perkuliahan mingguan dan tenggat pengumpulan tugas kuliah terpadu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'calendar' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Kalender Bulanan & Tenggat Tugas"
            >
              <CalendarDays size={13} />
              <span>Kalender</span>
            </button>
            <button
              onClick={() => setViewMode('timetable')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'timetable' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Grid Jam Lengkap"
            >
              Timetable Jam
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'day' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Agenda Harian"
            >
              Harian
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Daftar Ringkas"
            >
              Daftar
            </button>
          </div>

          {/* Add Event Button for Komti / Lecturer */}
          {isManager && (
            <button
              onClick={() => handleOpenAdd(selectedDay)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus size={13} />
              <span>Tambah Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 0: MONTHLY CALENDAR VIEW (FOR TASKS & LECTURES) */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Toolbar: Month Navigation & Filters */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Month & Year Title with Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-[#CBD5E1] bg-slate-50 p-0.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-white transition-colors cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-white transition-colors cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <span>{MONTH_NAMES_ID[calMonth]} {calYear}</span>
              </h3>

              <button
                onClick={handleGoToday}
                className="ml-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-200 transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
            </div>

            {/* Filter Chips & Legend */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <div className="flex items-center p-0.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <button
                  onClick={() => setCalendarFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    calendarFilter === 'all' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Semua ({(tasks || []).length + (schedules || []).length})
                </button>
                <button
                  onClick={() => setCalendarFilter('tasks')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    calendarFilter === 'tasks' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span>📝 Tugas</span>
                  <span className="text-[10px] px-1 rounded-full bg-rose-100 text-rose-800">
                    {(tasks || []).length}
                  </span>
                </button>
                <button
                  onClick={() => setCalendarFilter('classes')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    calendarFilter === 'classes' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  <span>📚 Kuliah</span>
                  <span className="text-[10px] px-1 rounded-full bg-indigo-100 text-indigo-800">
                    {(schedules || []).length}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Month Grid */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
            {/* 7 Days Header */}
            <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {DAYS_OF_WEEK.map((dayName) => (
                <div key={dayName} className="py-2.5 text-center border-r border-[#E2E8F0] last:border-r-0">
                  <span className="text-xs font-bold text-[#475569]">{dayName}</span>
                </div>
              ))}
            </div>

            {/* Grid of Days */}
            <div className="grid grid-cols-7 border-collapse">
              {calendarGrid.map((cell, idx) => {
                const cellTasks = (tasks || []).filter(t => t.dueDate === cell.dateStr);
                const cellClasses = (schedules || []).filter(s => s.day === cell.dayName);

                const itemsToShow = [];
                if (calendarFilter === 'all' || calendarFilter === 'tasks') {
                  cellTasks.forEach(t => itemsToShow.push({ ...t, itemType: 'task' }));
                }
                if (calendarFilter === 'all' || calendarFilter === 'classes') {
                  cellClasses.forEach(c => itemsToShow.push({ ...c, itemType: 'class' }));
                }

                const isSelected = cell.dateStr === selectedCalendarDateStr;

                return (
                  <div
                    key={cell.dateStr + '_' + idx}
                    onClick={() => setSelectedCalendarDateStr(cell.dateStr)}
                    className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 border-b border-r border-[#E2E8F0] last:border-r-0 transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/40 ring-2 ring-inset ring-[#0F172A]'
                        : cell.isToday
                        ? 'bg-sky-50/30'
                        : cell.isCurrentMonth
                        ? 'bg-white hover:bg-slate-50/80'
                        : 'bg-slate-50/50 text-[#94A3B8]'
                    }`}
                  >
                    {/* Top Row: Date Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                          cell.isToday
                            ? 'bg-[#0F172A] text-white shadow-2xs font-extrabold'
                            : isSelected
                            ? 'bg-amber-200 text-amber-950'
                            : cell.isCurrentMonth
                            ? 'text-[#0F172A]'
                            : 'text-[#94A3B8]'
                        }`}
                      >
                        {cell.dateNum}
                      </span>

                      {/* Small counter if multiple tasks */}
                      {cellTasks.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200" title={`${cellTasks.length} tugas jatuh tempo`}>
                          {cellTasks.length} Tugas
                        </span>
                      )}
                    </div>

                    {/* Middle: Items List */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {itemsToShow.slice(0, 3).map((item, itemIdx) => {
                        if (item.itemType === 'task') {
                          const isOverdue = isTaskOverdue(item.dueDate, item.dueTime);
                          const isSubmitted = hasUserSubmitted(item, currentUser);

                          return (
                            <div
                              key={item.id || itemIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskDetail(item);
                              }}
                              className={`p-1 rounded-lg text-[10px] sm:text-[11px] font-semibold border flex items-center gap-1 truncate shadow-2xs transition-transform hover:scale-[1.02] cursor-pointer ${
                                isSubmitted
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isOverdue
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}
                              title={`Tugas: ${item.title} (${item.dueTime || '23:59'})`}
                            >
                              <span className="shrink-0">
                                {isSubmitted ? '✅' : isOverdue ? '🔴' : '📝'}
                              </span>
                              <span className="truncate flex-1">{item.title}</span>
                              <span className="text-[9px] opacity-75 font-mono shrink-0 hidden sm:inline">
                                {item.dueTime}
                              </span>
                            </div>
                          );
                        }

                        // Class item
                        return (
                          <div
                            key={item.id || itemIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(item);
                            }}
                            className="p-1 rounded-lg text-[10px] sm:text-[11px] font-medium bg-slate-50 text-[#334155] border border-slate-200/80 flex items-center gap-1 truncate hover:bg-slate-100 transition-colors cursor-pointer"
                            title={`Kuliah: ${item.course || item.title} (${item.startTime} - ${item.endTime})`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate flex-1">{item.course || item.title}</span>
                            <span className="text-[9px] text-[#64748B] font-mono shrink-0 hidden sm:inline">
                              {item.startTime}
                            </span>
                          </div>
                        );
                      })}

                      {itemsToShow.length > 3 && (
                        <div className="text-[9px] font-bold text-[#64748B] text-center">
                          +{itemsToShow.length - 3} lainnya
                        </div>
                      )}
                    </div>

                    <div />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Detail Panel */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Agenda Terpilih
                </span>
                <h4 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                  <Calendar size={16} className="text-[#0F172A]" />
                  <span>{formatDateIndonesian(selectedCalendarDateStr)}</span>
                </h4>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  {selectedDateTasks.length} Tenggat Tugas
                </span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  {selectedDateClasses.length} Perkuliahan
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Tasks for selected date */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                    <span>📝 Tenggat Tugas</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100">
                      {selectedDateTasks.length}
                    </span>
                  </h5>
                </div>

                {selectedDateTasks.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[#CBD5E1] text-center space-y-1 bg-[#F8FAFC]">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500/80" />
                    <p className="text-xs font-semibold text-[#0F172A]">Tidak ada tugas jatuh tempo pada tanggal ini</p>
                    <p className="text-[11px] text-[#64748B]">Bebas dari deadline tugas kuliah!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDateTasks.map((t) => {
                      const isOverdue = isTaskOverdue(t.dueDate, t.dueTime);
                      const isSubmitted = hasUserSubmitted(t, currentUser);

                      return (
                        <div
                          key={t.id}
                          className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                            isSubmitted
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50/40 border-rose-300'
                              : 'bg-amber-50/40 border-amber-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              {t.course && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[#475569]">
                                  {t.course}
                                </span>
                              )}
                              <h6 className="font-bold text-sm text-[#0F172A] mt-1">{t.title}</h6>
                            </div>

                            <div className="shrink-0">
                              {isSubmitted ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <Check size={11} />
                                  <span>Sudah Dikumpul</span>
                                </span>
                              ) : isOverdue ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                  <AlertTriangle size={11} />
                                  <span>Terlewat</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  Belum Dikumpul
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                            <span className="flex items-center gap-1 font-mono font-medium">
                              <Clock size={12} className="text-[#94A3B8]" />
                              <span>Batas: {t.dueTime || '23:59'} WIB</span>
                            </span>

                            <button
                              onClick={() => {
                                if (onNavigateToTask) {
                                  onNavigateToTask(t.id);
                                }
                              }}
                              className="px-3 py-1 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold hover:bg-[#1E293B] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Buka Tugas</span>
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Classes for this day of week */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <span>📚 Jadwal Kuliah ({selectedDateDayName})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100">
                      {selectedDateClasses.length}
                    </span>
                  </h5>
                </div>

                {selectedDateClasses.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[#CBD5E1] text-center space-y-1 bg-[#F8FAFC]">
                    <BookOpen size={24} className="mx-auto text-[#94A3B8]" />
                    <p className="text-xs font-semibold text-[#0F172A]">Tidak ada jadwal perkuliahan</p>
                    <p className="text-[11px] text-[#64748B]">Hari bebas kuliah atau jadwal mandiri.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDateClasses
                      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                      .map((cls) => {
                        const styles = getEventTypeStyles(cls);
                        return (
                          <div
                            key={cls.id}
                            onClick={() => setSelectedEvent(cls)}
                            className={`p-3.5 rounded-xl border transition-all space-y-1.5 cursor-pointer hover:shadow-xs ${styles.bg}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1]">
                                {cls.startTime} – {cls.endTime}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${styles.badge}`}>
                                {cls.code || cls.type}
                              </span>
                            </div>

                            <h6 className="font-bold text-sm text-[#0F172A]">{cls.title || cls.course}</h6>

                            <div className="flex items-center gap-3 text-xs opacity-85">
                              {cls.room && <span className="flex items-center gap-1"><MapPin size={12} /> {cls.room}</span>}
                              {cls.lecturer && <span className="flex items-center gap-1"><User size={12} /> {cls.lecturer}</span>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: DETAILED HOURLY TIMETABLE GRID (DYNAMIC FIT 1 SCREEN) */}
      {viewMode === 'timetable' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
          
          {/* Scrollable Container with horizontal scroll on mobile/tablet */}
          <div className="overflow-x-auto custom-scrollbar w-full">
            <div className="min-w-[880px]">
              
              {/* Table Header: Days of the Week */}
              <div className="grid grid-cols-8 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                
                {/* Top-Left Corner (Time marker label) */}
                <div className="p-2.5 border-r border-[#E2E8F0] flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                    Jam
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">WIB</span>
                </div>

                {/* 7 Days Columns */}
                {DAYS_OF_WEEK.map((dayName) => {
                  const isToday = dayName === todayDayName;
                  const dayEvents = schedules.filter(s => s.day === dayName);
                  const dayTasks = (tasks || []).filter(t => getTaskDayOfWeek(t.dueDate) === dayName);

                  return (
                    <div
                      key={dayName}
                      className={`p-2 text-center border-r border-[#E2E8F0] last:border-r-0 transition-colors ${
                        isToday ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg ${
                          isToday 
                            ? 'bg-[#0F172A] text-white shadow-2xs' 
                            : 'text-[#0F172A]'
                        }`}>
                          {dayName}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-[#64748B] block mt-0.5 font-medium">
                        {dayEvents.length} jadwal
                      </span>
                      {dayTasks.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dayTasks.length === 1) setSelectedTaskDetail(dayTasks[0]);
                            else {
                              setSelectedDay(dayName);
                              setViewMode('day');
                            }
                          }}
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200 block mt-0.5 mx-auto cursor-pointer hover:bg-rose-200 transition-colors"
                          title={`${dayTasks.length} tugas jatuh tempo pada hari ${dayName}`}
                        >
                          📝 {dayTasks.length} tugas
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Timetable Body Grid with Dynamic Screen Height */}
              <div 
                className="relative grid grid-cols-8 h-[calc(100vh-210px)] min-h-[580px] max-h-[850px]"
              >
                {/* Left Time Column (07:00, 08:00, ...) */}
                <div className="border-r border-[#E2E8F0] bg-[#F8FAFC]/60 select-none flex flex-col h-full">
                  {hoursArray.map((hr) => (
                    <div
                      key={hr}
                      className="border-b border-[#E2E8F0] flex-1 flex flex-col items-center justify-start pt-1.5 text-xs font-mono font-bold text-[#475569] relative"
                    >
                      <span>{String(hr).padStart(2, '0')}:00</span>
                      {/* :30 Subtle Marker */}
                      <span className="text-[9px] text-[#94A3B8] font-normal mt-1 opacity-60">
                        :30
                      </span>
                    </div>
                  ))}
                </div>

                {/* 7 Day Columns with Events Placed at Exact Positions */}
                {DAYS_OF_WEEK.map((dayName) => {
                  const isToday = dayName === todayDayName;
                  const dayEvents = schedules.filter(s => s.day === dayName);

                  return (
                    <div
                      key={dayName}
                      className={`relative border-r border-[#E2E8F0] last:border-r-0 flex flex-col h-full ${
                        isToday ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {/* Background Hourly & Half-Hour Grid Lines */}
                      {hoursArray.map((hr) => (
                        <div
                          key={hr}
                          onClick={() => handleOpenAddAtSlot(dayName, hr)}
                          title={isManager ? `Klik untuk tambah jadwal ${dayName} jam ${String(hr).padStart(2, '0')}:00` : ''}
                          className={`border-b border-[#E2E8F0] w-full flex-1 relative group ${
                            isManager ? 'cursor-pointer hover:bg-slate-50/80 transition-colors' : ''
                          }`}
                        >
                          {/* Half-Hour Dashed Guide Line */}
                          <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-[#F1F5F9]" />
                          
                          {/* Manager slot hover indicator */}
                          {isManager && (
                            <span className="hidden group-hover:block absolute right-1.5 top-1 text-[9px] text-[#94A3B8] font-mono">
                              + {String(hr).padStart(2, '0')}:00
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Current Time Indicator Line (Only on Today column) */}
                      {isToday && currentTimeTopPercent !== null && (
                        <div 
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                          style={{ top: `${currentTimeTopPercent}%` }}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 ring-2 ring-white" />
                          <div className="flex-1 border-b-2 border-rose-500 shadow-sm" />
                        </div>
                      )}

                      {/* Placed Schedule Event Cards */}
                      {dayEvents.map((evt) => {
                        const { top, height } = calculatePosition(evt.startTime, evt.endTime);
                        const styles = getEventTypeStyles(evt);

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(evt);
                            }}
                            className={`absolute left-1 right-1 rounded-xl p-2 sm:p-2.5 z-10 cursor-pointer transition-all overflow-hidden flex flex-col justify-between hover:z-20 hover:shadow-lg ${styles.bg}`}
                            style={{
                              top,
                              height
                            }}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 leading-none">
                                <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-tight">
                                  {evt.startTime} – {evt.endTime}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${styles.badge}`}>
                                  {evt.code || evt.type}
                                </span>
                              </div>

                              <h4 className="font-bold text-xs sm:text-[13px] leading-snug line-clamp-2 mt-0.5" title={evt.title}>
                                {evt.title}
                              </h4>
                            </div>

                            {/* Footer info (Room & Lecturer) */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] opacity-90 truncate pt-1 border-t border-black/5">
                              {evt.room && (
                                <span className="flex items-center gap-1 font-semibold truncate">
                                  <MapPin size={11} className="shrink-0 text-slate-600" />
                                  <span>Ruang {evt.room}</span>
                                </span>
                              )}
                              {evt.lecturer && (
                                <span className="flex items-center gap-1 truncate text-slate-700">
                                  <User size={11} className="shrink-0 text-slate-500" />
                                  <span>{evt.lecturer.split(',')[0]}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Timetable Footer Legend */}
          <div className="px-3 py-1.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="font-semibold text-[#0F172A]">Keterangan:</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>Mata Kuliah (Warna Berbeda)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>Tugas / Praktikum</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>Deadline / Ujian</span>
              </span>
            </div>

            {isManager && (
              <span className="text-[10px] text-[#94A3B8] italic hidden sm:inline">
                Klik slot kosong untuk tambah jadwal.
              </span>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: AGENDA DAY VIEW */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = d === selectedDay;
              const isToday = d === todayDayName;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span>{d}</span>
                  {isToday && <span className="ml-1 text-[9px] opacity-75 font-normal">(Hari Ini)</span>}
                </button>
              );
            })}
          </div>

          {/* Selected Day Agenda Timeline */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">Jadwal Hari {selectedDay}</h3>
                <p className="text-xs text-[#64748B]">Urutan perkuliahan dan agenda terorganisir per jam.</p>
              </div>
              <span className="text-xs text-[#64748B]">
                {schedules.filter(s => s.day === selectedDay).length} jadwal
              </span>
            </div>

            {/* Tasks due on this day */}
            {(() => {
              const dayTasksForDayView = (tasks || []).filter(t => getTaskDayOfWeek(t.dueDate) === selectedDay);
              if (dayTasksForDayView.length === 0) return null;
              return (
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <span>Tenggat Tugas Hari {selectedDay} ({dayTasksForDayView.length})</span>
                    </h4>
                    <span className="text-[10px] text-rose-600 font-medium hidden sm:inline">
                      Klik kartu tugas untuk lihat detail
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {dayTasksForDayView.map((t) => {
                      const isOverdue = isTaskOverdue(t.dueDate, t.dueTime);
                      const isSubmitted = hasUserSubmitted(t, currentUser);

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTaskDetail(t)}
                          className={`p-3 rounded-xl border bg-white flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                            isSubmitted
                              ? 'border-emerald-200 hover:border-emerald-400'
                              : isOverdue
                              ? 'border-rose-300 hover:border-rose-500'
                              : 'border-amber-200 hover:border-amber-400'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {t.course && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-[#475569] truncate">
                                  {t.course}
                                </span>
                              )}
                              <span className="text-[10px] text-[#64748B] font-mono">
                                🕒 {t.dueTime || '23:59'} WIB
                              </span>
                            </div>
                            <p className="font-bold text-xs text-[#0F172A] truncate">{t.title}</p>
                          </div>

                          <div className="shrink-0">
                            {isSubmitted ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Terkumpul
                              </span>
                            ) : isOverdue ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                Terlewat
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {schedules.filter(s => s.day === selectedDay).length === 0 ? (
              <div className="py-12 text-center space-y-1 text-[#64748B]">
                <p className="text-xs font-semibold text-[#0F172A]">Tidak ada jadwal perkuliahan pada hari {selectedDay}.</p>
                <p className="text-[11px]">Hari bebas kuliah atau untuk belajar mandiri / kerja kelompok.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules
                  .filter(s => s.day === selectedDay)
                  .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                  .map((evt) => {
                    const styles = getEventTypeStyles(evt);

                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${styles.bg}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1]">
                              {evt.startTime} – {evt.endTime}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${styles.badge}`}>
                              {evt.code || evt.type}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-sm text-[#0F172A]">{evt.title}</h4>
                          
                          <div className="flex items-center gap-3 text-xs opacity-85">
                            {evt.lecturer && <span className="flex items-center gap-1"><User size={12} /> {evt.lecturer}</span>}
                            {evt.room && <span className="flex items-center gap-1"><MapPin size={12} /> {evt.room}</span>}
                          </div>

                          {evt.description && (
                            <p className="text-xs text-[#64748B] pt-1 line-clamp-1 italic">
                              {evt.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          {isManager && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(evt);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Edit Jadwal"
                            >
                              <Edit2 size={12} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(evt);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                          >
                            Lihat Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: COMPACT LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">Daftar Seluruh Agenda & Jadwal</h3>
              <p className="text-xs text-[#64748B]">Daftar lengkap jadwal kelas dan tenggat tugas kuliah.</p>
            </div>

            {/* List Filter Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setListFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  listFilter === 'all' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Semua ({(schedules || []).length + (tasks || []).length})
              </button>
              <button
                onClick={() => setListFilter('schedules')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  listFilter === 'schedules' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Kuliah ({(schedules || []).length})
              </button>
              <button
                onClick={() => setListFilter('tasks')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  listFilter === 'tasks' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                Tugas ({(tasks || []).length})
              </button>
            </div>
          </div>

          {/* Tasks Section in List View */}
          {(listFilter === 'all' || listFilter === 'tasks') && (tasks || []).length > 0 && (
            <div className="space-y-2.5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <span>📝 Tenggat Tugas Kuliah ({(tasks || []).length})</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-4">
                {(tasks || [])
                  .slice()
                  .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
                  .map(t => {
                    const isOverdue = isTaskOverdue(t.dueDate, t.dueTime);
                    const isSubmitted = hasUserSubmitted(t, currentUser);

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTaskDetail(t)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
                          isSubmitted
                            ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                            : isOverdue
                            ? 'bg-rose-50/40 border-rose-300 hover:border-rose-500'
                            : 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            {t.course && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-[#CBD5E1] text-[#475569]">
                                {t.course}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-[#64748B]">
                              📅 {formatDateIndonesian(t.dueDate)} · {t.dueTime || '23:59'} WIB
                            </span>
                          </div>
                          <p className="font-bold text-xs text-[#0F172A] truncate">{t.title}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isSubmitted ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Terkumpul
                            </span>
                          ) : isOverdue ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              Terlewat
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Schedules Section in List View */}
          {(listFilter === 'all' || listFilter === 'schedules') && (
            <div className="space-y-5">
              {DAYS_OF_WEEK.map((dayName) => {
                const dayEvents = schedules
                  .filter(s => s.day === dayName)
                  .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

                if (dayEvents.length === 0) return null;

                return (
                  <div key={dayName} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">
                        {dayName} ({dayEvents.length} Jadwal)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-4">
                      {dayEvents.map(evt => (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className="p-3 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#0F172A]">
                                {evt.startTime} – {evt.endTime}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 uppercase">
                                {evt.type}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-[#0F172A] truncate mt-0.5">{evt.title}</p>
                            <p className="text-[10px] text-[#64748B] truncate">
                              {evt.room ? `📍 ${evt.room}` : ''} {evt.lecturer ? `· 👤 ${evt.lecturer}` : ''}
                            </p>
                          </div>

                          {isManager && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(evt);
                              }}
                              className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] hover:bg-white transition-colors shrink-0 cursor-pointer"
                              title="Edit Jadwal"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: EVENT DETAIL MODAL */}
      {selectedEvent && (() => {
        const selectedLecturerInfo = parseLecturerInfo(selectedEvent.lecturer, selectedEvent.description, selectedEvent.lecturerPhone);
        return (
          <ModalPortal onClose={() => setSelectedEvent(null)} maxWidth="max-w-md">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569]">
                  Detail {selectedEvent.type}
                </span>
                <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A]">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-lg text-[#0F172A] leading-snug">
                  {selectedEvent.title}
                </h3>

                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5 text-xs text-[#334155]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Hari:</span>
                    <strong className="text-[#0F172A]">{selectedEvent.day}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Jam Kuliah:</span>
                    <strong className="font-mono text-[#0F172A]">{selectedEvent.startTime} – {selectedEvent.endTime} WIB</strong>
                  </div>
                  {selectedEvent.room && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Ruangan:</span>
                      <strong className="text-[#0F172A]">{selectedEvent.room}</strong>
                    </div>
                  )}
                  {selectedEvent.lecturer && (
                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/50">
                      <span className="text-[#64748B] shrink-0">Dosen:</span>
                      <div className="text-right">
                        <strong className="text-[#0F172A] block">{selectedLecturerInfo.lecturerName || selectedEvent.lecturer}</strong>
                        {selectedLecturerInfo.lecturerRole && (
                          <span className="text-[10px] text-slate-500 font-medium">({selectedLecturerInfo.lecturerRole})</span>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedLecturerInfo.lecturerPhone && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Phone size={13} className="text-emerald-600 shrink-0" />
                        <span className="font-mono text-[#0F172A] font-bold">{selectedLecturerInfo.lecturerPhone}</span>
                      </div>
                      {selectedLecturerInfo.cleanPhone && (
                        <a
                          href={`https://wa.me/${selectedLecturerInfo.cleanPhone}?text=${encodeURIComponent(`Halo Bapak/Ibu ${selectedLecturerInfo.lecturerName || 'Dosen'}, saya mahasiswa kelas ${currentClass?.name || 'ini'} terkait perkuliahan ${selectedEvent.title}...`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                        >
                          <MessageCircle size={12} />
                          <span>Chat WA</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#0F172A]">Catatan Tambahan:</span>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155] whitespace-pre-wrap">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                {isManager ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(selectedEvent)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit2 size={13} />
                      <span>Edit Jadwal</span>
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </div>
                ) : <div />}

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* MODAL: TASK DETAIL MODAL WITHIN SCHEDULE */}
      {selectedTaskDetail && (
        <ModalPortal onClose={() => setSelectedTaskDetail(null)} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <span>📝 Detail Tugas Kuliah</span>
              </span>
              <button onClick={() => setSelectedTaskDetail(null)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {selectedTaskDetail.course && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 inline-block">
                  {selectedTaskDetail.course}
                </span>
              )}

              <h3 className="font-bold text-lg text-[#0F172A] leading-snug">
                {selectedTaskDetail.title}
              </h3>

              {/* Status and Deadline Card */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5 text-xs text-[#334155]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Tenggat Waktu:</span>
                  <strong className="text-[#0F172A] font-mono">
                    {formatDateIndonesian(selectedTaskDetail.dueDate)} · {selectedTaskDetail.dueTime || '23:59'} WIB
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Status Kamu:</span>
                  {hasUserSubmitted(selectedTaskDetail, currentUser) ? (
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>Sudah Dikumpulkan</span>
                    </span>
                  ) : isTaskOverdue(selectedTaskDetail.dueDate, selectedTaskDetail.dueTime) ? (
                    <span className="font-bold text-rose-600 flex items-center gap-1">
                      <AlertTriangle size={13} />
                      <span>Melewati Deadline (Terlewat)</span>
                    </span>
                  ) : (
                    <span className="font-bold text-amber-600">
                      Belum Mengumpulkan
                    </span>
                  )}
                </div>
              </div>

              {/* Description / Instructions if available */}
              {(selectedTaskDetail.description || selectedTaskDetail.instructions) && (
                <div className="space-y-1 pt-1">
                  <span className="text-xs font-semibold text-[#64748B]">Deskripsi & Petunjuk:</span>
                  <p className="text-xs text-[#334155] p-3 rounded-xl bg-slate-50 border border-slate-200/70 whitespace-pre-line max-h-36 overflow-y-auto">
                    {selectedTaskDetail.description || selectedTaskDetail.instructions}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>

              <button
                onClick={() => {
                  const id = selectedTaskDetail.id;
                  setSelectedTaskDetail(null);
                  if (onNavigateToTask) {
                    onNavigateToTask(id);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Buka di Halaman Tugas</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: ADD / EDIT EVENT MODAL (Komti / Dosen) */}
      {showAddModal && (
        <ModalPortal onClose={() => { setShowAddModal(false); setEditingSchedule(null); }} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">
                  {editingSchedule ? 'Edit Jadwal Kuliah' : 'Tambah Jadwal Kuliah'}
                </h3>
                {editingSchedule && (
                  <p className="text-[11px] text-[#64748B]">Perbarui informasi slot mata kuliah atau agenda</p>
                )}
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditingSchedule(null); }} 
                className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Mata Kuliah / Judul Agenda</label>
                <input
                  type="text"
                  placeholder="e.g. Pemrograman Berorientasi Objek"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Tipe Agenda</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all cursor-pointer"
                  >
                    <option value="class">Kuliah (Class)</option>
                    <option value="assignment">Tugas / Praktikum</option>
                    <option value="deadline">Deadline / Ujian</option>
                    <option value="other">Agenda Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Hari</label>
                  <select
                    value={eventDay}
                    onChange={(e) => setEventDay(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all cursor-pointer"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Jam Mulai</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Jam Selesai</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Ruangan / Lab</label>
                <input
                  type="text"
                  placeholder="e.g. Lab Komputer 2"
                  value={eventRoom}
                  onChange={(e) => setEventRoom(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Dosen Pengampu</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Budi Santoso, M.Kom."
                    value={eventLecturer}
                    onChange={(e) => setEventLecturer(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155] flex items-center justify-between">
                    <span>No. WhatsApp Dosen</span>
                    <span className="text-[10px] text-[#64748B] font-normal">Opsional</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="tel"
                      placeholder="e.g. 081234567890"
                      value={eventLecturerPhone}
                      onChange={(e) => setEventLecturerPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Membawa laptop dan install Node.js..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingSchedule(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors cursor-pointer"
                >
                  {editingSchedule ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
