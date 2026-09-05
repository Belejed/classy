import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Plus, 
  X, 
  Paperclip, 
  Upload, 
  Check, 
  Clock, 
  Calendar, 
  FileText, 
  Trash2, 
  Download, 
  AlertCircle, 
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Layers,
  Sparkles,
  Users,
  Copy,
  MessageCircle,
  Mail,
  UserX, 
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadToGoogleDrive, checkDriveFiles, extractDriveFileId } from '../utils/driveUpload';
import ModalPortal from './ModalPortal';
import ConfirmModal from './ConfirmModal';

// Helper to check if a task deadline has passed
export const isTaskOverdue = (dueDate, dueTime = '23:59') => {
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

// Helper to check if a submission was made after the deadline
export const isSubmissionLate = (dueDate, dueTime = '23:59', submittedAt) => {
  if (!dueDate || !submittedAt) return false;
  try {
    const [year, month, day] = dueDate.split('-').map(Number);
    const [hours, minutes] = (dueTime || '23:59').split(':').map(Number);
    const dueDateTime = new Date(year, month - 1, day, hours || 23, minutes || 59, 59);
    const submitDateTime = new Date(submittedAt);
    return submitDateTime > dueDateTime;
  } catch {
    return false;
  }
};

// Helper to safely extract clean text if description or instructions contains raw JSON
const getCleanDescription = (desc) => {
  if (!desc || typeof desc !== 'string') return '';
  const trimmed = desc.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed.text || parsed.description || '';
      }
    } catch {}
  }
  return desc;
};

const getCleanInstructions = (inst) => {
  if (!inst || typeof inst !== 'string') return '';
  const trimmed = inst.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed.instructions || '';
      }
    } catch {}
  }
  return inst;
};

