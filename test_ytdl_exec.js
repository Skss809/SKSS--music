import youtubedl from 'youtube-dl-exec';

async function test() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log('Testing youtube-dl-exec...');
  try {
    const output = await youtubedl(url, {
      dumpJson: true,
      noWarnings: true,
      callHome: false,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    });
    console.log('Success! URL is:', output.url);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
