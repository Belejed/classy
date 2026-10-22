import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  ShieldCheck, 
  AlertCircle, 
  ChevronRight, 
  Sparkles, 
  Timer,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { initialUtsExamSchedule } from '../../data/utsData';

export default function UtsScheduleCountdown({ uts, schedules = [], onSelectCourse }) {
  const examList = uts?.examSchedule && uts.examSchedule.length > 0 
    ? uts.examSchedule 
    : initialUtsExamSchedule;

  // Robustly parse exam start timestamp (handles 08.30, 08:30, 08.30-10.30 WIB)
  const getExamTimestamp = (exam) => {
    if (!exam?.date) return 0;
    let timeStr = '08:00';
    if (exam.time) {
      const match = exam.time.match(/(\d{1,2})[.:](\d{2})/);
      if (match) {
        const hh = match[1].padStart(2, '0');
        const mm = match[2];
        timeStr = `${hh}:${mm}`;
      }
    }
    const dateStr = `${exam.date.trim()}T${timeStr}:00`;
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? new Date(exam.date).getTime() : t;
  };

  // Find nearest upcoming exam, or fallback to first
  const findUpcomingExam = (list) => {
    if (!list || list.length === 0) return null;
    const now = Date.now();
    const sorted = [...list].sort((a, b) => getExamTimestamp(a) - getExamTimestamp(b));
    const upcoming = sorted.find(ex => getExamTimestamp(ex) > now);
    return upcoming || sorted[0];
  };

  // Calculate Nearest Exam & Countdown
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [targetExam, setTargetExam] = useState(() => findUpcomingExam(examList));

  useEffect(() => {
    if (!targetExam) {
      setTargetExam(findUpcomingExam(examList));
    }
  }, [examList]);

  useEffect(() => {
    if (!targetExam?.date) return;
    
    const updateCountdown = () => {
      const now = Date.now();
      const targetTime = getExamTimestamp(targetExam);
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isPast: false });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetExam]);

  return (
    <div className="space-y-6">
      {/* 1. Live Countdown Banner */}
      {targetExam && (
        <div className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 sm:p-7 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-yellow-200">
                <Timer size={13} className="animate-pulse text-yellow-300" />
                <span>Ujian Berikutnya Yang Dihadapi</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {targetExam.course}
              </h2>
              <p className="text-xs text-white/90 font-medium flex items-center gap-2 flex-wrap">
                <span>📅 {targetExam.dayName || 'Jadwal'}, {targetExam.date}</span>
                <span>•</span>
                <span>⏰ {targetExam.time}</span>
                <span>•</span>
                <span>📍 {targetExam.room}</span>
              </p>
            </div>

            {/* Live Counter Display */}
            <div className="flex items-center gap-2 sm:gap-3 bg-black/25 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20 self-start md:self-auto shadow-inner">
              {[
                { val: timeLeft.days, label: 'HARI' },
                { val: timeLeft.hours, label: 'JAM' },
                { val: timeLeft.minutes, label: 'MENIT' },
                { val: timeLeft.seconds, label: 'DETIK' }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center min-w-[50px] sm:min-w-[58px]">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-yellow-300 leading-none">
                    {String(Math.max(0, item.val)).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-extrabold tracking-wider text-white/75 mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Timeline Grid Jadwal Ujian Interaktif */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-red-600" />
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Jadwal Lengkap & Ruang Ujian UTS
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {examList.length} Mata Kuliah Terjadwal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {examList.map((exam, idx) => {
            const isTarget = targetExam?.id === exam.id;
            return (
              <div 
                key={exam.id || idx}
                onClick={() => setTargetExam(exam)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-4 ${
                  isTarget 
                    ? 'bg-white border-red-500 ring-2 ring-red-400/40 shadow-md shadow-red-500/10' 
                    : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                      {exam.dayName || 'Jadwal'}, {exam.date}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {exam.sks || 3} SKS
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                    {exam.course}
                  </h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span>{exam.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{exam.room}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={13} className="text-slate-400 shrink-0" />
                      <span>Sifat: <strong className="text-rose-700">{exam.nature || 'Closed Book'}</strong></span>
                    </div>
                  </div>

                  {exam.topics && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                      <p className="font-bold text-slate-800 mb-0.5">Kisi-kisi Materi:</p>
                      <p className="line-clamp-2">{exam.topics}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400">
                    {exam.lecturer ? `Dosen: ${exam.lecturer}` : 'Jadwal Terkonfirmasi'}
                  </span>
                  {onSelectCourse && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCourse(exam.course);
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5"
                    >
                      <span>Buka Materi</span>
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
