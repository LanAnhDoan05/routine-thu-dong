const prisma = require('../src/config/prisma');

async function check() {
  const addr = await prisma.address.findMany({
    where: { userId: 'd6267df9-91b4-4ca9-8c23-28e4d2ed5357' }
  });
  console.log('Address of test user:', addr);
  await prisma.$disconnect();
}
check().catch(console.error);
