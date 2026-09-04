import React from 'react';
import { 
  Moon, 
  Sun, 
  MessageSquare, 
  Send,
  Layers,
  ChevronDown
} from 'lucide-react';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function MobileHeader({
  currentWorkspace,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onJoinWorkspace,
  onOpenWhatsAppModal,
  theme,
  setTheme,
  user,
  onNavigateTab
}) {
  return (
    <header className="lg:hidden sticky top-0 z-30 w-full bg-brand-card/90 backdrop-blur-md border-b border-brand-sidebar px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0 shadow-xs">
      
      {/* Left: Brand & Workspace Switcher */}
      <div className="flex items-center gap-2 min-w-0">
        <img 
          onClick={() => onNavigateTab('dashboard')}
          src="/logo.png" 
          alt="Classy" 
          className="w-8 h-8 object-contain shrink-0 cursor-pointer" 
        />

        <div className="min-w-0">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={onSelectWorkspace}
            onCreateWorkspace={onCreateWorkspace}
            onJoinWorkspace={onJoinWorkspace}
            currentUser={user}
            compact={true}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenWhatsAppModal}
          className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-colors shadow-xs"
          title="Pengaturan WhatsApp"
        >
          <Send size={14} className="text-emerald-500" />
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-brand-app border border-brand-sidebar hover:border-brand-active text-brand-active transition-all shadow-xs"
          title="Ganti Tema"
        >
          {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
        </button>

        <div 
          onClick={() => onNavigateTab('profile')}
          className="w-7 h-7 rounded-xl bg-brand-active text-brand-app flex items-center justify-center font-bold text-[11px] shadow-xs cursor-pointer uppercase"
        >
          {(user?.email || 'M')[0]}
        </div>
      </div>

    </header>
  );
}
