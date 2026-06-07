import React, { useRef, useState } from 'react';
import { usePlayerStore, LocalTrack } from '../store/usePlayerStore';
import { FolderOpen, Play, Image as ImageIcon, MoreVertical, Trash2, Download, ListPlus, Plus, ChevronLeft, ChevronUp, ChevronDown, Loader2, Edit2 } from 'lucide-react';
import { saveTrackImage, getTrackImage, savePlaylistImage } from '../lib/idb';
import { getHighResImage } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTrackItem(props: { track: LocalTrack, auroraClass: string, children: React.ReactNode, key?: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' : undefined,
    zIndex: isDragging ? 50 : 'auto',
    touchAction: 'pan-y',
  } as React.CSSProperties;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      {...listeners}
      className={`bg-zinc-900/50 p-3 md:p-4 rounded-xl hover:bg-zinc-800/80 transition-colors group relative border border-transparent hover:border-zinc-700/50 ${props.auroraClass} ${isDragging ? 'border-indigo-500 bg-zinc-800 shadow-2xl scale-105' : ''}`}
    >
      {props.children}
    </div>
  );
}

export function Library() {
  const { tracks, addTracks, updateTrackImage, setIsPlaying, removeTrack, playlists, createPlaylist, addToPlaylist, updatePlaylistCover, updatePlaylistName, removePlaylist, updateTrack, playQueue, queue, currentTrackIndex, isPlaying, reorderPlaylistTrack } = usePlayerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [addingToPlaylistTrackId, setAddingToPlaylistTrackId] = useState<string | null>(null);
  const [editingMetadataTrack, setEditingMetadataTrack] = useState<LocalTrack | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedArtist, setEditedArtist] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (active.id !== over?.id && over && selectedPlaylistId) {
       const p = playlists.find(pl => pl.id === selectedPlaylistId);
       if (p) {
         const oldIndex = p.trackIds.findIndex(id => id === active.id);
         const newIndex = p.trackIds.findIndex(id => id === over.id);
         if (oldIndex !== -1 && newIndex !== -1) {
           reorderPlaylistTrack(selectedPlaylistId, oldIndex, newIndex);
         }
       }
    }
  };

  const isDownloadedLocally = (track: LocalTrack) => {
    return !!track.file || (track.streamUrl && track.streamUrl.includes('_capacitor_file_'));
  };

  const handleDownload = async (track: LocalTrack) => {
    if (isDownloadedLocally(track)) return;
    setIsDownloading(track.id);
    try {
      let url = track.streamUrl;
      if (track.source === 'soundcloud' && url) {
        const { resolvePlayableUrl } = await import('../lib/soundcloud');
        url = await resolvePlayableUrl(url);
      }
      if (!url) throw new Error("No stream URL");

      const res = await fetch(url);
      const blob = await res.blob();
      const { saveAudioToInternalStorage } = await import('../lib/storage');
      const updatedTrack = await saveAudioToInternalStorage(track, blob);
      updateTrack(updatedTrack);
    } catch(e) {
      console.error("Download failed", e);
      alert("Download failed.");
    } finally {
      setIsDownloading(null);
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsScanning(true);
    const newTracks: LocalTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      
      if (isAudio || isVideo) {
        const title = file.name.replace(/\.[^/.]+$/, "");
        const id = `${file.name}-${file.size}`;
        
        let customImageUrl;
        try {
          const blob = await getTrackImage(id);
          if (blob) {
            customImageUrl = URL.createObjectURL(blob);
          }
        } catch (err) {
          console.error("Error reading from IDB", err);
        }

        const trackObj: LocalTrack = {
          id,
          file,
          title,
          artist: "Unknown Artist",
          duration: 0,
          customImageUrl,
          isVideo,
          source: 'local'
        };
        newTracks.push(trackObj);
        
        import('../lib/storage').then(({ saveAudioToInternalStorage }) => {
          saveAudioToInternalStorage(trackObj, file).catch(console.error);
        });
      }
    }

    addTracks(newTracks);
    setIsScanning(false);
  };

  const handleImageUpload = async (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    updateTrackImage(trackId, imageUrl);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const MAX_SIZE = 512;
      let width = img.width;
      let height = img.height;
      if (width > height && width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const compressedBlob = await (await fetch(dataUrl)).blob();

      const { saveTrackImage, saveTrackToDB } = await import('../lib/idb');
      await saveTrackImage(trackId, compressedBlob);
      
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        await saveTrackToDB({ ...track, customImageUrl: imageUrl });
        import('../firebase').then(async ({ auth }) => {
          if (auth.currentUser) {
             const { syncLibraryToFirebase } = await import('../lib/sync');
             let finalImageUrl = dataUrl;
             await syncLibraryToFirebase([{ ...track, customImageUrl: finalImageUrl }]);
          }
        });
      }
    };
    img.src = imageUrl;
  };

  const handlePlaylistCoverUpload = async (playlistId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    updatePlaylistCover(playlistId, imageUrl);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const MAX_SIZE = 512;
      let width = img.width;
      let height = img.height;
      if (width > height && width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const compressedBlob = await (await fetch(dataUrl)).blob();

      await savePlaylistImage(playlistId, compressedBlob);
      
      import('../firebase').then(async ({ auth }) => {
        if (auth.currentUser) {
           const { updatePlaylistCover } = usePlayerStore.getState();
           const { playlists } = usePlayerStore.getState();
           const playlist = playlists.find(p => p.id === playlistId);
           if (playlist) {
             const { syncPlaylistsToFirebase } = await import('../lib/sync');
             let finalImageUrl = dataUrl;
             const updatedPlaylists = playlists.map(p => p.id === playlistId ? { ...p, coverUrl: finalImageUrl } : p);
             await syncPlaylistsToFirebase(updatedPlaylists);
           }
        }
      });
    };
    img.src = imageUrl;
  };

  const handleCreatePlaylist = () => {
    const name = prompt("Enter playlist name:");
    if (name && name.trim().length > 0) {
      createPlaylist(name.trim());
    }
  };

  const renderTrackGrid = (trackList: LocalTrack[], contextPlaylistId?: string) => {
    if (trackList.length === 0 && !isScanning) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl px-4 text-center">
          <FolderOpen size={48} className="mb-4 opacity-50" />
          <p>No tracks found.</p>
        </div>
      );
    }

    const gridContent = trackList.map((track, index) => {
      const downloaded = isDownloadedLocally(track);
      const isCurrent = queue[currentTrackIndex]?.id === track.id;
      const auroraClass = isCurrent ? `aurora-playing ${!isPlaying ? 'paused' : ''}` : '';

      const cardContent = (
        <>
          <div className="aspect-square bg-zinc-800 rounded-lg mb-3 md:mb-4 overflow-hidden relative shadow-lg">
              {track.customImageUrl ? (
                <img src={getHighResImage(track.customImageUrl)} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-gradient-to-br from-zinc-800 to-zinc-900">
                  <ImageIcon size={32} className="md:w-12 md:h-12" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={() => {
                    playQueue(trackList, index);
                  }}
                  className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform shadow-xl"
                >
                  <Play size={20} className="md:w-6 md:h-6 ml-1 fill-white" />
                </button>
              </div>
            </div>
            
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-medium text-sm md:text-base truncate" title={track.title}>{track.title}</h3>
                <p className="text-zinc-400 text-xs md:text-sm truncate">{track.artist}</p>
              </div>
              
              <div className="relative flex-shrink-0">
                {isDownloading === track.id ? (
                  <Loader2 size={16} className="text-indigo-400 animate-spin mt-1" />
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === track.id ? null : track.id); }}
                    className="p-1 -mr-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
                {openMenuId === track.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 rounded-md shadow-2xl z-20 overflow-hidden text-sm border border-zinc-700">
                    {!downloaded && track.source !== 'youtube' && (
                      <button 
                        onClick={() => { handleDownload(track); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                    )}
                    {!downloaded && track.source === 'youtube' && (
                      <div className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 cursor-default" title="Streaming only – not available for offline">
                        <Play size={14} />
                        <span>Stream Only</span>
                      </div>
                    )}
                    <button 
                      onClick={() => { setAddingToPlaylistTrackId(track.id); setOpenMenuId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors"
                    >
                      <ListPlus size={14} />
                      <span>Add to Playlist</span>
                    </button>
                    {contextPlaylistId && index > 0 && (
                      <button 
                        onClick={() => { reorderPlaylistTrack(contextPlaylistId, index, index - 1); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors"
                      >
                        <ChevronUp size={14} />
                        <span>Move Up</span>
                      </button>
                    )}
                    {contextPlaylistId && index < trackList.length - 1 && (
                      <button 
                        onClick={() => { reorderPlaylistTrack(contextPlaylistId, index, index + 1); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors"
                      >
                        <ChevronDown size={14} />
                        <span>Move Down</span>
                      </button>
                    )}
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors">
                      <ImageIcon size={14} />
                      <span>Change Cover</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => { handleImageUpload(track.id, e); setOpenMenuId(null); }}
                      />
                    </label>
                    <button 
                      onClick={() => { 
                        setEditingMetadataTrack(track); 
                        setEditedTitle(track.title || ""); 
                        setEditedArtist(track.artist || ""); 
                        setOpenMenuId(null); 
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors"
                    >
                      <Edit2 size={14} />
                      <span>Change M&A</span>
                    </button>
                    <button 
                      onClick={() => { removeTrack(track.id); setOpenMenuId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-900/40 cursor-pointer text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Remove Track</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
        </>
      );

      if (contextPlaylistId) {
        return (
          <SortableTrackItem key={track.id} track={track} auroraClass={auroraClass}>
            {cardContent}
          </SortableTrackItem>
        );
      }

      return (
        <div key={track.id} className={`bg-zinc-900/50 p-3 md:p-4 rounded-xl hover:bg-zinc-800/80 transition-colors group relative border border-transparent hover:border-zinc-700/50 ${auroraClass}`}>
          {cardContent}
        </div>
      );
    });

    if (contextPlaylistId) {
      return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={trackList.map(t => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
              {gridContent}
            </div>
          </SortableContext>
        </DndContext>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
        {gridContent}
      </div>
    );
  };

  const renderPlaylists = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
        <div 
          onClick={handleCreatePlaylist}
          className="bg-zinc-900/50 p-3 md:p-4 rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer group flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-indigo-500"
        >
          <Plus size={32} className="text-zinc-500 group-hover:text-indigo-400 mb-2" />
          <span className="text-zinc-400 group-hover:text-white font-medium">Create Playlist</span>
        </div>

        {playlists.map((playlist) => (
          <div key={playlist.id} className="bg-zinc-900/50 p-3 md:p-4 rounded-xl hover:bg-zinc-800/80 transition-colors group relative border border-transparent hover:border-zinc-700/50">
            <div 
              className="aspect-square bg-zinc-800 rounded-lg mb-3 md:mb-4 overflow-hidden relative shadow-lg cursor-pointer"
              onClick={() => setSelectedPlaylistId(playlist.id)}
            >
              {playlist.coverUrl ? (
                <img src={getHighResImage(playlist.coverUrl)} alt={playlist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-gradient-to-br from-zinc-800 to-zinc-900">
                  <ListPlus size={32} className="md:w-12 md:h-12" />
                </div>
              )}
            </div>
            
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedPlaylistId(playlist.id)}>
                <h3 className="text-white font-medium text-sm md:text-base truncate" title={playlist.name}>{playlist.name}</h3>
                <p className="text-zinc-400 text-xs md:text-sm truncate">{playlist.trackIds.length} tracks</p>
              </div>
              
              <div className="relative flex-shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `pl-${playlist.id}` ? null : `pl-${playlist.id}`); }}
                  className="p-1 -mr-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                {openMenuId === `pl-${playlist.id}` && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 rounded-md shadow-2xl z-20 overflow-hidden text-sm border border-zinc-700">
                    <button 
                      onClick={() => { handleRenamePlaylist(playlist.id, playlist.name); setOpenMenuId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors"
                    >
                      <ListPlus size={14} />
                      <span>Rename</span>
                    </button>
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors">
                      <ImageIcon size={14} />
                      <span>Change Cover</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => { handlePlaylistCoverUpload(playlist.id, e); setOpenMenuId(null); }}
                      />
                    </label>
                    <div className="h-px bg-zinc-700/50 my-1 w-full" />
                    <button 
                      onClick={() => { handleRemovePlaylist(playlist.id); setOpenMenuId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-900/40 cursor-pointer text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Remove Playlist</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleRenamePlaylist = (playlistId: string, currentName: string) => {
    const newName = prompt("Enter new playlist name:", currentName);
    if (newName && newName.trim().length > 0 && newName !== currentName) {
      updatePlaylistName(playlistId, newName.trim());
    }
  };

  const handleRemovePlaylist = (playlistId: string) => {
    if (confirm("Are you sure you want to delete this playlist?")) {
      removePlaylist(playlistId);
      setSelectedPlaylistId(null);
    }
  };

  const renderPlaylistDetail = () => {
    const playlist = playlists.find(p => p.id === selectedPlaylistId);
    if (!playlist) {
      setSelectedPlaylistId(null);
      return null;
    }

    const playlistTracks = playlist.trackIds
      .map(id => tracks.find(t => t.id === id))
      .filter(Boolean) as LocalTrack[];

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 mb-6 relative">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setSelectedPlaylistId(null)}
              className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-4">
              {playlist.coverUrl ? (
                <img src={playlist.coverUrl} className="w-16 h-16 rounded-md object-cover shadow-lg" />
              ) : (
                <div className="w-16 h-16 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-500 shadow-lg">
                  <ListPlus size={24} />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{playlist.name}</h2>
                <p className="text-zinc-400">{playlistTracks.length} tracks</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `pldetail-${playlist.id}` ? null : `pldetail-${playlist.id}`); }}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            {openMenuId === `pldetail-${playlist.id}` && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden text-sm border border-zinc-700">
                <label className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors">
                  <ImageIcon size={16} />
                  <span>Change Cover</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => { handlePlaylistCoverUpload(playlist.id, e); setOpenMenuId(null); }}
                  />
                </label>
                <button 
                  onClick={() => { handleRenamePlaylist(playlist.id, playlist.name); setOpenMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 cursor-pointer text-zinc-200 transition-colors"
                >
                  <ListPlus size={16} />
                  <span>Rename</span>
                </button>
                <div className="h-px bg-zinc-700/50 my-1 w-full" />
                <button 
                  onClick={() => { handleRemovePlaylist(playlist.id); setOpenMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-900/40 cursor-pointer text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Remove Playlist</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {renderTrackGrid(playlistTracks, playlist.id)}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto relative">
      {!selectedPlaylistId && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Your Library</h2>
            {activeTab === 'tracks' && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-zinc-200 transition-colors"
              >
                <FolderOpen size={18} />
                <span>Scan Local Folder</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFolderSelect} 
              className="hidden" 
              // @ts-ignore
              webkitdirectory="true" 
              directory="true" 
              multiple
            />
          </div>

          <div className="flex gap-6 mb-6 border-b border-zinc-800">
            <button 
              onClick={() => setActiveTab('tracks')} 
              className={`pb-3 font-medium transition-colors relative ${activeTab === 'tracks' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Tracks
              {activeTab === 'tracks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-md" />}
            </button>
            <button 
              onClick={() => setActiveTab('playlists')} 
              className={`pb-3 font-medium transition-colors relative ${activeTab === 'playlists' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Playlists
              {activeTab === 'playlists' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-md" />}
            </button>
          </div>

          {isScanning && (
            <div className="text-zinc-400 mb-4 animate-pulse">Scanning files...</div>
          )}

          {activeTab === 'tracks' ? renderTrackGrid(tracks) : renderPlaylists()}
        </>
      )}

      {selectedPlaylistId && renderPlaylistDetail()}

      {/* Add to Playlist Modal */}
      {addingToPlaylistTrackId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Add to Playlist</h3>
            {playlists.length === 0 ? (
              <p className="text-zinc-400 mb-6">You don't have any playlists yet.</p>
            ) : (
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
                {playlists.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      addToPlaylist(p.id, addingToPlaylistTrackId);
                      setAddingToPlaylistTrackId(null);
                    }}
                    className="w-full text-left px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-white transition-colors flex items-center gap-3"
                  >
                    {p.coverUrl ? (
                       <img src={p.coverUrl} className="w-8 h-8 rounded object-cover" />
                    ) : (
                       <ListPlus size={20} className="text-zinc-400" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={() => setAddingToPlaylistTrackId(null)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Change M&A Modal */}
      {editingMetadataTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Change M&A</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Title</label>
                <input 
                  type="text" 
                  value={editedTitle} 
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Artist</label>
                <input 
                  type="text" 
                  value={editedArtist} 
                  onChange={(e) => setEditedArtist(e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setEditingMetadataTrack(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (editingMetadataTrack) {
                    const { updateTrackMetadata } = usePlayerStore.getState();
                    updateTrackMetadata(editingMetadataTrack.id, editedTitle, editedArtist);
                  }
                  setEditingMetadataTrack(null);
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
