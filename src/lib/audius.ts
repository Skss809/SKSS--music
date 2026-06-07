let cachedHost: string | null = null;

export async function getAudiusHost() {
  if (cachedHost) return cachedHost;
  try {
    const res = await fetch('https://api.audius.co');
    const data = await res.json();
    const hosts = data.data;
    cachedHost = hosts[Math.floor(Math.random() * hosts.length)];
    return cachedHost || 'https://discoveryprovider.audius.co';
  } catch (e) {
    console.error("Failed to get Audius host", e);
    return 'https://discoveryprovider.audius.co'; // fallback
  }
}

export async function searchAudius(query: string) {
  try {
    const host = await getAudiusHost();
    const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=SKSS_Music`);
    const json = await res.json();
    if (!json.data) return [];
    
    return json.data.map((track: any) => ({
      id: `audius-${track.id}`,
      title: track.title,
      artist: track.user.name,
      duration: track.duration,
      customImageUrl: track.artwork?.['1000x1000'] || track.artwork?.['480x480'] || track.artwork?.['150x150'],
      streamUrl: `${host}/v1/tracks/${track.id}/stream?app_name=SKSS_Music`,
      isVideo: false,
      source: 'audius'
    }));
  } catch (e) {
    console.error("Audius search failed", e);
    return [];
  }
}
