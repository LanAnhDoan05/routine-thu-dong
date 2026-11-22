const qs = require('qs');
const QRCode = require('qrcode');
const prisma = require('../config/prisma');
const config = require('../config/vnpay');
const stockReservationService = require('./stockReservationService');
const cartService = require('./cartService');
const emailService = require('./emailService');
const realtimeService = require('./realtimeService');
const notificationService = require('./notificationService');
const {
  removeVietnameseTones,
  sortObject,
  createSecureHash,
  verifySecureHash,
  formatVNPayDate,
  getVNPayResponseMessage,
} = require('../utils/vnpayHelper');

/**
 * 1. Khởi tạo URL thanh toán chuẩn VNPay Sandbox
 */
async function createPaymentUrl({
  orderId,
  amount,
  orderInfo,
  ipAddr = '127.0.0.1',
  bankCode = '',
  locale = 'vn',
  userId,
  guestSessionId,
}) {
  if (!orderId) {
    const err = new Error('Thiếu mã đơn hàng (orderId)');
    err.statusCode = 400;
    throw err;
  }

  // Tra cứu đơn hàng từ database
  let finalAmount = amount;
  let existingOrder = null;

  try {
    existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
  } catch (dbErr) {
    console.warn('[vnpayService] Không thể truy vấn database cho orderId:', orderId, dbErr.message);
  }

  if (existingOrder) {
    if (existingOrder.paymentStatus === 'PAID') {
      const err = new Error('Đơn hàng này đã được thanh toán hoàn tất (PAID)');
      err.statusCode = 400;
      throw err;
    }
    finalAmount = existingOrder.total;
  }

  if (!finalAmount || Number(finalAmount) <= 0) {
    const err = new Error('Số tiền thanh toán không hợp lệ');
    err.statusCode = 400;
    throw err;
  }

  let cleanIp = ipAddr ? String(ipAddr).split(',')[0].trim() : '127.0.0.1';
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }
  const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ipv4Pattern.test(cleanIp) || cleanIp === '::1') {
    cleanIp = '127.0.0.1';
  }

  const now = new Date();
  const createDate = formatVNPayDate(now);
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const cleanOrderInfo = removeVietnameseTones(orderInfo || `Thanh toan don hang ${orderId}`).slice(0, 200);

  const vnpParams = {
    vnp_Version: config.vnp_Version || '2.1.0',
    vnp_Command: config.vnp_Command || 'pay',
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Locale: locale || 'vn',
    vnp_CurrCode: config.vnp_CurrCode || 'VND',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: cleanOrderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(Number(finalAmount) * 100),
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_IpAddr: cleanIp,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: formatVNPayDate(expiresAt),
  };

  if (bankCode) {
    vnpParams['vnp_BankCode'] = bankCode;
  }

  const sortedParams = sortObject(vnpParams);
  const secureHash = createSecureHash(vnpParams, config.vnp_HashSecret);
  sortedParams['vnp_SecureHash'] = secureHash;

  const isSimulation =
    process.env.VNPAY_SIMULATION === 'true' ||
    !config.vnp_TmnCode ||
    config.vnp_TmnCode.includes('your-') ||
    config.vnp_TmnCode === 'DEMO';

  const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const gatewayUrl = `${frontendBaseUrl}/checkout/payment/vnpay-gateway?orderId=${encodeURIComponent(orderId)}&amount=${finalAmount}&orderInfo=${encodeURIComponent(cleanOrderInfo)}`;
  const officialVnpayUrl = `${config.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;

  const paymentUrl = isSimulation ? gatewayUrl : officialVnpayUrl;

  // Ghi nhận transaction PENDING vào database
  try {
    await prisma.paymentTransaction.create({
      data: {
        orderId: String(orderId),
        txnRef: String(orderId),
        bankCode: bankCode || 'VNPAY',
        amount: Number(finalAmount),
        status: 'PENDING',
        expiresAt,
      },
    });
  } catch (txErr) {
    console.warn('[vnpayService] Lỗi tạo paymentTransaction:', txErr.message);
  }

  return {
    orderId,
    amount: Number(finalAmount),
    paymentUrl,
    vnpTxnRef: orderId,
    createDate,
    expiresAt: expiresAt.toISOString(),
    isSimulation,
    gatewayUrl,
    officialVnpayUrl,
  };
}

/**
 * 2. Khởi tạo mã VNPAY-QR nhúng trực tiếp (Embedded Dynamic VNPAY QR)
 */
async function createEmbeddedVNPayQR({
  orderId,
  ipAddr = '127.0.0.1',
  bankCode = 'VNPAYQR',
  locale = 'vn',
  userId,
  guestSessionId,
}) {
  if (!orderId) {
    const err = new Error('Thiếu mã đơn hàng (orderId)');
    err.statusCode = 400;
    throw err;
  }

  // 1. Kiểm tra đơn hàng trong DB
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    const err = new Error(`Không tìm thấy đơn hàng #${orderId}`);
    err.statusCode = 404;
    throw err;
  }

  // 2. Không cho phép thanh toán đơn hàng đã PAID
  if (order.paymentStatus === 'PAID') {
    const err = new Error(`Đơn hàng #${orderId} đã được thanh toán hoàn tất (PAID)`);
    err.statusCode = 400;
    throw err;
  }

  const finalAmount = order.total;
  if (!finalAmount || Number(finalAmount) <= 0) {
    const err = new Error('Số tiền thanh toán đơn hàng không hợp lệ');
    err.statusCode = 400;
    throw err;
  }

  // 3. Thời hạn giao dịch 15 phút
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const createDate = formatVNPayDate(now);
  const expireDate = formatVNPayDate(expiresAt);

  let cleanIp = ipAddr ? String(ipAddr).split(',')[0].trim() : '127.0.0.1';
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }
  const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ipv4Pattern.test(cleanIp) || cleanIp === '::1') {
    cleanIp = '127.0.0.1';
  }

  const cleanOrderInfo = removeVietnameseTones(`Thanh toan don hang ${orderId} Routine`).slice(0, 200);

  // 4. Tạo bộ tham số chuẩn VNPay
  const vnpParams = {
    vnp_Version: config.vnp_Version || '2.1.0',
    vnp_Command: config.vnp_Command || 'pay',
    vnp_TmnCode: config.vnp_TmnCode && !config.vnp_TmnCode.includes('your-') ? config.vnp_TmnCode : 'ROUTINEVN',
    vnp_Locale: locale || 'vn',
    vnp_CurrCode: config.vnp_CurrCode || 'VND',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: cleanOrderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(Number(finalAmount) * 100),
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_IpAddr: cleanIp,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
    vnp_BankCode: 'VNPAYQR',
  };

  const sortedParams = sortObject(vnpParams);
  const secureHash = createSecureHash(vnpParams, config.vnp_HashSecret || 'ROUTINESECRET');
  sortedParams['vnp_SecureHash'] = secureHash;

  const officialVnpayUrl = `${config.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;

  // 5. Tạo chuỗi QR định dạng VNPAY chính thức (EMVCo/VNPAY Merchant Scheme, TUYỆT ĐỐI KHÔNG dùng VietQR)
  const isSimulation =
    process.env.VNPAY_SIMULATION === 'true' ||
    !config.vnp_TmnCode ||
    config.vnp_TmnCode.includes('your-');

  // Chuỗi QR định danh theo chuẩn VNPAY (vnpay://qr scheme có tmnCode, txnRef, amount, checksum)
  const vnpayQrPayload = `vnpay://qr?tmnCode=${vnpParams.vnp_TmnCode}&txnRef=${orderId}&amount=${finalAmount}&orderInfo=${encodeURIComponent(cleanOrderInfo)}&checksum=${secureHash}&exp=${expireDate}`;

  // Tạo ảnh QR Code base64 trực tiếp bằng thư viện qrcode
  const qrDataUrl = await QRCode.toDataURL(vnpayQrPayload, {
    width: 320,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  // 6. Ghi nhận giao dịch vào DB
  let transactionRecord = null;
  try {
    transactionRecord = await prisma.paymentTransaction.create({
      data: {
        orderId: String(orderId),
        txnRef: String(orderId),
        bankCode: 'VNPAYQR',
        amount: Number(finalAmount),
        status: 'PENDING',
        qrContent: vnpayQrPayload,
        expiresAt,
      },
    });
  } catch (txErr) {
    console.warn('[vnpayService] Lỗi tạo paymentTransaction:', txErr.message);
  }

  const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const gatewayUrl = `${frontendBaseUrl}/checkout/payment/vnpay-gateway?orderId=${encodeURIComponent(orderId)}&amount=${finalAmount}&orderInfo=${encodeURIComponent(cleanOrderInfo)}`;

  return {
    transactionId: transactionRecord ? transactionRecord.id : `TXN-${Date.now()}`,
    orderId,
    totalAmount: Number(finalAmount),
    currency: 'VND',
    paymentMethod: 'VNPAY',
    bankCode: 'VNPAYQR',
    qrContent: vnpayQrPayload,
    qrDataUrl,
    officialVnpayUrl,
    gatewayUrl,
    expirationTime: expiresAt.toISOString(),
    expiresInSeconds: 900,
    merchantCode: vnpParams.vnp_TmnCode,
    isSimulation,
  };
}

/**
 * 3. Kiểm tra trạng thái thanh toán của đơn hàng (Polling fallback khi SSE gián đoạn)
 */
async function getPaymentStatus(orderId) {
  if (!orderId) {
    const err = new Error('Thiếu mã đơn hàng (orderId)');
    err.statusCode = 400;
    throw err;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!order) {
    const err = new Error(`Không tìm thấy đơn hàng #${orderId}`);
    err.statusCode = 404;
    throw err;
  }

  const latestTx = order.transactions && order.transactions[0] ? order.transactions[0] : null;

  // Kiểm tra nếu giao dịch đã hết hạn (15 phút) mà chưa thanh toán
  const now = new Date();
  let isExpired = false;
  if (order.paymentStatus !== 'PAID' && latestTx && latestTx.expiresAt && now > new Date(latestTx.expiresAt)) {
    isExpired = true;
    if (latestTx.status === 'PENDING') {
      await prisma.paymentTransaction.update({
        where: { id: latestTx.id },
        data: { status: 'EXPIRED' },
      }).catch(() => {});
      // Giải phóng tồn kho giữ hàng
      await stockReservationService.releaseStock(orderId).catch(() => {});
    }
  }

  let remainingSeconds = 0;
  if (latestTx && latestTx.expiresAt && !isExpired && order.paymentStatus !== 'PAID') {
    remainingSeconds = Math.max(0, Math.floor((new Date(latestTx.expiresAt).getTime() - now.getTime()) / 1000));
  }

  return {
    orderId,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    totalAmount: order.total,
    isPaid: order.paymentStatus === 'PAID',
    isExpired,
    isCancelled: order.orderStatus === 'CANCELLED' || (latestTx && latestTx.status === 'CANCELLED'),
    transactionStatus: isExpired ? 'EXPIRED' : (latestTx ? latestTx.status : 'PENDING'),
    remainingSeconds,
    latestTransaction: latestTx,
  };
}

/**
 * 4. Hủy giao dịch thanh toán
 */
async function cancelPaymentTransaction(orderId) {
  if (!orderId) {
    const err = new Error('Thiếu mã đơn hàng (orderId)');
    err.statusCode = 400;
    throw err;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    const err = new Error(`Không tìm thấy đơn hàng #${orderId}`);
    err.statusCode = 404;
    throw err;
  }

  if (order.paymentStatus === 'PAID') {
    const err = new Error('Không thể hủy giao dịch của đơn hàng đã thanh toán thành công (PAID)');
    err.statusCode = 400;
    throw err;
  }

  // Giải phóng tồn kho
  await stockReservationService.releaseStock(orderId).catch(() => {});

  // Cập nhật trạng thái transaction mới nhất
  const latestTx = await prisma.paymentTransaction.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestTx && latestTx.status === 'PENDING') {
    await prisma.paymentTransaction.update({
      where: { id: latestTx.id },
      data: { status: 'CANCELLED' },
    });
  }

  // Cập nhật trạng thái đơn hàng
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: 'CANCELLED',
      note: order.note ? `${order.note} | [Khách hàng hủy giao dịch]` : '[Khách hàng hủy giao dịch]',
    },
  });

  // Phát sự kiện SSE
  realtimeService.emit('ORDER_STATUS_UPDATED', {
    id: orderId,
    orderId,
    orderStatus: 'CANCELLED',
    paymentStatus: order.paymentStatus,
  }, 'ALL');

  realtimeService.emit('PAYMENT_UPDATED', {
    orderId,
    paymentStatus: order.paymentStatus,
    transactionStatus: 'CANCELLED',
  }, 'ALL');

  return {
    success: true,
    message: 'Đã hủy giao dịch thanh toán thành công',
    order: updatedOrder,
  };
}

