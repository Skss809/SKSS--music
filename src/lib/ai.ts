import { getBackendUrl } from './utils';


export async function getRecommendations(recentTracks: { title: string, artist: string }[], trendingTracks: { title: string, artist: string }[] = []) {
  try {
    const { useSettingsStore } = await import('../store/useSettingsStore');
    const { geminiApiKey } = useSettingsStore.getState();

    if (geminiApiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const aiInstance = new GoogleGenAI({ apiKey: geminiApiKey });

        const historyContext = recentTracks && recentTracks.length > 0 
          ? `\nUser's Recently Played:\n${recentTracks.map((t: any) => `- ${t.title} by ${t.artist}`).join('\n')}`
          : '';

        const trendingContext = trendingTracks && trendingTracks.length > 0
          ? `\nCurrent Trending Songs:\n${trendingTracks.map((t: any) => `- ${t.title} by ${t.artist}`).join('\n')}`
          : '';

        const prompt = `You are a music recommendation expert. 
Based on the following context, suggest 5 unique and fresh songs that the user would enjoy.${historyContext}${trendingContext}

GUIDELINES:
1. Blend the user's personal taste (from history) with current trending music styles.
2. Provide a diverse set of recommendations (different artists, sub-genres).
3. Do NOT suggest songs already in the user's recent history.
4. If history is empty, focus on trending hits across various popular genres.
5. Provide a completely different list every time I ask.

Return ONLY a JSON array of objects with "title" and "artist" properties. No markdown formatting, just raw JSON.`;

        const response = await aiInstance.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        const text = response.text || '[]';
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const recommendations = JSON.parse(cleanedText);
        return recommendations;
      } catch (geminiError) {
        console.error("Direct Gemini API call failed:", geminiError);
        // Fallback to backend if direct call fails
      }
    }

    const baseUrl = getBackendUrl();
    const res = await fetch(`${baseUrl}/api/ai-recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recentTracks, trendingTracks }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.warn("AI Recommendations rate limit exceeded.");
        return [];
      }
      console.error(`Failed to get recommendations from backend. Status: ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.recommendations || [];
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return [];
  }
}

export async function generateArtworkPrompt(title: string, artist: string) {
  try {
    const baseUrl = getBackendUrl();
    const res = await fetch(`${baseUrl}/api/ai-artwork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist }),
    });
    
    if (!res.ok) return '';
    const json = await res.json();
    return json.prompt || '';
  } catch (error) {
    console.error("Error generating artwork prompt:", error);
    return '';
  }
}
