import https from 'https';

const instances = [
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.perennialte.ch',
  'https://yt.artemislena.eu'
];

async function checkInstances() {
  for (const baseUrl of instances) {
    const url = `${baseUrl}/api/v1/videos/dQw4w9WgXcQ`;
    console.log('Trying:', url);
    try {
      const result = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
             resolve(data);
          });
        }).on('error', reject);
      });
      if (result.startsWith('{')) {
         const json = JSON.parse(result);
         console.log(baseUrl, 'SUCCESS, Audio Streams:', json.adaptiveFormats?.filter(f => f.type.startsWith('audio')).length);
      } else {
         console.log(baseUrl, 'FAILED - HTML');
      }
    } catch (e) {
      console.log(baseUrl, 'ERROR', e.message);
    }
  }
}
checkInstances();
