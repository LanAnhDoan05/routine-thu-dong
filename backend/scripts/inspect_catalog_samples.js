const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      price: true,
      categorySlug: true,
      images: true,
      sizes: true,
      colors: true,
      stockQuantity: true,
      soldCount: true
    }
  });

  console.log(`Active products count: ${products.length}`);
  console.log('Sample product:', JSON.stringify(products[0], null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
