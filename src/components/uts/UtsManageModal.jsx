import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Brain, 
  HelpCircle, 
  Calendar, 
  Settings, 
  Check, 
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from '../ModalPortal';

export default function UtsManageModal({
  isOpen,
  onClose,
  initialTab = 'quiz',
  uts = {},
  currentClass,
  materials = [],
  flashcards = [],
  quizzes = [],
  examSchedule = [],
  availableCourses = [],
  onSave
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState(initialTab); // 'quiz' | 'flashcard' | 'material' | 'schedule' | 'general'
  const [saving, setSaving] = useState(false);

  // Local state for all collections to allow preview & batch save
  const [localTitle, setLocalTitle] = useState(uts.title || 'Pusat Persiapan & Latihan UTS');
  const [localBanner, setLocalBanner] = useState(uts.banner || '🔥 MINGGU UTS TELAH TIBA! Tetap semangat, jaga kesehatan, dan maksimalkan persiapan ujian! 🔥');
  const [localNotes, setLocalNotes] = useState(uts.notes || 'Fokus belajar, kuasai kisi-kisi pertemuan 1–7, dan uji kesiapan dengan latihan quiz!');

  const [localMaterials, setLocalMaterials] = useState(materials);
  const [localFlashcards, setLocalFlashcards] = useState(flashcards);
  const [localQuizzes, setLocalQuizzes] = useState(quizzes);
  const [localSchedule, setLocalSchedule] = useState(examSchedule);

  const fallbackCourses = [
    'Pengantar Logistik',
    'Pengantar Transportasi',
    'Ekonomi Mikro',
    'Matematika Ekonomi',
    'Pengantar Akuntansi',
    'Pengantar Bisnis dan Inovasi',
    'Prinsip - Prinsip Manajemen',
    'Pendidikan Pancasila'
  ];

  // Available course names for dropdowns
  const existingCourses = Array.from(new Set([
    ...availableCourses,
    ...localMaterials.map(m => m.course),
    ...localFlashcards.map(f => f.course),
    ...localQuizzes.map(q => q.course),
    ...localSchedule.map(s => s.course),
    ...fallbackCourses
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'));

  // --- FLASHCARD FORM STATE ---
  const [editingFcId, setEditingFcId] = useState(null);
  const [fcCourse, setFcCourse] = useState(existingCourses[0] || 'Pengantar Logistik');
  const [fcNewCourse, setFcNewCourse] = useState('');
  const [fcQuestion, setFcQuestion] = useState('');
  const [fcAnswer, setFcAnswer] = useState('');

  // --- QUIZ FORM STATE ---
  const [editingQzId, setEditingQzId] = useState(null);
  const [qzCourse, setQzCourse] = useState(existingCourses[0] || 'Pengantar Logistik');
  const [qzNewCourse, setQzNewCourse] = useState('');
  const [qzQuestion, setQzQuestion] = useState('');
  const [qzOptions, setQzOptions] = useState(['', '', '', '']);
  const [qzAnswer, setQzAnswer] = useState(0); // 0=A, 1=B, 2=C, 3=D
  const [qzExplanation, setQzExplanation] = useState('');

  // --- MATERIAL FORM STATE ---
  const [editingMatId, setEditingMatId] = useState(null);
  const [matCourse, setMatCourse] = useState(existingCourses[0] || 'Pengantar Logistik');
  const [matCode, setMatCode] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matTopicsText, setMatTopicsText] = useState(''); // newline separated

  // --- SCHEDULE FORM STATE ---
  const [editingSchId, setEditingSchId] = useState(null);
  const [schCourse, setSchCourse] = useState(existingCourses[0] || 'Pengantar Logistik');
  const [schNewCourse, setSchNewCourse] = useState('');
  const [schDate, setSchDate] = useState('');
  const [schDayName, setSchDayName] = useState('Senin');
  const [schTime, setSchTime] = useState('08:00 - 09:40 WIB');
  const [schRoom, setSchRoom] = useState('');
  const [schNature, setSchNature] = useState('Closed Book');
  const [schLecturer, setSchLecturer] = useState('');
  const [schSks, setSchSks] = useState(3);
  const [schTopics, setSchTopics] = useState('');

  // -------------------------------------------------------------
  // HANDLERS FOR FLASHCARDS
  // -------------------------------------------------------------
  const handleSaveFlashcard = (e) => {
    e.preventDefault();
    const finalCourse = (fcCourse === '__new__' ? fcNewCourse : fcCourse).trim();
    if (!finalCourse) return toast.error('Nama mata kuliah wajib diisi!');
    if (!fcQuestion.trim()) return toast.error('Pertanyaan flashcard wajib diisi!');
    if (!fcAnswer.trim()) return toast.error('Jawaban flashcard wajib diisi!');

    if (editingFcId) {
      setLocalFlashcards(prev => prev.map(fc => fc.id === editingFcId ? {
        ...fc,
        course: finalCourse,
        question: fcQuestion.trim(),
        answer: fcAnswer.trim()
      } : fc));
      toast.success('Flashcard berhasil diperbarui!');
    } else {
      const newFc = {
        id: `fc-${Date.now()}`,
        course: finalCourse,
        question: fcQuestion.trim(),
        answer: fcAnswer.trim()
      };
      setLocalFlashcards(prev => [newFc, ...prev]);
      toast.success('Flashcard baru ditambahkan!');
    }

    setEditingFcId(null);
    setFcQuestion('');
    setFcAnswer('');
    setFcNewCourse('');
  };

  const handleEditFc = (fc) => {
    setEditingFcId(fc.id);
    setFcCourse(fc.course);
    setFcQuestion(fc.question);
    setFcAnswer(fc.answer);
  };

  const handleDeleteFc = (id) => {
    if (confirm('Yakin ingin menghapus flashcard ini?')) {
      setLocalFlashcards(prev => prev.filter(fc => fc.id !== id));
      toast.success('Flashcard dihapus.');
      if (editingFcId === id) setEditingFcId(null);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR QUIZZES
  // -------------------------------------------------------------
  const handleSaveQuiz = (e) => {
    e.preventDefault();
    const finalCourse = (qzCourse === '__new__' ? qzNewCourse : qzCourse).trim();
    if (!finalCourse) return toast.error('Nama mata kuliah wajib diisi!');
    if (!qzQuestion.trim()) return toast.error('Soal quiz wajib diisi!');
    if (qzOptions.some(opt => !opt.trim())) return toast.error('Semua pilihan A, B, C, D wajib diisi!');

    if (editingQzId) {
      setLocalQuizzes(prev => prev.map(q => q.id === editingQzId ? {
        ...q,
        course: finalCourse,
        question: qzQuestion.trim(),
        options: qzOptions.map(o => o.trim()),
        answer: Number(qzAnswer),
        explanation: qzExplanation.trim()
      } : q));
      toast.success('Soal quiz berhasil diperbarui!');
    } else {
      const newQz = {
        id: `qz-${Date.now()}`,
        course: finalCourse,
        question: qzQuestion.trim(),
        options: qzOptions.map(o => o.trim()),
        answer: Number(qzAnswer),
        explanation: qzExplanation.trim()
      };
      setLocalQuizzes(prev => [newQz, ...prev]);
      toast.success('Soal quiz baru ditambahkan!');
    }

    setEditingQzId(null);
    setQzQuestion('');
    setQzOptions(['', '', '', '']);
    setQzExplanation('');
    setQzNewCourse('');
  };

  const handleEditQz = (q) => {
    setEditingQzId(q.id);
    setQzCourse(q.course);
    setQzQuestion(q.question);
    setQzOptions(q.options || ['', '', '', '']);
    setQzAnswer(q.answer ?? 0);
    setQzExplanation(q.explanation || '');
  };

  const handleDeleteQz = (id) => {
    if (confirm('Yakin ingin menghapus soal ini?')) {
      setLocalQuizzes(prev => prev.filter(q => q.id !== id));
      toast.success('Soal quiz dihapus.');
      if (editingQzId === id) setEditingQzId(null);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR MATERIALS
  // -------------------------------------------------------------
  const handleSaveMaterial = (e) => {
    e.preventDefault();
    if (!matCourse.trim()) return toast.error('Nama mata kuliah wajib diisi!');

    const topicsArray = matTopicsText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    if (editingMatId) {
      setLocalMaterials(prev => prev.map(m => m.id === editingMatId ? {
        ...m,
        course: matCourse.trim(),
        code: matCode.trim() || 'MK',
        description: matDescription.trim(),
        topics: topicsArray.length > 0 ? topicsArray : m.topics
      } : m));
      toast.success('Mata kuliah berhasil diperbarui!');
    } else {
      const newMat = {
        id: `mat-${Date.now()}`,
        course: matCourse.trim(),
        code: matCode.trim() || `MK-${localMaterials.length + 1}`,
        description: matDescription.trim() || 'Rangkuman materi dan kisi-kisi ujian.',
        topics: topicsArray.length > 0 ? topicsArray : ['Kisi-kisi topik 1', 'Kisi-kisi topik 2'],
        modules: []
      };
      setLocalMaterials(prev => [...prev, newMat]);
      toast.success('Mata kuliah baru ditambahkan!');
    }

    setEditingMatId(null);
    setMatCourse('');
    setMatCode('');
    setMatDescription('');
    setMatTopicsText('');
  };

  const handleEditMat = (mat) => {
    setEditingMatId(mat.id);
    setMatCourse(mat.course);
    setMatCode(mat.code || '');
    setMatDescription(mat.description || '');
    setMatTopicsText((mat.topics || []).join('\n'));
  };

  const handleDeleteMat = (id) => {
    if (confirm('Hapus mata kuliah ini beserta seluruh topiknya?')) {
      setLocalMaterials(prev => prev.filter(m => m.id !== id));
      toast.success('Mata kuliah dihapus.');
      if (editingMatId === id) setEditingMatId(null);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR SCHEDULE
  // -------------------------------------------------------------
  const handleSaveSchedule = (e) => {
    e.preventDefault();
    const finalCourse = (schCourse === '__new__' ? schNewCourse : schCourse).trim();
    if (!finalCourse) return toast.error('Nama mata kuliah wajib diisi!');

    if (editingSchId) {
      setLocalSchedule(prev => prev.map(s => s.id === editingSchId ? {
        ...s,
        course: finalCourse,
        date: schDate,
        dayName: schDayName,
        time: schTime.trim(),
        room: schRoom.trim() || 'Ruang Teori',
        nature: schNature,
        lecturer: schLecturer.trim(),
        sks: Number(schSks) || 3,
        topics: schTopics.trim()
      } : s));
      toast.success('Jadwal ujian diperbarui!');
    } else {
      const newSch = {
        id: `sch-${Date.now()}`,
        course: finalCourse,
        date: schDate,
        dayName: schDayName,
        time: schTime.trim(),
        room: schRoom.trim() || 'Ruang Teori',
        nature: schNature,
        lecturer: schLecturer.trim(),
        sks: Number(schSks) || 3,
        topics: schTopics.trim()
      };
      setLocalSchedule(prev => [...prev, newSch]);
      toast.success('Jadwal ujian ditambahkan!');
    }

    setEditingSchId(null);
    setSchDate('');
    setSchRoom('');
    setSchTopics('');
    setSchLecturer('');
    setSchNewCourse('');
  };

  const handleEditSch = (s) => {
    setEditingSchId(s.id);
    setSchCourse(s.course);
    setSchDate(s.date || '');
    setSchDayName(s.dayName || 'Senin');
    setSchTime(s.time || '08:00 - 09:40 WIB');
    setSchRoom(s.room || '');
    setSchNature(s.nature || 'Closed Book');
    setSchLecturer(s.lecturer || '');
    setSchSks(s.sks || 3);
    setSchTopics(s.topics || '');
  };

  const handleDeleteSch = (id) => {
    if (confirm('Hapus jadwal ujian ini?')) {
      setLocalSchedule(prev => prev.filter(s => s.id !== id));
      toast.success('Jadwal dihapus.');
      if (editingSchId === id) setEditingSchId(null);
    }
  };

  // -------------------------------------------------------------
  // SAVE ALL CHANGES TO SUPABASE
  // -------------------------------------------------------------
  const handleSaveAll = async () => {
    setSaving(true);
    const toastId = toast.loading('Menyimpan semua perubahan konten UTS...');
    try {
      await onSave({
        ...uts,
        enabled: true,
        title: localTitle.trim(),
        banner: localBanner.trim(),
        notes: localNotes.trim(),
        materials: localMaterials,
        flashcards: localFlashcards,
        quizzes: localQuizzes,
        examSchedule: localSchedule,
        updatedAt: new Date().toISOString()
      });
      toast.success('Seluruh data UTS berhasil disimpan permanen ke server!', { id: toastId });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal onClose={onClose} maxWidth="max-w-4xl">
      <div className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden text-slate-800">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Editor Konten UTS (Khusus Komti)
              </h3>
              <p className="text-[11px] text-white/80">
                Kelola soal kuis, kartu flashcard, materi kisi-kisi, dan jadwal ujian secara langsung.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Tab Switcher */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'quiz', label: 'Soal Quiz', icon: HelpCircle, count: localQuizzes.length },
            { id: 'flashcard', label: 'Flashcard', icon: Brain, count: localFlashcards.length },
            { id: 'material', label: 'Mata Kuliah & Kisi-Kisi', icon: BookOpen, count: localMaterials.length },
            { id: 'schedule', label: 'Jadwal UTS', icon: Calendar, count: localSchedule.length },
            { id: 'general', label: 'Banner & Info', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-white text-red-600 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-red-50 text-red-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ========================================================= */}
          {/* TAB 1: KELOLA SOAL QUIZ */}
          {/* ========================================================= */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              {/* Form Tambah/Edit Quiz */}
              <form onSubmit={handleSaveQuiz} className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <Plus size={14} className="text-red-600" />
                    <span>{editingQzId ? 'Edit Soal Quiz' : 'Tambah Soal Quiz Baru'}</span>
                  </h4>
                  {editingQzId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQzId(null);
                        setQzQuestion('');
                        setQzOptions(['', '', '', '']);
                        setQzExplanation('');
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Mata Kuliah</label>
                    <select
                      value={qzCourse}
                      onChange={(e) => setQzCourse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-red-500 bg-white"
                    >
                      {existingCourses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__new__">+ Tulis Mata Kuliah Baru...</option>
                    </select>
                  </div>

                  {qzCourse === '__new__' && (
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Nama Mata Kuliah Baru</label>
                      <input
                        type="text"
                        value={qzNewCourse}
                        onChange={(e) => setQzNewCourse(e.target.value)}
                        placeholder="Contoh: Jaringan Komputer"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                      />
                    </div>
                  )}

                  <div className={qzCourse === '__new__' ? 'sm:col-span-3 space-y-1' : 'sm:col-span-2 space-y-1'}>
                    <label className="text-[11px] font-bold text-slate-700">Kunci Jawaban Benar</label>
                    <select
                      value={qzAnswer}
                      onChange={(e) => setQzAnswer(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-emerald-700 focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value={0}>Opsi A adalah Jawaban Benar</option>
                      <option value={1}>Opsi B adalah Jawaban Benar</option>
                      <option value={2}>Opsi C adalah Jawaban Benar</option>
                      <option value={3}>Opsi D adalah Jawaban Benar</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Pertanyaan Soal</label>
                  <textarea
                    rows={2}
                    value={qzQuestion}
                    onChange={(e) => setQzQuestion(e.target.value)}
                    placeholder="Tuliskan pertanyaan soal latihan UTS..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>

                {/* 4 Opsi Jawaban */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {['A', 'B', 'C', 'D'].map((letter, idx) => (
                    <div key={letter} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>Pilihan {letter} {qzAnswer === idx && <strong className="text-emerald-600">(Kunci Benar)</strong>}</span>
                      </label>
                      <input
                        type="text"
                        value={qzOptions[idx] || ''}
                        onChange={(e) => {
                          const updated = [...qzOptions];
                          updated[idx] = e.target.value;
                          setQzOptions(updated);
                        }}
                        placeholder={`Jawaban opsi ${letter}...`}
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs bg-white ${
                          qzAnswer === idx ? 'border-emerald-400 font-semibold text-emerald-950' : 'border-slate-200'
                        }`}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Pembahasan / Penjelasan Jawaban (Opsional)</label>
                  <input
                    type="text"
                    value={qzExplanation}
                    onChange={(e) => setQzExplanation(e.target.value)}
                    placeholder="Penjelasan mengapa jawaban tersebut yang benar..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingQzId ? 'Simpan Pembaruan Soal' : '+ Tambahkan Soal ke Daftar'}
                </button>
              </form>

              {/* List of Existing Quizzes */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Daftar Soal Quiz Saat Ini ({localQuizzes.length})
                </h4>

                <div className="space-y-2.5">
                  {localQuizzes.map((q, idx) => (
                    <div key={q.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                          {q.course} • Soal #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditQz(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Edit Soal"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQz(q.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus Soal"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-slate-900 leading-snug">{q.question}</p>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {(q.options || []).map((opt, oIdx) => (
                          <div 
                            key={oIdx}
                            className={`p-1.5 px-2.5 rounded-lg border flex items-center gap-1.5 ${
                              oIdx === q.answer 
                                ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' 
                                : 'bg-slate-50 border-slate-100 text-slate-600'
                            }`}
                          >
                            <span className="font-mono text-[9px] font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                            <span className="truncate">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: KELOLA FLASHCARD */}
          {/* ========================================================= */}
          {activeTab === 'flashcard' && (
            <div className="space-y-6">
              {/* Form Tambah/Edit Flashcard */}
              <form onSubmit={handleSaveFlashcard} className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <Plus size={14} className="text-red-600" />
                    <span>{editingFcId ? 'Edit Flashcard' : 'Tambah Flashcard Baru'}</span>
                  </h4>
                  {editingFcId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFcId(null);
                        setFcQuestion('');
                        setFcAnswer('');
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Mata Kuliah</label>
                    <select
                      value={fcCourse}
                      onChange={(e) => setFcCourse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-red-500 bg-white"
                    >
                      {existingCourses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__new__">+ Tulis Mata Kuliah Baru...</option>
                    </select>
                  </div>

                  {fcCourse === '__new__' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Nama Mata Kuliah Baru</label>
                      <input
                        type="text"
                        value={fcNewCourse}
                        onChange={(e) => setFcNewCourse(e.target.value)}
                        placeholder="Contoh: Rekayasa Web"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Pertanyaan Depan Kartu</label>
                  <textarea
                    rows={2}
                    value={fcQuestion}
                    onChange={(e) => setFcQuestion(e.target.value)}
                    placeholder="Pertanyaan atau konsep yang harus diingat..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Jawaban Belakang Kartu</label>
                  <textarea
                    rows={2}
                    value={fcAnswer}
                    onChange={(e) => setFcAnswer(e.target.value)}
                    placeholder="Kunci jawaban / penjelasan konsep..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingFcId ? 'Simpan Pembaruan Flashcard' : '+ Tambahkan Flashcard ke Daftar'}
                </button>
              </form>

              {/* List of Existing Flashcards */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Daftar Flashcard Saat Ini ({localFlashcards.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localFlashcards.map((fc, idx) => (
                    <div key={fc.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            {fc.course}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditFc(fc)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFc(fc.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-extrabold text-red-500 uppercase">Q:</p>
                          <p className="text-xs font-bold text-slate-900 leading-snug">{fc.question}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-extrabold text-emerald-600 uppercase">A:</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{fc.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: KELOLA MATA KULIAH & KISI-KISI */}
          {/* ========================================================= */}
          {activeTab === 'material' && (
            <div className="space-y-6">
              {/* Form Tambah/Edit Mata Kuliah */}
              <form onSubmit={handleSaveMaterial} className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <Plus size={14} className="text-red-600" />
                    <span>{editingMatId ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}</span>
                  </h4>
                  {editingMatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMatId(null);
                        setMatCourse('');
                        setMatCode('');
                        setMatDescription('');
                        setMatTopicsText('');
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Nama Mata Kuliah</label>
                    <input
                      type="text"
                      value={matCourse}
                      onChange={(e) => setMatCourse(e.target.value)}
                      placeholder="Contoh: Pemrograman Mobile"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Kode Mata Kuliah</label>
                    <input
                      type="text"
                      value={matCode}
                      onChange={(e) => setMatCode(e.target.value)}
                      placeholder="Contoh: TI-301"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Deskripsi Singkat</label>
                  <input
                    type="text"
                    value={matDescription}
                    onChange={(e) => setMatDescription(e.target.value)}
                    placeholder="Contoh: Rangkuman Flutter, State Management, dan API."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Daftar Kisi-Kisi Topik (Satu topik per baris)
                  </label>
                  <textarea
                    rows={4}
                    value={matTopicsText}
                    onChange={(e) => setMatTopicsText(e.target.value)}
                    placeholder="Tulis topik 1&#10;Tulis topik 2&#10;Tulis topik 3..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingMatId ? 'Simpan Pembaruan Mata Kuliah' : '+ Tambahkan Mata Kuliah'}
                </button>
              </form>

              {/* List of Existing Materials */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Daftar Mata Kuliah Saat Ini ({localMaterials.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localMaterials.map((mat, idx) => (
                    <div key={mat.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                          {mat.code || `MK-${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditMat(mat)}
                            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMat(mat.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-black text-slate-900">{mat.course}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{mat.description}</p>

                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 mb-1">Kisi-kisi Topik:</p>
                        <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-0.5">
                          {(mat.topics || []).slice(0, 3).map((t, tIdx) => (
                            <li key={tIdx} className="line-clamp-1">{t}</li>
                          ))}
                          {(mat.topics || []).length > 3 && (
                            <li className="text-[10px] text-slate-400 list-none">+ {(mat.topics || []).length - 3} topik lainnya...</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: KELOLA JADWAL UTS */}
          {/* ========================================================= */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Form Tambah/Edit Jadwal */}
              <form onSubmit={handleSaveSchedule} className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <Plus size={14} className="text-red-600" />
                    <span>{editingSchId ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian Baru'}</span>
                  </h4>
                  {editingSchId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSchId(null);
                        setSchDate('');
                        setSchRoom('');
                        setSchTopics('');
                        setSchLecturer('');
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Mata Kuliah</label>
                    <select
                      value={schCourse}
                      onChange={(e) => setSchCourse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-red-500 bg-white"
                    >
                      {existingCourses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__new__">+ Tulis Mata Kuliah Baru...</option>
                    </select>
                  </div>

                  {schCourse === '__new__' && (
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Nama Mata Kuliah Baru</label>
                      <input
                        type="text"
                        value={schNewCourse}
                        onChange={(e) => setSchNewCourse(e.target.value)}
                        placeholder="Contoh: Pengantar Logistik"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Tanggal Ujian (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={schDate}
                      onChange={(e) => setSchDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Hari Ujian</label>
                    <select
                      value={schDayName}
                      onChange={(e) => setSchDayName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="Senin">Senin</option>
                      <option value="Selasa">Selasa</option>
                      <option value="Rabu">Rabu</option>
                      <option value="Kamis">Kamis</option>
                      <option value="Jumat">Jumat</option>
                      <option value="Sabtu">Sabtu</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Jam / Waktu Pelaksanaan</label>
                    <input
                      type="text"
                      value={schTime}
                      onChange={(e) => setSchTime(e.target.value)}
                      placeholder="Contoh: 08:00 - 09:40 WIB"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Ruangan Ujian</label>
                    <input
                      type="text"
                      value={schRoom}
                      onChange={(e) => setSchRoom(e.target.value)}
                      placeholder="Contoh: Lab Komputer 3"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Sifat Ujian</label>
                    <select
                      value={schNature}
                      onChange={(e) => setSchNature(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="Closed Book">Closed Book</option>
                      <option value="Open Book">Open Book</option>
                      <option value="Open Sheet (1 Lembar Catatan)">Open Sheet (1 Lembar Catatan)</option>
                      <option value="Praktikum / Laptop">Praktikum / Laptop</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Dosen Pengampu</label>
                  <input
                    type="text"
                    value={schLecturer}
                    onChange={(e) => setSchLecturer(e.target.value)}
                    placeholder="Nama Dosen Pengampu..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingSchId ? 'Simpan Pembaruan Jadwal' : '+ Tambahkan Jadwal Ujian'}
                </button>
              </form>

              {/* List of Schedules */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Daftar Jadwal Ujian Terjadwal ({localSchedule.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localSchedule.map((s, idx) => (
                    <div key={s.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                            {s.dayName || 'Jadwal'}, {s.date || 'TBA'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditSch(s)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSch(s.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-sm font-black text-slate-900">{s.course}</h4>
                        <p className="text-xs text-slate-600">⏰ {s.time} • 📍 {s.room}</p>
                        <p className="text-[11px] text-slate-400">Sifat: <strong className="text-rose-700">{s.nature}</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: BANNER & INFORMASI UMUM */}
          {/* ========================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Judul Halaman UTS</label>
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  placeholder="Contoh: Pusat Persiapan & Latihan UTS"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Teks Sepanduk Berjalan (Marquee Banner)</label>
                <textarea
                  rows={2}
                  value={localBanner}
                  onChange={(e) => setLocalBanner(e.target.value)}
                  placeholder="Teks motivasi yang akan berjalan di atas ruang kelas..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Pesan Motivasi / Catatan Penting Komti</label>
                <textarea
                  rows={3}
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Instruksi atau catatan untuk teman-teman sekelas..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 leading-relaxed"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Action Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Semua perubahan di tab akan disimpan ke Supabase saat tombol di kanan diklik.
          </p>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
            </button>
          </div>
        </div>

      </div>
    </ModalPortal>
  );
}
