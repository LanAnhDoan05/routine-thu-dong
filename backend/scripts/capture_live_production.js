const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998';

async function main() {
  console.log('Launching browser to capture live production evidence...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Capture Homepage Featured Collection
  console.log('Navigating to homepage...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_homepage.png'), fullPage: false });
  console.log('Saved live_prod_homepage.png');

  // 2. Scroll to footer and capture TikTok link
  const footer = await page.$('footer');
  if (footer) {
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_footer_tiktok.png') });
    console.log('Saved live_prod_footer_tiktok.png');
  }

  // 3. Login to Admin
  console.log('Navigating to login...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Fill login
  await page.fill('input[type="text"], input[type="email"]', 'admin_new@routine.vn');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 4. Capture Admin Dashboard
  console.log('Navigating to admin dashboard...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_admin_dashboard.png'), fullPage: false });
  console.log('Saved live_prod_admin_dashboard.png');

  // 5. Capture Admin Products
  console.log('Navigating to admin products...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/admin/products', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_admin_products.png'), fullPage: false });
  console.log('Saved live_prod_admin_products.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(console.error);
