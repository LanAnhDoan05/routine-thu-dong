const biService = require('../services/businessIntelligenceService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * GET /api/v1/bi/overview
 */
async function getOverview(req, res) {
  try {
    const { scope } = req.query;
    const data = await biService.getOverviewKpis({ scope });
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
    const { objective, targetSegment, budget, timeframe, focusCategory } = req.body || {};
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

/**
 * POST /api/v1/bi/analyze (On-Demand AI Business Intelligence Analysis - A1)
 */
async function analyze(req, res) {
  try {
    const { period, startDate, endDate } = req.body || {};
    const adminId = req.user ? req.user.id : null;
    const result = await biService.runOnDemandAiBusinessAnalysis({
      adminId,
      period: period || '30d',
      startDate,
      endDate,
    });
    return sendSuccess(res, result, 'Phân tích và khởi tạo kiến nghị AI thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * GET /api/v1/bi/metrics
 */
async function getMetrics(req, res) {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await biService.calculatePeriodMetrics({ period, startDate, endDate });
    return sendSuccess(res, data, 'Lấy chỉ số kinh doanh kỳ phân tích thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * GET /api/v1/bi/reports (Historical analysis sessions - A6 Khu vực 4)
 */
async function getReports(req, res) {
  try {
    const { page, limit } = req.query;
    const data = await biService.getAiBiReportsList({ page, limit });
    return sendSuccess(res, data, 'Lấy danh sách lịch sử phân tích thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * GET /api/v1/bi/reports/:id
 */
async function getReportById(req, res) {
  try {
    const data = await biService.getAiBiReportDetail(req.params.id);
    return sendSuccess(res, data, 'Lấy chi tiết báo cáo phân tích thành công');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

/**
 * PATCH /api/v1/bi/recommendations/:id/status (A6 Khu vực 3 Status update)
 */
async function updateRecommendation(req, res) {
  try {
    const { status } = req.body;
    if (!status) {
      return sendError(res, 'Vui lòng cung cấp trạng thái cần cập nhật', 400);
    }
    const data = await biService.updateRecommendationStatus(req.params.id, status);
    return sendSuccess(res, data, 'Cập nhật trạng thái kiến nghị thành công');
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
  analyze,
  getMetrics,
  getReports,
  getReportById,
  updateRecommendation,
};
