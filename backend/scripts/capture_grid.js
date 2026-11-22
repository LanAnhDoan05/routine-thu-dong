const { chromium } = require('playwright');
const path = require('path');

async function captureProductGrid() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Scroll to find the product card with 'Leather Belt' or 'Chunky Sneakers'
  const beltCard = page.locator('text="Leather Belt"').first();
  if (await beltCard.count() > 0) {
    await beltCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    // scroll a bit up so the whole card and neighbors are visible
    await page.evaluate(() => window.scrollBy(0, -150));
    await page.waitForTimeout(1000);

    const shotPath = path.resolve(__dirname, '../../docs/screenshots/storefront_product_grid_belt_sneakers.png');
    await page.screenshot({ path: shotPath });
    console.log('Saved product grid screenshot:', shotPath);
  } else {
    console.log('Leather Belt card not found by text on initial view, scrolling down...');
    await page.evaluate(() => window.scrollBy(0, 1800));
    await page.waitForTimeout(1500);
    const shotPath = path.resolve(__dirname, '../../docs/screenshots/storefront_product_grid_scrolled.png');
    await page.screenshot({ path: shotPath });
    console.log('Saved scrolled product grid screenshot:', shotPath);
  }

  await browser.close();
}

captureProductGrid().catch(console.error);
