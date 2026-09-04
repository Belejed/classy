import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Database, 
  LogOut, 
  User, 
  Sparkles, 
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileView({ 
  user, 
  theme, 
  setTheme, 
  onLogout,
  currentWorkspace
}) {
  const username = user?.displayName || user?.email?.split('@')[0] || 'Mahasiswa';

  const handleBackup = () => {
    const backupObj = {
      user: { email: user?.email, uid: user?.uid },
      theme,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academic-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Backup data berhasil diunduh! 📂');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12 text-brand-active">
      
      {/* Student Profile Card */}
      <div className="p-6 rounded-3xl bg-brand-card border border-brand-sidebar shadow-xs flex items-center gap-4">
        <div className="w-16 h-16 bg-brand-accent/15 text-brand-accent rounded-3xl flex items-center justify-center text-2xl font-bold font-display shrink-0 border border-brand-accent/20">
          {username[0].toUpperCase()}
        </div>
        <div className="overflow-hidden space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg leading-tight truncate text-brand-active">
              {username}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Mahasiswa Aktif
            </span>
          </div>
          <p className="text-xs text-brand-muted font-medium truncate">
            {user?.email}
          </p>
        </div>
      </div>

      {/* Active Workspace Info */}
      <div className="p-6 rounded-3xl bg-brand-card border border-brand-sidebar shadow-xs space-y-3">
        <span className="text-[10px] uppercase font-bold text-brand-muted tracking-wider block">
          Workspace Aktif Saat Ini
        </span>
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-app/60 border border-brand-sidebar">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{currentWorkspace?.icon || '🎓'}</span>
            <div>
              <p className="font-bold text-xs text-brand-active font-display">
                {currentWorkspace?.name || 'Academic Workspace'}
              </p>
              <p className="text-[10px] text-brand-muted">
                {currentWorkspace?.members?.length || 1} Anggota Kolaborasi
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-brand-accent/10 text-brand-accent">
            {currentWorkspace?.inviteCode || 'N/A'}
          </span>
        </div>
      </div>

      {/* Theme & Settings Card */}
      <div className="p-6 rounded-3xl bg-brand-card border border-brand-sidebar shadow-xs space-y-6">
        
        {/* Theme Switcher */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-bold text-brand-muted tracking-wider block">
            Tema Tampilan (Monochrome)
          </span>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'light', name: 'White Theme ☀️', color: 'bg-white text-black border-slate-200' },
              { id: 'dark', name: 'Black Theme 🌙', color: 'bg-[#121212] text-white border-zinc-800' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`px-4 py-3 text-xs font-bold rounded-2xl border flex items-center justify-center transition-all ${t.color} ${
                  theme === t.id ? 'ring-2 ring-brand-accent scale-[1.02] shadow-md' : 'hover:opacity-85'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Data Backup */}
        <div className="space-y-3 pt-4 border-t border-brand-sidebar">
          <span className="text-[10px] uppercase font-bold text-brand-muted tracking-wider block">
            Pencadangan Data (Backup)
          </span>
          <button 
            onClick={handleBackup}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-brand-sidebar hover:border-brand-accent bg-brand-app/60 text-xs font-bold rounded-2xl transition-all shadow-xs"
          >
            <Database size={14} /> Unduh File Cadangan Data (.json)
          </button>
        </div>

        {/* Log Out Button */}
        <div className="pt-4 border-t border-brand-sidebar">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 border border-rose-200/60 dark:border-rose-900/40 text-rose-500 rounded-2xl font-bold text-xs hover:bg-rose-500/10 transition-colors shadow-xs"
          >
            <LogOut size={14} /> Keluar dari Akun (Log Out)
          </button>
        </div>
      </div>
    </div>
  );
}
