const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

const uploadsDir = path.resolve(__dirname, '../public/uploads');
const allFiles = fs.readdirSync(uploadsDir);

function getFilesForPrefix(prefix) {
  const matches = allFiles.filter(f => f.startsWith(prefix) && /\.(png|jpg|jpeg|webp)$/i.test(f));
  matches.sort();
  return matches.map(f => `/uploads/${f}`);
}

// 1. MAPPING TO AUTHENTIC ROUTINE PRODUCT PHOTOS
const PRODUCT_PHOTO_MAP = {
  // Tops / T-Shirts
  p001: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_3'),
  p002: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_5'),
  p003: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_vest_ao_vest_4'),
  p004: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_8'),
  p005: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_quan_jean_quan_jean_3'),
  p006: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_quan_tay_quan_tay_1'),
  p009: getFilesForPrefix('routine_nu_20261107t221437z_1_001_nu_ao_vest_ao_vest_1'),
  p015: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_ni_ao_ni_1'),
  p017: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_quan_kaki_quan_kaki_2'),
  p019: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_giay_dep_dep_1'),
  p020: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_giay_dep_dep_4'),
  p022: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_tui_vi_balo_tui_1'),
  p023: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_non_bang_do_mu_1_'),
  p024: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_khoac_12'),
  p025: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_1'),
  p026: getFilesForPrefix('routine_nu_20261107t221437z_1_001_nu_quan_jean_quan_jean_1_'),
  p027: getFilesForPrefix('routine_nu_20261107t221437z_1_001_nu_dam_dam_1'),
  p028: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_khoac_15'),
  // Test & Demo Products
  'p-e6244704-0d29-42b6-9811-a0e1e3062278': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_ni_ao_ni_2'),
  'p-4e04fa24-20b5-402d-9c30-72313ccaf180': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_6'),
  'p-62700679-c969-4e7e-b980-92882116625f': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_vest_ao_vest_2'),
  'p-8805812c-40bb-46cf-929d-d16793795da3': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_vest_ao_vest_3'),
};

async function main() {
  console.log('====================================================');
  console.log('STARTING PRODUCT IMAGE RECOVERY ON routine_test_db');
  console.log('====================================================');

  // Verify all files in PRODUCT_PHOTO_MAP exist on disk
  for (const [pId, imgList] of Object.entries(PRODUCT_PHOTO_MAP)) {
    if (!imgList || imgList.length === 0) {
      throw new Error(`Mapping for ${pId} has zero images!`);
    }
    for (const imgUrl of imgList) {
      const diskPath = path.join(uploadsDir, imgUrl.replace('/uploads/', ''));
      if (!fs.existsSync(diskPath)) {
        throw new Error(`File does not exist: ${diskPath}`);
      }
    }
  }
  console.log('✓ All mapped images exist physically on disk in backend/public/uploads');

  // Step 1: Update Products
  console.log('\n--- Updating Product.images in MySQL routine_test_db ---');
  let updatedProducts = 0;
  for (const [pId, imgList] of Object.entries(PRODUCT_PHOTO_MAP)) {
    const existing = await prisma.product.findUnique({ where: { id: pId } });
    if (existing) {
      await prisma.product.update({
        where: { id: pId },
        data: {
          images: imgList,
        }
      });
      updatedProducts++;
      console.log(`[UPDATED] ${pId} (${existing.name}): ${imgList.length} authentic photos assigned (primary: ${imgList[0].split('_').slice(-2).join('_')})`);
    } else {
      console.warn(`[WARN] Product ${pId} not found in DB`);
    }
  }
  console.log(`✓ Updated ${updatedProducts} products successfully.`);

  // Step 2: Update Order Items
  console.log('\n--- Refreshing OrderItem.image in MySQL routine_test_db ---');
  const allProducts = await prisma.product.findMany({ select: { id: true, images: true } });
  const productFirstImage = {};
  for (const p of allProducts) {
    let imgs = p.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) {
      productFirstImage[p.id] = imgs[0];
    }
  }

  const orderItems = await prisma.orderItem.findMany();
  let updatedOrderItems = 0;
  for (const item of orderItems) {
    const newImage = productFirstImage[item.productId];
    if (newImage && item.image !== newImage) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { image: newImage }
      });
      updatedOrderItems++;
    }
  }
  console.log(`✓ Updated ${updatedOrderItems} order items to point to current valid product images.`);

  console.log('\n====================================================');
  console.log('RECOVERY COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
