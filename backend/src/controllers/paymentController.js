const vnpayService = require('../services/vnpayService');
const realtimeService = require('../services/realtimeService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 1. Khởi tạo URL thanh toán VNPay Sandbox truyền thống (Redirect)
 */
async function createVNPayUrl(req, res, next) {
  try {
    const { orderId, amount, orderInfo, bankCode, locale } = req.body;

    if (!orderId) {
      return sendError(res, 'Vui lòng cung cấp mã đơn hàng (orderId)', 400);
    }

    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const result = await vnpayService.createPaymentUrl({
      orderId,
      amount,
      orderInfo,
      ipAddr,
      bankCode,
      locale,
      userId: req.userId,
      guestSessionId: req.identityId,
    });

    return sendSuccess(res, result, 'Tạo URL thanh toán VNPay thành công', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Khởi tạo mã QR động nhúng trực tiếp trên Routine (Embedded VNPAY QR)
 */
async function createEmbeddedQR(req, res, next) {
  try {
    const { orderId, bankCode, locale } = req.body;

    if (!orderId) {
      return sendError(res, 'Vui lòng cung cấp mã đơn hàng (orderId)', 400);
    }

    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const result = await vnpayService.createEmbeddedVNPayQR({
      orderId,
      ipAddr,
      bankCode,
      locale,
      userId: req.userId,
      guestSessionId: req.identityId,
    });

    return sendSuccess(res, result, 'Khởi tạo mã VNPAY-QR nhúng thành công', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Kiểm tra trạng thái thanh toán theo đơn hàng (Polling fallback cho Frontend)
 */
async function getPaymentStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return sendError(res, 'Vui lòng cung cấp mã đơn hàng', 400);
    }

    const status = await vnpayService.getPaymentStatus(orderId);
    return sendSuccess(res, status, 'Truy vấn trạng thái thanh toán thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Hủy giao dịch thanh toán (Khách hàng chủ động hủy hoặc đóng màn hình)
 */
async function cancelPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return sendError(res, 'Vui lòng cung cấp mã đơn hàng', 400);
    }

    const result = await vnpayService.cancelPaymentTransaction(orderId);
    return sendSuccess(res, result, 'Hủy giao dịch thanh toán thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Xác thực dữ liệu trả về từ Return URL khi khách hàng được redirect về
 */
async function verifyVNPayReturn(req, res, next) {
  try {
    const result = await vnpayService.verifyReturnUrl(req.query);
    const notificationService = require('../services/notificationService');
    const orderCode = result?.orderId ? result.orderId.slice(-6).toUpperCase() : '';

    if (result && result.success) {
      realtimeService.emit('PAYMENT_CONFIRMED', {
        orderId: result.orderId,
        paymentStatus: 'PAID',
        amount: result.amount,
        bankCode: result.bankCode,
        transactionNo: result.transactionNo,
      }, 'ALL');
      realtimeService.emit('PAYMENT_UPDATED', {
        orderId: result.orderId,
        paymentStatus: 'PAID',
        amount: result.amount,
        transactionNo: result.transactionNo,
      }, 'ALL');
      realtimeService.emit('ORDER_STATUS_UPDATED', {
        id: result.orderId,
        orderId: result.orderId,
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      }, 'ALL');

      try {
        await notificationService.createNotification({
          type: 'PAYMENT_SUCCESS',
          title: `Thanh toán thành công #${orderCode}`,
          message: `Đơn hàng #${orderCode} đã được thanh toán trực tuyến qua VNPay: ${(result.amount || 0).toLocaleString('vi-VN')}đ.`,
          referenceType: 'PAYMENT',
          referenceId: result.orderId,
          data: { orderId: result.orderId, amount: result.amount, bankCode: result.bankCode },
          link: `/admin/orders?orderId=${result.orderId}`,
          recipientRole: 'ADMIN',
        });
      } catch (notifErr) {
        console.warn('[paymentController] Lỗi tạo thông báo thanh toán thành công:', notifErr.message);
      }
    } else if (result && result.orderId) {
      try {
        await notificationService.createNotification({
          type: 'PAYMENT_FAILED',
          title: `Thanh toán thất bại #${orderCode}`,
          message: `Giao dịch VNPay cho đơn hàng #${orderCode} không thành công (Mã phản hồi: ${result.responseCode || 'Lỗi'}).`,
          referenceType: 'PAYMENT',
          referenceId: result.orderId,
          data: { orderId: result.orderId, responseCode: result.responseCode },
          link: `/admin/orders?orderId=${result.orderId}`,
          recipientRole: 'ADMIN',
        });
      } catch (notifErr) {
        console.warn('[paymentController] Lỗi tạo thông báo thanh toán thất bại:', notifErr.message);
      }
    }
    return sendSuccess(res, result, 'Xác thực kết quả thanh toán VNPay thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * 6. Mô phỏng phản hồi thanh toán VNPay Sandbox có chữ ký HMAC-SHA512 hợp lệ
 */
async function simulateVNPayPayment(req, res, next) {
  try {
    const { orderId, amount, bankCode, responseCode = '00' } = req.body;
    if (!orderId) {
      return sendError(res, 'Vui lòng cung cấp mã đơn hàng (orderId)', 400);
    }
    const result = await vnpayService.generateSimulatedReturnParams({
      orderId,
      amount,
      bankCode,
      responseCode,
      userId: req.userId,
      guestSessionId: req.identityId,
    });
    return sendSuccess(res, result, 'Tạo phản hồi mô phỏng VNPay thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Xử lý webhook ngầm (IPN Server-to-Server) từ server VNPay
 */
async function vnpayIpn(req, res, next) {
  try {
    const result = await vnpayService.processIpn(req.query);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[paymentController] vnpayIpn Exception:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
}

module.exports = {
  createVNPayUrl,
  createEmbeddedQR,
  getPaymentStatus,
  cancelPayment,
  verifyVNPayReturn,
  simulateVNPayPayment,
  vnpayIpn,
};
