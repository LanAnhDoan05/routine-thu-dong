const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  const outDir = 'C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/acceptance_evidence';

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"], input[type="email"]', 'admin_new@routine.vn');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('Navigating to /admin/ai-bi...');
  await page.goto('http://localhost:3000/admin/ai-bi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Capture full page with 5 groups and recommendations
  await page.screenshot({ path: path.join(outDir, 'admin_ai_bi_rendered_full.png'), fullPage: true });
  console.log('Saved admin_ai_bi_rendered_full.png');

  // Test updating status of first recommendation to COMPLETED
  const completeBtn = await page.$('button:has-text("Đã hoàn thành")');
  if (completeBtn) {
    console.log('Clicking "Đã hoàn thành"...');
    await completeBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'admin_ai_bi_status_updated.png'), fullPage: false });
    console.log('Saved admin_ai_bi_status_updated.png');
  }

  await browser.close();
}

capture().catch(console.error);
