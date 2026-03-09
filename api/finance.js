export default async function handler(req, res) {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ error: 'Missing symbols' });

  // Add CORS for generic usage
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const symbolList = symbols.split(',');
    const results = [];
    
    for (const sym of symbolList) {
      // Clean symbol routing rules
      const cleanSym = sym.replace('.NS', '').replace('^NSEI', 'NIFTY_50').replace('^BSESN', 'SENSEX').replace('^NSEBANK', 'NIFTY_BANK').replace('^CNXIT', 'NIFTY_IT');
      let url = `https://www.google.com/finance/quote/${cleanSym}:NSE`;
      if (cleanSym.includes('NIFTY') || cleanSym === 'SENSEX') {
         url = `https://www.google.com/finance/quote/${cleanSym}:INDEXNSE`;
      }
      
      // Node 18+ native fetch
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = await response.text();
      
      const priceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>₹?([0-9,.]+)</);
      const chgMatch = html.match(/class="JwB6zf"[^>]*>([+-]?[0-9,.]+)</);
      const pctMatch = html.match(/class="JwB6zf"[^>]*>.*?\(([+-]?[0-9,.]+)%\)</);
      
      if (priceMatch) {
         const priceStr = priceMatch[1].replace(/,/g, '');
         const price = parseFloat(priceStr);
         const changeStr = chgMatch ? chgMatch[1].replace(/,/g, '') : "0";
         let change = parseFloat(changeStr);
         if (html.includes('class="JwB6zf" aria-label="Down by')) change = -Math.abs(change);
         const pctStr = pctMatch ? pctMatch[1] : "0";
         let pct = parseFloat(pctStr);
         if (html.includes('class="JwB6zf" aria-label="Down by')) pct = -Math.abs(pct);
         
         results.push({
            symbol: sym,
            regularMarketPrice: price,
            regularMarketChange: change,
            regularMarketChangePercent: pct,
            regularMarketVolume: null,
            marketCap: null
         });
      }
    }
    
    res.status(200).json({ quoteResponse: { result: results } });
  } catch (error) {
    console.error("Vercel Function Error:", error);
    res.status(500).json({ error: 'Failed to proxy to Google Finance' });
  }
}
