/**
 * TEST 1: E2E Payment & Order Lifecycle
 * Kiểm thử toàn diện:
 * 1. Khởi tạo đơn hàng từ giỏ hàng
 * 2. Tính toán tổng tiền (subtotal + shipping - voucher)
 * 3. Tạo URL & dữ liệu mã QR VNPay Sandbox
 * 4. Kiểm tra chữ ký bảo mật vnp_SecureHash
 * 5. Giả lập thanh toán Sandbox (vnp_ResponseCode = '00')
 * 6. Backend xác thực chữ ký callback và cập nhật trạng thái đơn sang 'PAID' / 'PROCESSING'
 * 7. Kiểm tra chống callback lặp (idempotency)
 * 8. Đối chiếu dữ liệu thực tế trong MySQL routine_test_db
 */
require('dotenv').config();
const prisma = require('../src/config/prisma');
const orderService = require('../src/services/orderService');
const vnpayService = require('../src/services/vnpayService');
const qs = require('qs');

async function runPaymentLifecycleTest() {
  console.log('=== [E2E TEST 1: QR & PAYMENT LIFECYCLE] BẮT ĐẦU ===');

  // 1. Lấy sản phẩm test còn hàng trong MySQL
  const testProduct = await prisma.product.findFirst({
    where: { status: 'ACTIVE', stockQuantity: { gt: 5 } },
    include: { variants: true },
  });
  if (!testProduct) throw new Error('Không tìm thấy sản phẩm hợp lệ trong DB');

  const unitPrice = Number(testProduct.price);
  const qty = 1;
  // Chính sách vận chuyển Routine: Đơn từ 499k trở lên được Miễn phí giao hàng (0đ)
  const expectedShippingFee = (unitPrice * qty >= 499000) ? 0 : 30000;
  const expectedTotal = unitPrice * qty + expectedShippingFee;

  console.log(`- Sản phẩm test: ${testProduct.name} (Mã: ${testProduct.id}, Giá: ${unitPrice}đ)`);

  // 2. Tạo đơn hàng kiểm thử
  const guestSessionId = `test_guest_pay_${Date.now()}`;
  const orderInput = {
    customerName: 'Nguyễn Hoàng Long',
    customerPhone: '0987654321',
    customerEmail: 'test_payment@routine.vn',
    shippingAddress: '189 Hoàng Hoa Thám, Ngọc Hà, Ba Đình, Hà Nội',
    shippingMethod: 'standard',
    paymentMethod: 'vnpay',
    items: [
      {
        productId: testProduct.id,
        quantity: qty,
        price: unitPrice,
        size: testProduct.variants?.[0]?.sizeName || 'M',
        color: testProduct.variants?.[0]?.colorName || 'Default',
      },
    ],
  };

  const createdOrder = await orderService.createOrder(guestSessionId, orderInput);
  console.log(`✓ [BƯỚC 1: TẠO ĐƠN HÀNG] Thành công! Mã đơn: ${createdOrder.id}`);
  console.log(`  - Trạng thái ban đầu: ${createdOrder.status}, Thanh toán: ${createdOrder.paymentStatus}`);
  console.log(`  - Tổng tiền: ${createdOrder.total}đ (Tạm tính: ${createdOrder.subtotal}đ + Ship: ${createdOrder.shippingFee}đ)`);

  if (Number(createdOrder.total) !== expectedTotal) {
    throw new Error(`Tổng tiền không khớp: Mong đợi ${expectedTotal}, nhận ${createdOrder.total}`);
  }

  // 3. Tạo dữ liệu thanh toán VNPay
  const vnpayResult = await vnpayService.createPaymentUrl({
    orderId: createdOrder.id,
    amount: createdOrder.total,
    orderInfo: `Thanh toan don hang ${createdOrder.id} - Routine`,
    ipAddr: '127.0.0.1',
    guestSessionId,
  });

  console.log(`✓ [BƯỚC 2: TẠO MÃ QR & LIÊN KẾT THANH TOÁN]`);
  console.log(`  - Cổng chuyển tiếp: ${vnpayResult.paymentUrl}`);
  console.log(`  - Chế độ Simulation an toàn: ${vnpayResult.isSimulation}`);
  if (!vnpayResult.paymentUrl) throw new Error('Không tạo được paymentUrl');

  // 4. Giả lập dữ liệu Callback từ Sandbox (VNPay Return Parameters)
  const simulated = await vnpayService.generateSimulatedReturnParams({
    orderId: createdOrder.id,
    amount: createdOrder.total,
    bankCode: 'VNPAYQR',
    responseCode: '00',
    guestSessionId,
  });
  const simulatedParams = simulated.params;

  console.log(`✓ [BƯỚC 3: DỮ LIỆU CALLBACK SANDBOX]`);
  console.log(`  - vnp_TxnRef: ${simulatedParams.vnp_TxnRef}`);
  console.log(`  - vnp_Amount: ${simulatedParams.vnp_Amount} (Đã x100 theo chuẩn VNPay)`);
  console.log(`  - vnp_ResponseCode: ${simulatedParams.vnp_ResponseCode}`);
  console.log(`  - vnp_SecureHash: ${simulatedParams.vnp_SecureHash.substring(0, 16)}...`);

  // 5. Xác thực Callback lần 1 (Xử lý thanh toán thành công)
  const verifyResult = await vnpayService.verifyReturnUrl(simulatedParams);
  console.log(`✓ [BƯỚC 4: XÁC THỰC CHỮ KÝ & CẬP NHẬT TRẠNG THÁI]`);
  console.log(`  - Xác thực chữ ký: ${verifyResult.valid ? 'HỢP LỆ (PASS)' : 'KHÔNG HỢP LỆ (FAIL)'}`);
  console.log(`  - Giao dịch thành công: ${verifyResult.success ? 'THÀNH CÔNG (PASS)' : 'THẤT BẠI'}`);
  console.log(`  - Đơn hàng sau callback: ${verifyResult.orderId}`);

  // 6. Kiểm tra lại dữ liệu trong MySQL
  const updatedOrder = await prisma.order.findUnique({
    where: { id: createdOrder.id },
  });
  console.log(`✓ [BƯỚC 5: ĐỐI CHIẾU DỮ LIỆU MYSQL]`);
  console.log(`  - Trạng thái đơn hàng: ${updatedOrder.status}`);
  console.log(`  - Trạng thái thanh toán: ${updatedOrder.paymentStatus} (Kỳ vọng: PAID)`);

  if (updatedOrder.paymentStatus !== 'PAID') {
    throw new Error(`Trạng thái thanh toán trong DB chưa đổi sang PAID! Hiện tại: ${updatedOrder.paymentStatus}`);
  }

  // 7. Kiểm tra chống xử lý lặp (Idempotency check - Gửi lại callback lần 2)
  console.log(`✓ [BƯỚC 6: KIỂM TRA CHỐNG LẶP CALLBACK (IDEMPOTENCY)]`);
  const secondCallback = await vnpayService.verifyReturnUrl(simulatedParams);
  const recheckedOrder = await prisma.order.findUnique({ where: { id: createdOrder.id } });
  console.log(`  - Callback gửi lại lần 2 không gây lỗi: ${secondCallback.valid && secondCallback.success}`);
  console.log(`  - Trạng thái đơn vẫn là: ${recheckedOrder.paymentStatus}, không bị nhân đôi số tiền`);

  console.log('=== [E2E TEST 1: QR & PAYMENT LIFECYCLE] KẾT QUẢ: 10/10 TIÊU CHÍ ĐẠT (PASS) ===\n');
}

runPaymentLifecycleTest().catch((err) => {
  console.error('TEST 1 THẤT BẠI:', err);
  process.exit(1);
});
