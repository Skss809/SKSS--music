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
    }

    // Act as a chunked streaming proxy
    const rangeHeader = req.headers.range;
    let start = 0;
    let end: number | null = null;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      if (parts[1]) {
        end = parseInt(parts[1], 10);
      }
    }

    // Limit chunk size to 1MB to bypass Vercel payload limits and timeouts
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    if (end === null || (end - start + 1) > CHUNK_SIZE) {
      end = start + CHUNK_SIZE - 1;
    }

    const contentLength = format.content_length ? Number(format.content_length) : 0;
    if (contentLength && end >= contentLength) {
      end = contentLength - 1;
    }

    console.log(`Proxying range bytes=${start}-${end}/${contentLength || 'unknown'} for video ${videoId}`);

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Range': `bytes=${start}-${end}`,
    };

    const ytResponse = await fetch(streamUrl, { headers });

    if (!ytResponse.ok) {
      console.error(`YouTube stream fetch failed with status: ${ytResponse.status}`);
      return res.status(ytResponse.status).json({ error: `YouTube stream server returned status ${ytResponse.status}` });
    }

    // Copy relevant headers from YouTube response
    res.status(ytResponse.status || 206);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const ytContentType = ytResponse.headers.get('content-type');
    if (ytContentType) {
      res.setHeader('Content-Type', ytContentType);
    } else {
      res.setHeader('Content-Type', mode === 'video' ? 'video/mp4' : 'audio/mpeg');
    }

    const ytContentRange = ytResponse.headers.get('content-range');
    const ytContentLength = ytResponse.headers.get('content-length');

    if (ytContentRange) {
      res.setHeader('Content-Range', ytContentRange);
    } else if (contentLength) {
      res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
    }

    if (ytContentLength) {
      res.setHeader('Content-Length', ytContentLength);
    } else {
      res.setHeader('Content-Length', String(end - start + 1));
    }

    const arrayBuffer = await ytResponse.arrayBuffer();
    res.write(Buffer.from(arrayBuffer));
    res.end();
  } catch (err: any) {
    console.error("YT Stream resolution failed:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Internal server error during extraction" });
    }
  }
}