export default function ClassTasks({
  currentClass,
  currentUser,
  tasks = [],
  schedules = [],
  onCreateTask,
  onSubmitAssignment,
  onDeleteSubmission,
  onDeleteTask
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'not_submitted' | 'submitted' | 'missing'
  const [courseFilter, setCourseFilter] = useState('all'); // 'all' | <course_name>
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [autoRenameEnabled, setAutoRenameEnabled] = useState(true);
  const [managerTab, setManagerTab] = useState('unsubmitted'); // 'unsubmitted' | 'submitted'

  // In-app Delete Confirmation Modal
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Submission cancellation state
  const [showCancelSubmissionConfirm, setShowCancelSubmissionConfirm] = useState(false);
  const [isCancelingSubmission, setIsCancelingSubmission] = useState(false);

  // File upload state for submission
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Google Drive Crosscheck state
  const [driveStatusMap, setDriveStatusMap] = useState({});
  const [isCrosschecking, setIsCrosschecking] = useState(false);

  // Available courses from schedules and tasks
  const availableCourses = useMemo(() => {
    const set = new Set();
    (schedules || []).forEach(s => {
      const name = (s.course || s.title || '').trim();
      if (name) set.add(name);
    });
    (tasks || []).forEach(t => {
      const name = (t.course || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [schedules, tasks]);

  // Check Google Drive files for all tasks
  const checkDriveStatuses = useCallback(async (customTasks = tasks) => {
    const fileIdsToCheck = [];
    (customTasks || []).forEach(t => {
      (t.submissions || []).forEach(s => {
        const fileId = extractDriveFileId(s.fileUrl);
        if (fileId && !fileIdsToCheck.includes(fileId)) {
          fileIdsToCheck.push(fileId);
        }
      });
    });

    if (fileIdsToCheck.length > 0) {
      setIsCrosschecking(true);
      try {
        const results = await checkDriveFiles(fileIdsToCheck);
        setDriveStatusMap(prev => ({ ...prev, ...results }));
      } catch (err) {
        console.error("Failed to check drive statuses:", err);
      } finally {
        setIsCrosschecking(false);
      }
    }
  }, [tasks]);

  useEffect(() => {
    checkDriveStatuses();
  }, [checkDriveStatuses]);

  // Re-check drive status when user refocuses the tab/window
  useEffect(() => {
    const handleFocus = () => {
      checkDriveStatuses();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkDriveStatuses]);

  // When a task is selected/opened, immediately verify its submission files
  useEffect(() => {
    if (selectedTask?.submissions?.length) {
      const fileIds = selectedTask.submissions
        .map(s => extractDriveFileId(s.fileUrl))
        .filter(Boolean);
      if (fileIds.length > 0) {
        checkDriveFiles(fileIds).then(results => {
          setDriveStatusMap(prev => ({ ...prev, ...results }));
        }).catch(err => console.error(err));
      }
    }
  }, [selectedTask?.id]);

  // Auto-open task if ?task=taskId is provided in URL
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const taskIdParam = searchParams.get('task');
      if (taskIdParam && tasks?.length > 0) {
        const matched = tasks.find(t => t.id === taskIdParam);
        if (matched) {
          setSelectedTask(matched);
        }
      }
    } catch {}
  }, [tasks]);

  // Helper to determine if submission file is missing from Drive
  const isSubmissionFileMissing = (submission) => {
    if (!submission?.fileUrl) return false;
    const fileId = extractDriveFileId(submission.fileUrl);
    if (!fileId) return false;
    const status = driveStatusMap[fileId];
    if (status && status.exists === false) return true;
    return false;
  };

  // Helper: Generate standardized submission file name: namauser_namatugasnya_tanggal.ext
  const generateSubmissionFileName = (userName, taskTitle, originalFileName) => {
    const lastDotIndex = (originalFileName || '').lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? originalFileName.substring(lastDotIndex) : '';

    const cleanUser = (userName || 'Mahasiswa')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const cleanTask = (taskTitle || 'Tugas')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const todayStr = new Date().toISOString().split('T')[0];

    return `${cleanUser}_${cleanTask}_${todayStr}${ext}`;
  };

  // Eligible class members who are expected to submit (students and other registered members, excluding lecturers)
  const eligibleMembers = useMemo(() => {
    const members = currentClass?.members || [];
    const students = members.filter(m => m.role !== 'lecturer' && m.role !== 'dosen');
    return students.length > 0 ? students : members;
  }, [currentClass?.members]);

  // Compute submitted vs unsubmitted members for any task
  const getTaskSubmissionStatus = (task) => {
    if (!task) return { submittedList: [], unsubmittedList: [], submittedCount: 0, totalCount: 0 };

    const submissions = task.submissions || [];
    const submittedMap = new Map();
    submissions.forEach(s => {
      if (s.userId) {
        submittedMap.set(s.userId, s);
      }
    });

    const submittedList = [];
    const unsubmittedList = [];

    eligibleMembers.forEach(member => {
      const sub = submittedMap.get(member.userId);
      if (sub && !isSubmissionFileMissing(sub)) {
        submittedList.push({ member, submission: sub });
      } else {
        unsubmittedList.push({ member, submission: sub || null });
      }
    });

    // Capture any submissions from accounts not yet in eligibleMembers array
    submissions.forEach(s => {
      const exists = eligibleMembers.some(m => m.userId === s.userId);
      if (!exists && !isSubmissionFileMissing(s)) {
        submittedList.push({ 
          member: { userId: s.userId, name: s.userName, email: '' }, 
          submission: s 
        });
      }
    });

    return {
      submittedList,
      unsubmittedList,
      submittedCount: submittedList.length,
      totalCount: Math.max(eligibleMembers.length, submittedList.length)
    };
  };

  // Copy recap of unsubmitted students formatted for WhatsApp class group
  const handleCopyUnsubmittedList = (task, unsubmittedList) => {
    if (!unsubmittedList || unsubmittedList.length === 0) {
      toast.success('Semua mahasiswa sudah mengumpulkan tugas ini!');
      return;
    }

    const isOverdue = isTaskOverdue(task.dueDate, task.dueTime);

    const lines = [
      `📌 REKAP BELUM MENGUMPULKAN TUGAS`,
      `Tugas: ${task.title}`,
      `Mata Kuliah: ${task.course || currentClass?.name || '-'}`,
      `Deadline: ${task.dueDate} · ${task.dueTime} WIB ${isOverdue ? '⚠️ (SUDAH LEWAT TENGGAT)' : ''}`,
      ``,
      `Daftar Mahasiswa (${unsubmittedList.length} orang):`,
      ...unsubmittedList.map((item, idx) => `${idx + 1}. ${item.member?.name || item.member?.email || 'Mahasiswa'}`),
      ``,
      isOverdue
        ? `Tenggat pengumpulan telah terlewat, mohon segera mengunggah berkas tugas Anda ya. Terima kasih! 🙏`
        : `Harap segera dikumpulkan sebelum batas waktu ya. Terima kasih! 🙏`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    toast.success(`Daftar ${unsubmittedList.length} mahasiswa belum kirim berhasil disalin!`);
  };

  // Create Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCourse, setTaskCourse] = useState(availableCourses.length > 0 ? availableCourses[0] : (currentClass?.name || ''));
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [taskLecturer, setTaskLecturer] = useState(currentClass?.lecturer || '');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskDueTime, setTaskDueTime] = useState('23:59');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const role = currentClass?.userRole;
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  // Overdue count for current user
  const overdueTasksCount = useMemo(() => {
    return tasks.filter(t => {
      const userSub = t.submissions?.find(s => s.userId === currentUser?.uid);
      const isFileMissing = userSub && isSubmissionFileMissing(userSub);
      const isSubmitted = !!userSub && !isFileMissing;
      return !isSubmitted && isTaskOverdue(t.dueDate, t.dueTime);
    }).length;
  }, [tasks, currentUser]);

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.course || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const userSub = t.submissions?.find(s => s.userId === currentUser?.uid);
    const isFileMissing = userSub && isSubmissionFileMissing(userSub);
    const isSubmitted = !!userSub && !isFileMissing;
    const isOverdue = isTaskOverdue(t.dueDate, t.dueTime);

    let matchesStatus = true;
    if (statusFilter === 'submitted') matchesStatus = isSubmitted;
    if (statusFilter === 'not_submitted') matchesStatus = !isSubmitted;
    if (statusFilter === 'overdue') matchesStatus = isOverdue && !isSubmitted;
    if (statusFilter === 'missing') matchesStatus = isFileMissing;

    const matchesCourse = courseFilter === 'all' || 
                          (t.course || '').toLowerCase() === courseFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCourse;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('Judul tugas wajib diisi');
      return;
    }
    if (!taskCourse.trim()) {
      toast.error('Nama mata kuliah wajib diisi');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateTask({
        title: taskTitle.trim(),
        course: taskCourse.trim(),
        lecturer: taskLecturer.trim(),
        dueDate: taskDueDate,
        dueTime: taskDueTime,
        description: taskDesc.trim(),
        instructions: taskInstructions.trim(),
        submissionRequired: true,
        attachments: []
      });
      toast.success('Tugas baru berhasil dipublikasikan!');
      setShowCreateModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskInstructions('');
    } catch (err) {
      toast.error(err.message || 'Gagal membuat tugas');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    setIsSubmittingFile(true);
    try {
      const submissionFileName = autoRenameEnabled 
        ? generateSubmissionFileName(currentUser?.displayName, selectedTask.title, file.name)
        : `${currentUser?.displayName || 'Mahasiswa'} - ${file.name}`;

      const taskFolder = `Tugas: ${selectedTask.title}`;
      let fileUrl = '';
      let fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      try {
        toast.loading('Mengunggah berkas tugas ke Google Drive...', { id: 'task-upload' });
        const driveRes = await uploadToGoogleDrive({
          file,
          name: submissionFileName,
          folderName: taskFolder
        });
        fileUrl = driveRes.webViewLink || driveRes.previewUrl;
        fileSize = driveRes.fileSize || fileSize;
        toast.success('Tugas tersimpan di Google Drive!', { id: 'task-upload' });
      } catch (driveErr) {
        console.warn('Google Drive error, falling back to local encoding:', driveErr);
        toast.error(`Drive error: ${driveErr.message}. Menyimpan lokal...`, { id: 'task-upload' });
        const reader = new FileReader();
        fileUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      await onSubmitAssignment(selectedTask.id, {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Student',
        fileName: submissionFileName,
        fileUrl: fileUrl,
        fileSize: fileSize
      });

      toast.success('Tugas berhasil dikumpulkan!');
      
      // Update driveStatusMap immediately for the new file if uploaded to Drive
      const newFileId = extractDriveFileId(fileUrl);
      if (newFileId) {
        setDriveStatusMap(prev => ({
          ...prev,
          [newFileId]: { exists: true, name: submissionFileName, webViewLink: fileUrl }
        }));
      }

      // Refresh selected task
      setSelectedTask(prev => ({
        ...prev,
        submissions: [
          ...(prev.submissions || []).filter(s => s.userId !== currentUser.uid),
          {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Student',
            fileName: submissionFileName,
            fileUrl: fileUrl,
            fileSize: fileSize,
            submittedAt: new Date().toISOString()
          }
        ]
      }));
    } catch (err) {
      toast.error(err.message || 'Gagal mengunggah file pengumpulan');
    } finally {
      setIsSubmittingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    try {
      await onDeleteTask(taskToDelete.id);
      setSelectedTask(null);
      setTaskToDelete(null);
      toast.success('Tugas berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus tugas');
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleCancelSubmission = async () => {
    if (!selectedTask || !currentUser) return;
    setIsCancelingSubmission(true);
    try {
      if (onDeleteSubmission) {
        await onDeleteSubmission(selectedTask.id, currentUser.uid);
      }
      setSelectedTask(prev => {
        if (!prev) return null;
        return {
          ...prev,
          submissions: (prev.submissions || []).filter(s => s.userId !== currentUser.uid)
        };
      });
      setShowCancelSubmissionConfirm(false);
      toast.success('Pengumpulan berhasil dibatalkan dan file telah dihapus.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membatalkan pengumpulan');
    } finally {
      setIsCancelingSubmission(false);
    }
  };

  const handleManualCheckDrive = async () => {
    if (!selectedTask?.submissions?.length) return;
    const fileIds = selectedTask.submissions
      .map(s => extractDriveFileId(s.fileUrl))
      .filter(Boolean);
    if (fileIds.length === 0) return;

    setIsCrosschecking(true);
    try {
      const results = await checkDriveFiles(fileIds);
      setDriveStatusMap(prev => ({ ...prev, ...results }));
      toast.success('Status Google Drive diperbarui');
    } catch (err) {
      console.error(err);
      toast.error('Gagal memeriksa status Drive');
    } finally {
      setIsCrosschecking(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Hidden file input for assignment submissions */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">Assignments & Tasks</h2>
          <p className="text-xs sm:text-sm text-[#64748B]">Semua penugasan kuliah, instruksi, dan pengumpulan berkas terorganisir per mata kuliah.</p>
        </div>

        {isManager && (
          <button
            onClick={() => {
              setIsCustomCourse(false);
              setTaskCourse(availableCourses.length > 0 ? availableCourses[0] : (currentClass?.name || ''));
              setShowCreateModal(true);
            }}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-4 py-2.5 sm:py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0 cursor-pointer min-h-[40px]"
          >
            <Plus size={14} />
            <span>Tambah Tugas Baru</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Cari nama tugas atau mata kuliah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] min-h-[38px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Course Filter Dropdown */}
            {availableCourses.length > 0 && (
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569] focus:outline-none focus:border-[#0F172A] shadow-2xs cursor-pointer sm:max-w-[200px] truncate min-h-[38px]"
              >
                <option value="all">Semua Mata Kuliah ({tasks.length})</option>
                {availableCourses.map(c => {
                  const count = tasks.filter(t => (t.course || '').toLowerCase() === c.toLowerCase()).length;
                  return (
                    <option key={c} value={c}>
                      {c} ({count})
                    </option>
                  );
                })}
              </select>
            )}

            {/* Status Filter Chips (Horizontally scrollable with smooth touch on mobile) */}
            <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1 sm:pb-0 no-scrollbar -mx-0.5 px-0.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 sm:py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap text-xs ${
                  statusFilter === 'all' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('not_submitted')}
                className={`px-3 py-2 sm:py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap text-xs ${
                  statusFilter === 'not_submitted' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Belum Dikumpulkan
              </button>
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-3 py-2 sm:py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap text-xs ${
                  statusFilter === 'overdue' 
                    ? 'bg-rose-700 text-white shadow-2xs' 
                    : overdueTasksCount > 0
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                <Clock size={12} className={overdueTasksCount > 0 && statusFilter !== 'overdue' ? 'text-rose-600' : ''} />
                <span>Terlewat</span>
                {overdueTasksCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'overdue' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'
                  }`}>
                    {overdueTasksCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStatusFilter('submitted')}
                className={`px-3 py-2 sm:py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap text-xs ${
                  statusFilter === 'submitted' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Sudah Dikumpulkan
              </button>
              <button
                onClick={() => setStatusFilter('missing')}
                className={`px-3 py-2 sm:py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap text-xs ${
                  statusFilter === 'missing' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle size={12} />
                <span>File Hilang</span>
              </button>
            </div>
          </div>
        </div>

        {/* Course Quick Category Pills */}
        {availableCourses.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-[#64748B] shrink-0 flex items-center gap-1 mr-1">
              <BookOpen size={12} className="text-[#94A3B8]" />
              <span>Mata Kuliah:</span>
            </span>
            <button
              onClick={() => setCourseFilter('all')}
              className={`px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
                courseFilter === 'all' 
                  ? 'bg-[#0F172A] text-white shadow-2xs' 
                  : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              Semua ({tasks.length})
            </button>
            {availableCourses.map(c => {
              const count = tasks.filter(t => (t.course || '').toLowerCase() === c.toLowerCase()).length;
              return (
                <button
                  key={c}
                  onClick={() => setCourseFilter(c)}
                  className={`px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
                    courseFilter === c 
                      ? 'bg-[#0F172A] text-white shadow-2xs' 
                      : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {c} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-2 shadow-2xs">
          <CheckSquare size={32} className="mx-auto text-[#94A3B8] opacity-60" />
          <h3 className="font-bold text-sm text-[#0F172A]">Tidak ada tugas yang cocok</h3>
          <p className="text-xs text-[#64748B]">Semua tugas sudah dikumpulkan atau tidak ada tugas yang cocok dengan filter mata kuliah / status.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const userSub = task.submissions?.find(s => s.userId === currentUser?.uid);
            const isFileMissing = userSub && isSubmissionFileMissing(userSub);
            const isSubmitted = !!userSub && !isFileMissing;
            const isOverdue = isTaskOverdue(task.dueDate, task.dueTime);
            const isLate = userSub ? isSubmissionLate(task.dueDate, task.dueTime, userSub.submittedAt) : false;

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`bg-white border p-4 sm:p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isFileMissing 
                    ? 'border-rose-300 bg-rose-50/15' 
                    : isOverdue && !isSubmitted
                      ? 'border-rose-300 bg-rose-50/10 hover:border-rose-400 ring-1 ring-rose-200/40'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center gap-1 truncate max-w-[200px]">
                      <BookOpen size={11} className="text-slate-500 shrink-0" />
                      <span className="truncate">{task.course || currentClass?.name}</span>
                    </span>

                    {isFileMissing ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse shrink-0">
                        <AlertTriangle size={11} />
                        <span>File Hilang di Drive</span>
                      </span>
                    ) : isSubmitted ? (
                      isLate ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0" title="Dikumpulkan setelah melewati batas tenggat waktu">
                          <Clock size={10} className="text-amber-600" />
                          <span>Terkumpul (Terlambat)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <Check size={10} />
                          <span>Submitted</span>
                        </span>
                      )
                    ) : isOverdue ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0 animate-pulse">
                        <AlertCircle size={10} className="text-rose-600" />
                        <span>Terlewat</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                        Not submitted
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-[#0F172A] leading-snug">
                    {task.title}
                  </h3>

                  {getCleanDescription(task.description) && (
                    <p className="text-xs text-[#64748B] line-clamp-2">
                      {getCleanDescription(task.description)}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                  <span className={`flex items-center gap-1 font-medium ${isOverdue && !isSubmitted ? 'text-rose-600 font-bold' : ''}`}>
                    <Clock size={12} className={isOverdue && !isSubmitted ? 'text-rose-600' : ''} />
                    <span>Due {task.dueDate} · {task.dueTime}</span>
                    {isOverdue && !isSubmitted && (
                      <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold uppercase tracking-wider border border-rose-200">
                        Lewat
                      </span>
                    )}
                  </span>

                  {task.attachments?.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Paperclip size={11} />
                      <span>{task.attachments.length} attachments</span>
                    </span>
                  )}
                </div>

                {/* Manager Quick Submission Count */}
                {isManager && (() => {
                  const status = getTaskSubmissionStatus(task);
                  const unsubmittedCount = status.unsubmittedList.length;

                  return (
                    <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#475569] flex items-center gap-1">
                        <Users size={12} className="text-slate-500" />
                        <span>{status.submittedCount}/{status.totalCount} Terkumpul</span>
                      </span>

                      {unsubmittedCount > 0 ? (
                        <span className={`font-bold px-2 py-0.5 rounded-full border ${
                          isOverdue 
                            ? 'text-rose-700 bg-rose-100/90 border-rose-300' 
                            : 'text-rose-700 bg-rose-50 border-rose-200/80'
                        }`}>
                          {unsubmittedCount} belum kirim {isOverdue && '(Terlewat)'}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Semua sudah kirim ✨
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: TASK DETAIL & ASSIGNMENT SUBMISSION */}
      {selectedTask && (
        <ModalPortal onClose={() => setSelectedTask(null)} maxWidth="max-w-xl">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[88vh] sm:max-h-[85vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full w-fit mb-1.5 max-w-full">
                  <BookOpen size={11} className="shrink-0" />
                  <span className="break-words">{selectedTask.course || currentClass?.name}</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-[#0F172A] leading-snug break-words">
                  {selectedTask.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTask(null)} 
                className="p-1.5 -mr-1 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Task Info Chips */}
            {(() => {
              const userSub = selectedTask.submissions?.find(s => s.userId === currentUser?.uid);
              const isFileMissing = userSub && isSubmissionFileMissing(userSub);
              const isSubmitted = !!userSub && !isFileMissing;
              const isOverdue = isTaskOverdue(selectedTask.dueDate, selectedTask.dueTime);
              const showOverdue = isOverdue && !isSubmitted;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-start ${
                    showOverdue 
                      ? 'bg-rose-50/80 border-rose-200' 
                      : isSubmitted
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-[#F8FAFC] border-[#E2E8F0]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold block ${
                        showOverdue 
                          ? 'text-rose-700 font-bold' 
                          : isSubmitted
                          ? 'text-emerald-800 font-bold'
                          : 'text-[#64748B]'
                      }`}>
                        Deadline
                      </span>
                      {showOverdue ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 uppercase">
                          Terlewat
                        </span>
                      ) : isSubmitted ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 uppercase flex items-center gap-0.5">
                          <Check size={9} />
                          <span>Terkumpul</span>
                        </span>
                      ) : null}
                    </div>
                    <span className={`font-bold text-xs sm:text-sm block ${
                      showOverdue 
                        ? 'text-rose-700' 
                        : isSubmitted
                        ? 'text-emerald-950'
                        : 'text-[#0F172A]'
                    }`}>
                      {selectedTask.dueDate}
                    </span>
                    <span className={`text-[11px] font-semibold block ${
                      showOverdue 
                        ? 'text-rose-600 font-bold' 
                        : isSubmitted
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}>
                      {selectedTask.dueTime} WIB
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-start">
                    <span className="text-[10px] font-semibold text-[#64748B] block mb-0.5">Mata Kuliah</span>
                    <span className="font-bold text-[#0F172A] text-xs sm:text-sm leading-snug break-words block">{selectedTask.course || 'Umum'}</span>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] col-span-2 sm:col-span-1 flex flex-col justify-start">
                    <span className="text-[10px] font-semibold text-[#64748B] block mb-0.5">Dosen Pengampu</span>
                    <span className="font-bold text-[#0F172A] text-xs sm:text-sm leading-snug break-words block">{selectedTask.lecturer || '-'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Description & Instructions */}
            {getCleanDescription(selectedTask.description) && (
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">Deskripsi Penugasan</h4>
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] break-words">
                  {getCleanDescription(selectedTask.description)}
                </p>
              </div>
            )}

            {getCleanInstructions(selectedTask.instructions) && (
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">Petunjuk Pengumpulan</h4>
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap bg-amber-50/50 p-3 rounded-xl border border-amber-200/70 break-words">
                  {getCleanInstructions(selectedTask.instructions)}
                </p>
              </div>
            )}

            {/* Student Submission Action Area */}
            <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
              <h4 className="font-bold text-xs text-[#0F172A]">Pengumpulan Berkas Tugas</h4>

              {(() => {
                const userSub = selectedTask.submissions?.find(s => s.userId === currentUser?.uid);
                const isOverdue = isTaskOverdue(selectedTask.dueDate, selectedTask.dueTime);
                
                if (!userSub) {
                  return (
                    <div className="space-y-3">
                      {isOverdue && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Batas Waktu Pengumpulan Telah Lewat</p>
                            <p className="text-[11px] text-rose-700 mt-0.5">
                              Tenggat tugas ini berakhir pada {selectedTask.dueDate} pukul {selectedTask.dueTime} WIB. Berkas yang dikumpulkan sekarang akan dicatat dengan status terlambat.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Auto-rename toggle and preview info */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#0F172A]">Auto-Rename Berkas</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Format Standar
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              checked={autoRenameEnabled} 
                              onChange={(e) => setAutoRenameEnabled(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#0F172A]"></div>
                          </label>
                        </div>
                        <p className="text-[10px] text-[#64748B] font-mono leading-relaxed break-all">
                          {autoRenameEnabled ? (
                            <span className="text-emerald-700 font-semibold block">
                              Format: {generateSubmissionFileName(currentUser?.displayName, selectedTask?.title, 'dokumen.pdf')}
                            </span>
                          ) : (
                            <span className="text-[#64748B]">Nama file asli akan tetap digunakan tanpa perubahan.</span>
                          )}
                        </p>
                      </div>

                      <div className="p-4 sm:p-6 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] flex flex-col items-center justify-center text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#64748B]">
                          <Upload size={18} />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#0F172A]">Unggah Berkas Tugas Kamu</p>
                          <p className="text-[11px] text-[#64748B]">PDF, DOCX, ZIP, gambar, atau berkas lainnya.</p>
                        </div>
                        <button
                          type="button"
                          disabled={isSubmittingFile}
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                              fileInputRef.current.click();
                            }
                          }}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 min-h-[42px]"
                        >
                          <Upload size={13} className={isSubmittingFile ? "animate-bounce" : ""} />
                          <span>{isSubmittingFile ? 'Mengunggah...' : 'Pilih File & Upload'}</span>
                        </button>
                        <p className="text-[10px] text-[#94A3B8]">
                          Tugas otomatis tersinkron ke Google Drive dosen & komti
                        </p>
                      </div>
                    </div>
                  );
                }

                const isMissing = isSubmissionFileMissing(userSub);
                const isLate = isSubmissionLate(selectedTask.dueDate, selectedTask.dueTime, userSub.submittedAt);

                if (isMissing) {
                  return (
                    <div className="p-3 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                          <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                          <span>File Tidak Ditemukan di Google Drive!</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 w-fit">
                          Status: File Hilang
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed">
                        Berkas tugas ini terhapus atau berada di Sampah Google Drive. Status tugas tidak lagi dianggap "Submitted". Harap unggah ulang berkas tugas agar dapat dinilai dosen/komti.
                      </p>
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-rose-200/60">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] text-rose-600 break-all">
                            ⚠️ {userSub.fileName}
                          </span>
                          <button
                            type="button"
                            disabled={isCrosschecking}
                            onClick={handleManualCheckDrive}
                            className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer shrink-0"
                            title="Periksa ulang Google Drive"
                          >
                            <RefreshCw size={11} className={isCrosschecking ? "animate-spin" : ""} />
                            <span>{isCrosschecking ? 'Memeriksa...' : 'Cek Ulang Drive'}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setShowCancelSubmissionConfirm(true)}
                            className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Hapus Data Pengumpulan</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSubmittingFile}
                            onClick={() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                                fileInputRef.current.click();
                              }
                            }}
                            className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50 min-h-[36px]"
                          >
                            <Upload size={12} className={isSubmittingFile ? "animate-bounce" : ""} />
                            <span>{isSubmittingFile ? 'Mengunggah...' : 'Upload Ulang Sekarang'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-3 sm:p-4 rounded-xl bg-white border border-emerald-200 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <Check size={14} className="text-emerald-600 shrink-0" />
                          <span>Tugas Berhasil Dikumpulkan</span>
                        </span>
                        {isLate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock size={10} className="text-amber-600" />
                            <span>Dikumpulkan Terlambat</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(userSub.submittedAt).toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="font-mono text-xs text-[#0F172A] break-all bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      📄 {userSub.fileName}
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-emerald-100">
                      <div className="flex items-center gap-3 flex-wrap">
                        {userSub.fileUrl?.includes('drive.google.com') ? (
                          <a
                            href={userSub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            <span>Buka di Google Drive</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-[#64748B]">Tersimpan di Sistem</span>
                        )}
                        <button
                          type="button"
                          disabled={isCrosschecking}
                          onClick={handleManualCheckDrive}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                          title="Periksa keberadaan file di Google Drive"
                        >
                          <RefreshCw size={11} className={isCrosschecking ? "animate-spin text-sky-600" : ""} />
                          <span>{isCrosschecking ? 'Memeriksa...' : 'Cek Drive'}</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          disabled={isSubmittingFile}
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                              fileInputRef.current.click();
                            }
                          }}
                          className="text-xs font-bold text-[#0F172A] hover:underline cursor-pointer disabled:opacity-50 text-left sm:text-right py-1"
                        >
                          {isSubmittingFile ? 'Mengunggah...' : 'Kirim Ulang File (Resubmit)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCancelSubmissionConfirm(true)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer py-1"
                          title="Batalkan pengumpulan dan hapus file"
                        >
                          <Trash2 size={12} />
                          <span>Hapus File</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Manager View: Comprehensive Task Submission Monitor */}
            {isManager && (() => {
              const status = getTaskSubmissionStatus(selectedTask);
              const percent = status.totalCount > 0 
                ? Math.round((status.submittedCount / status.totalCount) * 100) 
                : 0;
              const hasUnsubmitted = status.unsubmittedList.length > 0;

              return (
                <div className="space-y-3 pt-3 border-t border-[#F1F5F9]">
                  {/* Header & Progress Stats */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-[#0F172A] shrink-0" />
                        <h4 className="font-bold text-xs sm:text-sm text-[#0F172A]">
                          Monitor Pengumpulan Kelas
                        </h4>
                      </div>
                      <a
                        href="https://drive.google.com/drive/folders/1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>Buka Folder Drive</span>
                      </a>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 sm:p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs">
                        <span className="text-[#64748B] font-medium">Progres Pengumpulan:</span>
                        <span className="font-bold text-[#0F172A]">
                          {status.submittedCount} / {status.totalCount} Mahasiswa ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-2 sm:h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${
                            percent === 100 ? 'bg-emerald-500' : 'bg-[#0F172A]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tabs & Quick Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setManagerTab('unsubmitted')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          managerTab === 'unsubmitted'
                            ? 'bg-white text-rose-700 shadow-xs'
                            : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        <UserX size={13} className={managerTab === 'unsubmitted' ? 'text-rose-600' : ''} />
                        <span>Belum Kirim</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          hasUnsubmitted ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {status.unsubmittedList.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setManagerTab('submitted')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          managerTab === 'submitted'
                            ? 'bg-white text-emerald-700 shadow-xs'
                            : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        <UserCheck size={13} className={managerTab === 'submitted' ? 'text-emerald-600' : ''} />
                        <span>Sudah Kirim</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                          {status.submittedCount}
                        </span>
                      </button>
                    </div>

                    {/* Copy List WhatsApp Button */}
                    {hasUnsubmitted && (
                      <button
                        type="button"
                        onClick={() => handleCopyUnsubmittedList(selectedTask, status.unsubmittedList)}
                        className="w-full sm:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 sm:py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0 min-h-[36px]"
                        title="Salin rekap nama yang belum kirim untuk dibagikan ke WhatsApp grup"
                      >
                        <Copy size={13} className="text-slate-500" />
                        <span>Salin List WA</span>
                      </button>
                    )}
                  </div>

                  {/* Tab 1: Unsubmitted Students List */}
                  {managerTab === 'unsubmitted' && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {!hasUnsubmitted ? (
                        <div className="py-6 text-center bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                          <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-1" />
                          <p className="text-xs font-bold text-emerald-800">Semua Mahasiswa Sudah Mengumpulkan! 🎉</p>
                          <p className="text-[11px] text-emerald-600 mt-0.5">Tidak ada mahasiswa yang terlambat atau belum kirim.</p>
                        </div>
                      ) : (
                        status.unsubmittedList.map(({ member, submission }, idx) => {
                          const name = member?.name || member?.email || `Mahasiswa #${idx + 1}`;
                          const email = member?.email || '';
                          const phone = member?.phoneNumber || member?.phone || '';
                          let cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
                          if (cleanPhone.startsWith('0')) {
                            cleanPhone = '62' + cleanPhone.slice(1);
                          }
                          const isMissingFile = submission && isSubmissionFileMissing(submission);
                          const isOverdue = isTaskOverdue(selectedTask.dueDate, selectedTask.dueTime);

                          const waText = encodeURIComponent(
                            isOverdue
                              ? `Halo ${name}, mengingatkan untuk tugas *${selectedTask.title}* (${selectedTask.course || currentClass?.name || 'Kuliah'}) batas pengumpulannya telah LEWAT (${selectedTask.dueDate} pukul ${selectedTask.dueTime} WIB). Mohon segera diunggah ya. Terima kasih! 🙏`
                              : `Halo ${name}, mengingatkan untuk tugas *${selectedTask.title}* (${selectedTask.course || currentClass?.name || 'Kuliah'}) batas pengumpulannya adalah ${selectedTask.dueDate} pukul ${selectedTask.dueTime} WIB. Mohon segera diunggah ya. Terima kasih! 🙏`
                          );

                          return (
                            <div
                              key={member?.userId || member?.id || idx}
                              className="p-2 sm:p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-[#0F172A] truncate block max-w-[140px] xs:max-w-[190px] sm:max-w-none">
                                      {name}
                                    </span>
                                    {isOverdue && (
                                      <span className="shrink-0 px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-700 rounded border border-rose-200">
                                        Melewati Tenggat
                                      </span>
                                    )}
                                    {isMissingFile && (
                                      <span className="shrink-0 px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                        File Hilang di Drive
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[#64748B] truncate block">
                                    {email || (phone ? `WA: ${phone}` : 'Belum mengunggah')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {cleanPhone ? (
                                  <a
                                    href={`https://wa.me/${cleanPhone}?text=${waText}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                                    title={`Chat WhatsApp ke ${name}`}
                                  >
                                    <MessageCircle size={12} />
                                    <span>Ingatkan WA</span>
                                  </a>
                                ) : email ? (
                                  <a
                                    href={`mailto:${email}?subject=${encodeURIComponent(`Pengingat Tugas: ${selectedTask.title}`)}&body=${waText}`}
                                    className="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                                    title={`Kirim email ke ${email}`}
                                  >
                                    <Mail size={12} />
                                    <span>Email</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Tab 2: Submitted Students List */}
                  {managerTab === 'submitted' && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {status.submittedList.length === 0 ? (
                        <div className="py-6 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                          <Users size={24} className="mx-auto text-slate-400 mb-1" />
                          <p className="text-xs font-bold text-slate-700">Belum Ada yang Mengumpulkan</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Daftar pengumpulan akan muncul di sini saat mahasiswa mengunggah file.</p>
                        </div>
                      ) : (
                        status.submittedList.map(({ member, submission }) => {
                          const subMissing = isSubmissionFileMissing(submission);
                          const isLate = isSubmissionLate(selectedTask.dueDate, selectedTask.dueTime, submission.submittedAt);
                          return (
                            <div
                              key={submission.id || submission.userId}
                              className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between text-xs gap-2 transition-colors ${
                                subMissing ? 'bg-rose-50/70 border-rose-200' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {(submission.userName || member?.name || 'M').charAt(0).toUpperCase()}
                                </div>
                                <div className="truncate flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-[#0F172A] truncate block max-w-[140px] xs:max-w-[190px] sm:max-w-none">
                                      {submission.userName || member?.name}
                                    </span>
                                    {isLate && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                        Terlambat
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[#64748B] block truncate font-mono">
                                    {submission.fileName}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {subMissing ? (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    <span>File Hilang</span>
                                  </span>
                                ) : submission.fileUrl ? (
                                  <a
                                    href={submission.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-[11px] flex items-center gap-1 border border-sky-200 transition-colors"
                                  >
                                    <ExternalLink size={11} />
                                    <span>Drive</span>
                                  </a>
                                ) : null}
                                <span className="text-[10px] text-[#94A3B8] hidden sm:inline">
                                  {new Date(submission.submittedAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F1F5F9]">
              {isManager ? (
                <button
                  type="button"
                  onClick={() => setTaskToDelete(selectedTask)}
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer min-h-[38px] transition-colors border border-rose-200/60 sm:border-transparent"
                >
                  <Trash2 size={13} />
                  <span>Hapus Tugas</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedTask(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer min-h-[38px] text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: CREATE TASK MODAL (Coordinator) */}
      {showCreateModal && (
        <ModalPortal onClose={() => setShowCreateModal(false)} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-base text-[#0F172A]">Tambah Penugasan Baru</h3>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-1.5 -mr-1 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Judul Penugasan</label>
                <input
                  type="text"
                  placeholder="e.g. Makalah Riset Logistik & Analisis Kasus"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all min-h-[40px]"
                />
              </div>

              {/* Course Selection (Dropdown from Schedule or Custom) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-semibold text-[#334155]">Mata Kuliah</label>
                  {availableCourses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCourse(prev => !prev);
                        if (!isCustomCourse) setTaskCourse('');
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      {isCustomCourse ? '← Pilih dari Jadwal Kelas' : '+ Tulis Mata Kuliah Baru'}
                    </button>
                  )}
                </div>

                {!isCustomCourse && availableCourses.length > 0 ? (
                  <select
                    value={taskCourse}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setTaskCourse(selected);
                      // Auto-fill lecturer from schedule if matched
                      const matched = (schedules || []).find(s => (s.course || s.title) === selected);
                      if (matched && matched.lecturer) {
                        setTaskLecturer(matched.lecturer.split(',')[0]);
                      }
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all cursor-pointer min-h-[40px]"
                  >
                    <option value="">-- Pilih Mata Kuliah --</option>
                    {availableCourses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Manajemen Rantai Pasok"
                    value={taskCourse}
                    onChange={(e) => setTaskCourse(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all min-h-[40px]"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Dosen Pengajar</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Budi Santoso, M.T."
                  value={taskLecturer}
                  onChange={(e) => setTaskLecturer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Batas Tanggal (Due Date)</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all min-h-[40px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Batas Jam (Due Time)</label>
                  <input
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all min-h-[40px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Deskripsi Penugasan</label>
                <textarea
                  rows={2}
                  placeholder="Ringkasan tugas, topik pembahasan, atau instruksi pengerjaan..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Aturan Pengumpulan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Format PDF maksimal 10MB, tugas dikerjakan individu..."
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer min-h-[40px] text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50 cursor-pointer shadow-2xs min-h-[40px] text-center"
                >
                  {isCreating ? 'Menyimpan...' : 'Publikasikan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* CONFIRM DELETE MODAL (In-App, Non-native) */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => !isDeletingTask && setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Hapus Penugasan?"
        message={`Tugas "${taskToDelete?.title || ''}" akan dihapus permanen dari kelas.`}
        confirmText="Ya, Hapus Tugas"
        cancelText="Batal"
        type="danger"
        isLoading={isDeletingTask}
      />

      {/* CONFIRM CANCEL SUBMISSION MODAL */}
      <ConfirmModal
        isOpen={showCancelSubmissionConfirm}
        onClose={() => !isCancelingSubmission && setShowCancelSubmissionConfirm(false)}
        onConfirm={handleCancelSubmission}
        title="Hapus & Batalkan Pengumpulan?"
        message="Berkas pengumpulan kamu akan dipindahkan ke folder Sampah di Google Drive dan status pengumpulan akan dibatalkan. Kamu dapat mengunggah ulang file kapan saja."
        confirmText="Ya, Hapus & Batalkan"
        cancelText="Batal"
        type="danger"
        isLoading={isCancelingSubmission}
      />
    </div>
  );
}
