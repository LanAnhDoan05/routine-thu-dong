const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

async function audit() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Auditing ${products.length} products...`);

  const report = [];

  for (const p of products) {
    let images = [];
    if (Array.isArray(p.images)) {
      images = p.images;
    } else if (typeof p.images === 'string') {
      try {
        images = JSON.parse(p.images);
      } catch {
        images = [p.images];
      }
    }

    const skus = p.variants.map(v => v.sku);
    const colors = p.variants.map(v => v.color).filter(Boolean);
    const sizes = p.variants.map(v => v.size).filter(Boolean);

    report.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      categorySlug: p.categorySlug,
      categoryName: p.category?.name,
      price: p.price,
      skus,
      colors: [...new Set(colors)],
      sizes: [...new Set(sizes)],
      images,
      imageCount: images.length,
      firstImage: images[0] || null,
    });
  }

  fs.writeFileSync(
    path.join(__dirname, 'product_images_audit.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`Report written to backend/scripts/product_images_audit.json with ${report.length} products.`);
  process.exit(0);
}

audit().catch(e => {
  console.error(e);
  process.exit(1);
});
