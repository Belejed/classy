import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Don't show if user dismissed in the last 7 days
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 86400000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show once if not dismissed
    if (isIosDevice) {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 86400000) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-3xl bg-brand-card/95 backdrop-blur-md border border-brand-sidebar shadow-2xl text-brand-active flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-active text-brand-app flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Smartphone size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="font-display font-bold text-xs leading-tight">
              Pasang Aplikasi Noted
            </h4>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              {isIos ? (
                <span>
                  Buka tanpa browser bar! Tekan <Share size={11} className="inline mx-0.5 text-blue-500" /> lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
                </span>
              ) : (
                <span>Pasang di layar utama HP kamu untuk akses cepat tanpa address bar browser.</span>
              )}
            </p>
            {!isIos && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-active text-brand-app text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
              >
                <Download size={13} />
                Install Sekarang
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-full text-brand-muted hover:text-brand-active hover:bg-brand-app transition-colors"
          title="Tutup"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
