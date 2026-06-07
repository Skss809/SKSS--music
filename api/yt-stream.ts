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

    const yt = await Innertube.create({ client_type: 'ANDROID' as any });
    const info = await yt.getBasicInfo(videoId);

    // If it's a live stream
    if (info.basic_info.is_live || info.streaming_data?.hls_manifest_url) {
      const hlsUrl = info.streaming_data?.hls_manifest_url;
      if (hlsUrl) {
        console.log(`Live stream detected. HLS URL: ${hlsUrl}`);
        if (redirect) {
          return res.redirect(302, hlsUrl);
        } else {
          return res.status(200).json({ url: hlsUrl });
        }
      }
    }

    const formats = info.streaming_data?.formats || [];
    // Find a playable format with a URL (prefer itag 18 as it has pre-deciphered URLs on Android client)
    let format = formats.find(f => f.itag === 18) || formats[0] || info.chooseFormat({ type: 'video+audio', quality: 'best' });

    if (!format) {
      return res.status(404).json({ error: "No suitable stream format found" });
    }

    let streamUrl = format.url;
    if (!streamUrl && format.signature_cipher) {
      streamUrl = await format.decipher(yt.session.player);
    }

    // Fallback: try chooseFormat in case standard combined format is missing/unusable
    if (!streamUrl) {
      try {
        const fallbackFormat = info.chooseFormat({ type: mode === 'video' ? 'video+audio' : 'audio', quality: 'best' });
        if (fallbackFormat) {
          streamUrl = fallbackFormat.url || (fallbackFormat.signature_cipher ? await fallbackFormat.decipher(yt.session.player) : '');
        }
      } catch (e: any) {
        console.error("Fallback chooseFormat failed:", e.message);
      }
    }

    if (!streamUrl) {
      return res.status(404).json({ error: "Failed to decipher stream URL" });
    }

    if (redirect) {
      return res.redirect(302, streamUrl);
    } else {
      return res.status(200).json({ url: streamUrl });
    }
  } catch (err: any) {
    console.error("YT Stream resolution failed:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Internal server error during extraction" });
    }
  }
}