/**
 * 5. Xác thực dữ liệu trả về từ Return URL khi khách hàng được redirect về
 */
async function verifyReturnUrl(queryParams) {
  const isValid = verifySecureHash(queryParams, config.vnp_HashSecret);

  if (!isValid) {
    return {
      valid: false,
      success: false,
      message: 'Chữ ký không hợp lệ hoặc dữ liệu giao dịch có dấu hiệu bị can thiệp',
      responseCode: queryParams.vnp_ResponseCode || '97',
    };
  }

  const rawOrderId = queryParams.vnp_TxnRef || '';
  const orderId = rawOrderId.split('__')[0];
  const responseCode = queryParams.vnp_ResponseCode || '';
  const transactionNo = queryParams.vnp_TransactionNo || '';
  const bankCode = queryParams.vnp_BankCode || 'VNPAYQR';
  const payDate = queryParams.vnp_PayDate || '';
  const vnpAmount = Number(queryParams.vnp_Amount || 0) / 100;
  const isSuccess = responseCode === '00';
  const message = getVNPayResponseMessage(responseCode);

  let updatedOrder = null;

  if (orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (order) {
        // Kiểm tra số tiền khớp tuyệt đối
        if (isSuccess && Math.abs(order.total - vnpAmount) > 10) {
          console.error(`[vnpayService] Gian lận số tiền! Đơn hàng: ${order.total}, VNPAY trả về: ${vnpAmount}`);
          return {
            valid: true,
            success: false,
            message: 'Số tiền thanh toán không khớp với đơn hàng',
            responseCode: '04',
          };
        }

        // Idempotency: nếu đơn đã thanh toán trước đó
        if (order.paymentStatus === 'PAID') {
          return {
            valid: true,
            success: true,
            orderId,
            responseCode: '00',
            transactionNo,
            bankCode,
            amount: order.total,
            payDate,
            message: 'Đơn hàng đã được xác nhận thanh toán trước đó (Idempotent)',
            order,
          };
        }

        const updateData = {};
        if (isSuccess) {
          updateData.paymentStatus = 'PAID';
          updateData.orderStatus = 'CONFIRMED';
          await stockReservationService.commitStock(orderId);

          try {
            const orderItems = await prisma.orderItem.findMany({ where: { orderId } });
            for (const it of orderItems) {
              if (it.productId) {
                await prisma.product
                  .update({
                    where: { id: it.productId },
                    data: { soldCount: { increment: it.quantity } },
                  })
                  .catch(() => {});
              }
            }
          } catch (soldErr) {
            console.warn('[vnpayService] Lỗi cập nhật soldCount:', soldErr.message);
          }

          if (order.userId || order.guestSessionId) {
            try {
              cartService.clearCart(order.userId || order.guestSessionId);
            } catch (cartErr) {
              console.warn('[vnpayService] Lỗi clearCart sau thanh toán:', cartErr.message);
            }
          }
        } else {
          await stockReservationService.releaseStock(orderId);
          updateData.paymentStatus = 'UNPAID';
          updateData.orderStatus = 'CANCELLED';
        }

        const transNote = `[VNPay ${transactionNo || 'N/A'} - Bank: ${bankCode}]`;
        if (!order.note || !order.note.includes(transactionNo)) {
          updateData.note = order.note ? `${order.note} | ${transNote}` : transNote;
        }

        if (Object.keys(updateData).length > 0) {
          updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: updateData,
            include: { items: true, user: true },
          });

          // Cập nhật trạng thái transaction trong DB
          const latestTx = await prisma.paymentTransaction.findFirst({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
          });
          if (latestTx) {
            await prisma.paymentTransaction.update({
              where: { id: latestTx.id },
              data: {
                status: isSuccess ? 'SUCCESS' : 'FAILED',
                transactionNo: String(transactionNo),
                bankCode,
                responseCode,
                payDate,
                rawResponse: queryParams,
              },
            }).catch(() => {});
          }

          // Gửi Email hóa đơn
          if (isSuccess && updatedOrder) {
            const customerEmail = updatedOrder.user ? updatedOrder.user.email : null;
            if (customerEmail) {
              setImmediate(async () => {
                try {
                  await emailService.sendOrderInvoiceEmail({
                    order: updatedOrder,
                    customerEmail,
                    customerName: updatedOrder.receiverName || (updatedOrder.user && updatedOrder.user.fullName),
                  });
                } catch (emErr) {
                  console.error('[vnpayService] Lỗi gửi email hóa đơn VNPay:', emErr.message);
                }
              });
            }
          }
        }
      }
    } catch (dbErr) {
      console.error('[vnpayService] Lỗi cập nhật đơn hàng sau return:', dbErr.message);
    }
  }

  return {
    valid: true,
    success: isSuccess,
    orderId,
    responseCode,
    transactionNo,
    bankCode,
    amount: vnpAmount,
    payDate,
    message,
    order: updatedOrder,
  };
}

