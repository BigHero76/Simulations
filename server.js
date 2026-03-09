import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Fetch Yahoo Finance
app.get('/api/finance/quote', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ error: 'Missing symbols' });

  try {
    const symbolList = symbols.split(',');
    const results = [];
    
    // Process in parallel for speed
    await Promise.all(symbolList.map(async (sym) => {
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) {
           console.log(`Failed to fetch ${sym}: ${response.statusText}`);
           return;
        }

        const json = await response.json();
        
        if (json.chart && json.chart.result && json.chart.result.length > 0) {
           const meta = json.chart.result[0].meta;
           const previousClose = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice;
           const currentPrice = meta.regularMarketPrice;
           const change = currentPrice - previousClose;
           const pct = previousClose ? (change / previousClose) * 100 : 0;
           
           results.push({
              symbol: sym,
              regularMarketPrice: currentPrice,
              regularMarketChange: change,
              regularMarketChangePercent: pct,
              regularMarketVolume: null,
              marketCap: null
           });
        }
      } catch (err) {
        console.error(`Error processing ${sym}:`, err.message);
      }
    }));
    
    res.json({ quoteResponse: { result: results } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch from Yahoo Finance APIs' });
  }
});

// Fetch historical chart data for 1 year
app.get('/api/finance/history', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
  
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(response.statusText);
    const json = await response.json();
    
    if (json.chart && json.chart.result && json.chart.result.length > 0) {
      const result = json.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators.quote[0].close || [];
      
      const history = timestamps.map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        price: closes[i] || null
      })).filter(h => h.price !== null);
      
      res.json({ history });
    } else {
      res.status(404).json({ error: 'No history found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Fetch historical news from RSS
app.get('/api/finance/news', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
  
  try {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(response.statusText);
    const xml = await response.text();
    
    // Quick regex to grab titles to avoid bringing in an XML parser dependency
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map(m => m[1]).slice(2, 7);
    
    res.json({ news: titles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Proxy AI Chat endpoint to mirror Vercel Serverless
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { history, message, systemInstruction } = req.body;
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Missing API Key. Check your .env file." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction }
    });
    
    if (history && Array.isArray(history)) {
      for (const m of history) {
        if (m.role === "user") {
          await chat.sendMessage({ message: m.content });
        }
      }
    }
    
    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Local Advisor Proxy Error:", error);
    res.status(500).json({ error: error.message || 'Failed to communicate with AI locally' });
  }
});

app.listen(port, () => {
  console.log(`Backend proxy running on http://localhost:${port}`);
});
