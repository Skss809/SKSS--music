import { Client } from 'soundcloud-scraper';

const client = new Client();

async function test() {
  try {
    const song = await client.getSongInfo('https://soundcloud.com/addal/addal-never-gonna-give-you-up');
    const stream = await song.downloadProgressive();
    console.log('Stream found:', !!stream);
    
    let size = 0;
    stream.on('data', chunk => size += chunk.length);
    stream.on('end', () => console.log('Total size:', size));
    stream.on('error', (e) => console.log('Stream error', e));
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
