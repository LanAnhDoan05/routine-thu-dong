const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DATABASE AUDIT: routine_test_db ===');
  
  // 1. Users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      role: true,
      source: true,
      createdAt: true,
      _count: {
        select: { orders: true, addresses: true, reviews: true }
      }
    }
  });
  console.log(`\n--- USERS (${users.length}) ---`);
  users.forEach(u => {
    console.log(`[${u.role}] ${u.email} | ${u.fullName} | Phone: ${u.phoneNumber} | Source: ${u.source} | Orders: ${u._count.orders} | Addrs: ${u._count.addresses}`);
  });

  // 2. Orders summary
  const orderCount = await prisma.order.count();
  const ordersByStatus = await prisma.order.groupBy({
    by: ['orderStatus'],
    _count: { id: true },
    _sum: { total: true }
  });
  console.log(`\n--- ORDERS SUMMARY (${orderCount} total) ---`);
  ordersByStatus.forEach(o => {
    console.log(`Status: ${o.orderStatus.padEnd(12)} | Count: ${o._count.id} | Sum Total: ${o._sum.total?.toLocaleString('vi-VN')} VND`);
  });

  // 3. Orders by attribution source
  const ordersBySource = await prisma.order.groupBy({
    by: ['attributionSource'],
    _count: { id: true },
    _sum: { total: true }
  });
  console.log(`\n--- ORDERS BY ATTRIBUTION SOURCE ---`);
  ordersBySource.forEach(o => {
    console.log(`Source: ${(o.attributionSource || 'NULL').padEnd(15)} | Count: ${o._count.id} | Sum: ${o._sum.total?.toLocaleString('vi-VN')} VND`);
  });

  // 4. Products & Variants
  const productCount = await prisma.product.count();
  const activeProducts = await prisma.product.count({ where: { status: 'ACTIVE' } });
  const inactiveProducts = await prisma.product.count({ where: { status: 'INACTIVE' } });
  const variantCount = await prisma.productVariant.count();
  console.log(`\n--- PRODUCTS & VARIANTS ---`);
  console.log(`Products total: ${productCount} (Active: ${activeProducts}, Inactive: ${inactiveProducts}) | Variants: ${variantCount}`);

  // 5. Stores & Shipping rules
  const storeCount = await prisma.store.count();
  const shippingRuleCount = await prisma.shipping_rules.count();
  const rules = await prisma.shipping_rules.findMany();
  console.log(`\n--- STORES & SHIPPING RULES ---`);
  console.log(`Stores: ${storeCount} | Shipping rules: ${shippingRuleCount}`);
  rules.forEach(r => {
    console.log(`Rule [${r.id}] ${r.city} (${r.region}) - Base: ${r.base_fee}đ - Free threshold: ${r.free_ship_threshold}đ - ETA: ${r.estimated_delivery}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
