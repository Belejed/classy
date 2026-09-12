import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Folder, 
  Search, 
  Plus, 
  Upload, 
  Download, 
  ExternalLink, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Archive, 
  Code, 
  Trash2, 
  File, 
  Eye, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  Filter,
  Layers,
  FolderOpen,
  RefreshCw,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadToGoogleDrive, checkDriveFiles, extractDriveFileId } from '../utils/driveUpload';
import { dbService } from '../utils/db';
import ModalPortal from './ModalPortal';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import CustomSelect from './CustomSelect';

const CATEGORIES = ['All', 'Submission', 'Material', 'Assignments', 'Groups', 'Other'];

const CATEGORY_OPTIONS = [
  { value: 'Material', label: '📚 Material (Materi Kuliah)' },
  { value: 'Assignments', label: '📝 Assignments (Tugas Perkuliahan)' },
  { value: 'Submission', label: '📥 Submission (Pengumpulan Tugas)' },
  { value: 'Groups', label: '👥 Groups (Berkas Kelompok)' },
  { value: 'Other', label: '📁 Other (Lainnya / Umum)' }
];

const FOLDER_PRESETS = [
  { label: 'Materi Kuliah', category: 'Material', icon: '📚' },
  { label: 'Pedoman & Silabus', category: 'Material', icon: '📋' },
  { label: 'Tugas Perkuliahan', category: 'Assignments', icon: '📝' },
  { label: 'Umum', category: 'Other', icon: '📁' }
];

