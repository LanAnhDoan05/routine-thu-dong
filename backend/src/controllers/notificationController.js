const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Lấy danh sách thông báo của Admin
 * GET /api/v1/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const { page, limit, unreadOnly } = req.query;
    const recipientRole = req.user?.role || 'ADMIN';
    const userId = req.user?.id || null;

    const result = await notificationService.getNotifications({
      recipientRole,
      userId,
      page,
      limit,
      unreadOnly: unreadOnly === 'true',
    });

    return sendSuccess(res, result, 'Lấy danh sách thông báo thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy số lượng thông báo chưa đọc
 * GET /api/v1/notifications/unread-count
 */
async function getUnreadCount(req, res, next) {
  try {
    const recipientRole = req.user?.role || 'ADMIN';
    const userId = req.user?.id || null;

    const unreadCount = await notificationService.getUnreadCount({
      recipientRole,
      userId,
    });

    return sendSuccess(res, { unreadCount }, 'Lấy số lượng thông báo chưa đọc thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Đánh dấu 1 thông báo là đã đọc
 * PATCH /api/v1/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 'Mã thông báo không hợp lệ', 400);
    }

    const recipientRole = req.user?.role || 'ADMIN';
    const result = await notificationService.markAsRead(id, { recipientRole });

    return sendSuccess(res, result, 'Đã đánh dấu thông báo là đã đọc');
  } catch (error) {
    if (error.message.includes('Không tìm thấy')) {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 * PATCH /api/v1/notifications/mark-all-read
 */
async function markAllAsRead(req, res, next) {
  try {
    const recipientRole = req.user?.role || 'ADMIN';
    const result = await notificationService.markAllAsRead({ recipientRole });

    return sendSuccess(res, result, 'Đã đánh dấu tất cả thông báo là đã đọc');
  } catch (error) {
    next(error);
  }
}

/**
 * Tạo thông báo thử nghiệm (hỗ trợ kiểm thử E2E)
 * POST /api/v1/notifications/test
 */
async function createTestNotification(req, res, next) {
  try {
    const { type = 'SYSTEM', title, message, data, link, referenceType, referenceId } = req.body;
    if (!title || !message) {
      return sendError(res, 'Vui lòng cung cấp title và message', 400);
    }

    const resolvedRefType = referenceType || data?.referenceType || (data?.orderId ? 'ORDER' : data?.conversationId ? 'CONVERSATION' : null);
    const resolvedRefId = referenceId || data?.referenceId || data?.orderId || data?.conversationId || null;

    const notification = await notificationService.createNotification({
      type,
      title,
      message,
      referenceType: resolvedRefType,
      referenceId: resolvedRefId,
      data,
      link,
      recipientRole: 'ADMIN',
    });

    return sendSuccess(res, notification, 'Tạo thông báo thử nghiệm thành công', 201);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createTestNotification,
};
