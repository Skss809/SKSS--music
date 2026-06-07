async function test() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log('Testing cobalt.tools...');
  console.time('cobalt');
  try {
    const res = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        isAudioOnly: true
      })
    });
    const data = await res.json();
    console.timeEnd('cobalt');
    console.log('Success! URL is:', data.url);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
