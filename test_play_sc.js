import play from 'play-dl';

async function test() {
  try {
    const results = await play.search('never gonna give you up', { source: { soundcloud: 'tracks' }, limit: 5 });
    console.log('Search Results:', results.length);
    console.log('first result:', results[0].url, results[0].name, results[0].thumbnail);
    
    // try to get stream
    const stream = await play.stream(results[0].url);
    console.log(' stream:', !!stream);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
