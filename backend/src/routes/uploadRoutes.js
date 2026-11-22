const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

// GET /api/v1/upload/status (Kiểm tra trạng thái cấu hình storage)
router.get(
  '/status',
  authenticate,
  authorizeAdmin,
  uploadController.getStorageStatus
);

// POST /api/v1/upload/image (Upload 1 ảnh)
router.post(
  '/image',
  authenticate,
  authorizeAdmin,
  uploadController.uploadSingle,
  uploadController.handleUploadSuccess
);

// POST /api/v1/upload/multiple (Upload nhiều ảnh cùng lúc)
router.post(
  '/multiple',
  authenticate,
  authorizeAdmin,
  uploadController.uploadMultiple,
  uploadController.handleMultipleUploadSuccess
);

module.exports = router;
