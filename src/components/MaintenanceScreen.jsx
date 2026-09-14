import React, { useState } from 'react';
import { 
  Wrench, 
  RefreshCw, 
  ShieldAlert, 
  Lock, 
  Sparkles, 
  Clock, 
  GraduationCap, 
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { authService, isSuperAdmin } from '../utils/db';
import toast from 'react-hot-toast';

export default function MaintenanceScreen({ 
  config, 
  onRefreshStatus, 
  onSuperadminLogin 
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      if (onRefreshStatus) {
        await onRefreshStatus();
      }
      toast.success('Pengecekan status selesai');
    } catch {
      toast.error('Gagal memeriksa status');
    } finally {
      setIsChecking(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      toast.error('Email dan kata sandi wajib diisi');
      return;
    }

    setAdminLoading(true);
    try {
      const user = await authService.login(adminEmail, adminPassword);
      if (isSuperAdmin(user)) {
        toast.success(`Selamat datang, Superadmin ${user.displayName || user.email}!`);
        setShowAdminModal(false);
        if (onSuperadminLogin) {
          onSuperadminLogin(user);
        }
      } else {
        toast.error('Akun ini bukan Superadmin. Akses ditolak selama pemeliharaan.');
      }
    } catch (err) {
      toast.error(err.message || 'Gagal masuk akun Superadmin');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <GraduationCap className="text-emerald-400 w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-lg text-white">Classy</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Academic Hub
              </span>
            </div>
            <span className="text-xs text-slate-400 block -mt-0.5">Ruang Kelas Terpadu</span>
          </div>
        </div>

        <button
          onClick={() => setShowAdminModal(true)}
          className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
        >
          <Lock size={12} className="text-amber-400" />
          <span>Akses Superadmin</span>
        </button>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="max-w-xl w-full mx-auto text-center space-y-6">
          
          {/* Animated Illustration Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 p-5 flex items-center justify-center shadow-2xl relative">
              <Wrench className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 animate-bounce transition-all duration-1000" />
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg">
                <ShieldAlert size={16} />
              </div>
            </div>
          </div>

          {/* Status Chip */}
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Mode Pemeliharaan Sedang Aktif
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {config?.title || 'Sistem Sedang Dalam Pemeliharaan'}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
              {config?.message || 'Kami sedang melakukan pembaruan berkala dan peningkatan infrastruktur server agar Classy berjalan lebih cepat, aman, dan stabil. Kami akan segera kembali!'}
            </p>
          </div>

          {/* Estimated Completion Time Box */}
          {config?.estimatedEndTime && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-sm mx-auto backdrop-blur-md flex items-center justify-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock size={20} />
              </div>
              <div className="text-left">
                <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                  Estimasi Selesai
                </span>
                <span className="text-sm font-extrabold text-white">
                  {config.estimatedEndTime}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'Memeriksa Status...' : 'Cek Status Sekarang'}</span>
            </button>
            <button
              onClick={() => setShowAdminModal(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock size={15} className="text-slate-400" />
              <span>Login Superadmin</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 pt-2 flex items-center justify-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Halaman ini otomatis membuka kembali saat pemeliharaan selesai.</span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-slate-500 relative z-10 border-t border-slate-900/60">
        <p>© 2026 Classy Academic Hub • Dikembangkan untuk efisiensi perkuliahan.</p>
      </footer>

      {/* Emergency Superadmin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Akses Superadmin</h3>
                <p className="text-xs text-slate-400">Masuk untuk membuka kendali pemeliharaan sistem.</p>
              </div>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Email Superadmin
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="arya@exars.my.id / exars.012@gmail.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {adminLoading ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <ArrowRight size={13} />
                  )}
                  <span>{adminLoading ? 'Memverifikasi...' : 'Buka Akses'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
