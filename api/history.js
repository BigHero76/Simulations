// Fetch Yahoo Finance Historical Chart in Vercel Serverless
export default async function handler(req, res) {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

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
      
      res.status(200).json({ history });
    } else {
      res.status(404).json({ error: 'No history found' });
    }
  } catch (error) {
    console.error("Vercel History Error:", error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}
