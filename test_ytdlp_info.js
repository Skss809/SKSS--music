import youtubedl from 'youtube-dl-exec';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

youtubedl(url, {
  dumpJson: true,
  f: 'bestaudio'
}).then(output => {
  console.log('Stream URL:', output.url);
  console.log('filesize:', output.filesize || output.filesize_approx);
  console.log('ext:', output.ext);
}).catch(err => {
  console.error('Error:', err.message);
});
