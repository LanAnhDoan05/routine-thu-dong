const jwt = require('jsonwebtoken');
const realtimeService = require('../services/realtimeService');
const { sendSuccess } = require('../utils/response');

/**
 * Endpoint lắng nghe luồng sự kiện thời gian thực (SSE Stream)
 * GET /api/v1/realtime/stream
 */
async function streamEvents(req, res) {
  let role = 'GUEST';
  let userId = null;
  const guestSessionId = req.query.guestSessionId || req.headers['x-session-id'] || null;

  // Xác thực token từ query parameter hoặc Header
  const rawAuth = req.query.token || req.headers.authorization;
  const token = rawAuth ? rawAuth.replace(/^Bearer\s+/i, '') : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded) {
        role = decoded.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
        userId = decoded.userId || decoded.id || null;
      }
    } catch (err) {
      // Token không hợp lệ hoặc hết hạn -> đối xử như khách vãng lai
      role = 'GUEST';
    }
  }

  // Đăng ký client vào Realtime Event Hub
  realtimeService.addClient(res, {
    role,
    userId,
    guestSessionId,
  });

  // Hỗ trợ khôi phục sự kiện bị lỡ nếu client vừa kết nối lại sau mất mạng
  const lastEventId = Number(req.headers['last-event-id'] || req.query.lastEventId) || 0;
  if (lastEventId > 0) {
    const missed = realtimeService.getRecentEvents(lastEventId, role, userId);
    for (const evt of missed) {
      res.write(`id: ${evt.id}\n`);
      res.write(`event: ${evt.eventType}\n`);
      res.write(`data: ${JSON.stringify(evt.payload)}\n\n`);
    }
  }
}

/**
 * Lấy trạng thái hoạt động của Realtime Event Hub (Admin)
 * GET /api/v1/realtime/status
 */
async function getStatus(req, res) {
  return sendSuccess(res, {
    status: 'ONLINE',
    activeConnections: realtimeService.getActiveConnectionsCount(),
    timestamp: new Date().toISOString(),
  }, 'Lấy trạng thái hệ thống thời gian thực thành công');
}

module.exports = {
  streamEvents,
  getStatus,
};
