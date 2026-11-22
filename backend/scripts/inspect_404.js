const { chromium } = require('playwright');

async function testRealCategory() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  const bad = [];
  page.on('response', (res) => {
    if (res.status() >= 400) {
      bad.push({ status: res.status(), url: res.url() });
    }
  });

  const res = await page.goto('http://localhost:3000/category/ao', { waitUntil: 'networkidle' });
  console.log('Category /category/ao status:', res.status());
  console.log('Bad responses on /category/ao:', bad);

  await browser.close();
}

testRealCategory();
