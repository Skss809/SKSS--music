import { LocalTrack } from '../store/usePlayerStore';
import { Capacitor } from '@capacitor/core';
import { getBackendUrl } from './utils';

let cachedClientId: string | null = null;
const isCapacitor = Capacitor.isNativePlatform();

export async function getSoundCloudClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;
  try {
    const html = await fetch('https://soundcloud.com', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/437.36' 
      }
    }).then(r => r.text());
    const scripts = [...html.matchAll(/<script[^>]+src=\"(https:\/\/a-v2\.sndcdn\.com\/assets\/[^\"]+)\"/g)].map(m => m[1]);
    for (const url of scripts) {
      const js = await fetch(url).then(r => r.text());
      const match = js.match(/client_id[:=]\s*"([a-zA-Z0-9]{32})"/);
      if (match) {
        cachedClientId = match[1];
        return cachedClientId;
      }
    }
  } catch (e) {
    console.error('Failed to resolve SoundCloud Client ID client-side:', e);
  }
  return 'tUy37JutyVy6r6JSMLnScSmBwA5DoTXE'; // Working fallback
}

export async function searchSoundCloud(query: string): Promise<LocalTrack[]> {
  const baseUrl = getBackendUrl();
  
  const scUrl = `${baseUrl}/api/sc-search?q=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(scUrl);
    if (!res.ok) {
       let errorMsg = `Search failed (${res.status})`;
       try {
         const textBody = await res.text();
         try {
           const errJson = JSON.parse(textBody);
           if (errJson.error) errorMsg += `: ${errJson.error}`;
         } catch (e) {
           console.warn("Backend proxy error body:", textBody);
         }
       } catch (e) {
         console.warn("Failed to read error response body");
       }
       throw new Error(errorMsg);
    }
    const data = await res.json();
    return data.items || [];
  } catch (err: any) {
    console.error("SoundCloud search failed:", err);
    throw new Error(err.message || "Network error while searching SoundCloud");
  }
}

export async function getTrendingTracks(): Promise<LocalTrack[]> {
  const baseUrl = getBackendUrl();
  
  try {
    const res = await fetch(`${baseUrl}/api/sc-trending`);
    if (!res.ok) throw new Error("Trending fetch failed");
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("Failed to fetch trending tracks", err);
    return [];
  }
}

export async function resolvePlayableUrl(streamUrlOrTrackId: string): Promise<string> {
  if (!streamUrlOrTrackId) return '';
  if (streamUrlOrTrackId.includes('cf-media.sndcdn.com')) {
    return streamUrlOrTrackId;
  }
  
  if (isCapacitor) {
    try {
      let targetUrl = streamUrlOrTrackId;
      if (streamUrlOrTrackId.includes('/api/sc-stream')) {
        const queryPart = streamUrlOrTrackId.split('?')[1];
        if (queryPart) {
          const urlParams = new URLSearchParams(queryPart);
          const extractedUrl = urlParams.get('url');
          if (extractedUrl) {
            targetUrl = extractedUrl;
          }
        }
      }
      
      if (targetUrl.includes('api-v2.soundcloud.com') || targetUrl.includes('api.soundcloud.com') || targetUrl.includes('transcodings')) {
        const clientId = await getSoundCloudClientId();
        const separator = targetUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${targetUrl}${separator}client_id=${clientId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            return data.url;
          }
        }
      }
    } catch (err) {
      console.error("Failed to resolve playable URL client-side on Capacitor:", err);
    }
  }
  
  if (streamUrlOrTrackId.includes('api-v2.soundcloud.com') || streamUrlOrTrackId.includes('api/sc-stream')) {
    const baseUrl = getBackendUrl();
    
    // If it's already a proxy route but we need to ensure absolute URL in Capacitor
    if (streamUrlOrTrackId.startsWith('/api/')) {
        return `${baseUrl}${streamUrlOrTrackId}`;
    }
    
    return `${baseUrl}/api/sc-stream?url=${encodeURIComponent(streamUrlOrTrackId)}`;
  }
  
  return streamUrlOrTrackId;
}
