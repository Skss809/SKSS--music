import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { getRecommendations } from '../lib/ai';
import { searchSoundCloud, getTrendingTracks } from '../lib/soundcloud';
import { getHighResImage } from '../lib/utils';
import { Sparkles, Play, Loader2, RotateCcw, ListPlus } from 'lucide-react';
import { Visualizer } from './Visualizer';

export function Home() {
  const { tracks, currentTrackIndex, setCurrentTrackIndex, playTrack, playHistory, playlists, setTracks, setIsPlaying, playQueue } = usePlayerStore();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRecIndex, setLoadingRecIndex] = useState<number | null>(null);

  const fetchRecommendations = async (force = false) => {
    if (recommendations.length > 0 && !force) return;
    
    setIsLoading(true);
    let seedHistory: {title: string, artist: string}[] = [];
    let trendingSeeds: {title: string, artist: string}[] = [];

    try {
      const trending = await getTrendingTracks();
      trendingSeeds = trending.slice(0, 10).map(t => ({ title: t.title, artist: t.artist }));
    } catch (e) {
      console.warn("Failed to fetch trending for seeds", e);
    }

    if (playHistory.length > 0) {
      // Use random selection from history
      const recentPool = playHistory.slice(0, 20);
      seedHistory = [...recentPool].sort(() => 0.5 - Math.random()).slice(0, 5).map(t => ({ title: t.title, artist: t.artist }));
    } else if (tracks.length > 0) {
      seedHistory = [...tracks].sort(() => 0.5 - Math.random()).slice(0, 5).map(t => ({ title: t.title, artist: t.artist }));
    }

    let recs = await getRecommendations(seedHistory, trendingSeeds);
    
    if (recs.length === 0) {
      // Fallback recommendations if AI API fails (e.g. offline, rate limit, or stale backend)
      if (trendingSeeds.length > 5) {
        recs = [...trendingSeeds].sort(() => 0.5 - Math.random()).slice(0, 5);
      } else {
        const defaultList = [
          { title: "Starboy", artist: "The Weeknd" },
          { title: "Watermelon Sugar", artist: "Harry Styles" },
          { title: "Stay", artist: "The Kid LAROI, Justin Bieber" },
          { title: "Peaches", artist: "Justin Bieber" },
          { title: "Save Your Tears", artist: "The Weeknd" },
          { title: "Blinding Lights", artist: "The Weeknd" },
          { title: "Levitating", artist: "Dua Lipa" },
          { title: "As It Was", artist: "Harry Styles" },
          { title: "Bad Habits", artist: "Ed Sheeran" },
          { title: "Good 4 U", artist: "Olivia Rodrigo" }
        ];
        recs = [...defaultList].sort(() => 0.5 - Math.random()).slice(0, 5);
      }
    }
    
    // Fetch track metadata (including images) in parallel
    const enrichedRecs = await Promise.all(recs.map(async (rec) => {
       try {
          const query = `${rec.title} ${rec.artist}`;
          const searchResults = await searchSoundCloud(query);
          if (searchResults && searchResults.length > 0) {
             return { ...rec, ...searchResults[0] };
          } else {
             return rec;
          }
       } catch(e) { 
          console.error(e);
          return rec;
       }
    }));
    
    setRecommendations(enrichedRecs);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecommendations();
  }, [tracks.length]);

  const handlePlayRecommendation = async (rec: any, index: number) => {
    if (rec.streamUrl) {
      playTrack(rec);
      return;
    }
    // Fallback if not enriched properly
    try {
      setLoadingRecIndex(index);
      const query = `${rec.title} ${rec.artist}`;
      const searchResults = await searchSoundCloud(query);
      if (searchResults && searchResults.length > 0) {
        playTrack(searchResults[0]);
      } else {
        alert("Couldn't find the track on SoundCloud.");
      }
    } catch(err: any) {
      console.error("Failed to play recommendation", err);
      alert("Error playing track: " + (err.message || err));
    } finally {
      setLoadingRecIndex(null);
    }
  };

  const hour = new Date().getHours();
  let greeting = "Good Evening";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";

  // Get most recent 5 tracks from history, not just library files backwards
  const recentTracks = playHistory.slice(0, 5);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto pb-24">
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-6 md:mb-8">{greeting}</h2>
      
        {/* Visualizer */}
        <div className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-4 md:mb-6">Now Playing</h2>
          <Visualizer />
        </div>

      {recentTracks.length > 0 && (
        <div className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-4 md:mb-6">Recently Played</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {recentTracks.map((track, index) => (
              <div 
                key={track.id + index} 
                className="flex items-center gap-3 md:gap-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-md overflow-hidden cursor-pointer transition-colors group"
                onClick={() => {
                  const originalIndex = tracks.findIndex(t => t.id === track.id);
                  if (originalIndex !== -1) setCurrentTrackIndex(originalIndex);
                }}
              >
                <div className="w-12 h-12 md:w-16 md:h-16 bg-zinc-700 flex-shrink-0 relative">
                  {track.customImageUrl && <img src={getHighResImage(track.customImageUrl)} alt={track.title} className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={20} className="fill-white text-white ml-1" />
                  </div>
                </div>
                <div className="font-medium text-white text-sm md:text-base truncate pr-2 md:pr-4">{track.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* AI Recommendations */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="text-indigo-400 md:w-6 md:h-6" size={20} />
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">AI Recommended For You</h2>
            </div>
            <button 
              onClick={() => fetchRecommendations(true)}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all disabled:opacity-50 group"
              title="Refresh Recommendations"
            >
              <RotateCcw size={18} className={`md:w-5 md:h-5 ${isLoading ? 'animate-spin' : 'group-hover:rotate-[-45deg] transition-transform'}`} />
            </button>
          </div>
          
          {isLoading ? (
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-36 md:w-48 flex-shrink-0 animate-pulse snap-start">
                  <div className="aspect-square bg-zinc-800 rounded-xl mb-3 md:mb-4"></div>
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {recommendations.map((rec, i) => (
                <div key={i} 
                    className="w-36 md:w-48 flex-shrink-0 group cursor-pointer snap-start"
                    onClick={() => handlePlayRecommendation(rec, i)}>
                  <div className="aspect-square bg-gradient-to-br from-indigo-900 to-zinc-900 rounded-xl mb-3 md:mb-4 relative overflow-hidden shadow-lg">
                    {rec.customImageUrl ? (
                      <img src={getHighResImage(rec.customImageUrl)} alt={rec.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-indigo-500/20">
                        <Sparkles size={48} className="md:w-16 md:h-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl">
                        {loadingRecIndex === i ? (
                           <Loader2 size={20} className="animate-spin text-white" />
                        ) : (
                           <Play size={20} className="md:w-6 md:h-6 ml-1 fill-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white font-medium text-sm md:text-base truncate">{rec.title}</h3>
                  <p className="text-zinc-400 text-xs md:text-sm truncate">{rec.artist}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-zinc-500 text-sm md:text-base bg-zinc-900/50 p-4 md:p-6 rounded-xl border border-zinc-800">
              Add some tracks from Search or play a song to get personalized AI recommendations.
            </div>
          )}
        </div>

        {/* Speed Dial / Playlists */}
        {playlists && playlists.length > 0 && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <ListPlus className="text-indigo-400 md:w-6 md:h-6" size={20} />
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Speed Dial</h2>
            </div>
            
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {playlists.map((playlist) => (
                <div key={playlist.id} 
                    className="w-36 md:w-48 flex-shrink-0 group cursor-pointer snap-start"
                    onClick={() => {
                       const playlistTracks = playlist.trackIds.map(id => tracks.find(t => t.id === id)).filter(Boolean);
                       if (playlistTracks.length > 0) {
                         playQueue(playlistTracks, 0);
                       } else {
                         alert("This playlist is empty.");
                       }
                    }}>
                  <div className="aspect-square bg-gradient-to-br from-indigo-900 to-zinc-900 rounded-xl mb-3 md:mb-4 relative overflow-hidden shadow-lg">
                    {playlist.coverUrl ? (
                      <img src={getHighResImage(playlist.coverUrl)} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-indigo-500/20">
                        <ListPlus size={48} className="md:w-16 md:h-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl">
                         <Play size={20} className="md:w-6 md:h-6 ml-1 fill-white" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white font-medium text-sm md:text-base truncate">{playlist.name}</h3>
                  <p className="text-zinc-400 text-xs md:text-sm truncate">{playlist.trackIds.length} tracks</p>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
