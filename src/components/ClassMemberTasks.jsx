import React, { useState, useMemo } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronDown, 
  Copy, 
  Check, 
  Share2, 
  MessageSquare, 
  ArrowUpDown, 
  X, 
  ListTodo, 
  Crown, 
  Shield, 
  Layers, 
  GraduationCap, 
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import EmptyState from './EmptyState';
import { isTaskOverdue } from './ClassTasks';
import { isSuperAdminEmail } from '../utils/db';
import { normalizeRole, ROLES } from '../utils/permissions';

// Helper to check if a member matches a task submission
export const isMemberMatchingSubmission = (sub, member) => {
  if (!sub || !member) return false;
  const uid = member.userId || member.uid || member.id;
  const email = (member.email || '').toLowerCase().trim();
  const name = (member.name || member.displayName || member.userName || '').toLowerCase().trim();

  // 1. Direct submitter match
  if (uid && (sub.userId === uid || sub.uid === uid || sub.id === uid)) return true;
  if (email && (
    (sub.userEmail && sub.userEmail.toLowerCase().trim() === email) ||
    (sub.email && sub.email.toLowerCase().trim() === email)
  )) return true;
  if (name && sub.userName && sub.userName.toLowerCase().trim() === name) return true;

  // 2. Group members match
  if (Array.isArray(sub.groupMembers)) {
    return sub.groupMembers.some(gm => {
      if (!gm) return false;
      const gmId = typeof gm === 'string' ? gm : (gm.userId || gm.uid || gm.id);
      const gmEmail = typeof gm === 'string' ? '' : (gm.userEmail || gm.email || '').toLowerCase().trim();
      const gmName = typeof gm === 'string' ? gm.toLowerCase().trim() : (gm.userName || gm.name || '').toLowerCase().trim();

      if (uid && gmId === uid) return true;
      if (email && gmEmail && gmEmail === email) return true;
      if (name && gmName && gmName === name) return true;
      return false;
    });
  }

  return false;
};

// Format deadline nicely
const formatDueDate = (dueDate, dueTime = '23:59') => {
  if (!dueDate) return 'Tanpa Tenggat';
  try {
    const [y, m, d] = dueDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dateStr = date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return `${dateStr} · ${dueTime || '23:59'} WIB`;
  } catch {
    return `${dueDate} ${dueTime || ''}`;
  }
};

