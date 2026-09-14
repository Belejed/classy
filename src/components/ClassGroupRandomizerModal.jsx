import React, { useState, useMemo } from 'react';
import { 
  Dices, 
  Users, 
  Check, 
  X, 
  Copy, 
  Share2, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  UserCheck, 
  UserX,
  Search,
  CheckCircle2,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from './ModalPortal';

export default function ClassGroupRandomizerModal({
  isOpen,
  onClose,
  members = [],
  className = '',
  onSaveGroupsToForum
}) {
  if (!isOpen) return null;

  // 1. Selection State
  const [selectedEmails, setSelectedEmails] = useState(() => {
    return new Set(
      (members || [])
        .map(m => String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim())
        .filter(Boolean)
    );
  });
  const [searchMember, setSearchMember] = useState('');

  // 2. Randomization Config
  const [splitMode, setSplitMode] = useState('by_group_count'); // 'by_group_count' | 'by_member_count'
  const [groupCount, setGroupCount] = useState(4);
  const [memberPerGroupCount, setMemberPerGroupCount] = useState(4);
  const [groupPrefix, setGroupPrefix] = useState('Kelompok');
  const [assignLeader, setAssignLeader] = useState(false);

  // 3. Results State
  const [generatedGroups, setGeneratedGroups] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filtered members list for checklist
  const filteredMembers = useMemo(() => {
    if (!searchMember.trim()) return members || [];
    const q = searchMember.toLowerCase().trim();
    return (members || []).filter(m => 
      String(m?.name || '').toLowerCase().includes(q) ||
      String(m?.email || '').toLowerCase().includes(q) ||
      String(m?.studentId || m?.nim || '').toLowerCase().includes(q)
    );
  }, [members, searchMember]);

  const activePool = useMemo(() => {
    return (members || []).filter(m => {
      const key = String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim();
      return key && selectedEmails.has(key);
    });
  }, [members, selectedEmails]);

  const toggleMember = (m) => {
    const key = String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim();
    if (!key) return;
    const next = new Set(selectedEmails);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedEmails(next);
  };

  const selectAll = () => {
    setSelectedEmails(new Set(
      (members || [])
        .map(m => String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim())
        .filter(Boolean)
    ));
  };

  const deselectAll = () => {
    setSelectedEmails(new Set());
  };

  // Perform Randomization
  const handleRandomize = () => {
    if (activePool.length === 0) {
      toast.error('Pilih setidaknya 1 mahasiswa untuk diacak!');
      return;
    }

    setIsShuffling(true);

    setTimeout(() => {
      // Fisher-Yates Shuffle
      const shuffled = [...activePool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let numGroups = 1;
      if (splitMode === 'by_group_count') {
        numGroups = Math.max(1, Math.min(Math.floor(groupCount), shuffled.length));
      } else {
        const perGroup = Math.max(1, Math.floor(memberPerGroupCount));
        numGroups = Math.max(1, Math.ceil(shuffled.length / perGroup));
      }

      const groups = Array.from({ length: numGroups }, (_, idx) => ({
        id: `gen_grp_${idx + 1}`,
        name: `${groupPrefix.trim() || 'Kelompok'} ${idx + 1}`,
        members: []
      }));

      // Distribute evenly
      shuffled.forEach((student, index) => {
        const groupIndex = index % numGroups;
        groups[groupIndex].members.push({
          userId: student.userId || student.id || `std_${index}`,
          name: student.name || 'Mahasiswa',
          email: student.email || '',
          nim: student.studentId || student.nim || '',
          role: 'member'
        });
      });

      // Optionally assign first person as leader
      if (assignLeader) {
        groups.forEach(g => {
          if (g.members.length > 0) {
            g.members[0].role = 'leader';
          }
        });
      }

      setGeneratedGroups(groups);
      setIsShuffling(false);
      toast.success(`Berhasil mengacak ${shuffled.length} mahasiswa menjadi ${groups.length} kelompok!`);
    }, 450);
  };

  // Copy WhatsApp Format
  const handleCopyWhatsApp = () => {
    if (!generatedGroups || generatedGroups.length === 0) return;

    let text = `📢 *PEMBAGIAN KELOMPOK - ${className.toUpperCase() || 'KELAS'}*\n`;
    text += `_Diacak secara adil melalui Classy App pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}_\n\n`;

    generatedGroups.forEach(g => {
      text += `*${g.name.toUpperCase()}* (${g.members.length} Anggota)\n`;
      g.members.forEach((m, i) => {
        const isLead = m.role === 'leader' ? ' 👑 (Ketua)' : '';
        const nimStr = m.nim ? ` - ${m.nim}` : '';
        text += `${i + 1}. ${m.name}${nimStr}${isLead}\n`;
      });
      text += `\n`;
    });

    text += `Semangat belajarnya teman-teman! ✨`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Format WhatsApp berhasil disalin ke clipboard!');
    }).catch(() => {
      toast.error('Gagal menyalin ke clipboard.');
    });
  };

  // Save to Forum directly
  const handleSaveToForum = async () => {
    if (!generatedGroups || generatedGroups.length === 0) return;
    if (!onSaveGroupsToForum) {
      toast.error('Fitur simpan ke forum tidak tersedia');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveGroupsToForum(generatedGroups);
      toast.success('Seluruh kelompok berhasil dimasukkan ke Forum!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan kelompok ke forum');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPortal onClose={onClose} maxWidth="max-w-2xl sm:max-w-3xl">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-orange-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
                <Dices size={22} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  Acak Pembagian Kelompok
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Randomizer
                  </span>
                </h3>
                <p className="text-xs text-[#64748B]">Bagi mahasiswa menjadi kelompok kerja secara adil dan otomatis.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            
            {/* Step 1: Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mode Selection */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <label className="text-xs font-bold text-[#334155] flex items-center gap-1.5">
                  <Layers size={14} className="text-amber-600" />
                  Metode Pembagian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMode('by_group_count')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      splitMode === 'by_group_count'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                    }`}
                  >
                    Berdasarkan Jumlah Kelompok
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('by_member_count')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      splitMode === 'by_member_count'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                    }`}
                  >
                    Berdasarkan Jumlah Anggota
                  </button>
                </div>

                {/* Counter Input */}
                <div className="pt-1">
                  {splitMode === 'by_group_count' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-[#64748B]">
                        <span>Bagi menjadi berapa kelompok?</span>
                        <span className="font-bold text-[#0F172A]">{groupCount} Kelompok</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range"
                          min={2}
                          max={Math.max(2, Math.min(20, activePool.length))}
                          value={groupCount}
                          onChange={(e) => setGroupCount(Number(e.target.value))}
                          className="w-full accent-amber-600 h-2 bg-[#E2E8F0] rounded-lg cursor-pointer"
                        />
                        <input 
                          type="number" 
                          min={2} 
                          max={activePool.length || 20} 
                          value={groupCount}
                          onChange={(e) => setGroupCount(Math.max(2, Number(e.target.value)))}
                          className="w-16 px-2.5 py-1 text-center font-bold text-sm bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-[#64748B]">
                        <span>Berapa anggota per kelompok?</span>
                        <span className="font-bold text-[#0F172A]">{memberPerGroupCount} Orang</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range"
                          min={2}
                          max={Math.max(2, Math.min(15, activePool.length))}
                          value={memberPerGroupCount}
                          onChange={(e) => setMemberPerGroupCount(Number(e.target.value))}
                          className="w-full accent-amber-600 h-2 bg-[#E2E8F0] rounded-lg cursor-pointer"
                        />
                        <input 
                          type="number" 
                          min={2} 
                          max={activePool.length || 15} 
                          value={memberPerGroupCount}
                          onChange={(e) => setMemberPerGroupCount(Math.max(2, Number(e.target.value)))}
                          className="w-16 px-2.5 py-1 text-center font-bold text-sm bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra Options */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <label className="text-xs font-bold text-[#334155] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  Kustomisasi Tampilan
                </label>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#64748B]">Awalan Nama Kelompok</label>
                  <input 
                    type="text"
                    value={groupPrefix}
                    onChange={(e) => setGroupPrefix(e.target.value)}
                    placeholder="Contoh: Kelompok, Tim, Team"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={assignLeader}
                    onChange={(e) => setAssignLeader(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-xs text-[#334155] font-medium">
                    Tunjuk 1 mahasiswa secara acak sebagai 👑 Ketua Kelompok
                  </span>
                </label>

                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-900 flex items-center justify-between">
                  <span>Mahasiswa siap diacak:</span>
                  <span className="font-bold text-sm">{activePool.length} Mahasiswa</span>
                </div>
              </div>
            </div>

            {/* Step 2: Member Pool Checklist */}
            <div className="border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-600" />
                  <span className="text-xs font-bold text-[#0F172A]">
                    Pilih Mahasiswa Yang Ikut Diacak ({activePool.length}/{members.length})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold transition-colors"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="px-2 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold transition-colors"
                  >
                    Batal Semua
                  </button>
                </div>
              </div>

              {/* Search filter in checklist */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Cari mahasiswa untuk centang/uncheck..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Members chips */}
              <div className="max-h-36 overflow-y-auto custom-scrollbar p-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {filteredMembers.map((m, idx) => {
                  const key = (m.email || m.userId || m.name).toLowerCase().trim();
                  const isChecked = selectedEmails.has(key);
                  return (
                    <button
                      key={key || idx}
                      type="button"
                      onClick={() => toggleMember(m)}
                      className={`px-2.5 py-1.5 rounded-xl text-left text-xs flex items-center justify-between border transition-all ${
                        isChecked 
                          ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 line-through'
                      }`}
                    >
                      <span className="truncate pr-1">{m.name || m.email}</span>
                      {isChecked ? <Check size={13} className="text-amber-600 shrink-0" /> : <X size={13} className="text-slate-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Randomize Action Button */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleRandomize}
                disabled={isShuffling || activePool.length === 0}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
              >
                <Dices size={18} className={isShuffling ? 'animate-spin' : ''} />
                <span>{isShuffling ? 'Sedang Mengocok...' : '🎲 Acak Kelompok Sekarang'}</span>
              </button>
            </div>

            {/* Step 3: Generated Results */}
            {generatedGroups && generatedGroups.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-[#E2E8F0] animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-[#0F172A]">
                      Hasil Pengacakan ({generatedGroups.length} Kelompok)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>Salin Format WA</span>
                    </button>
                  </div>
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {generatedGroups.map((g, gIdx) => (
                    <div 
                      key={g.id || gIdx}
                      className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-amber-300 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="font-bold text-xs text-[#0F172A]">{g.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {g.members.length} Orang
                        </span>
                      </div>
                      <div className="space-y-1">
                        {g.members.map((m, mIdx) => (
                          <div 
                            key={m.userId || mIdx}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-100/80"
                          >
                            <span className="text-[#334155] font-medium truncate">
                              {mIdx + 1}. {m.name}
                            </span>
                            {m.role === 'leader' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-amber-500 text-white shrink-0 ml-1">
                                👑 Ketua
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#64748B]">
              {generatedGroups ? 'Hasil dapat langsung dimasukkan ke Forum atau disalin.' : 'Pilih opsi lalu klik Acak Kelompok Sekarang.'}
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Tutup
              </button>
              {generatedGroups && (
                <button
                  type="button"
                  onClick={handleSaveToForum}
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0F172A] hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{isSaving ? 'Menyimpan...' : '💾 Masukkan ke Forum'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
    </ModalPortal>
  );
}
