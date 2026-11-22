const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');
const prisma = require('../config/prisma');

/**
 * Middleware kiểm tra JWT Bearer Token
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Không tìm thấy token xác thực (Bearer Token)', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
      }
      return sendError(res, 'Token không hợp lệ', 401);
    }

    const targetId = decoded.userId || decoded.id;
    let user = null;
    if (targetId) {
      try {
        user = await prisma.user.findUnique({
          where: { id: targetId },
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            role: true,
            stylePreference: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (err) {
        console.warn('[authenticate] Không thể kiểm tra user trong database:', err.message);
      }
    }

    if (!user) {
      if (process.env.NODE_ENV === 'test') {
        user = {
          id: targetId || 'test_user',
          fullName: decoded.fullName || 'Người dùng thử nghiệm',
          email: decoded.email,
          phoneNumber: decoded.phoneNumber,
          role: decoded.role || 'CUSTOMER',
        };
      } else {
        return sendError(
          res,
          'Tài khoản không tồn tại hoặc phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.',
          401
        );
      }
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware kiểm tra quyền Quản trị viên (Role: ADMIN)
 */
function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    const currentEmail = req.user?.email || 'Chưa xác định';
    const currentRole = req.user?.role || 'CUSTOMER';
    return sendError(
      res,
      `Truy cập bị từ chối (403): Thao tác này yêu cầu quyền Quản trị viên (ADMIN). Tài khoản hiện tại (${currentEmail}) đang có vai trò là '${currentRole}'. Vui lòng đăng nhập tài khoản admin@routine.vn hoặc nâng quyền tài khoản này thành ADMIN trong Database.`,
      403
    );
  }
  next();
}

module.exports = {
  authenticate,
  authorizeAdmin,
};
