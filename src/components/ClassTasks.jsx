import React, { useState, useRef, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadToGoogleDrive, checkDriveFiles, extractDriveFileId } from '../utils/driveUpload';
import ModalPortal from './ModalPortal';

export default function ClassTasks({
  currentClass,
  currentUser,
  tasks = [],
  onCreateTask,
  onSubmitAssignment,
  onDeleteTask
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'not_submitted' | 'submitted' | 'missing'
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // File upload state for submission
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Google Drive Crosscheck state
  const [driveStatusMap, setDriveStatusMap] = useState({});
  const [isCrosschecking, setIsCrosschecking] = useState(false);

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

  // Create Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCourse, setTaskCourse] = useState(currentClass?.name || '');
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

    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('Judul tugas wajib diisi');
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
      const submissionFileName = `${currentUser.displayName || 'Mahasiswa'} - ${file.name}`;
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
          <p className="text-xs text-[#64748B]">All course assignments, instructions, and submission portals.</p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0"
          >
            <Plus size={13} />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search assignments or courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
              statusFilter === 'all' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('not_submitted')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
              statusFilter === 'not_submitted' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Not Submitted
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
              statusFilter === 'submitted' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Submitted
          </button>
          <button
            onClick={() => setStatusFilter('missing')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors flex items-center gap-1 ${
              statusFilter === 'missing' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle size={12} />
            <span>File Hilang</span>
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-2 shadow-2xs">
          <CheckSquare size={32} className="mx-auto text-[#94A3B8] opacity-60" />
          <h3 className="font-bold text-sm text-[#0F172A]">No assignments found</h3>
          <p className="text-xs text-[#64748B]">You're all caught up with your submissions or no tasks match your filter.</p>
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569]">
                      {task.course || currentClass?.name}
                    </span>
                    {isFileMissing ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={11} />
                        <span>File Hilang di Drive</span>
                      </span>
                    ) : isSubmitted ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Check size={10} />
                        <span>Submitted</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
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
                <span className="text-[10px] font-bold uppercase text-[#64748B]">
                  {selectedTask.course || currentClass?.name}
                </span>
                <h3 className="font-bold text-lg text-[#0F172A] leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            {/* Task Info */}
            <div className="space-y-3 text-xs text-[#475569]">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span><strong>Deadline:</strong> {selectedTask.dueDate} · {selectedTask.dueTime}</span>
                {selectedTask.lecturer && <span><strong>Lecturer:</strong> {selectedTask.lecturer}</span>}
              </div>

              {selectedTask.description && (
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-[#0F172A]">Description:</h4>
                  <p className="text-[#475569] whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.instructions && (
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-[#0F172A]">Instructions:</h4>
                  <p className="text-[#475569] whitespace-pre-wrap p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    {selectedTask.instructions}
                  </p>
                </div>
              )}
            </div>

            {/* ASSIGNMENT SUBMISSION AREA */}
            <div className="p-4 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">
                  Your Submission
                </h4>
                <div className="flex items-center gap-1.5">
                  {isCrosschecking && (
                    <span className="text-[10px] text-sky-600 flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" />
                      <span>Checking Drive...</span>
                    </span>
                  )}
                  {!isCrosschecking && (
                    <span className="text-[10px] text-slate-500 font-medium">Drive Verified</span>
                  )}
                </div>
              </div>

              {(() => {
                const userSub = selectedTask.submissions?.find(s => s.userId === currentUser?.uid);
                if (!userSub) {
                  return (
                    <div className="p-6 rounded-xl bg-white border border-dashed border-[#CBD5E1] text-center space-y-3">
                      <p className="text-xs text-[#64748B]">No file submitted yet.</p>
                      <button
                        type="button"
                        disabled={isSubmittingFile}
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                            fileInputRef.current.click();
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs flex items-center gap-1.5 mx-auto transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Upload size={13} className={isSubmittingFile ? "animate-bounce" : ""} />
                        <span>{isSubmittingFile ? 'Mengunggah...' : 'Upload File to Submit'}</span>
                      </button>
                      <p className="text-[10px] text-[#94A3B8]">
                        Tugas otomatis tersinkron ke Google Drive dosen & komti
                      </p>
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
                  <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <Check size={14} className="text-emerald-600" />
                        <span>Assignment Submitted</span>
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(userSub.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="font-mono text-xs text-[#0F172A] truncate">
                      📄 {userSub.fileName}
                    </p>

                    <div className="pt-2 flex items-center justify-between">
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
                        {isSubmittingFile ? 'Mengunggah...' : 'Resubmit File'}
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
                    Student Submissions ({selectedTask.submissions.length})
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
                          <span className="text-[11px] text-[#64748B] block truncate">{sub.fileName}</span>
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
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete Task</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B]"
              >
                Close
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
              <h3 className="font-bold text-base text-[#0F172A]">Create Assignment</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Assignment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Website Portfolio"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Course</label>
                  <input
                    type="text"
                    placeholder="e.g. Pemrograman Web"
                    value={taskCourse}
                    onChange={(e) => setTaskCourse(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Lecturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Pak Budi"
                    value={taskLecturer}
                    onChange={(e) => setTaskLecturer(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Due Time</label>
                  <input
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview of the assignment..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Submission Instructions</label>
                <textarea
                  rows={2}
                  placeholder="File naming conventions or delivery rules..."
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50"
                >
                  {isCreating ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
