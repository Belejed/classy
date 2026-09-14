import React, { useState } from 'react';
import { 
  ShieldAlert, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ArrowRight,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../utils/db';

export default function ChangeTemporaryPasswordModal({ user, onSuccess, onLogout }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isMinLength = newPassword.length >= 6;
  const isDifferentFromDefault = newPassword !== '123456';
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isMinLength) {
      setErrorMsg('Password baru minimal 6 karakter.');
      return;
    }

    if (!isDifferentFromDefault) {
      setErrorMsg('Password baru tidak boleh sama dengan password default (123456). Buat password baru yang aman.');
      return;
    }

    if (!isMatch) {
      setErrorMsg('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Menyimpan password baru Anda...');

    try {
      await authService.updatePassword(newPassword);

      // Clear the temporary password flag
      try {
        localStorage.removeItem('classy_must_change_temp_password');
        sessionStorage.removeItem('classy_must_change_temp_password');
        localStorage.setItem('classy_has_custom_password', 'true');
      } catch {}

      toast.success('Password baru berhasil disimpan! Silakan gunakan password ini untuk login berikutnya.', {
        id: toastId,
        duration: 5000,
        icon: '🎉'
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to change temporary password:', err);
      const msg = err.message || '';
      toast.error(msg || 'Gagal mengubah password. Silakan coba lagi.', { id: toastId });
      setErrorMsg(msg || 'Gagal memperbarui password. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Graphic */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-6 sm:p-7 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mb-3.5 shadow-md">
              <ShieldAlert className="w-8 h-8 text-white drop-shadow-xs" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase text-amber-50 mb-2 border border-white/20">
              <KeyRound className="w-3.5 h-3.5" />
              Password Sementara Terdeteksi
            </div>
            <h2 id="modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Ganti Password Sementara
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 font-medium max-w-xs mt-1.5 leading-relaxed">
              Anda sedang menggunakan password default (<span className="font-mono font-bold text-white bg-black/20 px-1.5 py-0.5 rounded">123456</span>). Demi keamanan dan privasi tugas, silakan buat password baru Anda.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Ulangi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-[11px] font-medium text-slate-600">
            <div className={`flex items-center gap-2 ${isMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 size={13} className={isMinLength ? 'text-emerald-500' : 'text-slate-300'} />
              <span>Minimal 6 karakter</span>
            </div>
            <div className={`flex items-center gap-2 ${isDifferentFromDefault ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}`}>
              <CheckCircle2 size={13} className={isDifferentFromDefault ? 'text-emerald-500' : 'text-amber-400'} />
              <span>Bukan password default ("123456")</span>
            </div>
            <div className={`flex items-center gap-2 ${isMatch ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 size={13} className={isMatch ? 'text-emerald-500' : 'text-slate-300'} />
              <span>Konfirmasi password cocok</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading || !isMinLength || !isDifferentFromDefault || !isMatch}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan Password...</span>
                </>
              ) : (
                <>
                  <span>Simpan & Lanjutkan ke Kelas</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 px-3 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Keluar dari Akun (Logout)</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
