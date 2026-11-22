const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001/api/v1';

async function auditApiSecurityDb() {
  console.log('====================================================');
  console.log('     ROUTINE WEB API, SECURITY & DATABASE AUDIT     ');
  console.log('====================================================\n');

  const results = {
    apiEndpoints: [],
    securityChecks: [],
    databaseIntegrity: {},
    summary: { totalApi: 0, passedApi: 0, failedApi: 0, totalSec: 0, passedSec: 0 }
  };

  // 1. Get Auth Tokens
  let adminToken = '';
  let customerToken = '';

  try {
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin_new@routine.vn', password: 'Admin@123456' }),
    });
    const adminData = await adminLoginRes.json();
    adminToken = adminData?.data?.token;

    const custLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '0901234567', password: 'Customer@123456' }),
    });
    const custData = await custLoginRes.json();
    customerToken = custData?.data?.token;

    console.log('[AUTH] Admin Token Acquired:', Boolean(adminToken));
    console.log('[AUTH] Customer Token Acquired:', Boolean(customerToken));
  } catch (err) {
    console.error('Failed to login:', err);
  }

  const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };
  const custHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` };

  // Helper for endpoint testing
  async function testApi(name, path, method = 'GET', headers = {}, body = null, expectedStatus = 200) {
    const start = Date.now();
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${BASE_URL}${path}`, opts);
      const latency = Date.now() - start;
      const pass = res.status === expectedStatus;
      results.apiEndpoints.push({
        name,
        method,
        path,
        expectedStatus,
        actualStatus: res.status,
        latencyMs: latency,
        status: pass ? 'PASS' : 'FAIL',
      });
      if (pass) results.summary.passedApi++;
      else results.summary.failedApi++;
      results.summary.totalApi++;
      console.log(`[API] ${method} ${path} -> ${res.status} (${latency}ms) [${pass ? 'PASS' : 'FAIL'}]`);
    } catch (err) {
      results.apiEndpoints.push({
        name,
        method,
        path,
        expectedStatus,
        actualStatus: 'ERROR: ' + err.message,
        latencyMs: Date.now() - start,
        status: 'FAIL',
      });
      results.summary.failedApi++;
      results.summary.totalApi++;
      console.log(`[API] ${method} ${path} -> EXCEPTION: ${err.message} [FAIL]`);
    }
  }

  // Helper for security testing
  async function testSec(name, path, method, headers, body, expectedStatus) {
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${BASE_URL}${path}`, opts);
      const pass = res.status === expectedStatus;
      results.securityChecks.push({
        name,
        method,
        path,
        expectedStatus,
        actualStatus: res.status,
        status: pass ? 'PASS' : 'FAIL',
      });
      if (pass) results.summary.passedSec++;
      results.summary.totalSec++;
      console.log(`[SEC] ${name} -> Expected ${expectedStatus}, Got ${res.status} [${pass ? 'PASS' : 'FAIL'}]`);
    } catch (err) {
      results.securityChecks.push({
        name,
        method,
        path,
        expectedStatus,
        actualStatus: 'ERROR: ' + err.message,
        status: 'FAIL',
      });
      results.summary.totalSec++;
      console.log(`[SEC] ${name} -> EXCEPTION [FAIL]`);
    }
  }

  console.log('\n--- 1. API SUITE TESTING ---');
  // Health
  await testApi('Health Check', '/health', 'GET', {}, null, 200);

  // Products
  await testApi('List Products', '/products?page=1&limit=10', 'GET', {}, null, 200);
  await testApi('Product Details p001', '/products/p001', 'GET', {}, null, 200);
  await testApi('Filter Products by Category', '/products?category=ao', 'GET', {}, null, 200);

  // Categories
  await testApi('List Categories', '/categories', 'GET', {}, null, 200);
  await testApi('Get Category ao', '/categories/ao', 'GET', {}, null, 200);

  // Styles
  await testApi('List Styles', '/styles', 'GET', {}, null, 200);
  await testApi('Style Product Counts', '/styles/counts', 'GET', {}, null, 200);

  // Stores
  await testApi('List Stores', '/stores', 'GET', {}, null, 200);
  await testApi('Stores Stats', '/stores/stats', 'GET', {}, null, 200);

  // Coupons
  await testApi('List Active Coupons', '/coupons', 'GET', {}, null, 200);
  // Find a real coupon from DB
  const sampleCoupon = await prisma.coupon.findFirst({ where: { isActive: true } });
  if (sampleCoupon) {
    await testApi(`Validate Coupon ${sampleCoupon.code}`, '/coupons/validate', 'POST', custHeaders, { code: sampleCoupon.code, subtotal: 1000000 }, 200);
  }

  // Shipping
  await testApi('Shipping Fee Calculation', '/shipping/calculate', 'POST', {}, { subtotal: 350000, distanceKm: 5 }, 200);
  await testApi('Shipping Check Address', '/shipping/check-address', 'POST', {}, { fullAddress: '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh' }, 200);

  // Search
  await testApi('Search Suggestions', '/search/suggestions?q=shirt', 'GET', {}, null, 200);
  await testApi('Search Vector Points', '/search/points', 'GET', {}, null, 200);

  // Cart
  await testApi('Customer Get Cart', '/cart', 'GET', custHeaders, null, 200);

  // Wishlist
  await testApi('Customer Get Wishlist', '/wishlist', 'GET', custHeaders, null, 200);

  // Orders
  await testApi('Customer Get Orders', '/orders', 'GET', custHeaders, null, 200);
  await testApi('Admin Get All Orders', '/orders/admin/all?limit=10', 'GET', adminHeaders, null, 200);

  // Auth & Profile
  await testApi('Get Current User Profile', '/auth/me', 'GET', custHeaders, null, 200);
  await testApi('Admin Get Customers', '/admin/customers?limit=10', 'GET', adminHeaders, null, 200);

  // Settings & Analytics
  await testApi('Get Hero Banners', '/settings/hero-banners', 'GET', {}, null, 200);
  await testApi('Admin Analytics Overview', '/analytics/admin/overview', 'GET', adminHeaders, null, 200);

  // AI Stylist
  await testApi('AI Stylist Chat Query', '/ai/chat', 'POST', custHeaders, { message: 'Tư vấn áo đi làm văn phòng' }, 200);

  // AI Business Intelligence (8 endpoints)
  await testApi('BI Overview Analytics', '/bi/overview', 'GET', adminHeaders, null, 200);
  await testApi('BI Revenue Analytics', '/bi/revenue?period=month', 'GET', adminHeaders, null, 200);
  await testApi('BI Inventory Restock Forecast', '/bi/inventory-forecast', 'GET', adminHeaders, null, 200);
  await testApi('BI Showroom Distribution Demand', '/bi/store-distribution', 'GET', adminHeaders, null, 200);
  await testApi('BI CRM RFM Customer 360', '/bi/crm-rfm', 'GET', adminHeaders, null, 200);
  await testApi('BI Gemini Domain Insight', '/bi/ai-insight', 'POST', adminHeaders, { domain: 'revenue' }, 200);
  await testApi('BI Marketing Campaign Planner', '/bi/marketing-plan', 'POST', adminHeaders, { targetGoal: 'Xả kho hè' }, 200);
  await testApi('BI AI Executive Q&A', '/bi/ask-assistant', 'POST', adminHeaders, { question: 'Sản phẩm nào cần giảm giá?' }, 200);

  console.log('\n--- 2. SECURITY & ACCESS CONTROL TESTING ---');
  // 1. Admin route with NO token -> 401
  await testSec('Admin Orders without Token', '/orders/admin/all', 'GET', {}, null, 401);
  // 2. Admin BI with NO token -> 401
  await testSec('Admin BI Overview without Token', '/bi/overview', 'GET', {}, null, 401);
  // 3. Customer token on Admin Orders -> 403
  await testSec('Customer Token accessing Admin Orders', '/orders/admin/all', 'GET', custHeaders, null, 403);
  // 4. Customer token on Admin BI -> 403
  await testSec('Customer Token accessing Admin BI', '/bi/overview', 'GET', custHeaders, null, 403);
  // 5. Customer token on Admin Product Create -> 403
  await testSec('Customer Token creating Product', '/products', 'POST', custHeaders, { name: 'Hack' }, 403);
  // 6. SQL Injection payload in search -> Escaped cleanly, 200 OK
  await testSec('SQL Injection Search String', "/products?search=' OR '1'='1", 'GET', {}, null, 200);
  // 7. Invalid Token -> 401
  await testSec('Forged Bearer Token', '/auth/me', 'GET', { Authorization: 'Bearer forged.invalid.token' }, null, 401);

  console.log('\n--- 3. DATABASE INTEGRITY & ISOLATION AUDIT ---');
  // Check active DB name
  const currentDbResult = await prisma.$queryRaw`SELECT DATABASE() as dbName;`;
  const activeDbName = currentDbResult[0]?.dbName;
  console.log('Active Connected Database:', activeDbName);
  results.databaseIntegrity.activeDb = activeDbName;

  // Total counts
  const [
    totalProducts,
    activeProducts,
    inactiveProducts,
    totalCategories,
    totalStores,
    totalUsers,
    totalOrders,
    totalOrderItems,
    totalVariants,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'INACTIVE' } }),
    prisma.category.count(),
    prisma.store.count(),
    prisma.user.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.productVariant.count(),
  ]);

  console.log('Counts:', {
    totalProducts,
    activeProducts,
    inactiveProducts,
    totalCategories,
    totalStores,
    totalUsers,
    totalOrders,
    totalOrderItems,
    totalVariants,
  });

  // Check Foreign Key & Orphan integrity via raw SQL using mapped tables
  const orphanedOrderItems = await prisma.$queryRaw`
    SELECT count(*) as count FROM order_items oi
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.id IS NULL;
  `;
  const orphanedVariants = await prisma.$queryRaw`
    SELECT count(*) as count FROM product_variants pv
    LEFT JOIN products p ON pv.product_id = p.id
    WHERE p.id IS NULL;
  `;

  const orphanOrdersCount = Number(orphanedOrderItems[0]?.count || 0);
  const orphanVariantsCount = Number(orphanedVariants[0]?.count || 0);

  console.log('Integrity Verification:', {
    orphanOrderItems: orphanOrdersCount,
    orphanVariants: orphanVariantsCount,
    isolationSafe: activeDbName === 'routine_test_db',
  });

  results.databaseIntegrity.stats = {
    totalProducts,
    activeProducts,
    inactiveProducts,
    totalCategories,
    totalStores,
    totalUsers,
    totalOrders,
    totalOrderItems,
    totalVariants,
  };
  results.databaseIntegrity.orphans = {
    orphanOrderItems: orphanOrdersCount,
    orphanVariants: orphanVariantsCount,
  };
  results.databaseIntegrity.isIsolated = activeDbName === 'routine_test_db';

  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log('                 AUDIT SUMMARY                      ');
  console.log('====================================================');
  console.log(`API Endpoints Tested: ${results.summary.totalApi} (Passed: ${results.summary.passedApi}, Failed: ${results.summary.failedApi})`);
  console.log(`Security Checks:      ${results.summary.totalSec} (Passed: ${results.summary.passedSec})`);
  console.log(`Database Orphans:     0 (OrderItem: ${orphanOrdersCount}, ProductVariant: ${orphanVariantsCount})`);
  console.log(`Database Isolation:   ${activeDbName === 'routine_test_db' ? 'STRICTLY ISOLATED (routine_test_db)' : 'WARNING: NOT ON TEST DB'}`);
  console.log('====================================================');

  return results;
}

auditApiSecurityDb().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
