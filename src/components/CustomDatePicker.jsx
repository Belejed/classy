import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Sparkles,
  Clock,
  X
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Format date into localized Indonesian label e.g. "Jumat, 11 Sep 2026"
export const formatIndonesianDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return dateStr;

    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][month];
    return `${dayName}, ${day} ${monthShort} ${year}`;
  } catch {
    return dateStr;
  }
};

// Compute human friendly tag: "Hari ini", "Besok", "3 hari lagi", etc.
export const getRelativeDaysTag = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Hari Ini', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (diffDays === 1) return { label: 'Besok', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
  if (diffDays === 2) return { label: 'Lusa', color: 'bg-sky-100 text-sky-800 border-sky-200' };
  if (diffDays > 2 && diffDays <= 7) return { label: `${diffDays} hari lagi`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (diffDays > 7) return { label: `${diffDays} hari lagi`, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} hari lalu`, color: 'bg-rose-100 text-rose-800 border-rose-200' };
  return null;
};

export default function CustomDatePicker({
  value,
  onChange,
  required = false,
  placeholder = 'Pilih tanggal deadline...',
  className = '',
  showRelativeTag = true,
  showQuickPresets = true,
  align = 'left' // 'left' | 'right' | 'auto'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] = useState(align);
  const containerRef = useRef(null);

  const initialDate = useMemo(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) return d;
      }
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setViewYear(y);
          setViewMonth(m);
        }
      }
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (align === 'auto') {
        const rect = containerRef.current.getBoundingClientRect();
        if (window.innerWidth - rect.left < 320 && rect.right >= 320) {
          setResolvedAlign('right');
        } else {
          setResolvedAlign('left');
        }
      } else {
        setResolvedAlign(align);
      }
    }
  }, [isOpen, align]);

  const prevMonth = () => {
    setViewMonth(prev => {
      if (prev === 0) {
        setViewYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setViewMonth(prev => {
      if (prev === 11) {
        setViewYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, month: m, year: y, isCurrentMonth: false, dateStr });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, month: viewMonth, year: viewYear, isCurrentMonth: true, dateStr });
    }

    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, month: m, year: y, isCurrentMonth: false, dateStr });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const selectDate = (dateStr) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const selectQuickOffset = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    selectDate(dateStr);
  };

  const relativeTag = getRelativeDaysTag(value);
  const formattedDisplay = formatIndonesianDate(value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs min-h-[40px] bg-white ${
          isOpen 
            ? 'border-[#0F172A] ring-2 ring-[#0F172A]/10' 
            : 'border-[#CBD5E1] hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            value ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <CalendarIcon size={14} />
          </div>
          <div className="min-w-0 flex-1 truncate">
            {value ? (
              <span className="text-xs sm:text-sm font-semibold text-[#0F172A] truncate block">
                {formattedDisplay}
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-[#94A3B8]">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showRelativeTag && relativeTag && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${relativeTag.color} hidden xs:inline-block`}>
              {relativeTag.label}
            </span>
          )}
          <ChevronDown 
            size={14} 
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0F172A]' : ''}`} 
          />
        </div>
      </button>

      <input 
        type="text" 
        value={value || ''} 
        onChange={() => {}} 
        required={required} 
        className="sr-only" 
        tabIndex={-1} 
        aria-hidden="true" 
      />

      {isOpen && (
        <div className={`absolute ${resolvedAlign === 'right' ? 'right-0' : 'left-0'} top-full mt-2 z-50 w-[295px] sm:w-[315px] bg-white border border-[#CBD5E1] shadow-2xl rounded-2xl p-3 sm:p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150`}>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-[#0F172A] transition-colors cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-[#0F172A] transition-colors cursor-pointer"
                title="Bulan berikutnya"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {showQuickPresets && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => selectQuickOffset(0)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  value === todayStr 
                    ? 'bg-[#0F172A] text-white border-[#0F172A]' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => selectQuickOffset(1)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Besok
              </button>
              <button
                type="button"
                onClick={() => selectQuickOffset(3)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                +3 Hari
              </button>
              <button
                type="button"
                onClick={() => selectQuickOffset(7)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                +1 Minggu
              </button>
            </div>
          )}

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((d, i) => (
              <span 
                key={d} 
                className={`text-[10px] font-bold py-1 ${i >= 5 ? 'text-rose-500' : 'text-[#64748B]'}`}
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateStr === value;
              const isToday = cell.dateStr === todayStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => selectDate(cell.dateStr)}
                  className={`h-8 rounded-xl text-xs flex items-center justify-center font-medium transition-all cursor-pointer select-none relative ${
                    isSelected
                      ? 'bg-[#0F172A] text-white font-bold shadow-xs scale-105 z-10'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 hover:bg-indigo-100'
                      : cell.isCurrentMonth
                      ? 'text-[#0F172A] hover:bg-slate-100'
                      : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>{cell.day}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-indigo-600 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#94A3B8] truncate">
              {value ? `Dipilih: ${formattedDisplay}` : 'Belum memilih tanggal'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-[#0F172A] hover:underline cursor-pointer shrink-0"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
