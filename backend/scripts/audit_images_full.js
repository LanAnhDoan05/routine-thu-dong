const prisma = require('../src/config/prisma');
const fs = require('fs');
const path = require('path');

async function run() {
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' }
  });
  const uploadsDir = path.resolve(__dirname, '../public/uploads');
  const uploadFiles = new Set(fs.readdirSync(uploadsDir));
  
  console.log(`Total products: ${products.length}`);
  console.log(`Files in uploads: ${uploadFiles.size}`);
  
  const results = [];
  for (const p of products) {
    let imgs = p.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch(e) { imgs = [imgs]; }
    }
    if (!Array.isArray(imgs)) imgs = [imgs];
    
    const imageDetails = imgs.map(url => {
      if (!url) return { url, status: 'EMPTY' };
      if (url.startsWith('/uploads/')) {
        const fn = url.replace('/uploads/', '');
        return { url, exists: uploadFiles.has(fn), type: 'uploads', fn };
      } else if (url.startsWith('/api/v1/media/')) {
        const id = url.replace('/api/v1/media/', '');
        return { url, exists: uploadFiles.has(id), type: 'media_api', id };
      } else if (url.startsWith('http')) {
        return { url, exists: true, type: 'remote' };
      } else {
        return { url, exists: false, type: 'other' };
      }
    });
    
    const validCount = imageDetails.filter(d => d.exists).length;
    results.push({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      status: p.status,
      categorySlug: p.categorySlug,
      totalImages: imgs.length,
      validImages: validCount,
      images: imageDetails
    });
  }
  
  console.log('=== PRODUCT IMAGE AUDIT SUMMARY ===');
  let missingCount = 0;
  for (const r of results) {
    if (r.validImages === 0) {
      missingCount++;
      console.log(`[ZERO VALID IMAGES] ${r.id} | ${r.name} | active=${r.isActive} | status=${r.status} | total=${r.totalImages}`);
      console.log(`   Images:`, r.images.map(i => i.url));
    } else if (r.validImages < r.totalImages) {
      console.log(`[PARTIAL VALID] ${r.id} | ${r.name} | valid=${r.validImages}/${r.totalImages}`);
    }
  }
  console.log(`Total products with 0 valid images: ${missingCount} / ${products.length}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
