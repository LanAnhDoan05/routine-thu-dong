const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

// Yêu cầu xác thực tài khoản và quyền Quản trị viên (ADMIN) cho toàn bộ API thông báo Quản trị
router.use(authenticate, authorizeAdmin);

// GET /api/v1/notifications - Lấy danh sách thông báo
router.get('/', notificationController.getNotifications);

// GET /api/v1/notifications/unread-count - Lấy số lượng chưa đọc
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/v1/notifications/:id/read - Đánh dấu 1 thông báo đã đọc
router.patch('/:id/read', notificationController.markAsRead);

// PATCH /api/v1/notifications/mark-all-read & /read-all - Đánh dấu tất cả đã đọc
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

// POST /api/v1/notifications/test - Tạo thông báo thử nghiệm
router.post('/test', notificationController.createTestNotification);

module.exports = router;
