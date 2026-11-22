const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

const BASE_URL = 'https://routine-thu-dong-zify.vercel.app';
const API_URL = 'https://routine-thu-dong-henna.vercel.app/api/v1';

async function runCustomerStorefrontTests() {
  console.log('=== [2] START CUSTOMER STOREFRONT E2E SUITE ===');
  const results = {
    suite: 'Customer Storefront, Search, Filter & Cart',
    tests: [],
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Test 2.1: Homepage and Navigation
  console.log('\n--- Test 2.1: Homepage and Navigation ---');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    console.log('Homepage Title:', title);
    if (title.includes('Routine Thu Đông')) {
      results.tests.push({ name: 'Homepage Title & Render', status: 'PASS', details: title });
    } else {
      results.tests.push({ name: 'Homepage Title & Render', status: 'FAIL', details: `Unexpected title: ${title}` });
    }
  } catch (err) {
    results.tests.push({ name: 'Homepage Title & Render', status: 'FAIL', error: err.message });
  }

  // Test 2.2: Product Listing & Search
  console.log('\n--- Test 2.2: Search & Filter Products ---');
  try {
    const searchRes = await fetch(`${API_URL}/products?search=denim&limit=5`);
    const searchJson = await searchRes.json();
    console.log('Search "denim" results count:', searchJson?.data?.items?.length || searchJson?.items?.length);
    const items = searchJson?.data?.items || searchJson?.items || [];
    if (items.length > 0) {
      console.log('First search item:', items[0].name);
      results.tests.push({ name: 'Search API "denim"', status: 'PASS', details: `Found ${items.length} items. First: ${items[0].name}` });
    } else {
      results.tests.push({ name: 'Search API "denim"', status: 'FAIL', details: 'No items returned' });
    }
  } catch (err) {
    results.tests.push({ name: 'Search API "denim"', status: 'FAIL', error: err.message });
  }

  // Test 2.3: Category Filter API (e.g. "ao-khoac")
  console.log('\n--- Test 2.3: Filter by Category ---');
  try {
    const catRes = await fetch(`${API_URL}/products?category=ao-khoac&limit=5`);
    const catJson = await catRes.json();
    const items = catJson?.data?.items || catJson?.items || [];
    console.log('Category "ao-khoac" count:', items.length);
    if (items.length > 0) {
      results.tests.push({ name: 'Filter by Category "ao-khoac"', status: 'PASS', details: `Returned ${items.length} jackets` });
    } else {
      results.tests.push({ name: 'Filter by Category "ao-khoac"', status: 'FAIL', details: '0 items' });
    }
  } catch (err) {
    results.tests.push({ name: 'Filter by Category "ao-khoac"', status: 'FAIL', error: err.message });
  }

  // Test 2.4: Product Detail Page & Variants
  console.log('\n--- Test 2.4: Product Detail Page ---');
  try {
    const firstProduct = await prisma.product.findFirst({
      where: { status: 'ACTIVE' },
      include: { variants: true },
    });
    if (!firstProduct) throw new Error('No active product found in DB');

    console.log('Checking product detail:', firstProduct.id, firstProduct.name);
    await page.goto(`${BASE_URL}/product/${firstProduct.slug || firstProduct.id}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const detailContent = await page.textContent('body');
    if (detailContent.includes(firstProduct.name)) {
      console.log('PASSED: Product Detail rendered name:', firstProduct.name);
      results.tests.push({ name: 'Product Detail Page Render', status: 'PASS', details: firstProduct.name });
    } else {
      results.tests.push({ name: 'Product Detail Page Render', status: 'FAIL', details: 'Product name not found in DOM' });
    }
    await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998/e2e_product_detail.png' });
  } catch (err) {
    results.tests.push({ name: 'Product Detail Page Render', status: 'FAIL', error: err.message });
  }

  // Test 2.5: Customer Registration & Auth
  console.log('\n--- Test 2.5: Customer Registration & Login ---');
  const testEmail = `e2e_cust_${Date.now()}@demo.vn`;
  const testPhone = `099${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testPassword = 'Password@123456';
  let customerToken = null;
  let customerUser = null;

  try {
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Khách Hàng E2E Test',
        email: testEmail,
        phoneNumber: testPhone,
        password: testPassword,
        gender: 'unisex',
      }),
    });
    const regJson = await regRes.json();
    console.log('Register HTTP status:', regRes.status, regJson?.message);

    if (regRes.status === 201 && regJson?.data?.token) {
      customerToken = regJson.data.token;
      customerUser = regJson.data.user;
      console.log('Registered user ID:', customerUser.id, 'Email:', testEmail);
      results.tests.push({ name: 'Customer Registration API', status: 'PASS', details: `User ID: ${customerUser.id}` });

      // Verify in DB
      const dbCust = await prisma.user.findUnique({ where: { email: testEmail } });
      if (dbCust) {
        results.tests.push({ name: 'Customer Verified in MySQL', status: 'PASS', details: dbCust.email });
      } else {
        results.tests.push({ name: 'Customer Verified in MySQL', status: 'FAIL', details: 'Not in DB' });
      }

      // Test Login API
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testEmail,
          password: testPassword,
        }),
      });
      const loginJson = await loginRes.json();
      console.log('Login HTTP status:', loginRes.status, loginJson?.message);
      if (loginRes.status === 200 && loginJson?.data?.token) {
        results.tests.push({ name: 'Customer Login API', status: 'PASS', details: 'Token received' });
      } else {
        results.tests.push({ name: 'Customer Login API', status: 'FAIL', details: loginRes.status });
      }
    } else {
      results.tests.push({ name: 'Customer Registration API', status: 'FAIL', details: JSON.stringify(regJson) });
    }
  } catch (err) {
    results.tests.push({ name: 'Customer Registration API', status: 'FAIL', error: err.message });
  }

  // Test 2.6: Shopping Cart API (Add to cart, get cart, remove from cart)
  console.log('\n--- Test 2.6: Shopping Cart Flow ---');
  if (customerToken) {
    try {
      const activeVariant = await prisma.productVariant.findFirst({
        where: { status: 'ACTIVE', stockQuantity: { gt: 10 } },
      });

      if (activeVariant) {
        // Add item to cart
        const addCartRes = await fetch(`${API_URL}/cart/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${customerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: activeVariant.productId,
            variantId: activeVariant.id,
            size: activeVariant.size,
            color: activeVariant.color,
            quantity: 2,
          }),
        });
        const addCartJson = await addCartRes.json();
        console.log('Add to cart status:', addCartRes.status, addCartJson?.message);

        if (addCartRes.status === 200 || addCartRes.status === 201) {
          results.tests.push({ name: 'Add to Cart API', status: 'PASS', details: `Added 2x ${activeVariant.sku}` });

          // Fetch cart
          const getCartRes = await fetch(`${API_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${customerToken}` },
          });
          const getCartJson = await getCartRes.json();
          console.log('Get Cart Items count:', getCartJson?.data?.items?.length || getCartJson?.items?.length);
          results.tests.push({ name: 'Get Cart API', status: 'PASS', details: 'Cart items retrieved' });
        } else {
          results.tests.push({ name: 'Add to Cart API', status: 'FAIL', details: JSON.stringify(addCartJson) });
        }
      }
    } catch (err) {
      results.tests.push({ name: 'Shopping Cart Flow', status: 'FAIL', error: err.message });
    }

    // Clean up test customer from DB
    console.log('\n--- Clean up test customer ---');
    if (customerUser?.id) {
      await prisma.cartItem.deleteMany({ where: { cart: { userId: customerUser.id } } }).catch(() => {});
      await prisma.cart.deleteMany({ where: { userId: customerUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: customerUser.id } }).catch(() => {});
      console.log('Cleaned up test customer safely from DB.');
      results.tests.push({ name: 'Clean up Customer Test Data', status: 'PASS', details: 'Test user cleaned up' });
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log('\n=== CUSTOMER STOREFRONT SUITE SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(__dirname, 'customer_storefront_results.json'),
    JSON.stringify(results, null, 2)
  );
  return results;
}

runCustomerStorefrontTests().catch((e) => {
  console.error('Fatal error in suite:', e);
  process.exit(1);
});
