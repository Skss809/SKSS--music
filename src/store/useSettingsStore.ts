import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  background: string;
  liveBackground: string;
  backgroundOpacity: number;
  blurBackground: boolean;
  previousWallpapers: string[]; // up to 3 wallpapers
  playerStyle: string;
  coolModeEnabled: boolean;
  coolModeStyle: string;
  drawOverOtherApps: boolean;
  theme: string;
  setBackground: (background: string) => void;
  setLiveBackground: (liveBackground: string) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setBlurBackground: (blur: boolean) => void;
  addPreviousWallpaper: (url: string) => void;
  removePreviousWallpaper: (url: string) => void;
  setPreviousWallpapers: (urls: string[]) => void;
  setPlayerStyle: (style: string) => void;
  setCoolModeEnabled: (enabled: boolean) => void;
  setCoolModeStyle: (style: string) => void;
  setDrawOverOtherApps: (enabled: boolean) => void;
  setTheme: (theme: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      background: '',
      liveBackground: '',
      backgroundOpacity: 0.2,
      blurBackground: false,
      previousWallpapers: [],
      playerStyle: 'default',
      coolModeEnabled: false,
      coolModeStyle: 'colorful-flows',
      drawOverOtherApps: false,
      theme: 'default',
      geminiApiKey: '',
      setBackground: (background) => set({ background }),
      setLiveBackground: (liveBackground) => set({ liveBackground }),
      setBackgroundOpacity: (opacity) => set({ backgroundOpacity: opacity }),
      setBlurBackground: (blur) => set({ blurBackground: blur }),
      setPlayerStyle: (playerStyle) => set({ playerStyle }),
      setCoolModeEnabled: (coolModeEnabled) => set({ coolModeEnabled }),
      setCoolModeStyle: (coolModeStyle) => set({ coolModeStyle }),
      setDrawOverOtherApps: (drawOverOtherApps) => set({ drawOverOtherApps }),
      setTheme: (theme) => set({ theme }),
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      addPreviousWallpaper: (url) => set((state) => {
        if (!url || url.startsWith('blob:') || url.startsWith('data:')) return state;
        const newUrls = [url, ...state.previousWallpapers.filter(u => u !== url)].slice(0, 10);
        return { previousWallpapers: newUrls };
      }),
      removePreviousWallpaper: (url) => set((state) => ({
        previousWallpapers: state.previousWallpapers.filter(u => u !== url)
      })),
      setPreviousWallpapers: (urls) => set({ previousWallpapers: urls }),
    }),
    {
      name: 'skss-settings',
    }
  )
);
