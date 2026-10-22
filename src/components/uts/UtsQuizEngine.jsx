import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Award, 
  Timer, 
  Flag, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  BookOpen,
  Check,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtsQuizEngine({ 
  quizzes = [], 
  selectedCourseFilter = 'all',
  onSelectCourseFilter 
}) {
  const courseList = ['all', ...Array.from(new Set(quizzes.map(q => q.course).filter(Boolean)))];

  const filteredQuizzes = selectedCourseFilter === 'all'
    ? quizzes
    : quizzes.filter(q => q.course === selectedCourseFilter);

  // Modes: 'practice' (instant feedback) | 'cbt' (exam simulation with timer & grid)
  const [quizMode, setQuizMode] = useState('cbt'); // 'cbt' | 'practice'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(15 * 60); // 15 mins
  const [timerActive, setTimerActive] = useState(false);

  // Reset when course filter changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFlagged({});
    setIsSubmitted(false);
    setTimerSeconds(15 * 60);
    setTimerActive(quizMode === 'cbt');
  }, [selectedCourseFilter, quizMode]);

  // CBT Countdown Timer
  useEffect(() => {
    if (!timerActive || isSubmitted || quizMode !== 'cbt') return;

    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, isSubmitted, quizMode]);

  const handleSelectOption = (qId, optionIdx) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleToggleFlag = (qId) => {
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmitQuiz = (isAuto = false) => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    setTimerActive(false);
    if (isAuto) {
      toast('Waktu ujian habis! Lembar jawaban dikumpulkan otomatis.', { icon: '⏰' });
    } else {
      toast.success('Ujian berhasil diselesaikan! Lihat rapormu di bawah.');
    }
  };

  const handleRestartQuiz = () => {
    setAnswers({});
    setFlagged({});
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setTimerSeconds(15 * 60);
    setTimerActive(quizMode === 'cbt');
  };

  // Score calculations
  const calculateScore = () => {
    let correct = 0;
    filteredQuizzes.forEach(q => {
      if (answers[q.id] === q.answer) correct++;
    });
    return filteredQuizzes.length > 0 ? Math.round((correct / filteredQuizzes.length) * 100) : 0;
  };

  const getGrade = (score) => {
    if (score >= 85) return { grade: 'A', text: 'Sangat Memuaskan (Cumlaude)', color: 'text-emerald-600' };
    if (score >= 75) return { grade: 'B+', text: 'Memuaskan (Siap UTS)', color: 'text-blue-600' };
    if (score >= 65) return { grade: 'B', text: 'Cukup Baik (Tingkatkan lagi)', color: 'text-amber-600' };
    if (score >= 50) return { grade: 'C', text: 'Perlu Banyak Belajar Lagi', color: 'text-orange-600' };
    return { grade: 'D/E', text: 'Waspada! Segera Baca Ulang Rangkuman', color: 'text-rose-600' };
  };

  const currentQ = filteredQuizzes[currentQuestionIndex];
  const score = calculateScore();
  const gradeInfo = getGrade(score);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Navigation Bar & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
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

        {/* Mode Switcher: CBT Simulation vs Practice */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setQuizMode('cbt')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              quizMode === 'cbt'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Simulasi CBT UTS
          </button>
          <button
            type="button"
            onClick={() => setQuizMode('practice')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              quizMode === 'practice'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Mode Latihan Bebas
          </button>
        </div>
      </div>

      {filteredQuizzes.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
          Belum ada soal kuis untuk mata kuliah ini.
        </div>
      ) : isSubmitted ? (
        /* Result Screen */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300">
                Rapor Hasil Simulasi UTS
              </span>
              <h2 className="text-2xl font-black text-white">
                Skor Akhir: <span className="text-yellow-300 font-mono">{score}</span> / 100
              </h2>
              <p className="text-xs text-slate-300">
                Predikat: <strong className="text-white">{gradeInfo.grade}</strong> ({gradeInfo.text})
              </p>
            </div>

            <button
              type="button"
              onClick={handleRestartQuiz}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Coba Ujian Lagi</span>
            </button>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900">
              Evaluasi & Pembahasan Mendalam Semua Soal:
            </h4>

            {filteredQuizzes.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.answer;

              return (
                <div 
                  key={q.id || idx}
                  className={`p-5 rounded-2xl border space-y-3 ${
                    isCorrect 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Nomor {idx + 1} • {q.course}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isCorrect ? 'Jawaban Benar' : 'Jawaban Salah'}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900">{q.question}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => {
                      const isOptionCorrect = oIdx === q.answer;
                      const isOptionChosen = userAns === oIdx;

                      return (
                        <div 
                          key={oIdx}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            isOptionCorrect
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold'
                              : isOptionChosen
                              ? 'bg-rose-100/70 border-rose-300 text-rose-950 line-through'
                              : 'bg-white border-slate-200 text-slate-600 opacity-60'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white text-center leading-5 font-mono text-[10px] shrink-0 font-bold">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="p-3 rounded-xl bg-white/80 border border-slate-200 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-900 block">💡 Pembahasan:</span>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Active CBT / Practice Interface */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Question Column */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
            {/* Question Header & Timer */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                  {currentQ?.course || 'UTS Soal'}
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  Soal Nomor {currentQuestionIndex + 1} dari {filteredQuizzes.length}
                </h3>
              </div>

              {quizMode === 'cbt' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-mono text-xs font-black">
                  <Timer size={14} className="animate-pulse" />
                  <span>Sisa: {formatTime(timerSeconds)}</span>
                </div>
              )}
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentQ?.question}
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ?.options.map((opt, oIdx) => {
                const isSelected = answers[currentQ.id] === oIdx;
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, oIdx)}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold ring-2 ring-rose-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                      isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Instant feedback in practice mode */}
            {quizMode === 'practice' && answers[currentQ.id] !== undefined && (
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-200 ${
                answers[currentQ.id] === currentQ.answer 
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-300' 
                  : 'bg-rose-50 text-rose-950 border-rose-300'
              }`}>
                <div className="font-black flex items-center gap-1.5">
                  {answers[currentQ.id] === currentQ.answer ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Jawaban Tepat!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} className="text-rose-600" />
                      <span>Kurang Tepat. Jawaban Benar: Opsi {String.fromCharCode(65 + currentQ.answer)}</span>
                    </>
                  )}
                </div>
                {currentQ.explanation && (
                  <p className="text-[11px] text-slate-700 pt-1 border-t border-black/10">
                    {currentQ.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Sebelumnya</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  flagged[currentQ.id]
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Flag size={13} className={flagged[currentQ.id] ? 'fill-amber-500 text-amber-500' : ''} />
                <span>{flagged[currentQ.id] ? 'Ragu-Ragu' : 'Tandai Ragu'}</span>
              </button>

              {currentQuestionIndex < filteredQuizzes.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmitQuiz(false)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Selesai & Kumpulkan
                </button>
              )}
            </div>
          </div>

          {/* CBT Question Grid Navigation Column */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Lembar Nomor Soal
              </h4>
              <p className="text-[10px] text-slate-400">
                Klik nomor untuk langsung loncat ke soal.
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {filteredQuizzes.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isFlag = flagged[q.id];
                const isCurrent = currentQuestionIndex === idx;

                let btnStyle = 'bg-slate-50 border-slate-200 text-slate-600';
                if (isCurrent) {
                  btnStyle = 'ring-2 ring-red-500 font-black border-red-500';
                }
                if (isFlag) {
                  btnStyle += ' bg-amber-100 border-amber-300 text-amber-900';
                } else if (isAnswered) {
                  btnStyle += ' bg-emerald-500 border-emerald-600 text-white font-bold';
                }

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 rounded-xl border text-xs flex items-center justify-center font-mono transition-all cursor-pointer ${btnStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Sudah Dijawab ({Object.keys(answers).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-200 border border-amber-400" />
                <span>Ragu-Ragu ({Object.values(flagged).filter(Boolean).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300" />
                <span>Belum Dijawab ({filteredQuizzes.length - Object.keys(answers).length})</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleSubmitQuiz(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer mt-2"
            >
              Kumpulkan Ujian Sekarang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
