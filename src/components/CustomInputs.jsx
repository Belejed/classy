import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

// 1. CUSTOM SELECT DROPDOWN COMPONENT (Notion-style)
export function CustomSelect({ value, onChange, options = [], className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-brand-app/40 border border-brand-sidebar hover:border-brand-accent focus:border-brand-accent rounded-full px-4 py-2 text-xs font-semibold text-brand-active text-left outline-none transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {activeOption?.indicator}
          <span>{activeOption?.label}</span>
        </div>
        <span className="text-[10px] text-brand-muted">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-brand-card border border-brand-sidebar rounded-2xl shadow-lg p-1.5 overflow-hidden animate-fade-in">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors hover:bg-brand-app/40 ${
                value === opt.value ? 'bg-brand-app/20 text-brand-accent font-bold' : 'text-brand-active'
              }`}
            >
              {opt.indicator}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 2. CUSTOM DATE PICKER COMPONENT (Notion-style)
export function CustomDatePicker({ value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initialDate = value ? new Date(value) : new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });
  const pickerRef = useRef(null);

  const selectedDate = value ? new Date(value) : new Date();

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const gridCells = [];
  for (let i = 0; i < firstDayIndex; i++) gridCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) gridCells.push(i);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const formatDateStr = (dayNum) => {
    const mStr = (month + 1).toString().padStart(2, '0');
    const dStr = dayNum.toString().padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  // Human readable format: e.g. "16 Jul 2026"
  const getDisplayDateStr = () => {
    if (!value) return 'Pilih Tanggal';
    const d = new Date(value);
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-brand-app/40 border border-brand-sidebar hover:border-brand-accent focus:border-brand-accent rounded-full px-4 py-2 text-xs font-semibold text-brand-active text-left outline-none transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={13} className="text-brand-accent" />
          <span>{getDisplayDateStr()}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 w-64 bg-brand-card border border-brand-sidebar rounded-2xl shadow-xl p-4 space-y-3 animate-fade-in">
          {/* Header Month Switcher */}
          <div className="flex items-center justify-between shrink-0 pb-1 border-b border-brand-sidebar/40">
            <span className="text-xs font-bold text-brand-active">
              {monthNames[month]} {year}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 border border-brand-sidebar rounded-full hover:bg-brand-app/30"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 border border-brand-sidebar rounded-full hover:bg-brand-app/30"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <span key={day} className="text-brand-muted">{day}</span>
            ))}
            {gridCells.map((dayNum, cellIdx) => {
              if (dayNum === null) return <div key={`empty-${cellIdx}`} className="aspect-square" />;
              
              const dateStr = formatDateStr(dayNum);
              const isSelected = value === dateStr;
              
              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => {
                    onChange(dateStr);
                    setIsOpen(false);
                  }}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center font-semibold text-[10px] hover:bg-brand-app/60 transition-colors ${
                    isSelected ? 'bg-brand-active text-brand-app font-bold' : 'text-brand-active'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
