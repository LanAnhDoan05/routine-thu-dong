const biService = require('../services/businessIntelligenceService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * GET /api/v1/bi/overview
 */
async function getOverview(req, res) {
  try {
    const data = await biService.getOverviewKpis();
    return sendSuccess(res, data, 'Lấy tổng quan KPI kinh doanh thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * GET /api/v1/bi/revenue
 */
async function getRevenue(req, res) {
  try {
    const { range, interval, categoryId } = req.query;
    const data = await biService.getRevenueAnalytics({ range, interval, categoryId });
    return sendSuccess(res, data, 'Lấy báo cáo phân tích doanh thu thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * GET /api/v1/bi/inventory-forecast
 */
async function getInventoryForecast(req, res) {
  try {
    const data = await biService.getInventoryRestockForecast();
    return sendSuccess(res, data, 'Lấy báo cáo dự báo tồn kho & nhập hàng thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * GET /api/v1/bi/store-distribution
 */
async function getStoreDistribution(req, res) {
  try {
    const data = await biService.getStoreDistributionAnalytics();
    return sendSuccess(res, data, 'Lấy phân tích phân phối cửa hàng & nhu cầu vùng miền thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * GET /api/v1/bi/crm-rfm
 */
async function getCustomerCrm(req, res) {
  try {
    const data = await biService.getCustomerCrmAnalytics();
    return sendSuccess(res, data, 'Lấy phân tích khách hàng RFM CRM thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * POST /api/v1/bi/ai-insight
 */
async function getAiInsight(req, res) {
  try {
    const { domain, customPrompt } = req.body;
    const data = await biService.generateBiAiInsight({ domain, customPrompt });
    return sendSuccess(res, data, 'Tạo nhận xét AI Business Intelligence thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * POST /api/v1/bi/marketing-plan
 */
async function createMarketingPlan(req, res) {
  try {
    const { objective, targetSegment, budget, timeframe, focusCategory } = req.body;
    const data = await biService.generateMarketingPlan({
      objective,
      targetSegment,
      budget,
      timeframe,
      focusCategory,
    });
    return sendSuccess(res, data, 'Tạo kế hoạch chiến dịch Marketing AI thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * POST /api/v1/bi/ask-assistant
 */
async function askAssistant(req, res) {
  try {
    const { question, history } = req.body;
    if (!question || typeof question !== 'string') {
      return sendError(res, 'Vui lòng cung cấp câu hỏi hợp lệ', 400);
    }
    const data = await biService.askAdminBiAssistant({ question, history });
    return sendSuccess(res, data, 'Trợ lý AI đã giải đáp');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getOverview,
  getRevenue,
  getInventoryForecast,
  getStoreDistribution,
  getCustomerCrm,
  getAiInsight,
  createMarketingPlan,
  askAssistant,
};
