import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  BookOpen, 
  Brain, 
  HelpCircle, 
  Calendar, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  FileSpreadsheet, 
  Edit3, 
  X, 
  Save, 
  Layers,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isClassManager } from '../utils/permissions';

// Subcomponents
import UtsScheduleCountdown from './uts/UtsScheduleCountdown';
import UtsMaterialsHub from './uts/UtsMaterialsHub';
import UtsFlashcardsPro from './uts/UtsFlashcardsPro';
import UtsQuizEngine from './uts/UtsQuizEngine';
import UtsCheatsheet from './uts/UtsCheatsheet';

export default function ClassUTS({ 
  currentClass, 
  currentUser, 
  schedules = [], 
  tasks = [], 
  onUpdateClassSettings 
}) {
  const [activeSection, setActiveSection] = useState('schedule'); // 'schedule' | 'materials' | 'flashcards' | 'quiz' | 'cheatsheet'
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  const uts = currentClass?.uts || {};
  const role = currentClass?.userRole || 'student';
  const isOwner = currentClass?.ownerId === currentUser?.uid;
  const isManager = isClassManager(role, isOwner);

  // Storage key prefix
  const storagePrefix = `classy_uts_${currentClass?.id}_${currentUser?.uid || 'guest'}`;

  // Topic progress checklist
  const [checkedTopics, setCheckedTopics] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_checklist`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleTopic = (topicKey) => {
    setCheckedTopics(prev => {
      const next = { ...prev, [topicKey]: !prev[topicKey] };
      try {
        localStorage.setItem(`${storagePrefix}_checklist`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Default Materials, Flashcards & Quizzes if none in DB
  const defaultMaterials = [
    {
      id: 'mat-1',
      course: 'Pemrograman Web / Mobile',
      topics: [
        'Fundamental React: State, Props & Component Lifecycle',
        'React Hooks: useState, useEffect, useMemo, useRef',
        'Routing & SPA Navigation (React Router DOM)',
        'Komunikasi API, REST API & asynchronous state'
      ]
    },
    {
      id: 'mat-2',
      course: 'Basis Data & SQL',
      topics: [
        'Konsep RDBMS, Primary Key, Foreign Key & Relasi',
        'Normalisasi Database (1NF, 2NF, 3NF)',
        'Query Lanjutan: JOIN (Inner, Left, Right) & Aggregations',
        'Indexing & Integritas Data'
      ]
    },
    {
      id: 'mat-3',
      course: 'Rekayasa Perangkat Lunak',
      topics: [
        'Metodologi Pengembangan: Agile, Scrum, Waterfall',
        'Analisis Kebutuhan: Functional & Non-Functional Requirements',
        'UML Diagrams: Use Case, Activity & Class Diagram',
        'Testing & Quality Assurance'
      ]
    }
  ];

  const defaultFlashcards = [
    {
      id: 'fc-1',
      course: 'Pemrograman Web / Mobile',
      question: 'Kapan useEffect dijalankan jika dependency array-nya kosong ([])?',
      answer: 'Hanya sekali setelah render pertama (mirip componentDidMount), cocok untuk fetch data awal.'
    },
    {
      id: 'fc-2',
      course: 'Pemrograman Web / Mobile',
      question: 'Apa perbedaan mendasar antara state dan props di React?',
      answer: 'Props bersifat immutable dan dikirim dari parent ke child. State bersifat mutable dan dikelola internal oleh komponen itu sendiri.'
    },
    {
      id: 'fc-3',
      course: 'Basis Data & SQL',
      question: 'Apa tujuan utama dari normalisasi database (1NF sampai 3NF)?',
      answer: 'Mengurangi redundansi data, mencegah anomali (insert, update, delete), dan menjaga integritas data.'
    },
    {
      id: 'fc-4',
      course: 'Basis Data & SQL',
      question: 'Apa perbedaan antara INNER JOIN dan LEFT JOIN?',
      answer: 'INNER JOIN hanya mengembalikan baris yang cocok di kedua tabel. LEFT JOIN mengembalikan seluruh baris tabel kiri ditambah baris yang cocok dari tabel kanan.'
    },
    {
      id: 'fc-5',
      course: 'Rekayasa Perangkat Lunak',
      question: 'Apa itu Sprint dalam metodologi Scrum?',
      answer: 'Siklus waktu tetap (biasanya 1–4 minggu) di mana tim berkomitmen menyelesaikan sejumlah backlog fitur hingga siap rilis.'
    },
    {
      id: 'fc-6',
      course: 'Rekayasa Perangkat Lunak',
      question: 'Apa perbedaan antara Functional dan Non-Functional Requirement?',
      answer: 'Functional Requirement menjelaskan apa yang dilakukan sistem (fitur/fungsi). Non-Functional Requirement menjelaskan karakteristik sistem (performa, keamanan, skalabilitas).'
    }
  ];

  const defaultQuizzes = [
    {
      id: 'qz-1',
      course: 'Pemrograman Web / Mobile',
      question: 'Hook apa di React yang digunakan untuk mengakses nilai mutable yang tidak memicu re-render ketika diubah?',
      options: ['useState', 'useRef', 'useEffect', 'useReducer'],
      answer: 1,
      explanation: 'useRef menyimpan referensi mutable (.current) yang perubahannya tidak memicu render ulang komponen.'
    },
    {
      id: 'qz-2',
      course: 'Basis Data & SQL',
      question: 'Klausa SQL mana yang digunakan untuk memfilter hasil setelah operasi GROUP BY dijalankan?',
      options: ['WHERE', 'ORDER BY', 'HAVING', 'LIMIT'],
      answer: 2,
      explanation: 'HAVING digunakan khusus untuk memfilter kelompok baris yang sudah dihitung oleh fungsi agregat (GROUP BY).'
    },
    {
      id: 'qz-3',
      course: 'Rekayasa Perangkat Lunak',
      question: 'Diagram UML yang paling tepat untuk memodelkan urutan interaksi antar objek berdasarkan waktu adalah...',
      options: ['Class Diagram', 'Sequence Diagram', 'Use Case Diagram', 'Deployment Diagram'],
      answer: 1,
      explanation: 'Sequence Diagram berfokus pada alur pesan dan urutan waktu interaksi antar objek atau partisipan.'
    },
    {
      id: 'qz-4',
      course: 'Rekayasa Perangkat Lunak',
      question: 'Tahapan dalam Scrum di mana tim merefleksikan proses kerja dan mencari perbaikan untuk sprint berikutnya disebut...',
      options: ['Sprint Planning', 'Daily Standup', 'Sprint Review', 'Sprint Retrospective'],
      answer: 3,
      explanation: 'Sprint Retrospective adalah sesi evaluasi internal tim untuk meningkatkan efisiensi dan alur kerja di masa mendatang.'
    }
  ];

  const materialsList = uts.materials && uts.materials.length > 0 ? uts.materials : defaultMaterials;
  const flashcardsList = uts.flashcards && uts.flashcards.length > 0 ? uts.flashcards : defaultFlashcards;
  const quizzesList = uts.quizzes && uts.quizzes.length > 0 ? uts.quizzes : defaultQuizzes;

  // Progress summary
  const totalTopics = materialsList.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  const completedTopics = Object.values(checkedTopics).filter(Boolean).length;
  const studyProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Komti Settings Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(uts.title || 'Pusat Persiapan & Latihan UTS');
  const [editBanner, setEditBanner] = useState(uts.banner || '🔥 MINGGU UTS TELAH TIBA! Tetap semangat, jaga kesehatan, dan maksimalkan persiapan ujian! 🔥');
  const [editNotes, setEditNotes] = useState(uts.notes || 'Fokus belajar, kuasai kisi-kisi pertemuan 1–7, dan uji kesiapan dengan simulasi CBT!');
  const [savingSettings, setSavingSettings] = useState(false);

  const handleSaveUtsSettings = async (e) => {
    e.preventDefault();
    if (!onUpdateClassSettings || !currentClass?.id) return;
    setSavingSettings(true);
    const toastId = toast.loading('Menyimpan perubahan informasi UTS...');
    try {
      await onUpdateClassSettings(currentClass.id, {
        uts: {
          ...uts,
          enabled: true,
          title: editTitle.trim(),
          banner: editBanner.trim(),
          notes: editNotes.trim(),
          updatedAt: new Date().toISOString()
        }
      });
      toast.success('Informasi UTS berhasil diperbarui!', { id: toastId });
      setShowEditModal(false);
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message, { id: toastId });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header Banner Zone */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 p-6 sm:p-8 text-white shadow-xl shadow-red-500/20">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-12 top-6 opacity-15 hidden sm:block pointer-events-none">
          <Flame size={120} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wider text-yellow-200">
              <Flame size={14} className="text-yellow-300 animate-bounce" />
              <span>ZONA PERSIAPAN MINGGU UTS • {currentClass?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {uts.title || 'Pusat Persiapan & Latihan UTS Terpadu'}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
              {uts.notes || 'Jadwal ujian, rangkuman materi lengkap per mata kuliah, flashcard interaktif, dan simulasi CBT siap membantu kamu lulus dengan nilai A!'}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            {isManager && (
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer self-start sm:self-auto"
              >
                <Edit3 size={13} />
                <span>Kelola Info UTS</span>
              </button>
            )}

            {/* Quick Study Progress Gauge */}
            <div className="bg-black/25 backdrop-blur-md border border-white/15 rounded-2xl p-3 min-w-[170px]">
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-white mb-1.5">
                <span className="flex items-center gap-1 text-[11px] text-yellow-200">
                  <TrendingUp size={13} />
                  <span>Progres Belajar</span>
                </span>
                <span className="font-mono text-yellow-300 font-extrabold">{studyProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-300 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${studyProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-white/80 mt-1">
                {completedTopics} dari {totalTopics} kisi-kisi tuntas dipelajari
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Feature Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-rose-200/80 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
        {[
          { id: 'schedule', label: 'Jadwal & Countdown', icon: Calendar, badge: 'Live' },
          { id: 'materials', label: 'Materi & Kisi-Kisi', icon: BookOpen, badge: `${completedTopics}/${totalTopics}` },
          { id: 'flashcards', label: 'Flashcard Belajar', icon: Brain, badge: `${flashcardsList.length}` },
          { id: 'quiz', label: 'Latihan Quiz', icon: HelpCircle, badge: 'Quiz' },
          { id: 'cheatsheet', label: 'Cheatsheet 1 Lembar', icon: FileSpreadsheet, badge: 'Quick' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-red-600 hover:bg-rose-50/50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  isActive ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Section Content Rendering */}
      {activeSection === 'schedule' && (
        <UtsScheduleCountdown
          uts={uts}
          schedules={schedules}
          onSelectCourse={(courseName) => {
            setSelectedCourseFilter(courseName);
            setActiveSection('materials');
          }}
        />
      )}

      {activeSection === 'materials' && (
        <UtsMaterialsHub
          materials={materialsList}
          checkedTopics={checkedTopics}
          onToggleTopic={handleToggleTopic}
          selectedCourse={selectedCourseFilter === 'all' ? null : selectedCourseFilter}
          onSelectCourse={setSelectedCourseFilter}
        />
      )}

      {activeSection === 'flashcards' && (
        <UtsFlashcardsPro
          flashcards={flashcardsList}
          selectedCourse={selectedCourseFilter === 'all' ? null : selectedCourseFilter}
          onSelectCourse={setSelectedCourseFilter}
          storagePrefix={storagePrefix}
        />
      )}

      {activeSection === 'quiz' && (
        <UtsQuizEngine
          quizzes={quizzesList}
          selectedCourse={selectedCourseFilter === 'all' ? null : selectedCourseFilter}
          onSelectCourse={setSelectedCourseFilter}
        />
      )}

      {activeSection === 'cheatsheet' && (
        <UtsCheatsheet
          materials={materialsList}
          selectedCourseFilter={selectedCourseFilter}
          onSelectCourseFilter={setSelectedCourseFilter}
        />
      )}

      {/* 4. Komti Settings Modal */}
      {showEditModal && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-yellow-300" />
                <h3 className="font-black text-sm">Pengaturan Zona Minggu UTS</h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveUtsSettings} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Judul Halaman UTS</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Pusat Persiapan & Latihan UTS"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Teks Sepanduk Berjalan (Marquee Banner)</label>
                <textarea
                  rows={2}
                  value={editBanner}
                  onChange={(e) => setEditBanner(e.target.value)}
                  placeholder="Teks yang akan berjalan di atas ruang kelas..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Catatan Penting / Pesan Motivasi Komti</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Pesan motivasi atau instruksi teknis untuk teman sekelas..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
