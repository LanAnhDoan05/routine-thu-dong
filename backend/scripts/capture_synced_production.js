const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998';

async function main() {
  console.log('Capturing synchronized production evidence...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 }
  });
  const page = await context.newPage();

  // 1. Login to Admin
  console.log('Logging in to Admin...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.fill('input[type="text"], input[type="email"]', 'admin_new@routine.vn');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 2. Capture Admin Dashboard
  console.log('Capturing Admin Dashboard...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_admin_dashboard_synced.png'), fullPage: false });
  console.log('Saved live_prod_admin_dashboard_synced.png');

  // 3. Capture Admin Orders (All 44 Orders)
  console.log('Capturing Admin Orders (All)...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/admin/orders', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_admin_orders_synced.png'), fullPage: false });
  console.log('Saved live_prod_admin_orders_synced.png');

  // 4. Click Tab "Đã hủy" and capture
  console.log('Clicking Tab "Đã hủy"...');
  const cancelledTab = await page.$('button:has-text("Đã hủy")');
  if (cancelledTab) {
    await cancelledTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_admin_orders_cancelled_tab.png'), fullPage: false });
    console.log('Saved live_prod_admin_orders_cancelled_tab.png');
  }

  await browser.close();
  console.log('All live screenshots captured successfully!');
}

main().catch(console.error);
