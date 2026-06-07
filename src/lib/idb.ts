import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Capacitor } from '@capacitor/core';
const isCapacitor = Capacitor.isNativePlatform();

interface MusicDB extends DBSchema {
  trackImages: {
    key: string;
    value: {
      fileHash: string;
      imageBlob: Blob;
    };
  };
  savedTracks: {
    key: string;
    value: {
      id: string;
      file: Blob;
      title: string;
      artist: string;
      duration: number;
      customImageUrl?: string;
      isVideo: boolean;
    };
  };
  wallpapers: {
    key: string;
    value: {
      id: string;
      blob: Blob;
    };
  };
  playlistImages: {
    key: string;
    value: {
      id: string;
      imageBlob: Blob;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MusicDB>('skss-music-db', 4, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('trackImages', { keyPath: 'fileHash' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('savedTracks', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          db.createObjectStore('wallpapers', { keyPath: 'id' });
        }
        if (oldVersion < 4) {
          db.createObjectStore('playlistImages', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveWallpaperToDB(id: string, blob: Blob) {
  if (isCapacitor) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            await Filesystem.writeFile({
              path: `${id}.dat`,
              data: base64Data,
              directory: Directory.Data
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('FS save err', e);
    }
  }

  const db = await getDB();
  await db.put('wallpapers', { id, blob });
}

export async function deleteWallpaperFromDB(id: string) {
  if (isCapacitor) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({
        path: `${id}.dat`,
        directory: Directory.Data
      });
    } catch (e) {
      console.error('FS delete err', e);
    }
  }

  const db = await getDB();
  await db.delete('wallpapers', id);
}

export async function cleanupWallpapers(validIds: string[]) {
  const db = await getDB();
  const allKeys = await db.getAllKeys('wallpapers');
  const idsToKeep = new Set([...validIds, 'live_wallpaper', 'static_wallpaper']);
  
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith('custom_') && !idsToKeep.has(key)) {
      await deleteWallpaperFromDB(key);
    }
  }
}

export async function getWallpaperFromDB(id: string): Promise<Blob | undefined> {
  if (isCapacitor) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const res = await Filesystem.readFile({
        path: `${id}.dat`,
        directory: Directory.Data
      });
      if (res && res.data) {
        // Detect mimetype based on id
        let mimeType = 'video/mp4';
        if (id !== 'live_wallpaper' && !id.includes('video')) mimeType = 'image/jpeg';
        
        // Convert base64 back to Blob
        const fetchRes = await fetch(`data:${mimeType};base64,${res.data}`);
        const blob = await fetchRes.blob();
        return blob;
      }
    } catch (e) {
      // Not found in FS, might be in IDB fallback below
    }
  }

  const db = await getDB();
  const record = await db.get('wallpapers', id);
  return record?.blob;
}

export async function saveTrackImage(fileHash: string, imageBlob: Blob) {
  const db = await getDB();
  await db.put('trackImages', { fileHash, imageBlob });
}

export async function getTrackImage(fileHash: string): Promise<Blob | undefined> {
  const db = await getDB();
  const record = await db.get('trackImages', fileHash);
  return record?.imageBlob;
}

export async function savePlaylistImage(id: string, imageBlob: Blob) {
  const db = await getDB();
  await db.put('playlistImages', { id, imageBlob });
}

export async function getPlaylistImage(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  const record = await db.get('playlistImages', id);
  return record?.imageBlob;
}

export async function saveTrackToDB(track: any) {
  const db = await getDB();
  await db.put('savedTracks', track);
}

export async function deleteTrackFromDB(id: string) {
  const db = await getDB();
  await db.delete('savedTracks', id);
}

export async function getAllSavedTracks() {
  const db = await getDB();
  return await db.getAll('savedTracks');
}

export async function updateTrackInDB(id: string, updates: any) {
  const db = await getDB();
  const track = await db.get('savedTracks', id);
  if (track) {
    await db.put('savedTracks', { ...track, ...updates });
  }
}
