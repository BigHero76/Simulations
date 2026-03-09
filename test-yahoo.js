import fetch from 'node-fetch';

async function testYahoo() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS';
  const response = await fetch(url);
  const json = await response.json();
  
  if (json.chart.result && json.chart.result.length > 0) {
     const meta = json.chart.result[0].meta;
     console.log("Symbol:", meta.symbol);
     console.log("Previous Close", meta.previousClose);
     console.log("Current Price:", meta.regularMarketPrice);
     const change = meta.regularMarketPrice - meta.previousClose;
     const pct = (change / meta.previousClose) * 100;
     console.log("Change:", change.toFixed(2));
     console.log("Pct Change:", pct.toFixed(2) + "%");
  } else {
     console.log("Error or no results", json);
  }
}

testYahoo();
