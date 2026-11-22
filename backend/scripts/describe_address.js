const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe('DESCRIBE `addresses`');
  console.log(cols);
}
main().finally(() => prisma.$disconnect());
