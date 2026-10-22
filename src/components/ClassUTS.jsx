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
import UtsManageModal from './uts/UtsManageModal';
import { 
  initialUtsMaterials, 
  initialUtsFlashcards, 
  initialUtsQuizzes,
  initialUtsExamSchedule
} from '../data/utsData';

export default function ClassUTS({ 
  currentClass, 
  currentUser, 
  schedules = [], 
  tasks = [], 
  onUpdateClassSettings 
}) {
  const [activeSection, setActiveSection] = useState('schedule'); // 'schedule' | 'materials' | 'flashcards' | 'quiz'
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageInitialTab, setManageInitialTab] = useState('control');

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

  // Default curriculum courses of the class (M.Log B)
  const defaultClassCourses = [
    'Pengantar Logistik',
    'Pengantar Transportasi',
    'Ekonomi Mikro',
    'Matematika Ekonomi',
    'Pengantar Akuntansi',
    'Pengantar Bisnis dan Inovasi',
    'Prinsip - Prinsip Manajemen',
    'Pendidikan Pancasila'
  ];

  // Check if UTS data has ever been customized or saved by user
  const isCustomized = Boolean(uts.customized || uts.updatedAt || uts.isCustomized);

  const materialsList = !isCustomized
    ? initialUtsMaterials 
    : (uts.materials || []);

  const flashcardsList = !isCustomized
    ? initialUtsFlashcards 
    : (uts.flashcards || []);

  const quizzesList = !isCustomized
    ? initialUtsQuizzes 
    : (uts.quizzes || []);

  const examScheduleList = !isCustomized
    ? initialUtsExamSchedule 
    : (uts.examSchedule || []);

  const availableCourses = Array.from(new Set([
    ...(schedules || []).map(s => s.subject || s.title || s.course),
    ...(tasks || []).map(t => t.course),
    ...materialsList.map(m => m.course),
    ...(!isCustomized ? defaultClassCourses : [])
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'));

  // Progress summary
  const totalTopics = materialsList.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  const completedTopics = Object.values(checkedTopics).filter(Boolean).length;
  const studyProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const handleOpenManage = (tab = 'quiz') => {
    setManageInitialTab(tab);
    setShowManageModal(true);
  };

  const handleSaveAllUtsData = async (updatedUts) => {
    if (!onUpdateClassSettings || !currentClass?.id) return;
    await onUpdateClassSettings(currentClass.id, {
      uts: updatedUts
    });
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
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenManage('control')}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-950 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer self-start sm:self-auto active:scale-95 border border-white/20"
                >
                  <ShieldCheck size={14} className="text-yellow-300" />
                  <span>Control Panel UTS</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenManage('quiz')}
                  className="px-3.5 py-2 rounded-xl bg-white text-red-700 hover:bg-yellow-300 hover:text-red-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer self-start sm:self-auto active:scale-95"
                >
                  <Edit3 size={14} />
                  <span>Kelola Soal & Konten</span>
                </button>
              </div>
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
          { id: 'quiz', label: 'Latihan Quiz', icon: HelpCircle, badge: 'Quiz' }
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
          isManager={isManager}
          onOpenManage={handleOpenManage}
        />
      )}

      {activeSection === 'flashcards' && (
        <UtsFlashcardsPro
          flashcards={flashcardsList}
          selectedCourse={selectedCourseFilter === 'all' ? null : selectedCourseFilter}
          onSelectCourse={setSelectedCourseFilter}
          storagePrefix={storagePrefix}
          isManager={isManager}
          onOpenManage={handleOpenManage}
        />
      )}

      {activeSection === 'quiz' && (
        <UtsQuizEngine
          quizzes={quizzesList}
          selectedCourse={selectedCourseFilter === 'all' ? null : selectedCourseFilter}
          onSelectCourse={setSelectedCourseFilter}
          isManager={isManager}
          onOpenManage={handleOpenManage}
        />
      )}

      {/* 4. Full UTS Content & Quiz Manager Modal for Komti */}
      <UtsManageModal
        isOpen={showManageModal && isManager}
        onClose={() => setShowManageModal(false)}
        initialTab={manageInitialTab}
        uts={uts}
        currentClass={currentClass}
        materials={materialsList}
        flashcards={flashcardsList}
        quizzes={quizzesList}
        examSchedule={examScheduleList}
        availableCourses={availableCourses}
        onSave={handleSaveAllUtsData}
      />

    </div>
  );
}
