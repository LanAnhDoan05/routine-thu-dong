const { chromium } = require('playwright');
const path = require('path');

async function captureMobile() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();

  const outDir = 'C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/acceptance_evidence';

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Screenshot mobile header
  await page.screenshot({ path: path.join(outDir, 'mobile_header_routine.png') });
  console.log('Saved mobile_header_routine.png');

  // Open mobile menu drawer
  const menuBtn = await page.$('button[aria-label="Mở menu danh mục"]');
  if (menuBtn) {
    await menuBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'mobile_menu_routine.png') });
    console.log('Saved mobile_menu_routine.png');
  }

  await browser.close();
}

captureMobile().catch(console.error);
