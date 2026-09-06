import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if already installed / standalone
    const standaloneCheck = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;
    setIsStandalone(standaloneCheck);

    // 2. Detect iOS
    const userAgent = (window.navigator.userAgent || '').toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Listen for browser install prompt (Chrome, Edge, Samsung Internet, Android)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPwaPrompt = e;

      // Show floating banner if not standalone and not recently dismissed
      if (!standaloneCheck) {
        const dismissed = localStorage.getItem('classy_pwa_dismissed');
        if (!dismissed || Date.now() - Number(dismissed) > 5 * 86400000) {
          setTimeout(() => setShowBanner(true), 2000);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If iOS and not standalone, also show gentle banner after delay
    if (isIosDevice && !standaloneCheck) {
      const dismissed = localStorage.getItem('classy_pwa_dismissed');
      if (!dismissed || Date.now() - Number(dismissed) > 5 * 86400000) {
        setTimeout(() => setShowBanner(true), 2500);
      }
    }

    // 4. Listen for custom event triggered from any button (Bottom Sheet, Header, Navbar)
    const handleOpenPwaTrigger = () => {
      if (standaloneCheck) {
        toast.success('Aplikasi Classy sudah terpasang di perangkat Anda!', {
          icon: '📱'
        });
        return;
      }

      // Check if prompt is available (either state or global window reference)
      const promptToUse = deferredPrompt || window.deferredPwaPrompt;
      if (promptToUse && !isIosDevice) {
        triggerNativeInstall(promptToUse);
      } else {
        // Show step-by-step guide modal
        setShowGuideModal(true);
      }
    };

    window.addEventListener('classy:open-pwa-install', handleOpenPwaTrigger);

    // 5. Track successful install
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
      toast.success('Aplikasi Classy berhasil dipasang ke layar utama!', {
        duration: 4000,
        icon: '🎉'
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('classy:open-pwa-install', handleOpenPwaTrigger);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const triggerNativeInstall = async (promptObj) => {
    try {
      promptObj.prompt();
      const { outcome } = await promptObj.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setShowGuideModal(false);
      }
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
    } catch (err) {
      console.warn('PWA install prompt error:', err);
      setShowGuideModal(true);
    }
  };

  const handleBannerInstallClick = () => {
    const promptToUse = deferredPrompt || window.deferredPwaPrompt;
    if (promptToUse && !isIos) {
      triggerNativeInstall(promptToUse);
    } else {
      setShowGuideModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('classy_pwa_dismissed', Date.now().toString());
  };

  // If already standalone, render nothing
  if (isStandalone) return null;

  return (
    <>
      {/* 1. Floating Banner for new visitors */}
      {showBanner && !showGuideModal && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-sheet-item-1 select-none">
          <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-2xl text-[#0F172A] flex items-start justify-between gap-3 ring-1 ring-black/5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-xs relative overflow-hidden">
                <img src="/logo.png" alt="Classy" className="w-6 h-6 object-contain" />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                  <Download size={9} className="text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs leading-tight text-[#0F172A]">
                    Download Aplikasi Classy
                  </h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Pasang di layar HP untuk akses cepat tanpa tab browser & navigasi lebih mulus.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={handleBannerInstallClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 transition-all active:scale-95 shadow-xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Sekarang</span>
                  </button>
                  <button
                    onClick={handleDismissBanner}
                    className="text-[11px] text-[#64748B] hover:text-[#0F172A] px-2.5 py-1.5 min-h-[36px] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    Nanti
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleDismissBanner}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Step-by-Step Installation Modal (For iOS or Manual Installation) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-sheet-item-1">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0F172A] flex items-center justify-center shrink-0 shadow-md">
                  <img src="/logo.png" alt="Classy" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">
                    Download & Pasang Classy
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Progressive Web App (PWA)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Benefits Pill */}
            <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
                <Sparkles size={14} className="text-amber-500" />
                <span>Keuntungan Menggunakan PWA:</span>
              </div>
              <ul className="text-[11px] text-[#475569] space-y-1 list-disc list-inside">
                <li>Ikon Classy langsung ada di Home Screen HP Anda</li>
                <li>Layar penuh (full-screen) tanpa address bar browser</li>
                <li>Lebih ringan, hemat kuota & loading lebih cepat</li>
              </ul>
            </div>

            {/* Direct Prompt button if deferred prompt is present */}
            {deferredPrompt && !isIos && (
              <button
                onClick={() => triggerNativeInstall(deferredPrompt)}
                className="w-full py-3 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
              >
                <Download size={16} />
                <span>Download & Pasang Sekarang</span>
              </button>
            )}

            {/* Step-by-Step Instructions */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#334155] uppercase tracking-wider">
                {isIos ? 'Petunjuk Instalasi untuk iPhone / iPad (Safari):' : 'Cara Pasang Manual di Layar HP:'}
              </p>

              {isIos ? (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs text-[#334155] leading-relaxed">
                      Ketuk tombol <strong className="text-blue-600 inline-flex items-center gap-1 mx-1"><Share size={13} /> Bagikan (Share)</strong> di bilah bawah browser Safari.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs text-[#334155] leading-relaxed">
                      Gulir ke bawah dan pilih menu <strong className="text-[#0F172A]">"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs text-[#334155] leading-relaxed">
                      Ketuk tombol <strong className="text-emerald-700">"Tambah" (Add)</strong> di pojok kanan atas. Selesai!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs text-[#334155] leading-relaxed">
                      Ketuk menu <strong>titik tiga (⋮)</strong> di pojok kanan atas browser (Chrome / Edge / Samsung).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs text-[#334155] leading-relaxed">
                      Pilih opsi <strong className="text-[#0F172A]">"Install aplikasi"</strong> atau <strong className="text-[#0F172A]">"Tambahkan ke Layar Utama"</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs text-[#334155] leading-relaxed">
                      Konfirmasi <strong>"Install"</strong>. Ikon Classy akan otomatis terpasang di HP Anda!
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Close / OK Button */}
            <div className="pt-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#475569] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tutup Petunjuk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
