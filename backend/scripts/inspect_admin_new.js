const { chromium } = require('playwright');

async function inspect() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  page.on('console', (msg) => {
    console.log('[BROWSER LOG]:', msg.text());
  });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[placeholder*="Nhập số điện thoại hoặc email"]', 'admin_new@routine.vn');
  await page.fill('input[placeholder*="Nhập mật khẩu của bạn"]', 'Admin@123456');
  await page.click('button:has-text("Đăng nhập")');
  
  // Wait until we are on /admin/products and the page has actually rendered
  await page.waitForURL('**/admin/products', { timeout: 10000 });
  await page.waitForSelector('a[href="/admin/products/new"]', { timeout: 10000 });
  console.log('Admin Products page rendered successfully. Current URL:', page.url());

  // Click Add Product link
  console.log('Clicking Add Product link...');
  await page.click('a[href="/admin/products/new"]');
  await page.waitForURL('**/admin/products/new', { timeout: 10000 });
  await page.waitForTimeout(1000);
  console.log('Successfully navigated to:', page.url());

  const counterText = await page.textContent('span:has-text("Đã tạo")');
  console.log('Counter Text:', counterText?.trim());

  await browser.close();
}

inspect();
