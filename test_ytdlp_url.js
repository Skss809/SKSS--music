import youtubedl from 'youtube-dl-exec';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

youtubedl(url, {
  getUrl: true,
  f: 'bestaudio'
}).then(output => {
  console.log('Stream URL:', output);
}).catch(err => {
  console.error('Error:', err.message);
});
