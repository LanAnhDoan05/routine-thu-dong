const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: { id: true, email: true, fullName: true, role: true }
      },
      items: true
    }
  });

  console.log(`Total orders: ${orders.length}`);
  const userOrderMap = {};
  for (const o of orders) {
    const key = o.user ? `${o.user.email} (${o.user.fullName})` : 'GUEST / NULL USER';
    if (!userOrderMap[key]) userOrderMap[key] = [];
    userOrderMap[key].push({
      id: o.id,
      status: o.orderStatus,
      total: o.total,
      itemCount: o.items.length,
      createdAt: o.createdAt
    });
  }

  for (const [userKey, ordList] of Object.entries(userOrderMap)) {
    console.log(`\nUser: ${userKey} -> ${ordList.length} orders:`);
    ordList.forEach(o => {
      console.log(`   Order [${o.id}] - ${o.status.padEnd(10)} - Total: ${o.total.toLocaleString()}đ - Items: ${o.itemCount} - Date: ${o.createdAt.toISOString().slice(0, 10)}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
