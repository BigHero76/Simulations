// Fetch Yahoo Finance Intraday Chart in Vercel Serverless
// Returns 5-minute interval price data for the current trading day
export default async function handler(req, res) {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(response.statusText);
    const json = await response.json();

    if (json.chart && json.chart.result && json.chart.result.length > 0) {
      const result = json.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators.quote[0].close || [];

      const intraday = timestamps.map((ts, i) => ({
        time: new Date(ts * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }),
        price: closes[i] || null
      })).filter(p => p.price !== null);

      res.status(200).json({ intraday });
    } else {
      res.status(404).json({ error: 'No intraday data found' });
    }
  } catch (error) {
    console.error("Vercel Intraday Error:", error);
    res.status(500).json({ error: 'Failed to fetch intraday data' });
  }
}
