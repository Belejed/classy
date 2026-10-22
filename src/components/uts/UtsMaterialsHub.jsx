import React, { useState } from 'react';
import { 
  BookOpen, 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Code2, 
  Lightbulb, 
  HelpCircle, 
  Sparkles,
  Layers,
  Search
} from 'lucide-react';

export default function UtsMaterialsHub({ 
  materials = [], 
  checkedTopics = {}, 
  onToggleTopic,
  selectedCourse,
  onSelectCourse,
  isManager = false,
  onOpenManage
}) {
  const [activeCourseId, setActiveCourseId] = useState(selectedCourse || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState({});

  const toggleExpand = (id) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentMaterial = materials.find(m => m.course === activeCourseId || m.id === activeCourseId);

  // If no course selected, display the Course Selection Cards
  if (!activeCourseId || !currentMaterial) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Pilih Mata Kuliah untuk Membaca Materi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik salah satu mata kuliah di bawah untuk membuka rangkuman & kisi-kisi lengkapnya.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {isManager && onOpenManage && (
              <button
                type="button"
                onClick={() => onOpenManage('material')}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Kelola Mata Kuliah (Komti)</span>
              </button>
            )}
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200">
              {materials.length} Mata Kuliah Tersedia
            </span>
          </div>
        </div>

        {/* Course Grid Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {materials.map((mat, idx) => {
            const topicCount = mat.topics?.length || 0;
            const completedCount = (mat.topics || []).filter((_, tIdx) => 
              checkedTopics[`${mat.id || idx}_${tIdx}`]
            ).length;
            const progress = topicCount > 0 ? Math.round((completedCount / topicCount) * 100) : 0;

            return (
              <div
                key={mat.id || idx}
                onClick={() => {
                  setActiveCourseId(mat.course || mat.id);
                  if (onSelectCourse) onSelectCourse(mat.course);
                }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <BookOpen size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {mat.code || `MK-${idx + 1}`}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
                      {mat.course}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {mat.description || 'Rangkuman lengkap teori pertemuan 1–7, formula rumus, dan kisi-kisi soal dosen.'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="text-[11px] text-slate-400">Kisi-kisi Dikuasai</span>
                    <span className="text-red-600 font-mono">{completedCount}/{topicCount} Topik</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <button 
                    type="button"
                    className="w-full mt-2 py-2 rounded-xl bg-slate-900 group-hover:bg-red-600 text-white text-xs font-bold transition-colors text-center"
                  >
                    Buka Materi Mata Kuliah Ini →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Single Course Detail View
  const modules = currentMaterial.modules || [
    {
      id: `${currentMaterial.id}-mod-1`,
      title: 'Konsep Dasar & Teori Fundamental (Pertemuan 1 - 3)',
      keyPoints: [
        'Pemahaman definisi, arsitektur dasar, dan tujuan pemanfaatan sistem.',
        'Perbedaan paradigma lama vs paradigma modern yang berlaku saat ini.',
        'Komponen pembentuk utama dan relasi antar subsistem.'
      ],
      cheatsheet: 'Formula / Sintaks Kunci:\n• Input -> Validasi -> Pemrosesan -> Output\n• Error handling dan optimasi beban eksekusi.',
      examTip: 'Dosen sering menanyakan komparasi analitis dalam bentuk tabel.',
      sampleQuestion: 'Jelaskan perbedaan mendasar antara kedua arsitektur tersebut dan berikan contoh penerapannya di industri!'
    },
    {
      id: `${currentMaterial.id}-mod-2`,
      title: 'Studi Kasus Lanjutan & Implementasi (Pertemuan 4 - 7)',
      keyPoints: [
        'Pola perancangan, normalisasi aturan bisnis, dan optimasi kinerja.',
        'Alur eksekusi proses bisnis dari awal inisiasi sampai laporan akhir.',
        'Penyelesaian studi kasus nyata dan penanganan skenario batas (edge cases).'
      ],
      cheatsheet: 'Langkah Analisis Soal:\n1. Identifikasi Entitas\n2. Tentukan Aturan Bisnis\n3. Uji Normalitas\n4. Simulasikan Solusi',
      examTip: 'Hafalkan urutan tahapan penyelesaian masalah, nilai terbesar ada pada bagan/alur.',
      sampleQuestion: 'Diberikan sebuah skenario bisnis, buatkan rancangan solusi sistematis yang paling efisien!'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveCourseId(null);
              if (onSelectCourse) onSelectCourse('all');
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
            title="Kembali ke Daftar Mata Kuliah"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
              Materi Terbuka
            </span>
            <h3 className="text-lg font-black text-slate-900 leading-tight">
              {currentMaterial.course}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveCourseId(null);
            if (onSelectCourse) onSelectCourse('all');
          }}
          className="text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer self-start sm:self-auto"
        >
          ← Ganti Mata Kuliah
        </button>
      </div>

      {/* Checklist Kisi-kisi Mata Kuliah Ini */}
      {currentMaterial.topics && currentMaterial.topics.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Sparkles size={14} className="text-red-600" />
            <span>Kisi-kisi Ujian {currentMaterial.course}:</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentMaterial.topics.map((top, tIdx) => {
              const topKey = `${currentMaterial.id}_${tIdx}`;
              const isDone = Boolean(checkedTopics[topKey]);
              return (
                <button
                  key={tIdx}
                  type="button"
                  onClick={() => onToggleTopic(topKey)}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                    isDone 
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-bold' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <span className={isDone ? 'line-through text-slate-400 font-medium' : 'leading-relaxed'}>
                    {top}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modules List for this Course */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
          Modul Rangkuman & Pembahasan Soal
        </h4>

        {modules.map((mod, modIdx) => {
          const isExpanded = expandedModules[mod.id] ?? (modIdx === 0);
          return (
            <div 
              key={mod.id || modIdx}
              className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xs transition-all"
            >
              <button
                type="button"
                onClick={() => toggleExpand(mod.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xs font-black shrink-0">
                    {modIdx + 1}
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 truncate">
                    {mod.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-bold hidden sm:inline">
                    {isExpanded ? 'Tutup' : 'Buka Rangkuman'}
                  </span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {isExpanded && (
                <div className="p-6 border-t border-slate-100 space-y-4 text-xs leading-relaxed text-slate-700 animate-in fade-in duration-200">
                  {/* Poin Konsep Inti */}
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

                  {/* Cheatsheet Snippet */}
                  {mod.cheatsheet && (
                    <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1 shadow-inner">
                      <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                        <Code2 size={12} />
                        <span>Catatan Formula / Rumus Kunci:</span>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono leading-relaxed text-slate-200">
                        {mod.cheatsheet}
                      </pre>
                    </div>
                  )}

                  {/* Tips Dosen & Contoh Soal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {mod.examTip && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
                          <Lightbulb size={13} className="text-amber-600" />
                          <span>Tips Dosen Pengampu:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
                          {mod.examTip}
                        </p>
                      </div>
                    )}

                    {mod.sampleQuestion && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
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
}
