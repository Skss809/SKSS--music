import React, { useState } from 'react';
import { Home, Library, Search, PlusSquare, Heart, Music2, ListMusic, Settings as SettingsIcon, NotebookPen } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlayerStore } from '../store/usePlayerStore';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  openSettings: () => void;
}

export function Sidebar({ currentView, setCurrentView, openSettings }: SidebarProps) {
  const { playlists, createPlaylist } = usePlayerStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'library', icon: Library, label: 'Your Library' },
    { id: 'notes', icon: NotebookPen, label: 'Notes' },
  ];

  const handleCreate = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="hidden md:flex w-64 bg-zinc-950/80 backdrop-blur-md h-full flex-col p-6 text-zinc-400">
      <div className="flex items-center gap-3 text-white mb-8 px-2">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
          <Music2 size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">SKSS music</h1>
      </div>

      <nav className="space-y-4 mb-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={cn(
              "flex items-center gap-4 w-full px-2 py-1.5 font-bold transition-all hover:text-white group",
              currentView === item.id ? "text-white bg-white/5 rounded-xl" : ""
            )}
          >
            <item.icon size={24} className={cn("transition-transform group-active:scale-90", currentView === item.id ? "text-indigo-500" : "")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="space-y-4 mb-6">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Playlists</div>
        {isCreating ? (
          <div className="px-2">
            <input 
              autoFocus
              type="text" 
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              onBlur={() => setIsCreating(false)}
              placeholder="Playlist name..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        ) : (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-4 w-full px-2 py-1.5 font-medium transition-colors hover:text-white"
          >
            <div className="bg-zinc-300 text-black p-1 rounded-sm">
              <PlusSquare size={16} />
            </div>
            Create Playlist
          </button>
        )}
        <button className="flex items-center gap-4 w-full px-2 py-1.5 font-medium transition-colors hover:text-white">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-400 text-white p-1 rounded-sm">
            <Heart size={16} />
          </div>
          Liked Songs
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto border-t border-white/5 pt-4 space-y-2 custom-scrollbar">
        {playlists.map(p => (
          <button 
            key={p.id}
            className="flex items-center gap-3 w-full px-2 py-1.5 text-sm transition-colors hover:text-white text-left truncate group"
          >
            <ListMusic size={16} className="flex-shrink-0 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <button 
          onClick={openSettings}
          className="flex items-center gap-4 w-full px-2 py-2 font-bold transition-all hover:text-white group"
        >
          <SettingsIcon size={20} className="group-hover:rotate-45 transition-transform" />
          Settings
        </button>
      </div>
    </div>
  );
}
