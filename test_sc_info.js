import { Client } from 'soundcloud-scraper';

const client = new Client();

async function test() {
  try {
    const song = await client.getSongInfo('https://soundcloud.com/addal/addal-never-gonna-give-you-up');
    console.log('Song title:', song.title);
    console.log('Song duration:', song.duration);
    console.log('Song thumbnail:', song.thumbnail);
    console.log('Stream url:', song.streams.progressive);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
