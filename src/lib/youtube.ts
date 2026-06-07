export const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyAAoUmyIgmb_qDueokjd0cnIgQIgPFKgIw';

export async function searchYouTube(query: string) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key is missing. Please add VITE_YOUTUBE_API_KEY to your .env file.');
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
    query
  )}&type=video&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to fetch from YouTube');
  }

  const data = await res.json();
  
  return data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    duration: 0, // YouTube search API doesn't return duration in the same call
    customImageUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    isVideo: true, // Use ReactPlayer iframe for YouTube
    source: 'youtube',
    streamUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}