export default function ClassMemberTasks({
  currentClass,
  currentUser,
  tasks = [],
  schedules = [],
  onNavigateToTask
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [statusFilter, setStatusFilter] = useState('uncompleted'); // 'uncompleted' | 'all' | 'overdue' | 'completed'
  const [sortBy, setSortBy] = useState('uncompleted_desc'); // 'uncompleted_desc' | 'name_asc' | 'progress_asc' | 'progress_desc'
  const [expandedMembers, setExpandedMembers] = useState({}); // { [memberId]: boolean }
  const [memberTaskSubTab, setMemberTaskSubTab] = useState({}); // { [memberId]: 'incomplete' | 'completed' }
  const [copiedTaskId, setCopiedTaskId] = useState(null);

  // Broadcast / Rekap Modal state
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [rekapCourse, setRekapCourse] = useState('all');
  const [rekapOnlyOverdue, setRekapOnlyOverdue] = useState(false);
  const [copiedRekap, setCopiedRekap] = useState(false);

  // 1. Normalized active members of the class
  const activeMembers = useMemo(() => {
    const rawList = currentClass?.members || [];
    return rawList
      .filter(m => m && typeof m === 'object' && (m.status || 'approved') === 'approved' && m.role !== 'superadmin' && !isSuperAdminEmail(m.email))
      .map(m => {
        const id = m.userId || m.uid || m.id || (m.email ? `email_${m.email.toLowerCase()}` : '');
        const name = (m.name || m.displayName || m.userName || m.email || 'Mahasiswa').trim();
        const nim = (m.studentId || m.nim || '').trim();
        const email = (m.email || '').trim();
        const phone = (m.phoneNumber || m.phone || '').trim();
        return {
          ...m,
          userId: id,
          id,
          name,
          displayName: name,
          userName: name,
          nim,
          studentId: nim,
          email,
          phone
        };
      })
      .filter(m => Boolean(m.userId))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [currentClass?.members]);

  // 2. Available courses list
  const availableCourses = useMemo(() => {
    const set = new Set();
    (tasks || []).forEach(t => {
      if (!t) return;
      const c = (t.subject || t.course || '').trim();
      if (c) set.add(c);
    });
    (schedules || []).forEach(s => {
      if (!s) return;
      const c = (s.subject || s.course || s.title || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [tasks, schedules]);

  // 3. Filter active tasks based on selected course
  const scopedTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(t => {
      if (!t || typeof t !== 'object') return false;
      if (selectedCourse === 'all') return true;
      const c = (t.subject || t.course || '').trim().toLowerCase();
      return c === selectedCourse.trim().toLowerCase();
    });
  }, [tasks, selectedCourse]);

  // 4. Calculate member task statistics & details
  const memberProgressList = useMemo(() => {
    const now = new Date();
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return activeMembers.map(member => {
      const completedTasks = [];
      const incompleteTasks = [];

      scopedTasks.forEach(task => {
        const hasSubmitted = task.submissions?.some(sub => isMemberMatchingSubmission(sub, member));
        
        let isOverdue = false;
        let isUrgent = false;

        if (task.dueDate) {
          isOverdue = isTaskOverdue(task.dueDate, task.dueTime);
          try {
            const [y, m, d] = task.dueDate.split('-').map(Number);
            const [hr, min] = (task.dueTime || '23:59').split(':').map(Number);
            const dueDateTime = new Date(y, m - 1, d, hr || 23, min || 59);
            isUrgent = !isOverdue && dueDateTime > now && dueDateTime <= oneDayLater;
          } catch {}
        }

        const taskItem = {
          ...task,
          formattedDueDate: formatDueDate(task.dueDate, task.dueTime),
          isOverdue,
          isUrgent
        };

        if (hasSubmitted) {
          completedTasks.push(taskItem);
        } else {
          incompleteTasks.push(taskItem);
        }
      });

      // Sort incomplete: Overdue first, then Urgent, then nearest deadline
      incompleteTasks.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      });

      const total = scopedTasks.length;
      const completedCount = completedTasks.length;
      const incompleteCount = incompleteTasks.length;
      const overdueCount = incompleteTasks.filter(t => t.isOverdue).length;
      const urgentCount = incompleteTasks.filter(t => t.isUrgent).length;
      const percent = total > 0 ? Math.round((completedCount / total) * 100) : 100;

      return {
        member,
        total,
        completedCount,
        incompleteCount,
        overdueCount,
        urgentCount,
        percent,
        completedTasks,
        incompleteTasks,
        isCompletedAll: total > 0 ? completedCount === total : true
      };
    });
  }, [activeMembers, scopedTasks]);

  // 5. Overall Class Metrics
  const stats = useMemo(() => {
    const totalMembers = activeMembers.length;
    const withIncomplete = memberProgressList.filter(item => item.incompleteCount > 0).length;
    const fullyCompleted = memberProgressList.filter(item => item.total > 0 && item.incompleteCount === 0).length;
    const totalAvailableTasks = scopedTasks.length;
    const totalOverdueMembers = memberProgressList.filter(item => item.overdueCount > 0).length;

    return {
      totalMembers,
      withIncomplete,
      fullyCompleted,
      totalAvailableTasks,
      totalOverdueMembers
    };
  }, [activeMembers, memberProgressList, scopedTasks]);

  // 6. Filter & Sort Member Progress List
  const filteredList = useMemo(() => {
    return memberProgressList.filter(item => {
      // Status Filter
      if (statusFilter === 'uncompleted' && item.incompleteCount === 0) return false;
      if (statusFilter === 'overdue' && item.overdueCount === 0) return false;
      if (statusFilter === 'completed' && !item.isCompletedAll) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const m = item.member;
        const matchName = m.name?.toLowerCase().includes(q);
        const matchNim = m.nim?.toLowerCase().includes(q);
        const matchEmail = m.email?.toLowerCase().includes(q);
        return matchName || matchNim || matchEmail;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'uncompleted_desc') {
        if (b.incompleteCount !== a.incompleteCount) return b.incompleteCount - a.incompleteCount;
        if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
        return a.member.name.localeCompare(b.member.name, 'id');
      }
      if (sortBy === 'name_asc') {
        return a.member.name.localeCompare(b.member.name, 'id');
      }
      if (sortBy === 'progress_asc') {
        return a.percent - b.percent;
      }
      if (sortBy === 'progress_desc') {
        return b.percent - a.percent;
      }
      return 0;
    });
  }, [memberProgressList, statusFilter, searchQuery, sortBy]);

  // Toggle Member Details Expansion
  const toggleExpand = (memberId) => {
    setExpandedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  // Expand / Collapse All
  const handleToggleExpandAll = () => {
    const isAnyExpanded = Object.values(expandedMembers).some(Boolean);
    if (isAnyExpanded) {
      setExpandedMembers({});
    } else {
      const all = {};
      filteredList.forEach(item => {
        all[item.member.userId] = true;
      });
      setExpandedMembers(all);
    }
  };

  // Copy Reminder Message for a specific student and task
  const handleCopyTaskReminder = (member, task) => {
    const text = `Halo ${member.name}, jangan lupa ya untuk mengumpulkan tugas:\n📌 *${task.title}* (${task.subject || task.course || 'Tugas Kelas'})\n⏰ Tenggat: ${task.formattedDueDate}\n\nSemangat mengerjakannya! 🙏`;
    navigator.clipboard.writeText(text);
    setCopiedTaskId(`${member.userId}_${task.id}`);
    toast.success(`Teks pengingat untuk ${member.name} disalin!`);
    setTimeout(() => setCopiedTaskId(null), 2500);
  };

  // Copy All Incomplete Tasks for a Member
  const handleCopyMemberIncompleteList = (item) => {
    const { member, incompleteTasks } = item;
    if (incompleteTasks.length === 0) {
      toast.success(`${member.name} sudah menyelesaikan semua tugas!`);
      return;
    }
    const tasksListStr = incompleteTasks.map((t, idx) => {
      const statusNote = t.isOverdue ? ' (⚠️ Terlewat)' : t.isUrgent ? ' (⏳ Segera)' : '';
      return `${idx + 1}. ${t.title} [${t.subject || t.course || 'Tugas'}] - ${t.formattedDueDate}${statusNote}`;
    }).join('\n');

    const text = `Halo ${member.name}, berikut daftar tugas yang belum kamu kumpulkan:\n\n${tasksListStr}\n\nYuk segera diselesaikan yaa teman-teman! Semangat! 💪`;
    navigator.clipboard.writeText(text);
    toast.success(`Daftar tugas tertunggak ${member.name} disalin!`);
  };

  // Open Direct WhatsApp Reminder
  const handleOpenWhatsApp = (member, task = null) => {
    const rawPhone = member.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    let text = '';
    if (task) {
      text = `Halo ${member.name}, mengingatkan untuk pengumpulan tugas *${task.title}* mata kuliah *${task.subject || task.course || 'Kelas'}*. Tenggatnya pada ${task.formattedDueDate}. Terima kasih!`;
    } else {
      text = `Halo ${member.name}, mengingatkan untuk tugas kelas yang belum dikumpulkan yaa. Mohon segera dicek di web Classy. Terima kasih!`;
    }

    if (formattedPhone) {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      navigator.clipboard.writeText(text);
      toast.success(`Nomor WA belum dicantumkan. Pesan pengingat telah disalin ke clipboard!`);
    }
  };

  // Generate WhatsApp Class Broadcast Rekap Text
  const generateRekapText = () => {
    const targetCourse = rekapCourse === 'all' ? null : rekapCourse;
    const titleHeader = targetCourse 
      ? `📋 *REKAP TUGAS BELUM SELESAI - ${targetCourse.toUpperCase()}*` 
      : `📋 *REKAP TUGAS BELUM SELESAI - KELAS ${currentClass?.name?.toUpperCase() || ''}*`;
    
    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const studentsWithIncomplete = [];

    activeMembers.forEach(member => {
      const studentIncomplete = [];
      tasks.forEach(t => {
        if (targetCourse && (t.subject || t.course || '').trim().toLowerCase() !== targetCourse.trim().toLowerCase()) {
          return;
        }
        const hasSubmitted = t.submissions?.some(sub => isMemberMatchingSubmission(sub, member));
        if (!hasSubmitted) {
          const isOverdue = isTaskOverdue(t.dueDate, t.dueTime);
          if (rekapOnlyOverdue && !isOverdue) return;
          studentIncomplete.push({
            title: t.title,
            course: t.subject || t.course || '',
            dueDate: formatDueDate(t.dueDate, t.dueTime),
            isOverdue
          });
        }
      });

      if (studentIncomplete.length > 0) {
        studentsWithIncomplete.push({
          member,
          tasks: studentIncomplete
        });
      }
    });

    if (studentsWithIncomplete.length === 0) {
      return `${titleHeader}\nPer tanggal: ${todayStr}\n\n🎉 *Luar biasa! Seluruh mahasiswa sudah menyelesaikan semua tugas!* 🥳`;
    }

    let body = `${titleHeader}\n📅 Per: ${todayStr}\n\nBerikut daftar mahasiswa yang belum mengumpulkan tugas:\n`;

    studentsWithIncomplete.forEach((item, idx) => {
      const { member, tasks } = item;
      const nimStr = member.nim ? ` (${member.nim})` : '';
      body += `\n*${idx + 1}. ${member.name}${nimStr}* — ${tasks.length} Tugas:`;
      tasks.forEach(t => {
        const warn = t.isOverdue ? ' [TERLEWAT]' : '';
        const cStr = targetCourse ? '' : ` [${t.course}]`;
        body += `\n   • ${t.title}${cStr} (Tenggat: ${t.dueDate})${warn}`;
      });
    });

    body += `\n\n📌 *Total:* ${studentsWithIncomplete.length} mahasiswa belum selesai.\nMohon segera dikerjakan dan dikumpulkan ya teman-teman! Terima kasih. 🙏✨`;
    return body;
  };

  const handleCopyRekap = () => {
    const text = generateRekapText();
    navigator.clipboard.writeText(text);
    setCopiedRekap(true);
    toast.success('Rekap tugas berhasil disalin ke clipboard! Siap di-paste ke WhatsApp.');
    setTimeout(() => setCopiedRekap(false), 2500);
  };

  // Get Role Badge for Member
  const renderMemberRoleBadge = (mRole) => {
    const r = normalizeRole(mRole);
    if (r === ROLES.KOMTI) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
          <Crown size={10} /> Komti
        </span>
      );
    }
    if (r === ROLES.VICE_KOMTI) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
          <Shield size={10} /> Wakil Komti
        </span>
      );
    }
    if (r === ROLES.DIVISION_HEAD) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-900 border border-violet-200">
          <Layers size={10} /> PJ
        </span>
      );
    }
    if (r === ROLES.LECTURER) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
          <GraduationCap size={10} /> Dosen
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 pb-16 font-sans">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        {/* Background Subtle Shapes */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-56 h-56 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-44 h-44 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] font-bold border border-indigo-400/30">
                <ListTodo size={12} /> Monitoring Tugas
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-400/20">
                <Shield size={10} /> Khusus Komti, Wakil & PJ
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Cek Tugas Per Member
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pantau siapa saja anggota yang belum mengumpulkan tugas, berapa banyak tugas tertunggak, dan apa saja tugasnya secara real-time.
            </p>
          </div>

          {/* Action Buttons: WhatsApp Rekap */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowRekapModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer border border-indigo-400/40"
              title="Salin rekap siap kirim ke WhatsApp"
            >
              <Share2 size={15} />
              <span>Salin Rekap WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-3.5">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Total Mahasiswa</p>
            <p className="text-lg sm:text-2xl font-black text-white mt-0.5">{stats.totalMembers} <span className="text-xs font-normal text-slate-400">orang</span></p>
          </div>
          <div className="bg-white/5 backdrop-blur-xs border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-3.5">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Tugas Tersedia</p>
            <p className="text-lg sm:text-2xl font-black text-indigo-300 mt-0.5">{stats.totalAvailableTasks} <span className="text-xs font-normal text-slate-400">tugas</span></p>
          </div>
          <div className="bg-rose-500/10 backdrop-blur-xs border border-rose-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-3.5">
            <p className="text-[10px] sm:text-xs font-semibold text-rose-300 flex items-center gap-1">
              <AlertCircle size={12} /> Belum Selesai
            </p>
            <p className="text-lg sm:text-2xl font-black text-rose-200 mt-0.5">{stats.withIncomplete} <span className="text-xs font-normal text-rose-300">orang</span></p>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-xs border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-3.5">
            <p className="text-[10px] sm:text-xs font-semibold text-emerald-300 flex items-center gap-1">
              <CheckCircle2 size={12} /> Tuntas 100%
            </p>
            <p className="text-lg sm:text-2xl font-black text-emerald-200 mt-0.5">{stats.fullyCompleted} <span className="text-xs font-normal text-emerald-300">orang</span></p>
          </div>
        </div>
      </div>

      {/* 2. Filter, Search & Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama mahasiswa, NIM, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors bg-slate-50/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Course / Mata Kuliah */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 py-2 pr-8 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-2xs transition-colors"
              >
                <option value="all">Semua Mata Kuliah</option>
                {availableCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort Selector */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 pr-8 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-2xs transition-colors"
              >
                <option value="uncompleted_desc">Tugas Tertunggak Terbanyak</option>
                <option value="name_asc">Nama Mahasiswa (A-Z)</option>
                <option value="progress_asc">Persentase Terendah</option>
                <option value="progress_desc">Persentase Tertinggi</option>
              </select>
              <ArrowUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={11} /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('uncompleted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'uncompleted'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-transparent'
              }`}
            >
              Ada Tugas Belum Selesai ({stats.withIncomplete})
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-transparent'
              }`}
            >
              Ada Tugas Terlewat ({stats.totalOverdueMembers})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-transparent'
              }`}
            >
              Tuntas 100% ({stats.fullyCompleted})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-transparent'
              }`}
            >
              Semua Mahasiswa ({stats.totalMembers})
            </button>
          </div>

          <button
            onClick={handleToggleExpandAll}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer ml-auto"
          >
            {Object.values(expandedMembers).some(Boolean) ? 'Tutup Semua Rincian' : 'Buka Semua Rincian'}
          </button>
        </div>
      </div>

      {/* 3. Member Tasks List */}
      {filteredList.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Tidak ada mahasiswa yang cocok"
          description={
            statusFilter === 'uncompleted'
              ? 'Hebat! Semua mahasiswa telah menyelesaikan tugas untuk kriteria yang dipilih.'
              : 'Silakan ubah kata kunci pencarian atau reset filter di atas.'
          }
          actionLabel={statusFilter !== 'all' ? 'Tampilkan Semua Mahasiswa' : null}
          onAction={() => {
            setStatusFilter('all');
            setSelectedCourse('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredList.map(item => {
            const { member, total, completedCount, incompleteCount, overdueCount, urgentCount, percent, completedTasks, incompleteTasks } = item;
            const isExpanded = Boolean(expandedMembers[member.userId]);
            const activeSubTab = memberTaskSubTab[member.userId] || 'incomplete';

            return (
              <div 
                key={member.userId}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                  overdueCount > 0 
                    ? 'border-rose-200/80 hover:border-rose-300' 
                    : incompleteCount > 0 
                      ? 'border-amber-200/70 hover:border-amber-300' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Member Header Card Bar */}
                <div 
                  onClick={() => toggleExpand(member.userId)}
                  className="p-3.5 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left: Avatar, Name, NIM, Role */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                      overdueCount > 0
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : incompleteCount > 0
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                          {member.name}
                        </span>
                        {renderMemberRoleBadge(member.role)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
                        {member.nim && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-medium">
                            {member.nim}
                          </span>
                        )}
                        {member.email && (
                          <span className="truncate max-w-[180px] sm:max-w-[240px]">
                            {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Pills, Progress Bar & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Progress Percentage & Bar */}
                    <div className="flex flex-col items-end min-w-[110px]">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className={incompleteCount > 0 ? 'text-slate-800' : 'text-emerald-700'}>
                          {completedCount} / {total} Selesai
                        </span>
                        <span className="text-[10px] text-slate-400">({percent}%)</span>
                      </div>
                      <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200/50">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            percent === 100 
                              ? 'bg-emerald-500' 
                              : overdueCount > 0 
                                ? 'bg-rose-500' 
                                : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {incompleteCount === 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 size={12} /> Tuntas
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                            <AlertCircle size={12} /> {incompleteCount} Belum
                          </span>
                          {overdueCount > 0 && (
                            <span className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] shadow-2xs" title={`${overdueCount} tugas melewati deadline`}>
                              ⚠️ {overdueCount} Lewat
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand Chevron */}
                    <button
                      type="button"
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
                        isExpanded ? 'rotate-180 bg-slate-100 text-slate-800' : ''
                      }`}
                      aria-label="Rincian tugas"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3 animate-in fade-in duration-150">
                    
                    {/* Top Row: Sub-Tabs & Action Shortcuts */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setMemberTaskSubTab(prev => ({ ...prev, [member.userId]: 'incomplete' }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            activeSubTab === 'incomplete'
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Belum Selesai ({incompleteCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemberTaskSubTab(prev => ({ ...prev, [member.userId]: 'completed' }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            activeSubTab === 'completed'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Sudah Selesai ({completedCount})
                        </button>
                      </div>

                      {/* Quick Communication Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyMemberIncompleteList(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Salin semua tugas belum selesai milik mahasiswa ini"
                        >
                          <Copy size={12} />
                          <span>Salin Daftar ({incompleteCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(member)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Kirim pesan WhatsApp pengingat"
                        >
                          <Send size={12} />
                          <span>Ingatkan di WA</span>
                        </button>
                      </div>
                    </div>

                    {/* Content: Incomplete Tasks */}
                    {activeSubTab === 'incomplete' && (
                      <div className="space-y-2">
                        {incompleteTasks.length === 0 ? (
                          <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-500">
                            🎉 Mahasiswa ini telah mengumpulkan seluruh tugas!
                          </div>
                        ) : (
                          incompleteTasks.map((t, idx) => (
                            <div 
                              key={t.id || idx}
                              className={`p-3 rounded-xl bg-white border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                t.isOverdue 
                                  ? 'border-rose-200 bg-rose-50/20' 
                                  : t.isUrgent 
                                    ? 'border-amber-200 bg-amber-50/20' 
                                    : 'border-slate-200'
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                                    {t.title}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                    {t.subject || t.course || 'Tugas'}
                                  </span>
                                  {t.isGroup && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                      Kelompok
                                    </span>
                                  )}
                                </div>

                                {/* Deadline status */}
                                <div className="flex items-center gap-2 text-[11px]">
                                  {t.isOverdue ? (
                                    <span className="text-rose-700 font-bold flex items-center gap-1">
                                      <AlertTriangle size={12} /> Tenggat Terlewat: {t.formattedDueDate}
                                    </span>
                                  ) : t.isUrgent ? (
                                    <span className="text-amber-700 font-bold flex items-center gap-1">
                                      <Clock size={12} /> Segera: {t.formattedDueDate}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 flex items-center gap-1">
                                      <Clock size={12} /> Tenggat: {t.formattedDueDate}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCopyTaskReminder(member, t)}
                                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Salin template pengingat tugas ini"
                                >
                                  {copiedTaskId === `${member.userId}_${t.id}` ? (
                                    <>
                                      <Check size={11} className="text-emerald-600" />
                                      <span className="text-emerald-600 font-bold">Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={11} />
                                      <span>Salin Teks</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsApp(member, t)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                  title="Ingatkan via WhatsApp langsung"
                                >
                                  <MessageSquare size={11} />
                                  <span>Kirim WA</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Content: Completed Tasks */}
                    {activeSubTab === 'completed' && (
                      <div className="space-y-1.5">
                        {completedTasks.length === 0 ? (
                          <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-500">
                            Belum ada tugas yang diselesaikan oleh mahasiswa ini.
                          </div>
                        ) : (
                          completedTasks.map((t, idx) => (
                            <div 
                              key={t.id || idx}
                              className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                  {t.subject || t.course}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                                Sudah Dikumpulkan ✓
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal: Salin Rekap Broadcast WhatsApp */}
      {showRekapModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Salin Rekap untuk WhatsApp</h2>
                    <p className="text-[11px] text-slate-500">Format pesan rapi yang siap di-paste ke grup WhatsApp kelas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRekapModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Filter Mata Kuliah Rekap</label>
                  <select
                    value={rekapCourse}
                    onChange={(e) => setRekapCourse(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Semua Mata Kuliah</option>
                    {availableCourses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rekapOnlyOverdue}
                      onChange={(e) => setRekapOnlyOverdue(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                    />
                    <span>Hanya tugas yang sudah terlewat (overdue)</span>
                  </label>
                </div>
              </div>

              {/* Preview Box */}
              <div className="flex-1 min-h-[200px] overflow-hidden flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Preview Teks WhatsApp:</label>
                <div className="flex-1 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed custom-scrollbar">
                  {generateRekapText()}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRekapModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleCopyRekap}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedRekap ? (
                    <>
                      <Check size={14} />
                      <span>Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Salin Pesan WhatsApp</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
