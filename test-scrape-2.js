import fs from 'fs';

const html = fs.readFileSync('scrape.html', 'utf8');
const priceIndex = html.indexOf('class="YMlKec fxKbKc"');
if (priceIndex !== -1) {
  // Extract 1000 characters around the price
  const snippet = html.substring(priceIndex - 50, priceIndex + 1000);
  console.log(snippet);
} else {
  console.log("Price not found");
}
