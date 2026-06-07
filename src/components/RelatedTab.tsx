import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { usePlayerStore, LocalTrack } from '../store/usePlayerStore';
import { Play, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { searchAudius } from '../lib/audius';
import { searchYouTube } from '../lib/youtube';
import { searchSoundCloud } from '../lib/soundcloud';
import { getHighResImage } from '../lib/utils';

export function RelatedTab() {
  const { queue, currentTrackIndex, playTrack, addTracks, autoplayMode, setAutoplayMode } = usePlayerStore();
  const currentTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;

  const [relatedTracks, setRelatedTracks] = useState<LocalTrack[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentTrack) return;

    const fetchRelated = async () => {
      setLoading(true);
      try {
        const query = currentTrack.artist || currentTrack.title;
        let results: LocalTrack[] = [];
        
        // Use the same source if possible, or fallback to audius/youtube
        if (currentTrack.source === 'youtube') {
          results = await searchYouTube(query + ' music');
        } else if (currentTrack.source === 'soundcloud') {
          results = await searchSoundCloud(query);
        } else {
          results = await searchAudius(query);
        }

        // Filter out the current track
        results = results.filter(t => t.title !== currentTrack.title);
        
        // Take top 10
        setRelatedTracks(results.slice(0, 10));
      } catch (err) {
        console.error("Failed to fetch related tracks", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [currentTrack?.id]);

  const handlePlay = (track: LocalTrack) => {
    playTrack(track);
  };

  const handleAddToQueue = (track: LocalTrack) => {
    addTracks([track]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-50 bg-[#1a0505]/95 backdrop-blur-2xl flex flex-col pt-20 pb-24 px-4 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-xl font-bold text-white tracking-tight">Related to {currentTrack?.title}</h2>
      </div>

      <div className="flex-1 overflow-x-auto hide-scrollbar flex items-center">
        {loading ? (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : relatedTracks.length > 0 ? (
          <div className="flex gap-4 px-2 pb-8">
            {relatedTracks.map((track) => (
              <motion.div 
                key={track.id}
                whileHover={{ scale: 1.02 }}
                className="w-40 shrink-0 bg-white/5 rounded-2xl p-3 flex flex-col gap-3 group relative overflow-hidden"
              >
                <div className="aspect-square rounded-xl overflow-hidden relative shadow-lg">
                  {track.customImageUrl ? (
                    <img src={getHighResImage(track.customImageUrl)} alt={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Play size={24} className="text-zinc-600" />
                    </div>
                  )}
                  
                  {/* Overlay Quick Actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                    <button 
                      onClick={() => handlePlay(track)}
                      className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white truncate">{track.title}</span>
                  <span className="text-xs text-zinc-400 truncate">{track.artist}</span>
                </div>

                <button 
                  onClick={() => handleAddToQueue(track)}
                  className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors"
                >
                  <Plus size={14} /> Queue
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="w-full text-center text-zinc-500">No related tracks found.</div>
        )}
      </div>
    </motion.div>
  );
}
