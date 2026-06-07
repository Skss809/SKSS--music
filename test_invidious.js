import https from 'https';

const url = 'https://vid.puffyan.us/api/v1/videos/dQw4w9WgXcQ';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.formatStreams) {
        const audioStreams = json.adaptiveFormats.filter(f => f.type.startsWith('audio'));
        console.log('Audio Streams found:', audioStreams.length);
        if (audioStreams.length > 0) {
          console.log('Best audio URL:', audioStreams[0].url);
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
