const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');

// Giới hạn chung cho toàn bộ API (1000 requests / 15 phút trên production, nới lỏng cho môi trường local/test)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Bỏ qua giới hạn nếu là request nội bộ localhost hoặc môi trường test
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || process.env.NODE_ENV === 'test';
  },
  handler: (req, res) => {
    return sendError(
      res,
      'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.',
      429
    );
  },
});

// Giới hạn nghiêm ngặt cho xác thực (Login, Register, OTP): 20 requests / 1 phút
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      'Quá nhiều lần thử đăng nhập/xác thực. Vui lòng đợi 1 phút trước khi thử lại.',
      429
    );
  },
});

// Giới hạn cho AI Stylist: 25 requests / 1 phút để bảo vệ quota Google Gemini
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      'Hệ thống AI Stylist đang nhận nhiều yêu cầu. Vui lòng thử lại sau ít giây.',
      429
    );
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
};
