const prisma = require('../config/prisma');
const aiService = require('../services/aiService');
const conversationService = require('../services/conversationService');
const { sendSuccess, sendError } = require('../utils/response');

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_TEXT_LENGTH = 2000;
const MAX_HISTORY_PRODUCTS = 12;
const MAX_HISTORY_PRODUCT_NAME_LENGTH = 150;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Controller trò chuyện đa lượt với Trợ lý Thời trang AI Stylist
 * POST /api/v1/ai/chat
 */
async function chat(req, res, next) {
  try {
    const { message, history, currentProductId, userPreferences, image, conversationId } = req.body;
    const chatMessage = typeof message === 'string' ? message.trim() : '';
    if (!chatMessage && !image) {
      return sendError(res, 'Vui lòng nhập nội dung câu hỏi hoặc gửi ảnh cho AI Stylist', 400);
    }
    if (chatMessage.length > MAX_MESSAGE_LENGTH) {
      return sendError(res, `Tin nhắn không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự`, 400);
    }
    if (history !== undefined && !Array.isArray(history)) {
      return sendError(res, 'Lịch sử hội thoại không hợp lệ', 400);
    }
    if ((history || []).length > MAX_HISTORY_ITEMS) {
      return sendError(res, `Lịch sử hội thoại tối đa ${MAX_HISTORY_ITEMS} lượt`, 400);
    }
    if ((history || []).some((entry) => (
      !entry ||
      typeof entry !== 'object' ||
      !['user', 'model'].includes(entry.role) ||
      typeof entry.text !== 'string' ||
      entry.text.length > MAX_HISTORY_TEXT_LENGTH ||
      (entry.outfitId != null && (typeof entry.outfitId !== 'string' || entry.outfitId.length > 191)) ||
      (entry.outfitTitle != null && (typeof entry.outfitTitle !== 'string' || entry.outfitTitle.length > 200)) ||
      (entry.products !== undefined && (
        !Array.isArray(entry.products) ||
        entry.products.length > MAX_HISTORY_PRODUCTS ||
        entry.products.some((name) => typeof name !== 'string' || name.length > MAX_HISTORY_PRODUCT_NAME_LENGTH)
      ))
    ))) {
      return sendError(res, 'Một mục trong lịch sử hội thoại không hợp lệ', 400);
    }
    if (image !== undefined && image !== null) {
      if (typeof image !== 'string') {
        return sendError(res, 'Ảnh gửi lên không hợp lệ', 400);
      }
      const imageMatch = image.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
      const maxEncodedImageLength = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
      if (
        !imageMatch ||
        imageMatch[1].length > maxEncodedImageLength ||
        Buffer.from(imageMatch[1], 'base64').length > MAX_IMAGE_BYTES
      ) {
        return sendError(res, 'Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 4 MB', 400);
      }
    }
    if (currentProductId !== undefined && currentProductId !== null && (
      typeof currentProductId !== 'string' || currentProductId.length > 191
    )) {
      return sendError(res, 'Mã sản phẩm không hợp lệ', 400);
    }
    if (conversationId !== undefined && conversationId !== null && (
      typeof conversationId !== 'string' || conversationId.length > 36
    )) {
      return sendError(res, 'Mã hội thoại không hợp lệ', 400);
    }
    if (userPreferences !== undefined && userPreferences !== null && (
      typeof userPreferences !== 'object' || Array.isArray(userPreferences)
    )) {
      return sendError(res, 'Tùy chọn người dùng không hợp lệ', 400);
    }

    let resolvedPreferences = userPreferences ? {
      ...(typeof userPreferences.gender === 'string' ? { gender: userPreferences.gender.slice(0, 30) } : {}),
      ...(typeof userPreferences.style === 'string' ? { style: userPreferences.style.slice(0, 50) } : {}),
    } : null;
    // Tự động nạp giới tính và gu phong cách từ tài khoản đã đăng nhập trong MySQL
    if (req.userId && (!resolvedPreferences || !resolvedPreferences.gender)) {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { gender: true, stylePreference: true },
      });
      if (dbUser) {
        resolvedPreferences = {
          ...(resolvedPreferences || {}),
          gender: dbUser.gender || 'unisex',
          style: resolvedPreferences?.style || dbUser.stylePreference || 'minimal',
        };
      }
    }

    const conversation = await conversationService.startCustomerTurn(req, {
      conversationId,
      text: chatMessage || '[Khách gửi ảnh]',
      image,
    });

    // Nếu hội thoại đã được bàn giao cho chuyên viên thời trang (LEAD_PENDING, IN_PROGRESS, ASSIGNED):
    // Tin nhắn của khách đã được lưu vào Database. AI tuyệt đối không tự chen vào trả lời;
    // Bắn sự kiện thời gian thực cho Admin và thông báo khách chờ phản hồi.
    if (conversation.handoffConsentedAt && ['LEAD_PENDING', 'IN_PROGRESS', 'ASSIGNED'].includes(conversation.status)) {
      try {
        const realtimeService = require('../services/realtimeService');
        realtimeService.emit('CUSTOMER_MESSAGE_SENT', {
          conversationId: conversation.id,
          messageId: conversation.currentMessageId,
          text: chatMessage,
          createdAt: new Date().toISOString(),
        }, 'ADMIN');
      } catch (e) {}

      return sendSuccess(
        res,
        {
          isStaffTakeover: true,
          status: conversation.status,
          message: 'Tin nhắn của bạn đã được chuyển tới chuyên viên tư vấn Routine Thu Đông. Chuyên viên sẽ phản hồi bạn trong giây lát!',
          conversationId: conversation.id,
          turnCount: conversation.turnCount || 0,
        },
        'Tin nhắn đã được chuyển tới chuyên viên tư vấn',
        200
      );
    }
    const conversationHistory = await conversationService.getRecentHistory(req, conversation);
    const effectiveHistory = (conversationHistory && conversationHistory.length > 0)
      ? conversationHistory
      : (Array.isArray(history) ? history : []);
    const result = await aiService.chatWithStylist({
      message: chatMessage,
      history: effectiveHistory,
      currentProductId: currentProductId || null,
      userPreferences: resolvedPreferences,
      image: image || null,
      currentUser: req.user || null,
      userId: req.user?.id || null,
      sessionId: req.headers['x-session-id'] || req.cookies?.routine_guest_session_id || null,
    });

    const persistedTurn = await conversationService.completeAssistantTurn(
      req,
      conversation,
      result
    );

    return sendSuccess(
      res,
      {
        ...result,
        message: persistedTurn.message,
        conversationId: persistedTurn.conversationId,
        handoffOffer: Boolean(persistedTurn.handoffOffer),
        handoffOfferData: persistedTurn.handoffOfferData,
        turnCount: persistedTurn.turnCount,
      },
      'Phản hồi từ AI Stylist thành công',
      200
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Controller tư vấn trang phục thông minh (AI Fashion Stylist) - Endpoint cũ
 */
async function getOutfitRecommendation(req, res, next) {
  try {
    const { occasion, style, budget, gender, message, goal } = req.body;

    const recommendation = await aiService.generateOutfitRecommendation({
      occasion,
      style,
      budget,
      gender,
      userMessage: message || goal,
    });

    return sendSuccess(
      res,
      recommendation,
      'Gợi ý trang phục từ AI Stylist thành công',
      200
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Controller xử lý tương thích ngược cho route /suggest
 */
async function getRoutineSuggestions(req, res, next) {
  try {
    const { goal, occasion, style, budget } = req.body;

    const result = await aiService.generateOutfitRecommendation({
      occasion,
      style,
      budget,
      userMessage: goal,
    });

    return sendSuccess(
      res,
      result,
      'Gợi ý từ AI thành công',
      200
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  chat,
  getOutfitRecommendation,
  getRoutineSuggestions,
};
