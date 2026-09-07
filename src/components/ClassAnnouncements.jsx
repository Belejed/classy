import React, { useState, useRef } from 'react';
import { 
  Megaphone, 
  Plus, 
  X, 
  Calendar, 
  AlertCircle, 
  Paperclip, 
  Trash2,
  Share2,
  Mail,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';

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
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef(null);

  const role = currentClass?.userRole;
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(role) || currentClass?.ownerId === currentUser?.uid;

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file foto/gambar yang diperbolehkan');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 6 MB');
      return;
    }
    setSelectedPhoto(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Judul dan pesan pengumuman wajib diisi');
      return;
    }

    setIsPublishing(true);
    try {
      let attachment = null;
      if (photoPreview) {
        attachment = {
          url: photoPreview,
          name: selectedPhoto?.name || 'lampiran_foto.jpg',
          type: selectedPhoto?.type || 'image/jpeg',
          size: `${((selectedPhoto?.size || 0) / 1024).toFixed(1)} KB`
        };

        // Attempt to upload to Google Drive in background for permanent storage
        try {
          const driveRes = await fetch('/api/upload-drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: selectedPhoto?.name || 'announcement_photo.jpg',
              mimeType: selectedPhoto?.type || 'image/jpeg',
              fileData: photoPreview,
              folderName: 'Lampiran Pengumuman'
            })
          });
          if (driveRes.ok) {
            const driveData = await driveRes.json();
            if (driveData.storageUrl) {
              attachment.driveUrl = driveData.storageUrl;
              attachment.driveFileId = driveData.fileId;
            }
          }
        } catch (driveErr) {
          console.warn('Drive upload fallback to local image data:', driveErr);
        }
      }

      const created = await onCreateAnnouncement({
        title: title.trim(),
        message: message.trim(),
        type,
        author: currentUser?.displayName || 'Koordinator Kelas',
        attachment,
        sendEmail: sendEmailNotification
      });

      // If sendEmailNotification is true, trigger email dispatch to members (+ CC exars.012@gmail.com)
      if (sendEmailNotification) {
        try {
          const memberEmails = (currentClass?.members || [])
            .filter(m => (m.status || 'approved') === 'approved' && m.email)
            .map(m => m.email);

          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipients: memberEmails,
              subject: `[PENGUMUMAN KELAS: ${currentClass?.name || 'Classy'}] ${title.trim()}`,
              type: type === 'important' ? 'important' : 'announcement',
              title: title.trim(),
              subtitle: `Pengumuman Kelas ${currentClass?.name || 'Classy'}`,
              message: message.trim(),
              photoUrl: attachment?.url || null,
              metaRows: [
                ['Kategori', type.toUpperCase()],
                ['Pengirim', currentUser?.displayName || 'Koordinator Kelas'],
                ['Ruang Kelas', currentClass?.name || 'Classy']
              ]
            })
          }).catch(emailErr => console.warn('Email broadcast error:', emailErr));
          
          toast.success('Pengumuman dipublikasikan & email notifikasi dikirim!');
        } catch {}
      } else {
        toast.success('Pengumuman berhasil dipublikasikan!');
      }

      setShowCreateModal(false);
      setTitle('');
      setMessage('');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setSendEmailNotification(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0 cursor-pointer min-h-[38px]"
          >
            <Plus size={13} />
            <span>Create Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements Feed or Empty State */}
      {announcements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-2xs max-w-3xl">
          <EmptyState
            variant="announcements"
            title="Belum Ada Pengumuman"
            description="Informasi penting, pergantian ruangan, dan pengumuman resmi dari Komti atau Dosen akan tampil di sini."
            actionLabel={isManager ? 'Buat Pengumuman Baru' : undefined}
            onAction={isManager ? () => setShowCreateModal(true) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-3.5 max-w-3xl">
          {announcements.map((ann) => {
            const isImportant = ann.type === 'important';

            return (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnouncement(ann)}
                className={`bg-white border p-5 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer space-y-2.5 ${
                  isImportant 
                    ? 'border-l-4 border-l-rose-500 border-rose-200 ring-1 ring-rose-100' 
                    : 'border-l-4 border-l-indigo-400 border-slate-200 hover:border-slate-300'
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
                    {new Date(ann.createdAt).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#0F172A] leading-snug">
                    {ann.title}
                  </h3>
                  <p className="text-xs text-[#475569] line-clamp-3 whitespace-pre-wrap leading-relaxed">
                    {ann.message}
                  </p>

                  {/* Photo Thumbnail if attached */}
                  {(ann.attachment?.url || ann.attachment?.previewUrl) && (
                    <div className="rounded-xl overflow-hidden border border-slate-200/80 bg-slate-100 max-h-48 mt-2">
                      <img 
                        src={ann.attachment.url || ann.attachment.previewUrl} 
                        alt={ann.title} 
                        className="w-full h-full max-h-48 object-cover hover:scale-101 transition-transform"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>Oleh {ann.author}</span>
                  <span className="font-semibold text-indigo-600 hover:underline">Baca selengkapnya →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ANNOUNCEMENT DETAIL MODAL */}
      {selectedAnnouncement && (
        <ModalPortal onClose={() => setSelectedAnnouncement(null)}>
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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

              {/* Attached Photo in Modal */}
              {(selectedAnnouncement.attachment?.url || selectedAnnouncement.attachment?.previewUrl) && (
                <div className="space-y-1.5 pt-1">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-[380px] flex items-center justify-center p-1">
                    <img
                      src={selectedAnnouncement.attachment.url || selectedAnnouncement.attachment.previewUrl}
                      alt={selectedAnnouncement.title}
                      className="max-h-[360px] w-auto max-w-full object-contain rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>📷 {selectedAnnouncement.attachment.name || 'Foto Lampiran'}</span>
                    <a
                      href={selectedAnnouncement.attachment.url || selectedAnnouncement.attachment.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline font-semibold"
                    >
                      Buka Ukuran Penuh ↗
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9] gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Share to WhatsApp Button */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `📢 *[PENGUMUMAN KELAS: ${currentClass?.name || 'Classy'}]*\n` +
                    `*${selectedAnnouncement.title}*\n\n` +
                    `${selectedAnnouncement.message}\n\n` +
                    `Dipublikasikan oleh: ${selectedAnnouncement.author}\n` +
                    `🔗 Akses web kelas: https://classy.exars.my.id`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Bagikan pengumuman ini langsung ke WhatsApp / Grup Kelas"
                >
                  <Share2 size={13} />
                  <span>Kirim ke WA</span>
                </a>

                {/* Email broadcast button */}
                {(() => {
                  const emails = (currentClass?.members || [])
                    .filter(m => m && (m.status || 'approved') === 'approved' && m.email)
                    .map(m => m.email)
                    .join(',');
                  if (!emails) return null;
                  const mailSub = `[PENGUMUMAN KELAS: ${currentClass?.name || 'Classy'}] ${selectedAnnouncement.title}`;
                  const mailBody = `${selectedAnnouncement.message}\n\nDipublikasikan oleh: ${selectedAnnouncement.author}\nPortal Kelas: ${typeof window !== 'undefined' ? window.location.origin : ''}`;
                  return (
                    <a
                      href={`mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent(mailSub)}&body=${encodeURIComponent(mailBody)}`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Kirim email ke seluruh anggota kelas (BCC)"
                    >
                      <Mail size={13} />
                      <span>Email Anggota</span>
                    </a>
                  );
                })()}

                {isManager && (
                  <button
                    type="button"
                    onClick={() => setAnnouncementToDelete(selectedAnnouncement)}
                    className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors border border-rose-200/60 sm:border-transparent"
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

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

              {/* Photo Upload Attachment Input */}
              <div className="space-y-1.5">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {!photoPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#0F172A] bg-slate-50 hover:bg-slate-100 text-[#475569] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <ImageIcon size={15} className="text-indigo-600" />
                    <span>Lampirkan Foto / Gambar (Opsional)</span>
                  </button>
                ) : (
                  <div className="relative rounded-2xl border border-slate-200 p-2.5 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0F172A] truncate">
                          {selectedPhoto?.name || 'Foto Lampiran'}
                        </p>
                        <p className="text-[10px] text-[#64748B]">
                          {selectedPhoto?.size ? `${(selectedPhoto.size / 1024).toFixed(1)} KB` : 'Siap dilampirkan'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Automatic Email Notification Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs font-semibold text-indigo-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={13} className="text-indigo-600 shrink-0" />
                    <span className="truncate">Kirim notifikasi email otomatis ke seluruh anggota kelas</span>
                  </div>
                </label>
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
