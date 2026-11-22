const prisma = require('../src/config/prisma');

async function run() {
  const mediaCount = await prisma.mediaFile.count();
  console.log(`Total rows in media_files: ${mediaCount}`);
  
  const allMedia = await prisma.mediaFile.findMany({
    select: { id: true, filename: true, size: true }
  });
  const mediaIds = new Set(allMedia.map(m => m.id));
  const mediaFilenames = new Set(allMedia.map(m => m.filename));
  
  const products = await prisma.product.findMany();
  for (const p of products) {
    let imgs = p.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
    }
    if (!Array.isArray(imgs)) imgs = [];
    
    const mediaApiImgs = imgs.filter(url => typeof url === 'string' && url.startsWith('/api/v1/media/'));
    if (mediaApiImgs.length > 0) {
      const checked = mediaApiImgs.map(url => {
        const id = url.replace('/api/v1/media/', '');
        const hasId = mediaIds.has(id);
        const hasFn = mediaFilenames.has(id);
        return { id, inDb: hasId || hasFn };
      });
      const inDbCount = checked.filter(c => c.inDb).length;
      console.log(`[${p.id}] ${p.name}: ${inDbCount}/${mediaApiImgs.length} found in media_files DB`);
      if (inDbCount < mediaApiImgs.length) {
        console.log(`   Missing:`, checked.filter(c => !c.inDb).map(c => c.id));
      }
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
