import https from 'https';

https.get('https://pipedapi.kavin.rocks/streams/dQw4w9WgXcQ', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data.includes('audioStreams') ? 'SUCCESS' : data));
});
