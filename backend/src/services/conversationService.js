const prisma = require('../config/prisma');
const { scorePurchaseIntent } = require('./purchaseIntentService');

const HISTORY_LIMIT = 12;

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getOwner(req) {
  if (req.isAuth && req.userId) {
    return { userId: req.userId, guestSessionId: null };
  }
  if (typeof req.sessionId === 'string' && req.sessionId.trim()) {
    return { userId: null, guestSessionId: req.sessionId.trim() };
  }
  throw serviceError('Không xác định được phiên hội thoại. Vui lòng tải lại trang và thử lại.', 401);
}

async function findOwnedConversation(req, conversationId) {
  if (typeof conversationId !== 'string' || conversationId.length > 36) {
    throw serviceError('Mã hội thoại không hợp lệ', 400);
  }

  const owner = getOwner(req);
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, ...owner },
  });
  if (!conversation) {
    throw serviceError('Không tìm thấy hội thoại hoặc bạn không có quyền truy cập', 404);
  }
  return conversation;
}

async function startCustomerTurn(req, { conversationId, text, image }) {
  const owner = getOwner(req);
  let conversation;
  if (conversationId) {
    conversation = await findOwnedConversation(req, conversationId);
  } else {
    conversation = await prisma.aiConversation.create({ data: owner });
  }

  const imageUrl = image
    ? await require('../utils/fileStorage').saveBase64ToFile(image, 'ai_chat')
    : null;
  const customerMessage = await prisma.aiConversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'CUSTOMER',
      text,
      ...(imageUrl ? { metadata: { imageUrl } } : {}),
    },
  });
  return { ...conversation, currentMessageId: customerMessage.id };
}

