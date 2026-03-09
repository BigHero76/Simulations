import fs from 'fs';

const html = fs.readFileSync('scrape.html', 'utf8');

const priceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>₹?([0-9,.]+)</);
if (!priceMatch) {
  process.exit();
}

const index = html.indexOf(priceMatch[0]);
const afterPrice = html.substring(index, index + 3000); // Take more

// Let's find exactly the span or div with the % text
let lines = [];
const chgMatch = html.match(/class="[^"]*".*?>([+-]?[0-9,.]+)<\/span>.*?<span class="[^"]*".*?>\(([+-]?[0-9,.]+)%\)<\/span>/);
if (chgMatch) {
   lines.push("Found specific span match: " + chgMatch[0]);
}

// Just dump all percent fragments to see what tags wrap them
const pctRegex = /<([^>]+)>([^<]*[0-9,.]+%[^<]*)<\//g;
let match;
while ((match = pctRegex.exec(html)) !== null) {
  lines.push(`Tag: <${match[1]}> Text: ${match[2]}`);
}

fs.writeFileSync('test-scrape-5-out.txt', lines.join("\n"));
