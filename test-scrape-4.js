import fs from 'fs';

const html = fs.readFileSync('scrape.html', 'utf8');

// Find percentages in the HTML
const pctRegex = /([0-9,.]+)%/g;
let match;
const matches = new Set();
while ((match = pctRegex.exec(html)) !== null) {
  matches.add(match[0]);
}

console.log("Found percentages:", Array.from(matches));

// Let's find the specific block where "1dayTab" is or similar
const strIndex = html.indexOf('%');
if (strIndex !== -1) {
    const snippet = html.substring(strIndex - 100, strIndex + 100);
    // console.log("Some percentage context:", snippet);
}

// Another way, search for JS3uyc or similar classes
const allDivs = html.match(/<div [^>]*>.*?<\/div>/g) || [];
allDivs.forEach(div => {
    if (div.includes('%')) {
       // console.log("Div with percent:", div);
    }
});

const chgBlocks = html.match(/<div class="JwB6zf"[^>]*>.*?<\/div>/g);
console.log("Old class JwB6zf:", chgBlocks ? chgBlocks.length : 0);

// Search for another common class like "P2Luy" or "Vzz5Xb"
const newChgBlocks = html.match(/class="[^"]*".*?\([+-]?[0-9,.]+%\)/g);
console.log("Elements with percentages:", newChgBlocks ? newChgBlocks.slice(0, 5) : 'None');
