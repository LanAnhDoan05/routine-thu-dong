const prisma = require('../src/config/prisma');

async function cleanOrders() {
  await prisma.order.updateMany({
    where: { receiverName: 'Nguyễn Văn Test 1' },
    data: { receiverName: 'Nguyễn Hoàng Long', phoneNumber: '0912456789' }
  });
  await prisma.order.updateMany({
    where: { receiverName: 'Trần Thị Test 2' },
    data: { receiverName: 'Trần Thị Thu Thảo', phoneNumber: '0987654321' }
  });
  await prisma.order.updateMany({
    where: { receiverName: 'Nguyễn Văn Test' },
    data: { receiverName: 'Nguyễn Tuấn Anh', phoneNumber: '0988776655' }
  });
  console.log('✓ Successfully replaced all mock names in Order table with real Vietnamese names!');
  await prisma.$disconnect();
}
cleanOrders().catch(console.error);
