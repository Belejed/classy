import React from 'react';
import { Plus, ArrowRight } from 'lucide-react';

/**
 * Modern aesthetic EmptyState component with inline SVG vectors
 * Variants: 'tasks' | 'completed' | 'schedule' | 'announcements' | 'files' | 'search'
 */
export default function EmptyState({
  variant = 'tasks',
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus
}) {
  const renderIllustration = () => {
    switch (variant) {
      case 'completed':
        // Cheerful trophy & celebration sparkles
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="currentColor" className="text-emerald-500/10 dark:text-emerald-400/10" />
            <path d="M40 38H80V56C80 67.0457 71.0457 76 60 76C48.9543 76 40 67.0457 40 56V38Z" fill="currentColor" className="text-amber-400" />
            <path d="M38 42H28C25.7909 42 24 43.7909 24 46V50C24 55.5228 28.4772 60 34 60H40V42Z" stroke="currentColor" strokeWidth="3" className="text-amber-500" />
            <path d="M82 42H92C94.2091 42 96 43.7909 96 46V50C96 55.5228 91.5228 60 86 60H80V42Z" stroke="currentColor" strokeWidth="3" className="text-amber-500" />
            <rect x="54" y="76" width="12" height="16" rx="2" fill="currentColor" className="text-amber-500" />
            <path d="M42 92H78C80.2091 92 82 93.7909 82 96V98H38V96C38 93.7909 39.7909 92 42 92Z" fill="currentColor" className="text-slate-700 dark:text-slate-200" />
            <circle cx="60" cy="54" r="7" fill="white" />
            <path d="M58 54L59.5 55.5L62.5 52.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 28L28 32L32 34L28 36L26 40L24 36L20 34L24 32L26 28Z" fill="#F59E0B" />
            <path d="M94 24L95.5 27L98.5 28.5L95.5 30L94 33L92.5 30L89.5 28.5L92.5 27L94 24Z" fill="#10B981" />
            <circle cx="90" cy="78" r="3" fill="#6366F1" />
            <circle cx="30" cy="80" r="2.5" fill="#EC4899" />
          </svg>
        );

      case 'tasks':
        // Clean clipboard checklist with soft pen
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="currentColor" className="text-indigo-500/10 dark:text-indigo-400/10" />
            <rect x="36" y="30" width="48" height="64" rx="8" fill="white" className="dark:fill-slate-800" stroke="#CBD5E1" strokeWidth="2.5" />
            <path d="M48 26C48 23.7909 49.7909 22 52 22H68C70.2091 22 72 23.7909 72 26V30H48V26Z" fill="#0F172A" className="dark:fill-indigo-500" />
            <circle cx="60" cy="26" r="2" fill="white" />
            <rect x="44" y="44" width="22" height="4" rx="2" fill="#E2E8F0" className="dark:fill-slate-700" />
            <circle cx="74" cy="46" r="3" fill="#10B981" />
            <rect x="44" y="56" width="28" height="4" rx="2" fill="#E2E8F0" className="dark:fill-slate-700" />
            <circle cx="74" cy="58" r="3" fill="#F59E0B" />
            <rect x="44" y="68" width="18" height="4" rx="2" fill="#E2E8F0" className="dark:fill-slate-700" />
            <circle cx="74" cy="70" r="3" fill="#CBD5E1" className="dark:fill-slate-600" />
            <rect x="44" y="80" width="24" height="4" rx="2" fill="#E2E8F0" className="dark:fill-slate-700" />
            <path d="M92 34L94 38L98 40L94 42L92 46L90 42L86 40L90 38L92 34Z" fill="#6366F1" />
            <circle cx="28" cy="46" r="3" fill="#F43F5E" />
          </svg>
        );

      case 'schedule':
        // Warm calendar with smiling sun for leisure day
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="currentColor" className="text-sky-500/10 dark:text-sky-400/10" />
            <rect x="32" y="32" width="56" height="58" rx="10" fill="white" className="dark:fill-slate-800" stroke="#CBD5E1" strokeWidth="2.5" />
            <path d="M32 46C32 41.5817 35.5817 38 40 38H80C84.4183 38 88 41.5817 88 46V48H32V46Z" fill="#3B82F6" />
            <rect x="44" y="26" width="4" height="8" rx="2" fill="#1E293B" className="dark:fill-white" />
            <rect x="72" y="26" width="4" height="8" rx="2" fill="#1E293B" className="dark:fill-white" />
            <circle cx="60" cy="66" r="12" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2" />
            <path d="M56 65C56 65 58 68 60 68C62 68 64 65 64 65" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="56" cy="62" r="1.2" fill="#B45309" />
            <circle cx="64" cy="62" r="1.2" fill="#B45309" />
            <path d="M26 72L27.5 75L30.5 76.5L27.5 78L26 81L24.5 78L21.5 76.5L24.5 75L26 72Z" fill="#38BDF8" />
          </svg>
        );

      case 'announcements':
        // Modern megaphone with broadcast waves
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="currentColor" className="text-amber-500/10 dark:text-amber-400/10" />
            <path d="M42 48L64 36V76L42 64H32C29.7909 64 28 62.2091 28 60V52C28 49.7909 29.7909 48 32 48H42Z" fill="#0F172A" className="dark:fill-slate-100" />
            <path d="M64 42C68 42 74 46 74 56C74 66 68 70 64 70" fill="#F59E0B" />
            <path d="M42 64L46 82C46.5 84 48.5 85 50.5 84.5C52.5 84 53.5 82 53 80L50 64" fill="#64748B" />
            <path d="M80 44C85 47 88 51 88 56C88 61 85 65 80 68" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
            <path d="M88 38C96 43 100 49 100 56C100 63 96 69 88 74" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 3" />
            <circle cx="34" cy="34" r="3" fill="#6366F1" />
          </svg>
        );

      case 'files':
        // Cloud drive folder with document sheets
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="currentColor" className="text-cyan-500/10 dark:text-cyan-400/10" />
            <path d="M30 46C30 41.5817 33.5817 38 38 38H48L54 44H82C86.4183 44 90 47.5817 90 52V78C90 82.4183 86.4183 86 82 86H38C33.5817 86 30 82.4183 30 78V46Z" fill="#0284C7" />
            <path d="M30 54H90V78C90 82.4183 86.4183 86 82 86H38C33.5817 86 30 82.4183 30 78V54Z" fill="#38BDF8" />
            <rect x="45" y="32" width="30" height="28" rx="4" fill="white" className="dark:fill-slate-800" stroke="#CBD5E1" strokeWidth="2" />
            <line x1="52" y1="40" x2="68" y2="40" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            <line x1="52" y1="46" x2="64" y2="46" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 text-center space-y-3.5 max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="transition-transform hover:scale-105 duration-300">
        {renderIllustration()}
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
          >
            <ActionIcon size={14} />
            <span>{actionLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
