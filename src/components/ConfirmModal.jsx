import React from 'react';
import ModalPortal from './ModalPortal';
import { AlertTriangle, Trash2, Info, CheckCircle2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  isLoading = false
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Trash2 size={22} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle size={22} />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 size={22} />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center mx-auto shadow-xs">
            <Info size={22} />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200/50';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200/50';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50';
      default:
        return 'bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-slate-200/50';
    }
  };

  return (
    <ModalPortal onClose={isLoading ? undefined : onClose} maxWidth="max-w-sm sm:max-w-md">
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-2xl space-y-4 font-sans animate-in zoom-in-95 duration-150">
        {getIcon()}

        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-base sm:text-lg text-[#0F172A]">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2 border-t border-[#F1F5F9]">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${getConfirmButtonClasses()}`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
