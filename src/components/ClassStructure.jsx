import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, 
  ShieldCheck, 
  Wallet, 
  FileText,
  Layers, 
  Edit3, 
  Phone, 
  MessageCircle, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  X, 
  User, 
  Sparkles, 
  ChevronRight,
  Search,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  GitFork,
  LayoutGrid,
  Network,
  ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dbService } from '../utils/db';
import { canManageClassStructure } from '../utils/permissions';
import ModalPortal from './ModalPortal';

// Helper to format phone number to clean WhatsApp link
const getWhatsAppUrl = (phone, name = '', className = '') => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  const formatted = digits.startsWith('0') ? '62' + digits.slice(1) : digits;
  const text = encodeURIComponent(`Halo ${name ? name : ''}, saya mahasiswa dari kelas ${className || 'Classy'}. Mau izin bertanya perihal kelas.`);
  return `https://wa.me/${formatted}?text=${text}`;
};

// Helper to get clean 2-letter uppercase monogram initials (e.g. "Arya Ghiffari" -> "AG")
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function ClassStructure({
  currentClass,
  currentUser,
  schedules = []
}) {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [divisionSearch, setDivisionSearch] = useState('');
  // View mode: 'map' (Bagan Bergaris / Org Chart) or 'cards' (Daftar Kartu Grid)
  const [viewMode, setViewMode] = useState('map');

  // Local schedules state with automatic fallback fetch if prop is not provided or empty
  const [localSchedules, setLocalSchedules] = useState(Array.isArray(schedules) ? schedules : []);

  useEffect(() => {
    if (Array.isArray(schedules) && schedules.length > 0) {
      setLocalSchedules(schedules);
    } else if (currentClass?.id) {
      dbService.schedules.list(currentClass.id).then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setLocalSchedules(res);
        }
      }).catch(() => {});
    }
  }, [schedules, currentClass?.id]);

  // Editing draft state
  const [draft, setDraft] = useState(null);

  const role = currentClass?.userRole || 'student';
  const isOwner = currentClass?.ownerId === currentUser?.uid;
  const canEdit = canManageClassStructure(role, isOwner);

  // Subscribe to real-time class structure
  useEffect(() => {
    if (!currentClass?.id) return;
    setLoading(true);

    const unsubscribe = dbService.structure.subscribe(currentClass.id, (data) => {
      setStructure(data);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentClass?.id]);

  // Fallback defaults if no structure saved yet in DB
  const resolvedStructure = useMemo(() => {
    const members = currentClass?.members || [];
    const detectedKomti = members.find(m => 
      m && m.role !== 'superadmin' && (m.role === 'komti' || m.role === 'coordinator' || m.userId === currentClass?.ownerId)
    );
    const detectedVice = members.find(m => 
      m && m.role !== 'superadmin' && (m.role === 'vice_komti' || m.role === 'wakil_komti')
    );
    const detectedPjs = members.filter(m => 
      m && m.role !== 'superadmin' && (m.role === 'division_head' || m.role === 'pj')
    );

    // Resolve PJs: from structure.pjs first, then structure.divisions, then detected PJ members
    let rawPjs = [];
    if (Array.isArray(structure?.pjs) && structure.pjs.length > 0) {
      rawPjs = structure.pjs;
    } else if (Array.isArray(structure?.divisions) && structure.divisions.length > 0) {
      rawPjs = structure.divisions.map((d, i) => ({
        id: d.id || `pj_${i}`,
        title: d.title && !d.title.toLowerCase().includes('pengantar') && !d.title.toLowerCase().includes('matematika') && !d.title.toLowerCase().includes('ekonomi') && !d.title.toLowerCase().includes('pendidikan') && !d.title.toLowerCase().includes('prinsip') ? d.title : 'Penanggung Jawab (PJ)',
        name: d.name || d.leaderName || '',
        phone: d.phone || '',
        nim: d.nim || '',
        note: d.note || d.description || 'Penanggung Jawab Kelas',
        memberId: d.memberId || ''
      }));
    } else if (detectedPjs.length > 0) {
      rawPjs = detectedPjs.map((m, i) => ({
        id: `pj_${m.userId || i}`,
        title: 'Penanggung Jawab (PJ)',
        name: m.name || '',
        phone: m.phoneNumber || '',
        nim: m.nim || '',
        note: 'Penanggung Jawab Kelas',
        memberId: m.userId || ''
      }));
    }

    return {
      komti: structure?.komti || {
        name: detectedKomti?.name || '',
        memberId: detectedKomti?.userId || '',
        phone: detectedKomti?.phoneNumber || '',
        nim: detectedKomti?.nim || '',
        note: 'Ketua Tingkat / Koordinator Kelas'
      },
      viceKomti: structure?.viceKomti || {
        name: detectedVice?.name || '',
        memberId: detectedVice?.userId || '',
        phone: detectedVice?.phoneNumber || '',
        nim: detectedVice?.nim || '',
        note: 'Wakil Ketua Tingkat'
      },
      secretaries: Array.isArray(structure?.secretaries) && structure.secretaries.length > 0 ? structure.secretaries : [
        { id: 's1', title: 'Sekretaris 1', name: '', phone: '', nim: '', note: 'Administrasi, surat-menyurat & notulensi kelas' }
      ],
      treasurers: Array.isArray(structure?.treasurers) && structure.treasurers.length > 0 ? structure.treasurers : [
        { id: 'b1', title: 'Bendahara 1', name: '', phone: '', nim: '', note: 'Pengelolaan kas & tagihan kelas' },
        { id: 'b2', title: 'Bendahara 2', name: '', phone: '', nim: '', note: 'Pencatatan kas & rekapitulasi' }
      ],
      pjs: rawPjs,
      divisions: rawPjs,
      updatedAt: structure?.updatedAt || null,
      updatedBy: structure?.updatedBy || null
    };
  }, [structure, currentClass]);

  const handleCopyPhone = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Nomor telepon disalin: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open editor
  const handleOpenEdit = () => {
    setDraft(JSON.parse(JSON.stringify(resolvedStructure)));
    setIsEditing(true);
  };

  // Save changes
  const handleSaveStructure = async () => {
    if (!currentClass?.id) return;
    setSaving(true);
    try {
      await dbService.structure.save(currentClass.id, draft, {
        name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Pengurus',
        email: currentUser?.email || '',
        role
      });
      toast.success('Struktur organisasi kelas berhasil diperbarui!');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan struktur kelas. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  // Draft Mutators
  const updateDraftKomti = (field, val) => {
    setDraft(prev => ({
      ...prev,
      komti: { ...prev.komti, [field]: val }
    }));
  };

  const updateDraftVice = (field, val) => {
    setDraft(prev => ({
      ...prev,
      viceKomti: { ...prev.viceKomti, [field]: val }
    }));
  };

  const updateDraftSecretary = (index, field, val) => {
    setDraft(prev => {
      const nextS = [...(prev.secretaries || [])];
      nextS[index] = { ...nextS[index], [field]: val };
      return { ...prev, secretaries: nextS };
    });
  };

  const addSecretarySlot = () => {
    setDraft(prev => ({
      ...prev,
      secretaries: [
        ...(prev.secretaries || []),
        {
          id: 's_' + Date.now(),
          title: `Sekretaris ${(prev.secretaries?.length || 0) + 1}`,
          name: '',
          phone: '',
          nim: '',
          note: 'Administrasi, surat-menyurat & notulensi kelas'
        }
      ]
    }));
  };

  const removeSecretarySlot = (index) => {
    setDraft(prev => {
      const nextS = (prev.secretaries || []).filter((_, i) => i !== index);
      return { ...prev, secretaries: nextS };
    });
  };

  const updateDraftTreasurer = (index, field, val) => {
    setDraft(prev => {
      const nextT = [...(prev.treasurers || [])];
      nextT[index] = { ...nextT[index], [field]: val };
      return { ...prev, treasurers: nextT };
    });
  };

  const addTreasurerSlot = () => {
    setDraft(prev => ({
      ...prev,
      treasurers: [
        ...(prev.treasurers || []),
        {
          id: 'b_' + Date.now(),
          title: `Bendahara ${(prev.treasurers?.length || 0) + 1}`,
          name: '',
          phone: '',
          nim: '',
          note: 'Pengelolaan keuangan kelas'
        }
      ]
    }));
  };

  const removeTreasurerSlot = (index) => {
    setDraft(prev => {
      const nextT = prev.treasurers.filter((_, i) => i !== index);
      return { ...prev, treasurers: nextT };
    });
  };

  // Draft Mutators for Penanggung Jawab (PJ)
  const updateDraftPj = (index, field, val) => {
    setDraft(prev => {
      const currentList = [...(prev.pjs || prev.divisions || [])];
      currentList[index] = { ...currentList[index], [field]: val };
      return { ...prev, pjs: currentList, divisions: currentList };
    });
  };

  const addPjSlot = () => {
    setDraft(prev => {
      const currentList = [...(prev.pjs || prev.divisions || [])];
      const newPj = {
        id: 'pj_' + Date.now(),
        title: 'Penanggung Jawab (PJ)',
        name: '',
        phone: '',
        nim: '',
        note: 'Penanggung Jawab Kelas'
      };
      const nextP = [...currentList, newPj];
      return { ...prev, pjs: nextP, divisions: nextP };
    });
  };

  const removePjSlot = (index) => {
    setDraft(prev => {
      const currentList = [...(prev.pjs || prev.divisions || [])];
      const nextP = currentList.filter((_, i) => i !== index);
      return { ...prev, pjs: nextP, divisions: nextP };
    });
  };

  // Auto-populate from registered PJ members in the class
  const populateFromRegisteredPjs = () => {
    const pjs = (currentClass?.members || []).filter(m => 
      m && m.role !== 'superadmin' && (m.role === 'division_head' || m.role === 'pj')
    );
    if (pjs.length === 0) {
      toast.error('Tidak ada anggota dengan peran PJ di kelas ini.');
      return;
    }
    const populated = pjs.map((m, i) => ({
      id: 'pj_' + (m.userId || i),
      title: 'Penanggung Jawab (PJ)',
      name: m.name || '',
      phone: m.phoneNumber || '',
      nim: m.nim || '',
      note: 'Penanggung Jawab Kelas',
      memberId: m.userId || ''
    }));

    setDraft(prev => ({
      ...prev,
      pjs: populated,
      divisions: populated
    }));
    toast.success(`Berhasil memuat ${populated.length} Penanggung Jawab (PJ) kelas!`);
  };

  // Auto-fill person info from member selection in editor
  const handleSelectMemberFor = (memberId, targetType, targetIndex = null) => {
    const mem = (currentClass?.members || []).find(m => (m.userId || m.uid || m.id) === memberId);
    if (!mem) return;

    if (targetType === 'komti') {
      setDraft(prev => ({
        ...prev,
        komti: {
          ...prev.komti,
          memberId: mem.userId || mem.uid || '',
          name: mem.name || '',
          phone: mem.phoneNumber || prev.komti.phone || '',
          nim: mem.nim || prev.komti.nim || ''
        }
      }));
    } else if (targetType === 'vice') {
      setDraft(prev => ({
        ...prev,
        viceKomti: {
          ...prev.viceKomti,
          memberId: mem.userId || mem.uid || '',
          name: mem.name || '',
          phone: mem.phoneNumber || prev.viceKomti.phone || '',
          nim: mem.nim || prev.viceKomti.nim || ''
        }
      }));
    } else if (targetType === 'secretary' && targetIndex !== null) {
      updateDraftSecretary(targetIndex, 'name', mem.name || '');
      if (mem.phoneNumber) updateDraftSecretary(targetIndex, 'phone', mem.phoneNumber);
      if (mem.nim) updateDraftSecretary(targetIndex, 'nim', mem.nim);
    } else if (targetType === 'treasurer' && targetIndex !== null) {
      updateDraftTreasurer(targetIndex, 'name', mem.name || '');
      if (mem.phoneNumber) updateDraftTreasurer(targetIndex, 'phone', mem.phoneNumber);
      if (mem.nim) updateDraftTreasurer(targetIndex, 'nim', mem.nim);
    } else if (targetType === 'pj' && targetIndex !== null) {
      updateDraftPj(targetIndex, 'name', mem.name || '');
      if (mem.phoneNumber) updateDraftPj(targetIndex, 'phone', mem.phoneNumber);
      if (mem.nim) updateDraftPj(targetIndex, 'nim', mem.nim);
      updateDraftPj(targetIndex, 'memberId', mem.userId || mem.uid || '');
    }
  };

  // Filtered PJs for search
  const filteredPjs = useMemo(() => {
    const list = resolvedStructure.pjs || [];
    if (!divisionSearch.trim()) return list;
    const q = divisionSearch.toLowerCase();
    return list.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.nim || '').toLowerCase().includes(q) ||
      (p.note || '').toLowerCase().includes(q)
    );
  }, [resolvedStructure.pjs, divisionSearch]);

  const activeMembersList = useMemo(() => {
    return (currentClass?.members || []).filter(m => m && m.role !== 'superadmin');
  }, [currentClass?.members]);

  // Grouped members for quick PJ selection
  const { pjMembers, otherMembers } = useMemo(() => {
    const pjs = [];
    const others = [];
    activeMembersList.forEach(m => {
      if (m.role === 'division_head' || m.role === 'pj') {
        pjs.push(m);
      } else {
        others.push(m);
      }
    });
    return { pjMembers: pjs, otherMembers: others };
  }, [activeMembersList]);

  const pjsCount = resolvedStructure.pjs?.length || 0;
  const treasurersCount = resolvedStructure.treasurers?.length || 0;
  const secretariesCount = resolvedStructure.secretaries?.length || 0;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold tracking-wider uppercase text-amber-300 flex items-center gap-1.5">
                <Crown size={12} className="text-amber-400" />
                Bagan Kepengurusan
              </span>
              {currentClass?.classIdentifier && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-[11px] font-mono font-semibold">
                  {currentClass.classIdentifier}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Struktur Organisasi Kelas
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Bagan hierarki kelas top-down: Komti → Wakil Komti → Sekretaris → Bendahara → Penanggung Jawab (PJ) kelas {currentClass?.name || ''}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-white text-slate-900 shadow-md scale-102'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <Network size={14} className={viewMode === 'map' ? 'text-indigo-600' : 'text-white'} />
                <span>Bagan Bergaris</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-md scale-102'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutGrid size={14} className={viewMode === 'cards' ? 'text-indigo-600' : 'text-white'} />
                <span>Daftar Kartu</span>
              </button>
            </div>

            {canEdit && (
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Edit3 size={15} />
                <span>Edit Struktur</span>
              </button>
            )}
          </div>
        </div>

        {/* Update timestamp info */}
        {resolvedStructure.updatedAt && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>
              Terakhir diperbarui: {new Date(resolvedStructure.updatedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {resolvedStructure.updatedBy && (
              <span className="text-slate-300">
                Oleh: <strong>{resolvedStructure.updatedBy.name}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: BAGAN POHON HIRARKI BERGARIS (ORGANIZATIONAL TREE MAP)            */}
      {/* ========================================================================= */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          
          {/* Legend / Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1 text-xs text-slate-500">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 1. Komti
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> 2. Wakil Komti
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> 3. Sekretaris
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 4. Bendahara
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> 5. Penanggung Jawab (PJ)
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>Hierarki struktural vertikal dari Komti hingga Penanggung Jawab (PJ) Kelas</span>
            </div>
          </div>

          {/* Org Tree Canvas Container (Pan/Scrollable on mobile) */}
          <div className="w-full overflow-x-auto bg-slate-50/70 border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs relative no-scrollbar">
            
            <div className="min-w-[760px] max-w-5xl mx-auto flex flex-col items-center">
              
              {/* =================== LEVEL 1: KOMTI (KETUA KELAS) =================== */}
              <div className="relative w-full flex flex-col items-center">
                
                {/* Komti Card Node */}
                <div className="w-[320px] sm:w-[360px] bg-white rounded-2xl p-5 border-2 border-amber-300 shadow-md hover:shadow-lg transition-all relative group z-10">
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 min-w-[48px] min-h-[48px] aspect-square rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm ring-2 ring-amber-300">
                        {resolvedStructure.komti.name ? getInitials(resolvedStructure.komti.name) : <Crown size={22} />}
                      </div>
                      {resolvedStructure.komti.name && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                          <Crown size={10} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                        <Crown size={11} className="text-amber-600" />
                        KOMTI (KETUA TINGKAT)
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1 truncate">
                        {resolvedStructure.komti.name || <span className="text-slate-400 italic">Belum diatur</span>}
                      </h3>
                      {resolvedStructure.komti.nim && (
                        <p className="text-[10px] font-mono text-slate-500 font-semibold">NIM: {resolvedStructure.komti.nim}</p>
                      )}
                    </div>
                  </div>

                  {resolvedStructure.komti.note && (
                    <p className="mt-2.5 text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-xl line-clamp-2">
                      {resolvedStructure.komti.note}
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    {resolvedStructure.komti.phone ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(resolvedStructure.komti.phone, 'komti_map')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Salin nomor"
                        >
                          {copiedKey === 'komti_map' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          <span>{resolvedStructure.komti.phone}</span>
                        </button>
                        {getWhatsAppUrl(resolvedStructure.komti.phone, resolvedStructure.komti.name, currentClass?.name) && (
                          <a
                            href={getWhatsAppUrl(resolvedStructure.komti.phone, resolvedStructure.komti.name, currentClass?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Nomor belum ada</span>
                    )}
                  </div>
                </div>

                {/* Vertical Stem Line: Komti -> Wakil Komti */}
                <div className="flex flex-col items-center my-0 z-0">
                  <div className="w-0.5 h-10 bg-slate-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                  </div>
                  <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 -mt-1.5" />
                </div>

              </div>

              {/* =================== LEVEL 2: WAKIL KOMTI (DI BAWAH KOMTI) =================== */}
              <div className="relative w-full flex flex-col items-center">
                
                {/* Wakil Komti Card Node */}
                <div className="w-[320px] sm:w-[360px] bg-white rounded-2xl p-5 border-2 border-indigo-300 shadow-md hover:shadow-lg transition-all relative group z-10">
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 min-w-[48px] min-h-[48px] aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm ring-2 ring-indigo-300">
                        {resolvedStructure.viceKomti.name ? getInitials(resolvedStructure.viceKomti.name) : <ShieldCheck size={22} />}
                      </div>
                      {resolvedStructure.viceKomti.name && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                          <ShieldCheck size={10} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[9px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                        <ShieldCheck size={11} className="text-indigo-600" />
                        WAKIL KOMTI
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1 truncate">
                        {resolvedStructure.viceKomti.name || <span className="text-slate-400 italic">Belum diatur</span>}
                      </h3>
                      {resolvedStructure.viceKomti.nim && (
                        <p className="text-[10px] font-mono text-slate-500 font-semibold">NIM: {resolvedStructure.viceKomti.nim}</p>
                      )}
                    </div>
                  </div>

                  {resolvedStructure.viceKomti.note && (
                    <p className="mt-2.5 text-[11px] text-slate-600 bg-indigo-50/60 p-2 rounded-xl line-clamp-2">
                      {resolvedStructure.viceKomti.note}
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    {resolvedStructure.viceKomti.phone ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(resolvedStructure.viceKomti.phone, 'vice_map')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Salin nomor"
                        >
                          {copiedKey === 'vice_map' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          <span>{resolvedStructure.viceKomti.phone}</span>
                        </button>
                        {getWhatsAppUrl(resolvedStructure.viceKomti.phone, resolvedStructure.viceKomti.name, currentClass?.name) && (
                          <a
                            href={getWhatsAppUrl(resolvedStructure.viceKomti.phone, resolvedStructure.viceKomti.name, currentClass?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Nomor belum ada</span>
                    )}
                  </div>
                </div>

                {/* Vertical Stem Line: Wakil Komti -> Sekretaris */}
                <div className="flex flex-col items-center my-0 z-0">
                  <div className="w-0.5 h-10 bg-slate-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
                  </div>
                  <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 -mt-1.5" />
                </div>

              </div>

              {/* =================== LEVEL 3: SEKRETARIS KELAS =================== */}
              <div className="relative w-full flex flex-col items-center">
                
                {/* Horizontal Bar for Secretaries */}
                <div className="flex flex-wrap items-center justify-center gap-4 relative z-10 w-full max-w-2xl">
                  {resolvedStructure.secretaries.map((sec, idx) => (
                    <div 
                      key={sec.id || idx}
                      className="w-[260px] sm:w-[280px] bg-white rounded-2xl p-4 border-2 border-sky-200/90 shadow-sm hover:border-sky-400 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-[9px] font-extrabold flex items-center gap-1">
                          <FileText size={10} className="text-sky-700" />
                          {sec.title || `Sekretaris ${idx + 1}`}
                        </span>
                        {sec.phone && getWhatsAppUrl(sec.phone, sec.name, currentClass?.name) && (
                          <a
                            href={getWhatsAppUrl(sec.phone, sec.name, currentClass?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-50 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                      </div>

                      <div className="mt-2">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">
                          {sec.name || <span className="text-slate-400 italic font-normal">Belum ditentukan</span>}
                        </h4>
                        {sec.nim && (
                          <p className="text-[10px] font-mono text-slate-500">NIM: {sec.nim}</p>
                        )}
                        {sec.note && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">{sec.note}</p>
                        )}
                      </div>

                      {sec.phone && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="font-mono text-slate-500">{sec.phone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(sec.phone, `sec_map_${idx}`)}
                            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                            title="Salin"
                          >
                            {copiedKey === `sec_map_${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Vertical Stem Line: Level 3 (Sekretaris) -> Level 4 (Bendahara) */}
                <div className="flex flex-col items-center my-0 z-0">
                  <div className="w-0.5 h-10 bg-slate-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-500 ring-4 ring-sky-100" />
                  </div>
                  <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 -mt-1.5" />
                </div>

              </div>

              {/* =================== LEVEL 4: BENDAHARA KELAS =================== */}
              <div className="relative w-full flex flex-col items-center">
                
                {/* Horizontal Bar for Treasurers if multiple */}
                <div className="flex flex-wrap items-center justify-center gap-4 relative z-10 w-full max-w-2xl">
                  {resolvedStructure.treasurers.map((tr, idx) => (
                    <div 
                      key={tr.id || idx}
                      className="w-[260px] sm:w-[280px] bg-white rounded-2xl p-4 border-2 border-emerald-200/90 shadow-sm hover:border-emerald-400 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-extrabold flex items-center gap-1">
                          <Wallet size={10} className="text-emerald-700" />
                          {tr.title || `Bendahara ${idx + 1}`}
                        </span>
                        {tr.phone && getWhatsAppUrl(tr.phone, tr.name, currentClass?.name) && (
                          <a
                            href={getWhatsAppUrl(tr.phone, tr.name, currentClass?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-50 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                      </div>

                      <div className="mt-2">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">
                          {tr.name || <span className="text-slate-400 italic font-normal">Belum ditentukan</span>}
                        </h4>
                        {tr.nim && (
                          <p className="text-[10px] font-mono text-slate-500">NIM: {tr.nim}</p>
                        )}
                        {tr.note && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">{tr.note}</p>
                        )}
                      </div>

                      {tr.phone && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="font-mono text-slate-500">{tr.phone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(tr.phone, `tr_map_${idx}`)}
                            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                            title="Salin"
                          >
                            {copiedKey === `tr_map_${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Vertical Stem Line: Level 4 (Bendahara) -> Level 5 (Divisi / PJ) */}
                <div className="flex flex-col items-center my-0 z-0">
                  <div className="w-0.5 h-10 bg-slate-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  </div>
                  <div className="w-0.5 h-6 bg-slate-300" />
                </div>

              </div>

              {/* =================== LEVEL 5: PENANGGUNG JAWAB (PJ) KELAS =================== */}
              <div className="relative w-full">
                
                {pjsCount === 0 ? (
                  <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-300 text-center max-w-md mx-auto space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                      <Layers size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Belum Ada Penanggung Jawab (PJ)</p>
                    <p className="text-[11px] text-slate-500">
                      Tambahkan Penanggung Jawab (PJ) kelas untuk membantu koordinasi kelas secara netral.
                    </p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Tambah PJ</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full">
                    
                    {/* Central Level 5 Anchor Badge */}
                    <div className="flex flex-col items-center mb-1">
                      <div className="px-4 py-1.5 rounded-full bg-violet-700 text-white text-[11px] font-black tracking-wider uppercase flex items-center gap-2 shadow-sm ring-4 ring-violet-100">
                        <Layers size={13} className="text-violet-200" />
                        <span>5. Penanggung Jawab (PJ) Kelas ({pjsCount} Orang)</span>
                      </div>
                      <div className="w-0.5 h-4 bg-slate-300 relative">
                        <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 -mt-0.5" />
                      </div>
                    </div>

                    {/* Horizontal Branching Bar spanning all PJ cards */}
                    {pjsCount > 1 && (
                      <div className="w-full flex items-center justify-center mb-0">
                        <div 
                          className="border-t-2 border-slate-300 relative"
                          style={{
                            width: `calc(${Math.min(pjsCount, 4) * 260}px - 130px)`,
                            maxWidth: '92%'
                          }}
                        >
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-violet-600 ring-4 ring-violet-100" />
                        </div>
                      </div>
                    )}

                    {/* Grid of PJ Nodes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {resolvedStructure.pjs.map((pj, idx) => (
                        <div key={pj.id || idx} className="relative flex flex-col items-center">
                          
                          {/* Dropper stem leading into each card */}
                          <div className="w-0.5 h-6 bg-slate-300 relative">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>

                          {/* PJ Card Node */}
                          <div className="w-full bg-white rounded-2xl p-4 border-2 border-violet-200/90 shadow-sm hover:border-violet-400 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-2.5">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs ring-2 ring-violet-200 shrink-0">
                                  {pj.name ? getInitials(pj.name) : <Layers size={18} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                    <Layers size={10} className="text-violet-600" />
                                    {pj.title || 'Penanggung Jawab (PJ)'}
                                  </span>
                                  <h4 className="font-extrabold text-sm text-slate-900 truncate mt-1">
                                    {pj.name || <span className="text-slate-400 italic font-normal">Belum ditentukan</span>}
                                  </h4>
                                  {pj.nim && (
                                    <p className="text-[10px] font-mono text-slate-500 font-semibold">NIM: {pj.nim}</p>
                                  )}
                                </div>
                              </div>

                              {pj.note && (
                                <p className="text-[11px] text-slate-600 bg-violet-50/50 p-2 rounded-xl line-clamp-2 leading-relaxed">
                                  {pj.note}
                                </p>
                              )}
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                              {pj.phone ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPhone(pj.phone, `pj_map_${idx}`)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Salin nomor"
                                  >
                                    {copiedKey === `pj_map_${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                    <span>{pj.phone}</span>
                                  </button>
                                  {getWhatsAppUrl(pj.phone, pj.name, currentClass?.name) && (
                                    <a
                                      href={getWhatsAppUrl(pj.phone, pj.name, currentClass?.name)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                    >
                                      <MessageCircle size={12} />
                                      <span>WhatsApp</span>
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Nomor belum ada</span>
                              )}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>

                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: TAMPILAN KARTU GRID (CARD VIEW)                                  */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          
          {/* TIER 1: KOMTI */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Tingkat 1 · Ketua Tingkat (Komti)
              </h2>
            </div>

            <div className="max-w-xl">
              {/* Card: KOMTI */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-amber-200/80 hover:border-amber-400/80 transition-all shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-amber-50 rounded-full blur-xl group-hover:scale-125 transition-transform pointer-events-none" />
                
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] sm:min-w-[56px] sm:min-h-[56px] aspect-square rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-sm sm:text-base tracking-wider shadow-md ring-2 ring-amber-300">
                        {resolvedStructure.komti.name ? getInitials(resolvedStructure.komti.name) : <Crown size={24} />}
                      </div>
                      {resolvedStructure.komti.name && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-600 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                          <Crown size={11} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black tracking-wide flex items-center gap-1">
                          <Crown size={11} className="text-amber-600" />
                          KOMTI / KETUA TINGKAT
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-snug">
                        {resolvedStructure.komti.name || (
                          <span className="text-slate-400 italic font-medium">Belum diatur</span>
                        )}
                      </h3>
                      {resolvedStructure.komti.nim && (
                        <p className="text-xs font-mono font-semibold text-slate-500">
                          NIM: {resolvedStructure.komti.nim}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {resolvedStructure.komti.note && (
                  <p className="mt-4 text-xs text-slate-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100/80 leading-relaxed">
                    {resolvedStructure.komti.note}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {resolvedStructure.komti.phone ? (
                      <>
                        <button
                          onClick={() => handleCopyPhone(resolvedStructure.komti.phone, 'komti')}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Salin nomor telepon"
                        >
                          {copiedKey === 'komti' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span className="font-mono text-[11px]">{resolvedStructure.komti.phone}</span>
                        </button>
                        {getWhatsAppUrl(resolvedStructure.komti.phone, resolvedStructure.komti.name, currentClass?.name) && (
                          <a
                            href={getWhatsAppUrl(resolvedStructure.komti.phone, resolvedStructure.komti.name, currentClass?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <MessageCircle size={13} />
                            <span>Chat WhatsApp</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Nomor kontak belum ditambahkan</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TIER 2: WAKIL KOMTI */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Tingkat 2 · Wakil Ketua Tingkat (Wakil Komti)
              </h2>
            </div>

            <div className="max-w-xl">
              {/* Card: WAKIL KOMTI */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-indigo-200/80 hover:border-indigo-400/80 transition-all shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-50 rounded-full blur-xl group-hover:scale-125 transition-transform pointer-events-none" />

                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] sm:min-w-[56px] sm:min-h-[56px] aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-sm sm:text-base tracking-wider shadow-md ring-2 ring-indigo-300">
                        {resolvedStructure.viceKomti.name ? getInitials(resolvedStructure.viceKomti.name) : <ShieldCheck size={24} />}
                      </div>
                      {resolvedStructure.viceKomti.name && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                          <ShieldCheck size={11} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-black tracking-wide flex items-center gap-1">
                          <ShieldCheck size={11} className="text-indigo-600" />
                          WAKIL KOMTI
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-snug">
                        {resolvedStructure.viceKomti.name || (
                          <span className="text-slate-400 italic font-medium">Belum diatur</span>
                        )}
                      </h3>
                      {resolvedStructure.viceKomti.nim && (
                        <p className="text-xs font-mono font-semibold text-slate-500">
                          NIM: {resolvedStructure.viceKomti.nim}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {resolvedStructure.viceKomti.note && (
                  <p className="mt-4 text-xs text-slate-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/80 leading-relaxed">
                    {resolvedStructure.viceKomti.note}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {resolvedStructure.viceKomti.phone ? (
                      <>
                        <button
                          onClick={() => handleCopyPhone(resolvedStructure.viceKomti.phone, 'vice')}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Salin nomor telepon"
                        >
                          {copiedKey === 'vice' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span className="font-mono text-[11px]">{resolvedStructure.viceKomti.phone}</span>
                        </button>
                        {getWhatsAppUrl(resolvedStructure.viceKomti.phone, resolvedStructure.viceKomti.name, currentClass?.name) && (
                          <a
                            href={getWhatsAppUrl(resolvedStructure.viceKomti.phone, resolvedStructure.viceKomti.name, currentClass?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <MessageCircle size={13} />
                            <span>Chat WhatsApp</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Nomor kontak belum ditambahkan</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TIER 3: SEKRETARIS KELAS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Tingkat 3 · Sekretaris Kelas
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {resolvedStructure.secretaries.length} Pengurus
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resolvedStructure.secretaries.map((sec, idx) => {
                const waLink = getWhatsAppUrl(sec.phone, sec.name, currentClass?.name);
                return (
                  <div 
                    key={sec.id || idx}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm">
                          <FileText size={18} />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                          {sec.title || `Sekretaris ${idx + 1}`}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {sec.name || <span className="text-slate-400 italic font-normal">Belum ditentukan</span>}
                        </h4>
                        {sec.nim && (
                          <p className="text-[11px] font-mono text-slate-500">NIM: {sec.nim}</p>
                        )}
                        {sec.note && (
                          <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{sec.note}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {sec.phone ? (
                        <>
                          <button
                            onClick={() => handleCopyPhone(sec.phone, `sec_c_${idx}`)}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Salin nomor telepon"
                          >
                            {copiedKey === `sec_c_${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            <span>{sec.phone}</span>
                          </button>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <MessageCircle size={13} />
                              <span>WA</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum ada nomor</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TIER 4: BENDAHARA KELAS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Tingkat 4 · Bendahara Kelas
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {resolvedStructure.treasurers.length} Pengurus
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resolvedStructure.treasurers.map((tr, idx) => {
                const waLink = getWhatsAppUrl(tr.phone, tr.name, currentClass?.name);
                return (
                  <div 
                    key={tr.id || idx}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                          <Wallet size={18} />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          {tr.title || `Bendahara ${idx + 1}`}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {tr.name || <span className="text-slate-400 italic font-normal">Belum ditentukan</span>}
                        </h4>
                        {tr.nim && (
                          <p className="text-[11px] font-mono text-slate-500">NIM: {tr.nim}</p>
                        )}
                        {tr.note && (
                          <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{tr.note}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {tr.phone ? (
                        <>
                          <button
                            onClick={() => handleCopyPhone(tr.phone, `tr_${idx}`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            title="Salin nomor"
                          >
                            {copiedKey === `tr_${idx}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto"
                            >
                              <MessageCircle size={12} />
                              <span>Hubungi</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Kontak belum ada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TIER 5: PENANGGUNG JAWAB (PJ) KELAS */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Tingkat 5 · Penanggung Jawab (PJ) Kelas ({pjsCount})
                </h2>
              </div>

              {/* Quick search input */}
              {pjsCount > 2 && (
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={divisionSearch}
                    onChange={(e) => setDivisionSearch(e.target.value)}
                    placeholder="Cari nama PJ atau nomor HP..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {pjsCount === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                  <Layers size={24} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-bold text-sm text-slate-900">Belum Ada Penanggung Jawab (PJ) Ditambahkan</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Komti atau Wakil Komti dapat menambahkan Penanggung Jawab (PJ) kelas untuk membantu koordinasi kelas secara netral.
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={handleOpenEdit}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Tambah PJ Pertama</span>
                  </button>
                )}
              </div>
            ) : filteredPjs.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                Tidak ditemukan Penanggung Jawab (PJ) dengan kata kunci "{divisionSearch}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPjs.map((pj, idx) => (
                  <div
                    key={pj.id || idx}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-violet-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {pj.name ? getInitials(pj.name) : <Layers size={15} />}
                          </div>
                          <span className="font-extrabold text-xs text-slate-900 uppercase tracking-tight truncate">
                            {pj.title || 'Penanggung Jawab (PJ)'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[9px] font-bold shrink-0">
                          PJ Kelas
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2 pt-1">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            {pj.name || <span className="text-slate-400 italic font-normal">Belum ditentukan</span>}
                          </h4>
                          {pj.nim && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIM: {pj.nim}</p>
                          )}
                          {pj.phone && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-[10px] text-slate-600">{pj.phone}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(pj.phone, `pj_c_${idx}`)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                title="Salin nomor"
                              >
                                {copiedKey === `pj_c_${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          )}
                        </div>

                        {pj.phone && getWhatsAppUrl(pj.phone, pj.name, currentClass?.name) && (
                          <a
                            href={getWhatsAppUrl(pj.phone, pj.name, currentClass?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                          >
                            <MessageCircle size={13} />
                            <span>WA</span>
                          </a>
                        )}
                      </div>

                      {pj.note && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed mt-1">
                          {pj.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}

      {/* EDIT MODAL PORTAL (Only for Komti & Wakil Komti) */}
      {isEditing && draft && (
        <ModalPortal onClose={() => !saving && setIsEditing(false)} maxWidth="max-w-3xl">
          {/* Modal Dialog Card */}
          <div className="bg-white border border-slate-200 rounded-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-sans">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Edit3 size={18} />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900">Edit Struktur Organisasi Kelas</h2>
                    <p className="text-xs text-slate-500">Khusus hak akses Komti dan Wakil Komti</p>
                  </div>
                </div>

                <button
                  disabled={saving}
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* 1. Komti Section */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Crown size={14} className="text-amber-600" />
                      1. Ketua Tingkat / Komti
                    </span>
                    {activeMembersList.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Pilih dari anggota:</span>
                        <select
                          className="text-xs bg-white border border-amber-200 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-none"
                          onChange={(e) => handleSelectMemberFor(e.target.value, 'komti')}
                          defaultValue=""
                        >
                          <option value="" disabled>-- Pilih Anggota --</option>
                          {activeMembersList.map(m => (
                            <option key={m.userId || m.uid || m.id} value={m.userId || m.uid || m.id}>
                              {m.name || m.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={draft.komti?.name || ''}
                        onChange={(e) => updateDraftKomti('name', e.target.value)}
                        placeholder="Nama Komti..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                      <input
                        type="text"
                        value={draft.komti?.phone || ''}
                        onChange={(e) => updateDraftKomti('phone', e.target.value)}
                        placeholder="0812xxxx"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">NIM (Opsional)</label>
                      <input
                        type="text"
                        value={draft.komti?.nim || ''}
                        onChange={(e) => updateDraftKomti('nim', e.target.value)}
                        placeholder="NIM..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan / Deskripsi Peran</label>
                    <input
                      type="text"
                      value={draft.komti?.note || ''}
                      onChange={(e) => updateDraftKomti('note', e.target.value)}
                      placeholder="Contoh: Koordinator seluruh kegiatan kelas dan perwakilan mahasiswa"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 2. Wakil Komti Section */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-indigo-600" />
                      2. Wakil Komti
                    </span>
                    {activeMembersList.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Pilih dari anggota:</span>
                        <select
                          className="text-xs bg-white border border-indigo-200 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-none"
                          onChange={(e) => handleSelectMemberFor(e.target.value, 'vice')}
                          defaultValue=""
                        >
                          <option value="" disabled>-- Pilih Anggota --</option>
                          {activeMembersList.map(m => (
                            <option key={m.userId || m.uid || m.id} value={m.userId || m.uid || m.id}>
                              {m.name || m.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={draft.viceKomti?.name || ''}
                        onChange={(e) => updateDraftVice('name', e.target.value)}
                        placeholder="Nama Wakil Komti..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                      <input
                        type="text"
                        value={draft.viceKomti?.phone || ''}
                        onChange={(e) => updateDraftVice('phone', e.target.value)}
                        placeholder="0812xxxx"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">NIM (Opsional)</label>
                      <input
                        type="text"
                        value={draft.viceKomti?.nim || ''}
                        onChange={(e) => updateDraftVice('nim', e.target.value)}
                        placeholder="NIM..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan / Deskripsi Peran</label>
                    <input
                      type="text"
                      value={draft.viceKomti?.note || ''}
                      onChange={(e) => updateDraftVice('note', e.target.value)}
                      placeholder="Contoh: Membantu komti mengelola jadwal dan tugas kelas"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* 3. Sekretaris Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileText size={14} className="text-sky-600" />
                      3. Sekretaris Kelas
                    </span>
                    <button
                      type="button"
                      onClick={addSecretarySlot}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Tambah Sekretaris</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(draft.secretaries || []).map((sec, idx) => (
                      <div key={sec.id || idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={sec.title || ''}
                            onChange={(e) => updateDraftSecretary(idx, 'title', e.target.value)}
                            placeholder="Contoh: Sekretaris 1"
                            className="text-xs font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 max-w-[150px]"
                          />
                          <div className="flex items-center gap-2">
                            {activeMembersList.length > 0 && (
                              <select
                                className="text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600"
                                onChange={(e) => handleSelectMemberFor(e.target.value, 'secretary', idx)}
                                defaultValue=""
                              >
                                <option value="" disabled>-- Pilih Mahasiswa --</option>
                                {activeMembersList.map(m => (
                                  <option key={m.userId || m.uid || m.id} value={m.userId || m.uid || m.id}>
                                    {m.name || m.email}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => removeSecretarySlot(idx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                              title="Hapus slot"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={sec.name || ''}
                            onChange={(e) => updateDraftSecretary(idx, 'name', e.target.value)}
                            placeholder="Nama Sekretaris..."
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={sec.phone || ''}
                            onChange={(e) => updateDraftSecretary(idx, 'phone', e.target.value)}
                            placeholder="No. WhatsApp..."
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                          />
                          <input
                            type="text"
                            value={sec.note || ''}
                            onChange={(e) => updateDraftSecretary(idx, 'note', e.target.value)}
                            placeholder="Fokus tugas / catatan..."
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Bendahara Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Wallet size={14} className="text-emerald-600" />
                      4. Bendahara Kelas
                    </span>
                    <button
                      type="button"
                      onClick={addTreasurerSlot}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Tambah Bendahara</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(draft.treasurers || []).map((tr, idx) => (
                      <div key={tr.id || idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={tr.title || ''}
                            onChange={(e) => updateDraftTreasurer(idx, 'title', e.target.value)}
                            placeholder="Contoh: Bendahara 1"
                            className="text-xs font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 max-w-[150px]"
                          />
                          <div className="flex items-center gap-2">
                            {activeMembersList.length > 0 && (
                              <select
                                className="text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600"
                                onChange={(e) => handleSelectMemberFor(e.target.value, 'treasurer', idx)}
                                defaultValue=""
                              >
                                <option value="" disabled>-- Pilih Mahasiswa --</option>
                                {activeMembersList.map(m => (
                                  <option key={m.userId || m.uid || m.id} value={m.userId || m.uid || m.id}>
                                    {m.name || m.email}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => removeTreasurerSlot(idx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                              title="Hapus slot"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={tr.name || ''}
                            onChange={(e) => updateDraftTreasurer(idx, 'name', e.target.value)}
                            placeholder="Nama Bendahara..."
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={tr.phone || ''}
                            onChange={(e) => updateDraftTreasurer(idx, 'phone', e.target.value)}
                            placeholder="No. WhatsApp..."
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                          />
                          <input
                            type="text"
                            value={tr.note || ''}
                            onChange={(e) => updateDraftTreasurer(idx, 'note', e.target.value)}
                            placeholder="Fokus tugas / catatan..."
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Penanggung Jawab (PJ) Section (Netral) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Layers size={14} className="text-violet-600" />
                        5. Penanggung Jawab (PJ) Kelas (Netral)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Daftar mahasiswa yang bertugas sebagai Penanggung Jawab / Koordinator Kelas.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={populateFromRegisteredPjs}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Muat otomatis anggota yang memiliki peran PJ di kelas"
                      >
                        <Sparkles size={13} className="text-indigo-600" />
                        <span>Muat Anggota PJ</span>
                      </button>
                      <button
                        type="button"
                        onClick={addPjSlot}
                        className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Tambah PJ</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {((draft.pjs || draft.divisions || []).length === 0) ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center border border-dashed border-slate-200">
                        Belum ada Penanggung Jawab (PJ). Klik tombol "+ Tambah PJ" atau "Muat Anggota PJ" di atas.
                      </p>
                    ) : (
                      (draft.pjs || draft.divisions || []).map((pj, idx) => (
                        <div key={pj.id || idx} className="p-3.5 rounded-2xl bg-violet-50/40 border border-violet-200/80 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={pj.title || ''}
                              onChange={(e) => updateDraftPj(idx, 'title', e.target.value)}
                              placeholder="Contoh: Penanggung Jawab (PJ)"
                              className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 max-w-[200px]"
                            />
                            <div className="flex items-center gap-2">
                              {activeMembersList.length > 0 && (
                                <select
                                  className="text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-semibold max-w-[150px] truncate"
                                  onChange={(e) => handleSelectMemberFor(e.target.value, 'pj', idx)}
                                  defaultValue=""
                                >
                                  <option value="" disabled>-- Pilih Anggota --</option>
                                  {pjMembers.length > 0 && (
                                    <optgroup label="⭐ Anggota Berperan PJ">
                                      {pjMembers.map(m => (
                                        <option key={m.userId || m.uid || m.id} value={m.userId || m.uid || m.id}>
                                          {m.name || m.email} (PJ)
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {otherMembers.length > 0 && (
                                    <optgroup label="Mahasiswa Lainnya">
                                      {otherMembers.map(m => (
                                        <option key={m.userId || m.uid || m.id} value={m.userId || m.uid || m.id}>
                                          {m.name || m.email}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                              )}
                              <button
                                type="button"
                                onClick={() => removePjSlot(idx)}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors"
                                title="Hapus PJ"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={pj.name || pj.leaderName || ''}
                              onChange={(e) => updateDraftPj(idx, 'name', e.target.value)}
                              placeholder="Nama Lengkap PJ..."
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                            />
                            <input
                              type="text"
                              value={pj.phone || ''}
                              onChange={(e) => updateDraftPj(idx, 'phone', e.target.value)}
                              placeholder="No. WhatsApp..."
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                            />
                            <input
                              type="text"
                              value={pj.nim || ''}
                              onChange={(e) => updateDraftPj(idx, 'nim', e.target.value)}
                              placeholder="NIM (Opsional)..."
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                            />
                          </div>

                          <input
                            type="text"
                            value={pj.note || pj.description || ''}
                            onChange={(e) => updateDraftPj(idx, 'note', e.target.value)}
                            placeholder="Catatan / deskripsi peran (Contoh: Penanggung Jawab Kelas)..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveStructure}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan Struktur</span>
                    </>
                  )}
                </button>
              </div>

            </div>
        </ModalPortal>
      )}

    </div>
  );
}
