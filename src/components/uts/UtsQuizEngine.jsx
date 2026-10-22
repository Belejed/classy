import React, { useState } from 'react';
import { 
  HelpCircle, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Award, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtsQuizEngine({ 
  quizzes = [], 
  selectedCourse,
  onSelectCourse 
}) {
  const [activeCourseId, setActiveCourseId] = useState(selectedCourse || null);

  // Group quizzes by course
  const courses = Array.from(new Set(quizzes.map(q => q.course).filter(Boolean)));

  const currentQuizzes = activeCourseId 
    ? quizzes.filter(q => q.course === activeCourseId)
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);

  const handleSelectOption = (qId, optionIdx) => {
    if (answers[qId] !== undefined) return; // Prevent changing after seeing answer
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleNext = () => {
    if (currentIndex < currentQuizzes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handleResetQuiz = () => {
    setAnswers({});
    setCurrentIndex(0);
    setIsFinished(false);
  };

  // If no course is selected, show Course Selection Cards
  if (!activeCourseId) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Pilih Mata Kuliah Latihan Quiz
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik mata kuliah di bawah untuk mulai menguji pemahaman dengan soal latihan & pembahasan instan.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200 self-start sm:self-auto">
            {courses.length} Set Latihan Tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((courseName, idx) => {
            const courseQs = quizzes.filter(q => q.course === courseName);

            return (
              <div
                key={idx}
                onClick={() => {
                  setActiveCourseId(courseName);
                  setCurrentIndex(0);
                  setAnswers({});
                  setIsFinished(false);
                  if (onSelectCourse) onSelectCourse(courseName);
                }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
                      {courseName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {courseQs.length} Soal Latihan Pilihan Ganda & Pembahasan
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    className="w-full py-2.5 rounded-xl bg-slate-900 group-hover:bg-red-600 text-white text-xs font-bold transition-colors text-center"
                  >
                    Mulai Latihan Quiz Ini →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Quiz Practice View
  const currentQ = currentQuizzes[currentIndex];
  const totalCorrect = currentQuizzes.filter(q => answers[q.id] === q.answer).length;
  const scorePercent = currentQuizzes.length > 0 
    ? Math.round((totalCorrect / currentQuizzes.length) * 100) 
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
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
              Latihan Quiz
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
              {activeCourseId}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveCourseId(null);
            if (onSelectCourse) onSelectCourse('all');
          }}
          className="text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer shrink-0"
        >
          ← Ganti Mata Kuliah
        </button>
      </div>

      {isFinished ? (
        /* Result Screen */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Award size={32} />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Hasil Latihan Quiz • {activeCourseId}
            </span>
            <h2 className="text-3xl font-black text-slate-900">
              Skor: <span className="text-red-600">{scorePercent}%</span>
            </h2>
            <p className="text-xs text-slate-500">
              Kamu menjawab {totalCorrect} dari {currentQuizzes.length} soal dengan benar.
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
              onClick={handleResetQuiz}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Ulangi Latihan</span>
            </button>
          </div>
        </div>
      ) : currentQ ? (
        /* Question Card */
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          {/* Progress Counter */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-bold text-slate-500">
            <span>Soal {currentIndex + 1} dari {currentQuizzes.length}</span>
            <span className="text-red-600 font-mono">
              Benar: {totalCorrect} / {Object.keys(answers).length}
            </span>
          </div>

          {/* Question Text */}
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {currentQ.question}
          </h3>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = answers[currentQ.id] === oIdx;
              const hasAnswered = answers[currentQ.id] !== undefined;
              const isCorrectOption = oIdx === currentQ.answer;

              let btnStyle = 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50';

              if (hasAnswered) {
                if (isCorrectOption) {
                  btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-400';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-50 border-rose-400 text-rose-950 font-bold line-through';
                } else {
                  btnStyle = 'bg-slate-50 border-slate-100 text-slate-400 opacity-60';
                }
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => handleSelectOption(currentQ.id, oIdx)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${btnStyle}`}
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                    hasAnswered && isCorrectOption
                      ? 'bg-emerald-600 text-white'
                      : hasAnswered && isSelected
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="flex-1 leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Instant Explanation after answering */}
          {answers[currentQ.id] !== undefined && (
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-200 ${
              answers[currentQ.id] === currentQ.answer 
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300' 
                : 'bg-rose-50 text-rose-950 border-rose-300'
            }`}>
              <div className="font-black flex items-center gap-1.5">
                {answers[currentQ.id] === currentQ.answer ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Jawaban Benar! Mantap!</span>
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

          {/* Next Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={answers[currentQ.id] === undefined}
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all disabled:cursor-not-allowed"
            >
              <span>{currentIndex < currentQuizzes.length - 1 ? 'Soal Berikutnya' : 'Lihat Hasil Akhir'}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
