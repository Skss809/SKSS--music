import http from 'http';

http.get('http://localhost:3000/api/yt-audio?v=dQw4w9WgXcQ', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let size = 0;
  res.on('data', (c) => size += c.length);
  res.on('end', () => console.log('End. Total size:', size));
}).on('error', (e) => console.error(e));
