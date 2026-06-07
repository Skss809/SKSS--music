import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { LocalTrack, Playlist } from '../store/usePlayerStore';
import { getBackendUrl } from './utils';

// We strip out any file blobs before sending to Firebase
const cleanTracksForFirebase = (tracks: LocalTrack[]) => {
  return tracks.map(t => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    customImageUrl: t.customImageUrl || null,
    isVideo: t.isVideo || false,
    streamUrl: t.streamUrl || null,
    source: t.source || 'local'
  }));
};

export const syncLibraryToFirebase = async (tracks: LocalTrack[]) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  
  try {
    const cleaned = cleanTracksForFirebase(tracks);
    const syncable = cleaned.filter(t => t.source !== 'local');
    
    // Using trackMetadata collection per rules
    for (const track of syncable) {
      const docId = `${uid}_${track.id}`.replace(/\//g, '_'); // prevent slash errors
      const trackRef = doc(db, 'trackMetadata', docId);
      const trackSnap = await getDoc(trackRef);
      const currentCreatedAt = (trackSnap.exists() && trackSnap.data().createdAt) ? trackSnap.data().createdAt : new Date().toISOString();
      
      await setDoc(trackRef, {
        userId: uid,
        fileHash: track.id,
        title: track.title,
        artist: track.artist || '',
        customImage: track.customImageUrl || '',
        duration: track.duration || 0,
        source: track.source || 'local',
        streamUrl: track.source === 'youtube' ? null : (track.streamUrl || null),
        createdAt: currentCreatedAt
      }, { merge: true });
    }
    console.log("Synced library items to Firebase trackMetadata!");
  } catch (err) {
    console.error("Failed to sync to firebase", err);
  }
};

export const syncSettingsToFirebase = async (settings: { background: string, backgroundOpacity: number, blurBackground: boolean, liveBackground?: string, previousWallpapers?: string[] }) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await setDoc(doc(db, 'userSettings', uid), {
      userId: uid,
      background: settings.background,
      liveBackground: settings.liveBackground || '',
      backgroundOpacity: settings.backgroundOpacity,
      blurBackground: settings.blurBackground,
      previousWallpapers: settings.previousWallpapers || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("Synced settings to Firebase!");
  } catch (err) {
    console.error("Failed to sync settings", err);
  }
};

export const loadSettingsFromFirebase = async () => {
  if (!auth.currentUser) return null;
  const uid = auth.currentUser.uid;
  try {
    const snap = await getDoc(doc(db, 'userSettings', uid));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.error("Failed to load settings from firebase", err);
  }
  return null;
};

export const syncPlaylistsToFirebase = async (playlists: Playlist[]) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    // We store all playlists in a single doc for simplicity, or use separate docs
    // Let's use separate docs in the 'playlists' collection
    for (const p of playlists) {
      const pRef = doc(db, 'playlists', p.id);
      const pSnap = await getDoc(pRef);
      const currentCreatedAt = pSnap.exists() ? pSnap.data().createdAt : new Date().toISOString();
      
      await setDoc(pRef, {
        userId: uid,
        name: p.name,
        trackIds: p.trackIds,
        createdAt: currentCreatedAt
      }, { merge: true });
    }
    console.log("Synced playlists to Firebase!");
  } catch (err) {
    console.error("Failed to sync playlists", err);
  }
};

export const loadPlaylistsFromFirebase = async (): Promise<Playlist[]> => {
  if (!auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  try {
    const q = query(collection(db, 'playlists'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const fetched: Playlist[] = [];
    snap.forEach(d => {
      const data = d.data();
      fetched.push({
        id: d.id,
        name: data.name,
        trackIds: data.trackIds || []
      });
    });
    return fetched;
  } catch (err) {
    console.error("Failed to load playlists", err);
    return [];
  }
};

export const syncHistoryToFirebase = async (history: LocalTrack[]) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    const trackIds = history.map(t => t.id);
    await setDoc(doc(db, 'userHistory', uid), {
      userId: uid,
      trackIds,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch(err) {
    console.error("Failed to sync history", err);
  }
};

export const loadHistoryFromFirebase = async (): Promise<string[]> => {
  if (!auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  try {
    const snap = await getDoc(doc(db, 'userHistory', uid));
    if (snap.exists()) {
      return snap.data().trackIds || [];
    }
  } catch (err) {
    console.error("Failed to load history", err);
  }
  return [];
};

export const loadLibraryFromFirebase = async (): Promise<LocalTrack[]> => {
  if (!auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  try {
    const q = query(collection(db, 'trackMetadata'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const fetchedTracks: LocalTrack[] = [];
    
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const source = data.source || 'youtube';
      let streamUrl = data.streamUrl;
      
      if (source === 'youtube') {
        const baseUrl = getBackendUrl();
        streamUrl = `${baseUrl}/api/yt-stream?url=${data.fileHash}&mode=audio&redirect=true`;
      }

      fetchedTracks.push({
        id: data.fileHash,
        title: data.title,
        artist: data.artist,
        duration: data.duration,
        customImageUrl: data.customImage || undefined,
        isVideo: false,
        source: source as any,
        streamUrl: streamUrl
      });
    });
    return fetchedTracks;
  } catch (err) {
    console.error("Failed to load from firebase", err);
  }
  return [];
};
