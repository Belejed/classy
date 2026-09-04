import React from 'react';
import { 
  Home, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  User 
} from 'lucide-react';

export default function MobileBottomNav({ activeTab, onNavigateTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'schedules', label: 'Schedule', icon: Clock },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'profile', label: 'Settings', icon: User }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F7F2E8]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-lg border-t border-[#181818]/15 dark:border-white/15 shadow-2xl px-2 py-1.5 flex items-center justify-around safe-area-pb">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigateTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-2xl transition-all duration-150 ${
              isActive 
                ? 'text-[#181818] dark:text-white font-black scale-105' 
                : 'text-[#6F6A63] hover:text-[#181818] font-semibold'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              isActive ? 'bg-[#181818] text-white dark:bg-white dark:text-[#181818] shadow-xs' : 'bg-transparent'
            }`}>
              <Icon size={17} />
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 ${
              isActive ? 'font-bold' : 'font-medium'
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
