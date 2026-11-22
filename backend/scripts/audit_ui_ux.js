const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile_small', width: 360, height: 800 },
];

const PAGES_TO_TEST = [
  { name: 'home', url: 'http://localhost:3000/', auth: false },
  { name: 'category', url: 'http://localhost:3000/category/ao', auth: false },
  { name: 'search', url: 'http://localhost:3000/search?q=shirt', auth: false },
  { name: 'product_detail', url: 'http://localhost:3000/product/p001', auth: false },
  { name: 'cart', url: 'http://localhost:3000/cart', auth: false },
  { name: 'checkout', url: 'http://localhost:3000/checkout', auth: false },
  { name: 'login', url: 'http://localhost:3000/login', auth: false },
  { name: 'register', url: 'http://localhost:3000/register', auth: false },
  { name: 'ai_stylist', url: 'http://localhost:3000/smart-outfit/ai-stylist', auth: false },
  { name: 'admin_dashboard', url: 'http://localhost:3000/admin', auth: true },
  { name: 'admin_products', url: 'http://localhost:3000/admin/products', auth: true },
  { name: 'admin_product_new', url: 'http://localhost:3000/admin/products/new', auth: true },
  { name: 'admin_orders', url: 'http://localhost:3000/admin/orders', auth: true },
  { name: 'admin_customers', url: 'http://localhost:3000/admin/customers', auth: true },
  { name: 'admin_stores', url: 'http://localhost:3000/admin/stores', auth: true },
  { name: 'admin_vouchers', url: 'http://localhost:3000/admin/vouchers', auth: true },
  { name: 'admin_ai_bi', url: 'http://localhost:3000/admin/ai-bi', auth: true },
];

async function runUiUxAudit() {
  console.log('====================================================');
  console.log('         ROUTINE WEB UI/UX & RESPONSIVE AUDIT       ');
  console.log('====================================================');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const auditReport = [];

  // Step 1: Login to Admin to capture authentication token
  console.log('\n[1/3] Setting up Admin session state...');
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  
  // Login via API to get real token
  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin_new@routine.vn',
      password: 'Admin@123456',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.token;

  await adminPage.goto('http://localhost:3000/login');
  if (token) {
    await adminPage.evaluate((tok) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('routine_token', tok);
      localStorage.setItem('user', JSON.stringify({
        email: 'admin_new@routine.vn',
        role: 'ADMIN',
        fullName: 'Quản Trị Viên Routine',
      }));
    }, token);
  }
  console.log('  -> Admin token injected into localStorage.');

  // Step 2: Audit each page across viewports
  console.log('\n[2/3] Auditing pages across 5 responsive viewports...');

  for (const pageInfo of PAGES_TO_TEST) {
    console.log(`\n--- Auditing: ${pageInfo.name.toUpperCase()} (${pageInfo.url}) ---`);
    const pageResults = {
      name: pageInfo.name,
      url: pageInfo.url,
      requiresAuth: pageInfo.auth,
      viewports: {},
      consoleErrors: [],
      pageErrors: [],
      hasHorizontalOverflow: false,
    };

    const targetContext = pageInfo.auth ? adminContext : await browser.newContext();
    const page = await targetContext.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        pageResults.consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageResults.pageErrors.push(err.message);
    });

    // Test Desktop first and capture full screenshot
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const startTime = Date.now();
      const response = await page.goto(pageInfo.url, { waitUntil: 'load', timeout: 30000 });
      const loadTimeMs = Date.now() - startTime;
      const status = response ? response.status() : 'N/A';

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (overflow) {
        pageResults.hasHorizontalOverflow = true;
      }

      // Capture screenshot for Desktop and Mobile
      if (vp.name === 'desktop' || vp.name === 'mobile') {
        const screenshotPath = path.join(SCREENSHOT_DIR, `${pageInfo.name}_${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }

      pageResults.viewports[vp.name] = {
        status,
        loadTimeMs,
        overflow,
      };

      console.log(`  [${vp.name.toUpperCase()} ${vp.width}x${vp.height}]: HTTP ${status} | Load: ${loadTimeMs}ms | Overflow: ${overflow ? 'YES' : 'NO'}`);
    }

    await page.close();
    if (!pageInfo.auth) {
      await targetContext.close();
    }

    auditReport.push(pageResults);
  }

  // Step 3: Interactive Visual & Action Check on AI BI and AI Stylist
  console.log('\n[3/3] Testing Interactive Features (AI Stylist & AI BI Tabs)...');
  
  // Test AI Stylist Chat
  const stylistPage = await adminContext.newPage();
  await stylistPage.setViewportSize({ width: 1440, height: 900 });
  await stylistPage.goto('http://localhost:3000/smart-outfit/ai-stylist', { waitUntil: 'networkidle' });
  await stylistPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'ai_stylist_initial.png') });
  console.log('  -> AI Stylist page loaded and screenshot captured.');
  await stylistPage.close();

  // Test AI BI Tabs switching
  const biPage = await adminContext.newPage();
  await biPage.setViewportSize({ width: 1440, height: 900 });
  await biPage.goto('http://localhost:3000/admin/ai-bi', { waitUntil: 'networkidle' });
  await biPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_ai_bi_tab_revenue.png') });

  // Click tab Inventory
  const invTab = await biPage.$('button:has-text("Dự Báo & Nhập Hàng")');
  if (invTab) {
    await invTab.click();
    await biPage.waitForTimeout(500);
    await biPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_ai_bi_tab_inventory.png') });
  }

  // Click tab CRM
  const crmTab = await biPage.$('button:has-text("CRM & Khách Hàng RFM")');
  if (crmTab) {
    await crmTab.click();
    await biPage.waitForTimeout(500);
    await biPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_ai_bi_tab_crm.png') });
  }

  // Click tab Assistant
  const astTab = await biPage.$('button:has-text("Trợ Lý AI Quản Trị")');
  if (astTab) {
    await astTab.click();
    await biPage.waitForTimeout(500);
    await biPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_ai_bi_tab_assistant.png') });
  }
  console.log('  -> AI BI 4 tab screenshots captured.');
  await biPage.close();

  await adminContext.close();
  await browser.close();

  // Write audit results JSON
  const resultJsonPath = path.resolve(__dirname, '../../docs/ui_ux_audit_results.json');
  fs.writeFileSync(resultJsonPath, JSON.stringify(auditReport, null, 2), 'utf8');
  console.log(`\nUI/UX Audit complete! Results saved to ${resultJsonPath}`);
  console.log(`Screenshots saved to ${SCREENSHOT_DIR}`);

  return auditReport;
}

runUiUxAudit().catch((err) => {
  console.error('UI/UX Audit Failed:', err);
  process.exit(1);
});
