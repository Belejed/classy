import React, { useState, useRef, useMemo } from 'react';
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
  FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadToGoogleDrive } from '../utils/driveUpload';
import ModalPortal from './ModalPortal';

const CATEGORIES = ['All', 'Submission', 'Material', 'Assignments', 'Groups', 'Other'];

export default function ClassFiles({
  currentClass,
  currentUser,
  files = [],
  onUploadFile,
  onDeleteFile
}) {
  const [viewMode, setViewMode] = useState('folders'); // 'folders' | 'all'
  const [activeFolder, setActiveFolder] = useState(null); // null = root, string = folder name
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Preview Modal
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Material');
  const [uploadFolder, setUploadFolder] = useState('Materi Kuliah');
  const [uploadCourse, setUploadCourse] = useState(currentClass?.name || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFileObj, setSelectedFileObj] = useState(null);

  const role = currentClass?.userRole;
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  // Group files by Folder
  const folderStats = useMemo(() => {
    const map = new Map();
    files.forEach(f => {
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
  }, [files]);

  // Filtered files based on active folder, category, and search query
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
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
  }, [files, activeFolder, selectedCategory, searchQuery]);

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

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileObj(file);
      if (!uploadName) setUploadName(file.name);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadName.trim()) {
      toast.error('Nama file wajib diisi');
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = '';
      let fileSize = '1.2 MB';
      const targetFolder = uploadFolder.trim() || 'Materi Kuliah';

      if (selectedFileObj) {
        try {
          toast.loading('Mengunggah ke Google Drive...', { id: 'drive-upload' });
          const driveRes = await uploadToGoogleDrive({
            file: selectedFileObj,
            name: uploadName.trim(),
            folderName: targetFolder
          });
          fileUrl = driveRes.webViewLink || driveRes.previewUrl;
          fileSize = driveRes.fileSize || `${(selectedFileObj.size / (1024 * 1024)).toFixed(2)} MB`;
          toast.success('Tersimpan di Google Drive!', { id: 'drive-upload' });
        } catch (driveErr) {
          console.warn('Google Drive error, falling back to local encoding:', driveErr);
          toast.error(`Drive error: ${driveErr.message}. Menyimpan lokal...`, { id: 'drive-upload' });
          const reader = new FileReader();
          fileUrl = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(selectedFileObj);
          });
          fileSize = `${(selectedFileObj.size / (1024 * 1024)).toFixed(2)} MB`;
        }
      }

      await onUploadFile({
        name: uploadName.trim(),
        category: uploadCategory,
        folder: targetFolder,
        course: uploadCourse.trim(),
        uploadedBy: currentUser?.displayName || 'Member',
        fileSize,
        fileType: uploadName.split('.').pop()?.toLowerCase() || 'pdf',
        storageUrl: fileUrl
      });

      toast.success('File berhasil ditambahkan ke repositori!');
      setShowUploadModal(false);
      setUploadName('');
      setSelectedFileObj(null);
    } catch (err) {
      toast.error(err.message || 'Gagal mengunggah file');
    } finally {
      setIsUploading(false);
    }
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

  const handleDelete = async (fileId) => {
    if (!window.confirm('Hapus berkas ini dari repositori web? Berkas di Google Drive tidak akan dihapus permanen, melainkan dipindahkan ke folder "Trash".')) return;
    toast.loading('Menghapus berkas dan memindahkan ke folder Trash di Drive...', { id: 'delete-file' });
    try {
      await onDeleteFile(fileId);
      setSelectedFile(null);
      toast.success('Berkas berhasil dihapus & dipindahkan ke folder Trash di Google Drive', { id: 'delete-file' });
    } catch {
      toast.error('Gagal menghapus berkas', { id: 'delete-file' });
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
              {files.length} Berkas
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Penyimpanan terpusat untuk berkas tugas mahasiswa, slide materi dosen, dan modul kuliah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Folders vs All Files */}
          <div className="flex items-center p-1 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold shadow-2xs">
            <button
              onClick={() => {
                setViewMode('folders');
                setActiveFolder(null);
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
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
              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'all' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Layers size={12} />
              <span>Semua Berkas</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://drive.google.com/drive/folders/1BK-P0mPQF9MSy0wsQ-tqNgVCXHXuCwmf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors shrink-0"
              title="Buka Folder Google Drive Kelas (Termasuk Folder Trash)"
            >
              <ExternalLink size={12} className="text-emerald-600" />
              <span className="hidden sm:inline">Google Drive</span>
            </a>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0"
            >
              <Upload size={13} />
              <span>Upload Berkas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs Navigation when inside a folder */}
      {activeFolder && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveFolder(null)}
              className="text-[#64748B] hover:text-[#0F172A] font-semibold flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              <span>Semua Folder</span>
            </button>
            <ChevronRight size={13} className="text-[#CBD5E1]" />
            <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
              <FolderOpen size={15} className="text-amber-500" />
              <span>{activeFolder}</span>
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              ({filteredFiles.length} berkas)
            </span>
          </div>

          <button
            onClick={() => setActiveFolder(null)}
            className="text-[11px] font-semibold text-[#0F172A] hover:underline"
          >
            Tutup Folder
          </button>
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
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-2 shadow-2xs">
              <Folder size={36} className="mx-auto text-[#94A3B8] opacity-60" />
              <h3 className="font-bold text-sm text-[#0F172A]">Belum ada folder atau berkas</h3>
              <p className="text-xs text-[#64748B]">Berkas materi atau submission tugas yang dikumpulkan akan otomatis muncul di sini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {folderStats.map((folder) => {
                const isTaskFolder = folder.name.toLowerCase().includes('tugas') || folder.category === 'Submission';

                return (
                  <div
                    key={folder.name}
                    onClick={() => setActiveFolder(folder.name)}
                    className="bg-white border border-[#E2E8F0] hover:border-[#0F172A] p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
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
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          {folder.count} berkas dikumpulkan
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
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-2 shadow-2xs">
              <Folder size={32} className="mx-auto text-[#94A3B8] opacity-60" />
              <h3 className="font-bold text-sm text-[#0F172A]">Tidak ada berkas yang cocok</h3>
              <p className="text-xs text-[#64748B]">Coba ubah kata kunci pencarian atau kategori.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map(file => {
                const folderTag = file.folder || file.groupName || (file.category === 'Submission' ? 'Tugas' : 'Materi');

                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0 group-hover:bg-slate-100 transition-colors">
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
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
                      <span className="truncate">Oleh {file.uploadedBy}</span>
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
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <span className="px-2 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      📁 {selectedFile.folder || selectedFile.groupName || 'Materi'}
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
            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9] shrink-0">
              {/* Delete Button (Manager or Owner) */}
              {(isManager || selectedFile.uploadedBy === currentUser?.displayName || selectedFile.uploadedBy === currentUser?.email) ? (
                <button
                  onClick={() => handleDelete(selectedFile.id)}
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                  title="Hapus dari web & pindahkan ke folder Trash di Google Drive"
                >
                  <Trash2 size={14} />
                  <span>Hapus Berkas (Pindah ke Trash)</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {/* Open in New Tab Button */}
                {selectedFile.storageUrl && (
                  <button
                    onClick={() => handleOpenNewTab(selectedFile)}
                    className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                    title="Buka di tab browser baru"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">Buka di Tab Baru</span>
                  </button>
                )}

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] flex items-center gap-1.5 shadow-2xs transition-colors"
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
        <ModalPortal onClose={() => setShowUploadModal(false)} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-base text-[#0F172A]">Upload Berkas ke Kelas</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Nama Berkas</label>
                <input
                  type="text"
                  placeholder="e.g. Modul Pertemuan 4.pdf"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Folder Tujuan</label>
                  <input
                    type="text"
                    placeholder="e.g. Materi Kuliah"
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155]">Kategori</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all cursor-pointer"
                  >
                    <option value="Material">Material</option>
                    <option value="Submission">Submission</option>
                    <option value="Assignments">Assignments</option>
                    <option value="Groups">Groups</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Mata Kuliah</label>
                <input
                  type="text"
                  placeholder="e.g. Pemrograman Mobile"
                  value={uploadCourse}
                  onChange={(e) => setUploadCourse(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              {/* File Attachment Picker */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Pilih File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white text-center cursor-pointer transition-colors space-y-1"
                >
                  <Upload size={16} className="mx-auto text-[#64748B]" />
                  <p className="text-xs font-medium text-[#0F172A]">
                    {selectedFileObj ? selectedFileObj.name : 'Klik untuk memilih file dari komputer/HP'}
                  </p>
                  <p className="text-[10px] text-[#94A3B8]">Mendukung PDF, DOCX, PPTX, ZIP, Gambar, dll.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFilePicked}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-xs disabled:opacity-50"
                >
                  {isUploading ? 'Mengunggah...' : 'Simpan Berkas'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
