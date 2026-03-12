// Fetch Yahoo Finance in Vercel Serverless

// Helper: process items in batches with delay to avoid rate-limiting
async function batchProcess(items, batchSize, delayMs, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults.filter(Boolean));
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}

export default async function handler(req, res) {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ error: 'Missing symbols' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const symbolList = symbols.split(',');
    
    // Process in batches of 8 with 300ms delay to avoid Yahoo rate limits
    const results = await batchProcess(symbolList, 8, 300, async (sym) => {
      try {
        const encodedSym = encodeURIComponent(sym);
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSym}?interval=1d&range=1d`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) return null;

        const json = await response.json();
        
        if (json.chart && json.chart.result && json.chart.result.length > 0) {
           const meta = json.chart.result[0].meta;
           const previousClose = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice;
           const currentPrice = meta.regularMarketPrice;
           const change = currentPrice - previousClose;
           const pct = previousClose ? (change / previousClose) * 100 : 0;
           
           return {
              symbol: sym,
              regularMarketPrice: currentPrice,
              regularMarketChange: change,
              regularMarketChangePercent: pct,
              regularMarketVolume: meta.regularMarketVolume || null,
              marketCap: null
           };
        }
        return null;
      } catch (err) {
        console.error(`Vercel function err on sym ${sym}:`, err.message);
        return null;
      }
    });
    
    res.status(200).json({ quoteResponse: { result: results } });
  } catch (error) {
    console.error("Vercel Function Error:", error);
    res.status(500).json({ error: 'Failed to fetch from Yahoo Finance' });
  }
}
