import { create } from 'zustand';
import { getAllSavedTracks } from '../lib/idb';

export interface LocalTrack {
  id: string; // fileHash or audius id
  file?: File | Blob;
  streamUrl?: string;
  title: string;
  artist: string;
  duration: number;
  customImageUrl?: string;
  isVideo: boolean;
  source?: 'youtube' | 'audius' | 'local' | 'soundcloud';
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  coverUrl?: string;
}

interface PlayerState {
  tracks: LocalTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  queue: LocalTrack[];
  isShuffle: boolean;
  isRepeat: boolean;
  playlists: Playlist[];
  playHistory: LocalTrack[];
  isExpanded: boolean;
  progress: number;
  duration: number;
  isBuffering: boolean;
  videoBounds: { top: number, left: number, width: number, height: number } | null;
  autoplayMode: 'manual' | 'auto';
  mediaMode: 'audio' | 'video';
  
  setTracks: (tracks: LocalTrack[]) => void;
  addTracks: (tracks: LocalTrack[]) => void;
  setCurrentTrackIndex: (index: number) => void;
  playTrack: (track: LocalTrack) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setIsExpanded: (isExpanded: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setIsBuffering: (isBuffering: boolean) => void;
  setVideoBounds: (bounds: { top: number, left: number, width: number, height: number } | null) => void;
  seekTo: number | null;
  setSeekTo: (time: number | null) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  updateTrackImage: (id: string, imageUrl: string) => void;
  updateTrack: (track: LocalTrack) => void;
  updateTrackMetadata: (id: string, newTitle: string, newArtist: string) => void;
  removeTrack: (id: string) => void;
  reorderQueue: (newQueue: LocalTrack[]) => void;
  setAutoplayMode: (mode: 'manual' | 'auto') => void;
  playQueue: (queue: LocalTrack[], startIndex: number) => void;
  handleTrackEnd: () => Promise<void>;
  
  setPlayHistory: (tracks: LocalTrack[]) => void;
  addToHistory: (track: LocalTrack) => void;
  
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  updatePlaylistCover: (playlistId: string, coverUrl: string) => void;
  updatePlaylistName: (playlistId: string, newName: string) => void;
  removePlaylist: (playlistId: string) => void;
  reorderPlaylistTrack: (playlistId: string, fromIndex: number, toIndex: number) => void;
  loadSavedData: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: [],
  currentTrackIndex: -1,
  isPlaying: false,
  volume: 1,
  queue: [],
  isShuffle: false,
  isRepeat: false,
  playlists: [],
  playHistory: [],
  isExpanded: false,
  progress: 0,
  duration: 0,
  isBuffering: false,
  videoBounds: null,
  autoplayMode: 'auto',
  mediaMode: 'audio',

  playQueue: (queue, startIndex) => {
    set({ queue, currentTrackIndex: startIndex, isPlaying: true });
    const track = queue[startIndex];
    if (track) get().addToHistory(track);
  },

  setTracks: (tracks) => set({ tracks, queue: tracks }),
  addTracks: (newTracks) => set((state) => {
    const existingIds = new Set(state.tracks.map(t => t.id));
    const uniqueNew = newTracks.filter(t => !existingIds.has(t.id));
    const combined = [...state.tracks, ...uniqueNew];
    
    // Sync to firebase in background
    if (uniqueNew.length > 0) {
      import('../lib/sync').then(({ syncLibraryToFirebase }) => {
        syncLibraryToFirebase(uniqueNew).catch(console.error);
      });
    }
    
    return { tracks: combined, queue: combined };
  }),
  setCurrentTrackIndex: (index) => {
    set((state) => {
      const useTracks = state.queue.length === 0 || state.tracks.length === state.queue.length;
      const newQueue = useTracks ? [...state.tracks] : state.queue;
      return { 
        queue: newQueue,
        currentTrackIndex: index, 
        isPlaying: true 
      };
    });
    
    // Add to history after setting state
    const track = get().queue[index];
    if (track) {
      get().addToHistory(track);
    }
  },
  playTrack: (track) => {
    set((state) => {
      let newTracks = state.tracks;
      const libraryIndex = state.tracks.findIndex(t => t.id === track.id);
      if (libraryIndex === -1) {
         newTracks = [...state.tracks, track];
         import('../lib/idb').then(({ saveTrackToDB }) => {
           saveTrackToDB(track).catch(console.error);
         });
         import('../lib/sync').then(({ syncLibraryToFirebase }) => {
           syncLibraryToFirebase([track]).catch(console.error);
         });
      }
  
      const existingIndex = state.queue.findIndex(t => t.id === track.id);
      if (existingIndex >= 0) {
        return { tracks: newTracks, currentTrackIndex: existingIndex, isPlaying: true };
      } else {
        const newQueue = [track, ...state.queue];
        return { tracks: newTracks, queue: newQueue, currentTrackIndex: 0, isPlaying: true };
      }
    });

    get().addToHistory(track);
  },
  setPlayHistory: (tracks) => set({ playHistory: tracks }),
  addToHistory: (track) => set((state) => {
    // Keep last 50 tracks
    const filtered = state.playHistory.filter(t => t.id !== track.id);
    const newHistory = [track, ...filtered].slice(0, 50);
    
    localStorage.setItem('skss-history', JSON.stringify(newHistory.map(t => t.id)));

    // Sync to firebase
    import('../lib/sync').then(({ syncHistoryToFirebase }) => {
      syncHistoryToFirebase(newHistory).catch(console.error);
    });
    
    return { playHistory: newHistory };
  }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
  setIsExpanded: (isExpanded) => set({ isExpanded }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setIsBuffering: (isBuffering) => set({ isBuffering }),
  setVideoBounds: (bounds) => set({ videoBounds: bounds }),
  seekTo: null,
  setSeekTo: (time) => set({ seekTo: time }),
  
  nextTrack: () => {
    set((state) => {
      if (state.queue.length === 0) return state;
      let nextIndex = state.currentTrackIndex + 1;
      if (nextIndex >= state.queue.length) {
        nextIndex = state.isRepeat ? 0 : state.currentTrackIndex;
      }
      if (state.isShuffle) {
        nextIndex = Math.floor(Math.random() * state.queue.length);
      }
      return { currentTrackIndex: nextIndex, isPlaying: true };
    });
    
    // Add to history
    const state = get();
    if (state.queue.length > 0 && state.currentTrackIndex >= 0) {
      get().addToHistory(state.queue[state.currentTrackIndex]);
    }
  },
  
  prevTrack: () => {
    set((state) => {
      if (state.queue.length === 0) return state;
      let prevIndex = state.currentTrackIndex - 1;
      if (prevIndex < 0) {
        prevIndex = state.isRepeat ? state.queue.length - 1 : 0;
      }
      return { currentTrackIndex: prevIndex, isPlaying: true };
    });
    
    // Add to history
    const state = get();
    if (state.queue.length > 0 && state.currentTrackIndex >= 0) {
      get().addToHistory(state.queue[state.currentTrackIndex]);
    }
  },

  updateTrackImage: (id, imageUrl) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, customImageUrl: imageUrl } : t),
    queue: state.queue.map(t => t.id === id ? { ...t, customImageUrl: imageUrl } : t)
  })),

  updateTrackMetadata: (id, newTitle, newArtist) => set((state) => {
    import('../lib/idb').then(({ updateTrackInDB }) => {
      updateTrackInDB(id, { title: newTitle, artist: newArtist }).catch(console.error);
    });
    return {
      tracks: state.tracks.map(t => t.id === id ? { ...t, title: newTitle, artist: newArtist } : t),
      queue: state.queue.map(t => t.id === id ? { ...t, title: newTitle, artist: newArtist } : t),
      playHistory: state.playHistory.map(t => t.id === id ? { ...t, title: newTitle, artist: newArtist } : t)
    };
  }),

  updateTrack: (track) => set((state) => ({
    tracks: state.tracks.map(t => t.id === track.id ? track : t),
    queue: state.queue.map(t => t.id === track.id ? track : t)
  })),

  removeTrack: (id: string) => set((state) => {
    import('../lib/idb').then(({ deleteTrackFromDB }) => deleteTrackFromDB(id));
    // also remove from firebase if needed, but for now IDB and local state
    const newTracks = state.tracks.filter(t => t.id !== id);
    const newQueue = state.queue.filter(t => t.id !== id);
    return {
      tracks: newTracks,
      queue: newQueue,
      // Adjust currentTrackIndex if necessary, but keep simple for now
    };
  }),

  reorderQueue: (newQueue) => set({ queue: newQueue }),
  setAutoplayMode: (mode) => set({ autoplayMode: mode }),

  handleTrackEnd: async () => {
    const state = get();
    if (state.isRepeat) {
      // Handled by GlobalPlayer and PlayerBar looping natively for video/audio,
      // but if we reach here we just play current again if needed, or don't do anything because nextTrack is not needed.
      return;
    }
    
    if (state.autoplayMode === 'auto') {
      if (state.currentTrackIndex < state.queue.length - 1) {
        state.nextTrack();
      } else {
        // Fetch related track and play
        const currentTrack = state.queue[state.currentTrackIndex];
        if (!currentTrack) return;
        
        try {
          const query = currentTrack.artist || currentTrack.title;
          let results: LocalTrack[] = [];
          
          if (currentTrack.source === 'youtube') {
            const { searchYouTube } = await import('../lib/youtube');
            results = await searchYouTube(query + ' music');
          } else if (currentTrack.source === 'soundcloud') {
            const { searchSoundCloud } = await import('../lib/soundcloud');
            results = await searchSoundCloud(query);
          } else {
            const { searchAudius } = await import('../lib/audius');
            results = await searchAudius(query);
          }
          
          results = results.filter(t => t.title !== currentTrack.title);
          
          if (results.length > 0) {
            const nextTrack = results[0];
            state.addTracks([nextTrack]); // adds to end of queue automatically
            
            // Re-fetch state since queue changed
            const newState = get();
            const newIndex = newState.queue.findIndex(t => t.id === nextTrack.id);
            if (newIndex !== -1) {
              newState.setCurrentTrackIndex(newIndex);
            }
          } else {
            state.setIsPlaying(false);
          }
        } catch (err) {
          console.error("Failed to fetch related track on end", err);
          state.setIsPlaying(false);
        }
      }
    } else {
      state.setIsPlaying(false);
    }
  },

  createPlaylist: (name) => set((state) => {
    const newPlaylist = { id: Date.now().toString(), name, trackIds: [] };
    const combined = [...state.playlists, newPlaylist];
    localStorage.setItem('skss-playlists', JSON.stringify(combined));
    import('../firebase').then(({ auth }) => {
      if (auth.currentUser) {
        import('../lib/sync').then(({ syncPlaylistsToFirebase }) => syncPlaylistsToFirebase(combined));
      }
    });
    return { playlists: combined };
  }),
  addToPlaylist: (playlistId, trackId) => set((state) => {
    const combined = state.playlists.map(p => 
      p.id === playlistId && !p.trackIds.includes(trackId)
        ? { ...p, trackIds: [...p.trackIds, trackId] }
        : p
    );
    localStorage.setItem('skss-playlists', JSON.stringify(combined));
    import('../firebase').then(({ auth }) => {
      if (auth.currentUser) {
        import('../lib/sync').then(({ syncPlaylistsToFirebase }) => syncPlaylistsToFirebase(combined));
      }
    });
    return { playlists: combined };
  }),

  updatePlaylistCover: (playlistId, coverUrl) => set((state) => {
    const combined = state.playlists.map(p =>
      p.id === playlistId ? { ...p, coverUrl } : p
    );
    localStorage.setItem('skss-playlists', JSON.stringify(combined));
    import('../firebase').then(({ auth }) => {
      if (auth.currentUser) {
        import('../lib/sync').then(({ syncPlaylistsToFirebase }) => syncPlaylistsToFirebase(combined));
      }
    });
    return { playlists: combined };
  }),

  updatePlaylistName: (playlistId, newName) => set((state) => {
    const combined = state.playlists.map(p =>
      p.id === playlistId ? { ...p, name: newName } : p
    );
    localStorage.setItem('skss-playlists', JSON.stringify(combined));
    import('../firebase').then(({ auth }) => {
      if (auth.currentUser) {
        import('../lib/sync').then(({ syncPlaylistsToFirebase }) => syncPlaylistsToFirebase(combined));
      }
    });
    return { playlists: combined };
  }),

  removePlaylist: (playlistId) => set((state) => {
    const combined = state.playlists.filter(p => p.id !== playlistId);
    localStorage.setItem('skss-playlists', JSON.stringify(combined));
    import('../firebase').then(({ auth }) => {
      if (auth.currentUser) {
        import('../lib/sync').then(({ syncPlaylistsToFirebase }) => syncPlaylistsToFirebase(combined));
      }
    });
    return { playlists: combined };
  }),

  reorderPlaylistTrack: (playlistId, fromIndex, toIndex) => set((state) => {
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return state;
    
    const newTrackIds = [...playlist.trackIds];
    if (fromIndex < 0 || fromIndex >= newTrackIds.length || toIndex < 0 || toIndex >= newTrackIds.length) {
      return state;
    }
    const [moved] = newTrackIds.splice(fromIndex, 1);
    newTrackIds.splice(toIndex, 0, moved);
    
    const combined = state.playlists.map(p => 
      p.id === playlistId ? { ...p, trackIds: newTrackIds } : p
    );
    
    localStorage.setItem('skss-playlists', JSON.stringify(combined));
    import('../firebase').then(({ auth }) => {
      if (auth.currentUser) {
        import('../lib/sync').then(({ syncPlaylistsToFirebase }) => syncPlaylistsToFirebase(combined));
      }
    });
    return { playlists: combined };
  }),

  loadSavedData: async () => {
    try {
      const savedTracks = await getAllSavedTracks();
      if (savedTracks && savedTracks.length > 0) {
        const { getTrackImage } = await import('../lib/idb');
        const tracksWithRestoredImages = await Promise.all(savedTracks.map(async (track: LocalTrack) => {
          // Whether the track has a customImageUrl or not, let's see if we have an image blob saved for this ID.
          // This allows covers downloaded later to be applied on startup.
          try {
            const imageBlob = await getTrackImage(track.id);
            if (imageBlob) {
              return { ...track, customImageUrl: URL.createObjectURL(imageBlob) };
            }
          } catch (e) {
            console.error("Failed to load track image", e);
          }
          return track;
        }));
        get().addTracks(tracksWithRestoredImages);
        
        // Restore History
        try {
          const hist = localStorage.getItem('skss-history');
          if (hist) {
            const ids = JSON.parse(hist) as string[];
            const trackMap = new Map(tracksWithRestoredImages.map(t => [t.id, t]));
            const historyTracks = ids.map(id => trackMap.get(id)).filter(Boolean) as LocalTrack[];
            if (historyTracks.length > 0) {
              set({ playHistory: historyTracks });
            }
          }
        } catch (e) {
          console.error("Failed to parse history", e);
        }
        
        // Restore Playlists
        try {
          const storedPlaylists = localStorage.getItem('skss-playlists');
          if (storedPlaylists) {
            const parsedPlaylists = JSON.parse(storedPlaylists) as Playlist[];
            const { getPlaylistImage } = await import('../lib/idb');
            const playlistsWithRestoredImages = await Promise.all(parsedPlaylists.map(async (playlist) => {
              try {
                const imageBlob = await getPlaylistImage(playlist.id);
                if (imageBlob) {
                  return { ...playlist, coverUrl: URL.createObjectURL(imageBlob) };
                }
              } catch (e) {
                console.error("Failed to load playlist image", e);
              }
              return playlist;
            }));
            set({ playlists: playlistsWithRestoredImages });
          }
        } catch (e) {
          console.error("Failed to parse playlists", e);
        }
      }
    } catch (e) {
      console.error("Failed to load saved tracks", e);
    }
  }
}));
