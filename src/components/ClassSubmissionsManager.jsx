import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Shield, 
  Lock, 
  Unlock, 
  KeyRound, 
  Search, 
  Filter, 
  Users, 
  User, 
  UserPlus, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  X, 
  Plus, 
  ArrowRight, 
  ArrowLeftRight, 
  BookOpen, 
  RotateCcw, 
  Check, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Clock, 
  FolderKanban,
  Key,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import CustomSelect from './CustomSelect';

export default function ClassSubmissionsManager({
  currentClass,
  currentUser,
  tasks = [],
  files = [],
  schedules = [],
  onUpdateSubmission,
  onMoveSubmission,
  onDeleteSubmission,
  onUpdateClassSettings,
  onRefreshData
}) {
  const classId = currentClass?.id;
  const storageKey = `komti_unlocked_${classId}`;

  // 1. PIN / Authentication State
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const pinInputRef = useRef(null);

  // Settings PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // 2. Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'needs_fixing' | 'group' | 'individual'

  // 3. Edit / Fix Submission Modal State
  const [editingSub, setEditingSub] = useState(null); // { task, submission }
  const [editGroupName, setEditGroupName] = useState('');
  const [editIsGroup, setEditIsGroup] = useState(false);
  const [editGroupMembers, setEditGroupMembers] = useState([]);
  const [editFileName, setEditFileName] = useState('');
  const [editTargetTaskId, setEditTargetTaskId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Quick add member inside edit modal
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [manualMemberName, setManualMemberName] = useState('');
  const [manualMemberNim, setManualMemberNim] = useState('');
  const [showManualMemberInput, setShowManualMemberInput] = useState(false);

  // Delete submission modal
  const [subToDelete, setSubToDelete] = useState(null);
  const [isDeletingSub, setIsDeletingSub] = useState(false);

  // Determine active PIN for the class (custom PIN or default 123456 / joinCode)
  const currentPin = useMemo(() => {
    return (currentClass?.komtiPin || '').trim();
  }, [currentClass?.komtiPin]);

  const defaultJoinCode = (currentClass?.joinCode || '').trim().toUpperCase();

  // Focus PIN input on load if not unlocked
  useEffect(() => {
    if (!isUnlocked) {
      setTimeout(() => pinInputRef.current?.focus(), 150);
    }
  }, [isUnlocked]);

  // Handle PIN Unlock Submission
  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    const cleanInput = pinInput.trim();
    if (!cleanInput) {
      toast.error('Masukkan PIN atau Password keamanan.');
      return;
    }

    let isValid = false;
    if (currentPin) {
      isValid = cleanInput === currentPin;
    } else {
      // If no custom PIN set yet, accept '123456' OR the class join code
      isValid = cleanInput === '123456' || cleanInput.toUpperCase() === defaultJoinCode;
    }

    if (isValid) {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch {}
      setPinInput('');
      toast.success('Akses Komti terbuka!');
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error('PIN / Password salah! Silakan coba lagi.');
    }
  };

  // Lock Tab Again
  const handleLock = () => {
    setIsUnlocked(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setPinInput('');
    toast.success('Tab berhasil dikunci kembali.');
  };

  // Handle Save New PIN
  const handleSavePin = async (e) => {
    e.preventDefault();
    const cleanNew = newPin.trim();
    if (cleanNew.length < 4) {
      toast.error('PIN minimal harus 4 karakter/angka!');
      return;
    }
    if (cleanNew !== confirmPin.trim()) {
      toast.error('Konfirmasi PIN tidak cocok!');
      return;
    }

    setIsSavingPin(true);
    try {
      if (onUpdateClassSettings) {
        await onUpdateClassSettings(classId, {
          komtiPin: cleanNew
        });
      }
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
      toast.success('PIN keamanan Komti berhasil diperbarui!');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan PIN baru.');
    } finally {
      setIsSavingPin(false);
    }
  };

  // Extract all student submissions from all tasks
  const allSubmissions = useMemo(() => {
    const list = [];
    (tasks || []).forEach(t => {
      const subs = t.submissions || [];
      subs.forEach(s => {
        const isGroup = Boolean(s.isGroup || (Array.isArray(s.groupMembers) && s.groupMembers.length > 1));
        const memberCount = Array.isArray(s.groupMembers) ? s.groupMembers.length : 0;
        
        // Smart problem indicator: if group task but 0 or 1 member
        const needsFixing = isGroup && memberCount <= 1;

        list.push({
          ...s,
          taskId: t.id,
          taskTitle: t.title,
          taskCourse: t.subject || t.course || '',
          taskDueDate: t.dueDate,
          taskDueTime: t.dueTime,
          isGroup,
          memberCount,
          needsFixing,
          task: t
        });
      });
    });
    return list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [tasks]);

  // Available courses
  const availableCourses = useMemo(() => {
    const set = new Set();
    (tasks || []).forEach(t => {
      const c = (t.subject || t.course || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [tasks]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter(item => {
      // Course filter
      if (selectedCourse !== 'all' && item.taskCourse.toLowerCase() !== selectedCourse.toLowerCase()) {
        return false;
      }
      // Task filter
      if (selectedTaskId !== 'all' && item.taskId !== selectedTaskId) {
        return false;
      }
      // Status filter
      if (statusFilter === 'needs_fixing' && !item.needsFixing) return false;
      if (statusFilter === 'group' && !item.isGroup) return false;
      if (statusFilter === 'individual' && item.isGroup) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubmitter = (item.userName || '').toLowerCase().includes(q);
        const matchTask = (item.taskTitle || '').toLowerCase().includes(q);
        const matchGroup = (item.groupName || '').toLowerCase().includes(q);
        const matchFile = (item.fileName || '').toLowerCase().includes(q);
        const matchMembers = (item.groupMembers || []).some(m => 
          (m.userName || m.name || '').toLowerCase().includes(q) || 
          (m.studentId || m.nim || '').toLowerCase().includes(q)
        );
        return matchSubmitter || matchTask || matchGroup || matchFile || matchMembers;
      }

      return true;
    });
  }, [allSubmissions, selectedCourse, selectedTaskId, statusFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const total = allSubmissions.length;
    const needsFixing = allSubmissions.filter(s => s.needsFixing).length;
    const groupCount = allSubmissions.filter(s => s.isGroup).length;
    const individualCount = allSubmissions.filter(s => !s.isGroup).length;
    return { total, needsFixing, groupCount, individualCount };
  }, [allSubmissions]);

  // Approved class members for quick selection
  const registeredMembers = useMemo(() => {
    return (currentClass?.members || [])
      .filter(m => (m.status || 'approved') === 'approved')
      .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '', 'id'));
  }, [currentClass?.members]);

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingSub(item);
    setEditGroupName(item.groupName || '');
    setEditIsGroup(Boolean(item.isGroup));
    setEditGroupMembers(Array.isArray(item.groupMembers) ? [...item.groupMembers] : []);
    setEditFileName(item.fileName || '');
    setEditTargetTaskId(item.taskId);
    setSelectedMemberToAdd('');
    setManualMemberName('');
    setManualMemberNim('');
    setShowManualMemberInput(false);
  };

  // Add Member from registered class members
  const handleAddRegisteredMember = () => {
    if (!selectedMemberToAdd) return;
    const memberObj = registeredMembers.find(m => m.userId === selectedMemberToAdd);
    if (!memberObj) return;

    // Check if already in list
    const already = editGroupMembers.some(m => m.userId === memberObj.userId);
    if (already) {
      toast.error(`${memberObj.name || memberObj.email} sudah ada dalam kelompok!`);
      return;
    }

    const newMember = {
      userId: memberObj.userId,
      userName: memberObj.name || memberObj.displayName || memberObj.email,
      name: memberObj.name || memberObj.displayName || memberObj.email,
      userEmail: memberObj.email || '',
      studentId: memberObj.studentId || memberObj.nim || ''
    };

    setEditGroupMembers(prev => [...prev, newMember]);
    setEditIsGroup(true); // Automatically ensure isGroup is active
    setSelectedMemberToAdd('');
    toast.success(`${newMember.name} ditambahkan ke kelompok!`);
  };

  // Add Member Manually (NIM + Name)
  const handleAddManualMember = () => {
    const name = manualMemberName.trim();
    const nim = manualMemberNim.trim();
    if (!name) {
      toast.error('Nama teman kelompok wajib diisi!');
      return;
    }

    const newMember = {
      userId: 'manual_' + Math.random().toString(36).substr(2, 9),
      userName: name,
      name: name,
      studentId: nim,
      nim: nim
    };

    setEditGroupMembers(prev => [...prev, newMember]);
    setEditIsGroup(true);
    setManualMemberName('');
    setManualMemberNim('');
    setShowManualMemberInput(false);
    toast.success(`Teman kelompok ${name} berhasil dicantumkan!`);
  };

  // Remove Member from Edit List
  const handleRemoveMember = (idxToRemove) => {
    setEditGroupMembers(prev => prev.filter((_, idx) => idx !== idxToRemove));
    toast.success('Anggota dihapus dari kelompok');
  };

  // Save Edit Submission Changes
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSub) return;

    setIsSavingEdit(true);
    try {
      const updates = {
        groupName: editGroupName.trim(),
        isGroup: editIsGroup,
        groupMembers: editGroupMembers,
        fileName: editFileName.trim() || editingSub.fileName
      };

      // 1. If target task changed, move submission first
      if (editTargetTaskId && editTargetTaskId !== editingSub.taskId) {
        if (onMoveSubmission) {
          await onMoveSubmission(editingSub.taskId, editTargetTaskId, editingSub.id);
        }
      }

      // 2. Update submission details on target task
      const targetId = (editTargetTaskId && editTargetTaskId !== editingSub.taskId) ? editTargetTaskId : editingSub.taskId;
      if (onUpdateSubmission) {
        await onUpdateSubmission(targetId, editingSub.id, updates);
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      setEditingSub(null);
      toast.success('Pengumpulan berhasil dirapikan! Perubahan anggota kelompok tersimpan.');
    } catch (err) {
      console.error('Save edit error:', err);
      toast.error(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete submission
  const handleConfirmDelete = async () => {
    if (!subToDelete) return;
    setIsDeletingSub(true);
    try {
      if (onDeleteSubmission) {
        await onDeleteSubmission(subToDelete.taskId, subToDelete.userId || subToDelete.id);
      }
      if (onRefreshData) {
        await onRefreshData();
      }
      setSubToDelete(null);
      toast.success('Pengumpulan berhasil dihapus.');
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus pengumpulan.');
    } finally {
      setIsDeletingSub(false);
    }
  };

  // ==========================================
  // VIEW 1: PIN LOCK SCREEN
  // ==========================================
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-10 sm:py-16 px-4">
        <div className={`bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 transition-all ${isShaking ? 'animate-shake ring-2 ring-rose-500/50' : ''}`}>
          
          {/* Lock Icon Emblem */}
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
            <Lock size={28} />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
              <Shield size={12} />
              <span>Akses Khusus Komti / Pengelola</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Kunci Keamanan PIN
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Fitur ini khusus untuk Komti merapikan pengumpulan tugas, menautkan teman kelompok, dan memperbaiki berkas mahasiswa.
            </p>
          </div>

          {/* PIN Input Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <KeyRound size={16} />
              </div>
              <input
                ref={pinInputRef}
                type={showPinText ? 'text' : 'password'}
                placeholder="Masukkan PIN / Password..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={30}
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-base sm:text-lg font-mono font-bold tracking-widest text-slate-900 placeholder:text-xs placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPinText ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPinText ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Numeric Keypad for fast touch input */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPinInput(prev => prev + num)}
                  className="py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 text-slate-800 font-bold text-sm border border-slate-100 shadow-2xs transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-bold text-xs transition-all cursor-pointer"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setPinInput(prev => prev + '0')}
                className="py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 text-slate-800 font-bold text-sm border border-slate-100 shadow-2xs transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPinInput(prev => prev.slice(0, -1))}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-bold text-xs transition-all cursor-pointer"
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-indigo-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock size={16} />
              <span>Buka Akses Pengelolaan</span>
            </button>
          </form>

          {/* Hint Footer */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1">
              <HelpCircle size={12} className="text-indigo-500" />
              <span>PIN bawaan: <strong className="text-slate-700">123456</strong> atau <strong className="text-slate-700">Kode Kelas ({defaultJoinCode || '------'})</strong></span>
            </p>
            <p className="text-[10px] text-slate-400">Komti dapat mengubah PIN ini setelah berhasil masuk.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: UNLOCKED MANAGEMENT WORKSPACE
  // ==========================================
  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300" />
                <span>Studio Rapikan Tugas</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>PIN Terverifikasi</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Kelola & Rapikan Pengumpulan Tugas
            </h1>
            <p className="text-xs text-indigo-100/80 leading-relaxed">
              Bantu teman kelas yang lupa mencantumkan anggota kelompok, rapikan nama berkas, atau pindahkan tugas yang salah kumpul ke tugas yang sesuai.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPinModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 backdrop-blur-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ubah PIN Keamanan Komti"
            >
              <Key size={14} />
              <span>Ganti PIN</span>
            </button>
            <button
              onClick={handleLock}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Kunci kembali tab ini"
            >
              <Lock size={14} />
              <span>Kunci Tab</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-white border p-3.5 rounded-2xl shadow-2xs cursor-pointer transition-all ${statusFilter === 'all' ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span className="font-semibold">Semua Berkas</span>
            <FolderKanban size={15} className="text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total pengumpulan</p>
        </div>

        <div 
          onClick={() => setStatusFilter('needs_fixing')}
          className={`bg-white border p-3.5 rounded-2xl shadow-2xs cursor-pointer transition-all ${statusFilter === 'needs_fixing' ? 'border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs">
            <span className="font-bold">⚠️ Perlu Dirapikan</span>
            <AlertTriangle size={15} className="text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-900 mt-1">{stats.needsFixing}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Kelompok belum ada anggota</p>
        </div>

        <div 
          onClick={() => setStatusFilter('group')}
          className={`bg-white border p-3.5 rounded-2xl shadow-2xs cursor-pointer transition-all ${statusFilter === 'group' ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span className="font-semibold">Tugas Kelompok</span>
            <Users size={15} className="text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.groupCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Submission kelompok</p>
        </div>

        <div 
          onClick={() => setStatusFilter('individual')}
          className={`bg-white border p-3.5 rounded-2xl shadow-2xs cursor-pointer transition-all ${statusFilter === 'individual' ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span className="font-semibold">Tugas Individu</span>
            <User size={15} className="text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.individualCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Submission perorangan</p>
        </div>
      </div>

      {/* Search & Filters Row */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mahasiswa, kelompok, tugas, nama berkas, atau NIM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Mata Kuliah */}
          <div className="w-full sm:w-56 shrink-0">
            <CustomSelect
              value={selectedCourse}
              onChange={setSelectedCourse}
              options={[
                { value: 'all', label: 'Semua Mata Kuliah' },
                ...availableCourses.map(c => ({ value: c, label: c }))
              ]}
              placeholder="Filter Mata Kuliah"
              searchPlaceholder="Cari MK..."
              icon={BookOpen}
            />
          </div>

          {/* Filter Tugas */}
          <div className="w-full sm:w-60 shrink-0">
            <CustomSelect
              value={selectedTaskId}
              onChange={setSelectedTaskId}
              options={[
                { value: 'all', label: 'Semua Judul Tugas' },
                ...tasks.map(t => ({
                  value: t.id,
                  label: t.title,
                  subtitle: t.subject || undefined
                }))
              ]}
              placeholder="Filter Tugas"
              searchPlaceholder="Cari tugas..."
              icon={FileText}
            />
          </div>
        </div>

        {/* Status Filter Chips & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {[
              { id: 'all', label: `Semua (${stats.total})` },
              { id: 'needs_fixing', label: `⚠️ Perlu Dirapikan (${stats.needsFixing})`, isAlert: stats.needsFixing > 0 },
              { id: 'group', label: `👥 Kelompok (${stats.groupCount})` },
              { id: 'individual', label: `👤 Individu (${stats.individualCount})` }
            ].map(tab => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? tab.isAlert
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-[#0F172A] text-white shadow-xs'
                      : tab.isAlert
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {(selectedCourse !== 'all' || selectedTaskId !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCourse('all');
                setSelectedTaskId('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RotateCcw size={11} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
            Daftar Pengumpulan Mahasiswa ({filteredSubmissions.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Klik "Rapikan" untuk menambahkan teman kelompok
          </span>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-2xs">
            <EmptyState
              variant="tasks"
              title="Tidak Ada Pengumpulan yang Cocok"
              description="Belum ada pengumpulan yang sesuai dengan filter atau kata kunci pencarian yang dipilih."
              actionLabel="Tampilkan Semua Pengumpulan"
              onAction={() => {
                setSelectedCourse('all');
                setSelectedTaskId('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredSubmissions.map((sub) => {
              const isGroup = sub.isGroup;
              const members = Array.isArray(sub.groupMembers) ? sub.groupMembers : [];
              const needsFixing = sub.needsFixing;

              return (
                <div
                  key={sub.id || `${sub.taskId}_${sub.userId}`}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all hover:shadow-md space-y-3.5 ${
                    needsFixing 
                      ? 'border-amber-300 bg-amber-50/15 ring-1 ring-amber-300/60' 
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* Row 1: Header (Task Info & Action Buttons) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isGroup ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isGroup ? <Users size={17} /> : <User size={17} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {sub.taskTitle}
                          </h4>
                          {sub.taskCourse && (
                            <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {sub.taskCourse}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>Pengunggah: <strong className="text-slate-800">{sub.userName || 'Mahasiswa'}</strong></span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions: Rapikan / Edit & Hapus */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          needsFixing
                            ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Edit3 size={13} />
                        <span>Rapikan {needsFixing ? '⚠️' : ''}</span>
                      </button>
                      <button
                        onClick={() => setSubToDelete(sub)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus pengumpulan ini"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Group & Members Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isGroup ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isGroup ? '👥 Tugas Kelompok' : '👤 Tugas Individu'}
                        </span>

                        {sub.groupName && (
                          <span className="font-bold text-xs text-slate-900 bg-slate-100/80 px-2 py-0.5 rounded-md">
                            🏷️ {sub.groupName}
                          </span>
                        )}

                        {needsFixing && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle size={11} className="text-amber-700" />
                            <span>Teman kelompok belum dicantumkan!</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <UserPlus size={12} />
                        <span>+ Kelola Anggota</span>
                      </button>
                    </div>

                    {/* Member Badges List */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Submitter Badge */}
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{sub.userName} (Pengunggah)</span>
                      </span>

                      {/* Group Members Badges */}
                      {members.map((m, idx) => {
                        const name = m.userName || m.name || 'Anggota';
                        const nim = m.studentId || m.nim || '';
                        return (
                          <span
                            key={m.userId || idx}
                            className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-900 text-xs font-semibold flex items-center gap-1.5 border border-indigo-200"
                          >
                            <UserCheck size={12} className="text-indigo-600" />
                            <span>{name}</span>
                            {nim && <span className="text-[10px] font-mono text-indigo-500">({nim})</span>}
                          </span>
                        );
                      })}

                      {members.length === 0 && isGroup && (
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="px-2.5 py-1 rounded-xl border border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>Tambahkan Teman Kelompok</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 3: File details */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-700" title={sub.fileName}>
                        {sub.fileName || 'Berkas Pengumpulan'}
                      </span>
                      {sub.fileSize && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({sub.fileSize})
                        </span>
                      )}
                    </div>

                    {sub.fileUrl && (
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                      >
                        <span>Lihat Berkas</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL 1: EDIT / RAPIKAN SUBMISSION MODAL  */}
      {/* ========================================== */}
      {editingSub && (
        <ModalPortal onClose={() => !isSavingEdit && setEditingSub(null)} maxWidth="max-w-2xl">
          <div className="bg-white border border-slate-200/90 rounded-3xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">
                    Rapikan Pengumpulan Tugas
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pengunggah: <strong>{editingSub.userName}</strong> · Tugas: <strong>{editingSub.taskTitle}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              
              {/* Tipe Tugas & Nama Kelompok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Tipe Pengumpulan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsGroup(false)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                        !editIsGroup 
                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <User size={13} />
                      <span>Individu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsGroup(true)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                        editIsGroup 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Users size={13} />
                      <span>Kelompok</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nama Kelompok (Opsional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kelompok 3 - Analisis Data"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* DAFTAR TEMAN KELOMPOK (CORE FEATURE) */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600" />
                    <span>Daftar Teman Kelompok ({editGroupMembers.length})</span>
                  </label>
                  <span className="text-[10px] text-indigo-700 font-medium">
                    Otomatis ditandai "Sudah Dikerjakan" di akun mereka
                  </span>
                </div>

                {/* Member Pills */}
                <div className="flex items-center gap-1.5 flex-wrap min-h-[36px] bg-white border border-slate-200/80 rounded-xl p-2">
                  {/* Primary Submitter Pill (Fixed) */}
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200" title="Pengunggah utama berkas">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{editingSub.userName} (Pengunggah)</span>
                  </span>

                  {editGroupMembers.map((m, idx) => (
                    <span
                      key={m.userId || idx}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 text-xs font-semibold flex items-center gap-1.5 border border-indigo-200 shadow-2xs group"
                    >
                      <UserCheck size={12} className="text-indigo-600" />
                      <span>{m.userName || m.name}</span>
                      {(m.studentId || m.nim) && <span className="text-[10px] text-indigo-500">({m.studentId || m.nim})</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                        title="Hapus dari kelompok"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}

                  {editGroupMembers.length === 0 && (
                    <span className="text-xs text-slate-400 italic px-1">
                      Belum ada teman kelompok yang dicantumkan.
                    </span>
                  )}
                </div>

                {/* Form to Add Member */}
                <div className="pt-2 border-t border-indigo-100/60 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Quick Add from Registered Members */}
                    <div className="flex-1">
                      <CustomSelect
                        value={selectedMemberToAdd}
                        onChange={setSelectedMemberToAdd}
                        options={registeredMembers
                          .filter(rm => rm.name !== editingSub.userName && !editGroupMembers.some(em => em.userId === rm.userId))
                          .map(m => ({
                            value: m.userId,
                            label: m.name || m.displayName || m.email,
                            subtitle: m.studentId || m.nim ? `NIM: ${m.studentId || m.nim}` : m.email
                          }))}
                        placeholder="-- Pilih Mahasiswa dari Kelas --"
                        searchPlaceholder="Cari nama mahasiswa..."
                        icon={User}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRegisteredMember}
                      disabled={!selectedMemberToAdd}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Tambah ke Kelompok</span>
                    </button>
                  </div>

                  {/* Manual Input Toggle */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500">Teman belum terdaftar di aplikasi?</span>
                    <button
                      type="button"
                      onClick={() => setShowManualMemberInput(!showManualMemberInput)}
                      className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      {showManualMemberInput ? 'Tutup Input Manual' : '+ Input Nama & NIM Manual'}
                    </button>
                  </div>

                  {/* Manual Input Fields */}
                  {showManualMemberInput && (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 animate-in fade-in duration-150">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Input Manual Teman Kelompok</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nama Mahasiswa *"
                          value={manualMemberName}
                          onChange={(e) => setManualMemberName(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400"
                        />
                        <input
                          type="text"
                          placeholder="NIM (Opsional)"
                          value={manualMemberNim}
                          onChange={(e) => setManualMemberNim(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddManualMember}
                        className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cantumkan Teman Ini
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Informasi Berkas & Pindah Tugas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Edit File Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nama Tampilan Berkas</label>
                  <input
                    type="text"
                    value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value)}
                    placeholder="Nama berkas..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Move to another task (if submitted to wrong task) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Tugas Terkait</span>
                    {editTargetTaskId !== editingSub.taskId && (
                      <span className="text-[10px] text-amber-600 font-bold">Akan dipindahkan</span>
                    )}
                  </label>
                  <CustomSelect
                    value={editTargetTaskId}
                    onChange={setEditTargetTaskId}
                    options={tasks.map(t => ({
                      value: t.id,
                      label: t.title,
                      subtitle: t.subject || undefined
                    }))}
                    placeholder="Pilih Tugas..."
                    searchPlaceholder="Cari tugas..."
                    icon={ArrowLeftRight}
                    direction="up"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Simpan Perapihan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* ========================================== */}
      {/* MODAL 2: GANTI PIN KEAMANAN KOMTI          */}
      {/* ========================================== */}
      {showPinModal && (
        <ModalPortal onClose={() => !isSavingPin && setShowPinModal(false)} maxWidth="max-w-md">
          <div className="bg-white border border-slate-200/90 rounded-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Key size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ubah PIN Keamanan Komti</h3>
                  <p className="text-[11px] text-slate-400">PIN ini dipakai untuk membuka tab Rapikan Tugas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">PIN / Password Baru *</label>
                <input
                  type="password"
                  placeholder="Minimal 4 karakter atau angka"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                  maxLength={30}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Konfirmasi PIN Baru *</label>
                <input
                  type="password"
                  placeholder="Ketik ulang PIN baru"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  required
                  maxLength={30}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                Catatan: Jangan lupakan PIN ini. Jika lupa, Anda tetap dapat menggunakan Kode Undangan Kelas ({defaultJoinCode}) untuk mereset.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPin || !newPin.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingPin ? 'Menyimpan...' : 'Simpan PIN'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(subToDelete)}
        onClose={() => !isDeletingSub && setSubToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengumpulan Ini?"
        description={`Apakah Anda yakin ingin menghapus pengumpulan tugas dari ${subToDelete?.userName} untuk tugas "${subToDelete?.taskTitle}"?`}
        confirmLabel="Ya, Hapus Pengumpulan"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeletingSub}
      />

    </div>
  );
}
