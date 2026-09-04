import React, { useState } from 'react';
import { authService } from '../utils/db';
import toast from 'react-hot-toast';
import { ArrowRight, Phone, Mail, Lock, User, CheckCircle2 } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+62 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+62')) {
      val = '+62 ' + val.replace(/^\+?62\s?|^0+/, '');
    }
    setPhoneNumber(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
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
      } else {
        if (!email.trim() || !password) {
          toast.error('Email dan password wajib diisi');
          setLoading(false);
          return;
        }

        const user = await authService.login(email.trim(), password);
        toast.success(`Selamat datang kembali!`);
        if (onAuthSuccess) onAuthSuccess(user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error(err.message || 'Terjadi kesalahan autentikasi');
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
          
          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {isRegister ? 'Create your Classy account' : 'Welcome back'}
            </h1>
            <p className="text-xs text-[#64748B]">
              {isRegister
                ? 'Join your college class space to manage schedules & tasks.'
                : 'Sign in to access your classes and updates.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
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

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#334155] block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  placeholder="name@university.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#334155]">Password</label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => toast('Silakan hubungi administrator kampus untuk reset password.', { icon: 'ℹ️' })}
                    className="text-[11px] text-[#64748B] hover:text-[#0F172A] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>
            </div>

            {/* Confirm Password */}
            {isRegister && (
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
              className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Log in')}</span>
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="pt-2 border-t border-[#F1F5F9] text-center">
            <p className="text-xs text-[#64748B]">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="font-bold text-[#0F172A] hover:underline"
              >
                {isRegister ? 'Log in' : 'Create an account'}
              </button>
            </p>
          </div>

        </div>
      </div>

      {/* Minimal Footer */}
      <div className="w-full max-w-5xl mx-auto py-4 text-center text-xs text-[#94A3B8]">
        Classy · Modern College Class Portal · WhatsApp-connected
      </div>
    </div>
  );
}
