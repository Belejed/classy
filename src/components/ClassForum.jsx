import React, { useState, useRef } from 'react';
import { 
  Users, 
  Plus, 
  MessageSquare, 
  Paperclip, 
  Send, 
  ArrowLeft, 
  Upload, 
  Download, 
  FileText,
  UserPlus,
  Trash2,
  X,
  Wrench,
  Clock,
  Sparkles,
  AlertCircle,
  Folder,
  CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';

export default function ClassForum({
  currentClass,
  currentUser,
  groups = [],
  onCreateGroup,
  onSendMessage,
  onAddGroupFile,
  onDeleteGroup
}) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupTab, setGroupTab] = useState('discussion'); // 'discussion' | 'members' | 'files'

  // Discussion Message Input
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Group File Upload State
  const fileInputRef = useRef(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Create Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isCoordinator = currentClass?.userRole === 'coordinator';

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error('Nama kelompok wajib diisi');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        members: [
          {
            userId: currentUser.uid,
            name: currentUser.displayName || 'Student',
            role: 'member'
          }
        ]
      });
      toast.success('Kelompok baru berhasil dibuat!');
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (err) {
      toast.error(err.message || 'Gagal membuat kelompok');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedGroup) return;

    setIsSending(true);
    try {
      const newMsg = await onSendMessage(selectedGroup.id, {
        senderName: currentUser?.displayName || 'Student',
        senderId: currentUser?.uid,
        text: messageText.trim()
      });

      // Append locally
      setSelectedGroup(prev => ({
        ...prev,
        messages: [...(prev.messages || []), newMsg]
      }));
      setMessageText('');
    } catch (err) {
      toast.error('Gagal mengirim pesan');
    } finally {
      setIsSending(false);
    }
  };

  const handleGroupFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;

    setIsUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileUrl = reader.result;
        const newFile = await onAddGroupFile(currentClass.id, selectedGroup.id, {
          name: file.name,
          uploadedBy: currentUser?.displayName || 'Member',
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          storageUrl: fileUrl
        });

        toast.success('File kelompok berhasil diunggah & masuk ke tab Files!');
        setSelectedGroup(prev => ({
          ...prev,
          files: [...(prev.files || []), newFile]
        }));
        setIsUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Gagal mengunggah file kelompok');
      setIsUploadingFile(false);
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Hapus kelompok ini?')) return;
    try {
      await onDeleteGroup(groupId);
      setSelectedGroup(null);
      toast.success('Kelompok berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus kelompok');
    }
  };

  // Maintenance Mode on main branch
  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Class Forum & Groups</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              Maintenance
            </span>
          </div>
          <p className="text-xs text-[#64748B]">Ruang diskusi kelompok dan forum interaktif mahasiswa.</p>
        </div>
      </div>

      {/* Maintenance Hero Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-12 text-center shadow-xs max-w-2xl mx-auto my-6 space-y-6">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <Wrench size={34} className="animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-[#0F172A] text-white shadow-xs">
            <Clock size={14} />
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
            <Sparkles size={13} className="text-amber-600" />
            <span>Fitur Dalam Pengembangan & Pemeliharaan</span>
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Forum Sedang Dioptimalkan
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
            Modul kelompok dan ruang chat real-time sedang disiapkan agar lebih stabil, cepat, dan aman. Kami akan segera merilisnya kembali untuk Anda.
          </p>
        </div>

        {/* Alternative Actions */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-left text-xs space-y-2.5 max-w-lg mx-auto">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold">
            <AlertCircle size={15} className="text-sky-600" />
            <span>Sementara itu, Anda dapat menggunakan:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-[#475569]">
            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center gap-2">
              <CheckSquare size={14} className="text-emerald-600" />
              <span><strong>Tasks:</strong> Kumpul tugas & Drive</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center gap-2">
              <Folder size={14} className="text-sky-600" />
              <span><strong>Files:</strong> Akses materi kuliah</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#94A3B8]">
          Kelas: <strong>{currentClass?.name || 'Classy'}</strong> · Sistem Classy Academic
        </p>
      </div>
    </div>
  );

  // IF A GROUP IS SELECTED: Show Group Detail
  if (selectedGroup) {
    return (
      <div className="space-y-6 font-sans">
        
        {/* Back and Group Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="p-1.5 rounded-xl border border-[#CBD5E1] hover:bg-white text-[#0F172A] transition-colors"
              title="Back to Groups"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">{selectedGroup.name}</h2>
              <p className="text-xs text-[#64748B]">{selectedGroup.description || 'Small Class Study Group'}</p>
            </div>
          </div>

          {/* Sub-tabs: Discussion, Members, Files */}
          <div className="flex items-center p-1 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setGroupTab('discussion')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                groupTab === 'discussion' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Discussion
            </button>
            <button
              onClick={() => setGroupTab('members')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                groupTab === 'members' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Members ({(selectedGroup.members || []).length})
            </button>
            <button
              onClick={() => setGroupTab('files')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                groupTab === 'files' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Files ({(selectedGroup.files || []).length})
            </button>
          </div>
        </div>

        {/* SECTION 1: DISCUSSION */}
        {groupTab === 'discussion' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4 max-w-3xl flex flex-col h-[520px]">
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(selectedGroup.messages || []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-6 text-xs text-[#94A3B8]">
                  Belum ada pesan. Mulai diskusi kelompok di bawah.
                </div>
              ) : (
                selectedGroup.messages.map((msg) => {
                  const isMine = msg.senderId === currentUser?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] font-semibold text-[#64748B] px-1 pb-0.5">
                        {msg.senderName}
                      </span>
                      <div className={`p-3 rounded-2xl text-xs max-w-[85%] whitespace-pre-wrap ${
                        isMine 
                          ? 'bg-[#0F172A] text-white rounded-br-xs' 
                          : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] rounded-bl-xs'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-[#94A3B8] px-1 pt-0.5">
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-[#F1F5F9] flex items-center gap-2">
              <input
                type="text"
                placeholder="Write a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || isSending}
                className="p-2.5 rounded-xl bg-[#0F172A] text-white hover:bg-[#1E293B] disabled:opacity-50 transition-colors shrink-0"
                title="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* SECTION 2: MEMBERS */}
        {groupTab === 'members' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4 max-w-xl">
            <h3 className="font-bold text-sm text-[#0F172A]">Group Members</h3>
            <div className="space-y-2">
              {(selectedGroup.members || []).map((m, idx) => (
                <div key={m.userId || idx} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                    {m.name ? m.name[0].toUpperCase() : 'M'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0F172A] truncate">{m.name}</p>
                    <span className="text-[10px] text-[#64748B]">Member</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: GROUP FILES */}
        {groupTab === 'files' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4 max-w-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Group Files</h3>
                <p className="text-[11px] text-[#64748B]">Files uploaded here automatically appear in the central Files tab.</p>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B]"
              >
                <Upload size={13} />
                <span>{isUploadingFile ? 'Uploading...' : 'Upload Group File'}</span>
              </button>
              <input ref={fileInputRef} type="file" onChange={handleGroupFileUpload} className="hidden" />
            </div>

            {(selectedGroup.files || []).length === 0 ? (
              <p className="py-8 text-center text-xs text-[#64748B] italic">
                Belum ada file kelompok yang diunggah.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedGroup.files.map((gf) => (
                  <div key={gf.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={16} className="text-[#0F172A] shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-[#0F172A] truncate">{gf.name}</p>
                        <span className="text-[10px] text-[#64748B]">Uploaded by {gf.uploadedBy} · {gf.fileSize}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (gf.storageUrl && gf.storageUrl.startsWith('data:')) {
                          const a = document.createElement('a');
                          a.href = gf.storageUrl;
                          a.download = gf.name;
                          a.click();
                        } else {
                          toast('File lampiran kelompok.', { icon: '📄' });
                        }
                      }}
                      className="p-1.5 rounded-lg border border-[#CBD5E1] hover:bg-white text-[#475569]"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    );
  }

  // DEFAULT VIEW: LIST OF GROUPS (Your Groups)
  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Class Groups & Forum</h2>
          <p className="text-xs text-[#64748B]">Small working teams, assignment project discussion, and group resources.</p>
        </div>

        {isCoordinator && (
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-2xs transition-colors shrink-0"
          >
            <Plus size={13} />
            <span>Create Group</span>
          </button>
        )}
      </div>

      {/* Your Groups List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
          Your Groups ({groups.length})
        </h3>

        {groups.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-2 shadow-2xs">
            <Users size={32} className="mx-auto text-[#94A3B8] opacity-60" />
            <h3 className="font-bold text-sm text-[#0F172A]">You haven't joined any groups yet.</h3>
            <p className="text-xs text-[#64748B]">Groups created for projects and small teams will be listed here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((grp) => (
              <div
                key={grp.id}
                onClick={() => setSelectedGroup(grp)}
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">
                      {grp.name}
                    </span>
                    <span className="text-[10px] font-semibold text-[#64748B]">
                      {(grp.members || []).length} members
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] line-clamp-2">
                    {grp.description || 'Project working group'}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                  <span>{(grp.messages || []).length} messages</span>
                  <span className="font-semibold text-[#0F172A] hover:underline">Open group →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CREATE GROUP (Coordinator) */}
      {showCreateGroupModal && (
        <ModalPortal onClose={() => setShowCreateGroupModal(false)} maxWidth="max-w-md">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="font-bold text-base text-[#0F172A]">Create Class Group</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="p-1 rounded-full text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Group 1 - UI/UX Project"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#334155]">Project Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the group's assignment or project topic..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] shadow-xs disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