/**
 * 6. Xử lý webhook IPN (Server-to-Server) theo chuẩn của VNPay
 */
async function processIpn(queryParams) {
  const isValid = verifySecureHash(queryParams, config.vnp_HashSecret);

  if (!isValid) {
    return { RspCode: '97', Message: 'Checksum failed' };
  }

  const rawOrderId = queryParams.vnp_TxnRef || '';
  const orderId = rawOrderId.split('__')[0];
  const responseCode = queryParams.vnp_ResponseCode;
  const vnpAmount = Number(queryParams.vnp_Amount || 0) / 100;
  const transactionNo = queryParams.vnp_TransactionNo || '';
  const bankCode = queryParams.vnp_BankCode || 'VNPAYQR';
  const payDate = queryParams.vnp_PayDate || '';

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    // Kiểm tra số tiền
    if (Math.abs(order.total - vnpAmount) > 10) {
      return { RspCode: '04', Message: 'Amount invalid' };
    }

    // Idempotency: nếu đơn đã thanh toán trước đó
    if (order.paymentStatus === 'PAID') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (responseCode === '00') {
      await stockReservationService.commitStock(orderId);
      if (order.userId || order.guestSessionId) {
        try {
          cartService.clearCart(order.userId || order.guestSessionId);
        } catch (cartErr) {
          console.warn('[vnpayService] IPN clearCart warning:', cartErr.message);
        }
      }

      const updatedIpnOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'CONFIRMED',
          note: order.note
            ? `${order.note} | IPN Confirmed ${transactionNo}`
            : `IPN Confirmed ${transactionNo}`,
        },
        include: { items: true, user: true },
      });

      // Cập nhật transaction history
      const latestTx = await prisma.paymentTransaction.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });
      if (latestTx) {
        await prisma.paymentTransaction.update({
          where: { id: latestTx.id },
          data: {
            status: 'SUCCESS',
            transactionNo: String(transactionNo),
            bankCode,
            responseCode,
            payDate,
            rawResponse: queryParams,
          },
        }).catch(() => {});
      }

      // Phát sự kiện SSE realtime
      realtimeService.emit('PAYMENT_CONFIRMED', {
        orderId,
        paymentStatus: 'PAID',
        amount: vnpAmount,
        bankCode,
        transactionNo,
      }, 'ALL');

      realtimeService.emit('PAYMENT_UPDATED', {
        orderId,
        paymentStatus: 'PAID',
        amount: vnpAmount,
        transactionNo,
      }, 'ALL');

      realtimeService.emit('ORDER_STATUS_UPDATED', {
        id: orderId,
        orderId,
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      }, 'ALL');

      // Tạo thông báo Admin
      const orderCode = orderId.slice(-6).toUpperCase();
      try {
        await notificationService.createNotification({
          type: 'PAYMENT_SUCCESS',
          title: `Thanh toán thành công #${orderCode}`,
          message: `Đơn hàng #${orderCode} đã được thanh toán trực tuyến qua VNPAY-QR: ${(vnpAmount || 0).toLocaleString('vi-VN')}đ.`,
          referenceType: 'PAYMENT',
          referenceId: orderId,
          data: { orderId, amount: vnpAmount, bankCode, transactionNo },
          link: `/admin/orders?orderId=${orderId}`,
          recipientRole: 'ADMIN',
        });
      } catch (notifErr) {
        console.warn('[vnpayService] IPN notification warning:', notifErr.message);
      }

      const customerEmail = updatedIpnOrder.user ? updatedIpnOrder.user.email : null;
      if (customerEmail) {
        setImmediate(async () => {
          try {
            await emailService.sendOrderInvoiceEmail({
              order: updatedIpnOrder,
              customerEmail,
              customerName: updatedIpnOrder.receiverName || (updatedIpnOrder.user && updatedIpnOrder.user.fullName),
            });
          } catch (emErr) {
            console.error('[vnpayService] Lỗi gửi email hóa đơn qua IPN:', emErr.message);
          }
        });
      }
    } else {
      await stockReservationService.releaseStock(orderId);
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
          orderStatus: 'CANCELLED',
          note: order.note
            ? `${order.note} | IPN Failed ${transactionNo}`
            : `IPN Failed ${transactionNo}`,
        },
      });

      const latestTx = await prisma.paymentTransaction.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });
      if (latestTx) {
        await prisma.paymentTransaction.update({
          where: { id: latestTx.id },
          data: {
            status: 'FAILED',
            transactionNo: String(transactionNo),
            bankCode,
            responseCode,
            payDate,
            rawResponse: queryParams,
          },
        }).catch(() => {});
      }
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  } catch (error) {
    console.error('[vnpayService] IPN Error:', error);
    return { RspCode: '99', Message: 'Unknown error' };
  }
}

