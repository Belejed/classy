import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, BookOpen } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Pilih Opsi --',
  searchPlaceholder = 'Cari...',
  icon: Icon = BookOpen,
  className = '',
  required = false,
  allowClear = false,
  footerAction = null,
  direction = 'auto' // 'auto' | 'up' | 'down'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Determine whether to open upward or downward
  useEffect(() => {
    if (!isOpen) return;

    if (direction === 'up') {
      setOpenUpward(true);
      return;
    }
    if (direction === 'down') {
      setOpenUpward(false);
      return;
    }

    // Auto-detect based on available space in viewport and scrollable container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelowWindow = window.innerHeight - rect.bottom;
      const spaceAboveWindow = rect.top;

      let spaceBelowContainer = spaceBelowWindow;
      let spaceAboveContainer = spaceAboveWindow;

      const scrollParent = containerRef.current.closest('.overflow-y-auto, .overflow-auto');
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        spaceBelowContainer = parentRect.bottom - rect.bottom;
        spaceAboveContainer = rect.top - parentRect.top;
      }

      const availableBelow = Math.min(spaceBelowWindow, spaceBelowContainer);
      const availableAbove = Math.max(spaceAboveWindow, spaceAboveContainer);

      // If less than 240px below and there is more room above, open upward
      if (availableBelow < 240 && availableAbove > availableBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, direction]);

  // Normalize options to { value, label }
  const normalizedOptions = useMemo(() => {
    return (options || []).map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find(opt => opt.value === value);
  }, [normalizedOptions, value]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter(opt =>
      opt.label.toLowerCase().includes(term) || (opt.subtitle && opt.subtitle.toLowerCase().includes(term))
    );
  }, [normalizedOptions, searchTerm]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input for HTML5 form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-left text-xs sm:text-sm shadow-2xs transition-all flex items-center justify-between gap-2 min-h-[42px] cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-4 ring-indigo-500/10'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {Icon && (
            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
              <Icon size={13} />
            </div>
          )}
          <span 
            className={`truncate block ${selectedOption ? 'font-semibold text-slate-900' : 'text-slate-400 font-normal'}`}
            title={selectedOption ? selectedOption.label : placeholder}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div 
          className={`absolute left-0 right-0 z-[70] bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden py-1 transition-all ${
            openUpward 
              ? 'bottom-full mb-1.5 origin-bottom animate-in fade-in slide-in-from-bottom-2 duration-150' 
              : 'top-full mt-1.5 origin-top animate-in fade-in slide-in-from-top-2 duration-150'
          }`}
        >
          {/* Search bar inside dropdown if > 4 options */}
          {normalizedOptions.length > 4 && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {/* Option to clear / unselect if allowClear is true */}
            {allowClear && placeholder && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs text-slate-400 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>{placeholder}</span>
                {!value && <Check size={14} className="text-slate-400" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                Tidak ada pilihan yang cocok
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 text-indigo-950 font-semibold border border-indigo-100/80'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-300'}`} />
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-indigo-600 shrink-0" strokeWidth={2.5} />}
                  </button>
                );
              })
            )}
          </div>

          {/* Optional Footer Action */}
          {footerAction && (
            <div className="p-1 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  footerAction.onClick();
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-indigo-600 hover:bg-indigo-100/70 hover:text-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {footerAction.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
