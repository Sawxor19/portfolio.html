const puppeteer = require('puppeteer');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  
  const filePath = path.join(__dirname, 'og-generator.html');
  await page.goto(pathToFileURL(filePath).href);
  
  await page.screenshot({
    path: path.join(__dirname, 'og-image.png'),
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });
  
  await browser.close();
  console.log('OG image saved as og-image.png');
})();
