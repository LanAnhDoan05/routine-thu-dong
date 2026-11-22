import { fetchApi } from './api';

/**
 * Lấy tổng quan KPI Kinh Doanh cho AI BI
 */
export async function fetchBiOverview() {
  try {
    const data = await fetchApi('/bi/overview');
    return data;
  } catch (err) {
    console.error('[BI Service] fetchBiOverview error:', err.message);
    return null;
  }
}

/**
 * Lấy chuỗi dữ liệu phân tích doanh thu & so sánh kỳ
 */
export async function fetchBiRevenue(params = {}) {
  const query = new URLSearchParams();
  if (params.range) query.set('range', params.range);
  if (params.interval) query.set('interval', params.interval);
  if (params.categoryId) query.set('categoryId', params.categoryId);

  try {
    const data = await fetchApi(`/bi/revenue?${query.toString()}`);
    return data;
  } catch (err) {
    console.error('[BI Service] fetchBiRevenue error:', err.message);
    return null;
  }
}

/**
 * Lấy dự báo tồn kho, nguy cơ cạn hàng & số lượng đề xuất nhập
 */
export async function fetchBiInventoryForecast() {
  try {
    const data = await fetchApi('/bi/inventory-forecast');
    return data;
  } catch (err) {
    console.error('[BI Service] fetchBiInventoryForecast error:', err.message);
    return null;
  }
}

/**
 * Lấy báo cáo phân phối 25 showroom & nhu cầu vùng miền
 */
export async function fetchBiStoreDistribution() {
  try {
    const data = await fetchApi('/bi/store-distribution');
    return data;
  } catch (err) {
    console.error('[BI Service] fetchBiStoreDistribution error:', err.message);
    return null;
  }
}

/**
 * Lấy phân khúc khách hàng RFM & Customer 360
 */
export async function fetchBiCrmRfm() {
  try {
    const data = await fetchApi('/bi/crm-rfm');
    return data;
  } catch (err) {
    console.error('[BI Service] fetchBiCrmRfm error:', err.message);
    return null;
  }
}

/**
 * Yêu cầu Gemini AI phân tích chuyên sâu theo lĩnh vực
 */
export async function generateBiAiInsight({ domain = 'REVENUE', customPrompt = null }) {
  try {
    const data = await fetchApi('/bi/ai-insight', {
      method: 'POST',
      body: JSON.stringify({ domain, customPrompt }),
    });
    return data;
  } catch (err) {
    console.error('[BI Service] generateBiAiInsight error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Yêu cầu Gemini AI lập kế hoạch chiến dịch Marketing
 */
export async function generateMarketingCampaignPlan(params = {}) {
  try {
    const data = await fetchApi('/bi/marketing-plan', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data;
  } catch (err) {
    console.error('[BI Service] generateMarketingCampaignPlan error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Đặt câu hỏi trực tiếp cho Trợ lý AI Quản Trị
 */
export async function askAdminBiAssistant(question) {
  try {
    const data = await fetchApi('/bi/ask-assistant', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
    return data;
  } catch (err) {
    console.error('[BI Service] askAdminBiAssistant error:', err.message);
    return { success: false, error: err.message };
  }
}
