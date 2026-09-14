import React, { useState } from 'react';
import { 
  Wrench, 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  Lock,
  ArrowRight,
  X,
  LogIn
} from 'lucide-react';
import { authService, isSuperAdmin } from '../utils/db';
import toast from 'react-hot-toast';

export default function MaintenanceScreen({ 
  config, 
  onRefreshStatus, 
  onSuperadminLogin 
}) {
  const [isChecking, setIsChecking] = useState(false);
  
  // Secret Easter Egg to open admin access without displaying "Superadmin" on the public UI
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleLogoClick = () => {
    const nextCount = logoClickCount + 1;
    if (nextCount >= 5) {
      setShowSecretModal(true);
      setLogoClickCount(0);
    } else {
      setLogoClickCount(nextCount);
      setTimeout(() => setLogoClickCount(0), 3000);
    }
  };

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
        toast.success(`Selamat datang kembali, ${user.displayName || user.email}!`);
        setShowSecretModal(false);
        if (onSuperadminLogin) {
          onSuperadminLogin(user);
        }
      } else {
        toast.error('Akses ditolak selama masa pemeliharaan.');
      }
    } catch (err) {
      toast.error(err.message || 'Gagal masuk akun');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1E293B] flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Subtle Warm Background Ambiance */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-100/40 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -ml-32 -mb-32" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-3 cursor-pointer group select-none transition-transform active:scale-95"
          title="Classy Academic Hub"
        >
          <img 
            src="/logo.png" 
            alt="Classy" 
            className="w-10 h-10 object-contain drop-shadow-xs" 
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-lg text-slate-900">Classy</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Academic Hub
              </span>
            </div>
            <span className="text-xs text-slate-500 block -mt-0.5">Ruang Kelas Terpadu</span>
          </div>
        </div>

        {/* Top Right Controls: Status indicator & Small Login button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Pemeliharaan Sistem
            </span>
          </div>

          <button
            onClick={() => setShowSecretModal(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Masuk ke Akun"
          >
            <LogIn size={13} className="text-slate-500" />
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="max-w-lg w-full bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-900/5 text-center space-y-6 relative overflow-hidden">
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-500 to-teal-500" />

          {/* Animated Illustration Badge */}
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-sm relative">
            <Wrench className="w-10 h-10 text-amber-600 animate-bounce transition-all duration-1000" />
          </div>

          {/* Status Badge */}
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Mode Pemeliharaan Sedang Aktif
            </span>
          </div>

          {/* Heading & Message */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {config?.title || 'Sistem Sedang Dalam Pemeliharaan'}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
              {config?.message || 'Kami sedang melakukan pemeliharaan berkala dan peningkatan performa sistem agar Classy berjalan lebih lancar dan nyaman digunakan. Kami akan segera kembali!'}
            </p>
          </div>

          {/* Estimated Completion Time */}
          {config?.estimatedEndTime && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-sm mx-auto flex items-center justify-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Clock size={18} />
              </div>
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Estimasi Selesai
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {config.estimatedEndTime}
                </span>
              </div>
            </div>
          )}

          {/* Single Clean Action Button */}
          <div className="pt-2 flex flex-col items-center justify-center gap-3">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'Memeriksa Status...' : 'Cek Status Sekarang'}</span>
            </button>

            <div className="text-xs text-slate-500 pt-2 flex items-center justify-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Halaman otomatis terbuka kembali saat pemeliharaan selesai.</span>
            </div>
          </div>

        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-slate-500 relative z-10 border-t border-slate-200/60">
        <p>© 2026 Classy Academic Hub • Ruang Kelas Terpadu.</p>
      </footer>

      {/* Secret Emergency Access Modal (Only opens if logo is clicked 5 times) */}
      {showSecretModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowSecretModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Masuk Akun</h3>
                <p className="text-xs text-slate-500">Masukkan email dan kata sandi Anda.</p>
              </div>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSecretModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {adminLoading ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <ArrowRight size={13} />
                  )}
                  <span>{adminLoading ? 'Memverifikasi...' : 'Masuk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
