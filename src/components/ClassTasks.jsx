import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadToGoogleDrive, checkDriveFiles, extractDriveFileId } from '../utils/driveUpload';
import ModalPortal from './ModalPortal';

export default function ClassTasks({
  currentClass,
  currentUser,
  tasks = [],
  schedules = [],
  onCreateTask,
  onSubmitAssignment,
  onDeleteTask
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'not_submitted' | 'submitted' | 'missing'
  const [courseFilter, setCourseFilter] = useState('all'); // 'all' | <course_name>
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [autoRenameEnabled, setAutoRenameEnabled] = useState(true);

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
  useEffect(() => {
    const fileIdsToCheck = [];
    (tasks || []).forEach(t => {
      (t.submissions || []).forEach(s => {
        const fileId = extractDriveFileId(s.fileUrl);
        if (fileId && !fileIdsToCheck.includes(fileId)) {
          fileIdsToCheck.push(fileId);
        }
      });
    });

    if (fileIdsToCheck.length > 0) {
      setIsCrosschecking(true);
      checkDriveFiles(fileIdsToCheck)
        .then(results => {
          setDriveStatusMap(prev => ({ ...prev, ...results }));
        })
        .finally(() => setIsCrosschecking(false));
    }
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

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.course || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const userSub = t.submissions?.find(s => s.userId === currentUser?.uid);
    const isFileMissing = userSub && isSubmissionFileMissing(userSub);
    const isSubmitted = !!userSub && !isFileMissing;

    let matchesStatus = true;
    if (statusFilter === 'submitted') matchesStatus = isSubmitted;
    if (statusFilter === 'not_submitted') matchesStatus = !isSubmitted;
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

  const handleDelete = async (taskId) => {
    if (!window.confirm('Hapus tugas ini?')) return;
    try {
      await onDeleteTask(taskId);
      setSelectedTask(null);
      toast.success('Tugas berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus tugas');
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
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Assignments & Tasks</h2>
          <p className="text-xs text-[#64748B]">Semua penugasan kuliah, instruksi, dan pengumpulan berkas terorganisir per mata kuliah.</p>
        </div>

        {isManager && (
          <button
            onClick={() => {
              setIsCustomCourse(false);
              setTaskCourse(availableCourses.length > 0 ? availableCourses[0] : (currentClass?.name || ''));
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={13} />
            <span>Tambah Tugas Baru</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Cari nama tugas atau mata kuliah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Course Filter Dropdown */}
            {availableCourses.length > 0 && (
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569] focus:outline-none focus:border-[#0F172A] shadow-2xs cursor-pointer max-w-[200px] truncate"
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

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('not_submitted')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'not_submitted' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Belum Dikumpulkan
              </button>
              <button
                onClick={() => setStatusFilter('submitted')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'submitted' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Sudah Dikumpulkan
              </button>
              <button
                onClick={() => setStatusFilter('missing')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
            <span className="text-[11px] font-semibold text-[#64748B] shrink-0 flex items-center gap-1 mr-1">
              <BookOpen size={12} className="text-[#94A3B8]" />
              <span>Mata Kuliah:</span>
            </span>
            <button
              onClick={() => setCourseFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
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

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`bg-white border p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isFileMissing ? 'border-rose-300 bg-rose-50/15' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
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
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                        <Check size={10} />
                        <span>Submitted</span>
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

                  {task.description && (
                    <p className="text-xs text-[#64748B] line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock size={12} />
                    <span>Due {task.dueDate} · {task.dueTime}</span>
                  </span>

                  {task.attachments?.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Paperclip size={11} />
                      <span>{task.attachments.length} attachments</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: TASK DETAIL & ASSIGNMENT SUBMISSION */}
      {selectedTask && (
        <ModalPortal onClose={() => setSelectedTask(null)} maxWidth="max-w-xl">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full w-fit mb-1">
                  <BookOpen size={11} />
                  <span>{selectedTask.course || currentClass?.name}</span>
                </div>
                <h3 className="font-bold text-lg text-[#0F172A] leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Task Info Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[10px] font-semibold text-[#64748B] block">Deadline</span>
                <span className="font-bold text-[#0F172A]">{selectedTask.dueDate} · {selectedTask.dueTime}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[10px] font-semibold text-[#64748B] block">Mata Kuliah</span>
                <span className="font-bold text-[#0F172A] truncate block">{selectedTask.course || 'Umum'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold text-[#64748B] block">Dosen Pengampu</span>
                <span className="font-bold text-[#0F172A] truncate block">{selectedTask.lecturer || '-'}</span>
              </div>
            </div>

            {/* Description & Instructions */}
            {selectedTask.description && (
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">Deskripsi Penugasan</h4>
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {selectedTask.instructions && (
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">Petunjuk Pengumpulan</h4>
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap bg-amber-50/50 p-3 rounded-xl border border-amber-200/70">
                  {selectedTask.instructions}
                </p>
              </div>
            )}

            {/* Student Submission Action Area */}
            <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
              <h4 className="font-bold text-xs text-[#0F172A]">Pengumpulan Berkas Tugas</h4>

              {(() => {
                const userSub = selectedTask.submissions?.find(s => s.userId === currentUser?.uid);
                
                if (!userSub) {
                  return (
                    <div className="space-y-3">
                      {/* Auto-rename toggle and preview info */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#0F172A]">Auto-Rename Berkas</span>
                            <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                              Format Standar
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={autoRenameEnabled} 
                              onChange={(e) => setAutoRenameEnabled(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#0F172A]"></div>
                          </label>
                        </div>
                        <p className="text-[10px] text-[#64748B] font-mono leading-relaxed">
                          {autoRenameEnabled ? (
                            <span className="text-emerald-700 font-semibold block truncate">
                              Format: {generateSubmissionFileName(currentUser?.displayName, selectedTask?.title, 'dokumen.pdf')}
                            </span>
                          ) : (
                            <span className="text-[#64748B]">Nama file asli akan tetap digunakan tanpa perubahan.</span>
                          )}
                        </p>
                      </div>

                      <div className="p-6 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#64748B]">
                          <Upload size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0F172A]">Unggah Berkas Tugas Kamu</p>
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
                          className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
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

                if (isMissing) {
                  return (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                          <AlertTriangle size={15} className="text-rose-600" />
                          <span>File Tidak Ditemukan di Google Drive!</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                          Status: File Hilang
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed">
                        Berkas tugas ini terhapus atau tidak ditemukan di Google Drive. Status tugas tidak lagi dianggap "Submitted". Harap unggah ulang berkas tugas agar dapat dinilai dosen/komti.
                      </p>
                      <div className="pt-2 flex items-center justify-between border-t border-rose-200/60">
                        <span className="font-mono text-[11px] text-rose-600 truncate max-w-[200px]">
                          ⚠️ {userSub.fileName}
                        </span>
                        <button
                          type="button"
                          disabled={isSubmittingFile}
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                              fileInputRef.current.click();
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Upload size={12} className={isSubmittingFile ? "animate-bounce" : ""} />
                          <span>{isSubmittingFile ? 'Mengunggah...' : 'Upload Ulang Sekarang'}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <Check size={14} className="text-emerald-600" />
                        <span>Tugas Berhasil Dikumpulkan</span>
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(userSub.submittedAt).toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="font-mono text-xs text-[#0F172A] truncate bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      📄 {userSub.fileName}
                    </p>

                    <div className="pt-2 flex items-center justify-between border-t border-emerald-100">
                      <div className="flex items-center gap-2">
                        {userSub.fileUrl?.includes('drive.google.com') ? (
                          <a
                            href={userSub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            <span>Buka di Google Drive</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-[#64748B]">Tersimpan di Sistem</span>
                        )}
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
                        className="text-[11px] font-bold text-[#0F172A] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingFile ? 'Mengunggah...' : 'Kirim Ulang File (Resubmit)'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Manager View: List of all submissions */}
            {isManager && selectedTask.submissions?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#0F172A]">
                    Pengumpulan Mahasiswa ({selectedTask.submissions.length})
                  </h4>
                  <a
                    href={`https://drive.google.com/drive/folders/1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    <span>Buka Folder Drive</span>
                  </a>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedTask.submissions.map(sub => {
                    const subMissing = isSubmissionFileMissing(sub);
                    return (
                      <div key={sub.id || sub.userId} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs gap-2 ${
                        subMissing ? 'bg-rose-50/70 border-rose-200' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}>
                        <div className="truncate flex-1">
                          <span className="font-bold text-[#0F172A] block truncate">{sub.userName}</span>
                          <span className="text-[11px] text-[#64748B] block truncate font-mono">{sub.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {subMissing ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                              <AlertTriangle size={10} />
                              <span>File Hilang</span>
                            </span>
                          ) : sub.fileUrl ? (
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-[10px] flex items-center gap-1"
                            >
                              <ExternalLink size={10} />
                              <span>Drive</span>
                            </a>
                          ) : null}
                          <span className="text-[10px] text-[#94A3B8]">
                            {new Date(sub.submittedAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
              {isManager ? (
                <button
                  onClick={() => handleDelete(selectedTask.id)}
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Hapus Tugas</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
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
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-base text-[#0F172A]">Tambah Penugasan Baru</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              {/* Course Selection (Dropdown from Schedule or Custom) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
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
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all cursor-pointer"
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
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Batas Tanggal (Due Date)</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Batas Jam (Due Time)</label>
                  <input
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isCreating ? 'Menyimpan...' : 'Publikasikan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
