const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyBrowser() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const screenshotsDir = path.resolve(__dirname, '../../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Navigating to http://localhost:3000 (Storefront Home)...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Scroll down to products grid
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(2000);

  // Take Desktop Storefront screenshot
  const homeShot = path.join(screenshotsDir, 'storefront_home_recovered_images.png');
  await page.screenshot({ path: homeShot });
  console.log('Saved Desktop Storefront screenshot:', homeShot);

  // Check product images on home page
  const imagesInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('a[href^="/product/"]'));
    return cards.map(c => {
      const name = c.querySelector('span[class*="name"]')?.textContent?.trim() || '';
      const img = c.querySelector('img');
      const placeholder = c.querySelector('div[role="img"]');
      return {
        name,
        imgSrc: img ? img.src : null,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        isDisplayed: img ? window.getComputedStyle(img).display !== 'none' : false,
        hasPlaceholderDiv: !!placeholder
      };
    });
  });

  console.log('\n--- Home Page Product Cards Image Status ---');
  let realCount = 0;
  for (const info of imagesInfo.slice(0, 15)) {
    const isReal = info.isDisplayed && info.naturalWidth > 50 && !info.imgSrc?.includes('svg');
    if (isReal) realCount++;
    console.log(`[${isReal ? 'REAL' : 'FAIL'}] ${info.name}: src=${info.imgSrc} (${info.naturalWidth}x${info.naturalHeight})`);
  }
  console.log(`Real photos rendered on home: ${realCount} / ${imagesInfo.length} sample cards`);

  // Mobile viewport screenshot
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.evaluate(() => window.scrollBy(0, 600));
  await mobilePage.waitForTimeout(1500);
  const mobileShot = path.join(screenshotsDir, 'storefront_mobile_recovered_images.png');
  await mobilePage.screenshot({ path: mobileShot });
  console.log('Saved Mobile Storefront screenshot:', mobileShot);

  // Verify Product Detail p022 (Leather Belt - from user screenshot)
  console.log('\nNavigating to /product/p022 (Leather Belt)...');
  await page.goto('http://localhost:3000/product/p022', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const p022Shot = path.join(screenshotsDir, 'product_p022_leather_belt_recovered.png');
  await page.screenshot({ path: p022Shot });
  console.log('Saved Product p022 screenshot:', p022Shot);

  // Verify Product Detail p003 (Classic White Shirt)
  console.log('\nNavigating to /product/p003 (Classic White Shirt)...');
  await page.goto('http://localhost:3000/product/p003', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const p003Shot = path.join(screenshotsDir, 'product_p003_white_shirt_recovered.png');
  await page.screenshot({ path: p003Shot });
  console.log('Saved Product p003 screenshot:', p003Shot);

  await browser.close();
  console.log('\nAll browser verifications finished successfully.');
}

verifyBrowser().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
