const prisma = require('../src/config/prisma');

async function run() {
  const orderItems = await prisma.orderItem.findMany({
    select: { id: true, productId: true, name: true, image: true },
    take: 10
  });
  console.log('Sample order items:');
  for (const item of orderItems) {
    console.log(`[${item.id}] ${item.productId} | ${item.name} | image=${item.image}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
