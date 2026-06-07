import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getHighResImage(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.includes('sndcdn.com') && url.includes('-large.jpg')) {
    // Attempt standard SC hi-res
    return url.replace('-large.jpg', '-t500x500.jpg');
  }
  if (url.includes('audius') && (url.includes('150x150') || url.includes('480x480'))) {
    return url.replace('150x150', '1000x1000').replace('480x480', '1000x1000');
  }
  return url;
}

export function getBackendUrl(): string {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  const origin = window.location.origin;
  const isCapacitor = window.location.protocol === 'capacitor:';
  if (isCapacitor) {
    return 'https://skss-music-lnog.vercel.app';
  }
  return origin.includes('localhost') ? 'http://localhost:3000' : origin;
}
