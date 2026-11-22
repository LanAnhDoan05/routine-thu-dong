const { chromium } = require('playwright');
const path = require('path');

async function captureMobileGrid() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const beltCard = page.locator('text="Leather Belt"').first();
  if (await beltCard.count() > 0) {
    await beltCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollBy(0, -100));
    await page.waitForTimeout(1000);
    const shotPath = path.resolve(__dirname, '../../docs/screenshots/storefront_mobile_product_grid.png');
    await page.screenshot({ path: shotPath });
    console.log('Saved mobile product grid screenshot:', shotPath);
  }

  await browser.close();
}

captureMobileGrid().catch(console.error);
