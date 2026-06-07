import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, MoreVertical, Cast,
  RotateCcw, RotateCw
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Slider } from './Slider';
import { cn, getHighResImage } from '../lib/utils';
import { LyricsTab } from './LyricsTab';
import { RelatedTab } from './RelatedTab';
import { UpNextTab } from './UpNextTab';
import { CoolModeOverlay } from './CoolModeOverlay';
import { LightningVisualizer } from './LightningVisualizer';
import { CloudVisualizer } from './CloudVisualizer';
import AnimationOverlay from '../plugins/AnimationOverlay';
import { Capacitor } from '@capacitor/core';

export function FullScreenPlayer() {
  const Player = ReactPlayer as any;
  const { 
    queue, 
    currentTrackIndex, 
    isPlaying, 
    setIsPlaying, 
    nextTrack, 
    prevTrack, 
    isShuffle, 
    toggleShuffle, 
    isRepeat, 
    toggleRepeat,
    isExpanded,
    setIsExpanded,
    progress,
    duration,
    isBuffering,
    setSeekTo,
    volume,
    setVideoBounds,
    mediaMode
  } = usePlayerStore();

  const { playerStyle, theme, coolModeStyle, coolModeEnabled } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  const artRef = React.useRef<HTMLDivElement>(null);

  const currentTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (val: number[]) => {
    setSeekTo(val[0]);
  };

  const skip10 = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration || 0, progress + seconds));
    setSeekTo(newTime);
  };

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const manageOverlay = async () => {
      try {
        if (isPlaying && coolModeEnabled) {
          const { granted } = await AnimationOverlay.checkPermissions();
          if (!granted) {
            await AnimationOverlay.requestPermissions();
          } else {
            await AnimationOverlay.startOverlay({ style: coolModeStyle || 'default' });
          }
        } else {
          await AnimationOverlay.stopOverlay();
        }
      } catch (error) {
        console.error("Overlay animation error:", error);
      }
    };

    manageOverlay();

    return () => {
      // Cleanup on unmount or when playing stops
      if (Capacitor.isNativePlatform()) {
        AnimationOverlay.stopOverlay().catch(console.error);
      }
    };
  }, [isPlaying]);

  React.useLayoutEffect(() => {
    if (!artRef.current) return;
    
    const updateBounds = () => {
      if (artRef.current) {
        const rect = artRef.current.getBoundingClientRect();
        setVideoBounds({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(artRef.current);
    window.addEventListener('resize', updateBounds);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [isExpanded]);

  return (
    <AnimatePresence>
      {(isExpanded && currentTrack) && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            "fixed inset-0 z-[105] flex flex-col overflow-hidden text-white h-[100dvh] touch-none transition-colors duration-500",
            "bg-[#1a0505]"
          )}
        >
          {/* Background Gradient */}
          <div className={cn(
            "absolute inset-0 z-0 transition-opacity duration-500",
            "opacity-100 bg-gradient-to-b from-[#3d0a0a] via-[#1a0505] to-[#000000]"
          )} />
          
          <CoolModeOverlay />
          
          {/* Header */}
          <header className="relative z-20 flex items-center justify-between px-4 pt-6 pb-2">
            <button 
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ChevronDown size={24} />
            </button>
            
            {currentTrack?.isVideo ? (
              <div className="flex bg-white/10 rounded-full p-1 backdrop-blur-md">
                <button
                  onClick={() => usePlayerStore.setState({ mediaMode: 'audio' })}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                    mediaMode === 'audio' ? "bg-white text-black shadow-md" : "text-white/70 hover:text-white"
                  )}
                >
                  Song
                </button>
                <button
                  onClick={() => usePlayerStore.setState({ mediaMode: 'video' })}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                    mediaMode === 'video' ? "bg-white text-black shadow-md" : "text-white/70 hover:text-white"
                  )}
                >
                  Video
                </button>
              </div>
            ) : <div />}

            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <Cast size={20} />
              </button>
              <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 flex flex-col px-6 pt-2 pb-2 overflow-hidden">
            {/* Cover Art Container */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-2">
              <div 
                ref={artRef}
                className={cn(
                  "w-full aspect-square max-w-[500px] relative",
                  playerStyle === 'round' && isPlaying && "animate-[bounce_1s_infinite]"
                )}
              >
                {/* Aurora effect for dynamic */}
                {playerStyle === 'dynamic' && isPlaying && (
                  <div className="absolute -inset-4 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-70 animate-pulse pointer-events-none"></div>
                )}
                {/* Blue sparks for spin-vinyl */}
                {playerStyle === 'spin-vinyl' && isPlaying && (
                  <div className="absolute inset-0 pointer-events-none animate-spin-slow z-20">
                    <div className="absolute top-[-10px] left-1/2 w-3 h-3 bg-blue-400 rounded-full blur-[2px] animate-pulse"></div>
                    <div className="absolute bottom-[-10px] right-1/2 w-4 h-4 bg-blue-500 rounded-full blur-[3px] animate-pulse delay-75"></div>
                    <div className="absolute left-[-10px] top-1/3 w-2 h-2 bg-blue-300 rounded-full blur-[1px] animate-ping"></div>
                  </div>
                )}
                {/* Shurikens popping out */}
                {playerStyle === 'shuriken' && isPlaying && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                    {Array.from({length: 4}).map((_, i) => (
                      <motion.div 
                        key={i}
                        className="absolute w-12 h-12"
                        animate={{ 
                          scale: [0, 1.5, 0], 
                          rotate: 360, 
                          x: [(i%2===0?-1:1)*50, (i%2===0?-1:1)*150], 
                          y: [(i<2?-1:1)*50, (i<2?-1:1)*150],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                      >
                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
                          <path d="M50 0L61 39L100 50L61 61L50 100L39 61L0 50L39 39L50 0Z" fill="url(#steelGradientArt)"/>
                          <circle cx="50" cy="50" r="8" fill="transparent" stroke="#111" strokeWidth="4" />
                          <defs>
                            <linearGradient id="steelGradientArt" x1="0" y1="0" x2="100" y2="100">
                              <stop offset="0%" stopColor="#e2e8f0" />
                              <stop offset="50%" stopColor="#94a3b8" />
                              <stop offset="100%" stopColor="#475569" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </motion.div>
                    ))}
                  </div>
                )}
                {/* Cinematic Cloud Mist Effect */}
                {playerStyle === 'cloud' && (
                  <CloudVisualizer isPlaying={isPlaying} />
                )}

                <motion.div 
                  layoutId="player-art"
                  className={cn(
                    "w-full h-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center transition-all duration-500 bg-black relative z-10",
                    playerStyle === 'spin-vinyl' && cn("rounded-full border-4 border-zinc-900", isPlaying && "animate-spin-slow"),
                    playerStyle === 'round' && "rounded-full",
                    (playerStyle === 'shuriken' || playerStyle === 'dynamic' || !playerStyle || playerStyle === 'default') && "rounded-2xl",
                    playerStyle === 'cloud' && cn("clip-cloud", !isPlaying && "paused"),
                    playerStyle === 'static' && "rounded-sm"
                  )}
                >
                  {/* Realistic Lightning for static */}
                  {playerStyle === 'static' && (
                    <LightningVisualizer isPlaying={isPlaying} />
                  )}

                  {currentTrack.customImageUrl ? (
                    <img 
                      src={getHighResImage(currentTrack.customImageUrl)} 
                      alt={currentTrack.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4 text-zinc-500">
                        <Play size={64} className="fill-zinc-800 text-zinc-800" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Art Missing</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Track Info & Controls Group */}
            <div className="flex flex-col mt-auto shrink-0">
              {/* Track Info */}
              <div className="mb-4 text-center">
                <h2 className="text-lg font-bold mb-0.5 tracking-tight truncate px-4">{currentTrack.title}</h2>
                <p className="text-zinc-400 font-medium text-xs truncate px-4">{currentTrack.artist}</p>
              </div>

              {/* Progress Slider */}
              <div className="mb-4 px-2">
                <Slider 
                  value={[progress]} 
                  max={duration || 100} 
                  step={0.1} 
                  onValueChange={handleSeek}
                  className="mb-2"
                />
                <div className="flex justify-between text-[9px] font-bold text-zinc-400 font-mono">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between px-1 mb-4">
                <button 
                  onClick={toggleShuffle}
                  className={`transition-colors ${isShuffle ? 'text-white' : 'text-zinc-600'}`}
                >
                  <Shuffle size={18} />
                </button>
                
                <div className="flex items-center gap-2 xs:gap-5">
                  <button 
                    onClick={() => skip10(-10)}
                    className="text-zinc-400 hover:text-white transition-colors flex flex-col items-center group"
                  >
                    <RotateCcw size={20} className="group-active:scale-90 transition-transform" />
                    <span className="text-[8px] font-bold mt-0.5">10</span>
                  </button>

                  <button 
                    onClick={prevTrack}
                    className="text-white active:scale-90 transition-transform"
                  >
                    <SkipBack size={26} fill="currentColor" />
                  </button>
                  
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                  >
                    {isBuffering ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />
                    )}
                  </button>
                  
                  <button 
                    onClick={nextTrack}
                    className="text-white active:scale-90 transition-transform"
                  >
                    <SkipForward size={26} fill="currentColor" />
                  </button>

                  <button 
                    onClick={() => skip10(10)}
                    className="text-zinc-400 hover:text-white transition-colors flex flex-col items-center group"
                  >
                    <RotateCw size={20} className="group-active:scale-90 transition-transform" />
                    <span className="text-[8px] font-bold mt-0.5">10</span>
                  </button>
                </div>

                <button 
                  onClick={toggleRepeat}
                  className={`transition-colors ${isRepeat ? 'text-white' : 'text-zinc-600'}`}
                >
                  <Repeat size={18} />
                </button>
              </div>
            </div>

            {/* Tab Overlays */}
            <AnimatePresence>
              {activeTab === 'LYRICS' && <LyricsTab />}
              {activeTab === 'RELATED' && <RelatedTab />}
              {activeTab === 'UP NEXT' && <UpNextTab />}
            </AnimatePresence>
          </div>

          {/* Bottom Tabs */}
          <footer className="relative z-10 bg-black/40 backdrop-blur-xl border-t border-white/5 pb-safe">
            <div className="flex items-center justify-around py-3">
              {['UP NEXT', 'LYRICS', 'RELATED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(activeTab === tab ? null : tab)}
                  className={`text-[10px] font-bold tracking-[0.1em] transition-all duration-300 ${activeTab === tab ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Home Indicator (iOS style) */}
            <div className="h-1 w-24 bg-white/10 mx-auto rounded-full mb-2" />
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
