const prisma = require('../src/config/prisma');

async function main() {
  const [dbRow] = await prisma.$queryRaw`SELECT DATABASE() as dbName`;
  const productCount = await prisma.product.count();
  const orderCount = await prisma.order.count();
  const userCount = await prisma.user.count();
  console.log('SAFETY CHECK - CURRENT DATABASE:', dbRow.dbName);
  console.log(`COUNTS: Products=${productCount}, Orders=${orderCount}, Users=${userCount}`);
  if (dbRow.dbName !== 'routine_test_db') {
    throw new Error('DANGER: Connected database is NOT routine_test_db! Aborting.');
  }
  console.log('DATABASE INTEGRITY & SAFETY VERIFIED: routine_test_db strictly active.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
