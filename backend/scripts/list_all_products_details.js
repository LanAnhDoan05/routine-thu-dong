const prisma = require('../src/config/prisma');

async function run() {
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      gender: true,
      categorySlug: true,
      status: true,
      images: true,
      price: true
    }
  });
  
  console.log(`Total products: ${products.length}`);
  for (const p of products) {
    let imgs = p.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
    }
    if (!Array.isArray(imgs)) imgs = [];
    console.log(`[${p.id}] ${p.name} | gender=${p.gender} | cat=${p.categorySlug} | status=${p.status} | price=${p.price} | imgs=${imgs.length} (${imgs[0] || 'NONE'})`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
