import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Pin, 
  Star, 
  Paperclip, 
  Download, 
  Eye, 
  Search, 
  BookOpen, 
  X, 
  ArrowLeft,
  CheckSquare,
  List,
  Heading,
  Bold,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { processFileUpload, downloadAttachment } from '../utils/fileStorage';

export default function NotesView({
  notes = [],
  onSaveNotes,
  schedules = []
}) {
  const [activeNoteId, setActiveNoteId] = useState(notes[0]?.id || null);
  const [mobileMode, setMobileMode] = useState('list'); // 'list' | 'editor'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const categories = ['ALL', 'Materi Kuliah', 'Rangkuman', 'Praktikum', 'Silabus', 'Referensi'];
  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0] || null;

  // Active note draft states
  const [title, setTitle] = useState(activeNote?.title || '');
  const [category, setCategory] = useState(activeNote?.category || 'Materi Kuliah');
  const [content, setContent] = useState(activeNote?.content || '');
  const [color, setColor] = useState(activeNote?.color || 'yellow');
  const [pinned, setPinned] = useState(activeNote?.pinned || false);
  const [attachments, setAttachments] = useState(activeNote?.attachments || []);

  const handleSelectNote = (n) => {
    if (!n) return;
    setActiveNoteId(n.id);
    setTitle(n.title || '');
    setCategory(n.category || 'Materi Kuliah');
    setContent(n.content || '');
    setColor(n.color || 'yellow');
    setPinned(n.pinned || false);
    setAttachments(n.attachments || []);
    setMobileMode('editor');
  };

  const handleCreateNewNote = () => {
    const newNote = {
      id: 'note_' + Math.random().toString(36).substr(2, 9),
      title: 'Untitled Note',
      category: 'Materi Kuliah',
      content: '',
      color: 'yellow',
      pinned: false,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newNote, ...notes];
    onSaveNotes(updated);
    handleSelectNote(newNote);
    setMobileMode('editor');
    toast.success('Catatan baru dibuat! 📝');
  };

  const handleSaveActiveNote = () => {
    if (!activeNote) return;

    const updatedNote = {
      ...activeNote,
      title: title.trim() || 'Untitled Note',
      category: category.trim(),
      content: content,
      color,
      pinned,
      attachments,
      updatedAt: new Date().toISOString()
    };

    const updated = notes.map(n => n.id === activeNote.id ? updatedNote : n);
    onSaveNotes(updated);
    toast.success('Catatan tersimpan! ✨');
  };

  const handleDeleteNote = (noteId) => {
    if (window.confirm('Hapus catatan ini?')) {
      const updated = notes.filter(n => n.id !== noteId);
      onSaveNotes(updated);
      if (activeNoteId === noteId) {
        handleSelectNote(updated[0] || null);
      }
      toast.success('Catatan dihapus.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileData = await processFileUpload(file, 10);
      const newAtts = [...attachments, fileData];
      setAttachments(newAtts);
      
      if (activeNote) {
        const updated = notes.map(n => n.id === activeNote.id ? { ...n, attachments: newAtts } : n);
        onSaveNotes(updated);
      }
      toast.success(`File "${file.name}" dilampirkan ke catatan!`);
    } catch (err) {
      toast.error(err.message || 'Gagal upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = (n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           n.content?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || n.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full space-y-5 pb-12 text-[#181818] dark:text-[#EDE8DF]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#181818] dark:text-white">
            Personal Notes
          </h2>
          <p className="text-xs text-[#6F6A63] font-medium mt-0.5">
            Minimalist editorial notes for course lecture summaries, checklists, and references.
          </p>
        </div>

        <button
          onClick={handleCreateNewNote}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold shadow-sm hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Note</span>
        </button>
      </div>

      {/* 2-Column Split: Left Notes List (4 cols) & Right Note Editor (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-220px)] min-h-[500px]">
        
        {/* Left Column: Notes List */}
        <div className={`lg:col-span-4 bg-white dark:bg-[#1C1C1E] p-4 rounded-[28px] border border-[#181818]/15 dark:border-white/10 shadow-sm flex flex-col gap-3 ${
          mobileMode === 'editor' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Search Input */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F7F2E8] dark:bg-[#252528] border border-[#181818]/10 text-xs">
            <Search size={13} className="text-[#6F6A63]" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 text-xs text-[#181818] dark:text-white font-medium"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {categories.slice(0, 4).map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-all ${
                  selectedCategory === c
                    ? 'bg-[#181818] text-white'
                    : 'text-[#6F6A63] hover:text-[#181818]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* List of Notes */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-0.5">
            {filteredNotes.length === 0 ? (
              <p className="text-center py-10 text-xs text-[#6F6A63]">
                Belum ada catatan. Klik "+ New Note" untuk membuat!
              </p>
            ) : (
              filteredNotes.map((n) => {
                const isSelected = activeNote?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelectNote(n)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-[#F7F2E8] dark:bg-white/10 border-[#181818] dark:border-white shadow-xs'
                        : 'bg-white dark:bg-[#1C1C1E] border-[#181818]/10 hover:border-[#181818]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-pastel-yellow text-[#181818]">
                        {n.category || 'Materi'}
                      </span>
                      <span className="text-[9px] font-mono text-[#6F6A63]">
                        {new Date(n.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-xs text-[#181818] dark:text-white line-clamp-1">
                      {n.title || 'Untitled Note'}
                    </h4>

                    <p className="text-[11px] text-[#6F6A63] line-clamp-2 leading-tight">
                      {n.content || 'Kosong...'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Note Editor */}
        <div className={`lg:col-span-8 bg-white dark:bg-[#1C1C1E] p-6 rounded-[28px] border border-[#181818]/15 dark:border-white/10 shadow-sm flex flex-col gap-4 ${
          mobileMode === 'list' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {activeNote ? (
            <>
              {/* Editor Top Toolbar */}
              <div className="flex items-center justify-between gap-2 border-b border-[#181818]/10 pb-3">
                <button
                  onClick={() => setMobileMode('list')}
                  className="lg:hidden p-1 rounded-lg text-[#6F6A63]"
                >
                  <ArrowLeft size={16} />
                </button>

                {/* Category & Color Pill */}
                <div className="flex items-center gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-[#F7F2E8] dark:bg-[#252528] border border-[#181818]/10 rounded-full px-3 py-1 text-xs font-bold outline-none text-[#181818] dark:text-white"
                  >
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1 px-3 py-1 rounded-full border border-[#181818]/15 text-xs font-bold hover:bg-cream-muted"
                  >
                    <Paperclip size={12} />
                    <span>{isUploading ? 'Uploading...' : 'Attach'}</span>
                  </button>

                  <button
                    onClick={handleSaveActiveNote}
                    className="px-4 py-1 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold hover:opacity-90"
                  >
                    Save
                  </button>

                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1 text-[#6F6A63] hover:text-rose-500"
                    title="Hapus Catatan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <input
                type="text"
                placeholder="Judul Catatan..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl sm:text-2xl font-black font-display tracking-tight bg-transparent outline-none text-[#181818] dark:text-white placeholder-[#6F6A63]"
              />

              {/* Attachments pills if any */}
              {attachments?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pb-1">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-muted text-xs font-bold">
                      <FileText size={12} />
                      <span className="truncate max-w-[140px]">{att.name}</span>
                      <button onClick={() => downloadAttachment(att)} className="hover:text-blue-500">
                        <Download size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Note Content Textarea */}
              <textarea
                placeholder="Mulai menulis catatan kuliah, checklist materi, atau ringkasan..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full flex-1 bg-transparent outline-none resize-none text-xs sm:text-sm leading-relaxed text-[#181818] dark:text-[#EDE8DF] placeholder-[#6F6A63] custom-scrollbar"
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-[#6F6A63] space-y-2">
              <BookOpen size={36} className="opacity-20" />
              <p>Pilih atau buat catatan untuk mulai menulis.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
