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

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-6 rounded-3xl bg-white border border-rose-200 shadow-sm max-w-lg mx-auto text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#0F172A]">Terjadi Kesalahan Tampilan</h3>
            <p className="text-xs text-[#64748B] mt-1">
              {this.state.error?.message || 'Gagal memuat komponen ini.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => window.location.href = '/lobby'}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Home size={13} />
              <span>Ke Lobby</span>
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
