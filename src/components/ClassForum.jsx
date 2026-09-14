import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Upload, 
  FileText,
  Trash2, 
  X, 
  Dices,
  Radio, 
  Sparkles, 
  Download,
  Check,
  Search,
  ExternalLink,
  Shield,
  Clock,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import ClassVoiceRoom from './ClassVoiceRoom';
import ClassGroupRandomizerModal from './ClassGroupRandomizerModal';
import EmptyState from './EmptyState';
import { dbService } from '../utils/db';

export default function ClassForum({
  currentClass,
  currentUser,
  groups = [],
  onCreateGroup,
  onSendMessage,
  handleAddGroupFile,
  onDeleteGroup
}) {
  const classId = currentClass?.id;
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showRandomizerModal, setShowRandomizerModal] = useState(false);
  const [groupTab, setGroupTab] = useState('discussion'); // 'discussion' | 'members' | 'files'

  // Online Presence State
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [presenceLoading, setPresenceLoading] = useState(true);

  // Discussion Message Input
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Group File Upload State
  const fileInputRef = useRef(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Create Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Search Filter for Groups
  const [groupSearch, setGroupSearch] = useState('');

  const isCoordinator = ['komti', 'coordinator', 'superadmin'].includes(currentClass?.userRole) || currentClass?.ownerId === currentUser?.uid;

  // Realtime Presence Subscription
  useEffect(() => {
    if (!classId) return;
    const unsub = dbService.presence.subscribe(classId, (users) => {
      setOnlineUsers(users || []);
      setPresenceLoading(false);
    });
    return () => unsub();
  }, [classId]);

  // Keep selectedGroup in sync with props `groups`
  useEffect(() => {
    if (selectedGroup) {
      const updated = groups.find(g => g.id === selectedGroup.id);
      if (updated) {
        setSelectedGroup(updated);
      }
    }
  }, [groups]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (selectedGroup && groupTab === 'discussion') {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedGroup?.messages, groupTab]);

  // Create Group Submit
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error('Nama kelompok wajib diisi');
      return;
    }

    setIsCreating(true);
    try {
      if (onCreateGroup) {
        await onCreateGroup({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          members: [
            {
              userId: currentUser.uid || currentUser.id,
              name: currentUser.displayName || currentUser.name || 'Mahasiswa',
              role: 'leader'
            }
          ]
        });
      }
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

  // Save multiple groups from Randomizer Modal
  const handleSaveRandomizedGroups = async (randomizedGroups) => {
    if (!randomizedGroups || randomizedGroups.length === 0) return;
    
    let successCount = 0;
    for (const g of randomizedGroups) {
      try {
        if (onCreateGroup) {
          await onCreateGroup({
            name: g.name,
            description: `Kelompok hasil acak sistem (${g.members.length} anggota)`,
            members: g.members
          });
          successCount++;
        }
      } catch (err) {
        console.warn('Error saving randomized group:', err);
      }
    }
    toast.success(`${successCount} kelompok hasil acak berhasil masuk ke Forum!`);
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedGroup) return;

    setIsSending(true);
    try {
      const textToSend = messageText.trim();
      setMessageText('');

      if (onSendMessage) {
        const newMsg = await onSendMessage(selectedGroup.id, {
          senderName: currentUser?.displayName || currentUser?.name || 'Mahasiswa',
          senderId: currentUser?.uid || currentUser?.id,
          text: textToSend
        });

        // Optimistically update local view
        if (newMsg) {
          setSelectedGroup(prev => ({
            ...prev,
            messages: [...(prev?.messages || []), newMsg]
          }));
        }
      }
    } catch (err) {
      toast.error('Gagal mengirim pesan');
    } finally {
      setIsSending(false);
    }
  };

  // Group File Upload
  const handleGroupFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;

    setIsUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileUrl = reader.result;
        if (handleAddGroupFile) {
          const newFile = await handleAddGroupFile(currentClass.id, selectedGroup.id, {
            name: file.name,
            uploadedBy: currentUser?.displayName || currentUser?.name || 'Mahasiswa',
            fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            storageUrl: fileUrl
          });

          toast.success('File kelompok berhasil diunggah!');
          if (newFile) {
            setSelectedGroup(prev => ({
              ...prev,
              files: [...(prev?.files || []), newFile]
            }));
          }
        }
        setIsUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Gagal mengunggah file kelompok');
      setIsUploadingFile(false);
    }
  };

  // Delete Group File
  const handleDeleteGroupFile = async (fileId) => {
    if (!selectedGroup) return;
    if (!window.confirm('Hapus berkas ini dari kelompok?')) return;
    try {
      await dbService.groups.deleteFile(classId, selectedGroup.id, fileId);
      setSelectedGroup(prev => ({
        ...prev,
        files: (prev?.files || []).filter(f => f.id !== fileId)
      }));
      toast.success('Berkas berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus berkas');
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Hapus kelompok ini beserta seluruh diskusi di dalamnya?')) return;
    try {
      if (onDeleteGroup) {
        await onDeleteGroup(groupId);
      }
      setSelectedGroup(null);
      toast.success('Kelompok berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus kelompok');
    }
  };

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase().trim();
    return groups.filter(g => 
      (g.name || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    );
  }, [groups, groupSearch]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. FORUM TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shadow-xs">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Class Forum & Kelompok</h2>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineUsers.length} Online
                </span>
              </div>
              <p className="text-xs text-[#64748B]">Ruang kolaborasi, pembagian kelompok, obrolan suara, dan aktivitas online mahasiswa.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Randomizer Button */}
          <button
            type="button"
            onClick={() => setShowRandomizerModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Dices size={15} />
            <span>🎲 Acak Kelompok</span>
          </button>

          {/* Manual Create Group Button */}
          <button
            type="button"
            onClick={() => setShowCreateGroupModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Buat Kelompok</span>
          </button>
        </div>
      </div>

      {/* 2. DISCORD-STYLE VOICE LOUNGE (WEBRTC AUDIO) */}
      <ClassVoiceRoom 
        classId={classId} 
        currentUser={currentUser} 
        roomId={`room_${classId}`} 
        roomName={`🔊 Voice Lounge - ${currentClass?.name || 'Kelas'}`} 
      />

      {/* 3. MAIN WORKSPACE: TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: GROUPS & DISCUSSIONS (8 COLUMNS) */}
        <div className="lg:col-span-8 space-y-4">
          
          {selectedGroup ? (
            /* VIEW A: SELECTED GROUP DISCUSSION WORKSPACE */
            <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xs overflow-hidden">
              
              {/* Group Header */}
              <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Kembali ke daftar kelompok"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                      {selectedGroup.name}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {selectedGroup.members?.length || 0} Anggota
                      </span>
                    </h3>
                    <p className="text-xs text-[#64748B] truncate max-w-md">
                      {selectedGroup.description || 'Ruang diskusi kelompok'}
                    </p>
                  </div>
                </div>

                {isCoordinator && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(selectedGroup.id)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Hapus Kelompok"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Group Sub-Tabs */}
              <div className="flex border-b border-[#E2E8F0] bg-white px-4 pt-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setGroupTab('discussion')}
                  className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                    groupTab === 'discussion'
                      ? 'border-indigo-600 text-indigo-700 font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  💬 Diskusi Obrolan ({selectedGroup.messages?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupTab('members')}
                  className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                    groupTab === 'members'
                      ? 'border-indigo-600 text-indigo-700 font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  👥 Anggota ({selectedGroup.members?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupTab('files')}
                  className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                    groupTab === 'files'
                      ? 'border-indigo-600 text-indigo-700 font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  📁 Berkas ({selectedGroup.files?.length || 0})
                </button>
              </div>

              {/* TAB CONTENT: DISCUSSION */}
              {groupTab === 'discussion' && (
                <div className="flex flex-col h-[480px]">
                  {/* Message Stream */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6] custom-scrollbar">
                    {(!selectedGroup.messages || selectedGroup.messages.length === 0) ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                        <MessageSquare size={32} className="text-slate-300" />
                        <p className="text-xs font-medium">Belum ada obrolan di kelompok ini.</p>
                        <p className="text-[11px]">Kirim pesan pertama untuk memulai koordinasi dengan teman kelompok Anda!</p>
                      </div>
                    ) : (
                      selectedGroup.messages.map((msg, mIdx) => {
                        const isMe = msg.senderId === (currentUser?.uid || currentUser?.id);
                        return (
                          <div 
                            key={msg.id || mIdx}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-[10px] text-slate-400 px-1 mb-0.5">
                              {msg.senderName} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            <div className={`max-w-md px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                              isMe 
                                ? 'bg-indigo-600 text-white rounded-br-xs' 
                                : 'bg-white border border-slate-200 text-[#0F172A] rounded-bl-xs'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Tulis pesan ke anggota kelompok..."
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 text-[#0F172A]"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !messageText.trim()}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CONTENT: MEMBERS */}
              {groupTab === 'members' && (
                <div className="p-5 space-y-3 min-h-[350px]">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    Daftar Anggota ({selectedGroup.members?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(selectedGroup.members || []).map((m, mIdx) => (
                      <div 
                        key={m.userId || mIdx}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {(m.name || 'M').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0F172A] truncate">{m.name}</p>
                            {m.nim && <p className="text-[10px] text-[#64748B]">{m.nim}</p>}
                          </div>
                        </div>
                        {m.role === 'leader' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
                            👑 Ketua
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: FILES */}
              {groupTab === 'files' && (
                <div className="p-5 space-y-4 min-h-[350px]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Berkas Kerja Kelompok ({selectedGroup.files?.length || 0})
                    </h4>
                    <div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleGroupFileUpload} 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingFile}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>{isUploadingFile ? 'Mengunggah...' : 'Unggah File'}</span>
                      </button>
                    </div>
                  </div>

                  {(!selectedGroup.files || selectedGroup.files.length === 0) ? (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                      <FileText size={30} className="text-slate-300 mx-auto mb-2" />
                      <p className="font-medium">Belum ada berkas yang diunggah.</p>
                      <p className="text-[11px]">Unggah draft tugas, bahan materi, atau presentasi kelompok di sini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroup.files.map((file, fIdx) => (
                        <div 
                          key={file.id || fIdx}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#0F172A] truncate">{file.name}</p>
                              <span className="text-[10px] text-slate-400">
                                {file.fileSize || ''} • Oleh {file.uploadedBy || 'Anggota'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {file.storageUrl && (
                              <a
                                href={file.storageUrl}
                                download={file.name}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Unduh Berkas"
                              >
                                <Download size={15} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteGroupFile(file.id)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Berkas dari Kelompok"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* VIEW B: ALL GROUPS OVERVIEW */
            <div className="space-y-4">
              
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Cari kelompok kelas..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <span>Total <strong>{groups.length}</strong> kelompok terbentuk</span>
                </div>
              </div>

              {filteredGroups.length === 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                    <Dices size={28} />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-base font-bold text-[#0F172A]">Belum Ada Kelompok Terbentuk</h4>
                    <p className="text-xs text-[#64748B]">
                      Gunakan fitur **Acak Kelompok** untuk membagi seluruh anggota kelas secara instan dan otomatis, atau buat kelompok manual.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRandomizerModal(true)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Dices size={15} />
                      <span>🎲 Acak Kelompok Sekarang</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredGroups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroup(g)}
                      className="p-5 rounded-3xl bg-white border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-[#0F172A] group-hover:text-indigo-600 transition-colors">
                            {g.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {g.members?.length || 0} Anggota
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                          {g.description || 'Kelompok kerja dan ruang diskusi materi.'}
                        </p>
                      </div>

                      {/* Members Avatar Row & Open Button */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex -space-x-2 overflow-hidden">
                          {(g.members || []).slice(0, 4).map((m, mIdx) => (
                            <div
                              key={m.userId || mIdx}
                              className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                              title={m.name}
                            >
                              {(m.name || 'M').charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {(g.members?.length || 0) > 4 && (
                            <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                              +{(g.members.length - 4)}
                            </div>
                          )}
                        </div>

                        <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Buka Diskusi →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REALTIME ONLINE PRESENCE & SHORTCUTS (4 COLUMNS) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Realtime Online Presence Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Sedang Online ({onlineUsers.length})
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Realtime</span>
            </div>

            {onlineUsers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                {presenceLoading ? 'Memeriksa kehadiran...' : 'Tidak ada mahasiswa online saat ini.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                {onlineUsers.map((u) => {
                  const isMe = u.userId === (currentUser?.uid || currentUser?.id);
                  return (
                    <div 
                      key={u.id || u.userId}
                      className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100/80 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.userName} className="w-full h-full object-cover" />
                            ) : (
                              (u.userName || 'M').charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0F172A] truncate">
                            {u.userName} {isMe && <span className="text-[10px] font-normal text-emerald-600">(Anda)</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Buka website
                          </p>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Randomizer Quick Info Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/70 space-y-3">
            <div className="flex items-center gap-2.5 text-amber-900 font-bold text-xs">
              <Dices size={18} className="text-amber-600" />
              <span>Pintasan Acak Kelompok</span>
            </div>
            <p className="text-xs text-amber-950/80 leading-relaxed">
              Perlu membagi tugas kelompok secara adil? Kocok seluruh anggota kelas secara acak dan langsung masukkan hasilnya ke Forum ini!
            </p>
            <button
              type="button"
              onClick={() => setShowRandomizerModal(true)}
              className="w-full py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Dices size={14} />
              <span>Buka Generator Kelompok</span>
            </button>
          </div>

        </div>

      </div>

      {/* 4. MODAL: CREATE GROUP MANUAL */}
      {showCreateGroupModal && (
        <ModalPortal onClose={() => setShowCreateGroupModal(false)} maxWidth="max-w-md">
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0F172A]">Buat Kelompok Baru</h3>
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateGroupSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155] block">Nama Kelompok</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Contoh: Kelompok 1 - Analisis Logistik"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 text-[#0F172A]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155] block">Deskripsi / Topik Tugas (Opsional)</label>
                  <textarea
                    rows={3}
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Keterangan topik atau instruksi pengerjaan kelompok..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 text-[#0F172A]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newGroupName.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isCreating ? 'Membuat...' : 'Buat Kelompok'}
                  </button>
                </div>
              </form>
            </div>
        </ModalPortal>
      )}

      {/* 5. MODAL: RANDOM GROUP GENERATOR */}
      <ClassGroupRandomizerModal
        isOpen={showRandomizerModal}
        onClose={() => setShowRandomizerModal(false)}
        members={currentClass?.members || []}
        className={currentClass?.name || ''}
        onSaveGroupsToForum={handleSaveRandomizedGroups}
      />

    </div>
  );
}
