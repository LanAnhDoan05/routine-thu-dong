const express = require('express');
const router = express.Router();
const biController = require('../controllers/businessIntelligenceController');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

// Tất cả các route AI Business Intelligence yêu cầu quyền Quản trị viên (Admin)
router.use(authenticate, authorizeAdmin);

// 1. Tổng quan KPI
router.get('/overview', biController.getOverview);

// 2. Phân tích doanh thu
router.get('/revenue', biController.getRevenue);

// 3. Dự báo nhu cầu & đề xuất nhập hàng
router.get('/inventory-forecast', biController.getInventoryForecast);

// 4. Phân phối & vận hành cửa hàng
router.get('/store-distribution', biController.getStoreDistribution);

// 5. CRM & phân khúc khách hàng RFM
router.get('/crm-rfm', biController.getCustomerCrm);

// 6. Gemini AI Insight phân tích chuyên sâu
router.post('/ai-insight', biController.getAiInsight);

// 7. Gemini AI lập kế hoạch Marketing
router.post('/marketing-plan', biController.createMarketingPlan);

// 8. Trợ lý AI Quản trị tương tác Q&A
router.post('/ask-assistant', biController.askAssistant);

module.exports = router;
