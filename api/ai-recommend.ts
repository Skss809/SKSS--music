import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

let ai: any = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const aiInstance = getAI();
    if (!aiInstance) {
      return res.status(500).json({ error: "API key is missing on backend" });
    }

    const body = req.body;
    if (!body || !body.recentTracks) {
      return res.status(400).json({ error: "Missing recentTracks in body" });
    }

    const { recentTracks } = body;
    if (recentTracks.length === 0) {
      return res.json({ recommendations: [] });
    }

    const prompt = `Based on these recently played tracks:
${recentTracks.map((t: any) => `- ${t.title} by ${t.artist}`).join('\n')}

Suggest 5 similar songs that the user might like. 
Return ONLY a JSON array of objects with "title" and "artist" properties. No markdown formatting, just the raw JSON array.`;

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || '[]';
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recommendations = JSON.parse(cleanedText);

    res.json({ recommendations });
  } catch (err: any) {
    console.error("/api/ai-recommend error:", err);
    if (err.message && (err.message.includes('429') || err.message.includes('Quota'))) {
      return res.status(429).json({ error: "Gemini AI Quota exceeded. Please try again later.", recommendations: [] });
    }
    res.status(500).json({ error: err.message, recommendations: [] });
  }
}
