import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Check,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink
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
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(1);

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

  // Escape listener for fullscreen photo lightbox
  useEffect(() => {
    if (!fullscreenPhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFullscreenPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenPhoto]);

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

  const handleOpenPhotoInNewTab = (photoUrl) => {
    if (!photoUrl) return;
    if (photoUrl.startsWith('http')) {
      window.open(photoUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Lampiran Pengumuman</title>
              <style>
                body { margin: 0; padding: 24px; background-color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
                img { max-width: 100%; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              </style>
            </head>
            <body>
              <img src="${photoUrl}" alt="Ukuran Penuh" />
            </body>
          </html>
        `);
        win.document.close();
      }
    } catch {
      window.open(photoUrl, '_blank');
    }
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
        <ModalPortal 
          onClose={() => setSelectedAnnouncement(null)}
          maxWidth="max-w-xl"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider ${
                  selectedAnnouncement.type === 'important'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : selectedAnnouncement.type === 'schedule'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : selectedAnnouncement.type === 'assignment'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {selectedAnnouncement.type} Announcement
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(selectedAnnouncement.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <button 
                onClick={() => setSelectedAnnouncement(null)} 
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                title="Tutup (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Title & Author Meta */}
              <div className="space-y-1">
                <h3 className="font-extrabold text-xl text-slate-900 leading-snug tracking-tight">
                  {selectedAnnouncement.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <span>Dipublikasikan oleh</span>
                  <span className="font-semibold text-slate-700">{selectedAnnouncement.author}</span>
                  <span>·</span>
                  <span>{new Date(selectedAnnouncement.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                </p>
              </div>

              {/* Announcement Message */}
              {selectedAnnouncement.message && (
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed py-1">
                  {selectedAnnouncement.message}
                </div>
              )}

              {/* Clean Document / Photo Attachment Card */}
              {(selectedAnnouncement.attachment?.url || selectedAnnouncement.attachment?.previewUrl) && (() => {
                const photoSrc = selectedAnnouncement.attachment.url || selectedAnnouncement.attachment.previewUrl;
                const photoName = selectedAnnouncement.attachment.name || 'Foto Lampiran';
                return (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Paperclip size={12} className="text-slate-400" />
                        Lampiran Dokumen / Foto
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFullscreenPhoto(photoSrc);
                            setPhotoZoom(1);
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Maximize2 size={12} />
                          Layar Penuh
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoInNewTab(photoSrc)}
                          className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Buka di tab baru"
                        >
                          <ExternalLink size={12} />
                          Tab Baru
                        </button>
                      </div>
                    </div>

                    {/* Media Card Preview */}
                    <div 
                      onClick={() => {
                        setFullscreenPhoto(photoSrc);
                        setPhotoZoom(1);
                      }}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/70 hover:border-indigo-300 transition-all cursor-zoom-in shadow-2xs hover:shadow-sm"
                    >
                      {/* Document Canvas Preview with soft depth */}
                      <div className="p-4 sm:p-5 flex items-center justify-center bg-gradient-to-b from-slate-100/70 to-slate-200/40 min-h-[220px] max-h-[380px]">
                        <img
                          src={photoSrc}
                          alt={selectedAnnouncement.title}
                          className="max-h-[340px] w-auto max-w-full object-contain rounded-xl shadow-md border border-slate-200/80 transition-transform duration-200 group-hover:scale-[1.015]"
                        />
                        {/* Hover Overlay Badge */}
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="bg-slate-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-2 shadow-xl backdrop-blur-md">
                            <Maximize2 size={13} />
                            Klik untuk Buka Layar Penuh
                          </span>
                        </div>
                      </div>

                      {/* File Info Footer */}
                      <div className="px-4 py-2.5 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <ImageIcon size={14} className="text-indigo-500 shrink-0" />
                          <span className="truncate font-medium text-slate-800 text-[11px]">{photoName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 pl-2">
                          {selectedAnnouncement.attachment?.size || 'Klik untuk perbesar'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Harmonized Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex items-center justify-between gap-2 flex-wrap">
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
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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
                    className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Tutup
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

      {/* FULLSCREEN PHOTO LIGHTBOX VIEWER (Portaled to document.body over all modals) */}
      {fullscreenPhoto && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-200"
          onClick={() => setFullscreenPhoto(null)}
        >
          {/* Top Floating Control Bar */}
          <div 
            className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 shrink-0 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-white/90 text-xs font-medium min-w-0 pr-2">
              <ImageIcon size={16} className="text-indigo-400 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-md">
                {selectedAnnouncement?.attachment?.name || 'Tinjauan Gambar Penuh'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Zoom In / Out Controls */}
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10 text-white">
                <button
                  type="button"
                  onClick={() => setPhotoZoom(prev => Math.max(0.5, +(prev - 0.25).toFixed(2)))}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                  title="Perkecil (-)"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-[11px] font-mono px-2 select-none min-w-[42px] text-center">
                  {Math.round(photoZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPhotoZoom(prev => Math.min(3, +(prev + 0.25).toFixed(2)))}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                  title="Perbesar (+)"
                >
                  <ZoomIn size={16} />
                </button>
                {photoZoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setPhotoZoom(1)}
                    className="text-[10px] font-semibold px-2 py-1 hover:bg-white/15 rounded-md transition-colors cursor-pointer text-indigo-300"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Open in new tab helper */}
              <button
                type="button"
                onClick={() => handleOpenPhotoInNewTab(fullscreenPhoto)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
                title="Buka di Tab Baru"
              >
                <ExternalLink size={16} />
              </button>

              {/* Download Button */}
              <a
                href={fullscreenPhoto}
                download={selectedAnnouncement?.attachment?.name || 'foto_pengumuman.jpg'}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
                title="Unduh Gambar"
              >
                <Download size={16} />
              </a>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setFullscreenPhoto(null)}
                className="p-2 bg-rose-500/80 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Tutup (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Center Scrollable / Zoomable Image Stage */}
          <div 
            className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center cursor-zoom-out"
            onClick={() => setFullscreenPhoto(null)}
          >
            <div 
              className="transition-transform duration-150 ease-out origin-center cursor-default max-w-full"
              style={{ transform: `scale(${photoZoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fullscreenPhoto}
                alt="Ukuran Penuh"
                className="max-h-[88vh] max-w-[94vw] w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
