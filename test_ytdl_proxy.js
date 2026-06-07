import youtubedl from 'youtube-dl-exec';

async function test() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log('Testing youtube-dl-exec with proxy...');
  try {
    const output = await youtubedl(url, {
      dumpJson: true,
      noWarnings: true,
      callHome: false,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      format: 'bestaudio'
    });
    
    console.log('Fetching URL:', output.url.slice(0, 50));
    const res = await fetch(output.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log('Proxy fetch status:', res.status);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
