import fs from 'fs';

const html = fs.readFileSync('scrape.html', 'utf8');

// The price is usually followed by the change.
// Find the exact price text position:
const priceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>₹?([0-9,.]+)</);
if (!priceMatch) {
  console.log("Price not found");
  process.exit();
}

console.log("Found Price:", priceMatch[1]);
const index = html.indexOf(priceMatch[0]);

// Look at the next 500 characters
const afterPrice = html.substring(index, index + 500);
console.log("\n--- RAW HTML AFTER PRICE ---");
console.log(afterPrice.replace(/\n/g, ''));

// Strip tags and log
const stripped = afterPrice.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
console.log("\n--- STRIPPED TEXT AFTER PRICE ---");
console.log(stripped);
