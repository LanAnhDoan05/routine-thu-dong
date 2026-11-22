const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const identifyUser = require('../middlewares/identifyUser');

// 1. Khởi tạo URL giao dịch VNPay (Hỗ trợ cả 2 định dạng route)
router.post('/vnpay/create-payment-url', identifyUser, paymentController.createVNPayUrl);
router.post('/create-payment-url', identifyUser, paymentController.createVNPayUrl);

// 2. Khởi tạo mã VNPAY-QR nhúng trực tiếp (Embedded Dynamic VNPAY QR)
router.post('/vnpay/create-qr', identifyUser, paymentController.createEmbeddedQR);
router.post('/create-qr', identifyUser, paymentController.createEmbeddedQR);

// 3. Truy vấn trạng thái thanh toán theo đơn hàng (Polling fallback cho SSE)
router.get('/vnpay/status/:orderId', paymentController.getPaymentStatus);
router.get('/status/:orderId', paymentController.getPaymentStatus);

// 4. Hủy giao dịch thanh toán
router.post('/vnpay/cancel/:orderId', identifyUser, paymentController.cancelPayment);
router.post('/cancel/:orderId', identifyUser, paymentController.cancelPayment);

// 5. Mô phỏng thanh toán VNPay Sandbox có chữ ký chuẩn HMAC-SHA512
router.post('/vnpay/simulate-payment', identifyUser, paymentController.simulateVNPayPayment);
router.post('/simulate', identifyUser, paymentController.simulateVNPayPayment);

// 6. Xác thực giao dịch khi khách được redirect về từ VNPay
router.get('/vnpay/verify-return', paymentController.verifyVNPayReturn);
router.get('/vnpay/vnpay-return', paymentController.verifyVNPayReturn);
router.get('/vnpay-return', paymentController.verifyVNPayReturn);

// 7. IPN Webhook Server-to-Server từ VNPay
router.get('/vnpay/vnpay-ipn', paymentController.vnpayIpn);
router.get('/vnpay-ipn', paymentController.vnpayIpn);

module.exports = router;
