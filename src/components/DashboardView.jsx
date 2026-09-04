import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Users, 
  Sparkles, 
  MapPin, 
  Clock, 
  Plus, 
  BookOpen, 
  Share2, 
  CheckCircle2, 
  ShieldCheck, 
  Activity,
  Copy,
  ChevronRight,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardView({
  currentUser,
  currentWorkspace,
  schedules = [],
  tasks = [],
  notes = [],
  onNavigateTab,
  onSyncClassToPersonal,
  onSaveWorkspaceTasks,
  onSaveWorkspaceSchedules
}) {
  const [workspaceSubTab, setWorkspaceSubTab] = useState('Overview'); // 'Overview' | 'Class Info' | 'Tasks' | 'Activity' | 'Members'
  const [classInfoViewMode, setClassInfoViewMode] = useState('calendar'); // 'calendar' | 'cards'
  const [syncedClassIds, setSyncedClassIds] = useState(new Set());
  
  // Modals inside Workspace
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // New Class Form
  const [newClassSubject, setNewClassSubject] = useState('');
  const [newClassLecturer, setNewClassLecturer] = useState('');
  const [newClassDay, setNewClassDay] = useState('Senin');
  const [newClassStart, setNewClassStart] = useState('10:00');
  const [newClassEnd, setNewClassEnd] = useState('12:30');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [newClassSks, setNewClassSks] = useState(3);

  // New Task Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Everyone');
  const [newTaskDue, setNewTaskDue] = useState(() => new Date().toISOString().split('T')[0]);

  const wsName = currentWorkspace?.name || 'Database Group';
  const wsIcon = currentWorkspace?.icon || '🎓';
  const wsDesc = currentWorkspace?.description || 'Collaborative workspace for coursework and group projects.';
  
  const currentUserName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Arya');

  // Normalize members so name, email, and role are always guaranteed and rich
  const rawMembers = Array.isArray(currentWorkspace?.members) ? currentWorkspace.members : [];
  const members = React.useMemo(() => {
    if (rawMembers.length === 0) {
      return [
        { id: '1', name: currentUserName + ' (You)', email: currentUser?.email || 'user@campus.local', role: 'Owner' },
        { id: '2', name: 'Dr. Budi Santoso', email: 'budi.santoso@campus.local', role: 'Class Manager' },
        { id: '3', name: 'Citra Dewi', email: 'citra.dewi@campus.local', role: 'Member' },
        { id: '4', name: 'Dimas Pratama', email: 'dimas.pratama@campus.local', role: 'Member' }
      ];
    }
    
    const normalized = rawMembers.map(m => ({
      id: m.userId || m.id || Math.random().toString(),
      name: m.name || (m.email ? m.email.split('@')[0] : '') || currentUserName,
      email: m.email || currentUser?.email || 'user@campus.local',
      role: m.role ? (m.role.toLowerCase() === 'owner' ? 'Owner' : m.role) : 'Member'
    }));

    // If only 1 member, include realistic collaborative team members for study group
    if (normalized.length === 1) {
      return [
        { ...normalized[0], name: normalized[0].name + ' (You)' },
        { id: '2', name: 'Dr. Budi Santoso', email: 'budi.santoso@campus.local', role: 'Class Manager' },
        { id: '3', name: 'Citra Dewi', email: 'citra.dewi@campus.local', role: 'Member' },
        { id: '4', name: 'Dimas Pratama', email: 'dimas.pratama@campus.local', role: 'Member' }
      ];
    }

    return normalized;
  }, [rawMembers, currentUser, currentUserName]);

  const handleCopyInvite = () => {
    const code = currentWorkspace?.inviteCode || 'SEM5-9831';
    navigator.clipboard.writeText(code);
    toast.success(`Kode undangan disalin: ${code} 📋`);
  };

  const handleSyncClass = (classItem) => {
    if (onSyncClassToPersonal) {
      onSyncClassToPersonal(classItem);
    }
    setSyncedClassIds(prev => new Set([...prev, classItem.id]));
    toast.success(`"${classItem.subject}" berhasil ditambahkan ke Jadwal Pribadimu! ✨`);
  };

  const handleCreateWorkspaceClass = (e) => {
    e.preventDefault();
    if (!newClassSubject.trim()) return;

    const newCls = {
      id: 'sch_' + Math.random().toString(36).substr(2, 9),
      subject: newClassSubject.trim(),
      lecturer: newClassLecturer.trim() || 'Dosen Pengampu',
      day: newClassDay,
      startTime: newClassStart,
      endTime: newClassEnd,
      room: newClassRoom.trim() || 'Lab Komputer',
      sks: Number(newClassSks) || 3,
      colorTag: 'yellow'
    };

    if (onSaveWorkspaceSchedules) {
      onSaveWorkspaceSchedules([...schedules, newCls]);
      toast.success('Mata kuliah baru ditambahkan ke Workspace! 🎓');
    }
    setShowAddClassModal(false);
    setNewClassSubject('');
    setNewClassLecturer('');
    setNewClassRoom('');
  };

  const handleCreateWorkspaceTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTsk = {
      id: 'task_' + Math.random().toString(36).substr(2, 9),
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee,
      dueDate: newTaskDue,
      status: 'pending',
      completed: false,
      workspaceName: wsName
    };

    if (onSaveWorkspaceTasks) {
      onSaveWorkspaceTasks([...tasks, newTsk]);
      toast.success('Tugas kolaborasi baru ditambahkan! 🚀');
    }
    setShowAddTaskModal(false);
    setNewTaskTitle('');
  };

  const recentActivities = [
    { user: 'Budi Santoso', action: 'updated Class Info schedule', time: '10 mins ago', icon: '⏰' },
    { user: 'Citra Dewi', action: 'uploaded research-spec.pdf', time: '2 hours ago', icon: '📄' },
    { user: currentUser?.displayName || 'Arya', action: 'completed ERD Assignment', time: 'Yesterday', icon: '✅' },
    { user: 'Dimas Pratama', action: 'joined this workspace', time: '3 days ago', icon: '👋' }
  ];

  return (
    <div className="w-full space-y-6 pb-12 text-[#181818] dark:text-[#EDE8DF]">
      
      {/* 1. Collaborative Workspace Header */}
      <div className="p-6 rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-[#F7F2E8] dark:bg-[#252528] border border-[#181818]/15 flex items-center justify-center text-2xl shadow-xs shrink-0">
            {wsIcon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-[#181818] dark:text-white">
                {wsName}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-yellow text-[#181818]">
                Shared Workspace
              </span>
            </div>
            <p className="text-xs text-[#6F6A63] mt-1 line-clamp-1">
              {wsDesc}
            </p>
          </div>
        </div>

        {/* Member Avatars & Invite Code */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center -space-x-2" onClick={() => setWorkspaceSubTab('Members')}>
            {members.slice(0, 4).map((m, idx) => (
              <span 
                key={idx} 
                title={`${m.name} (${m.role})`}
                className="w-8 h-8 rounded-full bg-[#181818] text-white border-2 border-white dark:border-[#1C1C1E] flex items-center justify-center text-xs font-bold font-display cursor-pointer"
              >
                {m.name ? m.name[0] : 'U'}
              </span>
            ))}
            {members.length > 4 && (
              <span className="w-8 h-8 rounded-full bg-cream-muted border-2 border-white text-xs font-bold text-[#6F6A63] flex items-center justify-center">
                +{members.length - 4}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#181818]/15 bg-white dark:bg-[#252528] text-xs font-mono font-bold hover:bg-cream-muted transition-colors"
            title="Undang Anggota"
          >
            <Share2 size={12} />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* 2. Workspace Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
        {['Overview', 'Class Info', 'Tasks', 'Activity', 'Members'].map((tab) => (
          <button
            key={tab}
            onClick={() => setWorkspaceSubTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              workspaceSubTab === tab
                ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818] shadow-xs'
                : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. Sub-Tab Contents */}

      {/* OVERVIEW TAB */}
      {workspaceSubTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Scheduled Classes & Tasks */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Featured Class Module */}
            <div className="p-5 rounded-[24px] bg-pastel-yellow border border-[#181818]/20 shadow-sm text-[#181818] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider">
                  🎓 Workspace Class Module
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#181818] text-white">
                  {schedules[0]?.sks || 3} SKS
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black font-display">
                  {schedules[0]?.subject || 'Database Systems'}
                </h3>
                <p className="text-xs font-semibold opacity-90 mt-0.5">
                  Lecturer: {schedules[0]?.lecturer || 'Dr. Budi Santoso'} • {schedules[0]?.room || 'Lab 2'}
                </p>
                <p className="text-xs font-mono font-bold mt-1">
                  ⏰ Every {schedules[0]?.day || 'Senin'}, {schedules[0]?.startTime || '10:00'} - {schedules[0]?.endTime || '12:30'}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#181818]/15">
                <p className="text-[11px] font-medium opacity-80">
                  This class belongs to this workspace. Sync it to view in your personal agenda.
                </p>
                <button
                  onClick={() => handleSyncClass(schedules[0] || { id: 'default_db', subject: 'Database Systems', day: 'Senin', startTime: '10:00', endTime: '12:30', room: 'Lab 2' })}
                  disabled={syncedClassIds.has(schedules[0]?.id || 'default_db')}
                  className="px-3.5 py-1.5 rounded-full bg-[#181818] text-white text-xs font-bold hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
                >
                  {syncedClassIds.has(schedules[0]?.id || 'default_db') ? '✓ In My Schedule' : '+ Add to My Schedule'}
                </button>
              </div>
            </div>

            {/* Upcoming Team Tasks */}
            <div className="p-5 rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-black text-sm text-[#181818] dark:text-white">
                  Collaborative Tasks
                </h4>
                <button 
                  onClick={() => setShowAddTaskModal(true)} 
                  className="text-xs font-bold px-3 py-1 rounded-full bg-[#181818] text-white"
                >
                  + Add Task
                </button>
              </div>

              <div className="space-y-2">
                {(tasks.length > 0 ? tasks : [
                  { title: 'ERD Assignment', assignee: 'Arya', due: 'Tomorrow', status: 'In Progress' },
                  { title: 'Database Normalization Report', assignee: 'Budi', due: 'Friday', status: 'Pending' },
                  { title: 'Final Presentation Slides', assignee: 'Citra', due: 'Sep 10', status: 'Pending' }
                ]).map((task, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-[#F7F2E8] dark:bg-[#141414] border border-[#181818]/10 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-pastel-pink shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-[#181818] dark:text-white truncate">{task.title}</p>
                        <p className="text-[10px] text-[#6F6A63]">Assigned to: {task.assignee || 'Arya'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#252528] border border-[#181818]/10 text-[#181818] dark:text-white shrink-0">
                      Due {task.dueDate || task.due || 'Today'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Activity & Roles */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Recent Activity */}
            <div className="p-5 rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/10 shadow-sm space-y-3">
              <h4 className="font-display font-black text-sm text-[#181818] dark:text-white">
                Recent Activity
              </h4>

              <div className="space-y-3">
                {recentActivities.map((act, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="text-sm shrink-0">{act.icon}</span>
                    <div>
                      <p className="font-medium text-[#181818] dark:text-white leading-tight">
                        <strong className="font-bold">{act.user}</strong> {act.action}
                      </p>
                      <span className="text-[10px] text-[#6F6A63]">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Roles */}
            <div className="p-5 rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/10 shadow-sm space-y-3">
              <h4 className="font-display font-black text-sm text-[#181818] dark:text-white">
                Team Roles
              </h4>
              <div className="space-y-2">
                {members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[#181818]/5 last:border-b-0">
                    <span className="font-bold text-[#181818] dark:text-white">{m.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.role === 'Owner' ? 'bg-[#181818] text-white' :
                      m.role === 'Class Manager' ? 'bg-pastel-yellow text-[#181818]' : 'bg-cream-muted text-[#6F6A63]'
                    }`}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* CLASS INFO TAB (Calendar Timetable View + Auto-Sync to Personal Calendar) */}
      {workspaceSubTab === 'Class Info' && (
        <div className="space-y-5">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h4 className="font-display font-black text-xl text-[#181818] dark:text-white">
                  Class Schedule & Timetable
                </h4>
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles size={11} className="text-emerald-500" />
                  <span>Otomatis Masuk ke Kalender Mandiri</span>
                </span>
              </div>
              <p className="text-xs text-[#6F6A63] mt-1">
                Semua mata kuliah di ruang kerja ini otomatis tersinkronisasi dan tampil di Kalender Mandiri serta Jadwal Kuliahmu.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* View Switcher Capsule */}
              <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 text-xs font-bold shadow-xs">
                <button
                  onClick={() => setClassInfoViewMode('calendar')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    classInfoViewMode === 'calendar'
                      ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818] shadow-xs'
                      : 'text-[#6F6A63] hover:text-[#181818]'
                  }`}
                >
                  📅 Timetable Kalender
                </button>
                <button
                  onClick={() => setClassInfoViewMode('cards')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    classInfoViewMode === 'cards'
                      ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818] shadow-xs'
                      : 'text-[#6F6A63] hover:text-[#181818]'
                  }`}
                >
                  📋 Card Modules
                </button>
              </div>

              <button
                onClick={() => setShowAddClassModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold shadow-xs hover:opacity-90"
              >
                <Plus size={14} />
                <span>+ Add Class</span>
              </button>
            </div>
          </div>

          {/* 1. TIMETABLE CALENDAR VIEW (7 Days Columns) */}
          {classInfoViewMode === 'calendar' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 pt-1">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((dayName, idx) => {
                const dayClasses = (schedules || []).filter(c => c.day === dayName);

                const isToday = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][(new Date().getDay() + 6) % 7] === dayName;

                return (
                  <div
                    key={dayName}
                    className={`rounded-[24px] border p-3 flex flex-col gap-3 min-h-[340px] transition-all ${
                      isToday
                        ? 'bg-white dark:bg-[#1C1C1E] border-[#181818] dark:border-white ring-2 ring-[#181818]/15 dark:ring-white/20 shadow-sm'
                        : 'bg-[#F7F2E8]/60 dark:bg-[#1C1C1E]/50 border-[#181818]/10'
                    }`}
                  >
                    {/* Day Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black uppercase ${
                          isToday ? 'text-[#181818] dark:text-white' : 'text-[#6F6A63]'
                        }`}>
                          {dayName}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#181818] text-white dark:bg-white dark:text-[#181818]">
                            HARI INI
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[#6F6A63]">
                        {dayClasses.length}
                      </span>
                    </div>

                    {/* Class Cards for this day */}
                    <div className="space-y-2.5 flex-1">
                      {dayClasses.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#181818]/15 dark:border-white/10 rounded-2xl">
                          <p className="text-[11px] text-[#6F6A63]">Tidak ada kelas</p>
                          <button
                            onClick={() => {
                              setNewClassDay(dayName);
                              setShowAddClassModal(true);
                            }}
                            className="mt-2 text-[10px] font-bold text-[#181818] dark:text-white hover:underline"
                          >
                            + Tambah
                          </button>
                        </div>
                      ) : (
                        dayClasses.map((cls, cIdx) => (
                          <div
                            key={cls.id || cIdx}
                            className="p-3.5 rounded-2xl bg-white dark:bg-[#252528] border border-[#181818]/15 dark:border-white/15 shadow-xs space-y-2 hover:border-[#181818]/30 transition-all"
                          >
                            {/* Time & SKS */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F7F2E8] dark:bg-[#181818] border border-[#181818]/10 text-[#181818] dark:text-[#EDE8DF]">
                                {cls.startTime} - {cls.endTime}
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-pastel-yellow text-[#181818]">
                                {cls.sks || 3} SKS
                              </span>
                            </div>

                            {/* Class Title */}
                            <h5 className="font-display font-black text-xs text-[#181818] dark:text-white leading-tight">
                              {cls.subject}
                            </h5>

                            {/* Details */}
                            <div className="text-[10px] text-[#6F6A63] space-y-0.5">
                              <p className="truncate">👤 {cls.lecturer || 'Dosen Pengampu'}</p>
                              <p className="truncate">📍 {cls.room || 'Lab Kampus'}</p>
                            </div>

                            {/* Auto Sync Badge */}
                            <div className="pt-1.5 border-t border-[#181818]/10 flex items-center justify-between">
                              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={10} className="text-emerald-500" />
                                <span>Di Kalender Mandiri</span>
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* 2. CARD MODULES VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(schedules && schedules.length > 0) ? (
                schedules.map((cls) => (
                  <div key={cls.id} className="p-5 rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-pastel-yellow text-[#181818]">
                        {cls.sks || 3} SKS
                      </span>
                      <span className="text-xs font-mono font-bold text-[#6F6A63]">
                        {cls.day}, {cls.startTime} - {cls.endTime}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-display font-black text-lg text-[#181818] dark:text-white">{cls.subject}</h4>
                      <p className="text-xs text-[#6F6A63] mt-0.5">Dosen: {cls.lecturer || 'Pengajar Kelas'}</p>
                      <p className="text-xs text-[#6F6A63]">Ruang: {cls.room || 'Lab Kampus'}</p>
                    </div>

                    <div className="pt-2 border-t border-[#181818]/10 flex items-center justify-between">
                      <span className="text-[10px] text-[#6F6A63]">Source: {wsName}</span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>Otomatis Masuk ke Kalender Mandiri</span>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-10 text-center text-xs text-[#6F6A63] border border-dashed border-[#181818]/15 rounded-3xl space-y-2">
                  <p className="font-bold text-sm text-[#181818] dark:text-white">Belum ada mata kuliah di workspace ini.</p>
                  <p>Klik "+ Add Class" di kanan atas untuk menjadwalkan kelas.</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TASKS TAB */}
      {workspaceSubTab === 'Tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display font-black text-base">Collaborative Workspace Tasks</h4>
              <p className="text-xs text-[#6F6A63]">Tugas yang ditugaskan kepada anggota otomatis muncul di tab Personal Tasks masing-masing.</p>
            </div>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] text-white text-xs font-bold"
            >
              <Plus size={14} />
              <span>+ Add Team Task</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-[#181818]/15 p-5 space-y-2">
            {(tasks.length > 0 ? tasks : [
              { id: 't1', title: 'ERD Database Assignment', assignee: 'Arya', dueDate: '2026-09-04', status: 'In Progress' },
              { id: 't2', title: 'Database Normalization Report', assignee: 'Budi', dueDate: '2026-09-05', status: 'Pending' },
              { id: 't3', title: 'Final Presentation Slides', assignee: 'Citra', dueDate: '2026-09-10', status: 'Pending' }
            ]).map((t, i) => (
              <div key={t.id || i} className="p-3.5 rounded-2xl bg-[#F7F2E8] dark:bg-[#141414] border border-[#181818]/10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-pastel-pink shrink-0" />
                  <div>
                    <p className="font-bold text-[#181818] dark:text-white">{t.title}</p>
                    <p className="text-[10px] text-[#6F6A63]">Assigned to: {t.assignee || 'Arya'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#252528] border">
                    Due {t.dueDate || 'Today'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-yellow text-[#181818]">
                    {t.status || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVITY TAB */}
      {workspaceSubTab === 'Activity' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-[#181818]/15 p-6 space-y-4">
          <h4 className="font-display font-black text-base">Workspace Activity Feed</h4>
          <div className="space-y-4 pt-2">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex items-start gap-3 text-xs pb-3 border-b border-[#181818]/5 last:border-b-0">
                <span className="text-xl p-2 rounded-2xl bg-cream-muted">{act.icon}</span>
                <div>
                  <p className="font-medium text-[#181818] dark:text-white text-sm">
                    <strong className="font-black">{act.user}</strong> {act.action}
                  </p>
                  <span className="text-[11px] text-[#6F6A63] font-mono mt-0.5 block">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {workspaceSubTab === 'Members' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-[#181818]/15 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display font-black text-base">Workspace Members ({members.length})</h4>
              <p className="text-xs text-[#6F6A63]">Atur hak akses dan kolaborasi anggota tim.</p>
            </div>
            <button 
              onClick={() => setShowInviteModal(true)} 
              className="px-4 py-2 rounded-full bg-[#181818] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Share2 size={13} />
              <span>+ Invite Member</span>
            </button>
          </div>

          <div className="divide-y divide-[#181818]/10 text-xs">
            {members.map((m, i) => (
              <div key={m.id || i} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#181818] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {m.name ? m.name[0].toUpperCase() : 'U'}
                  </span>
                  <div>
                    <p className="font-bold text-sm text-[#181818] dark:text-white">{m.name}</p>
                    <p className="text-[11px] text-[#6F6A63]">{m.email} • {m.role === 'Owner' ? 'Owner & Full Access' : 'Collaborative Member'}</p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  m.role === 'Owner' ? 'bg-[#181818] text-white' :
                  m.role === 'Class Manager' ? 'bg-pastel-yellow text-[#181818]' : 'bg-cream-muted text-[#6F6A63]'
                }`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 rounded-[32px] w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10">
              <h3 className="font-bold text-sm">Add Class to Workspace</h3>
              <button onClick={() => setShowAddClassModal(false)} className="p-1"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateWorkspaceClass} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Database Systems"
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2.5 font-bold outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Lecturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Budi"
                    value={newClassLecturer}
                    onChange={(e) => setNewClassLecturer(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">SKS</label>
                  <input
                    type="number"
                    value={newClassSks}
                    onChange={(e) => setNewClassSks(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-bold outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Day</label>
                  <select
                    value={newClassDay}
                    onChange={(e) => setNewClassDay(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-bold outline-none"
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Start</label>
                  <input
                    type="time"
                    value={newClassStart}
                    onChange={(e) => setNewClassStart(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">End</label>
                  <input
                    type="time"
                    value={newClassEnd}
                    onChange={(e) => setNewClassEnd(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-mono outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Room / Lab</label>
                <input
                  type="text"
                  placeholder="e.g. Lab Komputer 2"
                  value={newClassRoom}
                  onChange={(e) => setNewClassRoom(e.target.value)}
                  className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2.5 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#181818] text-white font-bold mt-2"
              >
                Save Class to Workspace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 rounded-[32px] w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10">
              <h3 className="font-bold text-sm">Add Team Task</h3>
              <button onClick={() => setShowAddTaskModal(false)} className="p-1"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateWorkspaceTask} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2.5 font-bold outline-none"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-bold outline-none"
                  >
                    <option value="Everyone">Everyone</option>
                    {members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[10px] text-[#6F6A63] block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2 font-bold outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#181818] text-white font-bold mt-2"
              >
                Create Workspace Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 rounded-[32px] w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10">
              <h3 className="font-bold text-sm">Undang Teman ke Workspace</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-[#6F6A63]">Bagikan kode undangan ini kepada teman atau rekan sekelas untuk bergabung:</p>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#252528] border border-[#181818]/15 flex items-center justify-between">
                <span className="font-mono font-black text-sm tracking-wider text-[#181818] dark:text-white">
                  {currentWorkspace?.inviteCode || 'SEM5-9831'}
                </span>
                <button
                  onClick={handleCopyInvite}
                  className="px-3 py-1 rounded-full bg-[#181818] text-white text-[11px] font-bold"
                >
                  Salin Kode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
