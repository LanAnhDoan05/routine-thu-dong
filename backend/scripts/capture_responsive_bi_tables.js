const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testResponsiveTables() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const outDir = 'C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/acceptance_evidence';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const viewports = [
    { name: 'desktop_1920', width: 1920, height: 1080, isMobile: false },
    { name: 'desktop_1440', width: 1440, height: 900, isMobile: false },
    { name: 'laptop_1366', width: 1366, height: 768, isMobile: false },
    { name: 'tablet_768', width: 768, height: 1024, isMobile: true },
    { name: 'mobile_390', width: 390, height: 844, isMobile: true }
  ];

  console.log('Logging in once to save storage state...');
  const setupContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const setupPage = await setupContext.newPage();
  await setupPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await setupPage.fill('input[type="text"], input[type="email"]', 'admin_new@routine.vn');
  await setupPage.fill('input[type="password"]', 'Admin@123456');
  await setupPage.click('button[type="submit"]');
  await setupPage.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await setupPage.waitForTimeout(2000);

  const storageState = await setupContext.storageState();
  await setupContext.close();

  const results = [];

  for (const vp of viewports) {
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      storageState
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/admin/ai-bi', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Check horizontal overflow of the entire document
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const hasDocOverflow = scrollWidth > clientWidth || bodyScrollWidth > clientWidth;

    // Check table containers
    const tableWrappers = await page.$$('[class*="dashboardTableWrapper"]');
    console.log(`Found ${tableWrappers.length} table wrappers at ${vp.name}`);

    // Verify all 4 column headers in Table 1
    const table1Headers = await page.$$eval('[class*="dashboardTablesGrid"] table:nth-of-type(1) th', ths => ths.map(t => t.textContent.trim()));
    // Verify all 4 column headers in Table 2
    const table2Headers = await page.$$eval('[class*="dashboardTablesGrid"] table:nth-of-type(2) th', ths => ths.map(t => t.textContent.trim()));

    console.log(`Table 1 headers: ${JSON.stringify(table1Headers)}`);
    console.log(`Table 2 headers: ${JSON.stringify(table2Headers)}`);

    // Capture screenshot of the tables section
    const tablesSection = await page.$('[class*="dashboardTablesGrid"]');
    if (tablesSection) {
      await tablesSection.screenshot({ path: path.join(outDir, `bi_tables_${vp.name}.png`) });
      console.log(`Saved bi_tables_${vp.name}.png`);
    } else {
      console.warn(`Could not find tablesSection selector on ${vp.name}`);
    }

    // Capture full viewport screenshot
    await page.screenshot({ path: path.join(outDir, `ai_bi_full_${vp.name}.png`), fullPage: false });
    console.log(`Saved ai_bi_full_${vp.name}.png`);

    results.push({
      viewport: vp.name,
      width: vp.width,
      hasDocOverflow,
      table1Headers,
      table2Headers
    });

    await context.close();
  }

  await browser.close();
  console.log('\n--- RESPONSIVE TEST RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
}

testResponsiveTables().catch(console.error);
