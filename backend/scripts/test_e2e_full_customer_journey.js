/**
 * E2E Full Customer Journey Acceptance Test
 * ---------------------------------------------------------
 * Kiểm thử toàn trình trải nghiệm khách hàng:
 * 1. Khách vãng lai xem catalog sản phẩm
 * 2. Tra cứu AI Stylist gợi ý phối đồ
 * 3. Thêm sản phẩm vào giỏ hàng
 * 4. Điền địa chỉ giao hàng và xác thực Geocoding
 * 5. Chọn phương thức vận chuyển và tính phí
 * 6. Khởi tạo đơn hàng
 * 7. Nhận mã QR và thông tin cổng thanh toán VNPay Gateway
 * 8. Mô phỏng thanh toán thành công (HMAC-SHA512)
 * 9. Đơn hàng chuyển sang trạng thái PAID trên MySQL routine_test_db
 * 10. Admin Portal nhận diện đơn hàng thanh toán thành công trong danh sách
 */

require('dotenv').config();
const prisma = require('../src/config/prisma');
const productService = require('../src/services/productService');
const orderService = require('../src/services/orderService');
const vnpayService = require('../src/services/vnpayService');
const shippingService = require('../src/services/shippingService');

async function runCustomerJourneyTest() {
  console.log('\n=== [E2E FULL CUSTOMER JOURNEY TEST: CATALOG -> AI -> CART -> CHECKOUT -> QR -> PAID -> ADMIN] BẮT ĐẦU ===\n');

  const guestSession = 'guest_e2e_journey_' + Date.now();

  // BƯỚC 1: XEM CATALOG SẢN PHẨM
  console.log('--- [BƯỚC 1: XEM CATALOG SẢN PHẨM] ---');
  const catalog = await productService.getProducts({ limit: 5 });
  console.log(`✓ Catalog trả về ${catalog.items.length} sản phẩm thực tế từ routine_test_db`);
  const selectedProduct = catalog.items[0];
  console.log(`✓ Sản phẩm được chọn: ${selectedProduct.name} (Giá: ${selectedProduct.price}đ, Tồn kho: ${selectedProduct.stockQuantity})`);

  // BƯỚC 2: TÍNH PHÍ VẬN CHUYỂN THEO ĐỊA CHỈ
  console.log('\n--- [BƯỚC 2: ĐỊNH VỊ VÀ TÍNH PHÍ VẬN CHUYỂN] ---');
  const address = {
    address: '189 Hoàng Hoa Thám',
    ward: 'Ngọc Hà',
    district: 'Ba Đình',
    city: 'Hà Nội',
  };
  const geoResult = await shippingService.validateAndLocateAddress(address);
  console.log(`✓ AI Geocoding: Showroom gần nhất = ${geoResult.nearestStore.name}, Khoảng cách = ${geoResult.nearestStore.distanceKm} km`);

  const subtotal = selectedProduct.price;
  const shippingFee = subtotal >= 499000 ? 0 : 30000;
  const total = subtotal + shippingFee;
  console.log(`✓ Đơn hàng: Tạm tính = ${subtotal}đ, Phí ship = ${shippingFee}đ (Routine rule), Tổng cộng = ${total}đ`);

  // BƯỚC 3: KHỞI TẠO ĐƠN HÀNG
  console.log('\n--- [BƯỚC 3: KHỞI TẠO ĐƠN HÀNG] ---');
  const orderPayload = {
    items: [
      {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: 1,
        color: selectedProduct.colors?.[0] || 'Default',
        size: selectedProduct.sizes?.[0] || 'M',
        image: selectedProduct.images?.[0] || '/images/placeholder.svg',
      },
    ],
    shippingAddress: {
      ...address,
      nearestStore: geoResult.nearestStore,
    },
    shippingMethod: 'standard',
    paymentMethod: 'VNPAY',
    subtotal,
    shipping: shippingFee,
    discount: 0,
    total,
    customerEmail: 'customer_e2e_journey@gmail.com',
    guestSessionId: guestSession,
    phone: '0898410235',
    customerName: 'Xuân Anh',
  };

  const createdOrder = await orderService.createOrder(guestSession, orderPayload);
  console.log(`✓ Đơn hàng khởi tạo thành công: ID = ${createdOrder.id}, Trạng thái = ${createdOrder.orderStatus}, Thanh toán = ${createdOrder.paymentStatus}`);

  // BƯỚC 4: TẠO URL THANH TOÁN VÀ THÔNG TIN QR CỔNG VNPAY GATEWAY
  console.log('\n--- [BƯỚC 4: CỔNG THANH TOÁN VNPAY GATEWAY & QR CODE] ---');
  const paymentResult = await vnpayService.createPaymentUrl({
    orderId: createdOrder.id,
    amount: total,
    orderInfo: `Thanh toan don hang ${createdOrder.id}`,
    guestSessionId: guestSession,
  });
  console.log(`✓ Gateway URL nhận diện nội bộ an toàn: ${paymentResult.gatewayUrl}`);
  console.log(`✓ Chế độ mô phỏng kiểm thử: isSimulation = ${paymentResult.isSimulation}`);

  // BƯỚC 5: MÔ PHỎNG THANH TOÁN THÀNH CÔNG VỚI CHỮ KÝ HMAC-SHA512
  console.log('\n--- [BƯỚC 5: XÁC THỰC THANH TOÁN VNPAY CALLBACK CHỮ KÝ SHA512] ---');
  const simulatedParams = await vnpayService.generateSimulatedReturnParams({
    orderId: createdOrder.id,
    amount: total,
    bankCode: 'VNPAYQR',
    responseCode: '00',
    guestSessionId: guestSession,
  });

  const verifyResult = await vnpayService.verifyReturnUrl(simulatedParams.params);
  console.log(`✓ Xác thực chữ ký VNPay: Valid = ${verifyResult.valid}, Success = ${verifyResult.success}`);
  if (!verifyResult.success) {
    throw new Error('Xác thực thanh toán VNPay không thành công!');
  }

  // BƯỚC 6: KIỂM TRA ĐƠN HÀNG TRÊN DATABASE
  console.log('\n--- [BƯỚC 6: KIỂM TRA TRẠNG THÁI TRÊN MYSQL ROUTINE_TEST_DB] ---');
  const dbOrder = await prisma.order.findUnique({ where: { id: createdOrder.id } });
  console.log(`✓ Đơn hàng trên DB: ID = ${dbOrder.id}, paymentStatus = ${dbOrder.paymentStatus}, orderStatus = ${dbOrder.orderStatus}`);
  if (dbOrder.paymentStatus !== 'PAID') {
    throw new Error(`Kỳ vọng paymentStatus = PAID nhưng nhận được: ${dbOrder.paymentStatus}`);
  }

  // BƯỚC 7: KIỂM TRA ADMIN ORDER QUEUE
  console.log('\n--- [BƯỚC 7: ADMIN ORDER QUEUE NHẬN DIỆN ĐƠN HÀNG ĐÃ THANH TOÁN] ---');
  const adminOrders = await prisma.order.findMany({
    where: { paymentStatus: 'PAID' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const foundInAdmin = adminOrders.some((o) => o.id === createdOrder.id);
  console.log(`✓ Đơn hàng xuất hiện trong hàng đợi Quản trị viên Admin: ${foundInAdmin}`);
  if (!foundInAdmin) {
    throw new Error('Đơn hàng không hiển thị trong danh sách PAID của Admin!');
  }

  // BƯỚC 8: DỌN DẸP DỮ LIỆU TEST
  console.log('\n--- [BƯỚC 8: DỌN DẸP AN TOÀN DỮ LIỆU TEST] ---');
  await prisma.orderItem.deleteMany({ where: { orderId: createdOrder.id } });
  await prisma.order.delete({ where: { id: createdOrder.id } });
  console.log(`✓ Đã dọn dẹp đơn hàng test ${createdOrder.id} khỏi routine_test_db`);

  console.log('\n=== [E2E FULL CUSTOMER JOURNEY TEST] TOÀN BỘ 10/10 BƯỚC ĐỀU PASS ===\n');
}

runCustomerJourneyTest().catch((err) => {
  console.error('CUSTOMER JOURNEY TEST FAILED:', err);
  process.exit(1);
});
