import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());

// Fetch Google Finance
app.get('/api/finance/quote', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ error: 'Missing symbols' });

  try {
    const symbolList = symbols.split(',');
    const results = [];
    
    for (const sym of symbolList) {
      // Google Finance URL format (e.g., RELIANCE:NSE)
      const cleanSym = sym.replace('.NS', '').replace('^NSEI', 'NIFTY_50').replace('^BSESN', 'SENSEX').replace('^NSEBANK', 'NIFTY_BANK').replace('^CNXIT', 'NIFTY_IT');
      let url = `https://www.google.com/finance/quote/${cleanSym}:NSE`;
      if (cleanSym.includes('NIFTY') || cleanSym === 'SENSEX') {
         url = `https://www.google.com/finance/quote/${cleanSym}:INDEXNSE`;
      }
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = await response.text();
      
      // Basic scraping of Google Finance HTML for price and change
      // Price is usually in a div with data-last-price attr or specific classes like YMlKec fxKbKc
      const priceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>₹?([0-9,.]+)</);
      const chgMatch = html.match(/class="JwB6zf"[^>]*>([+-]?[0-9,.]+)</);
      const pctMatch = html.match(/class="JwB6zf"[^>]*>.*?\(([+-]?[0-9,.]+)%\)</);
      
      if (priceMatch) {
         const priceStr = priceMatch[1].replace(/,/g, '');
         const price = parseFloat(priceStr);
         const changeStr = chgMatch ? chgMatch[1].replace(/,/g, '') : "0";
         let change = parseFloat(changeStr);
         // Google sometimes shows positive change without +, but handles negative with -
         if (html.includes('class="JwB6zf" aria-label="Down by')) change = -Math.abs(change);
         const pctStr = pctMatch ? pctMatch[1] : "0";
         let pct = parseFloat(pctStr);
         if (html.includes('class="JwB6zf" aria-label="Down by')) pct = -Math.abs(pct);
         
         results.push({
            symbol: sym,
            regularMarketPrice: price,
            regularMarketChange: change,
            regularMarketChangePercent: pct,
            regularMarketVolume: null, // Scraped volume is harder, omit for simplicity
            marketCap: null
         });
      }
    }
    
    res.json({ quoteResponse: { result: results } }); // mock yahoo structure so frontend doesn't break
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch from Google Finance' });
  }
});

app.listen(port, () => {
  console.log(`Backend proxy running on http://localhost:${port}`);
});
