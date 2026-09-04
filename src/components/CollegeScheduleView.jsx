import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  Download, 
  Send, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Video,
  Layers,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportSchedulesToIcs } from '../utils/googleCalendar';

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const START_HOUR = 7; // 07:00
const END_HOUR = 21;  // 21:00
const HOURS_ARRAY = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 70; // 70px per 1-hour slot

export default function CollegeScheduleView({
  schedules = [],
  onSaveSchedules,
  personalSchedules = [],
  sharedSchedules = [],
  onSavePersonalSchedules,
  isPersonalSpace = false,
  workspaceName = 'Academic Workspace'
}) {
  const [viewMode, setViewMode] = useState('week'); // 'today' | 'week' | 'month'
  const [scheduleSourceFilter, setScheduleSourceFilter] = useState('combined'); // 'current' | 'personal' | 'combined'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState(null);

  // Form State
  const [subject, setSubject] = useState('');
  const [code, setCode] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [day, setDay] = useState('Senin');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [sks, setSks] = useState(3);
  const [colorTag, setColorTag] = useState('yellow');
  const [notes, setNotes] = useState('');

  // Determine current day & time
  const todayIndex = (new Date().getDay() + 6) % 7; // 0: Senin, 6: Minggu
  const currentDayName = DAYS_OF_WEEK[todayIndex] || 'Senin';

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Active Display Schedules based on source filter
  const displaySchedules = useMemo(() => {
    if (scheduleSourceFilter === 'personal') {
      return (personalSchedules || []).map(s => ({ ...s, isPersonalItem: true }));
    }
    if (scheduleSourceFilter === 'combined') {
      const pItems = (personalSchedules || []).map(s => ({ ...s, isPersonalItem: true }));
      const wItems = (schedules || []).map(s => ({ ...s, isPersonalItem: isPersonalSpace }));
      const sItems = (sharedSchedules || []).map(s => ({ ...s, isPersonalItem: false, isSharedWorkspaceClass: true }));
      const map = new Map();
      [...sItems, ...wItems, ...pItems].forEach(item => {
        if (item && item.subject) {
          const key = `${item.subject}_${item.day}_${item.startTime}`;
          if (!map.has(key)) map.set(key, item);
        }
      });
      return Array.from(map.values());
    }
    return (schedules || []).map(s => ({ ...s, isPersonalItem: isPersonalSpace }));
  }, [scheduleSourceFilter, schedules, personalSchedules, sharedSchedules, isPersonalSpace]);

  // Color mappings based on Reference Image 2 pastel palette
  const pastelColorClasses = {
    yellow: 'bg-pastel-yellow border-[#181818]/20 text-[#181818]',
    pink: 'bg-pastel-pink border-[#181818]/20 text-[#181818]',
    blue: 'bg-pastel-blue border-[#181818]/20 text-[#181818]',
    purple: 'bg-pastel-purple border-[#181818]/20 text-[#181818]',
    green: 'bg-pastel-green border-[#181818]/20 text-[#181818]',
    cream: 'bg-[#EDE6D8] dark:bg-[#252528] border-[#181818]/15 text-[#181818] dark:text-white'
  };

  const calculatePosition = (startTimeStr, endTimeStr) => {
    const [startH, startM] = (startTimeStr || '08:00').split(':').map(Number);
    const [endH, endM] = (endTimeStr || '10:00').split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const gridStartMin = START_HOUR * 60;
    const top = Math.max(0, ((startMin - gridStartMin) / 60) * HOUR_HEIGHT);
    const height = Math.max(50, ((endMin - startMin) / 60) * HOUR_HEIGHT);
    return { top, height };
  };

  const currentTimeTop = ((currentTimeInMinutes - (START_HOUR * 60)) / 60) * HOUR_HEIGHT;
  const isTimeInGridRange = currentHours >= START_HOUR && currentHours <= END_HOUR;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim()) return;

    const isPersonalTarget = editingSchedule?.isPersonalItem || scheduleSourceFilter === 'personal' || isPersonalSpace;

    const newScheduleItem = {
      id: editingSchedule ? editingSchedule.id : 'sch_' + Math.random().toString(36).substr(2, 9),
      subject: subject.trim(),
      code: code.trim().toUpperCase(),
      lecturer: lecturer.trim(),
      day,
      startTime,
      endTime,
      room: room.trim(),
      sks: Number(sks) || 0,
      colorTag,
      notes: notes.trim(),
      isPersonalItem: isPersonalTarget,
      updatedAt: new Date().toISOString()
    };

    if (isPersonalTarget && onSavePersonalSchedules) {
      const updated = editingSchedule
        ? personalSchedules.map(s => s.id === editingSchedule.id ? newScheduleItem : s)
        : [...personalSchedules, newScheduleItem];
      onSavePersonalSchedules(updated);
      toast.success('Jadwal tersimpan di Personal Schedule! ✨');
    } else {
      const updated = editingSchedule
        ? schedules.map(s => s.id === editingSchedule.id ? newScheduleItem : s)
        : [...schedules, newScheduleItem];
      onSaveSchedules(updated);
      toast.success('Jadwal tersimpan di Workspace! 🎓');
    }

    setShowAddModal(false);
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = (id, isPersonalItem) => {
    if (window.confirm('Hapus jadwal ini?')) {
      if (isPersonalItem && onSavePersonalSchedules) {
        onSavePersonalSchedules(personalSchedules.filter(s => s.id !== id));
      } else {
        onSaveSchedules(schedules.filter(s => s.id !== id));
      }
      setSelectedScheduleDetail(null);
      toast.success('Jadwal dihapus.');
    }
  };

  return (
    <div className="w-full space-y-5 pb-12 text-[#181818] dark:text-[#EDE8DF]">
      
      {/* 1. Header (Reference Image 2 Top Section) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#181818] dark:text-white">
            Your Schedule
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-3 py-1 rounded-full bg-[#181818] text-white text-xs font-bold font-mono">
              September 1 – September 7
            </span>
            <span className="text-xs text-[#6F6A63] font-semibold">
              {displaySchedules.length} scheduled items
            </span>
          </div>
        </div>

        {/* Top Controls: Source Filter, View Capsule, Add Event */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Source Filter Capsule */}
          <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 text-xs font-bold shadow-xs">
            <button
              onClick={() => setScheduleSourceFilter('combined')}
              className={`px-3 py-1 rounded-full transition-all ${
                scheduleSourceFilter === 'combined'
                  ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818]'
                  : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setScheduleSourceFilter('personal')}
              className={`px-3 py-1 rounded-full transition-all ${
                scheduleSourceFilter === 'personal'
                  ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818]'
                  : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setScheduleSourceFilter('current')}
              className={`px-3 py-1 rounded-full transition-all ${
                scheduleSourceFilter === 'current'
                  ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818]'
                  : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
              }`}
            >
              Workspace
            </button>
          </div>

          {/* View Mode Capsule: Today | Week */}
          <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 text-xs font-bold shadow-xs">
            {['today', 'week'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-full capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818]'
                    : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Add Event Button (Black Pill) */}
          <button
            onClick={() => {
              setEditingSchedule(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Add event
          </button>

          {/* Export GCal button */}
          <button
            onClick={() => {
              exportSchedulesToIcs(workspaceName, displaySchedules);
              toast.success('Calendar .ics downloaded!');
            }}
            className="p-2 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 text-[#181818] dark:text-white hover:bg-cream-muted transition-colors shadow-xs"
            title="Download .ics for Google Calendar"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: TODAY FOCUSED AGENDA VIEW */}
      {viewMode === 'today' && (
        <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/10 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#181818]/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#181818] text-white font-black text-xs">
                HARI INI: {currentDayName.toUpperCase()}
              </span>
              <span className="text-xs text-[#6F6A63] font-bold">
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-pastel-pink text-[#181818]">
              {displaySchedules.filter(s => s.day === currentDayName).length} Kelas Terjadwal
            </span>
          </div>

          {displaySchedules.filter(s => s.day === currentDayName).length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6F6A63] space-y-2 border border-dashed border-[#181818]/15 rounded-3xl">
              <Clock size={36} className="mx-auto opacity-30 text-[#181818] dark:text-white" />
              <p className="font-bold text-sm text-[#181818] dark:text-white">
                Tidak ada jadwal kuliah untuk hari {currentDayName}.
              </p>
              <p>Gunakan tombol "+ Add event" di kanan atas untuk menambahkan kegiatan hari ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displaySchedules
                .filter(s => s.day === currentDayName)
                .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                .map((sch) => {
                  const colorClass = pastelColorClasses[sch.colorTag] || pastelColorClasses.yellow;
                  return (
                    <div
                      key={sch.id}
                      onClick={() => setSelectedScheduleDetail(sch)}
                      className={`p-5 rounded-[24px] border border-[#181818]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all ${colorClass}`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-[#181818] text-white">
                            {sch.startTime} - {sch.endTime}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10">
                            {sch.sks || 3} SKS
                          </span>
                          {sch.isPersonalItem ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10">
                              👤 Personal
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10">
                              🎓 {sch.workspaceName || 'Workspace'}
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-black text-base text-[#181818] leading-tight">
                          {sch.subject}
                        </h4>

                        <div className="flex items-center gap-3 text-xs opacity-90">
                          <span>👤 {sch.lecturer || 'Dosen Pengampu'}</span>
                          <span>📍 {sch.room || 'Ruang Kuliah'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success(`Opening session: ${sch.subject}`);
                          }}
                          className="px-4 py-2 rounded-full bg-[#181818] text-white text-xs font-bold shadow-xs hover:opacity-90"
                        >
                          Join Session
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSchedule(sch);
                            setSubject(sch.subject || '');
                            setCode(sch.code || '');
                            setLecturer(sch.lecturer || '');
                            setDay(sch.day || 'Senin');
                            setStartTime(sch.startTime || '08:00');
                            setEndTime(sch.endTime || '10:00');
                            setRoom(sch.room || '');
                            setSks(sch.sks || 3);
                            setColorTag(sch.colorTag || 'yellow');
                            setNotes(sch.notes || '');
                            setShowAddModal(true);
                          }}
                          className="p-2 rounded-full border border-[#181818]/15 hover:bg-black/5"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: 7-DAY WEEKLY TIMETABLE (Exact Layout of Reference Image 2) */}
      {viewMode === 'week' && (
        <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/10 shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto custom-scrollbar w-full">
            <div className="w-full min-w-[780px]">
              
              {/* Header Columns (Days with Active Black Pill for Today) */}
              <div className="grid grid-cols-8 border-b border-[#181818]/10 dark:border-white/10 bg-[#F7F2E8] dark:bg-[#141414]">
                
                {/* Leftmost Time axis corner */}
                <div className="p-3 border-r border-[#181818]/10 dark:border-white/10 text-center text-[10px] font-black text-[#6F6A63] uppercase tracking-wider flex items-center justify-center">
                  W 36
                </div>

                {/* 7 Days Headers */}
                {DAYS_OF_WEEK.map((d, index) => {
                  const isToday = d === currentDayName;
                  const dayClassCount = displaySchedules.filter(s => s.day === d).length;
                  const dateNum = index + 1;

                  return (
                    <div 
                      key={d}
                      className={`p-2.5 text-center border-r border-[#181818]/10 dark:border-white/10 last:border-r-0 transition-colors ${
                        isToday ? 'bg-cream-muted dark:bg-white/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <span className={`text-xs font-black font-display px-3 py-1 rounded-full transition-all ${
                          isToday 
                            ? 'bg-[#181818] text-white shadow-xs' 
                            : 'text-[#181818] dark:text-[#EDE8DF]'
                        }`}>
                          {d.slice(0, 3).toUpperCase()} {String(dateNum).padStart(2, '0')}/09
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6F6A63] font-semibold mt-1 block">
                        {dayClassCount} {dayClassCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Timetable Body Grid */}
              <div 
                className="relative grid grid-cols-8"
                style={{ height: `${HOURS_ARRAY.length * HOUR_HEIGHT}px` }}
              >
                {/* Left Time Column (07:00, 07:30, 08:00...) */}
                <div className="border-r border-[#181818]/10 dark:border-white/10 bg-[#F7F2E8]/40 dark:bg-[#141414]/40 flex flex-col">
                  {HOURS_ARRAY.map((hr) => (
                    <div 
                      key={hr}
                      className="border-b border-[#181818]/5 dark:border-white/5 flex flex-col items-center justify-start pt-1 text-[11px] font-mono font-bold text-[#6F6A63]"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span>{String(hr).padStart(2, '0')}:00</span>
                      <span className="text-[9px] opacity-40 mt-3 font-normal">30</span>
                    </div>
                  ))}
                </div>

                {/* 7 Columns for Days */}
                {DAYS_OF_WEEK.map((dayName) => {
                  const dayClasses = displaySchedules.filter(s => s.day === dayName);
                  const isToday = dayName === currentDayName;

                  return (
                    <div 
                      key={dayName}
                      className={`relative border-r border-[#181818]/10 dark:border-white/10 last:border-r-0 ${
                        isToday ? 'bg-[#181818]/2 dark:bg-white/2' : ''
                      }`}
                    >
                      {/* Hourly Horizontal Lines */}
                      {HOURS_ARRAY.map((hr) => (
                        <div 
                          key={hr}
                          className="border-b border-[#181818]/5 dark:border-white/5 w-full"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        />
                      ))}

                      {/* Live Current Time Dashed Line (Image 2 signature feature) */}
                      {isToday && isTimeInGridRange && (
                        <div 
                          className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                          style={{ top: `${currentTimeTop}px` }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-pastel-pink border-2 border-[#181818] -ml-1 shadow-sm" />
                          <div className="flex-1 border-t-2 border-dashed border-pastel-pink shadow-xs" />
                        </div>
                      )}

                      {/* Event Blocks (Intelly Pastel Blocks) */}
                      {dayClasses.map((sch) => {
                        const { top, height } = calculatePosition(sch.startTime, sch.endTime);
                        const colorClass = pastelColorClasses[sch.colorTag] || pastelColorClasses.yellow;

                        return (
                          <div
                            key={sch.id}
                            onClick={() => setSelectedScheduleDetail(sch)}
                            style={{ 
                              top: `${top + 3}px`, 
                              height: `${height - 6}px`,
                              left: '4px',
                              right: '4px'
                            }}
                            className={`absolute z-10 rounded-[18px] p-2.5 border cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between overflow-hidden shadow-xs ${colorClass}`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-black opacity-90">
                                  {sch.startTime} – {sch.endTime}
                                </span>
                                {sch.isPersonalItem ? (
                                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-black/10">
                                    Personal
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-black/10">
                                    🎓 Workspace
                                  </span>
                                )}
                              </div>

                              <h4 className="font-display font-black text-xs leading-snug line-clamp-2">
                                {sch.subject}
                              </h4>
                            </div>

                            <div className="space-y-1 pt-1">
                              <p className="text-[10px] font-medium opacity-80 truncate flex items-center gap-1">
                                <MapPin size={10} className="shrink-0" />
                                {sch.room || 'Online / Lab'}
                              </p>

                              <div className="flex items-center justify-between gap-1 pt-0.5">
                                {/* Small Avatars Stack */}
                                <div className="flex items-center -space-x-1">
                                  <span className="w-4 h-4 rounded-full bg-[#181818] text-white text-[8px] font-bold flex items-center justify-center">
                                    {sch.lecturer ? sch.lecturer[0] : 'A'}
                                  </span>
                                  <span className="w-4 h-4 rounded-full bg-white text-[#181818] text-[8px] font-bold flex items-center justify-center border border-[#181818]/20">
                                    +2
                                  </span>
                                </div>

                                {/* Join / Action Pill */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.success(`Opening session: ${sch.subject}`);
                                  }}
                                  className="px-2 py-0.5 rounded-full bg-[#181818] text-white text-[9px] font-bold shadow-xs hover:opacity-80"
                                >
                                  Join
                                </button>
                              </div>
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
        </div>
      )}



      {/* 3. Modal: Add / Edit Schedule Item */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 rounded-[32px] w-full max-w-md shadow-2xl p-6 space-y-4 text-[#181818] dark:text-[#EDE8DF]">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#181818]/10 dark:border-white/10">
              <h3 className="font-display font-bold text-sm">
                {editingSchedule ? 'Edit Schedule Item' : 'Add New Schedule Item'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#6F6A63]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#6F6A63] uppercase text-[10px]">Title / Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Database Systems, Gym, or UI/UX Sprint"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl px-3.5 py-2.5 font-bold outline-none text-[#181818] dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#6F6A63] uppercase text-[10px]">Day of Week</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl px-3 py-2 font-bold outline-none text-[#181818] dark:text-white"
                  >
                    {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#6F6A63] uppercase text-[10px]">Color Theme</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {['yellow', 'pink', 'blue', 'green', 'purple'].map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColorTag(col)}
                        className={`w-6 h-6 rounded-full border border-[#181818]/20 transition-all ${
                          colorTag === col ? 'ring-2 ring-[#181818] scale-110' : ''
                        } ${col === 'yellow' ? 'bg-pastel-yellow' : col === 'pink' ? 'bg-pastel-pink' : col === 'blue' ? 'bg-pastel-blue' : col === 'green' ? 'bg-pastel-green' : 'bg-pastel-purple'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#6F6A63] uppercase text-[10px]">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl px-3 py-2 font-mono font-bold outline-none text-[#181818] dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#6F6A63] uppercase text-[10px]">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl px-3 py-2 font-mono font-bold outline-none text-[#181818] dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#6F6A63] uppercase text-[10px]">Room / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 2, Room A-204, or Zoom"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl px-3.5 py-2 outline-none text-[#181818] dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] font-bold text-xs hover:opacity-90 transition-opacity shadow-xs mt-2"
              >
                Save to Schedule
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 4. Schedule Item Detail Modal */}
      {selectedScheduleDetail && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 rounded-[32px] w-full max-w-sm shadow-2xl p-6 space-y-4 text-[#181818] dark:text-[#EDE8DF]">
            
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10 dark:border-white/10">
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                selectedScheduleDetail.isPersonalItem ? 'bg-pastel-purple text-[#181818]' : 'bg-pastel-yellow text-[#181818]'
              }`}>
                {selectedScheduleDetail.isPersonalItem ? 'Personal Item' : 'Workspace Class'}
              </span>

              <button onClick={() => setSelectedScheduleDetail(null)} className="p-1 text-[#6F6A63]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-lg text-[#181818] dark:text-white leading-tight">
                {selectedScheduleDetail.subject}
              </h3>
              <p className="text-xs font-mono font-bold text-[#6F6A63]">
                ⏰ {selectedScheduleDetail.day}, {selectedScheduleDetail.startTime} - {selectedScheduleDetail.endTime}
              </p>
              {selectedScheduleDetail.room && (
                <p className="text-xs text-[#6F6A63]">
                  📍 {selectedScheduleDetail.room}
                </p>
              )}
              {selectedScheduleDetail.lecturer && (
                <p className="text-xs text-[#6F6A63]">
                  👨‍🏫 {selectedScheduleDetail.lecturer}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#181818]/10 dark:border-white/10">
              <button
                onClick={() => handleDeleteSchedule(selectedScheduleDetail.id, selectedScheduleDetail.isPersonalItem)}
                className="flex-1 py-2 rounded-full border border-rose-500/30 text-rose-600 text-xs font-bold hover:bg-rose-500/10 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedScheduleDetail(null)}
                className="flex-1 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold"
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