export default function ClassFiles({
  currentClass,
  currentUser,
  files = [],
  schedules = [],
  tasks = [],
  onUploadFile,
  onDeleteFile,
  onRefreshFiles
}) {
  const [viewMode, setViewMode] = useState('folders'); // 'folders' | 'all'
  const [activeFolder, setActiveFolder] = useState(null); // null = root, string = folder name
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Preview Modal
  const [selectedFile, setSelectedFile] = useState(null);
  
  // In-app Delete Confirmation Modal
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Material');
  const [uploadFolder, setUploadFolder] = useState('Materi Kuliah');
  const [uploadCourse, setUploadCourse] = useState('');
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [isCustomFolder, setIsCustomFolder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentlyUploadedId, setRecentlyUploadedId] = useState(null);
  const [backgroundUploads, setBackgroundUploads] = useState([]);
  const [isWidgetExpanded, setIsWidgetExpanded] = useState(true);
  const fileInputRef = useRef(null);
  const [selectedFileObj, setSelectedFileObj] = useState(null);

  // Prevent accidental page refresh while files are actively uploading in background
  useEffect(() => {
    const hasUploading = backgroundUploads.some(u => u.status === 'uploading');
    if (!hasUploading) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Proses pengunggahan berkas sedang berlangsung di latar belakang. Jika halaman dimuat ulang, pengunggahan akan terputus.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [backgroundUploads]);

  // Available courses dynamically gathered from schedules, tasks, files, and class defaults
  const availableCourses = useMemo(() => {
    const courseMap = new Map();
    const addCourse = (raw) => {
      if (!raw) return;
      const clean = raw.trim().replace(/\s+/g, ' ');
      if (!clean) return;
      if (clean.toLowerCase() === 'umum' || clean.toLowerCase() === (currentClass?.name || '').toLowerCase()) return;
      const key = clean.toLowerCase();
      if (!courseMap.has(key)) {
        courseMap.set(key, clean);
      }
    };

    (schedules || []).forEach(s => addCourse(s.subject || s.title || s.course));
    (tasks || []).forEach(t => addCourse(t.course));
    (files || []).forEach(f => addCourse(f.course));

    if (courseMap.size === 0) {
      [
        'Ekonomi Mikro',
        'Matematika Ekonomi',
        'Pengantar Akuntansi',
        'Pengantar Bisnis dan Inovasi',
        'Pengantar Logistik',
        'Pengantar Transportasi',
        'Pendidikan Pancasila',
        'Prinsip - Prinsip Manajemen'
      ].forEach(addCourse);
    }
    return Array.from(courseMap.values()).sort((a, b) => a.localeCompare(b, 'id'));
  }, [schedules, tasks, files, currentClass?.name]);

  // Set default course once available
  useEffect(() => {
    if (!uploadCourse && availableCourses.length > 0) {
      setUploadCourse(availableCourses[0]);
    }
  }, [availableCourses, uploadCourse]);

  const role = currentClass?.userRole;
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen', 'superadmin'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  // Filter files so regular students cannot see other students' submissions in the Files tab
  const visibleFiles = useMemo(() => {
    const safeFiles = Array.isArray(files) ? files : [];
    if (isManager) return safeFiles;
    return safeFiles.filter(f => {
      const isSubmission = f.isSubmission || f.category === 'Submission' || (f.folder && f.folder.startsWith('Tugas:'));
      // Non-submission files (materials, guides, announcements, questions) are public to everyone
      if (!isSubmission) return true;

      // Submission files: only visible if currentUser is the author or in the groupMembers
      const isOwner = (f.userId && f.userId === currentUser?.uid) || 
                      (f.uploadedBy && f.uploadedBy.toLowerCase() === (currentUser?.displayName || '').toLowerCase());
      const isGroupMember = Array.isArray(f.groupMembers) && f.groupMembers.some(m => m.userId === currentUser?.uid);
      return isOwner || isGroupMember;
    });
  }, [files, isManager, currentUser?.uid, currentUser?.displayName]);

  // Group files by Folder
  const folderStats = useMemo(() => {
    const map = new Map();
    visibleFiles.forEach(f => {
      const folderName = f.folder || f.groupName || (f.category === 'Submission' ? 'Tugas Perkuliahan' : 'Materi Kuliah');
      if (!map.has(folderName)) {
        map.set(folderName, {
          name: folderName,
          count: 0,
          category: f.category || 'Material',
          latestDate: f.createdAt,
          files: []
        });
      }
      const entry = map.get(folderName);
      entry.count += 1;
      entry.files.push(f);
      if (new Date(f.createdAt) > new Date(entry.latestDate)) {
        entry.latestDate = f.createdAt;
      }
    });
    return Array.from(map.values());
  }, [visibleFiles]);

  // Filtered files based on active folder, category, and search query
  const filteredFiles = useMemo(() => {
    return visibleFiles.filter(f => {
      const folderName = f.folder || f.groupName || (f.category === 'Submission' ? 'Tugas Perkuliahan' : 'Materi Kuliah');
      
      // If viewing inside a specific folder
      if (activeFolder && folderName !== activeFolder) {
        return false;
      }

      // Category filter (only if not inside a specific folder or if category is selected)
      const matchesCategory = selectedCategory === 'All' || f.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Search query
      const matchesSearch = (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (f.course || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (f.uploadedBy || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            folderName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [visibleFiles, activeFolder, selectedCategory, searchQuery]);

  const getFileExtension = (name = '', type = '') => {
    return (name.split('.').pop() || type || '').toLowerCase();
  };

  const getFileIcon = (type = '', name = '') => {
    const ext = getFileExtension(name, type);
    if (ext === 'pdf') return <FileText className="text-rose-500" size={22} />;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return <ImageIcon className="text-blue-500" size={22} />;
    if (['zip', 'rar', '7z', 'tar'].includes(ext)) return <Archive className="text-amber-500" size={22} />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'sql', 'java', 'c', 'cpp'].includes(ext)) return <Code className="text-emerald-500" size={22} />;
    return <File className="text-slate-500" size={22} />;
  };

  const handleOpenUpload = (folderOverride) => {
    const targetFolder = folderOverride || activeFolder || 'Materi Kuliah';
    setUploadFolder(targetFolder);
    if (targetFolder === 'Materi Kuliah' || targetFolder === 'Pedoman & Silabus') {
      setUploadCategory('Material');
    } else if (targetFolder.startsWith('Tugas:') || targetFolder === 'Tugas Perkuliahan') {
      setUploadCategory('Assignments');
    }

    if (!uploadCourse && availableCourses.length > 0) {
      setUploadCourse(availableCourses[0]);
    }
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    if (isUploading) return;
    setShowUploadModal(false);
    setSelectedFileObj(null);
    setUploadName('');
    setIsCustomCourse(false);
    setIsCustomFolder(false);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    const maxBytes = 35 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 35 MB.`);
      return;
    }
    setSelectedFileObj(file);
    if (!uploadName || uploadName === selectedFileObj?.name) {
      setUploadName(file.name);
    }
    
    // Auto-detect course from filename
    const lowerName = file.name.toLowerCase();
    for (const c of availableCourses) {
      const lowerC = c.toLowerCase();
      if (
        lowerName.includes(lowerC) ||
        (lowerC.includes('mikro') && lowerName.includes('mikro')) ||
        (lowerC.includes('matematika') && (lowerName.includes('matematika') || lowerName.includes('matek') || lowerName.includes('mte'))) ||
        (lowerC.includes('akuntansi') && (lowerName.includes('akuntansi') || lowerName.includes('akunt') || lowerName.includes('pak'))) ||
        (lowerC.includes('logistik') && (lowerName.includes('logistik') || lowerName.includes('plo'))) ||
        (lowerC.includes('transportasi') && (lowerName.includes('transportasi') || lowerName.includes('ptr'))) ||
        (lowerC.includes('pancasila') && (lowerName.includes('pancasila') || lowerName.includes('ppa'))) ||
        (lowerC.includes('bisnis') && (lowerName.includes('bisnis') || lowerName.includes('pbi'))) ||
        (lowerC.includes('manajemen') && (lowerName.includes('manajemen') || lowerName.includes('pra')))
      ) {
        setUploadCourse(c);
        setIsCustomCourse(false);
        break;
      }
    }
  };

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const executeBackgroundUpload = async (job, fileObj) => {
    const { id, fileName, targetFolder, finalCourse, category } = job;

    const progressTimer = setInterval(() => {
      setBackgroundUploads(prev => prev.map(u => {
        if (u.id !== id || u.status !== 'uploading') return u;
        const next = Math.min(u.progress + 2, 92);
        return { ...u, progress: Math.max(u.progress, next) };
      }));
    }, 1200);

    try {
      setBackgroundUploads(prev => prev.map(u => 
        u.id === id ? { ...u, progress: 15, statusMessage: 'Mengunggah ke Google Drive...' } : u
      ));

      let fileUrl = '';
      let fileSize = `${(fileObj.size / (1024 * 1024)).toFixed(2)} MB`;
      let driveFileId = null;

      try {
        const driveRes = await uploadToGoogleDrive({
          file: fileObj,
          name: fileName,
          folderName: targetFolder,
          workspaceName: currentClass?.name || 'M.Log B'
        });
        fileUrl = driveRes.webViewLink || driveRes.previewUrl;
        driveFileId = driveRes.fileId || null;
        fileSize = driveRes.fileSize || fileSize;
      } catch (driveErr) {
        console.warn('Google Drive fallback to local encoding:', driveErr);
        const reader = new FileReader();
        fileUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(fileObj);
        });
      }

      clearInterval(progressTimer);

      setBackgroundUploads(prev => prev.map(u => 
        u.id === id ? { ...u, progress: 95, statusMessage: 'Menyimpan berkas ke kelas...' } : u
      ));

      const result = await onUploadFile({
        name: fileName,
        category,
        folder: targetFolder,
        course: finalCourse,
        uploadedBy: currentUser?.displayName || 'Member',
        fileSize,
        fileType: fileName.split('.').pop()?.toLowerCase() || 'pdf',
        storageUrl: fileUrl,
        driveFileId
      });

      const uploadedIdentifier = result?.id || fileName;
      setRecentlyUploadedId(uploadedIdentifier);
      setTimeout(() => setRecentlyUploadedId(null), 15000);

      setBackgroundUploads(prev => prev.map(u => 
        u.id === id ? { ...u, progress: 100, status: 'completed', statusMessage: 'Berhasil diunggah ke Drive!' } : u
      ));

      toast.success(`🎉 Berkas "${fileName}" berhasil tersimpan di Google Drive!`, { id: `file-done-${id}`, duration: 5000 });

      // Automatically clean up finished job after 8 seconds
      setTimeout(() => {
        setBackgroundUploads(prev => prev.filter(u => u.id !== id));
      }, 8000);
    } catch (err) {
      clearInterval(progressTimer);
      console.error('Background upload error:', err);
      setBackgroundUploads(prev => prev.map(u => 
        u.id === id ? { ...u, status: 'error', error: err.message || 'Gagal mengunggah ke Google Drive' } : u
      ));
      toast.error(`Gagal mengunggah "${fileName}": ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleRetryJob = (job) => {
    if (!job.fileObj) {
      toast.error('Berkas asli tidak ditemukan. Silakan buka modal upload kembali.');
      return;
    }
    setBackgroundUploads(prev => prev.map(u => 
      u.id === job.id ? { ...u, status: 'uploading', progress: 15, error: null, statusMessage: 'Mencoba mengunggah ulang...' } : u
    ));
    executeBackgroundUpload(job, job.fileObj);
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadName.trim()) {
      toast.error('Nama berkas wajib diisi');
      return;
    }
    if (!selectedFileObj) {
      toast.error('Silakan pilih berkas yang akan diunggah');
      return;
    }

    const finalCourse = (uploadCourse || availableCourses[0] || 'Umum').trim();
    const targetFolder = uploadFolder.trim() || 'Materi Kuliah';
    const fileObj = selectedFileObj;
    const fileName = uploadName.trim();
    const category = uploadCategory;
    const jobId = `fupload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sizeMb = (fileObj.size / (1024 * 1024)).toFixed(2);

    const newJob = {
      id: jobId,
      fileName,
      rawFileName: fileObj.name,
      fileSize: `${sizeMb} MB`,
      progress: 10,
      status: 'uploading',
      statusMessage: fileObj.size > 8 * 1024 * 1024 
        ? 'Mengunggah berkas besar ke Drive di latar belakang...' 
        : 'Menyiapkan pengunggahan ke Google Drive...',
      targetFolder,
      finalCourse,
      category,
      fileObj,
      startedAt: Date.now()
    };

    setBackgroundUploads(prev => [newJob, ...prev]);
    handleCloseUploadModal();
    toast.success(`🚀 Berkas "${fileName}" sedang diunggah di latar belakang!`, { duration: 4000 });

    executeBackgroundUpload(newJob, fileObj);
  };

  // Convert data URL to Blob for secure new tab opening & downloading
  const dataUrlToBlob = (dataUrl) => {
    try {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const byteString = atob(parts[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mime });
    } catch (err) {
      console.error('Failed to convert dataUrl to blob', err);
      return null;
    }
  };

  const handleOpenNewTab = (file) => {
    if (!file?.storageUrl) {
      toast.error('Tautan berkas tidak tersedia.');
      return;
    }

    try {
      let targetUrl = file.storageUrl;

      // Chrome blocks direct navigation to top-level data: URIs.
      // Convert to a blob: URL which Chrome and all browsers allow opening in a new tab!
      if (file.storageUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(file.storageUrl);
        if (blob) {
          targetUrl = URL.createObjectURL(blob);
        }
      }

      const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error opening file in new tab:', err);
      toast.error('Gagal membuka berkas di tab baru.');
    }
  };

  // Synchronize file names with Google Drive
  const handleSyncDriveFiles = async (silent = false) => {
    if (!currentClass?.id || isSyncing) return;

    // Filter target files to check: if inside activeFolder, check files in active folder; otherwise all visibleFiles
    const targetFiles = activeFolder
      ? visibleFiles.filter(f => {
          const folderName = f.folder || f.groupName || (f.category === 'Submission' ? 'Tugas Perkuliahan' : 'Materi Kuliah');
          return folderName === activeFolder;
        })
      : visibleFiles;

    const fileMap = {};
    targetFiles.forEach(f => {
      const driveId = f.driveFileId || extractDriveFileId(f.storageUrl);
      if (driveId) {
        fileMap[driveId] = f;
      }
    });

    const fileIds = Object.keys(fileMap);
    if (fileIds.length === 0) {
      if (!silent) toast('Tidak ada berkas Google Drive untuk disinkronkan.', { icon: 'ℹ️' });
      return;
    }

    if (!silent) setIsSyncing(true);

    try {
      const driveResults = await checkDriveFiles(fileIds);
      const updates = {};
      let changedCount = 0;

      fileIds.forEach(id => {
        const info = driveResults[id];
        const localFile = fileMap[id];
        if (info && info.name && localFile && info.name.trim() !== (localFile.name || '').trim()) {
          updates[id] = info.name.trim();
          changedCount++;
        }
      });

      if (changedCount > 0) {
        await dbService.files.syncDriveFileNames(currentClass.id, updates);
        if (onRefreshFiles) {
          await onRefreshFiles();
        }
        toast.success(`${changedCount} nama berkas berhasil disinkronkan dari Google Drive!`);
      } else {
        if (!silent) {
          toast.success('Semua nama berkas sudah sinkron dengan Google Drive.');
        }
      }
    } catch (err) {
      console.error('Gagal sinkronisasi nama berkas Drive:', err);
      if (!silent) {
        toast.error('Gagal menyinkronkan nama berkas dengan Google Drive.');
      }
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Auto-sync silently when opening a folder
  useEffect(() => {
    if (activeFolder) {
      handleSyncDriveFiles(true);
    }
  }, [activeFolder]);

  const handleDownload = (file) => {
    if (!file?.storageUrl) {
      toast.error('Link berkas tidak tersedia');
      return;
    }

    try {
      let targetUrl = file.storageUrl;
      let isBlob = false;

      // Google drive download link helper
      const driveMatch = file.storageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        window.open(`https://drive.google.com/uc?export=download&id=${driveMatch[1]}`, '_blank');
        toast.success(`Mengunduh ${file.name} dari Google Drive`);
        return;
      }

      if (file.storageUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(file.storageUrl);
        if (blob) {
          targetUrl = URL.createObjectURL(blob);
          isBlob = true;
        }
      }

      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (isBlob) {
        setTimeout(() => URL.revokeObjectURL(targetUrl), 5000);
      }
      toast.success(`Mengunduh ${file.name}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Gagal mengunduh berkas');
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    toast.loading('Menghapus berkas...', { id: 'delete-file' });
    try {
      await onDeleteFile(fileToDelete.id, fileToDelete);
      setSelectedFile(null);
      setFileToDelete(null);
      toast.success('Berkas berhasil dihapus', { id: 'delete-file' });
    } catch {
      toast.error('Gagal menghapus berkas', { id: 'delete-file' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Render Preview Canvas according to format
  const renderFilePreview = (file) => {
    if (!file.storageUrl) {
      return (
        <div className="py-16 text-center space-y-2 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1]">
          <File size={40} className="mx-auto text-[#94A3B8]" />
          <p className="text-xs font-semibold text-[#0F172A]">Preview tidak tersedia untuk berkas ini.</p>
          <p className="text-[11px] text-[#64748B]">Silakan gunakan tombol Unduh Berkas di bawah.</p>
        </div>
      );
    }

    // Google Drive Embedded Viewer
    const driveMatch = file.storageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const driveId = driveMatch[1];
      return (
        <div className="w-full h-[550px] rounded-2xl border border-[#CBD5E1] overflow-hidden bg-slate-900 shadow-inner flex flex-col">
          <div className="bg-[#0F172A] px-3.5 py-2 flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
              <span className="font-semibold text-white truncate text-[11px]">{file.name}</span>
              <span className="text-[10px] font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60 shrink-0">
                Google Drive
              </span>
            </div>
            <a
              href={file.storageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 shrink-0 ml-2"
            >
              <ExternalLink size={12} />
              <span>Buka di Google Drive</span>
            </a>
          </div>
          <iframe
            src={`https://drive.google.com/file/d/${driveId}/preview`}
            title={file.name}
            className="w-full flex-1 border-0 bg-white"
            allow="autoplay"
          />
        </div>
      );
    }

    const ext = getFileExtension(file.name, file.fileType);

    // 1. PDF Preview via iframe
    if (ext === 'pdf' || file.storageUrl.startsWith('data:application/pdf')) {
      let previewUrl = file.storageUrl;
      if (file.storageUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(file.storageUrl);
        if (blob) {
          previewUrl = URL.createObjectURL(blob);
        }
      }

      return (
        <div className="w-full h-[540px] rounded-2xl border border-[#E2E8F0] overflow-hidden bg-slate-100 shadow-inner flex flex-col">
          <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between text-xs text-slate-700 border-b border-slate-200 shrink-0">
            <span className="font-semibold truncate text-[11px]">{file.name}</span>
            <button
              type="button"
              onClick={() => handleOpenNewTab(file)}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink size={12} />
              <span>Buka di Tab Baru</span>
            </button>
          </div>
          <iframe
            src={previewUrl}
            title={file.name}
            className="w-full flex-1 border-0"
          />
        </div>
      );
    }

    // 2. Image Preview
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || file.storageUrl.startsWith('data:image/')) {
      return (
        <div className="w-full max-h-[520px] bg-slate-900/5 rounded-2xl border border-[#E2E8F0] flex items-center justify-center p-3 overflow-auto">
          <img
            src={file.storageUrl}
            alt={file.name}
            className="max-h-[480px] w-auto max-w-full rounded-xl object-contain shadow-md"
          />
        </div>
      );
    }

    // 3. Text / Code Preview
    if (['txt', 'sql', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'md'].includes(ext)) {
      if (file.storageUrl.startsWith('data:')) {
        try {
          const base64Content = file.storageUrl.split(',')[1];
          const decodedText = atob(base64Content);
          return (
            <div className="w-full max-h-[480px] overflow-auto p-4 rounded-2xl bg-[#0F172A] text-slate-100 font-mono text-xs shadow-inner">
              <pre className="whitespace-pre-wrap">{decodedText}</pre>
            </div>
          );
        } catch {
          // fallback
        }
      }
    }

    // 4. Fallback for Word / PPT / Excel / ZIP
    return (
      <div className="py-14 px-6 text-center space-y-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#CBD5E1] mx-auto flex items-center justify-center shadow-xs">
          {getFileIcon(file.fileType, file.name)}
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-[#0F172A]">{file.name}</h4>
          <p className="text-xs text-[#64748B]">{file.fileSize} · Format {ext.toUpperCase()}</p>
        </div>
        <p className="text-[11px] text-[#94A3B8] max-w-md mx-auto">
          Format dokumen ini dapat diunduh langsung atau dibuka menggunakan aplikasi pembaca berkas default di perangkat Anda.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Class Files & Library</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {visibleFiles.length} Berkas
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Penyimpanan terpusat untuk berkas tugas mahasiswa, slide materi dosen, dan modul kuliah.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* View Mode Toggle: Folders vs All Files */}
          <div className="flex items-center p-1 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold shadow-2xs">
            <button
              onClick={() => {
                setViewMode('folders');
                setActiveFolder(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 sm:py-1 rounded-lg transition-colors ${
                viewMode === 'folders' && !activeFolder ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Folder size={12} />
              <span>Direktori Folder</span>
            </button>
            <button
              onClick={() => {
                setViewMode('all');
                setActiveFolder(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 sm:py-1 rounded-lg transition-colors ${
                viewMode === 'all' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Layers size={12} />
              <span>Semua Berkas</span>
            </button>
          </div>

          <button
            onClick={() => handleSyncDriveFiles(false)}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-semibold shadow-2xs transition-colors shrink-0 disabled:opacity-50 min-h-[38px] cursor-pointer"
            title="Sinkronkan nama berkas jika baru saja di-rename di Google Drive"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-600'} />
            <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Drive'}</span>
          </button>

          <button
            onClick={() => handleOpenUpload()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0 cursor-pointer min-h-[38px]"
          >
            <Upload size={13} />
            <span>Upload Berkas</span>
          </button>
        </div>
      </div>

      {/* Breadcrumbs Navigation when inside a folder */}
      {activeFolder && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs gap-2">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <button
              onClick={() => setActiveFolder(null)}
              className="text-[#64748B] hover:text-[#0F172A] font-semibold flex items-center gap-1 shrink-0"
            >
              <ArrowLeft size={14} />
              <span>Semua Folder</span>
            </button>
            <ChevronRight size={13} className="text-[#CBD5E1] shrink-0" />
            <span className="font-bold text-[#0F172A] flex items-center gap-1.5 truncate">
              <FolderOpen size={15} className="text-amber-500 shrink-0" />
              <span className="truncate">{activeFolder}</span>
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono shrink-0">
              ({filteredFiles.length} berkas)
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => handleSyncDriveFiles(false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              title="Periksa dan perbarui nama berkas jika baru saja di-rename langsung di Google Drive"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Drive'}</span>
            </button>

            <button
              onClick={() => setActiveFolder(null)}
              className="text-[11px] font-semibold text-[#0F172A] hover:underline px-1 py-1 cursor-pointer"
            >
              Tutup Folder
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder={activeFolder ? `Cari berkas di dalam ${activeFolder}...` : "Cari berkas berdasarkan nama, tugas, atau nama pengunggah..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] shadow-2xs"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                  isSelected 
                    ? 'bg-[#0F172A] text-white' 
                    : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW MODE 1: FOLDER DIRECTORY GRID (Shown when not inside a folder) */}
      {viewMode === 'folders' && !activeFolder && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#475569]">
              Folder Berkas & Tugas ({folderStats.length})
            </h3>
            <span className="text-[11px] text-[#94A3B8]">
              Klik folder untuk melihat seluruh isi berkas tugas
            </span>
          </div>

          {folderStats.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-2xs">
              <EmptyState
                variant="files"
                title="Belum Ada Folder atau Berkas"
                description="Berkas materi perkuliahan atau submission tugas yang dikumpulkan akan otomatis tersusun rapi di sini."
                actionLabel="Upload Berkas Sekarang"
                onAction={() => handleOpenUpload()}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {folderStats.map((folder) => {
                const isTaskFolder = folder.name.toLowerCase().includes('tugas') || folder.category === 'Submission';

                return (
                  <div
                    key={folder.name}
                    onClick={() => setActiveFolder(folder.name)}
                    className="bg-white border border-slate-200 hover:border-slate-900 p-4 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isTaskFolder 
                          ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        <FolderOpen size={22} />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-[#0F172A] truncate group-hover:text-black">
                          {folder.name}
                        </h4>
                        <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                          <span>{folder.count} berkas terunggah</span>
                        </p>
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-[#94A3B8] group-hover:text-[#0F172A] transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: FILES LIST (Inside a folder OR when viewing all files) */}
      {(viewMode === 'all' || activeFolder) && (
        <div className="space-y-3">
          {filteredFiles.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-2xs">
              <EmptyState
                variant="files"
                title="Tidak Ada Berkas yang Cocok"
                description="Coba ubah kata kunci pencarian atau kategori berkas."
                actionLabel={searchQuery || selectedCategory !== 'All' ? 'Reset Filter' : undefined}
                onAction={searchQuery || selectedCategory !== 'All' ? () => { setSearchQuery(''); setSelectedCategory('All'); } : undefined}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map(file => {
                const folderTag = file.folder || file.groupName || (file.category === 'Submission' ? 'Tugas' : 'Materi');
                const isRecentlyUploaded = recentlyUploadedId && (recentlyUploadedId === file.id || recentlyUploadedId === file.name);
                const isUploadedByMe = (file.uploadedBy && currentUser?.displayName && file.uploadedBy.toLowerCase() === currentUser.displayName.toLowerCase()) ||
                                       (file.uploadedBy && currentUser?.email && file.uploadedBy.toLowerCase() === currentUser.email.toLowerCase());
                const hasDrive = !!(file.driveFileId || file.storageUrl);

                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`bg-white border p-4 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between space-y-3 group ${
                      isRecentlyUploaded
                        ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-300/80 shadow-md'
                        : isUploadedByMe
                        ? 'border-emerald-200 bg-emerald-50/15 hover:border-emerald-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isRecentlyUploaded || isUploadedByMe
                          ? 'bg-emerald-100/70 border border-emerald-200 text-emerald-800'
                          : 'bg-[#F8FAFC] border border-[#E2E8F0] group-hover:bg-slate-100'
                      }`}>
                        {getFileIcon(file.fileType, file.name)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-bold text-xs text-[#0F172A] truncate" title={file.name}>
                          {file.name}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium truncate max-w-[140px]">
                            📁 {folderTag}
                          </span>
                          <span className="text-[#64748B]">{file.fileSize || '1.2 MB'}</span>

                          {/* Tanda hijau sudah upload */}
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={10} className="text-emerald-600" />
                            <span>{hasDrive ? '✓ Terunggah di Drive' : '✓ Sudah Upload'}</span>
                          </span>

                          {isRecentlyUploaded && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold animate-pulse text-[9px]">
                              Baru Diunggah!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
                      {isUploadedByMe ? (
                        <span className="truncate text-emerald-700 font-bold flex items-center gap-1">
                          <Check size={11} className="text-emerald-600" />
                          <span>Diunggah oleh Anda</span>
                        </span>
                      ) : (
                        <span className="truncate">Oleh {file.uploadedBy}</span>
                      )}
                      <span className="font-bold text-[#0F172A] group-hover:underline flex items-center gap-1">
                        <Eye size={11} />
                        <span>Preview</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: HIGH-FIDELITY IN-APP FILE PREVIEW & INSPECTION MODAL */}
      {selectedFile && (
        <ModalPortal onClose={() => setSelectedFile(null)} maxWidth="max-w-4xl">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] shrink-0">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  {getFileIcon(selectedFile.fileType, selectedFile.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-[#0F172A] truncate">
                    {selectedFile.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      📁 {selectedFile.folder || selectedFile.groupName || 'Materi'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span>Status: Berhasil Diunggah {selectedFile.driveFileId ? 'ke Drive' : ''}</span>
                    </span>
                    <span>·</span>
                    <span>Pengunggah: {selectedFile.uploadedBy}</span>
                    <span>·</span>
                    <span>{selectedFile.fileSize}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedFile(null)} 
                className="p-1.5 rounded-full text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* In-App Preview Canvas */}
            <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[60vh] rounded-2xl bg-slate-50/50 p-2 border border-[#E2E8F0]">
              {renderFilePreview(selectedFile)}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-[#F1F5F9] shrink-0">
              {/* Delete Button (Manager or Owner) */}
              {(isManager || selectedFile.uploadedBy === currentUser?.displayName || selectedFile.uploadedBy === currentUser?.email) ? (
                <button
                  type="button"
                  onClick={() => setFileToDelete(selectedFile)}
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3.5 py-2.5 rounded-xl flex items-center justify-center sm:justify-start gap-1.5 transition-colors cursor-pointer border border-rose-200/60 sm:border-transparent"
                  title="Hapus berkas dari kelas"
                >
                  <Trash2 size={14} />
                  <span>Hapus Berkas</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {/* Open in New Tab Button */}
                {selectedFile.storageUrl && (
                  <button
                    type="button"
                    onClick={() => handleOpenNewTab(selectedFile)}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Buka di tab browser baru"
                  >
                    <ExternalLink size={13} />
                    <span>Buka di Tab Baru</span>
                  </button>
                )}

                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownload(selectedFile)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Unduh Berkas</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: UPLOAD FILE MODAL */}
      {showUploadModal && (
        <ModalPortal onClose={handleCloseUploadModal} maxWidth="max-w-lg">
          <div className="bg-white border border-slate-200/80 rounded-3xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">Upload Berkas ke Kelas</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Unggah materi atau dokumen pendukung ke Google Drive kelas</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleCloseUploadModal} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* 1. File Picker / Dropzone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Pilih Berkas <span className="text-rose-500">*</span></span>
                  {selectedFileObj && (
                    <span className="text-[11px] font-mono text-indigo-600 font-medium">
                      {(selectedFileObj.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                </label>

                {!selectedFileObj ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) handleFileSelected(dropped);
                    }}
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                        : 'border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
                    }`}
                  >
                    <div className="w-11 h-11 mx-auto rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-500 group-hover:text-indigo-600 group-hover:scale-105 transition-all mb-2.5">
                      <UploadCloud size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Klik untuk memilih file <span className="font-normal text-slate-500">atau seret file ke sini</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Mendukung PDF, PPTX, DOCX, XLSX, ZIP, Gambar hingga 35 MB
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/50 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 shadow-2xs flex items-center justify-center shrink-0">
                        {getFileIcon(selectedFileObj.type, selectedFileObj.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate" title={selectedFileObj.name}>
                          {selectedFileObj.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {(selectedFileObj.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Berkas siap
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFileObj(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus file terpilih"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFilePicked}
                  className="hidden"
                />
              </div>

              {/* 2. Nama Berkas */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Nama Tampilan Berkas <span className="text-rose-500">*</span></span>
                  {selectedFileObj && uploadName !== selectedFileObj.name && (
                    <button 
                      type="button"
                      onClick={() => setUploadName(selectedFileObj.name)}
                      className="text-[10px] font-normal text-indigo-600 hover:underline cursor-pointer"
                    >
                      Gunakan nama asli
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Modul Pertemuan 1 - Pengantar.pdf"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs transition-all font-medium"
                />
              </div>

              {/* 3. Mata Kuliah (SESUAI & DROPDOWN) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={13} className="text-indigo-500" />
                    <span>Mata Kuliah <span className="text-rose-500">*</span></span>
                  </span>
                  {!isCustomCourse ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCourse(true);
                        setUploadCourse('');
                      }}
                      className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                    >
                      + Input Manual
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCourse(false);
                        setUploadCourse(availableCourses[0] || '');
                      }}
                      className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                    >
                      Pilih dari Daftar
                    </button>
                  )}
                </label>

                {!isCustomCourse ? (
                  <CustomSelect
                    value={uploadCourse}
                    onChange={setUploadCourse}
                    options={availableCourses}
                    placeholder="Pilih Mata Kuliah..."
                    searchPlaceholder="Cari mata kuliah..."
                    icon={BookOpen}
                    footerAction={{
                      label: '➕ Ketik Mata Kuliah Lain...',
                      onClick: () => {
                        setIsCustomCourse(true);
                        setUploadCourse('');
                      }
                    }}
                  />
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Ketik nama mata kuliah..."
                      value={uploadCourse}
                      onChange={(e) => setUploadCourse(e.target.value)}
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-indigo-50/20 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs transition-all font-medium"
                    />
                    <p className="text-[10px] text-slate-400">Mode input mata kuliah kustom aktif.</p>
                  </div>
                )}
              </div>

              {/* 4. Folder Tujuan & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Folder Tujuan */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Folder Tujuan</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomFolder(!isCustomFolder);
                        if (isCustomFolder) {
                          setUploadFolder(FOLDER_PRESETS[0].label);
                          setUploadCategory(FOLDER_PRESETS[0].category);
                        } else {
                          setUploadFolder('');
                        }
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      {isCustomFolder ? '← Pilih dari Daftar' : '+ Buat Folder Baru'}
                    </button>
                  </div>

                  {!isCustomFolder ? (
                    <CustomSelect
                      value={uploadFolder}
                      onChange={(val) => {
                        setUploadFolder(val);
                        const found = FOLDER_PRESETS.find(p => p.label === val);
                        if (found) setUploadCategory(found.category);
                      }}
                      options={FOLDER_PRESETS.map(fp => ({
                        value: fp.label,
                        label: `${fp.icon} ${fp.label}`
                      }))}
                      placeholder="Pilih Folder Tujuan..."
                      searchPlaceholder="Cari folder..."
                      icon={Folder}
                      footerAction={{
                        label: '➕ Ketik Folder Baru...',
                        onClick: () => {
                          setIsCustomFolder(true);
                          setUploadFolder('');
                        }
                      }}
                    />
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Ketik nama folder baru..."
                        value={uploadFolder}
                        onChange={(e) => setUploadFolder(e.target.value)}
                        autoFocus
                        className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-indigo-50/20 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs transition-all font-medium"
                      />
                      <p className="text-[10px] text-slate-400">Folder akan dibuat otomatis di Google Drive.</p>
                    </div>
                  )}
                </div>

                {/* Kategori */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Kategori Berkas</label>
                  <CustomSelect
                    value={uploadCategory}
                    onChange={setUploadCategory}
                    options={CATEGORY_OPTIONS}
                    placeholder="Pilih Kategori..."
                    searchPlaceholder="Cari kategori..."
                    icon={Tag}
                  />
                  <p className="text-[10px] text-slate-400">Menentukan label & ikon berkas di repositori.</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleCloseUploadModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 min-h-[38px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!uploadName.trim() || !selectedFileObj}
                  className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer min-h-[38px]"
                >
                  <UploadCloud size={15} />
                  <span>Unggah di Latar Belakang</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* CONFIRM DELETE MODAL (In-App, Non-native) */}
      <ConfirmModal
        isOpen={Boolean(fileToDelete)}
        onClose={() => !isDeleting && setFileToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Berkas dari Repositori?"
        message={`Apakah Anda yakin ingin menghapus berkas "${fileToDelete?.name || ''}" dari repositori kelas?`}
        confirmText="Ya, Hapus Berkas"
        cancelText="Batal"
        type="danger"
        isLoading={isDeleting}
      />

      {/* FLOATING BACKGROUND UPLOADS WIDGET */}
      {backgroundUploads.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end max-w-sm w-[92vw] sm:w-[380px] select-none pointer-events-auto transition-all duration-300">
          <div className="w-full bg-white/95 backdrop-blur-md text-[#0F172A] border border-[#CBD5E1] shadow-2xl rounded-2xl overflow-hidden">
            {/* Widget Header */}
            <div 
              onClick={() => setIsWidgetExpanded(prev => !prev)}
              className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] cursor-pointer hover:bg-slate-100/80 transition-colors border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {backgroundUploads.some(u => u.status === 'uploading') ? (
                  <RefreshCw size={15} className="animate-spin text-indigo-600 shrink-0" />
                ) : backgroundUploads.some(u => u.status === 'error') ? (
                  <AlertCircle size={15} className="text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                )}
                <span className="text-xs font-bold text-[#0F172A] truncate">
                  {backgroundUploads.some(u => u.status === 'uploading')
                    ? `Mengunggah (${backgroundUploads.filter(u => u.status === 'uploading').length} berkas)`
                    : 'Pengunggahan Berkas Selesai'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {backgroundUploads.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWidgetExpanded(prev => !prev);
                  }}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title={isWidgetExpanded ? 'Ciutkan' : 'Perluas'}
                >
                  {isWidgetExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </button>
                {backgroundUploads.every(u => u.status !== 'uploading') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBackgroundUploads([]);
                    }}
                    className="p-1 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1 cursor-pointer"
                    title="Tutup & Bersihkan"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Widget Body */}
            {isWidgetExpanded && (
              <div className="p-3.5 space-y-3 max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white custom-scrollbar">
                {backgroundUploads.map(job => (
                  <div key={job.id} className="pt-2.5 first:pt-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#0F172A] truncate" title={job.fileName}>
                          {job.fileName}
                        </p>
                        <p className="text-[10px] text-[#64748B] truncate font-mono">
                          📁 {job.targetFolder} · {job.finalCourse}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {job.fileSize}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          job.status === 'completed'
                            ? 'bg-emerald-500'
                            : job.status === 'error'
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-indigo-600 to-sky-500'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>

                    {/* Status Text & Actions */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`truncate font-medium flex items-center gap-1 ${
                        job.status === 'completed'
                          ? 'text-emerald-700 font-bold'
                          : job.status === 'error'
                          ? 'text-rose-600'
                          : 'text-indigo-600'
                      }`}>
                        {job.status === 'completed' && <Check size={12} strokeWidth={3} className="text-emerald-600" />}
                        {job.status === 'error' && <AlertCircle size={12} className="text-rose-600" />}
                        <span className="truncate">{job.statusMessage || (job.status === 'completed' ? 'Tersimpan di Drive!' : job.error)}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {job.status === 'error' && (
                          <button
                            type="button"
                            onClick={() => handleRetryJob(job)}
                            className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition-colors cursor-pointer"
                          >
                            Coba Lagi
                          </button>
                        )}
                        {job.status !== 'uploading' && (
                          <button
                            type="button"
                            onClick={() => setBackgroundUploads(prev => prev.filter(u => u.id !== job.id))}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title="Hapus"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
