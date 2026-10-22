import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Code2, 
  HelpCircle, 
  Lightbulb,
  ExternalLink,
  Layers,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtsMaterialsHub({ 
  materials = [], 
  checkedTopics = {}, 
  onToggleTopic, 
  selectedCourseFilter = 'all',
  onSelectCourseFilter 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState({});

  const toggleExpand = (id) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract all unique courses
  const courseList = ['all', ...Array.from(new Set(materials.map(m => m.course).filter(Boolean)))];

  const filteredMaterials = materials.filter(mat => {
    const matchesCourse = selectedCourseFilter === 'all' || mat.course === selectedCourseFilter;
    const matchesSearch = !searchQuery.trim() || 
      mat.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat.modules || []).some(mod => 
        mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mod.keyPoints || []).some(kp => kp.toLowerCase().includes(searchQuery.toLowerCase()))
      ) ||
      (mat.topics || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCourse && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Filter Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Course Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {courseList.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onSelectCourseFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCourseFilter === c
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {c === 'all' ? 'Semua Mata Kuliah' : c}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari materi atau topik..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-slate-50 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 2. List of Course Materials */}
      <div className="space-y-6">
        {filteredMaterials.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
            Tidak ada materi yang sesuai dengan pencarian atau filter.
          </div>
        ) : (
          filteredMaterials.map((mat, matIdx) => {
            const modules = mat.modules || [
              {
                id: `${mat.id}-mod-1`,
                title: 'Konsep Dasar & Teori Fundamental (Pertemuan 1 - 3)',
                keyPoints: [
                  'Pemahaman definisi, arsitektur dasar, dan tujuan pemanfaatan sistem.',
                  'Perbedaan paradigma lama vs paradigma modern yang berlaku saat ini.',
                  'Komponen pembentuk utama dan relasi antar subsistem.'
                ],
                cheatsheet: 'Formula / Sintaks Kunci:\n• Konsep dasar: Input -> Proses -> Output\n• Validasi struktur data dan penanganan kesalahan awal.',
                examTip: 'Dosen sering menanyakan perbedaan analitis dalam bentuk tabel komparasi.',
                sampleQuestion: 'Jelaskan perbedaan mendasar antara kedua arsitektur tersebut dan berikan contoh penerapannya di industri!'
              },
              {
                id: `${mat.id}-mod-2`,
                title: 'Studi Kasus Lanjutan & Implementasi (Pertemuan 4 - 7)',
                keyPoints: [
                  'Pola perancangan, normalisasi aturan bisnis, dan optimasi kinerja.',
                  'Alur eksekusi proses bisnis dari awal inisiasi sampai laporan akhir.',
                  'Penyelesaian studi kasus nyata dan penanganan skenario batas (edge cases).'
                ],
                cheatsheet: 'Checklist Langkah Analisis:\n1. Identifikasi Entitas\n2. Tentukan Hubungan & Kardinalitas\n3. Uji Normalitas\n4. Simulasikan Alur',
                examTip: 'Hafalkan urutan tahapan penyelesaian masalah, poin nilai terbesar ada pada diagram/alur.',
                sampleQuestion: 'Diberikan sebuah skenario bisnis, buatkan rancangan solusi sistematis yang paling efisien!'
              }
            ];

            return (
              <div key={mat.id || matIdx} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Course Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                      <span>Mata Kuliah UTS</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {mat.course}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Rangkuman Lengkap Pertemuan 1 s/d 7 • {modules.length} Modul Terstruktur
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white/10 text-white border border-white/10">
                      {mat.topics?.length || 4} Kisi-kisi Inti
                    </span>
                  </div>
                </div>

                {/* Sub-Topics Checklist */}
                {mat.topics && mat.topics.length > 0 && (
                  <div className="p-4 sm:p-5 bg-rose-50/40 border-b border-rose-100 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-red-600" />
                      <span>Daftar Kisi-kisi yang Wajib Dikuasai:</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mat.topics.map((top, tIdx) => {
                        const topKey = `${mat.id || matIdx}_${tIdx}`;
                        const isDone = Boolean(checkedTopics[topKey]);
                        return (
                          <button
                            key={tIdx}
                            type="button"
                            onClick={() => onToggleTopic(topKey)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              isDone 
                                ? 'bg-white border-emerald-300 text-emerald-900' 
                                : 'bg-white border-slate-200 hover:border-red-300 text-slate-700'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <Circle size={15} className="text-slate-300 shrink-0 mt-0.5" />
                            )}
                            <span className={isDone ? 'line-through text-slate-400 font-medium' : 'font-medium leading-relaxed'}>
                              {top}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Modules Deep Dive */}
                <div className="p-4 sm:p-6 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Rangkuman Materi Mendalam & Bedah Kisi-Kisi
                  </h4>

                  {modules.map((mod, modIdx) => {
                    const isExpanded = expandedModules[mod.id] ?? (modIdx === 0);
                    return (
                      <div 
                        key={mod.id || modIdx}
                        className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 transition-all"
                      >
                        {/* Module Header Button */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(mod.id)}
                          className="w-full flex items-center justify-between p-4 bg-white text-left hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-xs font-black shrink-0">
                              {modIdx + 1}
                            </div>
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                              {mod.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-[11px] font-bold hidden sm:inline">
                              {isExpanded ? 'Tutup' : 'Buka Rangkuman'}
                            </span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        {/* Module Content */}
                        {isExpanded && (
                          <div className="p-5 border-t border-slate-200/80 bg-white space-y-4 text-xs leading-relaxed text-slate-700 animate-in fade-in duration-200">
                            {/* Key Points */}
                            <div className="space-y-2">
                              <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                <BookOpen size={14} className="text-red-600" />
                                <span>Poin Konsep Inti yang Harus Dipahami:</span>
                              </p>
                              <ul className="space-y-1.5 pl-5 list-disc text-slate-600 marker:text-red-500">
                                {(mod.keyPoints || []).map((kp, kIdx) => (
                                  <li key={kIdx} className="leading-relaxed">{kp}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Cheatsheet / Formula Snippet */}
                            {mod.cheatsheet && (
                              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1 shadow-inner">
                                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                                  <Code2 size={12} />
                                  <span>Catatan Ringkas / Cheatsheet Rumus:</span>
                                </div>
                                <pre className="whitespace-pre-wrap font-mono leading-relaxed text-slate-200">
                                  {mod.cheatsheet}
                                </pre>
                              </div>
                            )}

                            {/* Exam Tip & Sample Question */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {mod.examTip && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
                                    <Lightbulb size={13} className="text-amber-600" />
                                    <span>Tips Ujian dari Dosen:</span>
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
                                    {mod.examTip}
                                  </p>
                                </div>
                              )}

                              {mod.sampleQuestion && (
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-rose-800 text-[11px]">
                                    <HelpCircle size={13} className="text-rose-600" />
                                    <span>Prediksi Model Soal UTS:</span>
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-rose-900 italic">
                                    "{mod.sampleQuestion}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
