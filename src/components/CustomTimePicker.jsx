import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

const COMMON_PRESETS = [
  { label: '23:59', desc: 'Malam', time: '23:59' },
  { label: '17:00', desc: 'Sore', time: '17:00' },
  { label: '12:00', desc: 'Siang', time: '12:00' },
  { label: '08:00', desc: 'Pagi', time: '08:00' }
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '59'];

export default function CustomTimePicker({
  value = '23:59',
  onChange,
  required = false,
  placeholder = 'Pilih jam...',
  className = '',
  align = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hoursListRef = useRef(null);
  const minutesListRef = useRef(null);

  const [hours, minutes] = (value || '23:59').split(':');
  const safeHours = hours && hours.length === 2 ? hours : '23';
  const safeMinutes = minutes && minutes.length === 2 ? minutes : '59';

  // Outside click & ESC listener
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

  // Scroll active items into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hoursListRef.current) {
          const activeH = hoursListRef.current.querySelector('[data-active="true"]');
          if (activeH) activeH.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (minutesListRef.current) {
          const activeM = minutesListRef.current.querySelector('[data-active="true"]');
          if (activeM) activeM.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 50);
    }
  }, [isOpen]);

  const handleHourSelect = (h) => {
    onChange(`${h}:${safeMinutes}`);
  };

  const handleMinuteSelect = (m) => {
    onChange(`${safeHours}:${m}`);
  };

  const handlePresetSelect = (timeStr) => {
    onChange(timeStr);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input for HTML5 form validation */}
      <input
        type="text"
        value={value || ''}
        onChange={() => {}}
        required={required}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Trigger Button - Exact 42px height matching CustomDatePicker */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full h-[42px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs bg-white ${
          isOpen
            ? 'border-[#0F172A] ring-2 ring-[#0F172A]/10'
            : 'border-[#CBD5E1] hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            value ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <Clock size={14} />
          </div>
          <span className={`text-xs sm:text-sm font-semibold truncate ${value ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
            {value ? `${value} WIB` : placeholder}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#0F172A]' : ''}`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 z-50 w-[270px] bg-white border border-[#CBD5E1] shadow-2xl rounded-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-[#0F172A]">Pilih Jam Pengumpulan</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              {safeHours}:{safeMinutes} WIB
            </span>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1.5">
            {COMMON_PRESETS.map((p) => {
              const isSelected = value === p.time;
              return (
                <button
                  key={p.time}
                  type="button"
                  onClick={() => handlePresetSelect(p.time)}
                  className={`py-1 px-1 text-center rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-mono">{p.label}</div>
                  <div className={`text-[9px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{p.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Time Wheel / Columns (Jam & Menit) */}
          <div className="pt-1">
            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-slate-500 mb-1">
              <span>JAM</span>
              <span>MENIT</span>
            </div>
            <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-1 bg-slate-50/50">
              {/* Hours Column */}
              <div ref={hoursListRef} className="h-44 overflow-y-auto space-y-1 p-1 custom-scrollbar">
                {HOURS.map((h) => {
                  const isSelected = h === safeHours;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-active={isSelected}
                      onClick={() => handleHourSelect(h)}
                      className={`w-full py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0F172A] text-white shadow-xs font-bold'
                          : 'text-slate-700 hover:bg-slate-200/70'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>

              {/* Minutes Column */}
              <div ref={minutesListRef} className="h-44 overflow-y-auto space-y-1 p-1 custom-scrollbar">
                {MINUTES.map((m) => {
                  const isSelected = m === safeMinutes;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-active={isSelected}
                      onClick={() => handleMinuteSelect(m)}
                      className={`w-full py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0F172A] text-white shadow-xs font-bold'
                          : 'text-slate-700 hover:bg-slate-200/70'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Format 24 Jam (WIB)</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
