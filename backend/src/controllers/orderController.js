const orderService = require('../services/orderService');
const realtimeService = require('../services/realtimeService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Tạo đơn hàng mới
 */
async function createOrder(req, res, next) {
  try {
    const orderInput = req.body;
    const newOrder = await orderService.createOrder(req.identityId, orderInput);

    // Phát sự kiện real-time cho Admin và cập nhật tồn kho
    realtimeService.emit('ORDER_CREATED', newOrder, 'ADMIN');
    realtimeService.emit('STOCK_UPDATED', { orderId: newOrder.id, items: newOrder.items }, 'ALL');

    // Lưu thông báo bền vững vào Database và bắn thông báo thời gian thực tới Admin
    try {
      const notificationService = require('../services/notificationService');
      const orderCode = newOrder.id ? newOrder.id.slice(-6).toUpperCase() : 'MỚI';
      const orderTotal = newOrder.total || newOrder.totalAmount || 0;
      const amountStr = orderTotal.toLocaleString('vi-VN');
      const custName = newOrder.receiverName || newOrder.customerName || (req.user?.fullName) || 'Khách vãng lai';
      await notificationService.createNotification({
        type: 'ORDER_CREATED',
        title: `Đơn hàng mới #${orderCode}`,
        message: `Khách hàng ${custName} vừa đặt đơn hàng trị giá ${amountStr}đ.`,
        referenceType: 'ORDER',
        referenceId: newOrder.id,
        data: { orderId: newOrder.id, amount: orderTotal, customerName: custName },
        link: `/admin/orders?orderId=${newOrder.id}`,
        recipientRole: 'ADMIN',
      });
    } catch (notifErr) {
      console.warn('[orderController] Lỗi tạo thông báo đơn hàng mới:', notifErr.message);
    }

    return sendSuccess(res, newOrder, 'Đặt hàng thành công', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách đơn hàng của khách
 */
async function getOrders(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await orderService.getOrders({
      identityId: req.identityId,
      status,
      page,
      limit,
    });
    return sendSuccess(res, result, 'Lấy danh sách đơn hàng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy chi tiết đơn hàng
 */
async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    if (!order) {
      return sendError(res, `Không tìm thấy đơn hàng với mã "${id}"`, 404);
    }

    return sendSuccess(res, order, 'Lấy thông tin đơn hàng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Hủy đơn hàng
 */
async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const updatedOrder = await orderService.cancelOrder(id);
    return sendSuccess(res, updatedOrder, 'Hủy đơn hàng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Mua lại đơn hàng cũ
 */
async function reorder(req, res, next) {
  try {
    const { id } = req.params;
    const cart = await orderService.reorder(id, req.identityId);
    return sendSuccess(res, cart, 'Đã thêm toàn bộ sản phẩm của đơn hàng vào giỏ');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy toàn bộ đơn hàng của tất cả khách hàng (Admin)
 */
async function getAllOrdersForAdmin(req, res, next) {
  try {
    const { status, page, limit, search, source, paymentStatus, customerType, scope } = req.query;
    const result = await orderService.getAllOrdersForAdmin({
      status,
      page,
      limit,
      search,
      source,
      paymentStatus,
      customerType,
      scope,
    });
    return sendSuccess(res, result, 'Lấy danh sách toàn bộ đơn hàng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật trạng thái đơn hàng (Admin)
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    if (!status && !paymentStatus) {
      return sendError(res, 'Vui lòng cung cấp trạng thái mới (status hoặc paymentStatus)', 400);
    }

    const updated = await orderService.updateOrderStatus(id, status, paymentStatus);

    // Phát sự kiện cập nhật trạng thái đơn hàng tới Admin và Khách hàng sở hữu đơn
    realtimeService.emit('ORDER_STATUS_UPDATED', updated, 'ADMIN');
    if (updated.userId) {
      realtimeService.emit('ORDER_STATUS_UPDATED', updated, `USER:${updated.userId}`);
    } else if (updated.guestSessionId) {
      realtimeService.emit('ORDER_STATUS_UPDATED', updated, `GUEST:${updated.guestSessionId}`);
    }

    if (updated.paymentStatus === 'PAID') {
      realtimeService.emit('PAYMENT_CONFIRMED', updated, 'ADMIN');
      if (updated.userId) {
        realtimeService.emit('PAYMENT_CONFIRMED', updated, `USER:${updated.userId}`);
      }
    }

    // Ghi nhận thông báo quản trị khi có thay đổi trạng thái
    try {
      const notificationService = require('../services/notificationService');
      const orderCode = updated.id ? updated.id.slice(-6).toUpperCase() : id;
      if (paymentStatus === 'PAID') {
        const orderTotal = updated.total || updated.totalAmount || 0;
        await notificationService.createNotification({
          type: 'PAYMENT_SUCCESS',
          title: `Thanh toán thành công #${orderCode}`,
          message: `Đơn hàng #${orderCode} đã được thanh toán thành công: ${orderTotal.toLocaleString('vi-VN')}đ.`,
          data: { orderId: updated.id, paymentStatus: 'PAID', total: orderTotal },
          link: `/admin/orders?orderId=${updated.id}`,
          recipientRole: 'ADMIN',
        });
      } else if (status) {
        await notificationService.createNotification({
          type: 'ORDER_STATUS_UPDATED',
          title: `Cập nhật đơn hàng #${orderCode}`,
          message: `Đơn hàng #${orderCode} đã chuyển sang trạng thái "${updated.status}".`,
          data: { orderId: updated.id, status: updated.status },
          link: `/admin/orders?orderId=${updated.id}`,
          recipientRole: 'ADMIN',
        });
      }
    } catch (notifErr) {
      console.warn('[orderController] Lỗi tạo thông báo cập nhật đơn hàng:', notifErr.message);
    }

    return sendSuccess(res, updated, 'Cập nhật trạng thái đơn hàng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy trạng thái giữ tồn kho của đơn hàng (thời gian còn lại trong 5 phút)
 */
async function getHoldStatus(req, res, next) {
  try {
    const { id } = req.params;
    const holdStatus = await orderService.getOrderHoldStatus(id);
    return sendSuccess(res, holdStatus, 'Lấy trạng thái giữ hàng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Gửi hoặc gửi lại hóa đơn đơn hàng qua Email
 */
async function sendOrderInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const { email } = req.body || {};
    const result = await orderService.sendOrderInvoice(id, email);
    return sendSuccess(res, result, 'Gửi hóa đơn đơn hàng qua email thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  reorder,
  getAllOrdersForAdmin,
  updateOrderStatus,
  getHoldStatus,
  sendOrderInvoice,
};

