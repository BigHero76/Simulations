// Fetch Yahoo Finance News RSS in Vercel Serverless
export default async function handler(req, res) {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(response.statusText);
    const xml = await response.text();
    
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map(m => m[1]).slice(2, 7);
    
    res.status(200).json({ news: titles });
  } catch (error) {
    console.error("Vercel News Error:", error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
}
