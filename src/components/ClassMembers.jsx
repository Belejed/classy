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
  Phone,
  Layers,
  KeyRound,
  ArrowUpDown,
  MessageCircle,
  FileSpreadsheet,
  ExternalLink,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';
import EmptyState from './EmptyState';
import { isSuperAdminEmail, authService } from '../utils/db';
import { 
  ROLES, 
  normalizeRole, 
  isClassManager, 
  canDeleteAnything,
  getRoleDisplayName 
} from '../utils/permissions';

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
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'pending' | 'komti' | 'vice_komti' | 'division_head' | 'lecturer' | 'student'
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'role_hierarchy' | 'newest'
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmailId, setCopiedEmailId] = useState(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Dedicated Reset Password Modal State
  const [resetTargetMember, setResetTargetMember] = useState(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSuccessInfo, setResetSuccessInfo] = useState(null);
  const [copiedWaMessage, setCopiedWaMessage] = useState(false);

  // Settings Modal State (Komti & Dosen only)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingName, setSettingName] = useState('');
  const [settingClassIdentifier, setSettingClassIdentifier] = useState('');
  const [settingLecturer, setSettingLecturer] = useState('');
  const [settingAcademicPeriod, setSettingAcademicPeriod] = useState('');
  const [settingWaGroupLink, setSettingWaGroupLink] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Superadmin is in ghost mode (never displayed in member list or counted)
  const rawMembers = currentClass?.members || [];
  const members = rawMembers.filter(m => m && m.role !== 'superadmin' && !isSuperAdminEmail(m.email));
  const myRole = currentClass?.userRole || 'student';
  const isOwner = currentClass?.ownerId === currentUser?.uid;
  const isManager = isClassManager(myRole, isOwner);
  const canKickMember = canDeleteAnything(myRole, isOwner);

  // Separate pending join requests from approved members
  const pendingMembers = members.filter(m => m && m.status === 'pending');
  const approvedMembers = members.filter(m => m && (m.status || 'approved') === 'approved');

  // Breakdown Counts
  const komtiOnlyCount = approvedMembers.filter(m => m && ['komti', 'coordinator'].includes(m.role)).length;
  const viceKomtiCount = approvedMembers.filter(m => m && ['vice_komti', 'wakil_komti'].includes(m.role)).length;
  const divHeadCount = approvedMembers.filter(m => m && ['division_head', 'kadiv', 'kepala_divisi'].includes(m.role)).length;
  const lecturerCount = approvedMembers.filter(m => m && (m.role === 'lecturer' || m.role === 'dosen')).length;
  const studentCount = approvedMembers.filter(m => m && !['komti', 'coordinator', 'vice_komti', 'wakil_komti', 'division_head', 'kadiv', 'kepala_divisi', 'lecturer', 'dosen'].includes(m.role)).length;
  const pendingCount = pendingMembers.length;

  // Filter and Sort members list
  const filteredMembers = (roleFilter === 'pending' ? pendingMembers : approvedMembers).filter(m => {
    if (!m) return false;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = (m.name || '').toLowerCase().includes(query) ||
                      (m.email || '').toLowerCase().includes(query) ||
                      (m.phoneNumber || '').includes(query);
    
    if (roleFilter === 'pending') return nameMatch;
    if (roleFilter === 'all') return nameMatch;

    const role = normalizeRole(m.role);
    return nameMatch && (role === roleFilter);
  }).sort((a, b) => {
    if (sortBy === 'name_asc') {
      return (a.name || a.email || '').localeCompare(b.name || b.email || '');
    }
    if (sortBy === 'name_desc') {
      return (b.name || b.email || '').localeCompare(a.name || a.email || '');
    }
    if (sortBy === 'role_hierarchy') {
      const roleWeight = {
        [ROLES.KOMTI]: 5,
        [ROLES.VICE_KOMTI]: 4,
        [ROLES.DIVISION_HEAD]: 3,
        [ROLES.LECTURER]: 2,
        [ROLES.STUDENT]: 1
      };
      const weightA = roleWeight[normalizeRole(a.role)] || 0;
      const weightB = roleWeight[normalizeRole(b.role)] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'newest') {
      return Number(b.joinedAt || 0) - Number(a.joinedAt || 0);
    }
    return 0;
  });

  const handleCopyCode = () => {
    if (!currentClass?.joinCode) return;
    navigator.clipboard.writeText(currentClass.joinCode);
    setCopiedCode(true);
    toast.success('Kode kelas disalin ke clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyEmail = (email, id, e) => {
    if (e) e.stopPropagation();
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    toast.success(`Email ${email} disalin!`);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const handleCopyPhone = (phone, id, e) => {
    if (e) e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    toast.success(`No. WA ${phone} disalin!`);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleCopyMemberList = () => {
    if (!approvedMembers.length) {
      toast.error('Belum ada data anggota kelas.');
      return;
    }
    const lines = [
      `DAFTAR ANGGOTA KELAS: ${currentClass?.name || 'Classy'}`,
      `Total: ${approvedMembers.length} Orang`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`,
      '==================================================',
      ...approvedMembers.map((m, idx) => {
        const roleLabel = getRoleDisplayName(m.role);
        const wa = m.phoneNumber ? ` | WA: ${m.phoneNumber}` : '';
        return `${idx + 1}. ${m.name || 'Tanpa Nama'} (${m.email})${wa} [${roleLabel}]`;
      })
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success(`Daftar ${approvedMembers.length} anggota berhasil disalin! Siap dipaste ke WA/Excel.`);
  };

  const handleOpenResetModal = (member) => {
    setResetTargetMember(member);
    setResetSuccessInfo(null);
    setCopiedWaMessage(false);
  };

  const handleCloseResetModal = () => {
    if (sendingReset) return;
    setResetTargetMember(null);
    setResetSuccessInfo(null);
    setCopiedWaMessage(false);
  };

  const getWaResetNoticeText = (target) => {
    if (!target) return '';
    const studentName = target.name || target.email.split('@')[0];
    const email = target.email;
    const className = currentClass?.name || 'Kelas';
    const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://classy.web.app';

    return `Halo *${studentName}*!\n\nPengurus kelas *${className}* telah mengirimkan *tautan perubahan kata sandi (reset password)* ke alamat email kamu:\n📧 *${email}*\n\nSilakan buka kotak masuk email kamu (atau periksa folder Spam jika belum masuk), lalu buka tautan untuk membuat kata sandi baru.\n\nSetelah berhasil mengganti sandi, kamu bisa langsung login ke portal kelas di:\n🔗 ${portalUrl}\n\nTerima kasih! 🙏`;
  };

  const handleSendResetPassword = async () => {
    if (!resetTargetMember?.email) {
      toast.error('Anggota ini tidak memiliki alamat email yang valid.');
      return;
    }
    setSendingReset(true);
    const toastId = toast.loading(`Mengirim link perubahan password ke ${resetTargetMember.email}...`);
    try {
      await authService.resetPassword(resetTargetMember.email);
      setResetSuccessInfo({
        name: resetTargetMember.name || resetTargetMember.email.split('@')[0],
        email: resetTargetMember.email,
        phone: resetTargetMember.phoneNumber || ''
      });
      toast.success(`Tautan reset password berhasil dikirim ke ${resetTargetMember.email}!`, { id: toastId, duration: 5000 });
    } catch (err) {
      toast.error(err.message || 'Gagal mengirim email reset password', { id: toastId });
    } finally {
      setSendingReset(false);
    }
  };

  const handleCopyWaNotice = () => {
    if (!resetSuccessInfo) return;
    const text = getWaResetNoticeText(resetSuccessInfo);
    navigator.clipboard.writeText(text);
    setCopiedWaMessage(true);
    toast.success('Template pesan WhatsApp berhasil disalin!');
    setTimeout(() => setCopiedWaMessage(false), 2500);
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
      toast.success(`Peran anggota berhasil diubah ke ${getRoleDisplayName(newRole)}!`);
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui peran');
    } finally {
      setProcessingId(null);
    }
  };

  const handleKickMember = async (member) => {
    if (!canKickMember) {
      toast.error('Wakil Komti dan Kepala Divisi tidak memiliki izin mengeluarkan anggota.');
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
    if (!window.confirm(`Yakin ingin keluar dari kelas "${currentClass?.name || 'Classy'}"? Anda harus mendaftar ulang jika ingin masuk kembali.`)) {
      return;
    }
    setProcessingId(currentUser?.uid);
    try {
      await onRemoveMember(currentClass.id, currentUser.uid);
      toast.success('Anda telah keluar dari kelas.');
    } catch (err) {
      toast.error(err.message || 'Gagal keluar dari kelas');
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleBadge = (rawRole) => {
    const role = normalizeRole(rawRole);
    if (role === ROLES.KOMTI) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Crown size={12} className="text-amber-600" />
          <span>Komti</span>
        </span>
      );
    }
    if (role === ROLES.VICE_KOMTI) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Shield size={12} className="text-indigo-600" />
          <span>Wakil Komti</span>
        </span>
      );
    }
    if (role === ROLES.DIVISION_HEAD) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200">
          <Layers size={12} className="text-violet-600" />
          <span>Kepala Divisi</span>
        </span>
      );
    }
    if (role === ROLES.LECTURER) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <GraduationCap size={12} className="text-emerald-600" />
          <span>Dosen</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <User size={12} className="text-slate-500" />
        <span>Mahasiswa</span>
      </span>
    );
  };

  const getRoleAvatarStyle = (rawRole) => {
    const role = normalizeRole(rawRole);
    if (role === ROLES.KOMTI) return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-2 ring-amber-300';
    if (role === ROLES.VICE_KOMTI) return 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white ring-2 ring-indigo-300';
    if (role === ROLES.DIVISION_HEAD) return 'bg-gradient-to-br from-violet-500 to-violet-600 text-white ring-2 ring-violet-300';
    if (role === ROLES.LECTURER) return 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ring-2 ring-emerald-300';
    return 'bg-gradient-to-br from-slate-700 to-slate-900 text-white ring-1 ring-slate-200';
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* 1. Header & Quick Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0F172A]">Anggota & Pengurus Kelas</h2>
            {isManager && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                Mode Pengelola
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Kelola peran anggota, verifikasi pendaftar, dan pantau kontak seluruh civitas kelas {currentClass?.name}.
          </p>
        </div>

        {/* Action Buttons: Log, Pengaturan, Salin Daftar, Kode */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Export / Copy Member List Button */}
          <button
            onClick={handleCopyMemberList}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-indigo-400 hover:bg-indigo-50/50 text-[#0F172A] text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap min-h-[38px]"
            title="Salin seluruh data nama, email, dan WhatsApp anggota kelas untuk Excel / laporan"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span className="hidden md:inline">Salin Format Excel / WA</span>
            <span className="md:hidden">Salin Data</span>
          </button>

          {isManager && onNavigateTab && (
            <button
              onClick={() => onNavigateTab('logs')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap min-h-[38px] cursor-pointer"
              title="Lihat Log Riwayat & Audit Aktivitas Kelas"
            >
              <History size={14} className="text-indigo-600" />
              <span className="hidden lg:inline">Log Aktivitas</span>
            </button>
          )}

          {isManager && (
            <button
              onClick={handleOpenSettings}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold shadow-2xs transition-colors whitespace-nowrap min-h-[38px] cursor-pointer"
              title="Pengaturan Ruang Kelas (Nama, Periode, Dosen, Link WA)"
            >
              <Settings size={14} />
              <span>Pengaturan</span>
            </button>
          )}

          {/* Join Code Pill */}
          <button
            onClick={handleCopyCode}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-mono font-bold text-[#0F172A] shadow-2xs transition-colors min-h-[38px] cursor-pointer"
            title="Klik untuk salin kode undangan kelas"
          >
            <span className="font-sans text-[11px] text-[#64748B] font-normal">Kode:</span>
            <span className="tracking-wider">{currentClass?.joinCode || '------'}</span>
            {copiedCode ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[#64748B]" />}
          </button>
        </div>
      </div>

      {/* 2. Interactive Overview Stat Cards (Clickable Quick Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        
        {/* Total Anggota */}
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            roleFilter === 'all' 
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20' 
              : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${roleFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Anggota
            </span>
            <Users size={14} className={roleFilter === 'all' ? 'text-slate-300' : 'text-slate-400'} />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 tracking-tight">{approvedMembers.length}</p>
        </button>

        {/* Komti (Ketua) */}
        <button
          type="button"
          onClick={() => setRoleFilter('komti')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            roleFilter === 'komti' 
              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/30' 
              : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200/80 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${roleFilter === 'komti' ? 'text-amber-100' : 'text-amber-700'}`}>
              Komti (Ketua)
            </span>
            <Crown size={14} className={roleFilter === 'komti' ? 'text-amber-200' : 'text-amber-600'} />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 tracking-tight">{komtiOnlyCount}</p>
        </button>

        {/* Wakil Komti */}
        <button
          type="button"
          onClick={() => setRoleFilter('vice_komti')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            roleFilter === 'vice_komti' 
              ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/30' 
              : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200/80 text-indigo-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${roleFilter === 'vice_komti' ? 'text-indigo-100' : 'text-indigo-700'}`}>
              Wakil Komti
            </span>
            <Shield size={14} className={roleFilter === 'vice_komti' ? 'text-indigo-200' : 'text-indigo-600'} />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 tracking-tight">{viceKomtiCount}</p>
        </button>

        {/* Kepala Divisi */}
        <button
          type="button"
          onClick={() => setRoleFilter('division_head')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            roleFilter === 'division_head' 
              ? 'bg-violet-600 text-white border-violet-600 ring-2 ring-violet-500/30' 
              : 'bg-violet-50/50 hover:bg-violet-50 border-violet-200/80 text-violet-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${roleFilter === 'division_head' ? 'text-violet-100' : 'text-violet-700'}`}>
              Kepala Divisi
            </span>
            <Layers size={14} className={roleFilter === 'division_head' ? 'text-violet-200' : 'text-violet-600'} />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 tracking-tight">{divHeadCount}</p>
        </button>

        {/* Dosen Pengajar */}
        <button
          type="button"
          onClick={() => setRoleFilter('lecturer')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            roleFilter === 'lecturer' 
              ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30' 
              : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/80 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${roleFilter === 'lecturer' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Dosen
            </span>
            <GraduationCap size={14} className={roleFilter === 'lecturer' ? 'text-emerald-200' : 'text-emerald-600'} />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 tracking-tight">{lecturerCount}</p>
        </button>

        {/* Mahasiswa */}
        <button
          type="button"
          onClick={() => setRoleFilter('student')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            roleFilter === 'student' 
              ? 'bg-slate-700 text-white border-slate-700 ring-2 ring-slate-600/30' 
              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${roleFilter === 'student' ? 'text-slate-300' : 'text-slate-600'}`}>
              Mahasiswa
            </span>
            <User size={14} className={roleFilter === 'student' ? 'text-slate-300' : 'text-slate-500'} />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 tracking-tight">{studentCount}</p>
        </button>

      </div>

      {/* 3. Search Bar, Filters & Sort Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
        
        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Cari nama, email, atau nomor WhatsApp mahasiswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/5 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-slate-700">
              <ArrowUpDown size={13} className="text-slate-500 shrink-0" />
              <span className="hidden sm:inline text-[11px] text-slate-500">Urut:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="role_hierarchy">Peran Tertinggi</option>
                <option value="newest">Terbaru Bergabung</option>
              </select>
            </div>

            {/* WA Group Shortcut Button */}
            {currentClass?.waGroupLink && (
              <a
                href={currentClass.waGroupLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs"
                title="Buka Grup WhatsApp Kelas"
              >
                <MessageCircle size={14} className="text-emerald-600" />
                <span className="hidden md:inline">Grup WA</span>
              </a>
            )}
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'all' 
                  ? 'bg-slate-900 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              <span>Semua</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                roleFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {approvedMembers.length}
              </span>
            </button>

            {/* Pending Requests Tab */}
            {isManager && (
              <button
                onClick={() => setRoleFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  roleFilter === 'pending' 
                    ? 'bg-rose-600 text-white shadow-2xs' 
                    : pendingCount > 0 
                    ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 animate-pulse' 
                    : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80 bg-white'
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
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'komti' 
                  ? 'bg-amber-600 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              <span>👑 Komti</span>
              <span className="text-[10px] font-bold opacity-75">({komtiOnlyCount})</span>
            </button>

            <button
              onClick={() => setRoleFilter('vice_komti')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'vice_komti' 
                  ? 'bg-indigo-600 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              <span>🛡️ Wakil Komti</span>
              <span className="text-[10px] font-bold opacity-75">({viceKomtiCount})</span>
            </button>

            <button
              onClick={() => setRoleFilter('division_head')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'division_head' 
                  ? 'bg-violet-600 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              <span>🗂️ Kepala Divisi</span>
              <span className="text-[10px] font-bold opacity-75">({divHeadCount})</span>
            </button>

            <button
              onClick={() => setRoleFilter('lecturer')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'lecturer' 
                  ? 'bg-emerald-600 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              <span>🎓 Dosen</span>
              <span className="text-[10px] font-bold opacity-75">({lecturerCount})</span>
            </button>

            <button
              onClick={() => setRoleFilter('student')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'student' 
                  ? 'bg-slate-700 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              <span>👤 Mahasiswa</span>
              <span className="text-[10px] font-bold opacity-75">({studentCount})</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 shrink-0">
            Menampilkan <span className="font-bold text-slate-800">{filteredMembers.length}</span> dari {roleFilter === 'pending' ? pendingMembers.length : approvedMembers.length} anggota
          </div>
        </div>

      </div>

      {/* 4. Members List Table/Cards */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          variant="tasks"
          title="Tidak ada anggota yang cocok"
          description="Coba gunakan kata kunci pencarian yang lain atau ganti filter peran di atas."
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
          {filteredMembers.map((member, index) => {
            const isMe = member.userId === currentUser?.uid;
            const isOwner = member.userId === currentClass?.ownerId;
            const rawRole = member.role === 'coordinator' ? 'komti' : (member.role || 'student');
            const isTargetSelfOrOwner = isMe || isOwner;
            const isPendingMember = member.status === 'pending';
            const memberInitial = member.name ? member.name[0].toUpperCase() : (member.email ? member.email[0].toUpperCase() : 'U');

            return (
              <div 
                key={member.userId || member.email}
                className={`p-3.5 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  isMe ? 'bg-amber-50/20' : 'hover:bg-slate-50/70'
                }`}
              >
                {/* Left Side: Avatar + Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  
                  {/* Numbering Badge (Desktop) */}
                  <span className="hidden sm:inline-block w-5 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                    {index + 1}
                  </span>

                  {/* Avatar Circle with Role Ring */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 transition-transform ${getRoleAvatarStyle(rawRole)}`}>
                    {memberInitial}
                  </div>

                  {/* Identity and Contacts */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-[#0F172A] truncate">
                        {member.name || member.email?.split('@')[0]}
                      </h4>
                      {isMe && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white shadow-2xs">
                          Anda
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          👑 Pembuat Kelas
                        </span>
                      )}
                      {isPendingMember && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                          ⏳ Menunggu Persetujuan
                        </span>
                      )}
                    </div>

                    {/* Email and Phone with 1-Click Copy Shortcuts */}
                    <div className="flex items-center gap-2.5 sm:gap-4 text-xs text-[#64748B] flex-wrap mt-1">
                      
                      {/* Email pill with copy */}
                      {member.email && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyEmail(member.email, member.userId, e)}
                          title="Klik untuk salin email"
                          className="flex items-center gap-1 hover:text-slate-900 transition-colors group cursor-pointer"
                        >
                          <Mail size={12} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-[260px] font-medium">{member.email}</span>
                          {copiedEmailId === member.userId ? (
                            <Check size={11} className="text-emerald-600 shrink-0" />
                          ) : (
                            <Copy size={11} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>
                      )}

                      {/* WhatsApp pill with copy */}
                      {member.phoneNumber ? (
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(member.phoneNumber, member.userId, e)}
                          title="Klik untuk salin nomor WhatsApp"
                          className="flex items-center gap-1 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60 hover:bg-emerald-100 transition-colors group cursor-pointer"
                        >
                          <Phone size={10} className="text-emerald-600 shrink-0" />
                          <span>{member.phoneNumber}</span>
                          {copiedPhoneId === member.userId ? (
                            <Check size={10} className="text-emerald-600 shrink-0" />
                          ) : (
                            <Copy size={10} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No. WA belum diisi</span>
                      )}

                    </div>
                  </div>
                </div>

                {/* Right Side: Role Selector & Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  
                  {isPendingMember ? (
                    // Approvals
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button
                        disabled={processingId === member.userId}
                        onClick={() => handleDeny(member)}
                        className="flex-1 md:flex-initial px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 text-center"
                      >
                        Tolak
                      </button>
                      <button
                        disabled={processingId === member.userId}
                        onClick={() => handleApprove(member)}
                        className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-center"
                      >
                        <Check size={14} />
                        <span>Setujui Masuk</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Role Selector (Managers) or Static Badge (Students) */}
                      {isManager && !isTargetSelfOrOwner ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            disabled={processingId === member.userId}
                            value={rawRole}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all shadow-2xs cursor-pointer disabled:opacity-50 ${
                              rawRole === 'komti'
                                ? 'border-amber-300 bg-amber-50/60 text-amber-900'
                                : rawRole === 'vice_komti'
                                ? 'border-indigo-300 bg-indigo-50/60 text-indigo-900'
                                : rawRole === 'division_head'
                                ? 'border-violet-300 bg-violet-50/60 text-violet-900'
                                : rawRole === 'lecturer'
                                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900'
                                : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
                            }`}
                          >
                            <option value="student">👤 Mahasiswa</option>
                            <option value="komti">👑 Komti (Ketua)</option>
                            <option value="vice_komti">🛡️ Wakil Komti</option>
                            <option value="division_head">🗂️ Kepala Divisi</option>
                            <option value="lecturer">🎓 Dosen Pengajar</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          {getRoleBadge(rawRole)}
                        </div>
                      )}

                      {/* Action Buttons Toolbar */}
                      <div className="flex items-center gap-1">
                        
                        {/* Direct WhatsApp Chat */}
                        {member.phoneNumber && (
                          <a
                            href={`https://wa.me/${(member.phoneNumber || '').replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${member.name || ''}, saya ${currentUser?.displayName || 'Komti'} dari kelas ${currentClass?.name || ''}...`)}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`Kirim Pesan WhatsApp ke ${member.phoneNumber}`}
                            className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Phone size={13} className="text-emerald-600" />
                          </a>
                        )}

                        {/* Direct Email */}
                        {member.email && (
                          <a
                            href={`mailto:${member.email}?subject=${encodeURIComponent(`[Kelas ${currentClass?.name || ''}] Informasi Perkuliahan`)}`}
                            title={`Kirim Email ke ${member.email}`}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Mail size={13} className="text-slate-600" />
                          </a>
                        )}

                        {/* Send Password Reset Link (Komti & Wakil Komti only) */}
                        {isManager && member.email && !isTargetSelfOrOwner && (
                          <button
                            type="button"
                            disabled={processingId === member.userId}
                            onClick={() => handleOpenResetModal(member)}
                            title={`Kirim link perubahan password ke ${member.name || member.email}`}
                            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50"
                          >
                            <KeyRound size={13} className="text-amber-600" />
                          </button>
                        )}

                        {/* Kick Member (Komti & Owner only) */}
                        {canKickMember && !isTargetSelfOrOwner && (
                          <button
                            type="button"
                            disabled={processingId === member.userId}
                            onClick={() => handleKickMember(member)}
                            title="Keluarkan dari kelas"
                            className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 size={13} className="text-rose-600" />
                          </button>
                        )}

                      </div>
                    </>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. Leave Class Option for Non-Owners */}
      {currentUser?.uid !== currentClass?.ownerId && (
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <p className="text-xs font-bold text-[#0F172A]">Ingin berpindah ruang kelas?</p>
            <p className="text-[11px] text-[#64748B]">
              Setiap akun mahasiswa/dosen terdaftar di ruang kelas ini. Jika Anda ingin berpindah rombel atau kelas lain, silakan keluar terlebih dahulu.
            </p>
          </div>
          <button
            onClick={handleLeaveClass}
            disabled={processingId === currentUser?.uid}
            className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Keluar dari Kelas</span>
          </button>
        </div>
      )}

      {/* 6. Comprehensive Role Permissions Guide */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-[#475569] space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-slate-600 shrink-0" />
          <p className="font-extrabold text-[#0F172A]">Panduan Pembagian Wewenang & Hak Akses:</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] text-slate-600">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
            <span className="font-bold text-amber-800">👑 Komti (Ketua):</span>
            <p className="mt-0.5 text-slate-500">Akses penuh 100% mengelola tugas, berkas, jadwal, pengumuman, PIN rapikan tugas, kick anggota, dan ubah pengaturan kelas.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
            <span className="font-bold text-indigo-800">🛡️ Wakil Komti:</span>
            <p className="mt-0.5 text-slate-500">Akses manajer membuat dan mengedit jadwal, tugas, berkas, pengumuman, dan host panggung suara, namun <strong>tidak dapat menghapus data apapun</strong> atau kick anggota.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
            <span className="font-bold text-violet-800">🗂️ Kepala Divisi:</span>
            <p className="mt-0.5 text-slate-500">Fokus pada pengelolaan <strong>input tugas dan berkas</strong> materi perkuliahan kelas (tanpa izin menghapus).</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
            <span className="font-bold text-emerald-800">🎓 Dosen Pengajar:</span>
            <p className="mt-0.5 text-slate-500">Memiliki wewenang akademik penuh untuk menerbitkan materi, mengatur jadwal kuliah, dan mengecek hasil tugas mahasiswa.</p>
          </div>
        </div>
      </div>

      {/* 7. Settings Modal (Komti & Dosen only) */}
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
                    <p className="text-xs text-[#64748B]">Khusus Komti & Dosen Pengajar</p>
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0F172A]">Periode / Semester</label>
                    <input
                      type="text"
                      value={settingAcademicPeriod}
                      onChange={(e) => setSettingAcademicPeriod(e.target.value)}
                      placeholder="Contoh: Semester 1 (2026/2027)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">Dosen Pengajar / Pembimbing Utama</label>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] shadow-2xs transition-colors cursor-pointer"
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
                    className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] hover:bg-slate-50 text-xs font-bold text-[#475569] transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingSettings && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
          </div>
        </ModalPortal>
      )}

      {/* 8. Dedicated Reset Password Modal (Komti & Wakil Komti only) */}
      {resetTargetMember && (
        <ModalPortal onClose={handleCloseResetModal} maxWidth="max-w-md">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-2xl w-full p-5 sm:p-6 space-y-4 text-left">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <KeyRound size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">Kirim Perubahan Password</h3>
                  <p className="text-xs text-[#64748B]">Bantuan lupa sandi akun mahasiswa</p>
                </div>
              </div>
              <button 
                onClick={handleCloseResetModal}
                disabled={sendingReset}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Member Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0">
                {resetTargetMember.name ? resetTargetMember.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  {resetTargetMember.name || resetTargetMember.email?.split('@')[0]}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  📧 {resetTargetMember.email}
                </p>
                {resetTargetMember.phoneNumber && (
                  <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
                    📱 {resetTargetMember.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            {/* State A: NOT yet sent */}
            {!resetSuccessInfo ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>💡 Cara Kerja:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-900/90">
                    Sistem akan mengirimkan email resmi dari <strong>Classy</strong> berisi tautan aman untuk membuat kata sandi baru ke alamat email <strong>{resetTargetMember.email}</strong>.
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-900/80">
                    Mahasiswa cukup membuka email tersebut dan mengklik tautan untuk mengetikkan password baru mereka.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    disabled={sendingReset}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSendResetPassword}
                    disabled={sendingReset}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {sendingReset ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Mengirim Tautan...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={14} />
                        <span>Kirim Tautan Reset</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* State B: ALREADY sent successfully */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check size={14} />
                    </div>
                    <h5 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                      Tautan Berhasil Dikirim!
                    </h5>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed pl-8">
                    Email instruksi reset kata sandi telah dikirim ke <strong>{resetSuccessInfo.email}</strong>. Ingatkan mahasiswa untuk mengecek folder <strong>Kotak Masuk (Inbox)</strong> atau <strong>Spam</strong>.
                  </p>
                </div>

                {/* Follow up: Notify via WhatsApp */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Pemberitahuan Instan ke Mahasiswa:
                  </span>
                  
                  {resetSuccessInfo.phone ? (
                    <a
                      href={`https://wa.me/${resetSuccessInfo.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(getWaResetNoticeText(resetSuccessInfo))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <MessageCircle size={15} />
                      <span>Kirim Pesan Konfirmasi ke WhatsApp</span>
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCopyWaNotice}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                  >
                    {copiedWaMessage ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedWaMessage ? 'Pesan WA Disalin!' : 'Salin Teks Pemberitahuan WA'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}

          </div>
        </ModalPortal>
      )}

    </div>
  );
}
