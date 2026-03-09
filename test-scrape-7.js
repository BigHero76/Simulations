import fs from 'fs';

const html = fs.readFileSync('scrape.html', 'utf8');
const priceIndex = html.indexOf('class="YMlKec fxKbKc"');
if (priceIndex === -1) process.exit();

const searchArea = html.substring(priceIndex, priceIndex + 2000);

// Google finance change format is usually something like: +12.30 (1.45%) or -5.60 (-0.23%)
console.log("--- SEARCH AREA START ---");
// Let's print out all texts that match an explicit percentage like (1.23%)
const pcts = searchArea.match(/\([-+]?[0-9,.]+%\)/g);
console.log("Percentages found:", pcts);

// Let's strip all HTML tags from the search area and look at the raw text 
const textOnly = searchArea.replace(/<[^>]+>/g, '|');
console.log("Text only blocks: ");
const parts = textOnly.split('|').map(s=>s.trim()).filter(s=>s.length > 0);
console.log(parts.slice(0, 30));
