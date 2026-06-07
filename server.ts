import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

let cachedClientId: string | null = null;
async function getClientId() {
  if (cachedClientId) return cachedClientId;
  try {
    const html = await fetch('https://soundcloud.com', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' 
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
    console.error('Failed to scrape SoundCloud client ID:', e);
  }
  return 'tUy37JutyVy6r6JSMLnScSmBwA5DoTXE'; // Working fallback
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // SoundCloud Search API
  app.get("/api/sc-search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: "Missing query" });
      }

      const clientId = await getClientId();
      const scUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&client_id=${clientId}&limit=20`;
      const result = await fetch(scUrl).then(r => r.json());

      const mapped = (result.collection || [])
        .filter((track: any) => {
          // Filter out tracks that are just 30 second Snippets
          if (track.policy === 'SNIP') return false;
          if (track.duration <= 30000) return false;
          
          // Must have transcodings to be playable
          if (!track.media || !track.media.transcodings || track.media.transcodings.length === 0) return false;
          
          return true;
        })
        .map((track: any) => {
        let progressiveUrl = '';
        let isHls = false;
        if (track.media && track.media.transcodings) {
          const trans = track.media.transcodings.find((t: any) => t.format.protocol === 'progressive' && !t.snipped);
          if (trans && trans.url) {
            progressiveUrl = trans.url;
          } else {
            const hlsTrans = track.media.transcodings.find((t: any) => t.format.protocol === 'hls' && !t.snipped);
            if (hlsTrans && hlsTrans.url) {
              progressiveUrl = hlsTrans.url;
              isHls = true;
            } else {
              // fallback to any progressive if there are no un-snipped
              const fallback = track.media.transcodings.find((t: any) => t.format.protocol === 'progressive');
              if (fallback) { progressiveUrl = fallback.url; }
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

      res.json({ items: mapped });
    } catch (err: any) {
      console.error("/api/sc-search error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // SoundCloud Trending API
  app.get("/api/sc-trending", async (req, res) => {
    try {
      const clientId = await getClientId();
      // kind=top or kind=trending
      const scUrl = `https://api-v2.soundcloud.com/charts?kind=top&genre=soundcloud%3Agenres%3Aall-music&client_id=${clientId}&limit=20&offset=0`;
      const result = await fetch(scUrl).then(r => r.json());

      const mapped = (result.collection || [])
        .map((item: any) => {
          const track = item.track;
          if (!track) return null;
          if (!track.media || !track.media.transcodings || track.media.transcodings.length === 0) return null;
          
          let progressiveUrl = '';
          let isHls = false;
          if (track.media && track.media.transcodings) {
            const trans = track.media.transcodings.find((t: any) => t.format.protocol === 'progressive' && !t.snipped);
            if (trans && trans.url) {
              progressiveUrl = trans.url;
            } else {
              const hlsTrans = track.media.transcodings.find((t: any) => t.format.protocol === 'hls' && !t.snipped);
              if (hlsTrans && hlsTrans.url) {
                progressiveUrl = hlsTrans.url;
                isHls = true;
              } else {
                const fallback = track.media.transcodings.find((t: any) => t.format.protocol === 'progressive');
                if (fallback) { progressiveUrl = fallback.url; }
              }
            }
          }

          let artworkUrl = track.artwork_url || track.user?.avatar_url || "";
          if (artworkUrl) {
            artworkUrl = artworkUrl.replace("-large.jpg", "-t500x500.jpg");
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
        })
        .filter((item: any) => item !== null && item.streamUrl && !item.streamUrl.includes('url=undefined') && !item.streamUrl.includes('url=null'));

      res.json({ items: mapped });
    } catch (err: any) {
      console.error("/api/sc-trending error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai-recommend", async (req, res) => {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing on backend" });
      }
      const aiInstance = new GoogleGenAI({ apiKey });

      const body = req.body;
      const { recentTracks, trendingTracks } = body;

      const historyContext = recentTracks && recentTracks.length > 0 
        ? `\nUser's Recently Played:\n${recentTracks.map((t: any) => `- ${t.title} by ${t.artist}`).join('\n')}`
        : '';

      const trendingContext = trendingTracks && trendingTracks.length > 0
        ? `\nCurrent Trending Songs:\n${trendingTracks.map((t: any) => `- ${t.title} by ${t.artist}`).join('\n')}`
        : '';

      const prompt = `You are a music recommendation expert. 
Based on the following context, suggest 5 unique and fresh songs that the user would enjoy.${historyContext}${trendingContext}

GUIDELINES:
1. Blend the user's personal taste (from history) with current trending music styles.
2. Provide a diverse set of recommendations (different artists, sub-genres).
3. Do NOT suggest songs already in the user's recent history.
4. If history is empty, focus on trending hits across various popular genres.
5. Provide a completely different list every time I ask.

Return ONLY a JSON array of objects with "title" and "artist" properties. No markdown formatting, just raw JSON.`;

      const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const text = response.text || '[]';
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const recommendations = JSON.parse(cleanedText);

      res.json({ recommendations });
    } catch (err: any) {
      // Gracefully handle rate limits
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('Quota') || (err as any)?.status === 'RESOURCE_EXHAUSTED' || (err as any)?.status === 429) {
        console.warn(`/api/ai-recommend warning: Gemini AI Quota exceeded. Returns empty list.`);
        return res.status(429).json({ error: "Gemini AI Quota exceeded. Please try again later.", recommendations: [] });
      }
      console.error("/api/ai-recommend error:", err);
      res.status(500).json({ error: errMsg, recommendations: [] });
    }
  });

  app.post("/api/ai-artwork", async (req, res) => {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing on backend" });
      }
      const aiInstance = new GoogleGenAI({ apiKey });

      const body = req.body;
      if (!body || !body.title || !body.artist) {
        return res.status(400).json({ error: "Missing title or artist" });
      }

      const { title, artist } = body;
      const prompt = `Create a detailed image generation prompt for an album cover for the song "${title}" by "${artist}". The prompt should describe a visually stunning, modern, and artistic scene that captures the mood of the song. Return ONLY the prompt text.`;

      const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const text = response.text || '';
      res.json({ prompt: text });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('Quota') || (err as any)?.status === 'RESOURCE_EXHAUSTED' || (err as any)?.status === 429) {
        console.warn(`/api/ai-artwork warning: Gemini AI Quota exceeded.`);
        return res.status(429).json({ error: "Gemini AI Quota exceeded.", prompt: "" });
      }
      console.error("/api/ai-artwork error:", err);
      res.status(500).json({ error: errMsg, prompt: "" });
    }
  });

  // SoundCloud Stream API
  app.get("/api/sc-stream", async (req, res) => {
    try {
      const url = req.query.url as string;
      const proxy = req.query.proxy === 'true';
      if (!url) {
        return res.status(400).json({ error: "Missing url" });
      }

      console.log("SC-Stream requested URL:", url);

      if (url.includes('api-v2.soundcloud.com') || url.includes('api.soundcloud.com') || url.includes('sndcdn.com') || url.includes('transcodings')) {
        const clientId = await getClientId();
        const data = await fetch(`${url}?client_id=${clientId}`).then(r => r.json()).catch(e => {
            console.error("Error fetching transcoding URL:", e);
            return null;
        });
        
        if (data && data.url) {
          if (proxy && !url.includes('stream/hls')) { // cannot simple proxy hls playlist and expect it to work if it's m3u8
            // Direct streaming proxy to avoid CORS blocks on web downloads
            const streamRes = await fetch(data.url, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Referer': 'https://soundcloud.com/',
                'Origin': 'https://soundcloud.com'
              }
            });
            if (!streamRes.ok) {
              console.error("proxy fetch failed for CDN url:", data.url, "Status:", streamRes.status);
              return res.status(streamRes.status).json({ error: "Failed to fetch track stream from SoundCloud CDN" });
            }
            res.setHeader('Content-Type', streamRes.headers.get('content-type') || 'audio/mpeg');
            const contentLength = streamRes.headers.get('content-length');
            if (contentLength) {
              res.setHeader('Content-Length', contentLength);
            }
            res.setHeader('Content-Disposition', 'attachment; filename="soundcloud.mp3"');
            
            const reader = streamRes.body?.getReader();
            if (!reader) {
              return res.status(500).json({ error: "Stream unavailable" });
            }
            const streamPump = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
                res.end();
              } catch (e) {
                console.error("Proxy stream interrupted:", e);
                res.end();
              }
            };
            return streamPump();
          } else {
            // Faster direct redirect
            return res.redirect(302, data.url);
          }
        } else {
            console.error("SC-stream transcoding URL fetch failed. Returned data:", data);
            return res.status(401).json({ error: "Cannot access this track stream. It might be geo-blocked or premium only." });
        }
      }

      return res.status(404).json({ error: "Cannot stream right now. Invalid URL provided." });
    } catch (err: any) {
      console.error("/api/sc-stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // YouTube Stream API
  app.get("/api/yt-stream", async (req, res) => {
    try {
      const url = req.query.url as string;
      const mode = (req.query.mode as string) || 'audio';
      const redirect = req.query.redirect === 'true';

      if (!url) {
        return res.status(400).json({ error: "Missing url" });
      }

      const getYouTubeId = (urlStr: string): string | null => {
        const match = urlStr.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : urlStr;
      };

      const videoId = getYouTubeId(url);
      if (!videoId || videoId.length !== 11) {
        return res.status(400).json({ error: "Invalid YouTube URL or ID" });
      }

      console.log(`[Local Server] Resolving YT stream URL for ID: ${videoId}, mode: ${mode}`);

      console.log(`[Local Server] Fetching stream URL via Invidious API`);
      let streamUrl: string | undefined;

      // 1. Try Invidious API (Vercel-friendly, fast)
      try {
        const invidiousRes = await fetch(`https://inv.thepixora.com/api/v1/videos/${videoId}`);
        if (invidiousRes.ok) {
          const data = await invidiousRes.json();
          const audioFormat = data.adaptiveFormats?.find((f: any) => f.type?.startsWith('audio'));
          const videoFormat = data.formatStreams?.find((f: any) => f.type?.startsWith('video'));
          
          if (mode === 'video') {
            streamUrl = videoFormat?.url || audioFormat?.url;
          } else {
            streamUrl = audioFormat?.url || videoFormat?.url;
          }
        }
      } catch (err: any) {
        console.error(`[Local Server] Invidious API error:`, err.message);
      }

      // 2. Fallback to youtube-dl-exec (Local-only, fails on Vercel but bulletproof locally)
      if (!streamUrl) {
        try {
          console.log(`[Local Server] Falling back to youtube-dl-exec...`);
          const youtubedl = (await import('youtube-dl-exec')).default;
          const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const outputUrl = await youtubedl(ytUrl, {
            getUrl: true,
            noWarnings: true,
            callHome: false,
            noCheckCertificates: true,
            format: mode === 'video' ? 'best[ext=mp4]' : 'bestaudio'
          });
          streamUrl = typeof outputUrl === 'string' ? outputUrl.trim().split('\n')[0] : undefined;
        } catch (err: any) {
          console.error(`[Local Server] yt-dlp fallback error:`, err.message);
        }
      }

      console.log(`[Local Server] Resolved stream URL: ${streamUrl ? streamUrl.slice(0, 50) + '...' : 'null/undefined'}`);

      if (!streamUrl) {
        return res.status(404).json({ error: "Failed to decipher stream URL" });
      }

      if (redirect) {
        return res.redirect(302, streamUrl);
      }

      // Always redirect to stream URL directly instead of proxying
      // Proxying chunks using node fetch often results in 403 Forbidden
      return res.redirect(302, streamUrl);
    } catch (err: any) {
      console.error("/api/yt-stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Internal server error during extraction" });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
