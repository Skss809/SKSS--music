import youtubedl from 'youtube-dl-exec';

const subprocess = youtubedl.exec('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
  o: '-',
  f: 'bestaudio[ext=m4a]/bestaudio',
  q: true,
});

console.log('Is Promise?', subprocess instanceof Promise);
console.log('Has stdout?', !!subprocess.stdout);
