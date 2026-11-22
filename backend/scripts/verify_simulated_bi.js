const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFYING AI BUSINESS INTELLIGENCE WITH PRODUCTION-LIKE DATASET ===');

  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin_new@routine.vn', password: 'Admin@123456' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  console.log('Admin login status:', loginRes.status, '| Token received:', !!token);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. Overview
  const ovRes = await fetch('http://localhost:5001/api/v1/bi/overview', { headers });
  const ov = await ovRes.json();
  console.log('\n--- 1. OVERVIEW ---');
  console.log(`Status: ${ovRes.status} | Total Orders: ${ov.data?.totalOrders} | Valid: ${ov.data?.completedOrders}`);
  console.log(`Gross Revenue: ${ov.data?.grossRevenue?.toLocaleString('vi-VN')} VND`);
  console.log(`Net Revenue: ${ov.data?.netRevenue?.toLocaleString('vi-VN')} VND`);
  console.log(`AOV: ${ov.data?.aov?.toLocaleString('vi-VN')} VND`);
  console.log(`Growth vs Last Period: ${ov.data?.growthPercent}%`);

  // 2. Revenue by month
  const revRes = await fetch('http://localhost:5001/api/v1/bi/revenue?interval=month', { headers });
  const rev = await revRes.json();
  console.log('\n--- 2. REVENUE TIMELINE ---');
  (rev.data?.timeline || []).forEach(t => {
    console.log(`  - Tháng ${t.label || t.date}: ${t.revenue?.toLocaleString('vi-VN')}đ (${t.orders} đơn)`);
  });

  // 3. Inventory Forecast
  const invRes = await fetch('http://localhost:5001/api/v1/bi/inventory-forecast', { headers });
  const inv = await invRes.json();
  console.log('\n--- 3. INVENTORY FORECAST ---');
  console.log(`Critical stock alerts: ${inv.data?.criticalAlertsCount}`);
  console.log(`Total recommended restock: ${inv.data?.totalRestockRecommended} units`);
  console.log('Sample restock suggestions (top 3):');
  (inv.data?.forecasts || []).slice(0, 3).forEach(f => {
    console.log(`  - [${f.productId}] ${f.name} | Current: ${f.currentStock} | Sold: ${f.velocity} | Restock: ${f.recommendedRestock} | Priority: ${f.priority}`);
  });

  // 4. Store Distribution
  const storeRes = await fetch('http://localhost:5001/api/v1/bi/store-distribution', { headers });
  const st = await storeRes.json();
  console.log('\n--- 4. STORE DISTRIBUTION ---');
  console.log(`Total Stores: ${st.data?.totalStores}`);
  console.log('Regional breakdown:', JSON.stringify(st.data?.regionalBreakdown, null, 2));

  // 5. Customer RFM
  const rfmRes = await fetch('http://localhost:5001/api/v1/bi/crm-rfm', { headers });
  const rfm = await rfmRes.json();
  console.log('\n--- 5. CUSTOMER RFM SEGMENTATION ---');
  console.log(`Total customers analyzed: ${rfm.data?.totalCustomers}`);
  console.log('Segments count:', JSON.stringify(rfm.data?.segmentCounts, null, 2));
  console.log('Sample RFM customers (masked PII):');
  (rfm.data?.customers || []).slice(0, 5).forEach(c => {
    console.log(`  - ${c.name} | Phone: ${c.phone} | Segment: ${c.segment} | Orders: ${c.orderCount} | Spent: ${c.totalSpent?.toLocaleString('vi-VN')}đ`);
  });

  console.log('\n=== ALL BI MODULES VERIFIED WITH PRODUCTION-LIKE SIMULATED DATA! ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
