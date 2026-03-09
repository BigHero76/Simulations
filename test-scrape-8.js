import fs from 'fs';

const html = fs.readFileSync('scrape.html', 'utf8');

const priceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>₹?([0-9,.]+)</);

if (!priceMatch) {
   console.log("No price match");
   process.exit();
}

console.log("Matched Price:", priceMatch[1]);

const afterPrice = html.substring(priceMatch.index + priceMatch[0].length, priceMatch.index + 2000);
const textOnly = afterPrice.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

console.log("Stripped text:", textOnly.substring(0, 50));

const chgRegex = /([+-]?\s*[0-9,.]+)\s*\(\s*([+-]?\s*[0-9,.]+)%\s*\)/;
const chgMatch = textOnly.match(chgRegex);

if (chgMatch) {
    console.log("Change:", chgMatch[1].replace(/\s/g, ''));
    console.log("Pct:", chgMatch[2].replace(/\s/g, ''));
} else {
    // try finding just the percentage
    const pctOnly = textOnly.match(/([+-]?\s*[0-9,.]+)%/);
    console.log("Only pct found:", pctOnly);
}
