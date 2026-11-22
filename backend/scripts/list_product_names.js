const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true, status: true }
  });
  console.log(`Total products: ${products.length}`);
  products.forEach(p => console.log(`[${p.status}] ${p.id.padEnd(36)} | ${p.name} | ${p.price.toLocaleString()}đ`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
