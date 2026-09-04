import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, Sun, Moon, Check, X, Sparkles, Folder, Calendar as CalendarIcon, CheckSquare, BookOpen, Layers } from 'lucide-react';

export default function GlobalTopBar({
  user,
  theme,
  setTheme,
  onNavigateTab,
  activeTab,
  workspaces = [],
  activeWorkspaceId,
  onSelectWorkspace,
  schedules = [],
  tasks = [],
  notes = [],
  isPersonalSpace = true,
  onOpenCreateWorkspace
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileWsMenu, setShowMobileWsMenu] = useState(false);
  const searchContainerRef = useRef(null);

  const filterChips = ['All', 'Tasks', 'Classes', 'Notes', 'Workspaces'];

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Arya';
  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live search results across all entities
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();

    const results = [];

    // 1. Search Tasks
    if (searchFilter === 'All' || searchFilter === 'Tasks') {
      tasks.forEach(t => {
        if (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
          results.push({
            id: 'task_' + t.id,
            title: t.title,
            subtitle: `Due ${t.dueDate || 'Today'} • ${t.priority || 'Normal'} priority`,
            type: 'Task',
            icon: CheckSquare,
            action: () => {
              onNavigateTab('tasks');
              setIsSearchOpen(false);
            }
          });
        }
      });
    }

    // 2. Search Classes / Schedules
    if (searchFilter === 'All' || searchFilter === 'Classes') {
      schedules.forEach(s => {
        if (s.subject?.toLowerCase().includes(q) || s.lecturer?.toLowerCase().includes(q) || s.room?.toLowerCase().includes(q)) {
          results.push({
            id: 'sch_' + s.id,
            title: s.subject,
            subtitle: `${s.day}, ${s.startTime} - ${s.endTime} • ${s.room || 'Room'}`,
            type: 'Class',
            icon: CalendarIcon,
            action: () => {
              onNavigateTab('schedules');
              setIsSearchOpen(false);
            }
          });
        }
      });
    }

    // 3. Search Notes
    if (searchFilter === 'All' || searchFilter === 'Notes') {
      notes.forEach(n => {
        if (n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)) {
          results.push({
            id: 'note_' + n.id,
            title: n.title || 'Untitled Note',
            subtitle: n.category || 'Materi Kuliah',
            type: 'Note',
            icon: BookOpen,
            action: () => {
              onNavigateTab('notes');
              setIsSearchOpen(false);
            }
          });
        }
      });
    }

    // 4. Search Workspaces
    if (searchFilter === 'All' || searchFilter === 'Workspaces') {
      workspaces.forEach(w => {
        if (w.name?.toLowerCase().includes(q)) {
          results.push({
            id: 'ws_' + w.id,
            title: w.name,
            subtitle: `Workspace • ${w.members?.length || 1} members`,
            type: 'Workspace',
            icon: Layers,
            action: () => {
              onSelectWorkspace(w.id);
              onNavigateTab('dashboard');
              setIsSearchOpen(false);
            }
          });
        }
      });
    }

    return results.slice(0, 8);
  }, [searchQuery, searchFilter, tasks, schedules, notes, workspaces, onNavigateTab, onSelectWorkspace]);

  return (
    <div className="w-full px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 border-b border-[#181818]/10 dark:border-white/10 shrink-0 bg-[#F7F2E8] dark:bg-[#141414] z-40">
      
      {/* Mobile Workspace Switcher Trigger (Only visible on small screens) */}
      <div className="lg:hidden relative">
        <button
          onClick={() => setShowMobileWsMenu(!showMobileWsMenu)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 text-xs font-bold shadow-xs shrink-0"
        >
          <span>{isPersonalSpace ? '👤' : (currentWorkspace?.icon || '🎓')}</span>
          <span className="max-w-[90px] truncate">{isPersonalSpace ? 'Personal' : currentWorkspace?.name}</span>
        </button>

        {showMobileWsMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMobileWsMenu(false)} />
            <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 shadow-xl p-2 z-50 text-xs">
              <button
                onClick={() => {
                  const pWs = workspaces.find(w => w.isPersonal || w.id.startsWith('personal_'));
                  if (pWs) onSelectWorkspace(pWs.id);
                  setShowMobileWsMenu(false);
                }}
                className="w-full text-left p-2 rounded-xl font-bold hover:bg-cream-muted flex items-center gap-2"
              >
                <span>👤</span>
                <span>Ruang Pribadi</span>
              </button>
              <div className="border-t border-[#181818]/10 my-1 pt-1">
                <span className="text-[10px] font-bold text-[#6F6A63] px-2 block">Workspaces</span>
                {workspaces.filter(w => !w.isPersonal && !w.id.startsWith('personal_')).map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace(ws.id);
                      setShowMobileWsMenu(false);
                    }}
                    className="w-full text-left p-2 rounded-xl font-semibold hover:bg-cream-muted truncate flex items-center gap-2"
                  >
                    <span>{ws.icon || '🎓'}</span>
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Capsule Search Bar with Live Overlay (Intelly Style) */}
      <div ref={searchContainerRef} className="flex-1 max-w-xl relative">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 shadow-xs transition-all focus-within:border-[#181818] dark:focus-within:border-white/40">
          
          <div className="w-7 h-7 rounded-full bg-pastel-pink flex items-center justify-center shrink-0 text-[#181818] shadow-xs">
            <Search size={14} strokeWidth={2.5} />
          </div>

          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Search tasks, classes, notes, workspaces..."
            className="flex-1 min-w-0 bg-transparent text-xs text-[#181818] dark:text-[#EDE8DF] placeholder-[#6F6A63] outline-none font-medium"
          />

          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-[#6F6A63] hover:text-[#181818]">
              <X size={12} />
            </button>
          )}

          {/* Inline Filter Chips (Desktop) */}
          <div className="hidden md:flex items-center gap-1 border-l border-[#181818]/10 dark:border-white/10 pl-2 shrink-0">
            <span className="text-[10px] font-semibold text-[#6F6A63]">In:</span>
            {filterChips.slice(0, 4).map((chip) => (
              <button
                key={chip}
                onClick={() => setSearchFilter(chip)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                  searchFilter === chip
                    ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818]'
                    : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

        </div>

        {/* Live Search Results Overlay */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 rounded-3xl shadow-2xl p-3 z-50 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#181818]/10 text-[10px] font-bold text-[#6F6A63] uppercase tracking-wider">
              <span>Search Results ({searchResults.length})</span>
              <span>Filter: {searchFilter}</span>
            </div>

            {searchResults.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#6F6A63]">
                Tidak ada hasil ditemukan untuk "{searchQuery}".
              </p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((res) => {
                  const Icon = res.icon;
                  return (
                    <div
                      key={res.id}
                      onClick={res.action}
                      className="p-2.5 rounded-2xl hover:bg-[#F7F2E8] dark:hover:bg-white/5 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-cream-muted dark:bg-white/10 flex items-center justify-center shrink-0 text-[#181818] dark:text-white">
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#181818] dark:text-white truncate group-hover:text-brand-accent">
                            {res.title}
                          </p>
                          <p className="text-[10px] text-[#6F6A63] truncate">
                            {res.subtitle}
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#181818]/5 dark:bg-white/10 text-[#6F6A63] shrink-0">
                        {res.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Action Icons: Notification, Theme, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* Theme Switcher Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 flex items-center justify-center text-[#181818] dark:text-[#EDE8DF] hover:bg-cream-muted transition-colors shadow-xs"
          title="Ganti Tema"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 flex items-center justify-center text-[#181818] dark:text-[#EDE8DF] hover:bg-cream-muted transition-colors shadow-xs relative"
          >
            <Bell size={14} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pastel-pink ring-2 ring-white dark:ring-[#1C1C1E]" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-80 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#181818]/10 dark:border-white/10">
                  <h4 className="font-bold text-xs text-[#181818] dark:text-[#EDE8DF]">Pemberitahuan</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-pink text-[#181818]">
                    Live Notif
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-[#F7F2E8] dark:bg-[#141414] border border-[#181818]/5 space-y-1">
                    <p className="font-bold text-[#181818] dark:text-white">🎓 Database System dimulai sebentar lagi</p>
                    <p className="text-[10px] text-[#6F6A63]">Ruang Lab Komputasi 2 • Semester 5</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-[#F7F2E8] dark:bg-[#141414] border border-[#181818]/5 space-y-1">
                    <p className="font-bold text-[#181818] dark:text-white">📌 Deadline Tugas ERD: Besok</p>
                    <p className="text-[10px] text-[#6F6A63]">Pukul 23:59 WIB</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Avatar Pill */}
        <button
          onClick={() => onNavigateTab('profile')}
          className="flex items-center gap-1.5 pl-1 pr-2 sm:pr-3 py-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 shadow-xs hover:bg-cream-muted transition-all"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#181818] text-white flex items-center justify-center text-xs font-bold font-display">
            {userName[0].toUpperCase()}
          </div>
          <span className="hidden sm:inline text-xs font-bold text-[#181818] dark:text-[#EDE8DF]">
            {userName}
          </span>
        </button>

      </div>

    </div>
  );
}
