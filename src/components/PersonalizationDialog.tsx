import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Check, ArrowLeft, Sparkles, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/useSettingsStore';

const PLAYER_STYLES = [
  { id: 'default', label: 'Default', hot: false, new: false },
  { id: 'static', label: 'Static', hot: false, new: false },
  { id: 'dynamic', label: 'Dynamic', hot: true, new: false },
  { id: 'spin-vinyl', label: 'Spin Vinyl', hot: false, new: false },
  { id: 'round', label: 'Round', hot: false, new: false },
  { id: 'shuriken', label: 'Shuriken', hot: false, new: true },
  { id: 'cloud', label: 'Cloud', hot: false, new: true }
];

const COOL_MODES = [
  { id: 'colorful-flows', label: 'Colorful Flows', hot: true, new: false },
  { id: 'color-surrounding', label: 'Color Surrounding', hot: false, new: false },
  { id: 'green-column', label: 'Green Column', hot: false, new: false },
  { id: 'line-bubble', label: 'Line Bubble', hot: false, new: false },
  { id: 'shuriken-flow', label: 'Shuriken Flow', hot: false, new: true },
  { id: 'cosmic-stardust', label: 'Cosmic Stardust', hot: false, new: true }
];

const PlayerStylePreview = ({ id }: { id: string }) => {
  return (
    <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden relative border border-white/5">
      {id === 'default' && <div className="w-10 h-10 bg-zinc-600 rounded-md" />}
      {id === 'static' && (
        <div className="w-10 h-10 bg-zinc-600 rounded-md relative overflow-hidden flex items-center justify-center">
          <motion.div 
            className="absolute inset-0 bg-blue-400/30"
            animate={{ opacity: [0, 1, 0, 0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.1, 0.2, 0.3, 0.4, 1] }}
          />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute w-full h-full drop-shadow-[0_0_5px_rgba(167,139,250,0.8)]">
             <path d="M 50 0 L 35 30 L 60 50 L 40 70 L 55 100" stroke="#a78bfa" strokeWidth="2" fill="none" />
          </svg>
        </div>
      )}
      {id === 'dynamic' && (
        <div className="w-10 h-10 bg-zinc-600 rounded-md relative shadow-[0_0_15px_rgba(99,102,241,0.8)]">
           <motion.div 
             className="absolute inset-0 rounded-md ring-2 ring-indigo-400"
             animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
             transition={{ duration: 2, repeat: Infinity }}
           />
        </div>
      )}
      {id === 'spin-vinyl' && (
        <div className="relative flex items-center justify-center w-full h-full">
          <motion.div 
            className="w-10 h-10 bg-zinc-900 border-2 border-zinc-700 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div 
            className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full blur-[2px]"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>
      )}
      {id === 'round' && (
        <motion.div 
          className="w-10 h-10 bg-zinc-600 rounded-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
      {id === 'shuriken' && (
        <div className="relative w-10 h-10 bg-zinc-600 rounded-md flex items-center justify-center">
           <motion.div
             className="absolute w-6 h-6 bg-zinc-400 clip-shuriken"
             animate={{ rotate: 360, scale: [0.5, 1.2, 0.5], opacity: [0, 1, 0] }}
             transition={{ duration: 1.5, repeat: Infinity }}
           />
        </div>
      )}
      {id === 'cloud' && (
        <div className="relative w-10 h-10 bg-zinc-600 rounded-md flex items-center justify-center overflow-hidden">
           <motion.div
             className="absolute bottom-[-5px] w-6 h-6 bg-white/80 rounded-full blur-[2px]"
             animate={{ y: [0, -20], opacity: [0, 1, 0], scale: [0.5, 1.5, 1.5] }}
             transition={{ duration: 2, repeat: Infinity }}
           />
           <motion.div
             className="absolute bottom-[-10px] right-[-5px] w-8 h-8 bg-zinc-300/80 rounded-full blur-[2px]"
             animate={{ y: [0, -20], opacity: [0, 1, 0], scale: [0.5, 1.5, 1.5] }}
             transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
           />
        </div>
      )}
    </div>
  );
};

const CoolModePreview = ({ id }: { id: string }) => {
  return (
    <div className="w-16 h-16 rounded-lg bg-black flex items-center justify-center overflow-hidden relative border border-white/10">
      {id === 'colorful-flows' && (
        <motion.div 
          className="absolute inset-0 rounded-lg"
          animate={{ boxShadow: ['inset 0 0 10px rgba(255,0,255,0.5)', 'inset 0 0 20px rgba(0,255,255,0.5)', 'inset 0 0 10px rgba(255,0,255,0.5)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {id === 'color-surrounding' && (
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          <motion.div 
            className="absolute inset-[-50%] rounded-full opacity-60 blur-md"
            style={{
              background: 'conic-gradient(from 0deg, rgba(99,102,241,0.8), rgba(217,70,239,0.8), rgba(20,184,166,0.8), rgba(99,102,241,0.8))'
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          {/* Inner dark center to make it an edge glow */}
          <div className="absolute inset-1 bg-black rounded-md" />
        </div>
      )}
      {id === 'green-column' && (
        <div className="absolute inset-0 flex items-end justify-center gap-[2px] px-2 pb-2 overflow-hidden">
          {/* Subtle edge lights */}
          <motion.div className="absolute bottom-[-10px] left-[-10px] w-10 h-10 bg-cyan-500/30 blur-lg" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
          <motion.div className="absolute bottom-[-10px] right-[-10px] w-10 h-10 bg-fuchsia-500/30 blur-lg" animate={{ opacity: [0.6, 0.3, 0.6] }} transition={{ duration: 2.5, repeat: Infinity }} />
          
          {[1,2,3,4,5,6].map(i => (
             <motion.div 
               key={i} 
               className="w-1.5 rounded-t-full bg-gradient-to-t from-indigo-500 to-fuchsia-400 z-10" 
               animate={{ height: ['20%', `${Math.random() * 60 + 30}%`, '20%'] }} 
               transition={{ duration: Math.random() * 0.4 + 0.4, repeat: Infinity, ease: "easeInOut" }} 
             />
          ))}
        </div>
      )}
      {id === 'line-bubble' && (
        <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
          <div className="absolute inset-0" style={{ filter: 'url(#gooPreview)' }}>
            <motion.div className="absolute top-1 left-2 w-4 h-4 rounded-full bg-pink-500 blur-[2px]" animate={{ x: [0, 20, 0] }} transition={{ duration: 2, repeat: Infinity }} />
            <motion.div className="absolute top-1 left-8 w-5 h-5 rounded-full bg-cyan-500 blur-[2px]" animate={{ x: [0, -20, 0] }} transition={{ duration: 2, repeat: Infinity }} />
            <motion.div className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-purple-500 blur-[2px]" animate={{ x: [0, -15, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </div>
          <svg className="absolute w-0 h-0">
            <filter id="gooPreview">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            </filter>
          </svg>
        </div>
      )}
      {id === 'shuriken-flow' && (
        <motion.div 
          className="w-4 h-4 bg-white clip-shuriken"
          animate={{ rotate: 360, y: [10, -10] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {id === 'cosmic-stardust' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 bottom-0 left-0 w-4 border-r border-white/5 flex flex-col items-center justify-center gap-1">
             <motion.div className="w-1 h-1 bg-cyan-200 rounded-full" animate={{ y: [-10, -30], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
             <motion.div className="w-0.5 h-0.5 bg-white rounded-full" animate={{ y: [-10, -30], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
          </div>
          <div className="absolute top-0 bottom-0 right-0 w-4 border-l border-white/5 flex flex-col items-center justify-center gap-1">
             <motion.div className="w-1 h-1 bg-cyan-100 rounded-full" animate={{ y: [10, -20], opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
          </div>
        </div>
      )}
    </div>
  );
};

export function PersonalizationDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState('player');
  const store = useSettingsStore();

  const tabs = [
    { id: 'player', label: 'Player Style' },
    { id: 'cool', label: 'Cool Mode' }
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-0 left-0 w-full h-full md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:h-[80vh] md:max-h-[800px] bg-zinc-950 md:rounded-3xl z-[60] flex flex-col overflow-hidden shadow-2xl focus:outline-none">
          
          <header className="flex items-center gap-4 p-4 border-b border-white/10 shrink-0">
            <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-white">Personalization</h2>
          </header>

          <div className="flex gap-4 px-4 pt-4 shrink-0 overflow-x-auto hide-scrollbar">
            {tabs.map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`pb-2 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${
                  activeTab === t.id ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'player' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {PLAYER_STYLES.map(style => (
                  <div 
                    key={style.id}
                    onClick={() => store.setPlayerStyle(style.id)}
                    className={`relative aspect-[3/4] rounded-2xl border-2 cursor-pointer transition-all ${
                      store.playerStyle === style.id ? 'border-indigo-500' : 'border-white/5 hover:border-white/20'
                    } bg-zinc-900 flex flex-col items-center justify-center gap-2 overflow-hidden`}
                  >
                    {style.hot && <span className="absolute top-2 left-2 bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded text-white z-10">HOT</span>}
                    {style.new && <span className="absolute top-2 left-2 bg-blue-500 text-[10px] font-bold px-2 py-0.5 rounded text-white z-10">NEW</span>}
                    
                    <PlayerStylePreview id={style.id} />
                    
                    <span className="text-sm font-medium text-white mt-2">{style.label}</span>
                    {store.playerStyle === style.id && (
                      <div className="absolute bottom-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center z-10">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'cool' && (
              <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Draw over other apps</h3>
                    <p className="text-[10px] text-zinc-400">Requires permission to show cool mode in any scene.</p>
                  </div>
                  <button 
                    onClick={() => store.setDrawOverOtherApps(!store.drawOverOtherApps)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer touch-manipulation flex-shrink-0 ${store.drawOverOtherApps ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${store.drawOverOtherApps ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Enable Cool Mode Visualizers</h3>
                    <p className="text-[10px] text-zinc-400">Show animations during playback</p>
                  </div>
                  <button 
                    onClick={() => store.setCoolModeEnabled(!store.coolModeEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer touch-manipulation flex-shrink-0 ${store.coolModeEnabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${store.coolModeEnabled ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {COOL_MODES.map(mode => (
                    <div 
                      key={mode.id}
                      onClick={() => store.setCoolModeStyle(mode.id)}
                      className={`relative aspect-[1/2] rounded-2xl border-2 cursor-pointer transition-all ${
                        store.coolModeStyle === mode.id ? 'border-indigo-500' : 'border-white/5 hover:border-white/20'
                      } bg-zinc-900 flex flex-col items-center justify-center gap-2`}
                    >
                      {mode.hot && <span className="absolute top-2 left-2 bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded text-white z-10">HOT</span>}
                      {mode.new && <span className="absolute top-2 left-2 bg-blue-500 text-[10px] font-bold px-2 py-0.5 rounded text-white z-10">NEW</span>}
                      
                      <CoolModePreview id={mode.id} />
                      
                      <span className="text-sm font-medium text-center text-white mt-2">{mode.label}</span>
                      {store.coolModeStyle === mode.id && (
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center z-10">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
