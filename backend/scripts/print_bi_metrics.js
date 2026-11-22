const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin_new@routine.vn', password: 'Admin@123456' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const ovRes = await fetch('http://localhost:5001/api/v1/bi/overview', { headers });
  const ov = (await ovRes.json()).data;
  console.log('=== OVERVIEW KPIS ===');
  console.log(`- Total Products: ${ov.totalProducts}`);
  console.log(`- Total Orders: ${ov.totalOrders}`);
  console.log(`- Valid Orders: ${ov.validOrdersCount}`);
  console.log(`- Valid Revenue: ${ov.validRevenue.toLocaleString('vi-VN')} VND`);
  console.log(`- Paid Revenue: ${ov.paidRevenue.toLocaleString('vi-VN')} VND`);
  console.log(`- AOV (Average Order Value): ${ov.aov.toLocaleString('vi-VN')} VND`);
  console.log(`- Total Customers: ${ov.totalCustomers}`);
  console.log(`- Stock: ${ov.inventory.totalStockUnits} units | Value: ${ov.inventory.potentialStockValue.toLocaleString('vi-VN')} VND`);
  console.log(`- Order Status Breakdown:`, ov.orderStatusMap);

  const invRes = await fetch('http://localhost:5001/api/v1/bi/inventory-forecast', { headers });
  const inv = (await invRes.json()).data;
  console.log('\n=== INVENTORY FORECAST ===');
  console.log(`- Products Analyzed: ${inv.summary?.totalAnalyzed}`);
  console.log(`- Critical Alerts: ${inv.summary?.criticalCount}`);
  console.log(`- Total Recommended Units to Restock: ${inv.summary?.totalRecommendedUnits}`);
  console.log('Sample Recommendations:');
  inv.recommendations.slice(0, 3).forEach(r => {
    console.log(`  * [${r.productId}] ${r.name}: Stock: ${r.stockQuantity}, Sold: ${r.soldCount}, Need: ${r.recommendedRestockQty} units (${r.urgency})`);
  });

  const crmRes = await fetch('http://localhost:5001/api/v1/bi/crm-rfm', { headers });
  const crm = (await crmRes.json()).data;
  console.log('\n=== CRM RFM SEGMENTS ===');
  console.log(`- Total Customers in RFM: ${crm.summary?.totalAnalyzed}`);
  console.log(`- Segment Distribution:`, crm.summary?.distribution);
  console.log('Sample Customers:');
  crm.customers.slice(0, 3).forEach(c => {
    console.log(`  * ${c.fullName} (${c.phone}) - Segment: ${c.segment} - Spent: ${c.monetary.toLocaleString('vi-VN')} VND`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
