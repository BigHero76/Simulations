import fs from 'fs';

const html = fs.readFileSync('scrape.html', 'utf8');
const priceIndex = html.indexOf('class="YMlKec fxKbKc"');
if (priceIndex !== -1) {
  let snippet = html.substring(priceIndex - 50, priceIndex + 1500);
  // insert newlines after brackets to make it readable
  snippet = snippet.replace(/>/g, '>\n');
  fs.writeFileSync('snippet.txt', snippet);
}
