import React, { useState } from 'react';
import { motion, Reorder, useDragControls } from 'motion/react';
import { usePlayerStore, LocalTrack } from '../store/usePlayerStore';
import { GripVertical, Play, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { getHighResImage } from '../lib/utils';

export function UpNextTab() {
  const { queue, currentTrackIndex, reorderQueue, setCurrentTrackIndex, autoplayMode, setAutoplayMode } = usePlayerStore();
  const [saved, setSaved] = useState(false);

  const handleReorder = (newQueue: LocalTrack[]) => {
    // If the currently playing track moved, we need to update the currentTrackIndex so it doesn't skip
    const currentTrack = queue[currentTrackIndex];
    reorderQueue(newQueue);
    if (currentTrack) {
      const newIndex = newQueue.findIndex(t => t.id === currentTrack.id);
      if (newIndex !== -1 && newIndex !== currentTrackIndex) {
         setCurrentTrackIndex(newIndex);
      }
    }
  };

  const handleSaveOrder = () => {
    // Usually we would sync to a playlist or save the queue state to persistent storage.
    // For now, it's just visual feedback since queue is kept in store.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-50 bg-[#1a0505]/95 backdrop-blur-2xl flex flex-col pt-20 pb-24 px-4 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4 px-2 shrink-0">
        <h2 className="text-xl font-bold text-white tracking-tight">Up Next</h2>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSaveOrder}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            {saved ? <span className="text-green-400">Saved!</span> : <><Save size={16} /> Save</>}
          </button>
          
          <button 
            onClick={() => setAutoplayMode(autoplayMode === 'auto' ? 'manual' : 'auto')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            <span>Autoplay</span>
            {autoplayMode === 'auto' ? <ToggleRight size={24} className="text-green-400" /> : <ToggleLeft size={24} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-2 pb-10">
        <Reorder.Group axis="y" values={queue} onReorder={handleReorder} className="flex flex-col gap-2">
          {queue.map((track, index) => {
            const isPlaying = index === currentTrackIndex;
            return (
              <TrackReorderItem 
                key={track.id} 
                track={track} 
                isPlaying={isPlaying} 
                index={index} 
                setCurrentTrackIndex={setCurrentTrackIndex} 
              />
            );
          })}
        </Reorder.Group>
      </div>
    </motion.div>
  );
}

function TrackReorderItem({ track, isPlaying, index, setCurrentTrackIndex }: { track: LocalTrack, isPlaying: boolean, index: number, setCurrentTrackIndex: (idx: number) => void, key?: any }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item 
      value={track}
      dragListener={false}
      dragControls={dragControls}
      className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${isPlaying ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'}`}
    >
      <div 
        onPointerDown={(e) => dragControls.start(e)}
        className="text-zinc-500 cursor-grab active:cursor-grabbing px-1 touch-none"
      >
        <GripVertical size={16} />
      </div>
      
      <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 relative group cursor-pointer" onClick={() => setCurrentTrackIndex(index)}>
        {track.customImageUrl ? (
          <img src={getHighResImage(track.customImageUrl)} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Play size={16} className="text-zinc-600" />
          </div>
        )}
        {/* Play overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play size={16} fill="currentColor" className="text-white" />
          </div>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-4 h-4 flex items-end justify-between gap-[2px]">
              <motion.div animate={{ height: ['4px', '12px', '4px'] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-white rounded-t-sm" />
              <motion.div animate={{ height: ['8px', '4px', '16px', '8px'] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1 bg-white rounded-t-sm" />
              <motion.div animate={{ height: ['12px', '8px', '12px'] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-white rounded-t-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 flex-1 cursor-pointer" onClick={() => setCurrentTrackIndex(index)}>
        <span className={`text-sm font-bold truncate ${isPlaying ? 'text-white' : 'text-zinc-200'}`}>
          {track.title}
        </span>
        <span className={`text-xs truncate ${isPlaying ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {track.artist}
        </span>
      </div>
    </Reorder.Item>
  );
}
