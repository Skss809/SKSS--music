import youtubedl from 'youtube-dl-exec';
import fs from 'fs';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

console.log('Downloading...');
youtubedl(url, {
  dumpJson: true,
  noCheckCertificates: true,
  noWarnings: true,
  preferFreeFormats: true,
  addHeader: [
    'referer:youtube.com',
    'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  ]
}).then(output => {
  console.log('Success!', Object.keys(output));
}).catch(err => {
  console.error('Error:', err.message);
});
