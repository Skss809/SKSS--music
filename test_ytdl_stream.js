import ytdl from '@distube/ytdl-core';
import fs from 'fs';

async function test() {
  const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log('Downloading...');
  const stream = ytdl(ytUrl, { filter: 'audioonly' });
  
  stream.on('info', (info, format) => {
    console.log('Format:', format.mimeType);
  });
  
  stream.on('error', (err) => {
    console.error('Stream error:', err);
  });

  let bytes = 0;
  stream.on('data', chunk => {
    bytes += chunk.length;
    if (bytes > 100000) {
      console.log('Successfully got 100KB!');
      process.exit(0);
    }
  });
}

test();
