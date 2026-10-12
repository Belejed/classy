import React, { useState } from 'react';
import { GraduationCap, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { dbService } from '../utils/db';

export default function InputNimModal({ user, classes = [], onSuccess }) {
  const [nim, setNim] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cleanNim = nim.trim();
  const isValid = cleanNim.length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValid) {
      setErrorMsg('NIM / Nomor Induk Mahasiswa tidak boleh kosong.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Menyimpan NIM Anda...');

    try {
      // 1. Sync NIM across all class workspaces in database
      await dbService.classes.syncMemberNim(user.uid, user.email, cleanNim);

      // 2. Save locally so modal won't prompt again
      try {
        localStorage.setItem(`classy_user_nim_${user.uid}`, cleanNim);
        if (user.email) {
          localStorage.setItem(`classy_user_nim_${user.email.toLowerCase()}`, cleanNim);
        }
      } catch {}

      toast.success('NIM berhasil disimpan!', { id: toastId });

      if (onSuccess) {
        onSuccess(cleanNim);
      }
    } catch (err) {
      console.error('Failed to save NIM:', err);
      toast.error('Gagal menyimpan NIM. Silakan coba lagi.', { id: toastId });
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan NIM.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs mx-auto flex items-center justify-center text-indigo-300 shadow-inner mb-3">
            <GraduationCap size={28} />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            Lengkapi Nomor Induk Mahasiswa (NIM)
          </h2>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-xs mx-auto">
            Halo {user?.displayName || 'Mahasiswa'}! Masukkan NIM kamu sekali saja untuk keperluan pendataan tugas dan absensi kelas.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Nomor Induk Mahasiswa (NIM) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={nim}
                onChange={(e) => setNim(e.target.value.replace(/[^a-zA-Z0-9.-]/g, ''))}
                placeholder="Contoh: 240401010001"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all font-mono"
              />
              {cleanNim.length >= 3 && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Pastikan NIM sudah sesuai dengan kartu tanda mahasiswa (KTM).
            </p>
          </div>

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Simpan & Masuk ke Kelas</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
