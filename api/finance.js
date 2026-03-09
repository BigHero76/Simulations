// Fetch Yahoo Finance in Vercel Serverless
export default async function handler(req, res) {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ error: 'Missing symbols' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const symbolList = symbols.split(',');
    const results = [];
    
    await Promise.all(symbolList.map(async (sym) => {
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) return;

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
        console.error(`Vercel function err on sym ${sym}:`, err.message);
      }
    }));
    
    res.status(200).json({ quoteResponse: { result: results } });
  } catch (error) {
    console.error("Vercel Function Error:", error);
    res.status(500).json({ error: 'Failed to fetch from Yahoo Finance' });
  }
}
