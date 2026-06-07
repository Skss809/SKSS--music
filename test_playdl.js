import play from 'play-dl';

async function test() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log('Testing play-dl...');
  try {
    const info = await play.video_info(url);
    console.log('play-dl info success! Formats:', info.format.length);
    const stream = await play.stream_from_info(info);
    console.log('play-dl stream success! URL:', stream.url.slice(0, 50));
  } catch (err) {
    console.error('play-dl failed:', err.message);
  }
}

test();
