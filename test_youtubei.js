import { Innertube } from 'youtubei.js';

async function test() {
  try {
    console.log('Initializing Innertube...');
    const youtube = await Innertube.create();
    const clients = ['ANDROID_MUSIC', 'ANDROID', 'TV', 'WEB'];
    const videoId = 'dQw4w9WgXcQ';
    
    for (const client of clients) {
      try {
        console.log(`\n--- Testing client: ${client} ---`);
        const youtube = await Innertube.create({ client_type: client });
        console.log(`Innertube initialized. Player exists: ${!!youtube.session.player}`);
        
        const info = await youtube.getInfo(videoId);
        const audioFormat = info.chooseFormat({ type: 'audio', quality: 'best' });
        console.log('Format found:', audioFormat.mime_type);
        
        const audioUrl = await audioFormat.decipher(youtube.session.player);
        console.log(`Resolved URL: ${audioUrl ? 'SUCCESS! ' + audioUrl.slice(0, 70) + '...' : 'FAILED'}`);
      } catch (err) {
        console.log(`Failed for client ${client}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error in test:', err);
  }
}

test();
