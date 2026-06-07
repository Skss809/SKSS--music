import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Download, Play, Plus, Check, X, Music, Cloud, Youtube } from 'lucide-react';
import { searchAudius } from '../lib/audius';
import { searchSoundCloud } from '../lib/soundcloud';
import { searchYouTube } from '../lib/youtube';
import { getHighResImage } from '../lib/utils';
import { usePlayerStore, LocalTrack } from '../store/usePlayerStore';
import { saveTrackToDB } from '../lib/idb';

type SearchSource = 'audius' | 'soundcloud' | 'youtube';

export function Search() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SearchSource>('audius');
  const [results, setResults] = useState<LocalTrack[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadStats, setDownloadStats] = useState<Record<string, {loaded: number, total: number}>>({});
  const [playlistModalTrack, setPlaylistModalTrack] = useState<LocalTrack | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  const { playTrack, addTracks, tracks, playlists, createPlaylist, addToPlaylist, isBuffering, currentTrackIndex, queue } = usePlayerStore();
  
  const currentTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        setIsSearching(true);
        setErrorMsg(null);
        try {
          let fetched: LocalTrack[] = [];
          if (source === 'audius') {
            fetched = await searchAudius(query);
          } else if (source === 'soundcloud') {
            fetched = await searchSoundCloud(query);
          } else if (source === 'youtube') {
            fetched = await searchYouTube(query);
          }
          setResults(fetched);
          if (fetched.length === 0) {
            setErrorMsg("No results found.");
          }
        } catch (e: any) {
          setResults([]);
          setErrorMsg(e.message || "An error occurred while searching");
        }
        setIsSearching(false);
      } else {
        setResults([]);
        setErrorMsg(null);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [query, source]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleDownload = async (track: LocalTrack) => {
    if (!track.streamUrl) return;

    setDownloadingId(track.id);
    setDownloadStats(prev => ({...prev, [track.id]: {loaded: 0, total: 0}}));
    try {
      let downloadUrl = track.streamUrl;
      let isCapacitor = false;
      try {
        const { Capacitor } = await import('@capacitor/core');
        isCapacitor = Capacitor.isNativePlatform();
      } catch(e) {}
      
      if (track.source === 'soundcloud') {
        if (track.streamUrl?.includes('hls=true')) {
            throw new Error("This track uses HLS streaming and cannot be download for offline playback yet.");
        }
        if (isCapacitor) {
          const { resolvePlayableUrl } = await import('../lib/soundcloud');
          downloadUrl = await resolvePlayableUrl(track.streamUrl);
        } else {
          // Web download: force proxy mode to bypass CORS
          downloadUrl = `${track.streamUrl}&proxy=true`;
        }
      } else if (track.source === 'youtube') {
        throw new Error("YouTube downloads are not supported natively yet.");
      }

      const res = await fetch(downloadUrl);
      if (!res.ok) {
        let errorData = await res.text().catch(() => '');
        throw new Error(`Server error: ${res.status} ${errorData}`);
      }

      if (!res.body) {
        const blob = await res.blob();
        if (blob.size < 100) {
           throw new Error("Downloaded file is too small or invalid.");
        }
        const { saveAudioToInternalStorage } = await import('../lib/storage');
        // Clear isVideo flag so it plays as native audio instead of ReactPlayer (which causes lag)
        const trackToSave = { ...track, isVideo: false };
        const savedTrack = await saveAudioToInternalStorage(trackToSave, blob);
        addTracks([savedTrack]);
        setDownloadingId(null);
        return;
      }
      
      const contentLength = res.headers.get('content-length');
      const total = parseInt(contentLength || '0', 10);
      let loaded = 0;
      
      const reader = res.body.getReader();
      const chunks = [];
      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        setDownloadStats(prev => ({...prev, [track.id]: {loaded, total}}));
      }
      
      const blob = new Blob(chunks);
      if (blob.size < 100) {
          throw new Error("Downloaded file is too small or invalid.");
      }
      const { saveAudioToInternalStorage } = await import('../lib/storage');
      // Clear isVideo flag so it plays as native audio instead of ReactPlayer (which causes lag)
      const trackToSave = { ...track, isVideo: false };
      const savedTrack = await saveAudioToInternalStorage(trackToSave, blob);
      
      addTracks([savedTrack]);
    } catch (e: any) {
      console.error("Download failed", e);
      alert('Failed to download track. ' + (e.message || e));
    }
    setDownloadingId(null);
    setDownloadStats(prev => {
        const newStats = {...prev};
        delete newStats[track.id];
        return newStats;
    });
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
    }
  };

  const isDownloaded = (id: string) => tracks.some(t => t.id === id);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto relative">
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-6">Search & Discover</h2>
      
      <div className="flex gap-2 mb-6 flex-wrap">
        <button 
          onClick={() => setSource('audius')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
            source === 'audius' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Music size={14} />
          Audius
        </button>
        <button 
          onClick={() => setSource('soundcloud')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
            source === 'soundcloud' ? 'bg-[#ff5500] text-white border-[#ff5500]' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Cloud size={14} />
          SoundCloud
        </button>
        <button 
          onClick={() => setSource('youtube')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
            source === 'youtube' ? 'bg-[#ff0000] text-white border-[#ff0000]' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Youtube size={14} />
          YouTube
        </button>
      </div>

      <form onSubmit={handleSearch} className="mb-8 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, artists..."
          className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <button type="submit" className="hidden">Search</button>
      </form>

      {isSearching ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <p>{errorMsg}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((track) => (
            <div key={track.id} className="flex items-center justify-between p-3 hover:bg-zinc-800/50 rounded-lg group transition-colors">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0 relative">
                  {track.customImageUrl && <img src={getHighResImage(track.customImageUrl)} alt={track.title} className="w-full h-full object-cover" />}
                  <button 
                    onClick={() => playTrack(track)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    {isBuffering && currentTrack?.id === track.id ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Play size={20} className="fill-white text-white ml-1" />
                    )}
                  </button>
                </div>
                <div className="min-w-0 pr-4">
                  <p className="text-white font-medium truncate">{track.title}</p>
                  <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={() => setPlaylistModalTrack(track)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full transition-colors"
                  title="Add to Playlist"
                >
                  <Plus size={20} />
                </button>
                
                {track.source === 'youtube' ? (
                  <div className="p-2 text-zinc-400 flex items-center gap-2 cursor-default" title="Streaming only – not available for offline">
                    <Play size={20} />
                  </div>
                ) : isDownloaded(track.id) ? (
                  <div className="p-2 text-indigo-400 flex items-center gap-2 cursor-default" title="Downloaded">
                    <Check size={20} />
                  </div>
                ) : (
                  <button 
                    onClick={() => handleDownload(track)}
                    disabled={downloadingId === track.id}
                    className="p-2 text-zinc-400 flex items-center gap-2 hover:text-white hover:bg-zinc-700 rounded-full transition-colors disabled:opacity-50"
                    title="Download & Add to Library"
                  >
                    {downloadingId === track.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                        {downloadStats[track.id] && (
                          <span className="text-[10px] font-mono w-14 text-right">
                            {(downloadStats[track.id].loaded / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        )}
                      </div>
                    ) : (
                      <Download size={20} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Playlist Modal */}
      {playlistModalTrack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Add to Playlist</h3>
              <button onClick={() => setPlaylistModalTrack(null)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              {playlists.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No playlists yet.</p>
              ) : (
                playlists.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      addToPlaylist(p.id, playlistModalTrack.id);
                      setPlaylistModalTrack(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-800 text-white transition-colors flex justify-between items-center"
                  >
                    <span className="truncate">{p.name}</span>
                    {p.trackIds.includes(playlistModalTrack.id) && <Check size={16} className="text-indigo-400 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New playlist name..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
