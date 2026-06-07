import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause } from 'lucide-react';

interface LyricLine {
  time: number;
  text: string;
}

export function LyricsTab() {
  const { queue, currentTrackIndex, progress, setSeekTo, isPlaying, setIsPlaying } = usePlayerStore();
  const currentTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // To stop auto-scroll when user interacts
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastProgrammaticScroll = useRef(0);

  const currentLineIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return progress >= line.time && (!nextLine || progress < nextLine.time);
  });

  useEffect(() => {
    if (!currentTrack) return;
    
    setLyrics([]);
    setPlainLyrics(null);
    setError(null);
    setLoading(true);
    setAutoScroll(true);

    const fetchLyrics = async () => {
      try {
        let data: any = null;

        // Clean up title (remove things in parentheses, brackets, etc. common on YT/SC)
        let cleanTitle = currentTrack.title
          .replace(/\(.*\)/g, '')
          .replace(/\[.*\]/g, '')
          .replace(/official( music)? video/gi, '')
          .replace(/lyric(s)?( video)?/gi, '')
          .trim();
        
        let cleanArtist = currentTrack.artist.trim();

        // Sometimes YT/SC titles are "Artist - Title"
        if (cleanTitle.includes('-')) {
          const parts = cleanTitle.split('-');
          cleanArtist = parts[0].trim();
          cleanTitle = parts.slice(1).join('-').trim();
        }

        // Try exact match first
        let res = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`);
        
        if (res.ok) {
          data = await res.json();
        } else {
          // Fallback to search API with raw title + artist just in case the cleanup stripped too much
          // or if the uploader is not the real artist
          const query = `${currentTrack.title} ${currentTrack.artist}`
            .replace(/\(.*\)/g, '')
            .replace(/\[.*\]/g, '')
            .trim();
            
          const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
          if (searchRes.ok) {
            const results = await searchRes.json();
            if (results && results.length > 0) {
              // Prefer result with synced lyrics
              data = results.find((r: any) => r.syncedLyrics) || results[0];
            }
          }
        }
        
        if (data && data.syncedLyrics) {
          const lines = parseLRC(data.syncedLyrics);
          if (lines.length > 0) {
            setLyrics(lines);
          } else {
            // Edge case: empty synced lyrics string
            setPlainLyrics(data.plainLyrics || null);
            if (!data.plainLyrics) setError('No lyrics available for this track.');
          }
        } else if (data && data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
        } else {
          setError('No lyrics available for this track.');
        }
      } catch (err) {
        console.error("Lyrics fetch error:", err);
        setError('Failed to load lyrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [currentTrack?.id]);

  useEffect(() => {
    if (autoScroll && containerRef.current && currentLineIndex >= 0) {
      const container = containerRef.current;
      const activeLine = document.getElementById(`lyric-${currentLineIndex}`);
      
      if (activeLine) {
        const scrollPos = activeLine.offsetTop - container.offsetHeight / 2 + activeLine.offsetHeight / 2;
        lastProgrammaticScroll.current = Date.now();
        container.scrollTo({ top: Math.max(0, scrollPos), behavior: 'smooth' });
      }
    }
  }, [currentLineIndex, autoScroll]);

  const handleScroll = () => {
    if (Date.now() - lastProgrammaticScroll.current < 1000) {
      // Ignore scroll events triggered by our smooth scrolling animation
      return;
    }
    // If user scrolls manually, disable autoScroll temporarily
    if (autoScroll) {
      setAutoScroll(false);
    }
  };

  const handleResumeSync = () => {
    setAutoScroll(true);
  };

  const parseLRC = (lrcText: string): LyricLine[] => {
    const lines = lrcText.split('\n');
    const parsed: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const ms = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
        const time = minutes * 60 + seconds + ms / 1000;
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          parsed.push({ time, text });
        }
      }
    }
    return parsed;
  };

  if (!currentTrack) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl flex flex-col pt-20 pb-24 px-6 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto hide-scrollbar relative" onScroll={handleScroll} ref={containerRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-zinc-500 font-medium text-lg">
            {error}
          </div>
        ) : lyrics.length > 0 ? (
          <div className="flex flex-col gap-6 py-[40vh]">
            {lyrics.map((line, index) => {
              const isActive = index === currentLineIndex;
              const isPast = index < currentLineIndex;
              return (
                <motion.div
                  key={index}
                  id={`lyric-${index}`}
                  onClick={() => setSeekTo(line.time)}
                  className={`text-2xl md:text-3xl font-bold cursor-pointer transition-all duration-500 ${
                    isActive 
                      ? 'text-white scale-105 origin-left' 
                      : isPast 
                        ? 'text-white/40 hover:text-white/70' 
                        : 'text-white/20 hover:text-white/50'
                  }`}
                >
                  {line.text}
                </motion.div>
              );
            })}
          </div>
        ) : plainLyrics ? (
          <div className="py-8 text-xl font-medium text-white/80 whitespace-pre-line leading-relaxed text-center">
            {plainLyrics}
          </div>
        ) : null}
      </div>

      {/* Floating Control */}
      {(!autoScroll && lyrics.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-4 shadow-xl border border-white/10"
        >
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          <button 
            onClick={handleResumeSync}
            className="text-sm font-bold tracking-wider text-white hover:text-green-400 transition-colors"
          >
            SYNC
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
