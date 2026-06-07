import { Client } from 'soundcloud-scraper';

const client = new Client();

async function test() {
  try {
    const song = await client.getSongInfo('https://soundcloud.com/addal/addal-never-gonna-give-you-up');
    const streamUrl = await song.downloadProgressive();
    console.log(streamUrl);
    // actually, let's see what `streamUrl` stream emits
    const stream = await song.downloadProgressive();
    let body = '';
    stream.on('data', c => { if (body.length < 500) body += c.toString() });
    stream.on('end', () => console.log('Body:', body));
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
