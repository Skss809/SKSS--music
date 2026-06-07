async function run() {
  try {
    const url = 'http://localhost:3000/api/yt-stream?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    console.log('Sending request to local server:', url);
    const res = await fetch(url);
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response JSON:', JSON.stringify(data).slice(0, 200) + '...');
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
