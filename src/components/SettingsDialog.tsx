import React, { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Settings as SettingsIcon, Image as ImageIcon, X, Upload, Check, Sliders, Palette, User, LogOut, Video, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PersonalizationDialog } from './PersonalizationDialog';
import { useSettingsStore } from '../store/useSettingsStore';
import { auth, storage } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function SettingsDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const { background, setBackground, liveBackground, setLiveBackground, backgroundOpacity, setBackgroundOpacity, blurBackground, setBlurBackground, previousWallpapers, addPreviousWallpaper, removePreviousWallpaper, setPreviousWallpapers, geminiApiKey, setGeminiApiKey } = useSettingsStore();
  const [customBlobs, setCustomBlobs] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);



  useEffect(() => {
    const loadCustomBlobs = async () => {
      const { getWallpaperFromDB } = await import('../lib/idb');
      const newBlobs: Record<string, string> = {};
      let changed = false;
      for (const p of previousWallpapers) {
        if (p.startsWith('custom_') && !customBlobs[p]) {
          const blob = await getWallpaperFromDB(p);
          if (blob) {
            newBlobs[p] = URL.createObjectURL(blob);
            changed = true;
          }
        }
      }
      if (changed) {
        setCustomBlobs(prev => ({ ...prev, ...newBlobs }));
      }
    };
    loadCustomBlobs();
  }, [previousWallpapers]);

  const handleLogout = async () => {
    await signOut(auth);
    onOpenChange(false);
  };



  const handleRestoreWallpapers = async () => {
    if (!auth.currentUser) return;
    setIsRestoring(true);
    setRestoreProgress(0);
    
    // Fake progress to assure the user
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      if (p >= 90) clearInterval(interval);
      setRestoreProgress(p);
    }, 150);

    try {
      const { loadSettingsFromFirebase } = await import('../lib/sync');
      const settings = await loadSettingsFromFirebase();
      clearInterval(interval);
      setRestoreProgress(100);
      
      setTimeout(() => {
        setIsRestoring(false);
        if (settings) {
          if (settings.previousWallpapers) setPreviousWallpapers(settings.previousWallpapers);
          if (settings.background) setBackground(settings.background);
          if (settings.liveBackground) setLiveBackground(settings.liveBackground);
          if (settings.backgroundOpacity !== undefined) setBackgroundOpacity(settings.backgroundOpacity);
          if (settings.blurBackground !== undefined) setBlurBackground(settings.blurBackground);
        }
      }, 500);
    } catch {
      clearInterval(interval);
      setIsRestoring(false);
    }
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLiveBackground('');
      const localUrl = URL.createObjectURL(file);
      setBackground(localUrl);

      // Always use IDB for wallpaper to avoid Firebase Storage errors
      const customId = `custom_image_${Date.now()}`;
      setCustomBlobs(prev => ({ ...prev, [customId]: localUrl }));
      
      import('../lib/idb').then(({ saveWallpaperToDB }) => {
          saveWallpaperToDB('static_wallpaper', file).catch(e => console.error(e));
          saveWallpaperToDB(customId, file).catch(e => console.error(e));
          addPreviousWallpaper(customId);
      });


      
      setIsUploading(true);
      setUploadProgress(0);
      setTimeout(() => {
          setUploadProgress(100);
          setIsUploading(false);
      }, 500);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setLiveBackground(localUrl);

      // Always use IDB for live wallpaper to avoid Firebase Storage payload limits and missing config errors
      const customId = `custom_video_${Date.now()}`;
      setCustomBlobs(prev => ({ ...prev, [customId]: localUrl }));

      import('../lib/idb').then(({ saveWallpaperToDB }) => {
          saveWallpaperToDB('live_wallpaper', file).catch(e => console.error(e));
          saveWallpaperToDB(customId, file).catch(e => console.error(e));
          addPreviousWallpaper(customId);
      });


      
      setIsUploading(true);
      setUploadProgress(0);
      setTimeout(() => {
          setUploadProgress(100);
          setIsUploading(false);
      }, 500);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 p-0 focus:outline-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl mx-4"
          >
            <div className="relative p-6 md:p-8">
              <Dialog.Close className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-zinc-400 transition-colors">
                <X size={20} />
              </Dialog.Close>

              <div className="mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4">
                  <SettingsIcon className="text-black" size={24} />
                </div>
                <Dialog.Title className="text-2xl font-bold text-white mb-1">
                  Settings
                </Dialog.Title>
                <Dialog.Description className="text-zinc-400 text-sm">
                  Personalize your experience and system preferences
                </Dialog.Description>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* User Profile Section */}
                {currentUser && (
                  <section className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Avatar" className="w-12 h-12 rounded-xl object-cover border border-white/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl">
                          {currentUser.displayName?.[0] || currentUser.email?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-bold">{currentUser.displayName || 'User'}</p>
                        <p className="text-xs text-zinc-500 font-mono tracking-tight">{currentUser.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors group"
                      title="Sign Out"
                    >
                      <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </section>
                )}

                {/* Background Section */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs">
                      <Palette size={16} className="text-indigo-500" />
                      Custom Background
                    </div>
                    {currentUser && (
                      <button 
                        onClick={handleRestoreWallpapers}
                        disabled={isRestoring}
                        className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold transition-colors disabled:opacity-50"
                      >
                        {isRestoring ? `Restoring ${restoreProgress}%` : 'Restore Cloud'}
                      </button>
                    )}
                  </div>
                  
                  {/* Live Wallpaper options */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Video size={20} />
                      </div>
                      <div>
                         <p className="text-sm font-bold text-white">Live Wallpaper</p>
                         <p className="text-[10px] text-zinc-500">Play HD video (muted) while music plays</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 min-w-[100px] justify-center"
                    >
                      {isUploading ? (
                        <>{uploadProgress}%</>
                      ) : liveBackground ? (
                        <><Check size={14} /> Active</>
                      ) : (
                        <><Upload size={14} /> Upload</>
                      )}
                    </button>
                    <input 
                      type="file" 
                      ref={videoInputRef} 
                      onChange={handleVideoUpload} 
                      className="hidden" 
                      accept="video/mp4,video/webm"
                    />
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-4 space-y-4">
                     <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase">
                      <span>Background Opacity</span>
                      <span className="text-white">{(backgroundOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={backgroundOpacity}
                      onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Blur Background</p>
                        <p className="text-[10px] text-zinc-500">Apply a frosted glass effect</p>
                      </div>
                      <button 
                        onClick={() => setBlurBackground(!blurBackground)}
                        className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer touch-manipulation flex-shrink-0 ${blurBackground ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${blurBackground ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Default Background Option */}
                    <button
                      onClick={() => { setLiveBackground(''); setBackground(''); }}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                        (!background && !liveBackground) ? 'border-white scale-[1.02]' : 'border-transparent hover:border-white/20'
                      }`}
                    >
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                        Default
                      </div>
                      {(!background && !liveBackground) && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check size={20} className="text-white" />
                        </div>
                      )}
                    </button>

                    {previousWallpapers.map((p, i) => {
                      const isCustom = p.startsWith('custom_') || p.startsWith('gdrive_');
                      const isVideo = p.includes('.mp4') || p.includes('live_wallpaper') || p.startsWith('custom_video_') || p.startsWith('gdrive_video://');
                      // Active state logic is tricky for custom blobs because background might be a different blob url.
                      // However, if the store's blob URL doesn't match `p`, it won't highlight. We'll rely on recent upload or manual selection.
                      const isActive = isVideo ? liveBackground === p : (!liveBackground && background === p);
                      const displayUrl = isCustom ? customBlobs[p] : p;

                      return (
                        <button
                          key={`prev-${i}`}
                          onClick={() => { 
                            if (isVideo) {
                                setLiveBackground(displayUrl || p);
                                if (isCustom) {
                                  import('../lib/idb').then(({ getWallpaperFromDB, saveWallpaperToDB }) => {
                                      getWallpaperFromDB(p).then(b => { if (b) saveWallpaperToDB('live_wallpaper', b); });
                                  });
                                }
                            } else {
                                setLiveBackground(''); setBackground(displayUrl || p); 
                                if (isCustom) {
                                  import('../lib/idb').then(({ getWallpaperFromDB, saveWallpaperToDB }) => {
                                      getWallpaperFromDB(p).then(b => { if (b) saveWallpaperToDB('static_wallpaper', b); });
                                  });
                                }
                            }
                          }}
                          className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group ${
                            isActive ? 'border-white scale-[1.02]' : 'border-transparent hover:border-white/20'
                          }`}
                        >
                          {isVideo ? (
                            displayUrl ? <video src={displayUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline /> : <div className="w-full h-full bg-zinc-800 animate-pulse" />
                          ) : (
                            displayUrl ? <img src={displayUrl} className="w-full h-full object-cover" alt={`Previous ${i}`} /> : <div className="w-full h-full bg-zinc-800 animate-pulse" />
                          )}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isActive ? <Check size={20} className="text-white" /> : <span className="text-[10px] font-bold text-white uppercase tracking-wider">Set</span>}
                          </div>
                          
                          {/* Delete Button */}
                          <div className="absolute top-1 right-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removePreviousWallpaper(p);
                                if (isCustom) {
                                  import('../lib/idb').then(({ deleteWallpaperFromDB }) => {
                                    deleteWallpaperFromDB(p).catch(console.error);
                                  });
                                }
                              }}
                              className="bg-red-500 p-1.5 rounded-full text-white hover:bg-red-600 transition-colors shadow-md"
                              title="Delete preset"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </button>
                      );
                    })}

                    {/* N/A Placeholder if no presets are set */}
                    {previousWallpapers.length === 0 && (
                      <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5">
                        <span className="text-lg font-bold text-zinc-600">N/A</span>
                        <span className="text-[9px] font-bold text-zinc-600 uppercase mt-1 text-center px-1 leading-tight">No presets set</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center gap-2 transition-all text-zinc-400 hover:text-white disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                          <span className="text-[10px] font-bold uppercase">{uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span className="text-[10px] font-bold uppercase">Upload</span>
                        </>
                      )}
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                    </button>
                  </div>
                </section>

                {/* AI Integration Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs">
                    <Sparkles size={16} className="text-indigo-500" />
                    AI Integration
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div>
                        <p className="text-sm font-bold text-white">Gemini API Key</p>
                        <p className="text-[10px] text-zinc-500">Provide your own key for personalized AI recommendations directly on your device</p>
                      </div>
                      <input 
                        type="password"
                        placeholder="Enter Gemini API Key..."
                        value={geminiApiKey || ''}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </section>

                {/* System Section (Placeholder for future settings) */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs">
                    <Sliders size={16} className="text-indigo-500" />
                    System
                  </div>
                  

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">High Quality Audio</p>
                        <p className="text-[10px] text-zinc-500">Enable 320kbps streaming (requires more data)</p>
                      </div>
                      <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between opacity-50">
                      <div>
                        <p className="text-sm font-bold text-white">Gapless Playback</p>
                        <p className="text-[10px] text-zinc-500">Experimental: crossfade between tracks</p>
                      </div>
                      <div className="w-10 h-5 bg-zinc-700 rounded-full relative">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs pt-4">
                    <Sparkles size={16} className="text-pink-500" />
                    Deep Personalization
                  </div>
                  <button 
                    onClick={() => setIsPersonalizationOpen(true)}
                    className="w-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/20 rounded-xl p-4 flex items-center justify-between group transition-all"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-white font-bold text-sm group-hover:text-pink-400 transition-colors">Personalization Hub</span>
                      <span className="text-zinc-400 text-[10px]">Themes, Player Styles, Lock Screen, Cool Mode</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles size={16} className="text-pink-400" />
                    </div>
                  </button>
                </section>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => onOpenChange(false)}
                  className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>

      <PersonalizationDialog 
        isOpen={isPersonalizationOpen} 
        onOpenChange={setIsPersonalizationOpen} 
      />
    </Dialog.Root>
  );
}
