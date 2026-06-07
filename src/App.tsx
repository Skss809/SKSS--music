import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { auth } from './firebase';
import { loadLibraryFromFirebase } from './lib/sync';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { Library } from './components/Library';
import { Home } from './components/Home';
import { Search } from './components/Search';
import { Notes } from './components/Notes';
import { AuthButton } from './components/AuthButton';
import { BottomNav } from './components/BottomNav';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { CoolModeOverlay } from './components/CoolModeOverlay';
import { Music2, Settings as SettingsIcon } from 'lucide-react';
import { usePlayerStore } from './store/usePlayerStore';
import { useSettingsStore } from './store/useSettingsStore';
import { SettingsDialog } from './components/SettingsDialog';

import { GlobalPlayer } from './components/GlobalPlayer';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isOverlay = urlParams.get('overlay') === 'true';
  const overlayStyle = urlParams.get('style');

  useEffect(() => {
    if (isOverlay) {
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      usePlayerStore.setState({ isPlaying: true });
      useSettingsStore.setState({ 
        coolModeEnabled: true, 
        drawOverOtherApps: true, 
        coolModeStyle: (overlayStyle as any) || 'default' 
      });
    }
  }, [isOverlay, overlayStyle]);

  if (isOverlay) {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden">
        <CoolModeOverlay />
      </div>
    );
  }

  const [currentView, setCurrentView] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { loadSavedData, addTracks, isPlaying } = usePlayerStore();
  const { background, liveBackground, backgroundOpacity, blurBackground, previousWallpapers, theme } = useSettingsStore();
  const [displayBg, setDisplayBg] = useState(background);
  const [displayLiveBg, setDisplayLiveBg] = useState(liveBackground);

  const bgVideoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (bgVideoRef.current && displayLiveBg) {
      bgVideoRef.current.load();
      bgVideoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
    }
  }, [displayLiveBg]);

  useEffect(() => {
    document.body.className = theme === 'default' ? '' : `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    const resolveBg = async (uri: string, setter: (val: string) => void) => {
      if (!uri || uri.startsWith('gdrive://')) {
        setter('');
        return;
      }
      if (uri.startsWith('custom_')) {
          const { getWallpaperFromDB } = await import('./lib/idb');
          const blob = await getWallpaperFromDB(uri);
          if (blob) {
              setter(URL.createObjectURL(blob));
          } else {
              setter('');
          }
          return;
      }
      setter(uri);
    };
    resolveBg(background, setDisplayBg);
  }, [background]);

  useEffect(() => {
    const resolveLiveBg = async (uri: string, setter: (val: string) => void) => {
      if (!uri || uri.startsWith('gdrive://')) {
        setter('');
        return;
      }
      if (uri.startsWith('custom_')) {
          const { getWallpaperFromDB } = await import('./lib/idb');
          const blob = await getWallpaperFromDB(uri);
          if (blob) {
              setter(URL.createObjectURL(blob));
          } else {
              setter('');
          }
          return;
      }
      setter(uri);
    };
    resolveLiveBg(liveBackground, setDisplayLiveBg);
  }, [liveBackground]);

  useEffect(() => {
    loadSavedData();
    
    // Force re-hydration of local wallpapers from IDB on startup
    import('./lib/idb').then(({ getWallpaperFromDB, cleanupWallpapers }) => {
       const { previousWallpapers } = useSettingsStore.getState();
       cleanupWallpapers(previousWallpapers).catch(console.error);

       getWallpaperFromDB('live_wallpaper').then(blob => {
           const { liveBackground: currentLive } = useSettingsStore.getState();
           if (blob) {
               useSettingsStore.getState().setLiveBackground(URL.createObjectURL(blob));
           } else if (!blob && currentLive?.startsWith('blob:')) {
               useSettingsStore.getState().setLiveBackground('');
           }
       });
       getWallpaperFromDB('static_wallpaper').then(blob => {
           const { background: currentBg } = useSettingsStore.getState();
           if (blob) {
               useSettingsStore.getState().setBackground(URL.createObjectURL(blob));
           } else if (!blob && currentBg?.startsWith('blob:')) {
               useSettingsStore.getState().setBackground('');
           }
       });
    });
    
    // Auth Listener for Firebase track syncing
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const remoteTracks = await loadLibraryFromFirebase();
          if (remoteTracks && remoteTracks.length > 0) {
            const resolvedTracks = remoteTracks.map(track => {
               if (track.customImageUrl?.startsWith('gdrive_image://')) {
                  return { ...track, customImageUrl: undefined };
               }
               return track;
            });
            addTracks(resolvedTracks);
            
            // Sync any local tracks that were not in Firebase
            const remoteIds = new Set(remoteTracks.map(t => t.id));
            const localTracks = usePlayerStore.getState().tracks;
            const toSync = localTracks.filter(t => !remoteIds.has(t.id) && t.source !== 'local');
            if (toSync.length > 0) {
               import('./lib/sync').then(({ syncLibraryToFirebase }) => syncLibraryToFirebase(toSync));
            }
          }
          
          const { loadPlaylistsFromFirebase, loadHistoryFromFirebase } = await import('./lib/sync');
          const remotePlaylists = await loadPlaylistsFromFirebase();
          if (remotePlaylists && remotePlaylists.length > 0) {
            const resolvedPlaylists = remotePlaylists.map(playlist => {
               if (playlist.coverUrl?.startsWith('gdrive_image://')) {
                  return { ...playlist, coverUrl: undefined };
               }
               return playlist;
            });
            usePlayerStore.setState({ playlists: resolvedPlaylists });
          }
          
          const historyIds = await loadHistoryFromFirebase();
          if (historyIds && historyIds.length > 0) {
            const trackMap = new Map();
            if (remoteTracks) {
              remoteTracks.forEach(t => trackMap.set(t.id, t));
            }
            usePlayerStore.getState().tracks.forEach(t => trackMap.set(t.id, t));
            
            const historyTracks = historyIds.map(id => trackMap.get(id)).filter(Boolean) as any[];
            if (historyTracks.length > 0) {
               usePlayerStore.getState().setPlayHistory(historyTracks);
            }
          }
          
          const { loadSettingsFromFirebase } = await import('./lib/sync');
          const settings = await loadSettingsFromFirebase();
          if (settings) {
            const { setBackground, setLiveBackground, setBackgroundOpacity, setBlurBackground, setPreviousWallpapers } = useSettingsStore.getState();
            if (settings.previousWallpapers) setPreviousWallpapers(settings.previousWallpapers);
            if (settings.background) setBackground(settings.background);
            if (settings.liveBackground) setLiveBackground(settings.liveBackground);
            if (settings.backgroundOpacity !== undefined) setBackgroundOpacity(settings.backgroundOpacity);
            if (settings.blurBackground !== undefined) setBlurBackground(settings.blurBackground);
          }
        } catch(e) {
          console.error("Failed to fetch remote tracks", e);
        }
      }
    });

    // Removed BackgroundMode since it causes crashes on modern Android without permissions
    
    return () => unsubscribe();
  }, [loadSavedData, addTracks]);

  useEffect(() => {
    // Only try to sync if auth.currentUser exists and settings loaded
    if (auth.currentUser) {
       import('./lib/sync').then(({ syncSettingsToFirebase }) => {
         const syncLiveBg = liveBackground?.startsWith('blob:') || liveBackground?.startsWith('data:') ? '' : liveBackground;
         const syncBg = background?.startsWith('blob:') || background?.startsWith('data:') ? '' : background;
         syncSettingsToFirebase({ background: syncBg, liveBackground: syncLiveBg, backgroundOpacity, blurBackground, previousWallpapers });
       });
    }
  }, [background, liveBackground, backgroundOpacity, blurBackground, previousWallpapers]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden font-sans selection:bg-indigo-500/30 relative w-full">
      {/* Custom Background Layer */}
      {displayLiveBg ? (
        <div 
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
          style={{ opacity: backgroundOpacity }}
        >
          <video 
            src={displayLiveBg} 
            className="w-full h-full object-cover"
            loop 
            muted 
            autoPlay
            playsInline
            ref={bgVideoRef}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        </div>
      ) : displayBg && (
        <div 
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
          style={{ opacity: backgroundOpacity }}
        >
          <img 
            src={displayBg} 
            alt="" 
            className="w-full h-full object-cover"
            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          openSettings={() => setIsSettingsOpen(true)}
        />
        
        <main className={`flex-1 flex flex-col relative ${blurBackground ? 'bg-zinc-900/40 backdrop-blur-sm' : 'bg-transparent'} overflow-hidden md:rounded-tl-2xl md:border-l md:border-t border-zinc-800/50`}>
          {/* Top Bar */}
          <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 bg-black/20 backdrop-blur-md z-20">
            <div className="md:hidden flex items-center gap-2 text-white font-bold tracking-tight">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Music2 size={18} />
              </div>
              SKSS music
            </div>
            <div className="hidden md:block"></div>
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <SettingsIcon size={20} />
              </button>
              <AuthButton />
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            {currentView === 'home' && <Home />}
            {currentView === 'library' && <Library />}
            {currentView === 'search' && <Search />}
            {currentView === 'notes' && <Notes />}
          </div>
        </main>
      </div>
      
      <PlayerBar />
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      <FullScreenPlayer />
      <GlobalPlayer />
      <CoolModeOverlay />
      
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </div>
  );
}
