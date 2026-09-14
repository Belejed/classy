import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Dices, 
  BookOpen, 
  Sparkles, 
  Users, 
  Copy, 
  RotateCcw, 
  Check, 
  X, 
  Search, 
  CheckCircle2, 
  Radio, 
  Layers, 
  Crown, 
  HelpCircle,
  Wrench,
  Shuffle,
  Volume2,
  Calendar,
  Share2,
  ListOrdered
} from 'lucide-react';
import toast from 'react-hot-toast';
import ClassVoiceRoom from './ClassVoiceRoom';
import { dbService } from '../utils/db';
import soundFX from '../utils/soundEffects';

export default function ClassForum({
  currentClass,
  currentUser,
  schedules = []
}) {
  const classId = currentClass?.id;
  const members = useMemo(() => currentClass?.members || [], [currentClass?.members]);

  // Active Tool Tab: 'random_group' | 'random_topic' | 'lucky_picker' | 'online_roster'
  const [activeTool, setActiveTool] = useState('random_group');

  // Realtime Presence State
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [presenceLoading, setPresenceLoading] = useState(true);

  // Subscribe to presence
  useEffect(() => {
    if (!classId) return;
    const unsub = dbService.presence.subscribe(classId, (users) => {
      setOnlineUsers(users || []);
      setPresenceLoading(false);
    });
    return () => unsub();
  }, [classId]);

  // =========================================================================
  // TOOL 1: RANDOM GROUP GENERATOR
  // =========================================================================
  const [grpSelectedEmails, setGrpSelectedEmails] = useState(() => {
    return new Set(
      (members || [])
        .map(m => String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim())
        .filter(Boolean)
    );
  });
  const [grpSearchMember, setGrpSearchMember] = useState('');
  const [grpSplitMode, setGrpSplitMode] = useState('by_group_count'); // 'by_group_count' | 'by_member_count'
  const [grpGroupCount, setGrpGroupCount] = useState(5);
  const [grpMemberPerGroup, setGrpMemberPerGroup] = useState(4);
  const [grpPrefix, setGrpPrefix] = useState('Kelompok');
  const [grpAssignLeader, setGrpAssignLeader] = useState(false);
  const [grpGenerated, setGrpGenerated] = useState(null);
  const [grpIsShuffling, setGrpIsShuffling] = useState(false);

  // Filtered members for group randomizer checklist
  const grpFilteredMembers = useMemo(() => {
    if (!grpSearchMember.trim()) return members;
    const q = grpSearchMember.toLowerCase().trim();
    return members.filter(m => 
      String(m?.name || '').toLowerCase().includes(q) ||
      String(m?.email || '').toLowerCase().includes(q) ||
      String(m?.studentId || m?.nim || '').toLowerCase().includes(q)
    );
  }, [members, grpSearchMember]);

  const grpActivePool = useMemo(() => {
    return members.filter(m => {
      const key = String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim();
      return key && grpSelectedEmails.has(key);
    });
  }, [members, grpSelectedEmails]);

  const toggleGrpMember = (m) => {
    const key = String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim();
    if (!key) return;
    const next = new Set(grpSelectedEmails);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setGrpSelectedEmails(next);
  };

  const selectAllGrpMembers = () => {
    setGrpSelectedEmails(new Set(
      (members || [])
        .map(m => String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim())
        .filter(Boolean)
    ));
  };

  const deselectAllGrpMembers = () => {
    setGrpSelectedEmails(new Set());
  };

  const handleRandomizeGroups = () => {
    if (grpActivePool.length === 0) {
      toast.error('Pilih setidaknya 1 mahasiswa untuk diacak!');
      return;
    }

    soundFX.playDiceRoll();
    setGrpIsShuffling(true);
    setTimeout(() => {
      // Fisher-Yates
      const shuffled = [...grpActivePool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let numGroups = 1;
      if (grpSplitMode === 'by_group_count') {
        numGroups = Math.max(1, Math.min(Math.floor(grpGroupCount), shuffled.length));
      } else {
        const perGrp = Math.max(1, Math.floor(grpMemberPerGroup));
        numGroups = Math.max(1, Math.ceil(shuffled.length / perGrp));
      }

      const groups = Array.from({ length: numGroups }, (_, idx) => ({
        id: `gen_grp_${idx + 1}`,
        name: `${grpPrefix.trim() || 'Kelompok'} ${idx + 1}`,
        members: []
      }));

      shuffled.forEach((student, index) => {
        const groupIndex = index % numGroups;
        groups[groupIndex].members.push({
          name: student.name || 'Mahasiswa',
          email: student.email || '',
          nim: student.studentId || student.nim || '',
          role: 'member'
        });
      });

      if (grpAssignLeader) {
        groups.forEach(g => {
          if (g.members.length > 0) g.members[0].role = 'leader';
        });
      }

      setGrpGenerated(groups);
      setGrpIsShuffling(false);
      toast.success(`Berhasil mengacak ${shuffled.length} mahasiswa menjadi ${groups.length} kelompok!`);
    }, 400);
  };

  const handleCopyGroupsWA = () => {
    if (!grpGenerated || grpGenerated.length === 0) return;
    let text = `📢 *PEMBAGIAN KELOMPOK - ${currentClass?.name?.toUpperCase() || 'KELAS'}*\n`;
    text += `_Diacak secara adil melalui Classy pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}_\n\n`;

    grpGenerated.forEach(g => {
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
      toast.success('Format WhatsApp berhasil disalin!');
    }).catch(() => {
      toast.error('Gagal menyalin format.');
    });
  };

  // =========================================================================
  // TOOL 2: RANDOM TOPIC / MATERIAL DISTRIBUTOR
  // =========================================================================
  const [topicTargetType, setTopicTargetType] = useState('group'); // 'group' | 'student'
  const [topicInputRaw, setTopicInputRaw] = useState(
    "Bab 1: Pengantar & Konsep Dasar\nBab 2: Analisis Model Bisnis\nBab 3: Manajemen Rantai Pasok\nBab 4: Strategi Distribusi & Transportasi\nBab 5: Studi Kasus Lapangan"
  );
  const [topicGroupCount, setTopicGroupCount] = useState(5);
  const [topicGenerated, setTopicGenerated] = useState(null);
  const [topicIsShuffling, setTopicIsShuffling] = useState(false);

  const handleLoadTopicsFromSchedules = () => {
    if (!schedules || schedules.length === 0) {
      toast('Belum ada jadwal mata kuliah tersimpan.', { icon: 'ℹ️' });
      return;
    }
    const subjects = [...new Set(schedules.map(s => s.subject).filter(Boolean))];
    if (subjects.length > 0) {
      setTopicInputRaw(subjects.join('\n'));
      toast.success(`Berhasil memuat ${subjects.length} mata kuliah sebagai topik!`);
    }
  };

  const handleRandomizeTopics = () => {
    const lines = topicInputRaw
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error('Ketik setidaknya 1 materi atau topik presentasi!');
      return;
    }

    soundFX.playDiceRoll();
    setTopicIsShuffling(true);

    setTimeout(() => {
      // Shuffle topics
      const shuffledTopics = [...lines];
      for (let i = shuffledTopics.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTopics[i], shuffledTopics[j]] = [shuffledTopics[j], shuffledTopics[i]];
      }

      let recipients = [];
      if (topicTargetType === 'group') {
        const num = Math.max(1, Math.min(Math.floor(topicGroupCount), 30));
        recipients = Array.from({ length: num }, (_, idx) => `Kelompok ${idx + 1}`);
      } else {
        // Distribute to all students
        recipients = members.map(m => m.name || m.email || 'Mahasiswa');
      }

      // Pair each recipient with a topic
      const pairs = recipients.map((target, idx) => {
        const assignedTopic = shuffledTopics[idx % shuffledTopics.length];
        return {
          target,
          topic: assignedTopic
        };
      });

      setTopicGenerated(pairs);
      setTopicIsShuffling(false);
      toast.success(`Berhasil mengacak materi untuk ${pairs.length} ${topicTargetType === 'group' ? 'kelompok' : 'mahasiswa'}!`);
    }, 400);
  };

  const handleCopyTopicsWA = () => {
    if (!topicGenerated || topicGenerated.length === 0) return;
    let text = `📚 *PEMBAGIAN MATERI / TOPIK PRESENTASI - ${currentClass?.name?.toUpperCase() || 'KELAS'}*\n`;
    text += `_Diundi secara acak pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}_\n\n`;

    topicGenerated.forEach((pair, idx) => {
      text += `${idx + 1}. *${pair.target}* ➔ ${pair.topic}\n`;
    });

    text += `\nSilakan dipersiapkan materi presentasinya ya! 💪`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Pembagian materi berhasil disalin ke format WhatsApp!');
    }).catch(() => {
      toast.error('Gagal menyalin.');
    });
  };

  // =========================================================================
  // TOOL 3: LUCKY STUDENT PICKER (TUNJUK GILIRAN MAHASISWA)
  // =========================================================================
  const [pickerSelectedStudent, setPickerSelectedStudent] = useState(null);
  const [pickerIsSpinning, setPickerIsSpinning] = useState(false);
  const [pickerRollingName, setPickerRollingName] = useState('');
  const [pickerExcludedIds, setPickerExcludedIds] = useState(new Set());

  const eligibleStudents = useMemo(() => {
    return (members || []).filter(m => {
      const key = String(m.userId || m.email || m.name);
      return !pickerExcludedIds.has(key);
    });
  }, [members, pickerExcludedIds]);

  const handleSpinStudent = () => {
    if (eligibleStudents.length === 0) {
      toast.error('Semua mahasiswa sudah terpilih! Klik Reset untuk mengulang.');
      return;
    }

    setPickerIsSpinning(true);
    setPickerSelectedStudent(null);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * eligibleStudents.length);
      setPickerRollingName(eligibleStudents[randomIndex]?.name || 'Mahasiswa');
      counter++;

      // Play tick sound with gradual pitch rise for excitement
      soundFX.playPickerTick(0.85 + (counter / 22) * 0.45);

      if (counter > 20) {
        clearInterval(interval);
        const finalWinner = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
        setPickerSelectedStudent(finalWinner);
        setPickerRollingName('');
        setPickerIsSpinning(false);

        // Play glorious winner fanfare
        soundFX.playWinnerFanfare();

        // Add to excluded list so they don't get chosen twice
        const key = String(finalWinner.userId || finalWinner.email || finalWinner.name);
        setPickerExcludedIds(prev => new Set([...prev, key]));

        toast.success(`🎉 Terpilih: ${finalWinner.name}!`, { duration: 4000 });
      }
    }, 70);
  };

  const handleResetPicker = () => {
    setPickerExcludedIds(new Set());
    setPickerSelectedStudent(null);
    setPickerRollingName('');
    toast.success('Daftar giliran mahasiswa di-reset!');
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
            <Dices size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">Tools Kelas & Generator</h2>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineUsers.length} Online
              </span>
            </div>
            <p className="text-xs text-[#64748B]">Kumpulan alat bantu Komti & mahasiswa: acak kelompok, acak materi, kocok giliran, dan obrolan suara kelas.</p>
          </div>
        </div>
      </div>

      {/* 2. OBROLAN SUARA KELAS (WEBRTC AUDIO) */}
      <ClassVoiceRoom 
        classId={classId} 
        currentUser={currentUser} 
        currentClass={currentClass}
        roomId={`stage_${classId}`} 
        roomName={`🎙️ Obrolan Suara - ${currentClass?.name || 'Kelas'}`} 
      />

      {/* 3. TOOL NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTool('random_group')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTool === 'random_group'
              ? 'bg-white text-amber-700 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Dices size={15} />
          <span>Acak Kelompok</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('random_topic')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTool === 'random_topic'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <BookOpen size={15} />
          <span>Acak Materi & Topik</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('lucky_picker')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTool === 'lucky_picker'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Shuffle size={15} />
          <span>Kocok Giliran Mahasiswa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('online_roster')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTool === 'online_roster'
              ? 'bg-white text-teal-700 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Users size={15} />
          <span>Online ({onlineUsers.length})</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TOOL 1: RANDOM GROUP GENERATOR */}
      {/* =================================================================== */}
      {activeTool === 'random_group' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Config Card (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Dices size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Pengaturan Acak Kelompok</h3>
                  <p className="text-[11px] text-[#64748B]">Bagi seluruh mahasiswa secara adil untuk tugas atau proyek kelas.</p>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#334155] block">Metode Pembagian</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGrpSplitMode('by_group_count')}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                      grpSplitMode === 'by_group_count'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Bagi Berdasarkan Jumlah Kelompok
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrpSplitMode('by_member_count')}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                      grpSplitMode === 'by_member_count'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Bagi Berdasarkan Anggota per Kelompok
                  </button>
                </div>

                {/* Slider / Number Input */}
                <div className="pt-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-xs text-[#64748B]">
                    <span>{grpSplitMode === 'by_group_count' ? 'Berapa kelompok yang ingin dibuat?' : 'Berapa orang per kelompok?'}</span>
                    <span className="font-bold text-base text-amber-700">
                      {grpSplitMode === 'by_group_count' ? `${grpGroupCount} Kelompok` : `${grpMemberPerGroup} Orang`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min={2}
                      max={Math.max(2, Math.min(20, grpActivePool.length))}
                      value={grpSplitMode === 'by_group_count' ? grpGroupCount : grpMemberPerGroup}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (grpSplitMode === 'by_group_count') setGrpGroupCount(val);
                        else setGrpMemberPerGroup(val);
                      }}
                      className="w-full accent-amber-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#334155] block">Awalan Nama Kelompok</label>
                  <input
                    type="text"
                    value={grpPrefix}
                    onChange={(e) => setGrpPrefix(e.target.value)}
                    placeholder="Contoh: Kelompok, Tim, Group"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 text-[#0F172A]"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#334155] font-semibold">
                    <input
                      type="checkbox"
                      checked={grpAssignLeader}
                      onChange={(e) => setGrpAssignLeader(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
                    />
                    <span>👑 Tunjuk 1 Ketua Acak</span>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleRandomizeGroups}
                disabled={grpIsShuffling || grpActivePool.length === 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Dices size={18} className={grpIsShuffling ? 'animate-spin' : ''} />
                <span>{grpIsShuffling ? 'Sedang Mengocok...' : '🎲 Acak Kelompok Sekarang'}</span>
              </button>
            </div>

            {/* Right Checklist Card (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-600" />
                  <span className="text-xs font-bold text-[#0F172A]">
                    Anggota Diacak ({grpActivePool.length}/{members.length})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllGrpMembers}
                    className="px-2 py-0.5 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllGrpMembers}
                    className="px-2 py-0.5 rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold"
                  >
                    Batal
                  </button>
                </div>
              </div>

              {/* Search filter in checklist */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={grpSearchMember}
                  onChange={(e) => setGrpSearchMember(e.target.value)}
                  placeholder="Cari nama untuk centang/uncheck..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Member list chips */}
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {grpFilteredMembers.map((m, idx) => {
                  const key = String(m?.email || m?.userId || m?.id || m?.name || '').toLowerCase().trim();
                  const isChecked = grpSelectedEmails.has(key);
                  return (
                    <button
                      key={key || idx}
                      type="button"
                      onClick={() => toggleGrpMember(m)}
                      className={`w-full px-3 py-1.5 rounded-xl text-left text-xs flex items-center justify-between border transition-all ${
                        isChecked 
                          ? 'bg-amber-50/60 border-amber-300 text-amber-950 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 line-through'
                      }`}
                    >
                      <span className="truncate pr-2">{m.name || m.email}</span>
                      {isChecked ? <Check size={13} className="text-amber-600 shrink-0" /> : <X size={13} className="text-slate-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RESULTS DISPLAY */}
          {grpGenerated && (
            <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    Hasil Pengacakan ({grpGenerated.length} Kelompok)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyGroupsWA}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Copy size={14} />
                  <span>📋 Salin Format WhatsApp</span>
                </button>
              </div>

              {/* Group Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grpGenerated.map((g, gIdx) => (
                  <div
                    key={g.id || gIdx}
                    className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-xs text-[#0F172A]">{g.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {g.members.length} Orang
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {g.members.map((m, mIdx) => (
                        <div
                          key={m.userId || mIdx}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-slate-100"
                        >
                          <span className="text-[#334155] font-medium truncate">
                            {mIdx + 1}. {m.name}
                          </span>
                          {m.role === 'leader' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-amber-500 text-white shrink-0 ml-1">
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
      )}

      {/* =================================================================== */}
      {/* TOOL 2: RANDOM TOPIC / MATERIAL DISTRIBUTOR */}
      {/* =================================================================== */}
      {activeTool === 'random_topic' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Acak Materi & Topik Presentasi</h3>
                <p className="text-[11px] text-[#64748B]">Kocok pembagian bab, topik riset, atau studi kasus ke kelompok atau masing-masing mahasiswa.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Config */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155] block">Target Pembagian</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTopicTargetType('group')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        topicTargetType === 'group'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Bagi ke Kelompok
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopicTargetType('student')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        topicTargetType === 'student'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Bagi ke Seluruh Mahasiswa
                    </button>
                  </div>
                </div>

                {topicTargetType === 'group' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#334155] block">Jumlah Kelompok Penerima</label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={topicGroupCount}
                      onChange={(e) => setTopicGroupCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 space-y-2">
                  <p className="font-semibold">💡 Tips Cepat:</p>
                  <p className="text-[11px] leading-relaxed">
                    Ketik atau paste materi di sebelah kanan (1 materi per baris). Anda juga bisa langsung memuat daftar mata kuliah kelas dengan tombol di atas textarea!
                  </p>
                </div>
              </div>

              {/* Right Topic Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#334155]">Daftar Topik / Materi (1 Per Baris)</label>
                  <button
                    type="button"
                    onClick={handleLoadTopicsFromSchedules}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    + Muat dari Jadwal Kelas
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={topicInputRaw}
                  onChange={(e) => setTopicInputRaw(e.target.value)}
                  placeholder="Ketik topik materi di sini, satu topik per baris..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleRandomizeTopics}
              disabled={topicIsShuffling}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <BookOpen size={17} className={topicIsShuffling ? 'animate-spin' : ''} />
              <span>{topicIsShuffling ? 'Sedang Membagi...' : '🎲 Kocok & Pasangkan Materi'}</span>
            </button>
          </div>

          {/* Topic Results */}
          {topicGenerated && (
            <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    Hasil Pasangan Materi ({topicGenerated.length} Entri)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTopicsWA}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Copy size={14} />
                  <span>📋 Salin Format WhatsApp</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topicGenerated.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <span className="font-bold text-xs text-[#0F172A] shrink-0">
                      {pair.target}
                    </span>
                    <span className="text-xs text-indigo-700 font-semibold text-right truncate">
                      ➔ {pair.topic}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 3: LUCKY STUDENT PICKER */}
      {/* =================================================================== */}
      {activeTool === 'lucky_picker' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs text-center space-y-6 max-w-xl mx-auto">
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <Shuffle size={28} className={pickerIsSpinning ? 'animate-spin' : ''} />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Kocok Giliran Mahasiswa</h3>
              <p className="text-xs text-[#64748B]">
                Tunjuk mahasiswa secara acak untuk maju presentasi, menjawab pertanyaan dosen, atau jadi perwakilan kelas.
              </p>
            </div>

            {/* Lucky Screen Display */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 shadow-md min-h-[160px] flex flex-col items-center justify-center space-y-2">
              {pickerIsSpinning ? (
                <div className="space-y-2 animate-pulse">
                  <span className="text-xs text-emerald-400 font-mono tracking-widest uppercase">Sedang Mengocok...</span>
                  <p className="text-2xl font-black tracking-tight text-white">{pickerRollingName}</p>
                </div>
              ) : pickerSelectedStudent ? (
                <div className="space-y-2 animate-in zoom-in-95 duration-200">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🎉 MAHASISWA TERPILIH
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {pickerSelectedStudent.name}
                  </h4>
                  {pickerSelectedStudent.nim && (
                    <p className="text-xs text-slate-300 font-mono">NIM: {pickerSelectedStudent.nim}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-slate-400">
                  <p className="text-base font-bold text-slate-300">Siapa yang giliran selanjutnya?</p>
                  <p className="text-xs">Klik tombol kocok di bawah untuk memilih nama acak.</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSpinStudent}
                disabled={pickerIsSpinning || eligibleStudents.length === 0}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Shuffle size={16} />
                <span>{pickerIsSpinning ? 'Mengocok...' : '🎯 Kocok 1 Nama Sekarang'}</span>
              </button>

              {pickerExcludedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleResetPicker}
                  className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Reset daftar giliran"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>

            {/* Remaining status */}
            <div className="text-xs text-[#64748B] flex items-center justify-center gap-4 pt-2">
              <span>Mahasiswa tersedia: <strong>{eligibleStudents.length}</strong></span>
              <span>Sudah terpilih: <strong>{pickerExcludedIds.size}</strong></span>
            </div>
          </div>

        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 4: ONLINE ROSTER */}
      {/* =================================================================== */}
      {activeTool === 'online_roster' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                Mahasiswa Sedang Online ({onlineUsers.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">Sinkronisasi Realtime</span>
          </div>

          {onlineUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {presenceLoading ? 'Memeriksa kehadiran...' : 'Tidak ada mahasiswa yang sedang membuka website saat ini.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {onlineUsers.map((u) => {
                const isMe = u.userId === (currentUser?.uid || currentUser?.id);
                return (
                  <div
                    key={u.id || u.userId}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
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
                          {u.userName} {isMe && <span className="text-emerald-600 font-normal">(Anda)</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Aktif di website
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
      )}

    </div>
  );
}
