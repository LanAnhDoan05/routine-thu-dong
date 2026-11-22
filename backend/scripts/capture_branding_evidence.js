const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const outDir = 'C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/acceptance_evidence';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Header screenshot
  const header = await page.$('header');
  if (header) {
    await header.screenshot({ path: path.join(outDir, 'header_routine_brand_verified.png') });
    console.log('Saved header_routine_brand_verified.png');
  }

  // 2. Full top view screenshot
  await page.screenshot({ path: path.join(outDir, 'homepage_routine_verified.png'), fullPage: false });
  console.log('Saved homepage_routine_verified.png');

  // 3. Admin AI BI page overview screenshot
  try {
    await page.goto('http://localhost:3000/admin/ai-bi', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'ai_bi_page_routine_verified.png'), fullPage: false });
    console.log('Saved ai_bi_page_routine_verified.png');
  } catch (e) {
    console.error('Error capturing admin AI BI:', e.message);
  }

  await browser.close();
}

capture().catch(console.error);
