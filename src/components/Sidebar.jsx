import React from 'react';
import { 
  Home, 
  Calendar as CalendarIcon, 
  Clock,
  CheckSquare, 
  BookOpen, 
  Folder,
  User, 
  Plus, 
  LogOut, 
  Settings,
  Sparkles,
  ChevronRight,
  Layers
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  workspaces = [],
  activeWorkspaceId,
  onSelectWorkspace,
  onOpenCreateWorkspace,
  onOpenJoinWorkspace,
  isPersonalSpace
}) {
  const personalNavItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'schedules', label: 'Schedule', icon: Clock },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: BookOpen },
    { id: 'files', label: 'Files', icon: Folder }
  ];

  const sharedWorkspaces = workspaces.filter(w => !w.isPersonal && !w.id.startsWith('personal_') && w.inviteCode !== 'PERSONAL');
  const personalWorkspace = workspaces.find(w => w.isPersonal || w.id.startsWith('personal_') || w.inviteCode === 'PERSONAL');

  return (
    <aside className="hidden lg:flex lg:w-64 flex-col justify-between bg-[#111111] text-white rounded-[24px] m-2.5 p-4 shadow-xl shrink-0 select-none">
      
      {/* Top Part: Brand + Navigations */}
      <div className="space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xl tracking-tight text-white">
              noted
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-white/15 text-white/80">
              hub
            </span>
          </div>

          <div className="w-5 h-5 rounded-full bg-pastel-pink flex items-center justify-center cursor-pointer shadow-xs" title="Personal Mode Active">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
          </div>
        </div>

        {/* 1. PERSONAL SECTION */}
        <div className="space-y-1.5">
          <div className="px-2 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#777777]">
              Personal
            </span>
            {isPersonalSpace && (
              <span className="w-1.5 h-1.5 rounded-full bg-pastel-pink animate-pulse" title="Active Context" />
            )}
          </div>

          <div className="space-y-0.5">
            {personalNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && isPersonalSpace;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isPersonalSpace && personalWorkspace) {
                      onSelectWorkspace(personalWorkspace.id);
                    }
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white/15 text-white font-bold shadow-xs'
                      : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-pastel-pink' : 'text-[#8E8E93]'} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-pastel-pink" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. WORKSPACES SECTION */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <div className="px-2 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#777777]">
              Workspaces
            </span>
            <span className="text-[10px] font-bold text-[#777777]">
              {sharedWorkspaces.length}
            </span>
          </div>

          <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
            {sharedWorkspaces.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-[#777777] italic">Belum ada workspace.</p>
            ) : (
              sharedWorkspaces.map((ws) => {
                const isSelected = activeWorkspaceId === ws.id && !isPersonalSpace;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace(ws.id);
                      setActiveTab('dashboard');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${
                      isSelected
                        ? 'bg-white/15 text-white font-bold shadow-xs'
                        : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">{ws.icon || '🎓'}</span>
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-pastel-green" />}
                  </button>
                );
              })
            )}

            {/* + New Workspace Button */}
            <button
              onClick={onOpenCreateWorkspace}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#8E8E93] hover:text-white hover:bg-white/5 transition-colors mt-1"
            >
              <Plus size={14} className="text-pastel-pink" />
              <span>+ New Workspace</span>
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Part: Settings & Logout */}
      <div className="space-y-1 pt-4 border-t border-white/10">
        <button
          onClick={() => setActiveTab('profile')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'profile' ? 'bg-white/15 text-white font-bold' : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#8E8E93] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>

    </aside>
  );
}
