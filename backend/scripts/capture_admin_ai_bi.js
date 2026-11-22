const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureAdminBi() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const outDir = 'C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/acceptance_evidence';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Logging in as Admin...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"], input[type="email"]', 'admin_new@routine.vn');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('Navigating to /admin/ai-bi...');
  await page.goto('http://localhost:3000/admin/ai-bi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot 1: AI BI initial view with control bar & action button
  await page.screenshot({ path: path.join(outDir, 'admin_ai_bi_initial.png'), fullPage: false });
  console.log('Saved admin_ai_bi_initial.png');

  // Click on "⚡ PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ" button
  const analyzeBtn = await page.$('button:has-text("PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ")');
  if (analyzeBtn) {
    console.log('Clicking "⚡ PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ"...');
    await analyzeBtn.click();
    await page.waitForTimeout(5000); // Wait for Gemini analysis & DB save

    // Screenshot 2: AI BI analyzed view with 5 groups and recommendations
    await page.screenshot({ path: path.join(outDir, 'admin_ai_bi_analyzed.png'), fullPage: true });
    console.log('Saved admin_ai_bi_analyzed.png');
  } else {
    console.warn('Button "PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ" not found on page!');
  }

  // Screenshot 3: Admin Sidebar and Header with Routine branding
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'admin_dashboard_routine_branding.png'), fullPage: false });
  console.log('Saved admin_dashboard_routine_branding.png');

  await browser.close();
}

captureAdminBi().catch(console.error);
