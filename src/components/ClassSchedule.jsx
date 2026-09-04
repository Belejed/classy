import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
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
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const START_HOUR = 6;  // 06:00
const END_HOUR = 21;   // 21:00
const HOURS_ARRAY = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 68; // px per hour

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

export default function ClassSchedule({
  currentClass,
  currentUser,
  schedules = [],
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onNavigateToTask
}) {
  const [viewMode, setViewMode] = useState('timetable'); // 'timetable' | 'day' | 'list'
  
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
  const [eventDesc, setEventDesc] = useState('');

  const role = currentClass?.userRole;
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  // Real-time current time indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isWithinScheduleHours = currentHour >= START_HOUR && currentHour <= END_HOUR;
  const currentTimeTop = isWithinScheduleHours 
    ? ((currentHour - START_HOUR) + currentMinute / 60) * HOUR_HEIGHT 
    : null;

  // Calculate top offset and height for events on the time grid
  const calculatePosition = (startTimeStr, endTimeStr) => {
    const [rawStartH, rawStartM] = String(startTimeStr || '08:00').split(':').map(Number);
    const [rawEndH, rawEndM] = String(endTimeStr || '09:40').split(':').map(Number);

    const startH = isNaN(rawStartH) ? 8 : rawStartH;
    const startM = isNaN(rawStartM) ? 0 : rawStartM;
    const endH = isNaN(rawEndH) ? 10 : rawEndH;
    const endM = isNaN(rawEndM) ? 0 : rawEndM;

    const startMinutes = Math.max(startH * 60 + startM, START_HOUR * 60);
    const endMinutes = Math.min(endH * 60 + endM, (END_HOUR + 1) * 60);

    const topOffsetMinutes = startMinutes - (START_HOUR * 60);
    const durationMinutes = Math.max(endMinutes - startMinutes, 30); // minimum 30 min height

    const top = (topOffsetMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 34);

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
    setEventLecturer(schedule.lecturer || '');
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
    <div className="space-y-6 font-sans">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Class Schedule</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              07:00 – 21:00
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Jadwal perkuliahan mingguan detail dengan slot jam, ruang kuliah, dan dosen pengampu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setViewMode('timetable')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'timetable' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Grid Jam Lengkap"
            >
              Timetable Jam
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'day' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Agenda Harian"
            >
              Harian
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
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

      {/* VIEW 1: DETAILED HOURLY TIMETABLE GRID */}
      {viewMode === 'timetable' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
          
          {/* Scrollable Container with horizontal scroll on mobile/tablet */}
          <div className="overflow-x-auto custom-scrollbar w-full">
            <div className="min-w-[840px]">
              
              {/* Table Header: Days of the Week */}
              <div className="grid grid-cols-8 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                
                {/* Top-Left Corner (Time marker label) */}
                <div className="p-3 border-r border-[#E2E8F0] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Jam
                  </span>
                  <span className="text-[9px] text-[#CBD5E1]">WIB</span>
                </div>

                {/* 7 Days Columns */}
                {DAYS_OF_WEEK.map((dayName) => {
                  const isToday = dayName === todayDayName;
                  const dayEvents = schedules.filter(s => s.day === dayName);

                  return (
                    <div
                      key={dayName}
                      className={`p-2.5 text-center border-r border-[#E2E8F0] last:border-r-0 transition-colors ${
                        isToday ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                          isToday 
                            ? 'bg-[#0F172A] text-white shadow-2xs' 
                            : 'text-[#0F172A]'
                        }`}>
                          {dayName}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#64748B] block mt-1 font-medium">
                        {dayEvents.length} jadwal
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Timetable Body Grid with Hourly Rows */}
              <div 
                className="relative grid grid-cols-8"
                style={{ height: `${HOURS_ARRAY.length * HOUR_HEIGHT}px` }}
              >
                {/* Left Time Column (07:00, 08:00, ... 21:00) */}
                <div className="border-r border-[#E2E8F0] bg-[#F8FAFC]/60 select-none">
                  {HOURS_ARRAY.map((hr) => (
                    <div
                      key={hr}
                      className="border-b border-[#E2E8F0] flex flex-col items-center justify-start pt-1.5 text-[11px] font-mono font-bold text-[#64748B] relative"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span>{String(hr).padStart(2, '0')}:00</span>
                      {/* :30 Subtle Marker */}
                      <span className="text-[9px] text-[#94A3B8] font-normal mt-3 opacity-60">
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
                      className={`relative border-r border-[#E2E8F0] last:border-r-0 ${
                        isToday ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {/* Background Hourly & Half-Hour Grid Lines */}
                      {HOURS_ARRAY.map((hr) => (
                        <div
                          key={hr}
                          onClick={() => handleOpenAddAtSlot(dayName, hr)}
                          title={isManager ? `Klik untuk tambah jadwal ${dayName} jam ${String(hr).padStart(2, '0')}:00` : ''}
                          className={`border-b border-[#E2E8F0] w-full relative group ${
                            isManager ? 'cursor-pointer hover:bg-slate-50/80 transition-colors' : ''
                          }`}
                          style={{ height: `${HOUR_HEIGHT}px` }}
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
                      {isToday && currentTimeTop !== null && (
                        <div 
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                          style={{ top: `${currentTimeTop}px` }}
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500 -ml-1 ring-2 ring-white" />
                          <div className="flex-1 border-b-2 border-rose-500" />
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
                            className={`absolute left-1 right-1 rounded-xl p-2 z-10 cursor-pointer transition-all overflow-hidden flex flex-col justify-between ${styles.bg}`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`
                            }}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center justify-between gap-1 leading-none">
                                <span className="font-mono text-[9px] font-bold tracking-tight">
                                  {evt.startTime} – {evt.endTime}
                                </span>
                                <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase shrink-0 ${styles.badge}`}>
                                  {evt.code || evt.type}
                                </span>
                              </div>

                              <h4 className="font-bold text-[11px] leading-snug truncate" title={evt.title}>
                                {evt.title}
                              </h4>
                            </div>

                            {/* Footer info (Room / Lecturer) only if slot is tall enough */}
                            {height >= 50 && (
                              <div className="flex items-center gap-2 text-[9px] opacity-85 truncate pt-0.5">
                                {evt.room && (
                                  <span className="flex items-center gap-0.5 truncate">
                                    <MapPin size={9} />
                                    {evt.room}
                                  </span>
                                )}
                                {evt.lecturer && (
                                  <span className="flex items-center gap-0.5 truncate">
                                    <User size={9} />
                                    {evt.lecturer}
                                  </span>
                                )}
                              </div>
                            )}
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
          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="font-semibold text-[#0F172A]">Keterangan:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span>Mata Kuliah (Warna Berbeda)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span>Tugas / Praktikum</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>Deadline / Ujian</span>
              </span>
            </div>

            {isManager && (
              <span className="text-[11px] text-[#94A3B8] italic">
                Tip: Klik pada slot kosong untuk langsung menambah jadwal.
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
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-6">
          <div className="pb-2 border-b border-[#F1F5F9]">
            <h3 className="font-bold text-sm text-[#0F172A]">Daftar Seluruh Jadwal Perkuliahan</h3>
            <p className="text-xs text-[#64748B]">Daftar lengkap jadwal kelas terkelompok berdasarkan hari.</p>
          </div>

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
        </div>
      )}

      {/* MODAL 1: EVENT DETAIL MODAL */}
      {selectedEvent && (
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

              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs text-[#334155]">
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
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Dosen Pengampu:</span>
                    <strong className="text-[#0F172A]">{selectedEvent.lecturer}</strong>
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

              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Dosen Pengampu</label>
                  <input
                    type="text"
                    placeholder="e.g. Pak Budi"
                    value={eventLecturer}
                    onChange={(e) => setEventLecturer(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
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
