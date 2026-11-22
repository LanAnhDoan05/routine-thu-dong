const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const prisma = require('./src/config/prisma');

async function run() {
  console.log('[1] Fetching admin user from DB...');
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });
  if (!adminUser) throw new Error('No admin user found in database!');
  console.log('Admin user found:', adminUser.email, adminUser.fullName);

  const token = jwt.sign(
    {
      userId: adminUser.id,
      email: adminUser.email,
      phoneNumber: adminUser.phoneNumber,
      role: 'ADMIN',
    },
    process.env.JWT_SECRET || 'routine-jwt-secret-key-super-secure-2026-production-token',
    { expiresIn: '7d' }
  );

  console.log('[2] Launching browser using system Chrome...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Listen to console and request errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('[3] Loading homepage https://routine-thu-dong-zify.vercel.app/ ...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Scroll down to Featured Collection section
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998/live_homepage_products.png',
  });
  console.log('Homepage screenshot captured!');

  console.log('[4] Navigating to Admin Products...');
  // Set admin localStorage
  await page.evaluate(({ token, adminUser }) => {
    localStorage.setItem('routine_admin_token', token);
    localStorage.setItem('routine_admin_user', JSON.stringify({
      id: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.fullName,
      role: 'ADMIN',
    }));
  }, { token, adminUser });

  await page.goto('https://routine-thu-dong-zify.vercel.app/admin/products', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: 'C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998/live_admin_products.png',
  });
  console.log('Admin Products screenshot captured!');

  console.log('[5] Navigating to Admin Dashboard...');
  await page.goto('https://routine-thu-dong-zify.vercel.app/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: 'C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998/live_admin_dashboard.png',
  });
  console.log('Admin Dashboard screenshot captured!');

  await browser.close();
  await prisma.$disconnect();
  console.log('Verification finished successfully!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
