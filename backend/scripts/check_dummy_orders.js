const prisma = require('../src/config/prisma');

async function checkOrders() {
  const dummyOrders = await prisma.order.findMany({
    where: {
      OR: [
        { receiverName: { contains: 'Test' } },
        { phoneNumber: { contains: '9999' } },
      ]
    },
    select: { id: true, receiverName: true, phoneNumber: true, shippingAddress: true }
  });
  console.log('Dummy orders count:', dummyOrders.length);
  dummyOrders.forEach(o => console.log(JSON.stringify(o)));

  await prisma.$disconnect();
}
checkOrders().catch(console.error);
