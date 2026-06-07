import youtubedl from 'youtube-dl-exec';

async function test() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log('Testing youtube-dl-exec fast mode...');
  console.time('yt-dlp');
  try {
    const output = await youtubedl(url, {
      getUrl: true,
      noWarnings: true,
      callHome: false,
      noCheckCertificate: true,
      format: 'bestaudio'
    });
    console.timeEnd('yt-dlp');
    console.log('Success! URL is:', output);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
