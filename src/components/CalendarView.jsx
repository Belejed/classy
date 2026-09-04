import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  CheckCircle2,
  MapPin,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CalendarView({
  events = [],
  onSaveEvents,
  schedules = [],
  personalSchedules = [],
  sharedSchedules = [],
  tasks = []
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [sourceFilter, setSourceFilter] = useState('All'); // 'All' | 'Personal' | 'Classes' | 'Tasks'
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('10:00');
  const [eventColor, setEventColor] = useState('yellow');

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const indonesianDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = () => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = () => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 for Monday
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Combine items for the selected day
  const selectedDateObj = new Date(selectedDateStr);
  const selectedDayIndex = (selectedDateObj.getDay() + 6) % 7;
  const selectedDayName = indonesianDays[selectedDayIndex];

  // Combine and deduplicate all classes from personal and shared workspaces
  const allAvailableClasses = React.useMemo(() => {
    const rawList = [...schedules, ...personalSchedules, ...sharedSchedules];
    const uniqueMap = new Map();
    rawList.forEach(s => {
      if (s && s.subject) {
        const key = `${s.subject}_${s.day}_${s.startTime}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, s);
        }
      }
    });
    return Array.from(uniqueMap.values());
  }, [schedules, personalSchedules, sharedSchedules]);

  // Map schedules to date items
  const classesForSelectedDay = allAvailableClasses.filter(s => s.day === selectedDayName).map(s => ({
    id: 'class_' + (s.id || Math.random().toString()),
    title: s.subject,
    time: s.startTime,
    type: 'class',
    location: s.room,
    workspaceName: s.workspaceName || 'Kelas Kuliah',
    color: s.colorTag || 'yellow'
  }));

  // Tasks due on selected date
  const tasksForSelectedDate = tasks.filter(t => t.dueDate === selectedDateStr).map(t => ({
    id: 'task_' + t.id,
    title: t.title,
    time: t.dueTime || '23:59',
    type: 'task',
    color: 'pink'
  }));

  // Custom events
  const customEventsForDate = events.filter(e => e.date === selectedDateStr).map(e => ({
    ...e,
    type: 'event'
  }));

  const combinedItems = [
    ...classesForSelectedDay,
    ...tasksForSelectedDate,
    ...customEventsForDate
  ].filter(item => {
    if (sourceFilter === 'Classes') return item.type === 'class';
    if (sourceFilter === 'Tasks') return item.type === 'task';
    if (sourceFilter === 'Personal') return item.type === 'event';
    return true;
  }).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEv = {
      id: 'ev_' + Date.now().toString(36),
      title: eventTitle.trim(),
      date: selectedDateStr,
      time: eventTime,
      color: eventColor
    };

    if (onSaveEvents) {
      onSaveEvents([...events, newEv]);
    }
    toast.success('Acara kalender tersimpan!');
    setEventTitle('');
    setShowAddModal(false);
  };

  const handleDeleteEvent = (id) => {
    if (onSaveEvents) {
      onSaveEvents(events.filter(e => e.id !== id));
      toast.success('Acara dihapus.');
    }
  };

  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();

  return (
    <div className="w-full space-y-6 pb-12 text-[#181818] dark:text-[#EDE8DF]">
      
      {/* Header with Title & Source Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#181818] dark:text-white">
            Personal Calendar
          </h2>
          <p className="text-xs text-[#6F6A63] font-medium mt-0.5">
            Unified view of classes, personal events, and task deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Chips */}
          <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 text-xs font-bold shadow-xs">
            {['All', 'Classes', 'Tasks', 'Personal'].map((f) => (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                className={`px-3 py-1 rounded-full transition-all ${
                  sourceFilter === f
                    ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818]'
                    : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Add event
          </button>
        </div>
      </div>

      {/* Grid: 8 Cols Month Calendar + 4 Cols Selected Day Agenda */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Month Calendar Grid (8 cols) */}
        <div className="xl:col-span-8 bg-white dark:bg-[#1C1C1E] p-6 rounded-[28px] border border-[#181818]/15 dark:border-white/10 shadow-sm space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-lg text-[#181818] dark:text-white">
              {monthNames[month]} {year}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full border border-[#181818]/15 flex items-center justify-center hover:bg-cream-muted text-[#6F6A63]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full border border-[#181818]/15 flex items-center justify-center hover:bg-cream-muted text-[#6F6A63]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 text-center text-xs font-black text-[#6F6A63] uppercase border-b border-[#181818]/10 pb-2">
            {dayNames.map(d => <span key={d}>{d}</span>)}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots before first day */}
            {[...Array(firstDay)].map((_, i) => (
              <div key={'empty_' + i} className="h-20 rounded-2xl bg-cream/40 dark:bg-white/2" />
            ))}

            {/* Month Days */}
            {[...Array(daysInMonth)].map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              // Compute real event existence for this date
              const dayDateObj = new Date(year, month, dayNum);
              const dayIndex = (dayDateObj.getDay() + 6) % 7;
              const dayName = indonesianDays[dayIndex];

              const hasClass = allAvailableClasses.some(c => c.day === dayName);
              const hasTask = tasks.some(t => t.dueDate === dateStr && !t.completed);
              const hasEvent = events.some(e => e.date === dateStr);

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-20 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cream-muted dark:bg-white/10 border-[#181818] dark:border-white shadow-xs'
                      : 'bg-[#F7F2E8]/40 dark:bg-[#141414]/40 border-[#181818]/10 hover:border-[#181818]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isToday ? 'bg-pastel-pink text-[#181818]' : 'text-[#181818] dark:text-white'
                    }`}>
                      {dayNum}
                    </span>
                  </div>

                  {/* Indicator Dots: ONLY render if actual events, classes, or tasks exist on this date */}
                  <div className="flex items-center gap-1 min-h-[8px]">
                    {hasClass && (
                      <span 
                        className="w-2 h-2 rounded-full bg-pastel-yellow ring-1 ring-[#181818]/10 shadow-2xs" 
                        title="Ada Jadwal Kuliah"
                      />
                    )}
                    {hasTask && (
                      <span 
                        className="w-2 h-2 rounded-full bg-pastel-pink ring-1 ring-[#181818]/10 shadow-2xs" 
                        title="Ada Deadline Tugas"
                      />
                    )}
                    {hasEvent && (
                      <span 
                        className="w-2 h-2 rounded-full bg-pastel-blue ring-1 ring-[#181818]/10 shadow-2xs" 
                        title="Ada Acara Kalender"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Selected Day Details Panel (4 cols) */}
        <div className="xl:col-span-4 bg-white dark:bg-[#1C1C1E] p-6 rounded-[28px] border border-[#181818]/15 dark:border-white/10 shadow-sm space-y-4">
          
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6F6A63]">
              Schedule for Date:
            </span>
            <h4 className="font-display font-black text-base text-[#181818] dark:text-white">
              {selectedDayName}, {new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h4>
          </div>

          {combinedItems.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#6F6A63]">
              No events or classes for this day.
            </p>
          ) : (
            <div className="space-y-2.5">
              {combinedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-[#181818]/10 bg-[#F7F2E8] dark:bg-[#141414] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-md ${
                        item.type === 'class' ? 'bg-pastel-yellow text-[#181818]' :
                        item.type === 'task' ? 'bg-pastel-pink text-[#181818]' : 'bg-pastel-purple text-[#181818]'
                      }`}>
                        {item.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#6F6A63]">
                        {item.time}
                      </span>
                    </div>

                    <p className="font-bold text-xs text-[#181818] dark:text-white truncate">
                      {item.title}
                    </p>
                    {item.location && (
                      <p className="text-[10px] text-[#6F6A63] truncate">
                        📍 {item.location}
                      </p>
                    )}
                    {item.workspaceName && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block pt-0.5">
                        ✓ {item.workspaceName} (Auto-synced)
                      </span>
                    )}
                  </div>

                  {item.type === 'event' && (
                    <button
                      onClick={() => handleDeleteEvent(item.id)}
                      className="p-1 rounded-lg text-[#6F6A63] hover:text-rose-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 rounded-[32px] w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10">
              <h3 className="font-bold text-sm">Add Personal Calendar Event</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Event title (e.g. Study with Citra)"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-3 outline-none font-bold"
                required
              />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-3 outline-none font-mono font-bold"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] font-bold"
              >
                Add Event
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
