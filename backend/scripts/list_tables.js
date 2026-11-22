const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`SHOW TABLES`;
  console.log('Tables in routine_test_db:', tables);
}
main().catch(console.error).finally(() => prisma.$disconnect());
