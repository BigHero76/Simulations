import fs from 'fs';
import fetch from 'node-fetch';

async function test() {
  const url = 'https://www.google.com/finance/quote/RELIANCE:NSE';
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  const html = await response.text();
  fs.writeFileSync('scrape.html', html);
  console.log("Saved scrape.html");
}

test();
