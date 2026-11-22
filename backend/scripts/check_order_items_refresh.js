const prisma = require('../src/config/prisma');

async function run() {
  const items = await prisma.orderItem.findMany({
    select: { id: true, productId: true, name: true, image: true }
  });
  console.log(`Total order items: ${items.length}`);
  
  const brokenItems = items.filter(i => {
    if (!i.image) return true;
    if (i.image.includes('img-1788') || i.image.includes('default-product.svg') || i.image.includes('product-01.jpg')) return true;
    return false;
  });
  console.log(`Order items needing image refresh: ${brokenItems.length} / ${items.length}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
