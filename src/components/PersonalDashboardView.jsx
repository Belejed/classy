import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Clock, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  MapPin,
  Folder,
  Layers,
  Heart,
  TrendingUp,
  Activity,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PersonalDashboardView({
  currentUser,
  personalWorkspace,
  sharedWorkspaces = [],
  personalSchedules = [],
  collegeSchedules = [],
  personalTasks = [],
  personalNotes = [],
  onNavigateTab,
  onSwitchWorkspace,
  onSavePersonalTasks,
  onOpenCreateModal,
  onSavePersonalSchedules
}) {
  const [selectedDayNumber, setSelectedDayNumber] = useState(() => new Date().getDate());
  const [newQuickTask, setNewQuickTask] = useState('');
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('09:00');
  const [newEventRoom, setNewEventRoom] = useState('');
  const [newEventDay, setNewEventDay] = useState('Senin');

  const studentName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Arya';

  // Current day name in Indonesian
  const todayIndex = new Date().getDay();
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNamesIndo[todayIndex] || 'Senin';

  // Calculate day name for clicked day number in current month
  const now = new Date();
  const clickedDateObj = new Date(now.getFullYear(), now.getMonth(), selectedDayNumber);
  const clickedDayName = dayNamesIndo[clickedDateObj.getDay()];

  // Filter schedules for the selected day in mini calendar
  const dayPersonalSchedules = personalSchedules.filter(s => s.day === clickedDayName);
  const dayCollegeSchedules = collegeSchedules.filter(s => s.day === clickedDayName);

  const activeSelectedSchedule = [
    ...dayPersonalSchedules.map(s => ({ ...s, sourceType: 'personal' })),
    ...dayCollegeSchedules.map(s => ({ ...s, sourceType: 'workspace', workspaceName: 'Database Group' }))
  ].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

  const pendingTasks = personalTasks.filter(t => !t.completed && t.status !== 'completed');
  const completedTasks = personalTasks.filter(t => t.completed || t.status === 'completed');

  const handleToggleTask = (taskId) => {
    const updated = personalTasks.map(t => {
      if (t.id === taskId) {
        const isDone = !t.completed;
        return { ...t, completed: isDone, status: isDone ? 'completed' : 'pending' };
      }
      return t;
    });
    onSavePersonalTasks(updated);
  };

  const handleAddQuickTask = (e) => {
    e.preventDefault();
    if (!newQuickTask.trim()) return;

    const newTask = {
      id: 'task_' + Math.random().toString(36).substr(2, 9),
      title: newQuickTask.trim(),
      subject: 'Personal',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '23:59',
      priority: 'Medium',
      status: 'pending',
      completed: false,
      attachments: [],
      createdAt: new Date().toISOString()
    };

    onSavePersonalTasks([newTask, ...personalTasks]);
    setNewQuickTask('');
    toast.success('Task added to Personal Tasks!');
  };

  const handleSaveNewEvent = (e) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newSch = {
      id: 'sch_' + Math.random().toString(36).substr(2, 9),
      subject: newEventTitle.trim(),
      day: newEventDay,
      startTime: newEventTime,
      endTime: (parseInt(newEventTime.split(':')[0]) + 1) + ':' + newEventTime.split(':')[1],
      room: newEventRoom.trim() || 'Personal Room',
      sks: 2,
      colorTag: 'yellow',
      isPersonalItem: true
    };

    if (onSavePersonalSchedules) {
      onSavePersonalSchedules([...personalSchedules, newSch]);
      toast.success(`Event "${newEventTitle}" added to Schedule! ✨`);
    }
    setShowAddEventModal(false);
    setNewEventTitle('');
    setNewEventRoom('');
  };

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return (
    <div className="w-full pb-10 text-[#181818] dark:text-[#EDE8DF]">
      
      {/* 2-Column Main Layout (Left: Editorial & Bento, Right: Mini Calendar & Timeline) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT & CENTER COLUMN (8 cols): Header, 4 Bento Pastel Cards, Lists */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Editorial Greeting Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#181818] dark:text-white">
                Good morning, {studentName}
              </h1>
              <p className="text-xs sm:text-sm text-[#6F6A63] mt-1 font-medium">
                {todayName}, {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. You have {activeSelectedSchedule.length} classes and agenda items.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('schedules')}
              className="text-xs font-bold text-[#181818] dark:text-white hover:underline shrink-0"
            >
              Show all schedule →
            </button>
          </div>

          {/* 4 Pastel Information Bento Cards (Interactive click navigations) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Yellow Card: Classes / Schedule (#F3D85A) */}
            <div 
              onClick={() => onNavigateTab('schedules')}
              className="p-5 rounded-[24px] bg-pastel-yellow text-[#181818] border border-[#181818]/15 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[145px] cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="absolute right-3 top-3 opacity-15 text-5xl font-black select-none pointer-events-none">
                ✦
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  Classes Today:
                </span>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-3xl font-black font-display">
                    {activeSelectedSchedule.length}
                  </span>
                  <span className="text-xs font-bold opacity-80">
                    {dayCollegeSchedules.length} workspace • {dayPersonalSchedules.length} personal
                  </span>
                </div>
              </div>

              {/* Minimal bar visualization */}
              <div className="flex items-end gap-1.5 h-8 pt-2">
                {[40, 75, 55, 90, 65, 80, 45].map((h, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-sm ${i === (todayIndex + 6) % 7 ? 'bg-[#181818]' : 'bg-[#181818]/25'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* 2. Pink Card: Tasks & Productivity Summary (#F1B5D7) */}
            <div 
              onClick={() => onNavigateTab('tasks')}
              className="p-5 rounded-[24px] bg-pastel-pink text-[#181818] border border-[#181818]/15 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[145px] cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="absolute right-4 top-3 opacity-20 select-none pointer-events-none">
                <Heart size={48} fill="#181818" stroke="none" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  Weekly Progress:
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black font-display">
                    {completedTasks.length}
                  </span>
                  <span className="text-xs font-bold opacity-80">
                    of {personalTasks.length} tasks completed
                  </span>
                </div>
              </div>

              {/* Minimal SVG Trend Curve */}
              <div className="w-full h-8 flex items-center">
                <svg viewBox="0 0 160 30" className="w-full h-7 overflow-visible">
                  <path
                    d="M 0,22 Q 25,28 50,15 T 100,8 T 130,18 T 160,5"
                    fill="none"
                    stroke="#181818"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy="8" r="4" fill="#181818" />
                </svg>
              </div>
            </div>

            {/* 3. Green Card: Deadlines This Week (#B4C88C) */}
            <div 
              onClick={() => onNavigateTab('tasks')}
              className="p-5 rounded-[24px] bg-pastel-green text-[#181818] border border-[#181818]/15 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[135px] cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="absolute right-4 top-3 opacity-15 text-4xl font-black select-none pointer-events-none">
                ▲
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  Pending Deadlines:
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black font-display">
                    {pendingTasks.length}
                  </span>
                  <span className="text-xs font-bold opacity-80">
                    tasks remaining
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-[#181818] text-white">
                  High Priority: {personalTasks.filter(t => t.priority === 'High' && !t.completed).length}
                </span>
                <span className="opacity-80">due this week</span>
              </div>
            </div>

            {/* 4. Blue Card: Active Workspaces (#AFC7E8) */}
            <div 
              onClick={onOpenCreateModal}
              className="p-5 rounded-[24px] bg-pastel-blue text-[#181818] border border-[#181818]/15 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[135px] cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="absolute right-4 top-3 opacity-15 text-4xl font-black select-none pointer-events-none">
                ✶
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  Collaborative Spaces:
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black font-display">
                    {sharedWorkspaces.length}
                  </span>
                  <span className="text-xs font-bold opacity-80">
                    workspaces joined
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="text-xs">👥</span>
                <span className="truncate">
                  {sharedWorkspaces.map(w => w.name).slice(0, 2).join(', ') || '+ Create your first workspace'}
                </span>
              </div>
            </div>

          </div>

          {/* Middle Section: Schedule for Selected Day & Upcoming Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Schedule List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-sm text-[#181818] dark:text-white">
                  Agenda for {clickedDayName} ({selectedDayNumber} {now.toLocaleDateString('en-US', { month: 'short' })})
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/10 text-[#6F6A63]">
                  {activeSelectedSchedule.length} items
                </span>
              </div>

              {activeSelectedSchedule.length === 0 ? (
                <div className="p-6 rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/10 text-center text-xs text-[#6F6A63] space-y-2">
                  <p>Tidak ada jadwal kelas untuk {clickedDayName}.</p>
                  <button
                    onClick={() => {
                      setNewEventDay(clickedDayName);
                      setShowAddEventModal(true);
                    }}
                    className="px-3 py-1 rounded-full bg-[#181818] text-white text-[11px] font-bold"
                  >
                    + Tambah Kegiatan
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSelectedSchedule.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/10 hover:border-[#181818]/30 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                          item.sourceType === 'workspace' ? 'bg-pastel-yellow text-[#181818]' : 'bg-pastel-purple text-[#181818]'
                        }`}>
                          {item.sourceType === 'workspace' ? '🎓' : '👤'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-[#181818] dark:text-white truncate">
                            {item.subject}
                          </h4>
                          <p className="text-[10px] text-[#6F6A63] truncate mt-0.5">
                            {item.room ? `📍 ${item.room}` : 'Personal Session'}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-[#F7F2E8] dark:bg-[#141414] border border-[#181818]/10 text-[10px] font-mono font-bold text-[#181818] dark:text-[#EDE8DF] shrink-0">
                        {item.startTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-sm text-[#181818] dark:text-white">
                  Personal Tasks
                </h3>
                <span className="text-[10px] font-bold text-[#6F6A63]">
                  {pendingTasks.length} remaining
                </span>
              </div>

              {/* Quick Add Task Input */}
              <form onSubmit={handleAddQuickTask} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="+ Add a quick task..."
                  value={newQuickTask}
                  onChange={(e) => setNewQuickTask(e.target.value)}
                  className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 rounded-full px-3.5 py-2 text-xs outline-none text-[#181818] dark:text-white font-medium"
                />
                <button
                  type="submit"
                  disabled={!newQuickTask.trim()}
                  className="w-8 h-8 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] flex items-center justify-center shrink-0 disabled:opacity-40"
                >
                  <Plus size={15} />
                </button>
              </form>

              {/* Task Items */}
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                {personalTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className="p-3 rounded-[18px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/10 hover:border-[#181818]/30 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded-full border border-[#181818] dark:border-white/50 flex items-center justify-center transition-colors ${
                        task.completed ? 'bg-[#181818] text-white dark:bg-white dark:text-[#181818]' : 'bg-transparent'
                      }`}>
                        {task.completed && <CheckCircle2 size={12} />}
                      </div>
                      <span className={`text-xs font-semibold truncate ${
                        task.completed ? 'line-through text-[#6F6A63]' : 'text-[#181818] dark:text-white'
                      }`}>
                        {task.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-pink/30 text-[#181818] dark:text-pastel-pink shrink-0">
                      {task.dueDate || 'Today'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN (4 cols): Interactive Mini Calendar & Selected Timeline */}
        <div className="xl:col-span-4 space-y-5 bg-white dark:bg-[#1C1C1E] p-5 rounded-[28px] border border-[#181818]/15 dark:border-white/10 shadow-sm">
          
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between">
            <span className="font-display font-extrabold text-xs px-3 py-1 rounded-full bg-pastel-pink text-[#181818]">
              {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <span className="text-[10px] font-bold text-[#6F6A63]">
              Click a date to filter
            </span>
          </div>

          {/* Mini Calendar Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 text-center text-[10px] font-black text-[#6F6A63] uppercase">
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
              <span>Su</span>
            </div>

            {/* Dates Grid (Clickable) */}
            <div className="grid grid-cols-7 text-center gap-y-1 text-xs font-bold text-[#181818] dark:text-[#EDE8DF]">
              {[...Array(daysInMonth)].map((_, i) => {
                const dayNum = i + 1;
                const isSelected = dayNum === selectedDayNumber;
                const isToday = dayNum === now.getDate();

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDayNumber(dayNum)}
                    className="flex items-center justify-center p-0.5 cursor-pointer"
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                      isSelected
                        ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818] font-black shadow-xs scale-105'
                        : isToday
                        ? 'bg-pastel-pink text-[#181818] font-black ring-2 ring-[#181818]/20'
                        : 'hover:bg-cream-muted dark:hover:bg-white/5'
                    }`}>
                      {dayNum}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Event Button (Black Pill) */}
          <button
            onClick={() => {
              setNewEventDay(clickedDayName);
              setShowAddEventModal(true);
            }}
            className="w-full py-2.5 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            Add event
          </button>

          {/* Selected Date Timeline Section */}
          <div className="pt-3 border-t border-[#181818]/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-extrabold text-xs text-[#181818] dark:text-white">
                {clickedDayName}, {selectedDayNumber} {now.toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="text-[10px] font-bold text-[#6F6A63]">
                {activeSelectedSchedule.length} events
              </span>
            </div>

            {/* Timeline Items */}
            {activeSelectedSchedule.length === 0 ? (
              <p className="text-center py-4 text-[11px] text-[#6F6A63]">
                Tidak ada agenda untuk tanggal ini.
              </p>
            ) : (
              <div className="space-y-3 relative pl-4 border-l-2 border-dashed border-[#181818]/20 dark:border-white/20 ml-2">
                {activeSelectedSchedule.map((event, idx) => (
                  <div key={event.id || idx} className="relative space-y-0.5">
                    <span className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1C1C1E] ${
                      idx % 3 === 0 ? 'bg-pastel-pink' : idx % 3 === 1 ? 'bg-pastel-yellow' : 'bg-pastel-blue'
                    }`} />
                    
                    <span className="text-[10px] font-mono font-bold text-[#6F6A63] block">
                      {event.startTime} - {event.endTime}
                    </span>
                    <p className="font-bold text-xs text-[#181818] dark:text-white truncate">
                      {event.subject}
                    </p>
                    <p className="text-[10px] text-[#6F6A63] truncate">
                      {event.room || 'Personal Room'} {event.sourceType === 'workspace' ? '• 🎓 Workspace' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* View All Details Button */}
            <button
              onClick={() => onNavigateTab('schedules')}
              className="w-full py-2 rounded-full border border-[#181818]/15 dark:border-white/15 text-xs font-bold text-[#181818] dark:text-white hover:bg-cream-muted dark:hover:bg-white/5 transition-colors"
            >
              View all in schedule →
            </button>
          </div>

        </div>

      </div>

      {/* Quick Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 rounded-[32px] w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10">
              <h3 className="font-bold text-sm">Add Event / Class</h3>
              <button onClick={() => setShowAddEventModal(false)} className="p-1">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveNewEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Belajar Algoritma, Gym..."
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2.5 font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Day</label>
                  <select
                    value={newEventDay}
                    onChange={(e) => setNewEventDay(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-bold outline-none"
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Time</label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Location / Room</label>
                <input
                  type="text"
                  placeholder="e.g. Lab Komputer 2, Zoom..."
                  value={newEventRoom}
                  onChange={(e) => setNewEventRoom(e.target.value)}
                  className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2.5 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] font-bold mt-2"
              >
                Save Event
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
