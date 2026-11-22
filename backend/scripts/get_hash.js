const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst({ where: { email: 'nguyenvana@gmail.com' } });
  console.log('User passwordHash:', u?.passwordHash);
}
main().finally(() => prisma.$disconnect());
