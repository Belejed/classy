import React, { useState, useRef } from 'react';
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  Upload,
  ClipboardPaste,
  Layers,
  SlidersHorizontal,
  Wrench,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Database,
  RotateCcw,
  CopyCheck,
  FileDown,
  FileUp,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalPortal from '../ModalPortal';
import {
  downloadQuizExcelTemplate,
  parseQuizFile,
  parseQuizTsv,
  downloadFlashcardExcelTemplate,
  parseFlashcardFile,
  parseFlashcardTsv,
  downloadMaterialExcelTemplate,
  parseMaterialFile,
  parseMaterialTsv
} from '../../utils/utsExcelHelper';
import {
  initialUtsMaterials,
  initialUtsFlashcards,
  initialUtsQuizzes,
  initialUtsExamSchedule
} from '../../data/utsData';

export default function UtsManageModal({
  isOpen,
  onClose,
  initialTab = 'control',
  uts = {},
  currentClass,
  materials = [],
  flashcards = [],
  quizzes = [],
  examSchedule = [],
  availableCourses = [],
  onSave
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'control' | 'quiz' | 'flashcard' | 'material' | 'schedule' | 'general'
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

  // Active courses currently present in UTS data (used for Audit Table)
  const activeCourseNames = Array.from(new Set([
    ...localMaterials.map(m => m.course?.trim()),
    ...localFlashcards.map(f => f.course?.trim()),
    ...localQuizzes.map(q => q.course?.trim()),
    ...localSchedule.map(s => s.course?.trim())
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'));

  // Available course names for dropdowns
  const existingCourses = Array.from(new Set([
    ...activeCourseNames,
    ...availableCourses,
    ...(activeCourseNames.length === 0 ? fallbackCourses : [])
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'));

  // --- EXCEL & IMPORT REFS & STATES ---
  const fileInputQuizRef = useRef(null);
  const [showPasteQuiz, setShowPasteQuiz] = useState(false);
  const [pasteQuizText, setPasteQuizText] = useState('');

  const fileInputFcRef = useRef(null);
  const [showPasteFc, setShowPasteFc] = useState(false);
  const [pasteFcText, setPasteFcText] = useState('');

  const fileInputMatRef = useRef(null);
  const [showPasteMat, setShowPasteMat] = useState(false);
  const [pasteMatText, setPasteMatText] = useState('');

  // --- CONTROL PANEL & DATA CLEANING STATE ---
  const [searchAudit, setSearchAudit] = useState('');
  const [renameTargetCourse, setRenameTargetCourse] = useState('');
  const [renameNewCourseName, setRenameNewCourseName] = useState('');
  const fileInputBackupRef = useRef(null);

  // Health Metrics & Duplicates
  const totalModulesCount = localMaterials.reduce((acc, m) => acc + (m.modules?.length || 0), 0);
  const totalTopicsCount = localMaterials.reduce((acc, m) => acc + (m.topics?.length || 0), 0);

  const seenQuizKeys = new Set();
  let duplicateQuizCount = 0;
  for (const q of localQuizzes) {
    const key = `${(q.course || '').trim().toLowerCase()}|${(q.question || '').trim().toLowerCase()}`;
    if (seenQuizKeys.has(key)) duplicateQuizCount++;
    else seenQuizKeys.add(key);
  }

  const seenFcKeys = new Set();
  let duplicateFcCount = 0;
  for (const fc of localFlashcards) {
    const key = `${(fc.course || '').trim().toLowerCase()}|${(fc.question || '').trim().toLowerCase()}`;
    if (seenFcKeys.has(key)) duplicateFcCount++;
    else seenFcKeys.add(key);
  }

  const corruptQuizCount = localQuizzes.filter(q => 
    q.options?.[0]?.trim().toLowerCase() === q.course?.trim().toLowerCase()
  ).length;

  const totalDuplicates = duplicateQuizCount + duplicateFcCount;

  // Course audit rows (Audit only actively existing courses!)
  const courseAuditList = activeCourseNames.map(cName => {
    const mat = localMaterials.find(m => m.course?.toLowerCase() === cName.toLowerCase());
    const qzList = localQuizzes.filter(q => q.course?.toLowerCase() === cName.toLowerCase());
    const fcList = localFlashcards.filter(fc => fc.course?.toLowerCase() === cName.toLowerCase());
    const sch = localSchedule.find(s => s.course?.toLowerCase() === cName.toLowerCase());
    const modCount = mat?.modules?.length || 0;
    const topCount = mat?.topics?.length || 0;

    const isComplete = Boolean(mat && modCount > 0 && qzList.length > 0 && fcList.length > 0 && sch);
    return {
      course: cName,
      code: mat?.code || '-',
      topicsCount: topCount,
      modulesCount: modCount,
      quizzesCount: qzList.length,
      flashcardsCount: fcList.length,
      hasSchedule: Boolean(sch),
      scheduleTime: sch ? `${sch.dayName || ''} (${sch.time || ''})` : null,
      isComplete
    };
  });

  const filteredAuditList = courseAuditList.filter(row => 
    row.course.toLowerCase().includes(searchAudit.toLowerCase()) ||
    row.code.toLowerCase().includes(searchAudit.toLowerCase())
  );

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

  // --- MATERIAL & SUMMARY MODULES FORM STATE ---
  const [editingMatId, setEditingMatId] = useState(null);
  const [matCourse, setMatCourse] = useState(existingCourses[0] || 'Pengantar Logistik');
  const [matCode, setMatCode] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matTopicsText, setMatTopicsText] = useState(''); // newline separated
  const [matModules, setMatModules] = useState([]); // Array of summary modules

  // Module sub-form state
  const [showModForm, setShowModForm] = useState(false);
  const [editingModIndex, setEditingModIndex] = useState(null);
  const [modTitle, setModTitle] = useState('');
  const [modKeyPointsText, setModKeyPointsText] = useState('');
  const [modCheatsheet, setModCheatsheet] = useState('');
  const [modExamTip, setModExamTip] = useState('');
  const [modSampleQuestion, setModSampleQuestion] = useState('');

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

  if (!isOpen) return null;

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

  const handleUploadFcFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const toastId = toast.loading('Membaca file Excel / CSV flashcard...');
      const parsed = await parseFlashcardFile(file);
      if (!parsed || parsed.length === 0) {
        return toast.error('Format file tidak sesuai atau tidak ada baris flashcard valid.', { id: toastId });
      }
      setLocalFlashcards(prev => [...parsed, ...prev]);
      toast.success(`Berhasil mengimpor ${parsed.length} flashcard dari ${file.name}!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyPasteFc = () => {
    if (!pasteFcText.trim()) return toast.error('Silakan paste data baris tabel terlebih dahulu!');
    try {
      const parsed = parseFlashcardTsv(pasteFcText);
      if (!parsed || parsed.length === 0) {
        return toast.error('Format data tidak sesuai.');
      }
      setLocalFlashcards(prev => [...parsed, ...prev]);
      toast.success(`Berhasil menambahkan ${parsed.length} flashcard!`);
      setPasteFcText('');
      setShowPasteFc(false);
    } catch (err) {
      toast.error('Gagal memproses data: ' + err.message);
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

  const handleUploadQuizFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const toastId = toast.loading('Membaca file Excel / CSV soal quiz...');
      const parsed = await parseQuizFile(file);
      if (!parsed || parsed.length === 0) {
        return toast.error('Format file tidak sesuai atau tidak ada baris soal valid.', { id: toastId });
      }
      setLocalQuizzes(prev => [...parsed, ...prev]);
      toast.success(`Berhasil mengimpor ${parsed.length} soal quiz dari ${file.name}!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyPasteQuiz = () => {
    if (!pasteQuizText.trim()) return toast.error('Silakan paste data baris tabel terlebih dahulu!');
    try {
      const parsed = parseQuizTsv(pasteQuizText);
      if (!parsed || parsed.length === 0) {
        return toast.error('Format data tidak sesuai.');
      }
      setLocalQuizzes(prev => [...parsed, ...prev]);
      toast.success(`Berhasil menambahkan ${parsed.length} soal quiz!`);
      setPasteQuizText('');
      setShowPasteQuiz(false);
    } catch (err) {
      toast.error('Gagal memproses data: ' + err.message);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR SUMMARY MODULES INSIDE MATERIAL
  // -------------------------------------------------------------
  const handleOpenAddModule = () => {
    setEditingModIndex(null);
    setModTitle('');
    setModKeyPointsText('');
    setModCheatsheet('');
    setModExamTip('');
    setModSampleQuestion('');
    setShowModForm(true);
  };

  const handleEditModule = (mod, index) => {
    setEditingModIndex(index);
    setModTitle(mod.title || '');
    setModKeyPointsText((mod.keyPoints || []).join('\n'));
    setModCheatsheet(mod.cheatsheet || '');
    setModExamTip(mod.examTip || '');
    setModSampleQuestion(mod.sampleQuestion || '');
    setShowModForm(true);
  };

  const handleSaveModule = (e) => {
    e?.preventDefault();
    if (!modTitle.trim()) return toast.error('Judul modul rangkuman wajib diisi!');

    const keyPointsArray = modKeyPointsText
      .split('\n')
      .map(k => k.trim())
      .filter(Boolean);

    const moduleObj = {
      id: editingModIndex !== null && matModules[editingModIndex]?.id 
        ? matModules[editingModIndex].id 
        : `mod-${Date.now()}`,
      title: modTitle.trim(),
      keyPoints: keyPointsArray.length > 0 ? keyPointsArray : ['Poin materi 1', 'Poin materi 2'],
      cheatsheet: modCheatsheet.trim(),
      examTip: modExamTip.trim(),
      sampleQuestion: modSampleQuestion.trim()
    };

    if (editingModIndex !== null) {
      setMatModules(prev => prev.map((m, idx) => idx === editingModIndex ? moduleObj : m));
      toast.success('Modul rangkuman diperbarui!');
    } else {
      setMatModules(prev => [...prev, moduleObj]);
      toast.success('Modul rangkuman ditambahkan!');
    }

    setShowModForm(false);
    setEditingModIndex(null);
    setModTitle('');
    setModKeyPointsText('');
    setModCheatsheet('');
    setModExamTip('');
    setModSampleQuestion('');
  };

  const handleDeleteModule = (index) => {
    if (confirm('Hapus modul rangkuman ini?')) {
      setMatModules(prev => prev.filter((_, idx) => idx !== index));
      toast.success('Modul rangkuman dihapus.');
      if (editingModIndex === index) setShowModForm(false);
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
        topics: topicsArray.length > 0 ? topicsArray : m.topics,
        modules: matModules
      } : m));
      toast.success('Mata kuliah & modul rangkuman berhasil diperbarui!');
    } else {
      const newMat = {
        id: `mat-${Date.now()}`,
        course: matCourse.trim(),
        code: matCode.trim() || `MK-${localMaterials.length + 1}`,
        description: matDescription.trim() || 'Rangkuman materi dan kisi-kisi ujian.',
        topics: topicsArray.length > 0 ? topicsArray : ['Kisi-kisi topik 1', 'Kisi-kisi topik 2'],
        modules: matModules
      };
      setLocalMaterials(prev => [...prev, newMat]);
      toast.success('Mata kuliah baru ditambahkan!');
    }

    setEditingMatId(null);
    setMatCourse('');
    setMatCode('');
    setMatDescription('');
    setMatTopicsText('');
    setMatModules([]);
    setShowModForm(false);
  };

  const handleEditMat = (mat) => {
    setEditingMatId(mat.id);
    setMatCourse(mat.course);
    setMatCode(mat.code || '');
    setMatDescription(mat.description || '');
    setMatTopicsText((mat.topics || []).join('\n'));
    setMatModules(mat.modules || []);
    setShowModForm(false);
  };

  const handleDeleteMat = (id) => {
    if (confirm('Hapus mata kuliah ini beserta seluruh topiknya?')) {
      setLocalMaterials(prev => prev.filter(m => m.id !== id));
      toast.success('Mata kuliah dihapus.');
      if (editingMatId === id) {
        setEditingMatId(null);
        setMatModules([]);
        setShowModForm(false);
      }
    }
  };

  const handleUploadMatFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const toastId = toast.loading('Membaca file Excel / CSV materi & modul...');
      const parsed = await parseMaterialFile(file);
      if (!parsed || parsed.length === 0) {
        return toast.error('Format file tidak sesuai atau tidak ada baris materi yang valid.', { id: toastId });
      }

      setLocalMaterials(prev => {
        const next = [...prev];
        for (const p of parsed) {
          const existingIdx = next.findIndex(m => m.course.toLowerCase() === p.course.toLowerCase());
          if (existingIdx >= 0) {
            const existing = next[existingIdx];
            const mergedTopics = Array.from(new Set([...(existing.topics || []), ...(p.topics || [])]));
            const mergedModules = [...(existing.modules || []), ...(p.modules || [])];
            next[existingIdx] = {
              ...existing,
              topics: mergedTopics,
              modules: mergedModules
            };
          } else {
            next.push(p);
          }
        }
        return next;
      });

      toast.success(`Berhasil mengimpor ${parsed.length} mata kuliah & modul dari ${file.name}!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyPasteMat = () => {
    if (!pasteMatText.trim()) return toast.error('Silakan paste baris tabel terlebih dahulu!');
    try {
      const parsed = parseMaterialTsv(pasteMatText);
      if (!parsed || parsed.length === 0) {
        return toast.error('Format data tidak sesuai.');
      }
      setLocalMaterials(prev => {
        const next = [...prev];
        for (const p of parsed) {
          const existingIdx = next.findIndex(m => m.course.toLowerCase() === p.course.toLowerCase());
          if (existingIdx >= 0) {
            const existing = next[existingIdx];
            const mergedTopics = Array.from(new Set([...(existing.topics || []), ...(p.topics || [])]));
            const mergedModules = [...(existing.modules || []), ...(p.modules || [])];
            next[existingIdx] = {
              ...existing,
              topics: mergedTopics,
              modules: mergedModules
            };
          } else {
            next.push(p);
          }
        }
        return next;
      });
      toast.success(`Berhasil menambahkan ${parsed.length} mata kuliah beserta modul rangkumannya!`);
      setPasteMatText('');
      setShowPasteMat(false);
    } catch (err) {
      toast.error('Gagal memproses data: ' + err.message);
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
  // HANDLERS FOR CONTROL PANEL & DATA CLEANING
  // -------------------------------------------------------------
  const handleCleanDuplicates = () => {
    let removedQz = 0;
    const seenQz = new Set();
    const cleanQz = [];
    for (const q of localQuizzes) {
      const key = `${(q.course || '').trim().toLowerCase()}|${(q.question || '').trim().toLowerCase()}`;
      if (seenQz.has(key)) {
        removedQz++;
      } else {
        seenQz.add(key);
        cleanQz.push(q);
      }
    }

    let removedFc = 0;
    const seenFc = new Set();
    const cleanFc = [];
    for (const fc of localFlashcards) {
      const key = `${(fc.course || '').trim().toLowerCase()}|${(fc.question || '').trim().toLowerCase()}`;
      if (seenFc.has(key)) {
        removedFc++;
      } else {
        seenFc.add(key);
        cleanFc.push(fc);
      }
    }

    if (removedQz === 0 && removedFc === 0) {
      toast.success('Semua data sudah bersih! Tidak ada soal quiz atau flashcard duplikat.');
      return;
    }

    setLocalQuizzes(cleanQz);
    setLocalFlashcards(cleanFc);
    toast.success(`Berhasil membersihkan ${removedQz} soal quiz dan ${removedFc} flashcard duplikat!`);
  };

  const handlePurgeCorruptQuizzes = () => {
    const corruptCount = localQuizzes.filter(q => 
      q.options?.[0]?.trim().toLowerCase() === q.course?.trim().toLowerCase()
    ).length;

    if (corruptCount === 0) {
      toast.success('Semua soal normal! Tidak ada soal dengan Pilihan A yang tertukar nama mata kuliah.');
      return;
    }

    if (!confirm(`Ditemukan ${corruptCount} soal dengan Pilihan A tertukar nama mata kuliah (akibat bug parser sebelumnya). Hapus soal-soal rusak ini agar Anda bisa upload ulang file Excel dengan bersih?`)) {
      return;
    }

    setLocalQuizzes(prev => prev.filter(q => 
      q.options?.[0]?.trim().toLowerCase() !== q.course?.trim().toLowerCase()
    ));

    toast.success(`Berhasil menghapus ${corruptCount} soal rusak! Sekarang silakan upload ulang file Excel Anda.`);
  };

  const handleTrimAndNormalize = () => {
    setLocalMaterials(prev => prev.map(m => ({
      ...m,
      course: m.course.trim(),
      code: (m.code || '').trim(),
      description: (m.description || '').trim(),
      topics: (m.topics || []).map(t => t.trim()).filter(Boolean),
      modules: (m.modules || []).map(mod => ({
        ...mod,
        title: mod.title.trim(),
        keyPoints: (mod.keyPoints || []).map(k => k.trim()).filter(Boolean),
        cheatsheet: (mod.cheatsheet || '').trim(),
        examTip: (mod.examTip || '').trim(),
        sampleQuestion: (mod.sampleQuestion || '').trim()
      }))
    })));

    setLocalQuizzes(prev => prev.map(q => ({
      ...q,
      course: q.course.trim(),
      question: q.question.trim(),
      options: (q.options || []).map(o => o.trim()),
      explanation: (q.explanation || '').trim()
    })));

    setLocalFlashcards(prev => prev.map(fc => ({
      ...fc,
      course: fc.course.trim(),
      question: fc.question.trim(),
      answer: fc.answer.trim()
    })));

    setLocalSchedule(prev => prev.map(s => ({
      ...s,
      course: s.course.trim(),
      date: (s.date || '').trim(),
      dayName: (s.dayName || '').trim(),
      time: (s.time || '').trim(),
      room: '', // Kosongkan karena ruangan berbeda per mahasiswa
      nature: (s.nature || '').trim(),
      lecturer: (s.lecturer || '').trim(),
      topics: (s.topics || '').trim()
    })));

    toast.success('Semua teks mata kuliah, kuis, flashcard, dan modul berhasil dirapikan!');
  };

  const handleRemoveIncomplete = () => {
    const initialQz = localQuizzes.length;
    const initialFc = localFlashcards.length;

    const filteredQz = localQuizzes.filter(q => q.question?.trim() && q.options?.filter(o => o.trim()).length >= 2);
    const filteredFc = localFlashcards.filter(fc => fc.question?.trim() && fc.answer?.trim());
    
    const diffQz = initialQz - filteredQz.length;
    const diffFc = initialFc - filteredFc.length;

    if (diffQz === 0 && diffFc === 0) {
      toast.success('Tidak ditemukan data kosong atau tidak lengkap!');
      return;
    }

    setLocalQuizzes(filteredQz);
    setLocalFlashcards(filteredFc);
    toast.success(`Dibersihkan: ${diffQz} kuis tidak lengkap & ${diffFc} flashcard kosong.`);
  };

  const handleResetToDefault = () => {
    if (!confirm('PERINGATAN: Seluruh materi, modul, kuis, flashcard, dan jadwal UTS saat ini akan dikembalikan ke data resmi 8 mata kuliah M.Log B. Lanjutkan?')) {
      return;
    }
    setLocalMaterials(initialUtsMaterials);
    setLocalFlashcards(initialUtsFlashcards);
    setLocalQuizzes(initialUtsQuizzes);
    setLocalSchedule(initialUtsExamSchedule);
    toast.success('Data UTS berhasil di-reset ke kurikulum baku M.Log B!');
  };

  const handleWipeAllData = () => {
    if (!confirm('KOSONGKAN TOTAL: Yakin ingin menghapus SELURUH data UTS saat ini (semua mata kuliah, modul, soal kuis, flashcard, dan jadwal)? Tindakan ini akan mengosongkan semuanya agar Anda bisa mulai mengisi dari nol.')) {
      return;
    }
    setLocalMaterials([]);
    setLocalFlashcards([]);
    setLocalQuizzes([]);
    setLocalSchedule([]);
    toast.success('Seluruh data UTS telah dikosongkan. Klik "Simpan Perubahan UTS" di pojok kanan bawah untuk menyimpan secara permanen!');
  };

  const handleApplyOfficialSchedule = () => {
    if (!confirm('Terapkan jadwal UTS resmi kelas (26 Okt - 6 Nov 2026)? Materi modul dan soal kuis Anda TIDAK akan hilang, hanya tabel jadwal yang diperbarui sesuai jadwal resmi.')) {
      return;
    }
    setLocalSchedule(initialUtsExamSchedule);
    toast.success('Jadwal UTS resmi (26 Okt - 6 Nov) berhasil diterapkan! Klik "Simpan Perubahan UTS" di pojok kanan bawah untuk menyimpan.');
  };

  const handleExportBackupJson = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      className: currentClass?.name || 'Classy',
      title: localTitle,
      banner: localBanner,
      notes: localNotes,
      materials: localMaterials,
      flashcards: localFlashcards,
      quizzes: localQuizzes,
      schedule: localSchedule
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_UTS_${(currentClass?.name || 'Classy').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File backup .json berhasil diunduh!');
  };

  const handleRestoreBackupJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.materials && !data.quizzes && !data.flashcards) {
        return toast.error('Format file backup .json tidak sesuai.');
      }
      if (data.title) setLocalTitle(data.title);
      if (data.banner) setLocalBanner(data.banner);
      if (data.notes) setLocalNotes(data.notes);
      if (Array.isArray(data.materials)) setLocalMaterials(data.materials);
      if (Array.isArray(data.flashcards)) setLocalFlashcards(data.flashcards);
      if (Array.isArray(data.quizzes)) setLocalQuizzes(data.quizzes);
      if (Array.isArray(data.schedule)) setLocalSchedule(data.schedule);

      toast.success('Data UTS berhasil dipulihkan dari file backup!');
    } catch (err) {
      toast.error('Gagal membaca file JSON: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyGlobalRename = (e) => {
    e?.preventDefault();
    if (!renameTargetCourse) return toast.error('Pilih mata kuliah yang ingin diubah!');
    if (!renameNewCourseName.trim()) return toast.error('Ketikkan nama mata kuliah baru!');
    if (renameTargetCourse.trim().toLowerCase() === renameNewCourseName.trim().toLowerCase()) {
      return toast.error('Nama baru tidak boleh persis sama dengan nama lama!');
    }

    const oldName = renameTargetCourse.trim();
    const newName = renameNewCourseName.trim();

    setLocalMaterials(prev => prev.map(m => m.course.toLowerCase() === oldName.toLowerCase() ? { ...m, course: newName } : m));
    setLocalQuizzes(prev => prev.map(q => q.course.toLowerCase() === oldName.toLowerCase() ? { ...q, course: newName } : q));
    setLocalFlashcards(prev => prev.map(fc => fc.course.toLowerCase() === oldName.toLowerCase() ? { ...fc, course: newName } : fc));
    setLocalSchedule(prev => prev.map(s => s.course.toLowerCase() === oldName.toLowerCase() ? { ...s, course: newName } : s));

    toast.success(`Berhasil mengubah nama "${oldName}" menjadi "${newName}" di seluruh data!`);
    setRenameTargetCourse('');
    setRenameNewCourseName('');
  };

  const handlePurgeCourseAllData = (courseName) => {
    if (!confirm(`HAPUS TOTAL: Yakin ingin menghapus mata kuliah "${courseName}" beserta SEMUA soal quiz, flashcard, modul rangkuman, dan jadwalnya?`)) {
      return;
    }

    setLocalMaterials(prev => prev.filter(m => m.course.toLowerCase() !== courseName.toLowerCase()));
    setLocalQuizzes(prev => prev.filter(q => q.course.toLowerCase() !== courseName.toLowerCase()));
    setLocalFlashcards(prev => prev.filter(fc => fc.course.toLowerCase() !== courseName.toLowerCase()));
    setLocalSchedule(prev => prev.filter(s => s.course.toLowerCase() !== courseName.toLowerCase()));

    toast.success(`Semua data untuk mata kuliah "${courseName}" telah dihapus.`);
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
        customized: true,
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
            { id: 'control', label: 'Control Panel & Rapi Data', icon: SlidersHorizontal },
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
          {/* TAB 0: CONTROL PANEL & RAPI DATA */}
          {/* ========================================================= */}
          {activeTab === 'control' && (
            <div className="space-y-6">

              {/* 1. Header Overview & Health Stats */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-3xl text-white space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
                      <ShieldCheck size={12} />
                      <span>Classy UTS Data Center</span>
                    </div>
                    <h3 className="text-base font-black tracking-tight">
                      Control Panel & Audit Kesehatan Data UTS
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                      Pusat kontrol bagi Komti untuk memantau kelengkapan materi, membersihkan duplikat soal, merapikan format teks, dan menyinkronkan nama mata kuliah secara global.
                    </p>
                  </div>

                  {/* Health status badge */}
                  <div className="shrink-0 flex flex-col sm:items-end gap-2">
                    {corruptQuizCount > 0 && (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-bold">
                        <AlertTriangle size={16} className="text-rose-400 animate-pulse shrink-0" />
                        <div>
                          <p className="font-black text-rose-300">{corruptQuizCount} Soal Pilihan A Tertukar</p>
                          <button
                            type="button"
                            onClick={handlePurgeCorruptQuizzes}
                            className="text-[10px] text-white underline hover:text-rose-200 cursor-pointer font-bold"
                          >
                            Klik untuk hapus soal rusak & upload ulang
                          </button>
                        </div>
                      </div>
                    )}

                    {totalDuplicates > 0 ? (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
                        <AlertTriangle size={16} className="text-amber-400 animate-pulse shrink-0" />
                        <div>
                          <p className="font-black text-amber-300">{totalDuplicates} Duplikat Terdeteksi</p>
                          <p className="text-[10px] text-amber-200/80">Klik tombol di bawah untuk bersihkan otomatis</p>
                        </div>
                      </div>
                    ) : (
                      corruptQuizCount === 0 && (
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <div>
                            <p className="font-black text-emerald-300">Data Sehat & Rapi</p>
                            <p className="text-[10px] text-emerald-200/80">Tidak ada soal atau flashcard ganda</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
                  <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Mata Kuliah</span>
                    <span className="text-xl font-black text-white font-mono">{localMaterials.length}</span>
                    <span className="text-[10px] text-indigo-300 block mt-0.5">{totalModulesCount} modul terpasang</span>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Soal Quiz</span>
                    <span className="text-xl font-black text-rose-300 font-mono">{localQuizzes.length}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {duplicateQuizCount > 0 ? `${duplicateQuizCount} duplikat` : '0 duplikat'}
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Kartu Flashcard</span>
                    <span className="text-xl font-black text-amber-300 font-mono">{localFlashcards.length}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {duplicateFcCount > 0 ? `${duplicateFcCount} duplikat` : '0 duplikat'}
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Jadwal Ujian</span>
                    <span className="text-xl font-black text-emerald-300 font-mono">{localSchedule.length}</span>
                    <span className="text-[10px] text-emerald-300/80 block mt-0.5">Mata kuliah terjadwal</span>
                  </div>
                </div>
              </div>

              {/* 2. Toolbox Pembersih Data Massal (1-Click Actions) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Wrench size={14} className="text-red-600" />
                    <span>Toolbox Pembersih Data Massal (1-Klik)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Gunakan alat bantu ini untuk merapikan inkonsistensi spasi, menghapus entri ganda, atau mereset kurikulum.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {/* Purge Corrupt Quizzes (if any) */}
                  {corruptQuizCount > 0 && (
                    <button
                      type="button"
                      onClick={handlePurgeCorruptQuizzes}
                      className="p-3.5 rounded-2xl border-2 border-rose-400 bg-rose-50/80 hover:bg-rose-100 transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer group sm:col-span-2 lg:col-span-3 xl:col-span-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                          <Trash2 size={16} />
                        </div>
                        <span className="text-[10px] font-black text-rose-700 bg-white border border-rose-200 px-2.5 py-0.5 rounded-md">
                          {corruptQuizCount} Soal Perlu Dihapus
                        </span>
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-rose-900">
                          Hapus Soal dengan Pilihan A Tertukar Nama Matkul
                        </h5>
                        <p className="text-[11px] text-rose-700 leading-snug mt-0.5">
                          Klik untuk menghapus {corruptQuizCount} soal yang sebelumnya rusak saat import. Setelah dihapus, silakan upload kembali file Excel Anda.
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Clean Duplicates */}
                  <button
                    type="button"
                    onClick={handleCleanDuplicates}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                        <CopyCheck size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        {totalDuplicates} Duplikat
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                        Bersihkan Duplikat
                      </h5>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        Hapus otomatis kuis dan flashcard yang memiliki pertanyaan kembar.
                      </p>
                    </div>
                  </button>

                  {/* Trim Whitespaces */}
                  <button
                    type="button"
                    onClick={handleTrimAndNormalize}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-sky-400 bg-sky-50/40 hover:bg-sky-50 transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                        <RefreshCw size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-md">
                        Normalisasi
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-sky-800">
                        Pangkas Spasi Ekstra
                      </h5>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        Hapus spasi ganda dan baris kosong di semua judul, soal & jawaban.
                      </p>
                    </div>
                  </button>

                  {/* Remove Incomplete */}
                  <button
                    type="button"
                    onClick={handleRemoveIncomplete}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50 transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                        <AlertCircle size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                        Validasi
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-purple-800">
                        Hapus Data Kosong
                      </h5>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        Singkirkan kuis tanpa pilihan jawaban dan flashcard tanpa teks.
                      </p>
                    </div>
                  </button>

                  {/* Reset to Baku Curriculum */}
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-50 transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                        <RotateCcw size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                        8 MK Baku
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-rose-800">
                        Reset Kurikulum Resmi
                      </h5>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        Kembalikan seluruh materi dan kuis ke kurikulum 8 MK M.Log B asli.
                      </p>
                    </div>
                  </button>

                  {/* Wipe All Data (Start from Scratch) */}
                  <button
                    type="button"
                    onClick={handleWipeAllData}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-red-500 bg-red-50/30 hover:bg-red-50 transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                        <Trash2 size={16} />
                      </div>
                      <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                        Kosongkan
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-red-700">
                        Kosongkan Seluruh Data
                      </h5>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        Hapus semua isi materi, kuis & flashcard untuk mulai dari nol.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Backup & Restore Action Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Database size={15} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Backup & Restore Cadangan UTS (.json):</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputBackupRef}
                      onChange={handleRestoreBackupJson}
                      accept=".json"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={handleExportBackupJson}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Download seluruh snapshot data UTS saat ini ke file JSON"
                    >
                      <FileDown size={14} />
                      <span>Export Backup (.json)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputBackupRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Pulihkan data UTS dari file backup JSON sebelumnya"
                    >
                      <FileUp size={14} />
                      <span>Restore Backup (.json)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyOfficialSchedule}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Terapkan jadwal UTS edaran resmi kelas (26 Okt - 6 Nov 2026)"
                    >
                      <Calendar size={14} className="text-red-600" />
                      <span>Terapkan Jadwal Resmi Edaran</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Sinkronisasi & Ubah Nama Mata Kuliah Global */}
              <form onSubmit={handleApplyGlobalRename} className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Edit3 size={14} className="text-red-600" />
                      <span>Sinkronisasi & Ubah Nama Mata Kuliah Massal</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ganti typo atau seragamkan penamaan mata kuliah. Perubahan otomatis diterapkan ke <strong>Quiz, Flashcard, Materi, dan Jadwal</strong> sekaligus!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Pilih Mata Kuliah Sumber (Yang Ingin Diubah)</label>
                    <select
                      value={renameTargetCourse}
                      onChange={(e) => {
                        setRenameTargetCourse(e.target.value);
                        setRenameNewCourseName(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="">-- Pilih Mata Kuliah --</option>
                      {existingCourses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Nama Mata Kuliah Baru (Tujuan)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={renameNewCourseName}
                        onChange={(e) => setRenameNewCourseName(e.target.value)}
                        placeholder="Ketikkan nama resmi baru..."
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-red-500 bg-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                      >
                        Ganti Nama Global
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* 4. Tabel Matriks Audit Kelengkapan per Mata Kuliah */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Layers size={14} className="text-red-600" />
                      <span>Matriks Audit Kelengkapan per Mata Kuliah ({courseAuditList.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Periksa apakah semua mata kuliah sudah memiliki kisi-kisi, modul rangkuman, kuis, dan jadwal ujian.
                    </p>
                  </div>

                  {/* Search Audit */}
                  <div className="relative min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchAudit}
                      onChange={(e) => setSearchAudit(e.target.value)}
                      placeholder="Cari mata kuliah..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500 bg-slate-50"
                    />
                  </div>
                </div>

                {/* Audit Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Mata Kuliah & Kode</th>
                        <th className="py-2.5 px-3 text-center">Kisi-Kisi</th>
                        <th className="py-2.5 px-3 text-center">Modul Rangkuman</th>
                        <th className="py-2.5 px-3 text-center">Flashcard</th>
                        <th className="py-2.5 px-3 text-center">Soal Quiz</th>
                        <th className="py-2.5 px-3 text-center">Jadwal Ujian</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredAuditList.map((row, idx) => (
                        <tr key={row.course || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{row.course}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{row.code}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              row.topicsCount > 0 ? 'bg-slate-100 text-slate-700' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {row.topicsCount} Topik
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              row.modulesCount > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {row.modulesCount} Modul
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              row.flashcardsCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {row.flashcardsCount} Kartu
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              row.quizzesCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-rose-100/60 text-rose-700 font-black'
                            }`}>
                              {row.quizzesCount} Soal
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {row.hasSchedule ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {row.scheduleTime || 'Terjadwal ✓'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                Belum ada
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {row.isComplete ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                <Check size={11} />
                                <span>Lengkap</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                                <span>Perlu Isi</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('material');
                                  const targetMat = localMaterials.find(m => m.course.toLowerCase() === row.course.toLowerCase());
                                  if (targetMat) handleEditMat(targetMat);
                                }}
                                className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                title="Edit Materi & Modul MK Ini"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePurgeCourseAllData(row.course)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Hapus Total Seluruh Data MK Ini"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: KELOLA SOAL QUIZ */}
          {/* ========================================================= */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">

              {/* Excel Template & Bulk Import Action Bar */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950">
                      Import Massal Soal Quiz via Excel / Spreadsheet
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Unduh template, isi puluhan soal di Microsoft Excel, lalu upload atau paste ke sini sekaligus.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={downloadQuizExcelTemplate}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Template (.xlsx)</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputQuizRef}
                    onChange={handleUploadQuizFile}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputQuizRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Upload File Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteQuiz(!showPasteQuiz)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardPaste size={13} />
                    <span>{showPasteQuiz ? 'Tutup Paste' : 'Paste dari Excel'}</span>
                  </button>
                </div>
              </div>

              {/* Paste from Excel drawer */}
              {showPasteQuiz && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ClipboardPaste size={14} className="text-emerald-600" />
                      <span>Paste Baris Tabel dari Excel / Google Sheets:</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Format kolom: Mata Kuliah | Soal | Opsi A | Opsi B | Opsi C | Opsi D | Kunci | Pembahasan
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={pasteQuizText}
                    onChange={(e) => setPasteQuizText(e.target.value)}
                    placeholder="Copy beberapa baris dari file Excel lalu paste di sini (Ctrl+V)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteQuiz(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPasteQuiz}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Impor Soal Sekarang
                    </button>
                  </div>
                </div>
              )}

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

              {/* Excel Template & Bulk Import Action Bar for Flashcard */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950">
                      Import Massal Flashcard via Excel / Spreadsheet
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Unduh template, tulis puluhan pertanyaan & jawaban di Excel, lalu upload atau paste sekaligus.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={downloadFlashcardExcelTemplate}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Template (.xlsx)</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputFcRef}
                    onChange={handleUploadFcFile}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputFcRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Upload File Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteFc(!showPasteFc)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardPaste size={13} />
                    <span>{showPasteFc ? 'Tutup Paste' : 'Paste dari Excel'}</span>
                  </button>
                </div>
              </div>

              {/* Paste from Excel drawer for Flashcard */}
              {showPasteFc && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ClipboardPaste size={14} className="text-emerald-600" />
                      <span>Paste Baris Tabel dari Excel / Google Sheets:</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Format kolom: Mata Kuliah | Pertanyaan Depan Kartu | Jawaban Belakang Kartu
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={pasteFcText}
                    onChange={(e) => setPasteFcText(e.target.value)}
                    placeholder="Copy baris flashcard dari file Excel lalu paste di sini (Ctrl+V)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteFc(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPasteFc}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Impor Flashcard Sekarang
                    </button>
                  </div>
                </div>
              )}

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

              {/* Excel Template & Bulk Import Action Bar for Materials */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950">
                      Import Massal Modul Materi via Excel / Spreadsheet
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Unduh template, isi rangkuman modul, rumus, dan tips dosen di Excel, lalu upload atau paste ke sini.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={downloadMaterialExcelTemplate}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Template (.xlsx)</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputMatRef}
                    onChange={handleUploadMatFile}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputMatRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Upload File Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteMat(!showPasteMat)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardPaste size={13} />
                    <span>{showPasteMat ? 'Tutup Paste' : 'Paste dari Excel'}</span>
                  </button>
                </div>
              </div>

              {/* Paste from Excel drawer for Materials */}
              {showPasteMat && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ClipboardPaste size={14} className="text-emerald-600" />
                      <span>Paste Baris Tabel Modul Materi dari Excel / Google Sheets:</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Kolom: Mata Kuliah | Kode | Deskripsi | Kisi-Kisi | Judul Modul | Poin Inti | Rumus | Tips | Soal
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={pasteMatText}
                    onChange={(e) => setPasteMatText(e.target.value)}
                    placeholder="Copy baris materi dari Excel lalu paste di sini (Ctrl+V)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteMat(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPasteMat}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Impor Materi Sekarang
                    </button>
                  </div>
                </div>
              )}

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

                {/* SUB-SECTION: MODUL RANGKUMAN MATERI & FORMULA */}
                <div className="pt-3 border-t border-rose-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                        <Layers size={14} className="text-red-600" />
                        <span>Modul Rangkuman Materi ({matModules.length} Modul Terpasang)</span>
                      </h5>
                      <p className="text-[10px] text-slate-500">
                        Isi rangkuman komprehensif, poin konsep inti, rumus kunci, dan tips ujian per bab/pertemuan.
                      </p>
                    </div>

                    {!showModForm && (
                      <button
                        type="button"
                        onClick={handleOpenAddModule}
                        className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Tambah Modul</span>
                      </button>
                    )}
                  </div>

                  {/* Form Input / Edit Modul */}
                  {showModForm && (
                    <div className="p-4 rounded-2xl bg-white border border-rose-300 shadow-sm space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-slate-900">
                          {editingModIndex !== null ? `Edit Modul #${editingModIndex + 1}` : 'Tambah Modul Rangkuman Baru'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowModForm(false)}
                          className="text-[11px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          Tutup Form Modul
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Judul Modul Rangkuman</label>
                        <input
                          type="text"
                          value={modTitle}
                          onChange={(e) => setModTitle(e.target.value)}
                          placeholder="Contoh: Konsep Dasar & Prinsip 7R (Pertemuan 1 - 3)"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Poin-Poin Konsep Inti (Satu butir per baris)
                        </label>
                        <textarea
                          rows={3}
                          value={modKeyPointsText}
                          onChange={(e) => setModKeyPointsText(e.target.value)}
                          placeholder="Poin 1: Penjelasan konsep inti&#10;Poin 2: Definisi dan perbedaannya&#10;Poin 3: Alur kerja dan tahapannya"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Catatan Formula / Rumus Kunci / Cheatsheet
                          </label>
                          <textarea
                            rows={3}
                            value={modCheatsheet}
                            onChange={(e) => setModCheatsheet(e.target.value)}
                            placeholder="Contoh rumus: BEP = FC / (P - VC) atau sintaks kode"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Tips Ujian Dosen</label>
                            <input
                              type="text"
                              value={modExamTip}
                              onChange={(e) => setModExamTip(e.target.value)}
                              placeholder="Contoh: Dosen sering menanyakan komparasi dalam tabel..."
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-red-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Contoh Soal Ujian</label>
                            <input
                              type="text"
                              value={modSampleQuestion}
                              onChange={(e) => setModSampleQuestion(e.target.value)}
                              placeholder="Contoh: Jelaskan perbedaan 7R logistik dan berikan contohnya!"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowModForm(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveModule}
                          className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
                        >
                          {editingModIndex !== null ? 'Simpan Modul Ini' : '+ Tambahkan ke Modul'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of installed modules */}
                  {matModules.length > 0 ? (
                    <div className="space-y-2">
                      {matModules.map((mod, mIdx) => (
                        <div 
                          key={mod.id || mIdx}
                          className="p-3 rounded-xl border border-rose-200/80 bg-white flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {mIdx + 1}
                              </span>
                              <h6 className="font-bold text-slate-900 truncate">{mod.title}</h6>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 ml-7">
                              {mod.keyPoints?.length || 0} Poin Konsep • {mod.cheatsheet ? 'Formula ✓' : 'Tanpa Formula'} • {mod.examTip ? 'Tips Dosen ✓' : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditModule(mod, mIdx)}
                              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              title="Edit Modul"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteModule(mIdx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Hapus Modul"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white/70 border border-dashed border-rose-200 text-center text-[11px] text-slate-500">
                      Belum ada modul rangkuman khusus. Klik <strong>+ Tambah Modul</strong> untuk menyusun rangkuman materi per pertemuan.
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingMatId ? 'Simpan Pembaruan Mata Kuliah & Modul' : '+ Tambahkan Mata Kuliah'}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                            {mat.code || `MK-${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            {(mat.modules || []).length} Modul Rangkuman
                          </span>
                        </div>
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
                    <label className="text-[11px] font-bold text-slate-700">Ruangan Ujian (Opsional)</label>
                    <input
                      type="text"
                      value={schRoom}
                      onChange={(e) => setSchRoom(e.target.value)}
                      placeholder="Kosongkan jika beda anak beda ruangan"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Daftar Jadwal Ujian Terjadwal ({localSchedule.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleApplyOfficialSchedule}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Calendar size={13} className="text-red-600" />
                    <span>Terapkan Jadwal UTS Resmi (26 Okt - 6 Nov)</span>
                  </button>
                </div>

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
                        <p className="text-xs text-slate-600">
                          ⏰ {s.time}
                          {s.room ? ` • 📍 ${s.room}` : ''}
                        </p>
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
