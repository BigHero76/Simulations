// Fetch Yahoo Finance News RSS in Vercel Serverless
// Supports multiple symbols via ?symbols=SYM1,SYM2 or single ?symbol=SYM
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Support both ?symbol=X and ?symbols=X,Y,Z
  const symbolParam = req.query.symbols || req.query.symbol;
  if (!symbolParam) return res.status(400).json({ error: 'Missing symbol(s)' });

  const symbols = symbolParam.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const results = {};

    await Promise.all(symbols.map(async (sym) => {
      try {
        const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${sym}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return;
        const xml = await response.text();

        // Parse titles and pubDates from RSS items
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
          const itemXml = match[1];
          const titleMatch = itemXml.match(/<title>(.*?)<\/title>/);
          const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
          const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
          if (titleMatch) {
            items.push({
              title: titleMatch[1],
              pubDate: dateMatch ? dateMatch[1] : null,
              link: linkMatch ? linkMatch[1] : null,
            });
          }
        }

        // Clean symbol name (remove .NS/.BO suffix for display)
        const cleanSym = sym.replace('.NS', '').replace('.BO', '');
        results[cleanSym] = items.slice(0, 10);
      } catch (err) {
        console.error(`News fetch error for ${sym}:`, err.message);
      }
    }));

    res.status(200).json({ news: results });
  } catch (error) {
    console.error("Vercel News Error:", error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
}
