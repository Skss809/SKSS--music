import https from 'https';

const instances = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.smnz.de',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.astartes.nl',
  'https://pipedapi.lunar.icu'
];

async function checkInstances() {
  for (const baseUrl of instances) {
    const url = `${baseUrl}/streams/dQw4w9WgXcQ`;
    console.log('Trying:', url);
    try {
      const result = await new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
      });
      
      if (result.status === 200 && result.data.startsWith('{')) {
         const json = JSON.parse(result.data);
         console.log(baseUrl, 'SUCCESS, Audio Streams:', json.audioStreams?.length);
      } else {
         console.log(baseUrl, 'FAILED', result.status, result.data.substring(0, 100));
      }
    } catch (e) {
      console.log(baseUrl, 'ERROR', e.message);
    }
  }
}
checkInstances();
