import ytdl from '@distube/ytdl-core';

async function test() {
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    console.log('Stream URL:', format.url);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
