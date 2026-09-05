import React, { useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  X, 
  Calendar, 
  AlertCircle, 
  Paperclip, 
  Trash2,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import ConfirmModal from './ConfirmModal';

export default function ClassAnnouncements({
  currentClass,
  currentUser,
  announcements = [],
  onCreateAnnouncement,
  onDeleteAnnouncement
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // In-app Delete Confirmation Modal
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [isDeletingAnnouncement, setIsDeletingAnnouncement] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general'); // 'general' | 'assignment' | 'schedule' | 'important'
  const [isPublishing, setIsPublishing] = useState(false);

  const role = currentClass?.userRole;
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Judul dan pesan pengumuman wajib diisi');
      return;
    }

    setIsPublishing(true);
    try {
      await onCreateAnnouncement({
        title: title.trim(),
        message: message.trim(),
        type,
        author: currentUser?.displayName || 'Class Coordinator',
        attachment: null
      });
      toast.success('Pengumuman berhasil dipublikasikan!');
      setShowCreateModal(false);
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error(err.message || 'Gagal membuat pengumuman');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    setIsDeletingAnnouncement(true);
    try {
      await onDeleteAnnouncement(announcementToDelete.id);
      setSelectedAnnouncement(null);
      setAnnouncementToDelete(null);
      toast.success('Pengumuman berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus pengumuman');
    } finally {
      setIsDeletingAnnouncement(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Class Announcements</h2>
          <p className="text-xs text-[#64748B]">Official broadcast messages, schedule changes, and urgent updates.</p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0"
          >
            <Plus size={13} />
            <span>Create Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements Feed or Empty State */}
      {announcements.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-2 shadow-2xs">
          <Megaphone size={32} className="mx-auto text-[#94A3B8] opacity-60" />
          <h3 className="font-bold text-sm text-[#0F172A]">No announcements yet.</h3>
          <p className="text-xs text-[#64748B]">Broadcasts from the class coordinator will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3.5 max-w-3xl">
          {announcements.map((ann) => {
            const isImportant = ann.type === 'important';

            return (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnouncement(ann)}
                className={`bg-white border p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2.5 ${
                  isImportant ? 'border-rose-300 ring-1 ring-rose-100' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  {isImportant ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-xs border border-rose-700 animate-pulse">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                      <span>IMPORTANT</span>
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      ann.type === 'schedule'
                        ? 'bg-blue-50 text-blue-700'
                        : ann.type === 'assignment'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {ann.type}
                    </span>
                  )}

                  <span className="text-[11px] text-[#94A3B8]">
                    {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#0F172A] leading-snug">
                    {ann.title}
                  </h3>
                  <p className="text-xs text-[#475569] line-clamp-3 whitespace-pre-wrap leading-relaxed">
                    {ann.message}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>By {ann.author}</span>
                  <span className="font-medium text-[#0F172A] hover:underline">Read full</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ANNOUNCEMENT DETAIL MODAL */}
      {selectedAnnouncement && (
        <ModalPortal onClose={() => setSelectedAnnouncement(null)}>
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569]">
                {selectedAnnouncement.type} Announcement
              </span>
              <button onClick={() => setSelectedAnnouncement(null)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-lg text-[#0F172A] leading-snug">
                {selectedAnnouncement.title}
              </h3>

              <div className="text-xs text-[#64748B] flex items-center gap-3">
                <span>By {selectedAnnouncement.author}</span>
                <span>·</span>
                <span>{new Date(selectedAnnouncement.createdAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1E293B] whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.message}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
              {isManager ? (
                <button
                  type="button"
                  onClick={() => setAnnouncementToDelete(selectedAnnouncement)}
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors border border-rose-200/60 sm:border-transparent"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: CREATE ANNOUNCEMENT (Coordinator) */}
      {showCreateModal && (
        <ModalPortal onClose={() => setShowCreateModal(false)} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-base text-[#0F172A]">Publish Announcement</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule Change"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Announcement Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all cursor-pointer"
                >
                  <option value="general">General</option>
                  <option value="important">Important (Urgent)</option>
                  <option value="schedule">Schedule Update</option>
                  <option value="assignment">Assignment Reminder</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Message</label>
                <textarea
                  rows={4}
                  placeholder="Tomorrow's class has been moved to Lab 2..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* CONFIRM DELETE MODAL (In-App, Non-native) */}
      <ConfirmModal
        isOpen={Boolean(announcementToDelete)}
        onClose={() => !isDeletingAnnouncement && setAnnouncementToDelete(null)}
        onConfirm={handleConfirmDeleteAnnouncement}
        title="Hapus Pengumuman?"
        message={`Pengumuman "${announcementToDelete?.title || ''}" akan dihapus permanen.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
        isLoading={isDeletingAnnouncement}
      />

    </div>
  );
}
