import React from 'react';
import { Home, Library, Search, NotebookPen } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export function BottomNav({ currentView, setCurrentView }: BottomNavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'notes', icon: NotebookPen, label: 'Notes' },
  ];

  return (
    <div className="md:hidden flex items-center justify-around bg-zinc-950 border-t border-zinc-900 pb-[env(safe-area-inset-bottom)] pt-2 px-2 z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setCurrentView(item.id)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 text-[10px] font-medium transition-colors",
            currentView === item.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <item.icon size={22} className={cn("mb-0.5", currentView === item.id ? "text-white" : "text-zinc-400")} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
