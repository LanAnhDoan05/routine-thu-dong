const prisma = require('../config/prisma');
const realtimeService = require('./realtimeService');

/**
 * Tạo mới một thông báo và lưu vào Database MySQL
 * Đồng thời bắn sự kiện SSE thời gian thực tới Admin
 */
async function createNotification({
  type,
  title,
  message,
  referenceType = null,
  referenceId = null,
  data = null,
  link = null,
  recipientRole = 'ADMIN',
  recipientId = null,
  userId = null,
}) {
  try {
    const finalRecipientId = recipientId || userId || null;

    // Cơ chế chống tạo trùng lặp thông báo (Idempotency)
    // Nếu cùng referenceType, referenceId và type trong 5 phút gần nhất, hoặc cùng title & type trong 5 phút gần nhất
    let existingRecent = null;
    if (referenceType && referenceId) {
      existingRecent = await prisma.notification.findFirst({
        where: {
          type,
          referenceType,
          referenceId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      });
    } else if (title) {
      existingRecent = await prisma.notification.findFirst({
        where: {
          type,
          title,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      });
    }

    if (existingRecent) {
      console.log(`[notificationService] Thông báo trùng lặp bị bỏ qua: ${type} cho ${referenceType || title}:${referenceId || ''}`);
      return existingRecent;
    }

    const stringifiedData = typeof data === 'object' && data !== null ? JSON.stringify(data) : (data || null);

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        referenceType,
        referenceId,
        data: stringifiedData,
        link,
        recipientRole,
        userId: finalRecipientId,
        recipientId: finalRecipientId,
        isRead: false,
      },
    });

    // Lấy số lượng thông báo chưa đọc cập nhật
    const unreadCount = await getUnreadCount({ recipientRole, userId: finalRecipientId });

    // Phát sự kiện SSE realtime tới client Admin
    realtimeService.emit('NOTIFICATION_NEW', {
      notification,
      unreadCount,
    }, recipientRole);

    return notification;
  } catch (error) {
    console.error('[notificationService] Lỗi khi tạo thông báo:', error);
    return null;
  }
}

/**
 * Lấy danh sách thông báo theo phân trang
 */
async function getNotifications({
  recipientRole = 'ADMIN',
  userId = null,
  page = 1,
  limit = 20,
  unreadOnly = false,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = { recipientRole };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { recipientRole, isRead: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Đếm số lượng thông báo chưa đọc
 */
async function getUnreadCount({ recipientRole = 'ADMIN', userId = null }) {
  try {
    return await prisma.notification.count({
      where: {
        recipientRole,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('[notificationService] Lỗi đếm unread:', error);
    return 0;
  }
}

/**
 * Đánh dấu một thông báo là đã đọc
 */
async function markAsRead(id, { recipientRole = 'ADMIN' } = {}) {
  const existing = await prisma.notification.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Không tìm thấy thông báo');
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  const unreadCount = await getUnreadCount({ recipientRole });

  // Phát SSE cập nhật số lượng chưa đọc
  realtimeService.emit('NOTIFICATION_READ', {
    id: updated.id,
    unreadCount,
  }, recipientRole);

  return { notification: updated, unreadCount };
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
async function markAllAsRead({ recipientRole = 'ADMIN' } = {}) {
  const result = await prisma.notification.updateMany({
    where: {
      recipientRole,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  // Phát SSE thông báo đã đọc tất cả
  realtimeService.emit('NOTIFICATION_ALL_READ', {
    unreadCount: 0,
    updatedCount: result.count,
  }, recipientRole);

  return {
    updatedCount: result.count,
    unreadCount: 0,
  };
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
