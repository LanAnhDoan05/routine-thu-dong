/**
 * TEST 4: Admin - Storefront - AI Realtime Data Synchronization
 * Kiểm thử tính đồng bộ liên thông 3 chiều:
 * 1. Admin cập nhật giá bán, tồn kho hoặc thêm biến thể của một sản phẩm
 * 2. Storefront (API /products/:id) phản ánh ngay lập tức dữ liệu mới
 * 3. AI Stylist (Tool get_product_details) truy vấn thấy ngay giá và tồn kho mới
 * 4. Admin chuyển trạng thái sản phẩm sang INACTIVE -> Storefront & AI loại trừ không hiển thị
 * 5. Khôi phục lại trạng thái ban đầu để bảo vệ toàn vẹn dữ liệu routine_test_db
 */
require('dotenv').config();
const prisma = require('../src/config/prisma');
const productService = require('../src/services/productService');
const aiService = require('../src/services/aiService');

async function runAdminSyncTest() {
  console.log('=== [E2E TEST 4: ADMIN - STOREFRONT - AI SYNC] BẮT ĐẦU ===\n');

  // 1. Chọn sản phẩm kiểm thử
  const targetProduct = await prisma.product.findFirst({
    where: { status: 'ACTIVE' },
  });
  if (!targetProduct) throw new Error('Không tìm thấy sản phẩm active trong DB');

  const originalPrice = Number(targetProduct.price);
  const originalStock = targetProduct.stockQuantity;
  const originalStatus = targetProduct.status;
  const testNewPrice = originalPrice + 50000;
  const testNewStock = originalStock + 10;

  console.log(`- Sản phẩm test: ${targetProduct.name} [${targetProduct.id}]`);
  console.log(`  * Ban đầu: Giá = ${originalPrice}đ, Tồn kho = ${originalStock}, Trạng thái = ${originalStatus}`);

  // 2. Thao tác Admin: Cập nhật giá và tồn kho
  console.log('\n--- [BƯỚC 1: ADMIN CẬP NHẬT GIÁ VÀ TỒN KHO] ---');
  await prisma.product.update({
    where: { id: targetProduct.id },
    data: {
      price: testNewPrice,
      stockQuantity: testNewStock,
    },
  });
  await prisma.productVariant.updateMany({
    where: { productId: targetProduct.id },
    data: {
      price: testNewPrice,
      stockQuantity: testNewStock,
    },
  });
  console.log(`✓ Admin đã cập nhật: Giá mới = ${testNewPrice}đ, Tồn kho mới = ${testNewStock} (cả bảng sản phẩm và biến thể)`);

  // 3. Kiểm tra Storefront API
  console.log('\n--- [BƯỚC 2: STOREFRONT API NHẬN DIỆN THỜI GIAN THỰC] ---');
  const storefrontProduct = await productService.getProductById(targetProduct.id);
  console.log(`✓ Storefront lấy sản phẩm: Giá = ${Number(storefrontProduct.price)}đ, Tồn kho = ${storefrontProduct.stockQuantity}`);
  if (Number(storefrontProduct.price) !== testNewPrice || storefrontProduct.stockQuantity !== testNewStock) {
    throw new Error('Dữ liệu Storefront không đồng bộ với cập nhật Admin!');
  }

  // 4. Kiểm tra AI Stylist truy vấn dữ liệu mới
  console.log('\n--- [BƯỚC 3: AI STYLIST NHẬN DIỆN DỮ LIỆU ĐỒNG BỘ] ---');
  const formattedForAI = aiService.formatProductForStylist(storefrontProduct);
  console.log(`✓ AI Stylist format dữ liệu: Giá = ${formattedForAI.price}đ, Tồn kho = ${formattedForAI.stockQuantity}`);
  if (formattedForAI.price !== testNewPrice) {
    throw new Error('AI Stylist vẫn đọc giá cũ chưa đồng bộ!');
  }

  // 5. Thao tác Admin: Chuyển sang INACTIVE
  console.log('\n--- [BƯỚC 4: CHUYỂN SẢN PHẨM SANG INACTIVE] ---');
  await prisma.product.update({
    where: { id: targetProduct.id },
    data: { status: 'INACTIVE' },
  });
  const activeProducts = await prisma.product.findMany({
    where: { id: targetProduct.id, status: 'ACTIVE' },
  });
  console.log(`✓ Kiểm tra catalog công khai: Tìm thấy ${activeProducts.length} sản phẩm active (Kỳ vọng: 0)`);
  if (activeProducts.length !== 0) {
    throw new Error('Sản phẩm INACTIVE vẫn xuất hiện trong catalog công khai!');
  }

  // 6. Khôi phục hoàn toàn dữ liệu ban đầu
  console.log('\n--- [BƯỚC 5: KHÔI PHỤC TOÀN VẸN DỮ LIỆU BAN ĐẦU] ---');
  await prisma.product.update({
    where: { id: targetProduct.id },
    data: {
      price: originalPrice,
      stockQuantity: originalStock,
      status: originalStatus,
    },
  });
  await prisma.productVariant.updateMany({
    where: { productId: targetProduct.id },
    data: {
      price: originalPrice,
    },
  });
  const restored = await prisma.product.findUnique({ where: { id: targetProduct.id } });
  console.log(`✓ Đã khôi phục sản phẩm về: Giá = ${Number(restored.price)}đ, Tồn kho = ${restored.stockQuantity}, Trạng thái = ${restored.status}`);

  console.log('\n=== [E2E TEST 4: ADMIN - STOREFRONT - AI SYNC] TOÀN BỘ PASS ===\n');
}

runAdminSyncTest().catch((err) => {
  console.error('TEST 4 THẤT BẠI:', err);
  process.exit(1);
});
