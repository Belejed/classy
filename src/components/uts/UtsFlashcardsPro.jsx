import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Shuffle, 
  Sparkles, 
  Flame, 
  HelpCircle, 
  Volume2, 
  AlertCircle,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtsFlashcardsPro({ 
  flashcards = [], 
  selectedCourseFilter = 'all', 
  onSelectCourseFilter,
  storagePrefix = 'classy_uts' 
}) {
  const courseList = ['all', ...Array.from(new Set(flashcards.map(f => f.course).filter(Boolean)))];

  const filteredCards = selectedCourseFilter === 'all'
    ? flashcards
    : flashcards.filter(f => f.course === selectedCourseFilter);

  const [deck, setDeck] = useState(filteredCards);
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

  // Sync deck when filter changes
  useEffect(() => {
    setDeck(filteredCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedCourseFilter, flashcards]);

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
        // Re-insert card at the end of deck for repetition
        setDeck(prev => [...prev, currentCard]);
      }
    }

    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('Sesi flashcard selesai! Luar biasa!');
      setCurrentIndex(deck.length); // trigger completion screen
    }
  };

  const handleResetSession = () => {
    setDeck(filteredCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStreak(0);
  };

  const masteredCount = Object.keys(masteredIds).filter(id => 
    filteredCards.some(c => c.id === id)
  ).length;

  const progressPercent = filteredCards.length > 0 
    ? Math.round((masteredCount / filteredCards.length) * 100) 
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 1. Header Filter Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Course Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
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

        {/* Shuffle Button & Streak */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-xs font-black">
            <Flame size={14} className={streak > 0 ? 'text-orange-500 animate-bounce' : 'text-slate-300'} />
            <span>{streak} Streak</span>
          </div>

          <button
            type="button"
            onClick={handleShuffle}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer text-xs font-bold flex items-center gap-1"
            title="Acak Urutan Kartu"
          >
            <Shuffle size={14} />
            <span className="hidden sm:inline">Acak</span>
          </button>
        </div>
      </div>

      {/* 2. Progress Tracker Gauge */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Penguasaan Materi ({masteredCount} dari {filteredCards.length} Kartu)</span>
          <span className="font-mono text-red-600 font-extrabold">{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Main Flashcard Area */}
      {currentIndex < deck.length && currentCard ? (
        <div className="space-y-4">
          {/* Card Counter & Course Badge */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span className="font-mono text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100">
              {currentCard.course}
            </span>
            <span>Kartu {currentIndex + 1} dari {deck.length}</span>
          </div>

          {/* 3D Interactive Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative min-h-[260px] sm:min-h-[300px] w-full rounded-3xl bg-white border-2 border-rose-200/90 shadow-xl shadow-rose-500/5 p-6 sm:p-8 flex flex-col justify-between text-center cursor-pointer select-none transition-all duration-300 hover:border-red-400 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {isFlipped ? 'KUNCI JAWABAN' : 'PERTANYAAN UTS'}
              </span>
              <span className="text-red-500 flex items-center gap-1 font-semibold">
                <span>Klik untuk balik</span>
                <span>🔄</span>
              </span>
            </div>

            <div className="my-auto py-6">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500 mb-2">
                {isFlipped ? '💡 Penjelasan Konsep Inti' : '❓ Pertanyaan / Kasus'}
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
              {isFlipped ? 'Evaluasi seberapa paham kamu materi ini:' : 'Coba sebutkan jawabannya di dalam hati sebelum membuka kartu'}
            </div>
          </div>

          {/* 3-Level Evaluation Buttons */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleRateCard('hard')}
              className="py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="text-sm">❌</span>
              <span>Belum Paham</span>
              <span className="text-[9px] font-medium opacity-75">Ulangi nanti</span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard('medium')}
              className="py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="text-sm">🤔</span>
              <span>Ragu-Ragu</span>
              <span className="text-[9px] font-medium opacity-75">Perlu review</span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard('easy')}
              className="py-3 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="text-sm">✨</span>
              <span>Sudah Hafal</span>
              <span className="text-[9px] font-medium opacity-85">Kuasai konsep</span>
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
            <h3 className="text-xl font-black text-slate-900">Sesi Flashcard Tuntas!</h3>
            <p className="text-xs text-slate-500">
              Kamu telah menyelesaikan seluruh flashcard dalam sesi ini dengan streak tertinggi <strong>{maxStreak} kartu</strong>!
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetSession}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 mx-auto cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Pelajari Ulang Dek Ini</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
