import React, { useState, useRef } from 'react';
import { 
  Folder, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Plus, 
  Paperclip, 
  FileCheck,
  FileCode,
  Image as ImageIcon,
  Archive,
  Clock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { processFileUpload, downloadAttachment, formatFileSize } from '../utils/fileStorage';

export default function FilesView({
  files = [],
  onSaveFiles,
  workspaceName = 'Personal Space'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All'); // 'All' | 'PDF' | 'Docs' | 'Images' | 'Archives'
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const categories = ['All', 'PDF', 'Docs', 'Images', 'Archives'];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const processed = await processFileUpload(file);
      const newFileItem = {
        id: processed.id,
        name: processed.name,
        size: processed.size,
        rawSize: processed.rawSize,
        type: processed.type,
        isPdf: processed.isPdf,
        dataUrl: processed.dataUrl,
        uploadedAt: new Date().toISOString(),
        location: workspaceName
      };

      const updated = [newFileItem, ...files];
      if (onSaveFiles) onSaveFiles(updated);
      toast.success(`Berkas "${file.name}" berhasil diunggah! 📄`);
    } catch (err) {
      toast.error(err.message || 'Gagal mengunggah berkas.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus berkas ini?')) {
      const updated = files.filter(f => f.id !== id);
      if (onSaveFiles) onSaveFiles(updated);
      toast.success('Berkas dihapus.');
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory === 'PDF') return file.isPdf || file.name.toLowerCase().endsWith('.pdf');
    if (activeCategory === 'Docs') return file.name.match(/\.(docx?|pptx?|xlsx?|txt)$/i);
    if (activeCategory === 'Images') return file.type?.startsWith('image/') || file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i);
    if (activeCategory === 'Archives') return file.name.match(/\.(zip|rar|tar|gz)$/i);

    return true;
  });

  const totalBytes = files.reduce((acc, f) => acc + (f.rawSize || 0), 0);

  const getFileIcon = (file) => {
    if (file.isPdf || file.name?.toLowerCase().endsWith('.pdf')) {
      return <FileText size={20} className="text-rose-500" />;
    }
    if (file.type?.startsWith('image/') || file.name?.match(/\.(png|jpe?g|webp)$/i)) {
      return <ImageIcon size={20} className="text-blue-500" />;
    }
    if (file.name?.match(/\.(zip|rar|tar)$/i)) {
      return <Archive size={20} className="text-amber-500" />;
    }
    return <FileCode size={20} className="text-emerald-500" />;
  };

  return (
    <div className="w-full space-y-6 pb-12 text-[#181818] dark:text-[#EDE8DF]">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#181818] dark:text-white">
            Files & Documents
          </h2>
          <p className="text-xs text-[#6F6A63] font-medium mt-0.5">
            Store, view, and attach lecture slides, summaries, and coursework files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
          </button>
        </div>
      </div>

      {/* 3 Bento Summary Cards (Pastel Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-4 rounded-[22px] bg-pastel-yellow text-[#181818] border border-[#181818]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">Total Files</span>
            <span className="text-2xl font-black font-display mt-1 block">{files.length}</span>
            <span className="text-[10px] font-bold opacity-80">{formatFileSize(totalBytes)} used</span>
          </div>
          <Folder size={32} className="opacity-20" />
        </div>

        <div className="p-4 rounded-[22px] bg-pastel-pink text-[#181818] border border-[#181818]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">PDF Documents</span>
            <span className="text-2xl font-black font-display mt-1 block">
              {files.filter(f => f.isPdf || f.name?.toLowerCase().endsWith('.pdf')).length}
            </span>
            <span className="text-[10px] font-bold opacity-80">E-books & Assignments</span>
          </div>
          <FileText size={32} className="opacity-20" />
        </div>

        <div className="p-4 rounded-[22px] bg-pastel-blue text-[#181818] border border-[#181818]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">Active Context</span>
            <span className="text-lg font-black font-display mt-1 block truncate max-w-[150px]">
              {workspaceName}
            </span>
            <span className="text-[10px] font-bold opacity-80">Isolated storage</span>
          </div>
          <Sparkles size={32} className="opacity-20" />
        </div>

      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1C1C1E] p-3 rounded-[22px] border border-[#181818]/15 shadow-xs">
        
        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                activeCategory === cat
                  ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818] shadow-xs'
                  : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F7F2E8] dark:bg-[#252528] border border-[#181818]/10 text-xs w-full sm:w-64">
          <Search size={13} className="text-[#6F6A63]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none flex-1 text-xs font-medium text-[#181818] dark:text-white placeholder-[#6F6A63]"
          />
        </div>

      </div>

      {/* Files List Table / Grid */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-[#181818]/15 dark:border-white/10 shadow-sm overflow-hidden">
        {filteredFiles.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6F6A63] space-y-2">
            <Folder size={36} className="mx-auto opacity-30 text-[#181818] dark:text-white" />
            <p className="font-bold text-sm text-[#181818] dark:text-white">No files here yet.</p>
            <p>Upload lecture slides, assignments, or project files to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#181818]/10 dark:divide-white/10 text-xs">
            {filteredFiles.map((file) => (
              <div 
                key={file.id} 
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F2E8]/40 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#F7F2E8] dark:bg-[#252528] border border-[#181818]/10 flex items-center justify-center shrink-0">
                    {getFileIcon(file)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#181818] dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-[#6F6A63] mt-0.5">
                      {file.size || 'Unknown size'} • Uploaded {new Date(file.uploadedAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream-muted dark:bg-white/10 text-[#6F6A63]">
                    {file.location || 'Personal'}
                  </span>

                  <button
                    onClick={() => downloadAttachment(file)}
                    className="p-2 rounded-full border border-[#181818]/15 hover:bg-cream-muted text-[#181818] dark:text-white transition-colors"
                    title="Unduh Berkas"
                  >
                    <Download size={13} />
                  </button>

                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 rounded-full border border-rose-500/20 hover:bg-rose-500/10 text-rose-600 transition-colors"
                    title="Hapus Berkas"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
