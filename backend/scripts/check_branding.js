const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const banners = await prisma.banner.findMany();
    console.log('Banners:', banners.map(b => ({ id: b.id, title: b.title, subtitle: b.subtitle })));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
