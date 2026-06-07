import ytdl from '@distube/ytdl-core';

async function test() {
  const videoId = 'dQw4w9WgXcQ';
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
    console.log('@distube/ytdl-core URL:', format.url);
  } catch (err) {
    console.error('@distube/ytdl-core failed:', err.message);
  }
}

test();
