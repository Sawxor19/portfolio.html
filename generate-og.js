const path = require('path');
const { pathToFileURL } = require('url');

let puppeteer;

try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.error('Puppeteer não está instalado. Instale com `npm install puppeteer` e rode `node generate-og.js` novamente.');
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  
  const filePath = path.join(__dirname, 'og.html');
  await page.goto(pathToFileURL(filePath).href, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        }))
    );
  });
  
  await page.screenshot({
    path: path.join(__dirname, 'og-image-v5.png'),
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });
  
  await browser.close();
  console.log('OG image saved as og-image-v5.png');
})();