/**
 * 7. Tạo bộ tham số phản hồi mô phỏng có chữ ký HMAC-SHA512 chuẩn xác
 */
async function generateSimulatedReturnParams({
  orderId,
  amount,
  bankCode = 'VNPAYQR',
  responseCode = '00',
  userId,
  guestSessionId,
}) {
  if (!orderId) {
    const err = new Error('Thiếu mã đơn hàng (orderId)');
    err.statusCode = 400;
    throw err;
  }

  let finalAmount = amount;
  let existingOrder = null;

  try {
    existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
  } catch (dbErr) {
    console.warn('[vnpayService] Lỗi tra cứu đơn hàng khi tạo simulation params:', dbErr.message);
  }

  if (existingOrder) {
    finalAmount = existingOrder.total;
  }

  const payDate = formatVNPayDate(new Date());
  const cleanOrderInfo = removeVietnameseTones(
    existingOrder ? `Thanh toan don hang ${orderId} Routine` : 'Thanh toan don hang Routine'
  ).slice(0, 200);

  const transactionNo = `${Math.floor(10000000 + Math.random() * 90000000)}`;

  const vnpParams = {
    vnp_Amount: Math.round(Number(finalAmount) * 100),
    vnp_BankCode: bankCode || 'VNPAYQR',
    vnp_BankTranNo: `VNP${Date.now()}`,
    vnp_CardType: 'QR',
    vnp_OrderInfo: cleanOrderInfo,
    vnp_PayDate: payDate,
    vnp_ResponseCode: responseCode,
    vnp_TmnCode: config.vnp_TmnCode && !config.vnp_TmnCode.includes('your-') ? config.vnp_TmnCode : 'ROUTINEVN',
    vnp_TransactionNo: transactionNo,
    vnp_TransactionStatus: responseCode,
    vnp_TxnRef: String(orderId),
  };

  const sortedParams = sortObject(vnpParams);
  const secureHash = createSecureHash(vnpParams, config.vnp_HashSecret);
  sortedParams['vnp_SecureHash'] = secureHash;

  const returnUrl = `${config.vnp_ReturnUrl}?${qs.stringify(sortedParams, { encode: false })}`;

  return {
    orderId,
    amount: Number(finalAmount),
    returnUrl,
    params: sortedParams,
    transactionNo,
  };
}

module.exports = {
  createPaymentUrl,
  createEmbeddedVNPayQR,
  getPaymentStatus,
  cancelPaymentTransaction,
  verifyReturnUrl,
  processIpn,
  generateSimulatedReturnParams,
};
