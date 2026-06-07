import { Client } from 'soundcloud-scraper';

const client = new Client();

async function test() {
  try {
    const results = await client.search('never gonna give you up', 'track');
    console.log('Search Results:', results.length);
    console.log(results[0]);
    if (results.length > 0) {
      console.log('Fetching info for:', results[0].url);
      const info = await client.getSongInfo(results[0].url);
      console.log('Song info title:', info.title);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
