const { chromium } = require('playwright');
const path = require('path');

async function checkCategories() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const categories = ['ao', 'quan', 'phu-kien', 'vay'];
  for (const cat of categories) {
    console.log(`Checking /category/${cat}...`);
    await page.goto(`http://localhost:3000/category/${cat}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    const cards = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('a[href^="/product/"]'));
      return items.map(c => {
        const name = c.querySelector('span[class*="name"]')?.textContent?.trim() || '';
        const img = c.querySelector('img');
        return {
          name,
          src: img ? img.src : null,
          isReal: img ? (img.naturalWidth > 50 && !img.src.includes('svg')) : false
        };
      });
    });

    const realCards = cards.filter(c => c.isReal);
    console.log(`  -> ${realCards.length}/${cards.length} cards rendering real photos`);
    if (cards.length > 0 && realCards.length < cards.length) {
      console.warn(`  [WARN] Some cards failed:`, cards.filter(c => !c.isReal));
    }
  }

  await browser.close();
  console.log('Category check completed!');
}

checkCategories().catch(console.error);
