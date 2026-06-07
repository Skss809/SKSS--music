import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { saveTrackToDB } from './idb';
import { LocalTrack } from '../store/usePlayerStore';

export async function saveAudioToInternalStorage(track: LocalTrack, blob: Blob): Promise<LocalTrack> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Create a unique filename
      const fileName = `${track.id.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
      
      // Convert Blob to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const result = reader.result as string;
          // Extract just the base64 string
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      // Write to internal datadirectory
      const result = await Filesystem.writeFile({
        path: `music/${fileName}`,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });

      // The Native URL can be converted to something the WebView can read (http://localhost/_capacitor_file_...)
      const webviewUrl = Capacitor.convertFileSrc(result.uri);
      
      const newTrack = { ...track, streamUrl: webviewUrl, file: undefined };
      await saveTrackToDB(newTrack);
      return newTrack;
    } catch (e) {
      console.error("Filesystem save failed, falling back to IDB", e);
    }
  }
  
  // Fallback to IndexedDB (Blob support) for web / if filesystem fails
  const newTrack = { ...track, file: blob };
  await saveTrackToDB(newTrack);
  return newTrack;
}
