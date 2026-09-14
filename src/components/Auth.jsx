import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, getFriendlyAuthErrorMessage } from '../utils/db';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft, 
  Phone, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Auth({ onAuthSuccess, initialMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(() => {
    if (location.pathname === '/reset-password') return 'update_password';
    if (location.pathname === '/forgot-password') return 'forgot';
    return initialMode;
  }); // 'login' | 'register' | 'forgot' | 'reset_sent' | 'update_password'

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+62 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Sync mode with route changes
  useEffect(() => {
    if (location.pathname === '/reset-password') {
      setMode('update_password');
    } else if (location.pathname === '/forgot-password') {
      if (mode !== 'reset_sent') {
        setMode('forgot');
      }
    } else if (location.pathname === '/login') {
      if (mode !== 'register') {
        setMode('login');
      }
    }
  }, [location.pathname]);

  // Detect recovery event or URL hash / query on load
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (
      hash.includes('type=recovery') || 
      hash.includes('reset') || 
      hash.includes('oobCode') ||
      search.includes('type=recovery') || 
      search.includes('mode=resetPassword') ||
      search.includes('oobCode')
    ) {
      setMode('update_password');
      if (location.pathname !== '/reset-password') {
        navigate('/reset-password' + search + hash, { replace: true });
      }
    }
  }, [location.pathname]);

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+62')) {
      val = '+62 ' + val.replace(/^\+?62\s?|^0+/, '');
    }
    setPhoneNumber(val);
  };

  const handleSendResetEmail = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.error('Masukkan alamat email terdaftar');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(email.trim());
      toast.success('Tautan reset password berhasil dikirim!');
      setMode('reset_sent');
    } catch (err) {
      console.error('Reset password error:', err);
      toast.error(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      // Check if URL contains Firebase oobCode (from email reset link)
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, '?'));
      const oobCode = searchParams.get('oobCode') || hashParams.get('oobCode') || searchParams.get('code') || hashParams.get('code');

      if (oobCode) {
        await authService.confirmPasswordReset(oobCode, newPassword);
        toast.success('Password berhasil diperbarui! Silakan login dengan password baru.');
        setMode('login');
        navigate('/login');
        return;
      }

      // If user is already authenticated in session
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        await authService.updatePassword(newPassword);
        toast.success('Password berhasil diperbarui!');
        if (onAuthSuccess) {
          onAuthSuccess(currentUser);
        } else {
          navigate('/lobby');
        }
        return;
      }

      toast.error('Tautan reset password tidak valid atau kedaluwarsa. Silakan minta tautan baru.');
    } catch (err) {
      console.error('Update password error:', err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('code') || msg.toLowerCase().includes('expired')) {
        toast.error('Tautan pemulihan tidak valid atau kedaluwarsa. Silakan minta tautan baru di Lupa Password.');
      } else {
        toast.error(msg || 'Gagal memperbarui password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!fullName.trim()) {
          toast.error('Nama lengkap wajib diisi');
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          toast.error('Email wajib diisi');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Password minimal 6 karakter');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Konfirmasi password tidak cocok');
          setLoading(false);
          return;
        }

        const user = await authService.signup(email.trim(), password, {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim()
        });

        toast.success('Akun Classy berhasil dibuat!');
        if (onAuthSuccess) onAuthSuccess(user);
      } else if (mode === 'login') {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = password.trim();

        if (!cleanEmail || !cleanPass) {
          toast.error('Email dan password wajib diisi');
          setLoading(false);
          return;
        }

        if (!cleanEmail.includes('@')) {
          toast.error('Silakan masukkan format email lengkap (contoh: nama@email.com)');
          setLoading(false);
          return;
        }

        const user = await authService.login(cleanEmail, cleanPass);
        toast.success(`Selamat datang kembali!`);
        if (onAuthSuccess) onAuthSuccess(user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#FDFBF7] text-[#1E293B] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Brand Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Classy" className="w-10 h-10 object-contain shrink-0" />
          <span className="font-bold text-xl tracking-tight text-[#0F172A]">Classy</span>
        </div>
        <span className="text-xs text-[#64748B] font-medium hidden sm:inline-block">
          College class information & collaboration platform
        </span>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-10 shadow-sm space-y-6">
          
          {/* VIEW 1 & 2: LOGIN OR REGISTER */}
          {(mode === 'login' || mode === 'register') && (
            <>
              {/* Header */}
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                  {mode === 'register' ? 'Create your Classy account' : 'Welcome back'}
                </h1>
                <p className="text-xs text-[#64748B]">
                  {mode === 'register'
                    ? 'Join your college class space to manage schedules & tasks.'
                    : 'Sign in to access your classes and updates.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#334155] block">Full name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                        <input
                          type="text"
                          placeholder="Arya Pratama"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                        />
                      </div>
                    </div>

                    {/* WhatsApp Number */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#334155]">WhatsApp number</label>
                        <span className="text-[10px] text-[#64748B]">For class updates</span>
                      </div>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                        <input
                          type="text"
                          placeholder="+62 812 3456 7890"
                          value={phoneNumber}
                          onChange={handlePhoneChange}
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#334155] block">
                      Email
                    </label>
                  </div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="email"
                      placeholder={mode === 'login' ? 'nama@email.com' : 'name@university.ac.id'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#334155]">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          navigate('/forgot-password');
                        }}
                        className="text-[11px] font-semibold text-[#0F172A] hover:underline transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer p-0.5"
                      title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#334155] block">Confirm password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
                >
                  <span>{loading ? 'Processing...' : (mode === 'register' ? 'Create Account' : 'Log in')}</span>
                  {!loading && <ArrowRight size={15} />}
                </button>
              </form>

              {/* Registration is restricted to pre-registered class accounts */}
              <div className="pt-3 border-t border-[#F1F5F9] text-center space-y-1">
                <p className="text-[11px] text-[#64748B]">
                  Akun mahasiswa telah didaftarkan langsung oleh Komti kelas.
                </p>
                <p className="text-xs text-[#64748B]">
                  Lupa password atau akun bermasalah?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      navigate('/forgot-password');
                    }}
                    className="font-bold text-[#0F172A] hover:underline cursor-pointer"
                  >
                    Reset Password
                  </button>
                </p>
              </div>
            </>
          )}

          {/* VIEW 3: FORGOT PASSWORD (REQUEST RESET LINK) */}
          {mode === 'forgot' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 text-[#0F172A] flex items-center justify-center mb-3">
                  <KeyRound size={20} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                  Reset password
                </h1>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Masukkan alamat email yang terdaftar pada akun Classy Anda. Kami akan mengirimkan tautan untuk membuat password baru.
                </p>
              </div>

              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155] block">Alamat Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="email"
                      placeholder="name@university.ac.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
                >
                  <span>{loading ? 'Mengirim link...' : 'Kirim Tautan Reset Password'}</span>
                  {!loading && <ArrowRight size={15} />}
                </button>
              </form>

              <div className="pt-2 border-t border-[#F1F5F9] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    navigate('/login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke halaman Log in</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 4: RESET LINK SENT CONFIRMATION */}
          {mode === 'reset_sent' && (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">
                  Tautan Telah Dikirim!
                </h2>
                <p className="text-xs text-[#64748B] leading-relaxed max-w-sm mx-auto">
                  Instruksi reset password telah dikirim ke <strong className="text-[#0F172A] font-mono">{email}</strong>. Silakan periksa kotak masuk (inbox) atau folder Spam Anda.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] text-left space-y-1">
                <p className="font-semibold text-[#0F172A]">Petunjuk:</p>
                <p>1. Buka email reset password yang dikirimkan oleh Classy.</p>
                <p>2. Klik tautan <strong>Reset Password</strong> di dalam email.</p>
                <p>3. Anda akan diarahkan ke halaman pembuatan password baru.</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendResetEmail}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>{loading ? 'Mengirim ulang...' : 'Kirim Ulang Email'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    navigate('/login');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors cursor-pointer"
                >
                  Kembali ke Log in
                </button>
              </div>
            </div>
          )}

          {/* VIEW 5: UPDATE / SET NEW PASSWORD */}
          {mode === 'update_password' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                  <Lock size={20} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                  Buat Password Baru
                </h1>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Silakan tentukan password baru yang aman untuk akun Classy Anda (minimal 6 karakter).
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155] block">Password Baru</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#334155] block">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="password"
                      placeholder="Ulangi password baru"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
                >
                  <span>{loading ? 'Menyimpan...' : 'Perbarui Password & Masuk'}</span>
                  {!loading && <ArrowRight size={15} />}
                </button>
              </form>

              <div className="pt-2 border-t border-[#F1F5F9] text-center">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authService.logout();
                    } catch {}
                    setMode('login');
                    navigate('/login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Batal & Kembali ke Log in</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Minimal Footer */}
      <div className="w-full max-w-5xl mx-auto py-4 text-center text-xs text-[#94A3B8]">
        Classy · Modern College Class Portal
      </div>
    </div>
  );
}