async function getRecentHistory(req, conversation) {
  const messages = await prisma.aiConversationMessage.findMany({
    where: {
      conversationId: conversation.id,
      ...(conversation.currentMessageId ? { id: { not: conversation.currentMessageId } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  });
  const recentHistory = messages.reverse().map((message) => ({
    role: message.role === 'CUSTOMER' ? 'user' : 'model',
    text: message.text,
    ...(Array.isArray(message.metadata?.productNames)
      ? { products: message.metadata.productNames }
      : {}),
    ...(Array.isArray(message.metadata?.productIds)
      ? { productIds: message.metadata.productIds }
      : {}),
    ...(typeof message.metadata?.outfitId === 'string'
      ? { outfitId: message.metadata.outfitId }
      : {}),
  }));
  const summary = conversation.contextSummary;
  if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
    const preferences = Object.entries(summary)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`);
    if (preferences.length > 0) {
      recentHistory.unshift({
        role: 'model',
        text: `Tóm tắt sở thích đã ghi nhận từ hội thoại trước: ${preferences.join('; ')}.`,
      });
    }
  }
  return recentHistory;
}

function updateContextSummary(previousSummary, intent = {}) {
  const allowedFields = ['gender', 'style', 'budget', 'color', 'fit', 'category', 'occasion', 'recommendedSize'];
  const summary = previousSummary && typeof previousSummary === 'object' && !Array.isArray(previousSummary)
    ? { ...previousSummary }
    : {};

  for (const field of allowedFields) {
    const value = intent[field];
    if (value !== null && value !== undefined && value !== '') {
      summary[field] = field === 'budget' && Number.isSafeInteger(Number(value))
        ? Number(value)
        : String(value).slice(0, 100);
    }
  }
  return summary;
}

async function completeAssistantTurn(req, conversation, result) {
  const customerMessages = await prisma.aiConversationMessage.findMany({
    where: { conversationId: conversation.id, role: 'CUSTOMER' },
    select: { role: true, text: true },
  });
  const intent = scorePurchaseIntent(customerMessages);
  const customerTurnCount = customerMessages.length;
  const productIds = (result.products || [])
    .map((product) => product?.id || product?.productId)
    .filter((id) => typeof id === 'string');
  const productNames = (result.products || [])
    .map((product) => product?.name)
    .filter((name) => typeof name === 'string');
  const contextSummary = updateContextSummary(conversation.contextSummary, result.intent);
  const rawBudget = result.intent?.budget;
  const hasBudget = rawBudget !== null &&
    rawBudget !== undefined &&
    rawBudget !== '' &&
    Number.isSafeInteger(Number(rawBudget)) &&
    Number(rawBudget) >= 0;
  const budget = hasBudget
    ? Number(result.intent.budget)
    : conversation.budget;

  // Quy chuẩn chuyển tiếp chuyên viên:
  // 1. Sau 5 lượt trao đổi tư vấn (customerTurnCount === 5 hoặc chu kỳ 5 lượt nếu chưa đồng ý/từ chối).
  // 2. Hoặc nếu khách chủ động yêu cầu gặp chuyên viên / nhân viên (intent.hasExplicitStaffRequest) tại các lượt 1-4.
  // 3. Nếu khách đã từ chối (DECLINED), không hỏi lại ở lượt 6-9, chỉ hỏi lại ở chu kỳ kế tiếp (lượt 10) hoặc khi khách chủ động yêu cầu.
  let shouldOfferHandoff = false;
  if (!conversation.handoffConsentedAt && conversation.handoffDecision !== 'ACCEPTED') {
    if (intent.hasExplicitStaffRequest) {
      shouldOfferHandoff = true;
    } else if (customerTurnCount === 5 && conversation.handoffDecision !== 'DECLINED') {
      shouldOfferHandoff = true;
    } else if (customerTurnCount > 5 && customerTurnCount % 5 === 0) {
      shouldOfferHandoff = true;
    } else if (customerTurnCount >= 5 && !conversation.handoffDecision) {
      shouldOfferHandoff = true;
    }
  }

  const handoffPrompt = 'Bạn đã được hỗ trợ tìm hiểu sản phẩm và lựa chọn trang phục. Bạn có muốn mình kết nối với chuyên viên tư vấn Routine để được hỗ trợ trực tiếp và chi tiết hơn không?';

  const handoffOffer = shouldOfferHandoff ? {
    available: true,
    turnCount: customerTurnCount,
    prompt: handoffPrompt,
    options: [
      'Có, kết nối chuyên viên tư vấn',
      'Không, tôi muốn tiếp tục trao đổi với AI',
    ],
    intentScore: intent.score,
    intentLevel: intent.level,
  } : null;

  const assistantText = shouldOfferHandoff
    ? `${result.message}\n\n${handoffPrompt}`
    : result.message;

  await prisma.$transaction([
    prisma.aiConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'AI',
        text: assistantText,
        metadata: {
          productIds,
          productNames,
          turnCount: customerTurnCount,
          handoffOffered: shouldOfferHandoff,
          toolCalls: Array.isArray(result.toolCalls)
            ? result.toolCalls.filter((name) => typeof name === 'string').slice(0, 5)
            : [],
          outfitId: typeof result.outfit?.id === 'string' ? result.outfit.id : null,
          outfit: result.outfit || null,
          products: (result.products || []).slice(0, 6),
        },
      },
    }),
    prisma.aiConversation.update({
      where: { id: conversation.id },
      data: {
        intentScore: intent.score,
        intentLevel: intent.level,
        intentReason: intent.reason,
        intentSignals: intent.signals,
        interestedProductIds: [...new Set([
          ...(Array.isArray(conversation.interestedProductIds) ? conversation.interestedProductIds : []),
          ...productIds,
        ])],
        ...(Number.isSafeInteger(budget) ? { budget } : {}),
        contextSummary: {
          ...(contextSummary || {}),
          turnCount: customerTurnCount,
        },
      },
    }),
  ]);

  return {
    conversationId: conversation.id,
    handoffOffer: shouldOfferHandoff,
    handoffOfferData: handoffOffer,
    turnCount: customerTurnCount,
    message: assistantText,
  };
}

async function decideHandoff(req, conversationId, consent) {
  const isConsent = typeof consent === 'boolean'
    ? consent
    : (consent === 'accept' || consent === true || consent === 'true' || consent === 'Có, kết nối chuyên viên tư vấn');
  const conversation = await findOwnedConversation(req, conversationId);

  if (!isConsent) {
    const updated = await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { handoffDecision: 'DECLINED' },
    });
    return {
      status: updated.status,
      handoffDecision: updated.handoffDecision,
      message: 'Đã rõ. Bạn có thể tiếp tục trò chuyện với AI Stylist nhé!',
    };
  }

  const customerMessages = await prisma.aiConversationMessage.findMany({
    where: { conversationId: conversation.id, role: 'CUSTOMER' },
    select: { text: true },
  });
  const turnCount = customerMessages.length;

  const updated = await prisma.aiConversation.update({
    where: { id: conversation.id },
    data: {
      handoffDecision: 'ACCEPTED',
      handoffConsentedAt: new Date(),
      status: 'LEAD_PENDING',
    },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true } },
    },
  });

  const confirmationMessage = 'Mình đã ghi nhận yêu cầu kết nối chuyên viên tư vấn. Bạn vui lòng chờ chuyên viên Routine tiếp nhận nhé!';
  await prisma.aiConversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'AI',
      text: confirmationMessage,
      metadata: { systemNotice: 'HANDOFF_ACCEPTED', turnCount },
    },
  });

  let interestedProductNames = [];
  if (Array.isArray(conversation.interestedProductIds) && conversation.interestedProductIds.length > 0) {
    const prods = await prisma.product.findMany({
      where: { id: { in: conversation.interestedProductIds } },
      select: { name: true },
    });
    interestedProductNames = prods.map((p) => p.name);
  }

  // Phát thông báo thời gian thực cho Quản trị viên
  try {
    const realtimeService = require('./realtimeService');
    const customerDisplayName = updated.user?.fullName || 'Khách vãng lai';
    const reasonText = `Khách hàng ${customerDisplayName} yêu cầu kết nối chuyên viên sau ${turnCount} lượt trao đổi với AI Stylist.`;
    realtimeService.emit('CONSULTATION_REQUESTED', {
      conversationId: conversation.id,
      turnCount,
      userId: conversation.userId,
      guestSessionId: conversation.guestSessionId,
      customerName: customerDisplayName,
      customerEmail: updated.user?.email || null,
      customerPhone: updated.user?.phoneNumber || null,
      interestedProducts: interestedProductNames,
      status: 'LEAD_PENDING',
      reason: reasonText,
      timestamp: new Date().toISOString(),
    }, 'ADMIN');

    // Lưu thông báo bền vững vào Database cho Admin
    try {
      const notificationService = require('./notificationService');
      await notificationService.createNotification({
        type: 'CONSULTATION_REQUESTED',
        title: 'Yêu cầu tư vấn AI mới',
        message: `Khách hàng ${customerDisplayName} muốn kết nối chuyên viên tư vấn trực tiếp (sau ${turnCount} lượt chat AI).`,
        referenceType: 'CONVERSATION',
        referenceId: conversation.id,
        data: {
          conversationId: conversation.id,
          customerName: customerDisplayName,
          customerPhone: updated.user?.phoneNumber || null,
          interestedProducts: interestedProductNames,
        },
        link: `/admin/leads?chatId=${conversation.id}`,
        recipientRole: 'ADMIN',
      });
    } catch (notifErr) {
      console.warn('[conversationService] Lỗi tạo thông báo yêu cầu tư vấn:', notifErr.message);
    }
  } catch (e) {
    console.warn('[conversationService] Realtime emit error:', e.message);
  }

  return {
    status: updated.status,
    leadStatus: updated.status,
    handoffDecision: updated.handoffDecision,
    handedOffToStaff: true,
    turnCount,
    message: confirmationMessage,
  };
}

async function getCustomerMessages(req, conversationId) {
  const conversation = await findOwnedConversation(req, conversationId);
  const messages = await prisma.aiConversationMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, text: true, metadata: true, createdAt: true },
  });
  return {
    status: conversation.status,
    leadStatus: conversation.status,
    handoffDecision: conversation.handoffDecision,
    messages: messages.map((m) => ({
      ...m,
      senderRole: m.role,
      content: m.text,
    })),
  };
}

async function listConsentedLeads() {
  const conversations = await prisma.aiConversation.findMany({
    where: { handoffConsentedAt: { not: null } },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      messages: {
        where: { role: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, text: true, createdAt: true },
      },
    },
  });

  const productIds = [...new Set(conversations.flatMap((conversation) => (
    Array.isArray(conversation.interestedProductIds) ? conversation.interestedProductIds : []
  )).filter((id) => typeof id === 'string'))];
  const products = productIds.length
    ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, status: true },
    })
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));

  return conversations.map((conversation) => ({
    id: conversation.id,
    status: conversation.status,
    intentScore: conversation.intentScore,
    intentLevel: conversation.intentLevel,
    intentReason: conversation.intentReason,
    intentSignals: conversation.intentSignals,
    turnCount: conversation.messages?.length || conversation.contextSummary?.turnCount || 5,
    budget: conversation.budget,
    handoffConsentedAt: conversation.handoffConsentedAt,
    updatedAt: conversation.updatedAt,
    customer: conversation.user
      ? {
        id: conversation.user.id,
        name: conversation.user.fullName,
        email: conversation.user.email,
        phone: conversation.user.phoneNumber,
      }
      : null,
    interestedProducts: (Array.isArray(conversation.interestedProductIds)
      ? conversation.interestedProductIds
      : []).map((id) => productById.get(id)).filter(Boolean),
    lastMessage: conversation.messages[0]?.text || '',
  }));
}

async function getLeadMessages(conversationId) {
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, handoffConsentedAt: { not: null } },
    select: { id: true },
  });
  if (!conversation) throw serviceError('Không tìm thấy yêu cầu tư vấn đã được khách đồng ý', 404);
  return prisma.aiConversationMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, text: true, metadata: true, authorUserId: true, createdAt: true },
  });
}

async function sendStaffMessage(conversationId, authorUserId, text) {
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 4000) {
    throw serviceError('Tin nhắn tư vấn phải có từ 1 đến 4000 ký tự', 400);
  }
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, handoffConsentedAt: { not: null } },
    select: { id: true, status: true },
  });
  if (!conversation) throw serviceError('Không tìm thấy yêu cầu tư vấn đã được khách đồng ý', 404);

  const [, message] = await prisma.$transaction([
    prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { status: conversation.status === 'LEAD_PENDING' ? 'IN_PROGRESS' : conversation.status },
    }),
    prisma.aiConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'STAFF',
        text: text.trim(),
        authorUserId,
      },
    }),
  ]);

  try {
    const realtimeService = require('./realtimeService');
    realtimeService.emit('STAFF_MESSAGE_SENT', {
      conversationId: conversation.id,
      message,
    }, 'ALL');
  } catch (e) {}

  return message;
}

async function updateLeadStatus(conversationId, status) {
  const allowedStatuses = ['LEAD_PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  if (!allowedStatuses.includes(status)) {
    throw serviceError('Trạng thái yêu cầu tư vấn không hợp lệ', 400);
  }
  const result = await prisma.aiConversation.updateMany({
    where: { id: conversationId, handoffConsentedAt: { not: null } },
    data: { status },
  });
  if (result.count === 0) throw serviceError('Không tìm thấy yêu cầu tư vấn đã được khách đồng ý', 404);

  try {
    const realtimeService = require('./realtimeService');
    realtimeService.emit('LEAD_STATUS_UPDATED', {
      conversationId,
      status,
    }, 'ALL');
  } catch (e) {}

  return { id: conversationId, status };
}

module.exports = {
  HISTORY_LIMIT,
  completeAssistantTurn,
  decideHandoff,
  getCustomerMessages,
  getLeadMessages,
  getRecentHistory,
  listConsentedLeads,
  sendStaffMessage,
  startCustomerTurn,
  updateLeadStatus,
};
