import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  ArrowLeft, 
  RotateCcw, 
  Shuffle, 
  Sparkles, 
  Flame, 
  Award,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtsFlashcardsPro({ 
  flashcards = [], 
  selectedCourse, 
  onSelectCourse,
  storagePrefix = 'classy_uts' 
}) {
  const [activeCourseId, setActiveCourseId] = useState(selectedCourse || null);

  // Group cards by course
  const courses = Array.from(new Set(flashcards.map(f => f.course).filter(Boolean)));

  const currentCards = activeCourseId 
    ? flashcards.filter(f => f.course === activeCourseId)
    : [];

  const [deck, setDeck] = useState(currentCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const [masteredIds, setMasteredIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_fc_mastered`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // When active course changes
  useEffect(() => {
    if (activeCourseId) {
      const filtered = flashcards.filter(f => f.course === activeCourseId);
      setDeck(filtered);
      setCurrentIndex(0);
      setIsFlipped(false);
      setStreak(0);
    }
  }, [activeCourseId, flashcards]);

  const currentCard = deck[currentIndex];

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast.success('Kartu flashcard diacak!');
  };

  const handleRateCard = (rating) => {
    if (!currentCard) return;

    if (rating === 'easy') {
      const nextMastered = { ...masteredIds, [currentCard.id]: true };
      setMasteredIds(nextMastered);
      try {
        localStorage.setItem(`${storagePrefix}_fc_mastered`, JSON.stringify(nextMastered));
      } catch {}
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
    } else {
      setStreak(0);
      if (rating === 'hard') {
        setDeck(prev => [...prev, currentCard]);
      }
    }

    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('Sesi flashcard mata kuliah ini selesai!');
      setCurrentIndex(deck.length);
    }
  };

  const handleResetSession = () => {
    const filtered = flashcards.filter(f => f.course === activeCourseId);
    setDeck(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStreak(0);
  };

  // If no course is selected, show Course Selection Grid
  if (!activeCourseId) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Pilih Mata Kuliah Flashcard
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih mata kuliah terlebih dahulu untuk memulai sesi latihan mengingat konsep inti.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200 self-start sm:self-auto">
            {courses.length} Dek Flashcard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((courseName, idx) => {
            const courseCards = flashcards.filter(f => f.course === courseName);
            const masteredCount = courseCards.filter(c => masteredIds[c.id]).length;
            const progress = courseCards.length > 0 ? Math.round((masteredCount / courseCards.length) * 100) : 0;

            return (
              <div
                key={idx}
                onClick={() => {
                  setActiveCourseId(courseName);
                  if (onSelectCourse) onSelectCourse(courseName);
                }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
                      {courseName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {courseCards.length} Kartu Pertanyaan & Konsep Kunci
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="text-[11px] text-slate-400">Penguasaan</span>
                    <span className="text-red-600 font-mono">{masteredCount}/{courseCards.length} Kartu</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <button 
                    type="button"
                    className="w-full mt-2 py-2 rounded-xl bg-slate-900 group-hover:bg-red-600 text-white text-xs font-bold transition-colors text-center"
                  >
                    Mulai Belajar Flashcard →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Flashcard Deck View for Selected Course
  const courseCards = flashcards.filter(f => f.course === activeCourseId);
  const masteredCount = courseCards.filter(c => masteredIds[c.id]).length;
  const progressPercent = courseCards.length > 0 ? Math.round((masteredCount / courseCards.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      {/* Top Breadcrumb & Controls */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              setActiveCourseId(null);
              if (onSelectCourse) onSelectCourse('all');
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors shrink-0"
            title="Kembali ke Daftar Mata Kuliah"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
              Flashcard Dek
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
              {activeCourseId}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-xs font-black">
            <Flame size={14} className={streak > 0 ? 'text-orange-500 animate-bounce' : 'text-slate-300'} />
            <span>{streak}</span>
          </div>
          <button
            type="button"
            onClick={handleShuffle}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer text-xs font-bold flex items-center gap-1"
            title="Acak Urutan Kartu"
          >
            <Shuffle size={14} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Dikuasai: {masteredCount} dari {courseCards.length} Kartu</span>
          <span className="font-mono text-emerald-600 font-extrabold">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Flashcard Area */}
      {currentIndex < deck.length && currentCard ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
            <span>Kartu {currentIndex + 1} dari {deck.length}</span>
            <span className="text-red-500">Klik kartu untuk melihat jawaban</span>
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative min-h-[260px] sm:min-h-[300px] w-full rounded-3xl bg-white border-2 border-rose-200 shadow-xl shadow-rose-500/5 p-6 sm:p-8 flex flex-col justify-between text-center cursor-pointer select-none transition-all duration-300 hover:border-red-400 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {isFlipped ? 'KUNCI JAWABAN' : 'PERTANYAAN'}
              </span>
              <span className="text-red-500 flex items-center gap-1 font-semibold">
                <span>Balik Kartu</span>
                <span>🔄</span>
              </span>
            </div>

            <div className="my-auto py-6">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500 mb-2">
                {isFlipped ? '💡 Penjelasan Konsep Inti' : '❓ Konsep / Pertanyaan'}
              </p>
              <h3 className={`font-black transition-all ${
                isFlipped 
                  ? 'text-sm sm:text-base text-slate-800 leading-relaxed font-semibold' 
                  : 'text-base sm:text-xl text-slate-900 leading-snug'
              }`}>
                {isFlipped ? currentCard.answer : currentCard.question}
              </h3>
            </div>

            <div className="text-[10px] text-slate-400">
              {isFlipped ? 'Pilih tombol di bawah sesuai ingatanmu:' : 'Tebak dalam hati sebelum membalik kartu'}
            </div>
          </div>

          {/* 3 Action Buttons */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleRateCard('hard')}
              className="py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="text-sm">❌</span>
              <span>Belum Paham</span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard('medium')}
              className="py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="text-sm">🤔</span>
              <span>Ragu-Ragu</span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard('easy')}
              className="py-3 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="text-sm">✨</span>
              <span>Sudah Hafal</span>
            </button>
          </div>
        </div>
      ) : (
        /* Completion Screen */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-md">
            <Award size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">Selesai Mempelajari {activeCourseId}!</h3>
            <p className="text-xs text-slate-500">
              Semua flashcard untuk mata kuliah ini sudah dipelajari. Streak tertinggi: <strong>{maxStreak} kartu</strong>!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveCourseId(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Pilih Mata Kuliah Lain
            </button>
            <button
              type="button"
              onClick={handleResetSession}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Ulangi Mata Kuliah Ini</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
