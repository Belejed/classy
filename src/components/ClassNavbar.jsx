import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Folder, 
  Megaphone, 
  MessageSquare, 
  Copy, 
  Check, 
  Plus, 
  Home,
  User,
  LogOut,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassNavbar({
  currentClass,
  classes = [],
  activeTab,
  onSelectTab,
  onSelectClass,
  onBackToLobby,
  onOpenJoinModal,
  onOpenCreateModal,
  currentUser,
  onOpenProfile
}) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const switcherRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyJoinCode = () => {
    if (!currentClass?.joinCode) return;
    navigator.clipboard.writeText(currentClass.joinCode);
    setCopiedCode(true);
    toast.success('Kode kelas disalin ke clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'forum', label: 'Forum', icon: MessageSquare }
  ];

  return (
    <header className="w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-30 font-sans shadow-2xs">
      
      {/* Desktop & Tablet Main Navbar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left Side: Brand + Class Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onBackToLobby}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Class Lobby"
          >
            <img src="/logo.png" alt="Classy" className="w-8 h-8 object-contain shrink-0" />
            <span className="font-bold text-lg text-[#0F172A] tracking-tight hidden sm:inline-block">
              Classy
            </span>
          </button>

          <span className="text-[#CBD5E1] hidden sm:inline-block">/</span>

          {/* Class Switcher Dropdown */}
          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-bold text-[#0F172A] transition-colors"
            >
              <span className="max-w-[140px] sm:max-w-[180px] truncate">
                {currentClass?.name || 'Select Class'}
              </span>
              <ChevronDown size={14} className={`text-[#64748B] transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showSwitcher && (
              <div className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Your Classes
                  </span>
                </div>

                <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
                  {classes.map((cls) => {
                    const isSelected = cls.id === currentClass?.id;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => {
                          onSelectClass(cls);
                          setShowSwitcher(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-colors ${
                          isSelected ? 'bg-[#F1F5F9] text-[#0F172A] font-bold' : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate">{cls.name}</p>
                          <p className="text-[10px] text-[#94A3B8] font-normal">{cls.classIdentifier}</p>
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#0F172A] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 mt-1 border-t border-[#F1F5F9] space-y-0.5">
                  <button
                    onClick={() => {
                      setShowSwitcher(false);
                      onBackToLobby();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <Home size={14} className="text-[#94A3B8]" />
                    <span>Back to Class Lobby</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSwitcher(false);
                      if (onOpenJoinModal) onOpenJoinModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <Plus size={14} className="text-[#94A3B8]" />
                    <span>Join Another Class</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side: Join Code + User Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Join Code Capsule */}
          {currentClass?.joinCode && (
            <button
              onClick={handleCopyJoinCode}
              title="Click to copy Class Join Code"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-mono font-bold text-[#475569] transition-colors"
            >
              <span className="text-[10px] font-sans font-medium text-[#94A3B8]">Code:</span>
              <span>{currentClass.joinCode}</span>
              {copiedCode ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-[#94A3B8]" />}
            </button>
          )}

          {/* User Profile Avatar */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors text-xs font-semibold text-[#0F172A]"
          >
            <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-bold">
              {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline-block max-w-[100px] truncate">
              {currentUser?.displayName || 'Profile'}
            </span>
          </button>
        </div>

      </div>

      {/* Mobile Sub-Navbar for Tabs */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-[#F1F5F9] no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

    </header>
  );
}
