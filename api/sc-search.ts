import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedClientId: string | null = null;
async function getClientId() {
  if (cachedClientId) return cachedClientId;
  try {
    const html = await fetch('https://soundcloud.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
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
    console.error('Failed to get sc client id', e);
  }
  return 'tUy37JutyVy6r6JSMLnScSmBwA5DoTXE';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const q = req.query.q as string;
    if (!q) {
      return res.status(400).json({ error: "Missing query" });
    }

    const clientId = await getClientId();
    const scUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&client_id=${clientId}&limit=20`;
    const result = await fetch(scUrl).then(r => r.json());

    const mapped = (result.collection || []).map((track: any) => {
      let progressiveUrl = '';
      let isHls = false;
      if (track.media && track.media.transcodings && track.media.transcodings.length > 0) {
        const trans = track.media.transcodings.find((t: any) => t.format.protocol === 'progressive');
        if (trans && trans.url) {
          progressiveUrl = trans.url;
        } else {
          progressiveUrl = track.media.transcodings[0].url;
          if (track.media.transcodings[0].format.protocol === 'hls') {
            isHls = true;
          }
        }
      }
      let artworkUrl = track.artwork_url || track.user?.avatar_url || "";
      if (artworkUrl) {
        artworkUrl = artworkUrl.replace('-large.jpg', '-t500x500.jpg');
      }
      return {
        id: `soundcloud-${track.id || track.permalink_url}`,
        title: track.title,
        artist: track.user?.username || "Unknown Artist",
        duration: track.duration ? track.duration / 1000 : 0,
        customImageUrl: artworkUrl,
        streamUrl: `/api/sc-stream?url=${encodeURIComponent(progressiveUrl || track.permalink_url)}&hls=${isHls}`,
        isVideo: false,
        source: 'soundcloud',
        url: track.permalink_url
      };
    });

    return res.json({ items: mapped });
  } catch (err: any) {
    console.error("/api/sc-search error:", err);
    return res.status(500).json({ error: err.message });
  }
}
