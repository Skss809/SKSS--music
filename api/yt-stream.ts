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

    try {
      const play = (await import('play-dl')).default;
      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await play.video_info(ytUrl);
      
      let format;
      if (mode === 'video') {
        format = info.format.find((f: any) => f.hasVideo && f.hasAudio) || info.format.find((f: any) => f.hasVideo);
      } else {
        format = info.format.find((f: any) => !f.hasVideo && f.hasAudio) || info.format.find((f: any) => f.hasAudio);
      }

      if (format && format.url) {
        streamUrl = format.url;
      } else {
        // Fallback
        streamUrl = info.format[0]?.url;
      }
    } catch (err: any) {
      console.error("play-dl extraction error:", err.message);
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
