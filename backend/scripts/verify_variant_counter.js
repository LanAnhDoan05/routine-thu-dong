const { chromium } = require('playwright');
const path = require('path');

async function testVariantCounter() {
  console.log('[TEST] Starting Variant Counter verification via real Chrome...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  [Browser Error]:', msg.text());
    }
  });

  try {
    // 1. Login Admin through UI form
    console.log('[TEST 1/5] Logging into Admin via UI form...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[placeholder*="Nhập số điện thoại hoặc email"]', 'admin_new@routine.vn');
    await page.fill('input[placeholder*="Nhập mật khẩu của bạn"]', 'Admin@123456');
    await page.click('button:has-text("Đăng nhập")');
    
    // Wait for redirect to admin products
    await page.waitForURL('**/admin/products', { timeout: 10000 });
    await page.waitForSelector('a[href="/admin/products/new"]', { timeout: 10000 });
    console.log('[TEST 2/5] Logged in successfully. Current URL:', page.url());

    // 2. Go to Add Product page
    console.log('[TEST 3/5] Navigating to Add Product page (/admin/products/new)...');
    await page.click('a[href="/admin/products/new"]');
    await page.waitForURL('**/admin/products/new', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Check initial counter text
    let counterText = await page.textContent('span:has-text("Đã tạo")');
    console.log('  -> Initial counter text:', counterText?.trim());

    // 3. Select 2 colors (Navy and Denim Blue, matching user's screenshot)
    console.log('[TEST 4/5] Selecting 2 colors (Navy & Denim Blue)...');
    const navyBtn = await page.$('button[class*="swatchCircleBtn"][title*="Navy" i]');
    if (navyBtn) {
      await navyBtn.click();
      console.log('  -> Clicked Navy swatchCircleBtn.');
    }
    await page.waitForTimeout(300);

    const denimBtn = await page.$('button[class*="swatchCircleBtn"][title*="Denim" i]');
    if (denimBtn) {
      await denimBtn.click();
      console.log('  -> Clicked Denim Blue swatchCircleBtn.');
    }
    await page.waitForTimeout(300);

    // 4. Select 4 sizes (XS, S, M, L, matching user\'s screenshot)
    console.log('[TEST 5/5] Selecting 4 sizes (XS, S, M, L)...');
    for (const sizeName of ['XS', 'S', 'M', 'L']) {
      const sizeBtn = await page.$(`button:text-is("${sizeName}")`);
      if (sizeBtn) {
        await sizeBtn.click();
        console.log(`  -> Clicked size ${sizeName}.`);
        await page.waitForTimeout(200);
      }
    }

    // 5. Check updated counter text
    counterText = await page.textContent('span:has-text("Đã tạo")');
    console.log('\n[RESULT] Counter text after selection:', counterText?.trim());

    // 6. Check if table rows exist
    const rows = await page.$$('table tbody tr');
    console.log(`[RESULT] Generated variant table rows count: ${rows.length}`);

    // Take high-resolution screenshot as proof
    const screenshotPath = path.join(__dirname, '../../docs/screenshots/admin_variant_counter_fixed.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[RESULT] Screenshot saved to ${screenshotPath}`);

    // Verify: 2 colors * 4 sizes = 8 variants
    const pass = rows.length === 8 && counterText.includes('8 biến thể');
    console.log(`\n================================================================`);
    console.log(`[VERIFICATION] ${pass ? 'PASS: Bộ đếm nhảy chính xác lên 8 biến thể (2 màu × 4 size) & bảng 8 hàng xuất hiện!' : 'FAIL'}`);
    console.log(`================================================================\n`);

    await browser.close();
    process.exit(pass ? 0 : 1);
  } catch (err) {
    console.error('[TEST] Error during verification:', err);
    await browser.close();
    process.exit(1);
  }
}

testVariantCounter();
