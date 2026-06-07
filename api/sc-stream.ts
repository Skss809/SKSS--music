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
  return 'tUy37JutyVy6r6JSMLnScSmBwA5DoTXE'; // fallback
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = req.query.url as string;
    const proxy = req.query.proxy === 'true';
    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    if (url.includes('api-v2.soundcloud.com') || url.includes('api.soundcloud.com') || url.includes('sndcdn.com') || url.includes('transcodings')) {
      const clientId = await getClientId();
      const data = await fetch(`${url}?client_id=${clientId}`).then(r => r.json());
      if (data && data.url) {
        if (req.query.hls === 'true') {
          // just redirect for HLS since m3u8 proxying is complex and device player can usually handle it directly
          return res.redirect(302, data.url);
        }

        if (proxy) {
          const streamRes = await fetch(data.url);
          if (!streamRes.ok) {
            return res.status(streamRes.status).json({ error: "Failed to fetch track stream from SoundCloud CDN" });
          }
          res.setHeader('Content-Type', streamRes.headers.get('content-type') || 'audio/mpeg');
          const contentLength = streamRes.headers.get('content-length');
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }
          res.setHeader('Content-Disposition', 'attachment; filename="soundcloud.mp3"');
          
          if (!streamRes.body) {
            return res.status(500).json({ error: "Stream unavailable" });
          }
          
          const reader = streamRes.body.getReader();
          const streamPump = async () => {
             try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
                res.end();
             } catch(e) {
                console.error("Proxy stream interrupted", e);
                res.end();
             }
          };
          return streamPump();
        } else {
          return res.redirect(302, data.url);
        }
      }
    }

    return res.status(404).json({ error: "Cannot stream right now. Invalid URL provided." });
  } catch (err: any) {
    console.error("/api/sc-stream error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
}
