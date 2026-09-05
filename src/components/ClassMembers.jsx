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
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';

export default function ClassMembers({
  currentClass,
  currentUser,
  onUpdateMemberRole,
  onRemoveMember,
  onUpdateClassSettings,
  onNavigateTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'komti' | 'lecturer' | 'student'
  const [copiedCode, setCopiedCode] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Settings Modal State (Komti & Dosen only)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingName, setSettingName] = useState('');
  const [settingClassIdentifier, setSettingClassIdentifier] = useState('');
  const [settingLecturer, setSettingLecturer] = useState('');
  const [settingAcademicPeriod, setSettingAcademicPeriod] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const members = currentClass?.members || [];
  const myRole = currentClass?.userRole || 'student';
  const isManager = ['komti', 'coordinator', 'lecturer', 'dosen'].includes(myRole) || currentClass?.ownerId === currentUser?.uid;

  // Filtered members
  const filteredMembers = members.filter(m => {
    const nameMatch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let role = m.role || 'student';
    if (role === 'coordinator') role = 'komti';

    const roleMatch = roleFilter === 'all' || role === roleFilter;
    return nameMatch && roleMatch;
  });

  // Counts
  const komtiCount = members.filter(m => m.role === 'komti' || m.role === 'coordinator').length;
  const lecturerCount = members.filter(m => m.role === 'lecturer' || m.role === 'dosen').length;
  const studentCount = members.filter(m => !['komti', 'coordinator', 'lecturer', 'dosen'].includes(m.role)).length;

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
          academicPeriod: settingAcademicPeriod.trim()
        });
      }
      setShowSettingsModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
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
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Anggota & Pengurus Kelas</h2>
            {isManager && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Akses Pengelola (Komti/Dosen)
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B]">
            Daftar seluruh mahasiswa, komti, dan dosen pengampu mata kuliah {currentClass?.name}.
          </p>
        </div>

        {/* Actions: Setting Kelas (Komti/Dosen only) + Join Code */}
        <div className="flex items-center gap-2">
          {isManager && (
            <>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('logs')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] text-xs font-semibold shadow-2xs transition-colors"
                  title="Lihat Log Riwayat & Audit Aktivitas Kelas"
                >
                  <History size={14} className="text-indigo-600" />
                  <span>Log Aktivitas</span>
                </button>
              )}
              <button
                onClick={handleOpenSettings}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold shadow-2xs transition-colors"
                title="Pengaturan Ruang Kelas (Khusus Komti/Dosen)"
              >
                <Settings size={14} />
                <span>Pengaturan Kelas</span>
              </button>
            </>
          )}

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-mono font-bold text-[#0F172A] shadow-2xs transition-colors"
            title="Klik untuk salin kode kelas"
          >
            <span className="font-sans text-[11px] text-[#64748B] font-normal">Kode Kelas:</span>
            <span className="tracking-wider">{currentClass?.joinCode || '------'}</span>
            {copiedCode ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[#64748B]" />}
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Total Anggota</span>
          <p className="text-2xl font-bold text-[#0F172A] mt-1">{members.length}</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Komti / Koordinator</span>
          <p className="text-2xl font-bold text-amber-800 mt-1">{komtiCount}</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Dosen Pengampu</span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{lecturerCount}</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Mahasiswa</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{studentCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Cari anggota berdasarkan nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          />
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 ${
              roleFilter === 'all' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Semua ({members.length})
          </button>
          <button
            onClick={() => setRoleFilter('komti')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 ${
              roleFilter === 'komti' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Komti ({komtiCount})
          </button>
          <button
            onClick={() => setRoleFilter('lecturer')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 ${
              roleFilter === 'lecturer' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Dosen ({lecturerCount})
          </button>
          <button
            onClick={() => setRoleFilter('student')}
            className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 ${
              roleFilter === 'student' ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            Mahasiswa ({studentCount})
          </button>
        </div>
      </div>

      {/* Member Cards List */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-2 shadow-2xs">
          <Users size={32} className="mx-auto text-[#94A3B8] opacity-60" />
          <h3 className="font-bold text-sm text-[#0F172A]">Tidak ada anggota yang cocok</h3>
          <p className="text-xs text-[#64748B]">Coba ubah kata kunci pencarian atau filter peran.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
          {filteredMembers.map((member) => {
            const isMe = member.userId === currentUser?.uid;
            const isOwner = member.userId === currentClass?.ownerId;
            const rawRole = member.role === 'coordinator' ? 'komti' : (member.role || 'student');
            const isTargetSelfOrOwner = isMe || isOwner;

            return (
              <div 
                key={member.userId || member.email}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FDFBF7] transition-colors"
              >
                {/* Member Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                    rawRole === 'komti' 
                      ? 'bg-amber-600' 
                      : rawRole === 'lecturer' || rawRole === 'dosen' 
                      ? 'bg-emerald-600' 
                      : 'bg-[#0F172A]'
                  }`}>
                    {member.name ? member.name[0].toUpperCase() : (member.email ? member.email[0].toUpperCase() : 'U')}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
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
                    </div>
                    <p className="text-xs text-[#64748B] truncate flex items-center gap-1">
                      <Mail size={11} className="text-[#94A3B8]" />
                      <span>{member.email}</span>
                    </p>
                  </div>
                </div>

                {/* Role Badge & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {/* Role Selector for Manager, or Static Badge for Student */}
                  {isManager && !isTargetSelfOrOwner ? (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-semibold text-[#64748B] hidden sm:inline-block">Peran:</label>
                      <select
                        disabled={processingId === member.userId}
                        value={rawRole}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:border-[#0F172A] shadow-2xs cursor-pointer disabled:opacity-50"
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
                      className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
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
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-6 sm:p-7 space-y-6">
              
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
                  className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
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
