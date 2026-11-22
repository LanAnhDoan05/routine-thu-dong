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

// 9. On-Demand AI Business Intelligence Analysis (A1: Nút "PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ")
router.post('/analyze', biController.analyze);

// 10. Lấy số liệu phân tích theo khoảng thời gian (A3: Data processing metrics)
router.get('/metrics', biController.getMetrics);

// 11. Lịch sử báo cáo phân tích (A6 Khu vực 4: Lịch sử phân tích)
router.get('/reports', biController.getReports);

// 12. Chi tiết báo cáo phân tích (A6 Khu vực 3)
router.get('/reports/:id', biController.getReportById);

// 13. Cập nhật trạng thái kiến nghị (A6 Khu vực 3: Đã xem, Đang xử lý, Hoàn thành, Lưu trữ)
router.patch('/recommendations/:id/status', biController.updateRecommendation);

module.exports = router;
