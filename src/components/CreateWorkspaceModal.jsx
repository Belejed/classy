import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Layers, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreateWorkspace,
  onJoinWorkspace
}) {
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎓');
  const [template, setTemplate] = useState('Blank');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const icons = ['🎓', '🎨', '💼', '🏆', '💻', '🔬', '📚', '⚡', '🏢', '🎬'];
  const templates = [
    { id: 'Blank', label: 'Blank Workspace', desc: 'Mulai dari kanvas kosong' },
    { id: 'Study Group', label: 'Study Group / Kelas', desc: 'Jadwal kuliah & tugas kelompok' },
    { id: 'Project', label: 'Project Collaboration', desc: 'Sprint tugas & target bersama' },
    { id: 'Organization', label: 'Organization / BEM', desc: 'Struktur acara & rapat divisi' }
  ];

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateWorkspace({
        name: name.trim(),
        description: description.trim(),
        icon,
        color: 'cream'
      });
      toast.success(`Workspace "${name}" berhasil dibuat! ✨`);
      onClose();
    } catch (err) {
      toast.error('Gagal membuat workspace: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsSubmitting(true);
    try {
      await onJoinWorkspace(inviteCode.trim());
      toast.success('Berhasil bergabung ke workspace! 🎉');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal bergabung ke workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden text-[#181818] dark:text-[#EDE8DF] flex flex-col">
        
        {/* Header with Mode Toggle */}
        <div className="px-6 pt-5 pb-3 border-b border-[#181818]/10 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#141414] border border-[#181818]/10 dark:border-white/10">
            <button
              onClick={() => setMode('create')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                mode === 'create'
                  ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818] shadow-xs'
                  : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
              }`}
            >
              + Buat Baru
            </button>
            <button
              onClick={() => setMode('join')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                mode === 'join'
                  ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818] shadow-xs'
                  : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
              }`}
            >
              🔗 Gabung via Kode
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/50 text-[#6F6A63] hover:text-[#181818] dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        {mode === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
            
            {/* Workspace Name & Icon */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F6A63]">
                Nama Workspace *
              </label>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <span className="w-10 h-10 rounded-2xl bg-white dark:bg-[#252528] border border-[#181818]/15 flex items-center justify-center text-xl shadow-xs shrink-0 cursor-pointer">
                    {icon}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 🎨 UI/UX Project atau 🎓 Database Group"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl px-3.5 py-2.5 text-xs font-semibold outline-none text-[#181818] dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#6F6A63] uppercase tracking-wider">Pilih Ikon</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {icons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all shrink-0 ${
                      icon === ic
                        ? 'bg-pastel-pink border border-[#181818] scale-110 shadow-xs'
                        : 'bg-white dark:bg-[#252528] border border-[#181818]/10 hover:bg-cream-muted'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F6A63]">
                Deskripsi Singkat (Opsional)
              </label>
              <textarea
                placeholder="Tujuan workspace, proyek akhir, atau ruang kelas bersama..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-3 text-xs outline-none text-[#181818] dark:text-white resize-none"
              />
            </div>

            {/* Templates Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F6A63]">
                Template Struktur
              </label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplate(tpl.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      template === tpl.id
                        ? 'bg-white dark:bg-[#252528] border-[#181818] dark:border-white shadow-xs'
                        : 'bg-white/40 dark:bg-[#181818]/40 border-[#181818]/10 text-[#6F6A63]'
                    }`}
                  >
                    <p className="font-bold text-xs text-[#181818] dark:text-white leading-tight">{tpl.label}</p>
                    <p className="text-[10px] text-[#6F6A63] line-clamp-1 mt-0.5">{tpl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full py-3 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold transition-opacity hover:opacity-90 shadow-sm disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Membuat...' : 'Buat Workspace'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F6A63]">
                Kode Undangan Workspace
              </label>
              <input
                type="text"
                placeholder="Contoh: SEM5-9831 atau UIUX-4120"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold tracking-wider outline-none text-[#181818] dark:text-white uppercase"
                required
              />
              <p className="text-[11px] text-[#6F6A63]">
                Dapatkan kode 8 karakter dari teman atau pengelola workspace.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !inviteCode.trim()}
              className="w-full py-3 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold transition-opacity hover:opacity-90 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Memeriksa...' : 'Gabung Workspace'}
            </button>
          </form>
        )}

      </div>
    </div>,
    document.body
  );
}
