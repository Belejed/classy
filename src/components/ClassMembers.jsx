import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  GraduationCap, 
  User, 
  UserCheck, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Check, 
  Mail, 
  Crown,
  AlertCircle,
  Settings, 
  X, 
  LogOut,
  History,
  Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import EmptyState from './EmptyState';

export default function ClassMembers({
  currentClass,
  currentUser,
  onUpdateMemberRole,
  onRemoveMember,
  onApproveMember,
  onDenyMember,
  onUpdateClassSettings,
  onNavigateTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'pending' | 'komti' | 'lecturer' | 'student'
  const [copiedCode, setCopiedCode] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Settings Modal State (Komti & Dosen only)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingName, setSettingName] = useState('');
  const [settingClassIdentifier, setSettingClassIdentifier] = useState('');
  const [settingLecturer, setSettingLecturer] = useState('');
  const [settingAcademicPeriod, setSettingAcademicPeriod] = useState('');
  const [settingWaGroupLink, setSettingWaGroupLink] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const members = currentClass?.members || [];
  const myRole = currentClass?.userRole || 'student';
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(myRole) || currentClass?.ownerId === currentUser?.uid;

  // Separate pending join requests from approved members
  const pendingMembers = members.filter(m => m && m.status === 'pending');
  const approvedMembers = members.filter(m => m && (m.status || 'approved') === 'approved');

  // Filtered members list
  const filteredMembers = (roleFilter === 'pending' ? pendingMembers : approvedMembers).filter(m => {
    if (!m) return false;
    const nameMatch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (roleFilter === 'pending') return nameMatch;

    let role = m.role || 'student';
    if (role === 'coordinator') role = 'komti';

    const roleMatch = roleFilter === 'all' || role === roleFilter;
    return nameMatch && roleMatch;
  });

  // Counts
  const komtiCount = approvedMembers.filter(m => m && (m.role === 'komti' || m.role === 'coordinator')).length;
  const lecturerCount = approvedMembers.filter(m => m && (m.role === 'lecturer' || m.role === 'dosen')).length;
  const studentCount = approvedMembers.filter(m => m && !['komti', 'coordinator', 'lecturer', 'dosen'].includes(m.role)).length;
  const pendingCount = pendingMembers.length;

  const handleCopyCode = () => {
    if (!currentClass?.joinCode) return;
    navigator.clipboard.writeText(currentClass.joinCode);
    setCopiedCode(true);
    toast.success('Kode kelas disalin ke clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleOpenSettings = () => {
    if (!isManager) {
      toast.error('Hanya Komti atau Dosen yang dapat mengakses pengaturan kelas.');
      return;
    }
    setSettingName(currentClass?.name || '');
    setSettingClassIdentifier(currentClass?.classIdentifier || '');
    setSettingLecturer(currentClass?.lecturer || '');
    setSettingAcademicPeriod(currentClass?.academicPeriod || '');
    setSettingWaGroupLink(currentClass?.waGroupLink || '');
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isManager) {
      toast.error('Hanya Komti atau Dosen yang dapat mengubah pengaturan kelas.');
      return;
    }
    if (!settingName.trim()) {
      toast.error('Nama kelas wajib diisi!');
      return;
    }
    setSavingSettings(true);
    try {
      if (onUpdateClassSettings) {
        await onUpdateClassSettings(currentClass.id, {
          name: settingName.trim(),
          classIdentifier: settingClassIdentifier.trim(),
          lecturer: settingLecturer.trim(),
          academicPeriod: settingAcademicPeriod.trim(),
          waGroupLink: settingWaGroupLink.trim()
        });
      }
      setShowSettingsModal(false);
      toast.success('Pengaturan kelas berhasil disimpan!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan kelas');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApprove = async (member) => {
    if (!isManager || !onApproveMember) return;
    setProcessingId(member.userId);
    try {
      await onApproveMember(currentClass.id, member.userId);
      toast.success(`${member.name || member.email} berhasil disetujui masuk kelas!`);

      // Otomatis siapkan link kirim notifikasi WA / Email ke member yang disetujui
      const cleanPhone = (member.phoneNumber || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
      if (cleanPhone) {
        const waText = `Halo ${member.name || ''}! Permintaan pendaftaran Anda ke kelas *${currentClass?.name || 'Classy'}* telah DISETUJUI oleh Komti/Dosen. Silakan akses portal kelas: ${typeof window !== 'undefined' ? window.location.origin : ''}`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank');
      } else if (member.email) {
        const mailSubject = `[Persetujuan Kelas] Pendaftaran Anda ke ${currentClass?.name || 'Classy'} Disetujui`;
        const mailBody = `Halo ${member.name || ''},\n\nPermintaan pendaftaran Anda ke kelas ${currentClass?.name || 'Classy'} telah disetujui oleh Pengurus Kelas.\nSilakan akses kelas di: ${typeof window !== 'undefined' ? window.location.origin : ''}\n\nSalam,\nPengurus Kelas`;
        window.open(`mailto:${member.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`, '_blank');
      }
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui anggota');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (member) => {
    if (!isManager || !onDenyMember) return;
    setProcessingId(member.userId);
    try {
      await onDenyMember(currentClass.id, member.userId);
      toast.success(`Permintaan ${member.name || member.email} telah ditolak.`);
    } catch (err) {
      toast.error(err.message || 'Gagal menolak anggota');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!isManager) {
      toast.error('Hanya Komti atau Dosen yang dapat mengubah peran.');
      return;
    }
    setProcessingId(targetUserId);
    try {
      await onUpdateMemberRole(currentClass.id, targetUserId, newRole);
      toast.success('Peran anggota berhasil diperbarui!');
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui peran');
    } finally {
      setProcessingId(null);
    }
  };

  const handleKickMember = async (member) => {
    if (!isManager) {
      toast.error('Hanya Komti atau Dosen yang dapat mengeluarkan anggota.');
      return;
    }
    if (member.userId === currentUser?.uid) {
      toast.error('Anda tidak dapat mengeluarkan diri sendiri.');
      return;
    }
    if (member.userId === currentClass?.ownerId) {
      toast.error('Tidak dapat mengeluarkan pembuat kelas.');
      return;
    }

    if (!window.confirm(`Keluarkan ${member.name || member.email} dari kelas ini?`)) {
      return;
    }

    setProcessingId(member.userId);
    try {
      await onRemoveMember(currentClass.id, member.userId);
      toast.success(`${member.name || 'Anggota'} berhasil dikeluarkan`);
    } catch (err) {
      toast.error(err.message || 'Gagal mengeluarkan anggota');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLeaveClass = async () => {
    if (currentClass?.ownerId === currentUser?.uid) {
      toast.error('Pembuat kelas tidak dapat keluar dari kelas.');
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin keluar dari kelas ${currentClass?.name}? Setelah keluar, Anda dapat bergabung ke kelas lain.`)) {
      return;
    }
    setProcessingId(currentUser?.uid);
    try {
      await onRemoveMember(currentClass.id, currentUser?.uid);
      toast.success('Berhasil keluar dari kelas.');
    } catch (err) {
      toast.error(err.message || 'Gagal keluar dari kelas.');
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleBadge = (rawRole) => {
    const role = rawRole === 'coordinator' ? 'komti' : (rawRole || 'student');

    if (role === 'komti') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Crown size={11} className="text-amber-600" />
          <span>Komti</span>
        </span>
      );
    }
    if (role === 'lecturer' || role === 'dosen') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <GraduationCap size={11} className="text-emerald-600" />
          <span>Dosen</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <User size={11} className="text-slate-500" />
        <span>Mahasiswa</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A]">Anggota & Pengurus Kelas</h2>
            {isManager && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                Pengelola
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Daftar seluruh mahasiswa, komti, dan dosen pengampu mata kuliah {currentClass?.name}.
          </p>
        </div>

        {/* Actions: Setting Kelas (Komti/Dosen only) + Join Code */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isManager && (
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('logs')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap min-h-[38px]"
                  title="Lihat Log Riwayat & Audit Aktivitas Kelas"
                >
                  <History size={14} className="text-indigo-600" />
                  <span>Log Aktivitas</span>
                </button>
              )}
              <button
                onClick={handleOpenSettings}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap min-h-[38px]"
                title="Pengaturan Ruang Kelas (Khusus Komti/Dosen)"
              >
                <Settings size={14} />
                <span>Pengaturan</span>
              </button>
            </div>
          )}

          <button
            onClick={handleCopyCode}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-mono font-bold text-[#0F172A] shadow-2xs transition-colors min-h-[38px]"
            title="Klik untuk salin kode kelas"
          >
            <span className="font-sans text-[11px] text-[#64748B] font-normal">Kode Kelas:</span>
            <span className="tracking-wider">{currentClass?.joinCode || '------'}</span>
            {copiedCode ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[#64748B]" />}
          </button>
        </div>
      </div>

      {/* Overview Stats Cards - Compact on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 hover:border-slate-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Total Anggota</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-0.5 tracking-tight">{approvedMembers.length}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-amber-50/40 border border-slate-200 hover:border-amber-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block truncate">Komti / Koordinator</span>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-0.5 tracking-tight">{komtiCount}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-emerald-50/40 border border-slate-200 hover:border-emerald-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block truncate">Dosen Pengampu</span>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-0.5 tracking-tight">{lecturerCount}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-indigo-50/40 border border-slate-200 hover:border-indigo-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block truncate">Mahasiswa</span>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-0.5 tracking-tight">{studentCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Cari anggota berdasarkan nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          />
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0 no-scrollbar scrollbar-none mask-scroll-fade sm:mask-none -mx-0.5 px-0.5">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3.5 py-1.5 min-h-[36px] rounded-xl font-semibold transition-colors shrink-0 cursor-pointer flex items-center justify-center ${
              roleFilter === 'all' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Semua ({approvedMembers.length})
          </button>

          {isManager && (
            <button
              onClick={() => setRoleFilter('pending')}
              className={`px-3.5 py-1.5 min-h-[36px] rounded-xl font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                roleFilter === 'pending' 
                  ? 'bg-rose-600 text-white shadow-2xs' 
                  : pendingCount > 0 
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                  : 'text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              <span>Permintaan Masuk</span>
              {pendingCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  roleFilter === 'pending' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setRoleFilter('komti')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 cursor-pointer ${
              roleFilter === 'komti' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Komti ({komtiCount})
          </button>
          <button
            onClick={() => setRoleFilter('lecturer')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 cursor-pointer ${
              roleFilter === 'lecturer' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Dosen ({lecturerCount})
          </button>
          <button
            onClick={() => setRoleFilter('student')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 cursor-pointer ${
              roleFilter === 'student' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Mahasiswa ({studentCount})
          </button>
        </div>
      </div>

      {/* Member Cards List */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          variant="tasks"
          title="Tidak ada anggota yang cocok"
          description="Coba ubah kata kunci pencarian nama/email atau filter peran."
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
          {filteredMembers.map((member) => {
            const isMe = member.userId === currentUser?.uid;
            const isOwner = member.userId === currentClass?.ownerId;
            const rawRole = member.role === 'coordinator' ? 'komti' : (member.role || 'student');
            const isTargetSelfOrOwner = isMe || isOwner;
            const isPendingMember = member.status === 'pending';

            return (
              <div 
                key={member.userId || member.email}
                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 hover:bg-[#FDFBF7] transition-colors"
              >
                {/* Member Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                    isPendingMember
                      ? 'bg-amber-500'
                      : rawRole === 'komti' 
                      ? 'bg-amber-600' 
                      : rawRole === 'lecturer' || rawRole === 'dosen' 
                      ? 'bg-emerald-600' 
                      : 'bg-[#0F172A]'
                  }`}>
                    {member.name ? member.name[0].toUpperCase() : (member.email ? member.email[0].toUpperCase() : 'U')}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#0F172A] truncate">
                        {member.name || member.email?.split('@')[0]}
                      </h4>
                      {isMe && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700">
                          Anda
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                          Pembuat
                        </span>
                      )}
                      {isPendingMember && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          ⏳ Menunggu Persetujuan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#64748B] flex-wrap mt-0.5">
                      <p className="truncate flex items-center gap-1">
                        <Mail size={11} className="text-[#94A3B8]" />
                        <span>{member.email}</span>
                      </p>
                      {member.phoneNumber && (
                        <p className="text-slate-500 font-mono text-[11px]">
                          📱 {member.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Badge & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
                  {isPendingMember ? (
                    // Approval Actions for Pending Users
                    <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        disabled={processingId === member.userId}
                        onClick={() => handleDeny(member)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 text-center"
                      >
                        Tolak
                      </button>
                      <button
                        disabled={processingId === member.userId}
                        onClick={() => handleApprove(member)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-center"
                      >
                        <Check size={13} />
                        <span>Setujui</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Direct Contact Icons (WA & Email) */}
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {member.phoneNumber && (
                          <a
                            href={`https://wa.me/${(member.phoneNumber || '').replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${member.name || ''}, saya Komti/Pengurus kelas ${currentClass?.name || ''}...`)}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`Chat WhatsApp ke ${member.phoneNumber}`}
                            className="p-1.5 sm:p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                        {member.email && (
                          <a
                            href={`mailto:${member.email}?subject=${encodeURIComponent(`[Kelas ${currentClass?.name || ''}] Informasi Perkuliahan`)}`}
                            title={`Kirim email ke ${member.email}`}
                            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                          >
                            <Mail size={14} />
                          </a>
                        )}
                      </div>

                      {/* Role Selector for Manager, or Static Badge for Student */}
                      {isManager && !isTargetSelfOrOwner ? (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <label className="text-[10px] font-semibold text-[#64748B] hidden sm:inline-block">Peran:</label>
                          <select
                            disabled={processingId === member.userId}
                            value={rawRole}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:border-[#0F172A] shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <option value="student">Mahasiswa</option>
                            <option value="komti">Komti (Admin)</option>
                            <option value="lecturer">Dosen (Lecturer)</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          {getRoleBadge(rawRole)}
                        </div>
                      )}

                      {/* Kick / Remove Member Button (Only for Manager, cannot kick owner or self) */}
                      {isManager && !isTargetSelfOrOwner && (
                        <button
                          disabled={processingId === member.userId}
                          onClick={() => handleKickMember(member)}
                          title="Keluarkan dari kelas"
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leave Class Option for Non-Owners */}
      {currentUser?.uid !== currentClass?.ownerId && (
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <p className="text-xs font-bold text-[#0F172A]">Ingin berpindah ruang kelas?</p>
            <p className="text-[11px] text-[#64748B]">
              Setiap akun mahasiswa/dosen hanya dapat terdaftar di 1 ruang kelas. Jika Anda ingin berpindah rombel atau kelas lain, silakan keluar dari kelas ini terlebih dahulu.
            </p>
          </div>
          <button
            onClick={handleLeaveClass}
            disabled={processingId === currentUser?.uid}
            className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 disabled:opacity-50"
          >
            <LogOut size={14} />
            <span>Keluar dari Kelas</span>
          </button>
        </div>
      )}

      {/* Information Notice */}
      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-3 text-xs text-[#475569]">
        <AlertCircle size={16} className="text-[#64748B] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#0F172A]">Informasi Hak Akses Kelas:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#64748B]">
            <li><strong>Komti (Ketua Tingkat / Koordinator):</strong> Dapat mengelola jadwal kuliah, membuat tugas & melihat pengumpulan, menyebarkan pengumuman, serta mengelola anggota kelas dan pengaturan ruang kelas.</li>
            <li><strong>Dosen (Lecturer):</strong> Memiliki hak setara Komti untuk mengunggah materi, mengatur jadwal kuliah, mempublikasikan tugas, mengecek hasil tugas mahasiswa, serta mengubah pengaturan kelas.</li>
            <li><strong>Mahasiswa:</strong> Mengakses jadwal, melihat tugas & mengumpulkan berkas, mengunduh materi, dan berdiskusi di forum kelas.</li>
          </ul>
        </div>
      </div>

      {/* Settings Modal (Komti & Dosen only) */}
      {showSettingsModal && isManager && (
        <ModalPortal onClose={() => !savingSettings && setShowSettingsModal(false)} maxWidth="max-w-lg">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-2xl w-full p-5 sm:p-7 space-y-5 max-h-[88vh] sm:max-h-[85vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
                    <Settings size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Pengaturan Ruang Kelas</h3>
                    <p className="text-xs text-[#64748B]">Khusus Komti & Dosen Pengampu</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  disabled={savingSettings}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">
                    Nama Kelas / Workspace <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settingName}
                    onChange={(e) => setSettingName(e.target.value)}
                    placeholder="Contoh: Kelas 26B"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all bg-white"
                  />
                  <p className="text-[10px] text-[#64748B]">Nama ini akan tampil di dashboard, sidebar, dan header ruang kelas.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Kode / Identitas Kelas</label>
                    <input
                      type="text"
                      value={settingClassIdentifier}
                      onChange={(e) => setSettingClassIdentifier(e.target.value)}
                      placeholder="Contoh: 26B (S1 - M.Log)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Periode / Semester</label>
                    <input
                      type="text"
                      value={settingAcademicPeriod}
                      onChange={(e) => setSettingAcademicPeriod(e.target.value)}
                      placeholder="Contoh: Semester 1 (2026/2027)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">Dosen Pengampu / Pembimbing Utama</label>
                  <input
                    type="text"
                    value={settingLecturer}
                    onChange={(e) => setSettingLecturer(e.target.value)}
                    placeholder="Contoh: Erni Pratiwi Perwitasari, SE, MM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A] flex items-center justify-between">
                    <span>Link Undangan Grup WhatsApp Kelas</span>
                    <span className="text-[10px] font-normal text-emerald-600">Opsional</span>
                  </label>
                  <input
                    type="url"
                    value={settingWaGroupLink}
                    onChange={(e) => setSettingWaGroupLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all bg-white font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-[#64748B]">
                    Jika diisi, tombol langsung gabung ke Grup WhatsApp kelas akan tampil di Dashboard dan Kontak.
                  </p>
                </div>

                {/* Join Code info */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Kode Gabung Kelas</span>
                    <span className="text-sm font-mono font-black text-[#0F172A] tracking-wider">{currentClass?.joinCode || '------'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] shadow-2xs transition-colors"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    disabled={savingSettings}
                    className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] hover:bg-slate-50 text-xs font-bold text-[#475569] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  >
                    {savingSettings && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
