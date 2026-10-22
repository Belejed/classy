import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  BookOpen, 
  Brain, 
  HelpCircle, 
  CheckCircle2, 
  Circle, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Award, 
  Sparkles, 
  Calendar, 
  Clock, 
  Info, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  Check, 
  AlertCircle,
  TrendingUp,
  Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isClassManager } from '../utils/permissions';

export default function ClassUTS({ 
  currentClass, 
  currentUser, 
  schedules = [], 
  tasks = [], 
  onUpdateClassSettings 
}) {
  const [activeSection, setActiveSection] = useState('summary'); // 'summary' | 'materials' | 'flashcards' | 'quiz'

  const uts = currentClass?.uts || {};
  const role = currentClass?.userRole || 'student';
  const isOwner = currentClass?.ownerId === currentUser?.uid;
  const isManager = isClassManager(role, isOwner);

  // Default study materials if none provided yet
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

  // Default Flashcards
  const defaultFlashcards = [
    {
      id: 'fc-1',
      course: 'React / Web',
      question: 'Kapan useEffect dijalankan jika dependency array-nya kosong ([])?',
      answer: 'Hanya sekali setelah render pertama (mirip componentDidMount), cocok untuk fetch data awal.'
    },
    {
      id: 'fc-2',
      course: 'React / Web',
      question: 'Apa perbedaan mendasar antara state dan props di React?',
      answer: 'Props bersifat immutable dan dikirim dari parent ke child. State bersifat mutable dan dikelola internal oleh komponen itu sendiri.'
    },
    {
      id: 'fc-3',
      course: 'Database',
      question: 'Apa tujuan utama dari normalisasi database (1NF sampai 3NF)?',
      answer: 'Mengurangi redundansi data, mencegah anomali (insert, update, delete), dan menjaga integritas data.'
    },
    {
      id: 'fc-4',
      course: 'Database',
      question: 'Apa perbedaan antara INNER JOIN dan LEFT JOIN?',
      answer: 'INNER JOIN hanya mengembalikan baris yang cocok di kedua tabel. LEFT JOIN mengembalikan seluruh baris tabel kiri ditambah baris yang cocok dari tabel kanan.'
    },
    {
      id: 'fc-5',
      course: 'RPL',
      question: 'Apa itu Sprint dalam metodologi Scrum?',
      answer: 'Siklus waktu tetap (biasanya 1–4 minggu) di mana tim berkomitmen menyelesaikan sejumlah backlog fitur hingga siap rilis.'
    },
    {
      id: 'fc-6',
      course: 'Tips Ujian',
      question: 'Strategi terbaik menjawab soal esai atau analisis studi kasus?',
      answer: 'Baca soal sampai tuntas, jawab dengan poin-poin terstruktur (Definisi -> Penerapan -> Contoh Kasus), dan kelola waktu per bobot nilai soal.'
    }
  ];

  // Default Quizzes
  const defaultQuizzes = [
    {
      id: 'qz-1',
      course: 'Pemrograman Web',
      question: 'Hook apa di React yang digunakan untuk mengakses nilai mutable yang tidak memicu re-render ketika diubah?',
      options: ['useState', 'useRef', 'useEffect', 'useReducer'],
      answer: 1,
      explanation: 'useRef menyimpan referensi mutable (.current) yang perubahannya tidak memicu render ulang komponen.'
    },
    {
      id: 'qz-2',
      course: 'Basis Data',
      question: 'Klausa SQL mana yang digunakan untuk memfilter hasil setelah operasi GROUP BY dijalankan?',
      options: ['WHERE', 'ORDER BY', 'HAVING', 'LIMIT'],
      answer: 2,
      explanation: 'HAVING digunakan khusus untuk memfilter kelompok baris yang sudah dihitung oleh fungsi agregat (GROUP BY), sedangkan WHERE memfilter sebelum agregasi.'
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
      course: 'Sistem Informasi',
      question: 'Tahapan dalam Scrum di mana tim merefleksikan proses kerja dan mencari perbaikan untuk sprint berikutnya disebut...',
      options: ['Sprint Planning', 'Daily Standup', 'Sprint Review', 'Sprint Retrospective'],
      answer: 3,
      explanation: 'Sprint Retrospective adalah sesi evaluasi internal tim untuk meningkatkan efisiensi dan alur kerja di masa mendatang.'
    }
  ];

  // Active Data (from DB or default)
  const materialsList = uts.materials && uts.materials.length > 0 ? uts.materials : defaultMaterials;
  const flashcardsList = uts.flashcards && uts.flashcards.length > 0 ? uts.flashcards : defaultFlashcards;
  const quizzesList = uts.quizzes && uts.quizzes.length > 0 ? uts.quizzes : defaultQuizzes;

  // Personal study checklist stored in localStorage
  const storagePrefix = `classy_uts_${currentClass?.id}_${currentUser?.uid || 'guest'}`;
  const [checkedTopics, setCheckedTopics] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_checklist`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleTopicCheck = (topicKey) => {
    setCheckedTopics(prev => {
      const next = { ...prev, [topicKey]: !prev[topicKey] };
      try {
        localStorage.setItem(`${storagePrefix}_checklist`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Flashcard State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_flashcards_known`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleMarkCard = (isKnown) => {
    const cardId = flashcardsList[currentCardIndex]?.id;
    if (!cardId) return;
    const next = { ...knownCards, [cardId]: isKnown };
    setKnownCards(next);
    try {
      localStorage.setItem(`${storagePrefix}_flashcards_known`, JSON.stringify(next));
    } catch {}

    if (currentCardIndex < flashcardsList.length - 1) {
      setIsFlipped(false);
      setCurrentCardIndex(prev => prev + 1);
    } else {
      toast.success('Kamu sudah menyelesaikan seluruh flashcard!');
    }
  };

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleSelectQuizOption = (quizId, optionIndex) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [quizId]: optionIndex }));
  };

  const calculateQuizScore = () => {
    let correct = 0;
    quizzesList.forEach(q => {
      if (quizAnswers[q.id] === q.answer) correct++;
    });
    return Math.round((correct / quizzesList.length) * 100);
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  // Komti Settings Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(uts.title || 'Persiapan UTS Terpadu');
  const [editBanner, setEditBanner] = useState(uts.banner || '🔥 MINGGU UTS TELAH TIBA! Tetap semangat, jaga kesehatan, dan maksimalkan persiapan ujian! 🔥');
  const [editNotes, setEditNotes] = useState(uts.notes || 'Pelajari materi pertemuan 1 s/d 7, siapkan alat tulis, dan datang tepat waktu!');
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

  // Progress summary
  const totalTopics = materialsList.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  const completedTopics = Object.values(checkedTopics).filter(Boolean).length;
  const studyProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

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
              <span>ZONA MINGGU UTS KELAS {currentClass?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {uts.title || 'Pusat Persiapan & Latihan UTS'}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
              {uts.notes || 'Fokus belajar, kuasai konsep materi pertemuan 1–7, latih pemahaman dengan flashcard, dan uji kesiapan dengan quiz interaktif!'}
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
            <div className="bg-black/25 backdrop-blur-md border border-white/15 rounded-2xl p-3 min-w-[160px]">
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
                {completedTopics} dari {totalTopics} topik dipelajari
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-rose-200/80 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
        {[
          { id: 'summary', label: 'Ringkasan & Info', icon: BookOpen },
          { id: 'materials', label: 'Materi Pelajaran', icon: CheckCircle2, badge: `${completedTopics}/${totalTopics}` },
          { id: 'flashcards', label: 'Flashcard Belajar', icon: Brain, badge: `${flashcardsList.length}` },
          { id: 'quiz', label: 'Latihan Quiz', icon: HelpCircle, badge: `${quizzesList.length} Soal` }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm'
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

      {/* 3. Tab Contents */}

      {/* SECTION A: RINGKASAN & JADWAL UTS */}
      {activeSection === 'summary' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Checklist Wajib */}
            <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Perlengkapan Ujian</h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Kartu Tanda Mahasiswa (KTM) atau KRS Aktif.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Alat tulis lengkap (pulpen hitam, pensil 2B, penghapus).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Laptop & charger jika ujian berbasis praktikum / lab.</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Aturan & Tata Tertib */}
            <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Tata Tertib Ruangan</h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>Hadir di ruang ujian minimal <strong>15 menit</strong> sebelum mulai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>HP & perangkat komunikasi di-silent dan disimpan di tas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>Dilarang keras menyontek atau membuka materi tanpa izin dosen.</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Tips Sukses */}
            <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Strategi Pengerjaan</h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>Kerjakan soal yang paling mudah dan berbobot besar terlebih dahulu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>Sediakan 10 menit di akhir untuk membaca ulang jawaban.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>Istirahat cukup di malam sebelum ujian agar pikiran tetap jernih.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Quick Schedule Reference if any */}
          {schedules.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={16} className="text-red-600" />
                  <span>Daftar Mata Kuliah Kelas</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">{schedules.length} Mata Kuliah Terjadwal</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {schedules.map((sc, i) => (
                  <div key={sc.id || i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate">{sc.courseName || sc.subject || sc.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{sc.day || 'Jadwal Reguler'} • {sc.startTime || ''} - {sc.endTime || ''}</p>
                    </div>
                    {sc.lecturer && (
                      <p className="text-[10px] text-slate-400 mt-2 font-medium truncate">Dosen: {sc.lecturer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION B: MATERI PELAJARAN (CHECKLIST) */}
      {activeSection === 'materials' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Info size={16} className="text-rose-600 shrink-0" />
              <span>Centang materi yang sudah kamu pelajari untuk memantau persiapan ujianmu secara mandiri.</span>
            </div>
            <button
              onClick={() => {
                setCheckedTopics({});
                try { localStorage.removeItem(`${storagePrefix}_checklist`); } catch {}
                toast.success('Checklist belajar di-reset.');
              }}
              className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-200 transition-colors shrink-0 cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materialsList.map((mat, matIdx) => (
              <div key={mat.id || matIdx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    <span>{mat.course}</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {mat.topics?.length || 0} Topik
                  </span>
                </div>

                <div className="space-y-2">
                  {(mat.topics || []).map((topic, topicIdx) => {
                    const topicKey = `${mat.id || matIdx}_${topicIdx}`;
                    const isChecked = Boolean(checkedTopics[topicKey]);
                    return (
                      <button
                        key={topicIdx}
                        type="button"
                        onClick={() => toggleTopicCheck(topicKey)}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-emerald-50/60 border border-emerald-200/80 text-emerald-900' 
                            : 'bg-slate-50/70 hover:bg-slate-100/70 border border-transparent text-slate-700'
                        }`}
                      >
                        {isChecked ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle size={16} className="text-slate-300 shrink-0 mt-0.5" />
                        )}
                        <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-slate-400 font-medium' : 'font-medium'}`}>
                          {topic}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION C: FLASHCARD INTERAKTIF */}
      {activeSection === 'flashcards' && (
        <div className="space-y-5 animate-in fade-in duration-200 max-w-2xl mx-auto">
          {/* Card Counter & Mastery */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Kartu {currentCardIndex + 1} dari {flashcardsList.length}</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check size={13} />
                <span>{Object.values(knownCards).filter(Boolean).length} Dikuasai</span>
              </span>
            </div>
          </div>

          {/* Interactive 3D Flip Card */}
          {flashcardsList[currentCardIndex] && (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[220px] sm:min-h-[260px] w-full rounded-3xl bg-white border-2 border-rose-200/90 shadow-lg shadow-rose-500/5 p-6 sm:p-8 flex flex-col justify-between text-center cursor-pointer select-none transition-all duration-300 hover:border-red-400 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono">
                  {flashcardsList[currentCardIndex].course || 'Konsep UTS'}
                </span>
                <span className="text-rose-500">Klik untuk membalik kartu 🔄</span>
              </div>

              <div className="my-auto py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500 mb-2">
                  {isFlipped ? '💡 Kunci Jawaban / Penjelasan' : '❓ Pertanyaan / Konsep'}
                </p>
                <h3 className={`font-bold transition-all ${
                  isFlipped 
                    ? 'text-sm sm:text-base text-slate-800 leading-relaxed' 
                    : 'text-base sm:text-xl text-slate-900 leading-snug font-extrabold'
                }`}>
                  {isFlipped ? flashcardsList[currentCardIndex].answer : flashcardsList[currentCardIndex].question}
                </h3>
              </div>

              <div className="text-[10px] text-slate-400">
                {isFlipped ? 'Apakah kamu sudah paham materi ini?' : 'Coba tebak jawabannya sebelum membalik kartu'}
              </div>
            </div>
          )}

          {/* Flashcard Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setIsFlipped(false);
                setCurrentCardIndex(prev => Math.max(0, prev - 1));
              }}
              disabled={currentCardIndex === 0}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all"
            >
              <ChevronLeft size={15} />
              <span>Sebelumnya</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMarkCard(false)}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Perlu Ulang</span>
              </button>
              <button
                onClick={() => handleMarkCard(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Sudah Paham</span>
              </button>
            </div>

            <button
              onClick={() => {
                setIsFlipped(false);
                setCurrentCardIndex(prev => Math.min(flashcardsList.length - 1, prev + 1));
              }}
              disabled={currentCardIndex === flashcardsList.length - 1}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Berikutnya</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* SECTION D: LATIHAN QUIZ */}
      {activeSection === 'quiz' && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
          {quizSubmitted ? (
            /* Quiz Result Screen */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200/80 shadow-md text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                <Award size={32} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Hasil Latihan Quiz UTS</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  Skor: <span className="text-red-600">{calculateQuizScore()}%</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kamu menjawab {Object.entries(quizAnswers).filter(([id, ans]) => {
                    const q = quizzesList.find(item => item.id === id);
                    return q && q.answer === ans;
                  }).length} dari {quizzesList.length} soal dengan benar.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleResetQuiz}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Ulangi Quiz dari Awal</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Quiz Questions List */}
          <div className="space-y-4">
            {quizzesList.map((quizItem, qIdx) => {
              const selectedOption = quizAnswers[quizItem.id];
              const isAnswered = selectedOption !== undefined;
              const isCorrect = isAnswered && selectedOption === quizItem.answer;

              return (
                <div key={quizItem.id || qIdx} className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono text-[10px]">
                      {quizItem.course || 'Soal UTS'}
                    </span>
                    <span>Soal #{qIdx + 1}</span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {quizItem.question}
                  </h3>

                  <div className="space-y-2 pt-1">
                    {quizItem.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOption === optIdx;
                      let optionStyle = 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800';
                      
                      if (quizSubmitted) {
                        if (optIdx === quizItem.answer) {
                          optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                        } else if (isOptionSelected) {
                          optionStyle = 'bg-rose-50 border-rose-400 text-rose-900 line-through';
                        } else {
                          optionStyle = 'bg-slate-50 border-slate-100 text-slate-400 opacity-60';
                        }
                      } else if (isOptionSelected) {
                        optionStyle = 'bg-rose-50 border-rose-500 text-rose-900 font-bold ring-1 ring-rose-500';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={quizSubmitted}
                          onClick={() => handleSelectQuizOption(quizItem.id, optIdx)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${optionStyle}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white border border-current flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1 leading-relaxed">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {quizSubmitted && (
                    <div className={`p-3 rounded-xl text-xs space-y-1 ${isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {isCorrect ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-rose-600" />}
                        <span>{isCorrect ? 'Jawaban Benar!' : 'Jawaban Salah'}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">{quizItem.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!quizSubmitted && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setQuizSubmitted(true)}
                disabled={Object.keys(quizAnswers).length < quizzesList.length}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Kumpulkan & Periksa Jawaban
              </button>
            </div>
          )}
        </div>
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
