import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, systemInstruction } = req.body;
    
    // Attempt to grab key from Vercel injected variables
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("Missing Gemini API Key in Vercel Environment");
      return res.status(500).json({ error: "Missing API Key on Server. Please configure VITE_GEMINI_API_KEY in Vercel Settings." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const chatOptions = {
      model: 'gemini-2.5-flash',
      config: { systemInstruction }
    };

    const chat = ai.chats.create(chatOptions);
    
    // Seed history
    if (history && Array.isArray(history)) {
      for (const m of history) {
        if (m.role === "user") {
          await chat.sendMessage({ message: m.content });
        }
      }
    }
    
    const response = await chat.sendMessage({ message });
    res.status(200).json({ text: response.text });

  } catch (error) {
    console.error("Serverless Gemini Error:", error);
    res.status(500).json({ error: error.message || 'Failed to communicate with AI' });
  }
}
