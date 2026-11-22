const prisma = require('../src/config/prisma');

async function run() {
  const dummyUsers = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Test' } },
        { phoneNumber: { contains: '9999' } },
        { email: { contains: 'test' } },
      ]
    },
    select: { id: true, fullName: true, email: true, phoneNumber: true }
  });
  console.log('Remaining users with Test or 9999:', dummyUsers.length);
  dummyUsers.forEach(u => console.log(JSON.stringify(u)));

  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, receiverName: true, phoneNumber: true, shippingAddress: true, shippingWard: true, shippingDistrict: true, shippingProvince: true, total: true }
  });
  console.log('\nSample orders:');
  orders.forEach(o => console.log(JSON.stringify(o)));

  await prisma.$disconnect();
}

run().catch(console.error);
