import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#FDFBF7] flex items-center justify-center p-4 font-sans">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-sm max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0F172A]">Terjadi Kesalahan Tampilan</h3>
              <p className="text-xs text-[#64748B] mt-1 break-words">
                {this.state.error?.message || 'Gagal memuat halaman. Versi aplikasi mungkin baru saja diperbarui.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Bersihkan Cache & Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
