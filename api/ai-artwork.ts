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
    if (!body || !body.title || !body.artist) {
      return res.status(400).json({ error: "Missing title or artist in body" });
    }

    const { title, artist } = body;
    const prompt = `Create a detailed image generation prompt for an album cover for the song "${title}" by "${artist}". The prompt should describe a visually stunning, modern, and artistic scene that captures the mood of the song. Return ONLY the prompt text.`;

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || '';
    res.json({ prompt: text });
  } catch (err: any) {
    console.error("/api/ai-artwork error:", err);
    if (err.message && (err.message.includes('429') || err.message.includes('Quota'))) {
      return res.status(429).json({ error: "Gemini AI Quota exceeded.", prompt: "" });
    }
    res.status(500).json({ error: err.message, prompt: "" });
  }
}
