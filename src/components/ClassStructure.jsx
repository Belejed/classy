import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, 
  ShieldCheck, 
  Wallet, 
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

export default function ClassStructure({
  currentClass,
  currentUser
}) {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [divisionSearch, setDivisionSearch] = useState('');
  // View mode: 'map' (Bagan Bergaris / Org Chart) or 'cards' (Daftar Kartu Grid)
  const [viewMode, setViewMode] = useState('map');

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
      treasurers: Array.isArray(structure?.treasurers) && structure.treasurers.length > 0 ? structure.treasurers : [
        { id: 'b1', title: 'Bendahara 1', name: '', phone: '', nim: '', note: 'Pengelolaan kas & tagihan kelas' },
        { id: 'b2', title: 'Bendahara 2', name: '', phone: '', nim: '', note: 'Pencatatan kas & rekapitulasi' }
      ],
      divisions: Array.isArray(structure?.divisions) ? structure.divisions : [],
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

  const updateDraftDivision = (index, field, val) => {
    setDraft(prev => {
      const nextD = [...(prev.divisions || [])];
      nextD[index] = { ...nextD[index], [field]: val };
      return { ...prev, divisions: nextD };
    });
  };

  const addDivisionSlot = () => {
    setDraft(prev => ({
      ...prev,
      divisions: [
        ...(prev.divisions || []),
        {
          id: 'div_' + Date.now(),
          title: '',
          leaderName: '',
          phone: '',
          nim: '',
          description: ''
        }
      ]
    }));
  };

  const removeDivisionSlot = (index) => {
    setDraft(prev => {
      const nextD = prev.divisions.filter((_, i) => i !== index);
      return { ...prev, divisions: nextD };
    });
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
    } else if (targetType === 'treasurer' && targetIndex !== null) {
      updateDraftTreasurer(targetIndex, 'name', mem.name || '');
      if (mem.phoneNumber) updateDraftTreasurer(targetIndex, 'phone', mem.phoneNumber);
      if (mem.nim) updateDraftTreasurer(targetIndex, 'nim', mem.nim);
    } else if (targetType === 'division' && targetIndex !== null) {
      updateDraftDivision(targetIndex, 'leaderName', mem.name || '');
      if (mem.phoneNumber) updateDraftDivision(targetIndex, 'phone', mem.phoneNumber);
      if (mem.nim) updateDraftDivision(targetIndex, 'nim', mem.nim);
    }
  };

  // Filtered divisions for search
  const filteredDivisions = useMemo(() => {
    const list = resolvedStructure.divisions || [];
    if (!divisionSearch.trim()) return list;
    const q = divisionSearch.toLowerCase();
    return list.filter(d => 
      (d.title || '').toLowerCase().includes(q) ||
      (d.leaderName || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    );
  }, [resolvedStructure.divisions, divisionSearch]);

  const activeMembersList = useMemo(() => {
    return (currentClass?.members || []).filter(m => m && m.role !== 'superadmin');
  }, [currentClass?.members]);

  const divisionsCount = resolvedStructure.divisions?.length || 0;
  const treasurersCount = resolvedStructure.treasurers?.length || 0;

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
              Bagan alur koordinasi & kepengurusan kelas: Komti, Wakil Komti, Bendahara, serta Kepala Divisi dan Penanggung Jawab (PJ) kelas {currentClass?.name || ''}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* View Mode Toggle: Bagan Pohon vs Kartu Grid */}
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
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Pimpinan
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Keuangan
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> Divisi & PJ
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>Garis struktur otomatis menghubungkan setiap tingkatan koordinasi</span>
            </div>
          </div>

          {/* Org Tree Canvas Container (Pan/Scrollable on mobile) */}
          <div className="w-full overflow-x-auto bg-slate-50/70 border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs relative no-scrollbar">
            
            <div className="min-w-[760px] max-w-5xl mx-auto flex flex-col items-center">
              
              {/* =================== LEVEL 1: PIMPINAN (KOMTI & WAKIL) =================== */}
              <div className="relative w-full flex flex-col items-center">
                
                {/* Horizontal coordination bar between Komti & Wakil */}
                <div className="flex items-center justify-center gap-8 sm:gap-12 relative z-10 w-full max-w-3xl">
                  
                  {/* Komti Card Node */}
                  <div className="w-[300px] sm:w-[320px] bg-white rounded-2xl p-4 sm:p-5 border-2 border-amber-300 shadow-md hover:shadow-lg transition-all relative group">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                        {resolvedStructure.komti.name ? resolvedStructure.komti.name[0].toUpperCase() : <Crown size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                          <Crown size={10} className="text-amber-600" />
                          KOMTI (KETUA KELAS)
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 truncate">
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
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                            >
                              <MessageCircle size={11} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Nomor belum ada</span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Line Connector between Komti and Wakil */}
                  <div className="hidden sm:flex flex-col items-center justify-center shrink-0 w-16">
                    <div className="w-full border-t-2 border-dashed border-indigo-300 relative">
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-extrabold uppercase tracking-widest text-indigo-500 whitespace-nowrap bg-slate-50 px-1">
                        Mitra
                      </span>
                    </div>
                  </div>

                  {/* Wakil Komti Card Node */}
                  <div className="w-[300px] sm:w-[320px] bg-white rounded-2xl p-4 sm:p-5 border-2 border-indigo-300 shadow-md hover:shadow-lg transition-all relative group">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                        {resolvedStructure.viceKomti.name ? resolvedStructure.viceKomti.name[0].toUpperCase() : <ShieldCheck size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[9px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                          <ShieldCheck size={10} className="text-indigo-600" />
                          WAKIL KOMTI
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 truncate">
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
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                            >
                              <MessageCircle size={11} />
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

                {/* Vertical Stem Line: Level 1 (Pimpinan) -> Level 2 (Bendahara) */}
                <div className="flex flex-col items-center my-0">
                  <div className="w-0.5 h-10 bg-slate-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
                    Instruksi & Koordinasi Kas
                  </div>
                  <div className="w-0.5 h-6 bg-slate-300" />
                  <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 -mt-1.5" />
                </div>

              </div>

              {/* =================== LEVEL 2: BENDAHARA KELAS =================== */}
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

                {/* Vertical Stem Line: Level 2 (Bendahara) -> Level 3 (Divisi / PJ) */}
                <div className="flex flex-col items-center my-0">
                  <div className="w-0.5 h-10 bg-slate-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
                    Operasional & Pembagian Divisi
                  </div>
                  <div className="w-0.5 h-8 bg-slate-300" />
                </div>

              </div>

              {/* =================== LEVEL 3: KEPALA DIVISI & PJ =================== */}
              <div className="relative w-full">
                
                {divisionsCount === 0 ? (
                  <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-300 text-center max-w-md mx-auto space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                      <Layers size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Belum Ada Divisi / PJ</p>
                    <p className="text-[11px] text-slate-500">
                      Tambahkan Kepala Divisi atau PJ Matkul agar bagan terhubung ke seluruh tim kerja kelas.
                    </p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs"
                      >
                        <Plus size={12} />
                        <span>Tambah Divisi</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full">
                    
                    {/* Horizontal Branching Bar spanning all division cards */}
                    {divisionsCount > 1 && (
                      <div className="w-full flex items-center justify-center mb-0">
                        <div 
                          className="border-t-2 border-slate-300 relative"
                          style={{
                            width: `calc(${Math.min(divisionsCount, 4) * 230}px - 140px)`,
                            maxWidth: '92%'
                          }}
                        >
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-violet-600 ring-4 ring-violet-100" />
                        </div>
                      </div>
                    )}

                    {/* Grid of Division & PJ Nodes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                      {resolvedStructure.divisions.map((div, idx) => (
                        <div key={div.id || idx} className="relative flex flex-col items-center">
                          
                          {/* Dropper stem leading into each card */}
                          <div className="w-0.5 h-6 bg-slate-300 relative">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>

                          {/* Division Card Node */}
                          <div className="w-full bg-white rounded-2xl p-4 border-2 border-violet-200/90 shadow-sm hover:border-violet-400 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[9px] font-extrabold uppercase truncate max-w-[170px]">
                                  {div.title || 'Divisi / PJ'}
                                </span>
                                {div.phone && getWhatsAppUrl(div.phone, div.leaderName, currentClass?.name) && (
                                  <a
                                    href={getWhatsAppUrl(div.phone, div.leaderName, currentClass?.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-50 transition-colors shrink-0"
                                    title="WhatsApp PJ"
                                  >
                                    <MessageCircle size={13} />
                                  </a>
                                )}
                              </div>

                              <div>
                                <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                  {div.leaderName || <span className="text-slate-400 italic font-normal">Belum ada PJ</span>}
                                </h4>
                                {div.nim && (
                                  <p className="text-[10px] font-mono text-slate-500">NIM: {div.nim}</p>
                                )}
                              </div>

                              {div.description && (
                                <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl line-clamp-2 leading-relaxed">
                                  {div.description}
                                </p>
                              )}
                            </div>

                            {div.phone && (
                              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                <span className="font-mono text-slate-500 truncate mr-2">{div.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPhone(div.phone, `div_map_${idx}`)}
                                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0"
                                  title="Salin"
                                >
                                  {copiedKey === `div_map_${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                </button>
                              </div>
                            )}
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
          
          {/* TIER 1: PIMPINAN KELAS (KOMTI & WAKIL KOMTI) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Tingkat 1 · Pimpinan & Koordinator Kelas
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card: KOMTI */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-amber-200/80 hover:border-amber-400/80 transition-all shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-amber-50 rounded-full blur-xl group-hover:scale-125 transition-transform pointer-events-none" />
                
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                      {resolvedStructure.komti.name ? resolvedStructure.komti.name[0].toUpperCase() : <Crown size={24} />}
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

              {/* Card: WAKIL KOMTI */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-indigo-200/80 hover:border-indigo-400/80 transition-all shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-50 rounded-full blur-xl group-hover:scale-125 transition-transform pointer-events-none" />

                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                      {resolvedStructure.viceKomti.name ? resolvedStructure.viceKomti.name[0].toUpperCase() : <ShieldCheck size={24} />}
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

          {/* TIER 2: BENDAHARA KELAS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Tingkat 2 · Bendahara Kelas
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

          {/* TIER 3: KEPALA DIVISI & PENANGGUNG JAWAB (PJ) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Tingkat 3 · Kepala Divisi & Penanggung Jawab (PJ)
                </h2>
              </div>

              {/* Quick search input */}
              {resolvedStructure.divisions.length > 2 && (
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={divisionSearch}
                    onChange={(e) => setDivisionSearch(e.target.value)}
                    placeholder="Cari divisi atau nama PJ..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {resolvedStructure.divisions.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                  <Layers size={24} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-bold text-sm text-slate-900">Belum Ada Divisi atau PJ Ditambahkan</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Komti atau Wakil Komti dapat menambahkan Kepala Divisi (seperti Akademik, Perlengkapan, Acara) atau Penanggung Jawab Mata Kuliah (PJ Matkul) di sini.
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={handleOpenEdit}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Tambah Divisi / PJ Pertama</span>
                  </button>
                )}
              </div>
            ) : filteredDivisions.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                Tidak ditemukan divisi atau PJ dengan kata kunci "{divisionSearch}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDivisions.map((div, idx) => {
                  const waLink = getWhatsAppUrl(div.phone, div.leaderName, currentClass?.name);
                  return (
                    <div
                      key={div.id || idx}
                      className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-violet-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold text-sm">
                            <Layers size={18} />
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold">
                            Divisi / PJ
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-600 block">
                            {div.title || 'Divisi / PJ Kelas'}
                          </span>
                          <h4 className="font-extrabold text-base text-slate-900 mt-0.5">
                            {div.leaderName || <span className="text-slate-400 italic font-normal">Belum ada koordinator</span>}
                          </h4>
                          {div.nim && (
                            <p className="text-[11px] font-mono text-slate-500">NIM: {div.nim}</p>
                          )}
                        </div>

                        {div.description && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                            {div.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {div.phone ? (
                          <>
                            <button
                              onClick={() => handleCopyPhone(div.phone, `div_${idx}`)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                              title="Salin nomor"
                            >
                              {copiedKey === `div_${idx}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto"
                              >
                                <MessageCircle size={12} />
                                <span>Hubungi PJ</span>
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
            )}
          </section>

        </div>
      )}

      {/* EDIT MODAL PORTAL (Only for Komti & Wakil Komti) */}
      {isEditing && draft && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-sans">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => !saving && setIsEditing(false)}
            />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
              
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

                {/* 3. Bendahara Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Wallet size={14} className="text-emerald-600" />
                      3. Bendahara Kelas
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

                {/* 4. Divisi & PJ Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers size={14} className="text-violet-600" />
                      4. Kepala Divisi & Penanggung Jawab (PJ)
                    </span>
                    <button
                      type="button"
                      onClick={addDivisionSlot}
                      className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Tambah Divisi / PJ</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(draft.divisions || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center border border-dashed border-slate-200">
                        Belum ada Divisi atau PJ. Klik tombol "+ Tambah Divisi / PJ" di atas untuk menambahkan.
                      </p>
                    ) : (
                      (draft.divisions || []).map((div, idx) => (
                        <div key={div.id || idx} className="p-3.5 rounded-2xl bg-violet-50/40 border border-violet-200/70 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={div.title || ''}
                              onChange={(e) => updateDraftDivision(idx, 'title', e.target.value)}
                              placeholder="Nama Divisi / Judul PJ (Contoh: PJ Matkul Basis Data)"
                              className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex-1"
                            />
                            <div className="flex items-center gap-2">
                              {activeMembersList.length > 0 && (
                                <select
                                  className="text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600"
                                  onChange={(e) => handleSelectMemberFor(e.target.value, 'division', idx)}
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
                                onClick={() => removeDivisionSlot(idx)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                                title="Hapus divisi"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={div.leaderName || ''}
                              onChange={(e) => updateDraftDivision(idx, 'leaderName', e.target.value)}
                              placeholder="Nama Koordinator / PJ..."
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                            />
                            <input
                              type="text"
                              value={div.phone || ''}
                              onChange={(e) => updateDraftDivision(idx, 'phone', e.target.value)}
                              placeholder="No. WhatsApp / HP..."
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                            />
                          </div>

                          <input
                            type="text"
                            value={div.description || ''}
                            onChange={(e) => updateDraftDivision(idx, 'description', e.target.value)}
                            placeholder="Deskripsi tugas atau ruang lingkup (Contoh: Menghubungi dosen & share link praktikum)"
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
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
