import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Mic2, ListMusic, Maximize2 } from 'lucide-react';
import ReactPlayer from 'react-player';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn, getHighResImage } from '../lib/utils';
import { FullScreenPlayer } from './FullScreenPlayer';
import { Capacitor } from '@capacitor/core';
import { CapacitorMusicControls } from 'capacitor-music-controls-plugin';

export function PlayerBar() {
  const Player = ReactPlayer as any;
  const {
    queue, currentTrackIndex, isPlaying, volume,
    isShuffle, isRepeat, setIsPlaying, setVolume,
    toggleShuffle, toggleRepeat, nextTrack, prevTrack,
    setIsExpanded, setProgress: setStoreProgress, setDuration: setStoreDuration,
    setIsBuffering,
    progress, duration, seekTo, setSeekTo,
    autoplayMode, mediaMode
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);

  const storeTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;
  const currentTrack = storeTrack;

  const [audioUrl, setAudioUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!currentTrack) {
      setAudioUrl(undefined);
      return;
    }

    if (!currentTrack.isVideo || mediaMode === 'audio') {
      let url = '';
      let isCancelled = false;
      let createdBlobUrl = '';

      const loadAudio = async () => {
        if (currentTrack.file) {
          createdBlobUrl = URL.createObjectURL(currentTrack.file as Blob);
          url = createdBlobUrl;
        } else if (currentTrack.source === 'youtube') {
          const { getBackendUrl } = await import('../lib/utils');
          url = `${getBackendUrl()}/api/yt-stream?url=${encodeURIComponent(currentTrack.id)}&mode=audio&redirect=true`;
        } else if (currentTrack.streamUrl) {
          if (currentTrack.source === 'soundcloud') {
            const { resolvePlayableUrl } = await import('../lib/soundcloud');
            url = await resolvePlayableUrl(currentTrack.streamUrl);
          } else {
            url = currentTrack.streamUrl;
          }
        }

        if (!isCancelled) {
          setAudioUrl(url);
        }
      };

      loadAudio();

      return () => {
        isCancelled = true;
        if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      };
    } else {
      setAudioUrl(undefined);
    }
  }, [currentTrack, mediaMode]);

  useEffect(() => {
    let hls: any = null;

    if (audioRef.current && audioUrl) {
      if (audioUrl.includes('m3u8') || audioUrl.includes('hls=true')) {
        import('hls.js').then((HlsModule) => {
          const Hls = HlsModule.default;
          if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(audioUrl);
            hls.attachMedia(audioRef.current!);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (isPlaying) {
                audioRef.current?.play().catch(e => console.error("Playback failed (hls):", e));
              }
            });
            hls.on(Hls.Events.ERROR, function (event: any, data: any) {
              console.error("HLS Error:", data);
            });
          } else if (audioRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari / native HLS support
            audioRef.current.src = audioUrl;
            if (isPlaying) {
              audioRef.current.play().catch(e => console.error("Playback failed (native hls):", e));
            }
          }
        });
      } else {
        audioRef.current.src = audioUrl;
        if (isPlaying) {
          audioRef.current.play().catch(e => console.error("Playback failed:", e));
        }
      }
    } else if (audioRef.current && !audioUrl) {
      audioRef.current.src = '';
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [audioUrl]); // removed isPlaying from dependencies to not restart the stream

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (seekTo !== null) {
      if (currentTrack?.isVideo && mediaMode === 'video') {
        // Skip for video, handled by GlobalPlayer
      } else if (audioRef.current) {
        audioRef.current.currentTime = seekTo;
      }
      setSeekTo(null);
    }
  }, [seekTo, currentTrack?.isVideo, mediaMode]);

  const handleTimeUpdate = () => {
    if (audioRef.current && (!currentTrack?.isVideo || mediaMode === 'audio')) {
      setStoreProgress(audioRef.current.currentTime);
      setStoreDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (currentTrack?.isVideo && mediaMode === 'video') {
      setSeekTo(time); // Use global seek instead of local ref
      setStoreProgress(time);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
      setStoreProgress(time);
    }
  };

  useEffect(() => {
    let isNative = false;
    try {
      isNative = Capacitor.isNativePlatform();
    } catch (e) { }

    // Only use standard HTML5 mediaSession on the web. Native plugin handles Android/iOS.
    // Webview MediaSession can conflict with native plugins and crash.
    if ('mediaSession' in navigator && currentTrack && !isNative) {
      try {
        const isValidArtwork = currentTrack.customImageUrl &&
          !currentTrack.customImageUrl.startsWith('blob:') &&
          !currentTrack.customImageUrl.startsWith('data:');

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || 'Unknown Artist',
          artwork: isValidArtwork ? [
            { src: currentTrack.customImageUrl, sizes: '512x512' }
          ] : []
        });
      } catch (err) {
        console.warn("MediaSession error:", err);
      }

      navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        const state = usePlayerStore.getState();
        if (details.seekTime !== undefined && details.seekTime !== null) {
          if (currentTrack?.isVideo && mediaMode === 'video') {
            state.setSeekTo(details.seekTime);
            state.setProgress(details.seekTime);
          } else if (audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            state.setProgress(details.seekTime);
          }
        }
      });
    }

    if (isNative && currentTrack) {
      const resolvedImage = getHighResImage(currentTrack.customImageUrl);
      // Ensure we provide a valid HTTP URL cover, empty strings can cause NullPointerException in Java
      const fallbackUrl = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500&auto=format&fit=crop';
      const cover = resolvedImage && resolvedImage.startsWith('http')
        ? resolvedImage
        : fallbackUrl;

      const opts: any = {
        track: currentTrack.title || 'Unknown Track',
        artist: currentTrack.artist || 'Unknown Artist',
        album: 'SKSS Music',
        cover: cover,
        hasPrev: true,
        hasNext: true,
        hasClose: false,
        isPlaying: true,
        dismissable: false,
        ticker: `Now playing "${currentTrack.title}"`,
        playIcon: '',
        pauseIcon: '',
        prevIcon: '',
        nextIcon: '',
        closeIcon: '',
        notificationIcon: ''
      };

      const setupControls = async () => {
        try {
          if (Capacitor.getPlatform() === 'android') {
            try {
              const { LocalNotifications } = await import('@capacitor/local-notifications');
              let perm = await LocalNotifications.checkPermissions();
              if (perm.display !== 'granted') {
                perm = await LocalNotifications.requestPermissions();
              }
              if (perm.display !== 'granted') {
                console.warn('Notification permission not granted, skipping music controls');
                return; // Early exit to prevent crash
              }
            } catch (e) {
              console.error('Failed to request notification permission', e);
            }
          }

          CapacitorMusicControls.create(opts)
            .catch((e: any) => console.error('MusicControls create error:', e));
        } catch (e) {
          console.error(e);
        }
      };

      setupControls();
    }
  }, [currentTrack]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        CapacitorMusicControls.updateIsPlaying({
          isPlaying: isPlaying,
        });
      } catch (e) { }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleControlsEvent = (info: any) => {
        const message = info.message || info.action;
        const state = usePlayerStore.getState();
        switch (message) {
          case 'music-controls-next':
          case 'music-controls-media-button-next':
            state.setSeekTo(null);
            state.nextTrack();
            break;
          case 'music-controls-previous':
          case 'music-controls-media-button-previous':
            state.setSeekTo(null);
            state.prevTrack();
            break;
          case 'music-controls-pause':
          case 'music-controls-media-button-pause':
            state.setIsPlaying(false);
            break;
          case 'music-controls-play':
          case 'music-controls-media-button-play':
            state.setIsPlaying(true);
            break;
          case 'music-controls-media-button-play-pause':
          case 'music-controls-toggle-play-pause':
          case 'music-controls-media-button':
            state.setIsPlaying(!state.isPlaying);
            break;
          default:
            break;
        }
      };

      // iOS listener
      const iosListener = CapacitorMusicControls.addListener("controlsNotification", (info: any) => {
        handleControlsEvent(info);
      });

      // Android listener
      const androidListener = (event: any) => {
        handleControlsEvent({ message: event.message });
      };
      document.addEventListener("controlsNotification", androidListener);

      return () => {
        iosListener.then(l => l.remove()).catch(() => { });
        document.removeEventListener("controlsNotification", androidListener);
      };
    }
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <div className="h-16 md:h-24 bg-zinc-950 border-t border-zinc-900 flex items-center justify-center text-zinc-500 text-sm md:text-base z-50">
        Select a track to start playing
      </div>
    );
  }

  return (
    <div className="h-16 md:h-24 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between px-2 md:px-4 z-50 relative">
      <audio
        ref={audioRef}
        loop={isRepeat || (currentTrack?.isVideo && mediaMode === 'video')}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (!currentTrack?.isVideo || mediaMode === 'audio') {
            usePlayerStore.getState().handleTrackEnd();
          }
        }}
        onError={(e) => {
          console.error("Audio playback error:", e);
          if (isPlaying && (!currentTrack?.isVideo || mediaMode === 'audio')) {
            // Automatically skip to the next track if playback fails
            setTimeout(() => {
              if (usePlayerStore.getState().isPlaying) {
                nextTrack();
              }
            }, 2000);
          }
        }}
        onWaiting={() => {
          if (!currentTrack?.isVideo || mediaMode === 'audio') setIsBuffering(true);
        }}
        onPlaying={() => {
          if (!currentTrack?.isVideo || mediaMode === 'audio') setIsBuffering(false);
        }}
        onCanPlay={() => {
          if (!currentTrack?.isVideo || mediaMode === 'audio') setIsBuffering(false);
        }}
        preload="auto"
      />

      {/* Mobile Progress Bar (Absolute Top) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] md:hidden bg-zinc-800">
        <div className="h-full bg-indigo-500" style={{ width: `${(progress / (duration || 1)) * 100}%` }} />
        <input
          type="range"
          min={0} max={duration || 100} value={progress} onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Track Info */}
      <div
        className="flex items-center gap-3 md:gap-4 w-1/2 md:w-1/4 min-w-0 md:min-w-[180px] cursor-pointer group"
        onClick={() => setIsExpanded(true)}
      >
        <motion.div
          layoutId="player-art"
          className="w-10 h-10 md:w-14 md:h-14 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0 relative"
        >
          {currentTrack.customImageUrl ? (
            <img src={getHighResImage(currentTrack.customImageUrl)} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
              <ListMusic size={20} className="md:w-6 md:h-6" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 size={18} className="text-white" />
          </div>
        </motion.div>
        <div className="overflow-hidden min-w-0">
          <h4 className="text-white text-sm font-medium truncate group-hover:underline">{currentTrack.title}</h4>
          <p className="text-zinc-400 text-xs truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-[40%] gap-1 md:gap-2">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={toggleShuffle} className={cn("hidden md:block text-zinc-400 hover:text-white transition", isShuffle && "text-indigo-500")}>
            <Shuffle size={18} />
          </button>
          <button onClick={prevTrack} className="hidden md:block text-zinc-400 hover:text-white transition">
            <SkipBack size={20} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition flex-shrink-0"
          >
            {isPlaying ? <Pause size={18} className="fill-black" /> : <Play size={18} className="fill-black ml-1" />}
          </button>
          <button onClick={nextTrack} className="text-zinc-400 hover:text-white transition">
            <SkipForward size={20} />
          </button>
          <button onClick={toggleRepeat} className={cn("hidden md:block text-zinc-400 hover:text-white transition", isRepeat && "text-indigo-500")}>
            <Repeat size={18} />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 w-full text-xs text-zinc-400 font-mono">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="hidden md:flex items-center justify-end gap-4 w-1/4 min-w-[180px]">
        <button className="text-zinc-400 hover:text-white transition">
          <Mic2 size={18} />
        </button>
        <div className="flex items-center gap-2 w-24">
          <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-zinc-400 hover:text-white transition">
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
