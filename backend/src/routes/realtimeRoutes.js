const express = require('express');
const router = express.Router();
const realtimeController = require('../controllers/realtimeController');

// GET /api/v1/realtime/stream (SSE Stream cho cả Admin, Customer và Khách vãng lai)
router.get('/stream', realtimeController.streamEvents);

// GET /api/v1/realtime/status (Kiểm tra trạng thái kết nối)
router.get('/status', realtimeController.getStatus);

module.exports = router;
