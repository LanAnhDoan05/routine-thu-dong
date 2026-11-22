const conversationService = require('../services/conversationService');
const { sendSuccess } = require('../utils/response');

async function getCustomerMessages(req, res, next) {
  try {
    const conversation = await conversationService.getCustomerMessages(req, req.params.id);
    return sendSuccess(res, conversation, 'Lấy hội thoại thành công');
  } catch (error) {
    next(error);
  }
}

async function decideHandoff(req, res, next) {
  try {
    const rawConsent = req.body?.consent !== undefined ? req.body.consent : req.body?.decision;
    const consent = rawConsent === 'accept' || rawConsent === true;
    const result = await conversationService.decideHandoff(
      req,
      req.params.id,
      consent
    );
    return sendSuccess(res, result, 'Đã ghi nhận lựa chọn tư vấn viên');
  } catch (error) {
    next(error);
  }
}

async function listLeads(req, res, next) {
  try {
    const leads = await conversationService.listConsentedLeads();
    return sendSuccess(res, { leads }, 'Lấy danh sách khách đã đồng ý tư vấn thành công');
  } catch (error) {
    next(error);
  }
}

async function getLeadMessages(req, res, next) {
  try {
    const messages = await conversationService.getLeadMessages(req.params.id);
    return sendSuccess(res, { messages }, 'Lấy lịch sử tư vấn thành công');
  } catch (error) {
    next(error);
  }
}

async function sendStaffMessage(req, res, next) {
  try {
    const text = req.body?.text || req.body?.content || req.body?.message;
    const message = await conversationService.sendStaffMessage(
      req.params.id,
      req.userId || req.user?.id,
      text
    );
    return sendSuccess(
      res,
      { ...message, senderRole: message.role, content: message.text },
      'Đã gửi tin nhắn tư vấn',
      201
    );
  } catch (error) {
    next(error);
  }
}

async function updateLeadStatus(req, res, next) {
  try {
    const result = await conversationService.updateLeadStatus(
      req.params.id,
      req.body?.status
    );
    return sendSuccess(res, result, 'Đã cập nhật trạng thái yêu cầu tư vấn');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  decideHandoff,
  getCustomerMessages,
  getLeadMessages,
  listLeads,
  sendStaffMessage,
  updateLeadStatus,
};
