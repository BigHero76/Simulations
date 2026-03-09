import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());

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

app.listen(port, () => {
  console.log(`Backend proxy running on http://localhost:${port}`);
});
