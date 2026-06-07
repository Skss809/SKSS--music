import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Innertube } from 'youtubei.js';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : url; // If no match, treat the url string as the ID directly
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = req.query.url as string;
    const mode = (req.query.mode as string) || 'audio';
    const redirect = req.query.redirect === 'true';

    if (!url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    const videoId = getYouTubeId(url);
    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({ error: "Invalid YouTube URL or ID" });
    }

    console.log(`Resolving stream URL for ID: ${videoId}, mode: ${mode}`);

    let streamUrl: string | undefined;

    // Try Invidious API (Vercel-friendly, fast)
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
      console.error(`Invidious API error:`, err.message);
    }

    if (!streamUrl) {
      return res.status(404).json({ error: "Failed to decipher stream URL" });
    }

    // Redirect to the stream URL directly instead of proxying through Vercel
    // Proxying chunks using node fetch on Vercel hits the 4.5MB payload limit and 10s timeout limit.
    return res.redirect(302, streamUrl);

  } catch (err: any) {
    console.error("YT Stream resolution failed:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Internal server error during extraction" });
    }
  }
}
