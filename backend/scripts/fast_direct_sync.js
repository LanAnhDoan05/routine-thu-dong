const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncDirect() {
  const tables = [
    'categories',
    'styles',
    'products',
    'product_variants',
    'users',
    'orders',
    'order_items',
    'traffic_logs',
    'media_files'
  ];

  console.log('Disabling FK checks on defaultdb...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  for (const table of tables) {
    try {
      console.log(`Syncing ${table}...`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE defaultdb.${table};`);
      await prisma.$executeRawUnsafe(`INSERT INTO defaultdb.${table} SELECT * FROM routine_test_db.${table};`);
      const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM defaultdb.${table};`);
      console.log(`✅ ${table}: ${count[0].cnt} records in defaultdb!`);
    } catch (err) {
      console.error(`Error on ${table}:`, err.message);
    }
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('🎉 DIRECT SQL SYNC COMPLETED SUCCESSFULLY!');
}

syncDirect().catch(console.error).finally(() => prisma.$disconnect());
