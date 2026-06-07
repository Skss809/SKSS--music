import React, { useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

export function GlobalPlayer() {
  const Player = ReactPlayer as any;
  const { 
    queue, currentTrackIndex, isPlaying, volume, 
    nextTrack, setIsBuffering,
    setProgress, setDuration,
    seekTo, setSeekTo,
    isExpanded, videoBounds,
    isRepeat, autoplayMode, setIsPlaying, mediaMode
  } = usePlayerStore();
  
  const playerRef = useRef<any>(null);
  const storeTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;
  const currentTrack = storeTrack;

  useEffect(() => {
    if (seekTo !== null && playerRef.current && currentTrack?.isVideo) {
      playerRef.current.seekTo(seekTo, 'seconds');
      setSeekTo(null);
    }
  }, [seekTo, currentTrack?.isVideo]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && playerRef.current && currentTrack?.isVideo) {
        // Try to force play when going to background
        const internalPlayer = playerRef.current.getInternalPlayer();
        if (internalPlayer && typeof internalPlayer.playVideo === 'function') {
           setTimeout(() => {
             internalPlayer.playVideo();
           }, 100);
        }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying, currentTrack?.isVideo]);

  // Silent Audio Hack to keep WebView JS timers alive in background
  useEffect(() => {
    let silentAudio: HTMLAudioElement | null = null;
    
    if (isPlaying && currentTrack?.isVideo) {
      silentAudio = new Audio();
      // 1 second of silent Base64 WAV
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentAudio.loop = true;
      silentAudio.volume = 0.01; // Minimum volume just in case
      silentAudio.play().catch(e => console.warn('Silent audio play blocked:', e));
    }

    return () => {
      if (silentAudio) {
        silentAudio.pause();
        silentAudio.src = '';
      }
    };
  }, [isPlaying, currentTrack?.isVideo]);

  // Aggressive YouTube Iframe override
  useEffect(() => {
    let interval: any;
    if (isPlaying && currentTrack?.isVideo && playerRef.current) {
      // 100ms interval kept alive by silent audio above
      interval = setInterval(() => {
        if (document.hidden) {
          const internalPlayer = playerRef.current?.getInternalPlayer();
          // Forcefully trigger play if YouTube API paused it
          if (internalPlayer && typeof internalPlayer.playVideo === 'function') {
            internalPlayer.playVideo();
          }
        }
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack?.isVideo]);

  const lastBounds = useRef<{ top: number, left: number, width: number, height: number } | null>(null);
  
  useEffect(() => {
    if (videoBounds) {
      lastBounds.current = videoBounds;
    }
  }, [videoBounds]);

  const [videoUrl, setVideoUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!currentTrack || !currentTrack.isVideo) {
      setVideoUrl(undefined);
      return;
    }

    if (currentTrack.file) {
      const url = URL.createObjectURL(currentTrack.file as Blob);
      setVideoUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (currentTrack.source === 'youtube') {
      import('../lib/utils').then(({ getBackendUrl }) => {
        const url = `${getBackendUrl()}/api/yt-stream?url=${encodeURIComponent(currentTrack.id)}&mode=video&redirect=true`;
        setVideoUrl(url);
      });
    } else {
      setVideoUrl(currentTrack.streamUrl);
    }
  }, [currentTrack]);

  const activeBounds = isExpanded ? videoBounds : lastBounds.current;
  
  const expandedStyle = (currentTrack?.isVideo && activeBounds) ? {
    top: activeBounds.top,
    left: activeBounds.left,
    width: activeBounds.width,
    height: activeBounds.height,
  } : {};

  return (
    <div 
      className={cn(
        "fixed transition-all duration-500 z-[106]",
        (!isExpanded || !currentTrack?.isVideo || mediaMode === 'audio') && "opacity-0 pointer-events-none"
      )}
      style={{
        ...expandedStyle,
        ...((!isExpanded || !currentTrack?.isVideo || mediaMode === 'audio') && !activeBounds ? { top: -9999, left: -9999, width: 300, height: 300 } : {})
      }}
    >
      <div className={cn(
        "relative w-full h-full bg-black overflow-hidden rounded-2xl shadow-2xl transition-all duration-500",
        isExpanded && currentTrack?.isVideo && mediaMode === 'video' ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        {currentTrack?.isVideo && (
          <Player
            ref={playerRef}
            url={videoUrl}
            playing={isPlaying && mediaMode === 'video'}
            volume={volume}
            width="177.77%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}
            onProgress={(state: any) => setProgress(state.playedSeconds)}
            onDuration={(d: number) => setDuration(d)}
            loop={isRepeat}
            onEnded={() => {
              if (isRepeat) {
                if (playerRef.current) {
                  playerRef.current.seekTo(0);
                }
              } else {
                usePlayerStore.getState().handleTrackEnd();
              }
            }}
            playsinline={true}
            onPause={() => {
              // Standard HTML5 video element handles background playback seamlessly
            }}
            onPlay={() => {
              if (window.navigator.mediaSession && currentTrack) {
                window.navigator.mediaSession.playbackState = 'playing';
              }
            }}
            onBuffer={() => setIsBuffering(true)}
            onBufferEnd={() => setIsBuffering(false)}
            onError={(e: any) => {
              console.error("Video Playback Error:", e);
              setIsBuffering(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
