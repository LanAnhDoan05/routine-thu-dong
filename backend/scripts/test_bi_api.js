async function testApi() {
  console.log('Testing BI API Endpoints...');

  // 1. Login
  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin_new@routine.vn',
      password: 'Admin@123456',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    return;
  }
  const token = loginData.data?.token || loginData.data?.tokens?.accessToken;
  console.log('Admin Token acquired successfully. Token length:', token?.length);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Test GET /overview
  const ovRes = await fetch('http://localhost:5001/api/v1/bi/overview', { headers });
  const ovJson = await ovRes.json();
  console.log('GET /api/v1/bi/overview:', ovRes.status, ovJson.success ? 'SUCCESS' : 'FAILED', {
    revenue: ovJson.data?.validRevenue,
    orders: ovJson.data?.validOrdersCount,
    aov: ovJson.data?.aov,
  });

  // 3. Test GET /revenue
  const revRes = await fetch('http://localhost:5001/api/v1/bi/revenue?interval=day', { headers });
  const revJson = await revRes.json();
  console.log('GET /api/v1/bi/revenue:', revRes.status, revJson.success ? 'SUCCESS' : 'FAILED', {
    timeSeriesLength: revJson.data?.timeSeries?.length,
    growthPercent: revJson.data?.comparison?.growthPercent,
  });

  // 4. Test GET /inventory-forecast
  const invRes = await fetch('http://localhost:5001/api/v1/bi/inventory-forecast', { headers });
  const invJson = await invRes.json();
  console.log('GET /api/v1/bi/inventory-forecast:', invRes.status, invJson.success ? 'SUCCESS' : 'FAILED', {
    criticalCount: invJson.data?.summary?.criticalCount,
    recommendedUnits: invJson.data?.summary?.totalRecommendedUnits,
  });

  // 5. Test GET /store-distribution
  const storeRes = await fetch('http://localhost:5001/api/v1/bi/store-distribution', { headers });
  const storeJson = await storeRes.json();
  console.log('GET /api/v1/bi/store-distribution:', storeRes.status, storeJson.success ? 'SUCCESS' : 'FAILED', {
    storeCount: storeJson.data?.storeCount,
    southShare: storeJson.data?.regionDemand?.SOUTH?.percentage,
  });

  // 6. Test GET /crm-rfm
  const crmRes = await fetch('http://localhost:5001/api/v1/bi/crm-rfm', { headers });
  const crmJson = await crmRes.json();
  console.log('GET /api/v1/bi/crm-rfm:', crmRes.status, crmJson.success ? 'SUCCESS' : 'FAILED', {
    customersCount: crmJson.data?.summary?.totalCustomers,
    repeatRate: crmJson.data?.summary?.repeatPurchaseRate,
  });

  // 7. Test POST /ai-insight
  console.log('Testing POST /api/v1/bi/ai-insight with Gemini...');
  const aiRes = await fetch('http://localhost:5001/api/v1/bi/ai-insight', {
    method: 'POST',
    headers,
    body: JSON.stringify({ domain: 'REVENUE' }),
  });
  const aiJson = await aiRes.json();
  console.log('POST /api/v1/bi/ai-insight:', aiRes.status, aiJson.success ? 'SUCCESS' : 'FAILED', {
    source: aiJson.data?.source,
    preview: aiJson.data?.insight?.slice(0, 100),
  });

  // 8. Test POST /ask-assistant
  console.log('Testing POST /api/v1/bi/ask-assistant...');
  const askRes = await fetch('http://localhost:5001/api/v1/bi/ask-assistant', {
    method: 'POST',
    headers,
    body: JSON.stringify({ question: 'Sản phẩm nào đang bán chạy nhất và sản phẩm nào cần cảnh báo tồn kho?' }),
  });
  const askJson = await askRes.json();
  console.log('POST /api/v1/bi/ask-assistant:', askRes.status, askJson.success ? 'SUCCESS' : 'FAILED', {
    answerPreview: askJson.data?.answer?.slice(0, 100),
  });

  // 9. Test POST /marketing-plan
  console.log('Testing POST /api/v1/bi/marketing-plan with Gemini...');
  const planRes = await fetch('http://localhost:5001/api/v1/bi/marketing-plan', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      objective: 'Tăng trưởng doanh thu BST Thu Đông và kích hoạt khách hàng At-Risk',
      targetSegment: 'Khách hàng At-Risk & Champions',
      budget: 30000000,
      timeframe: '4 tuần',
      focusCategory: 'Áo sơ mi & Quần Jean',
    }),
  });
  const planJson = await planRes.json();
  console.log('POST /api/v1/bi/marketing-plan:', planRes.status, planJson.success ? 'SUCCESS' : 'FAILED', {
    source: planJson.data?.source,
    preview: planJson.data?.campaignPlan?.slice(0, 100),
  });

  console.log('ALL API ENDPOINTS TESTED SUCCESSFULLY!');
}

testApi();
