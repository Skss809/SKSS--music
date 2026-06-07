import https from 'https';

const url = 'https://pipedapi.kavin.rocks/streams/dQw4w9WgXcQ';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.audioStreams) {
        console.log('Audio Streams found:', json.audioStreams.length);
        if (json.audioStreams.length > 0) {
          console.log('Best audio URL:', json.audioStreams[0].url.substring(0, 150) + '...');
        }
      } else {
        console.log('Response:', data.substring(0, 500));
      }
    } catch(e) {
      console.log('Failed to parse', e);
      console.log('Raw:', data.substring(0, 200));
    }
  });
}).on('error', console.error);
