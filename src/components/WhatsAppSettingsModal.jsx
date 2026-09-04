import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, 
  Settings, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Key, 
  Phone, 
  Radio, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sendWhatsAppMessage } from '../utils/whatsapp';

export default function WhatsAppSettingsModal({
  isOpen,
  onClose,
  settings = {},
  onSaveSettings,
  workspaceName = 'Semester 5'
}) {
  const [provider, setProvider] = useState(settings?.whatsapp?.provider || 'fonnte');
  const [apiToken, setApiToken] = useState(settings?.whatsapp?.apiToken || '');
  const [targetPhone, setTargetPhone] = useState(settings?.whatsapp?.targetPhone || '');
  const [remindClassMinutes, setRemindClassMinutes] = useState(settings?.whatsapp?.remindClassMinutes || 15);
  const [remindTaskHours, setRemindTaskHours] = useState(settings?.whatsapp?.remindTaskHours || 24);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTestSend = async () => {
    if (!apiToken.trim() || !targetPhone.trim()) {
      toast.error('Token API dan nomor WhatsApp tujuan wajib diisi!');
      return;
    }

    setIsTesting(true);
    try {
      const testMsg = `🎉 *TES KONEKSI WHATSAPP BERHASIL!* 🎓\n━━━━━━━━━━━━━━━━━━━━\nSistem notifikasi *Noted by Blazed Academic Hub* di workspace *${workspaceName}* telah terhubung dengan nomor WhatsApp kamu.\n\nKamu akan menerima pengingat otomatis sebelum kelas kuliah dimulai dan saat ada deadline tugas yang mendekat!\n━━━━━━━━━━━━━━━━━━━━\n_Noted by Blazed_`;

      await sendWhatsAppMessage({
        provider,
        apiToken: apiToken.trim(),
        targetPhone: targetPhone.trim(),
        message: testMsg
      });

      toast.success('Pesan tes berhasil terkirim ke WhatsApp-mu! 📱');
    } catch (err) {
      toast.error('Gagal mengirim: ' + (err.message || 'Cek kembali token dan nomor tujuan.'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      ...settings,
      whatsapp: {
        enabled: !!apiToken.trim(),
        provider,
        apiToken: apiToken.trim(),
        targetPhone: targetPhone.trim(),
        remindClassMinutes: Number(remindClassMinutes) || 15,
        remindTaskHours: Number(remindTaskHours) || 24,
        updatedAt: new Date().toISOString()
      }
    };
    onSaveSettings(updated);
    toast.success('Pengaturan WhatsApp tersimpan!');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-brand-card border border-brand-sidebar rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-brand-active">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-sidebar flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500 text-white shadow-xs">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm">Integrasi WhatsApp API</h3>
              <p className="text-[11px] text-brand-muted">Kirim pengingat jadwal kelas & deadline tugas ke WhatsApp</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-brand-app text-brand-muted hover:text-brand-active transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block">
              Pilih Layanan WhatsApp Gateway
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider('fonnte')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  provider === 'fonnte'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold'
                    : 'bg-brand-app/60 border-brand-sidebar text-brand-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">Fonnte (Rekomendasi)</span>
                  {provider === 'fonnte' && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
                <p className="text-[10px] opacity-80 mt-1">Gratis & sangat mudah di fonnte.com</p>
              </button>

              <button
                type="button"
                onClick={() => setProvider('wablas')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  provider === 'wablas'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold'
                    : 'bg-brand-app/60 border-brand-sidebar text-brand-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">Wablas API</span>
                  {provider === 'wablas' && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
                <p className="text-[10px] opacity-80 mt-1">Layanan gateway Wablas kudus</p>
              </button>
            </div>
          </div>

          {/* Help box */}
          {provider === 'fonnte' && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-brand-active space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Sparkles size={13} /> Cara Dapatkan Token Fonnte:
              </p>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                1. Daftar akun di <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-600 dark:text-emerald-400">fonnte.com</a><br/>
                2. Scan QR WhatsApp di dashboard Fonnte<br/>
                3. Salin <strong>API Token</strong> dan masukkan ke kolom di bawah.
              </p>
            </div>
          )}

          {/* API Token Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block flex items-center gap-1">
              <Key size={12} className="text-brand-accent" />
              API Token {provider.toUpperCase()} *
            </label>
            <input
              type="password"
              placeholder="Contoh: p6m9q1k... (Token API dari dashboard)"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-full bg-brand-app/80 border border-brand-sidebar focus:border-brand-active rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none text-brand-active"
            />
          </div>

          {/* Target Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block flex items-center gap-1">
              <Phone size={12} className="text-emerald-500" />
              Nomor WhatsApp Tujuan *
            </label>
            <input
              type="text"
              placeholder="Contoh: 081234567890 atau 6281234567890"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              className="w-full bg-brand-app/80 border border-brand-sidebar focus:border-brand-active rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none text-brand-active"
            />
          </div>

          {/* Reminder Timing */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-muted block">
                Pengingat Kelas (Menit)
              </label>
              <select
                value={remindClassMinutes}
                onChange={(e) => setRemindClassMinutes(e.target.value)}
                className="w-full bg-brand-app/80 border border-brand-sidebar rounded-xl px-3 py-2 text-xs font-semibold outline-none text-brand-active"
              >
                <option value="15">15 Menit Sebelum</option>
                <option value="30">30 Menit Sebelum</option>
                <option value="60">1 Jam Sebelum</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-muted block">
                Pengingat Tugas Kuliah
              </label>
              <select
                value={remindTaskHours}
                onChange={(e) => setRemindTaskHours(e.target.value)}
                className="w-full bg-brand-app/80 border border-brand-sidebar rounded-xl px-3 py-2 text-xs font-semibold outline-none text-brand-active"
              >
                <option value="24">H-1 Sebelum Deadline</option>
                <option value="12">12 Jam Sebelum</option>
                <option value="48">H-2 Sebelum Deadline</option>
              </select>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="pt-4 border-t border-brand-sidebar space-y-2">
            <button
              type="button"
              onClick={handleTestSend}
              disabled={isTesting || !apiToken.trim() || !targetPhone.trim()}
              className="w-full py-2.5 rounded-xl border border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send size={13} />
              {isTesting ? 'Mengirim Pesan Uji Coba...' : 'Kirim Pesan Tes ke WhatsApp Sekarang'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-brand-sidebar font-bold text-xs hover:bg-brand-app transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-brand-active text-brand-app rounded-xl font-bold text-xs hover:opacity-90 transition-opacity shadow-sm"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}
