const fs = require('fs');
const path = require('path');

async function runE2eAudit() {
  console.log('====================================================');
  console.log('   ROUTINE AI BUSINESS INTELLIGENCE (BI) E2E AUDIT  ');
  console.log('====================================================');

  const results = {
    revenueAnalysis: { status: 'UNKNOWN', details: {} },
    inventoryForecast: { status: 'UNKNOWN', details: {} },
    storeDistribution: { status: 'UNKNOWN', details: {} },
    crmCustomerAnalytics: { status: 'UNKNOWN', details: {} },
    marketingCampaignPlanning: { status: 'UNKNOWN', details: {} },
    adminAiAssistant: { status: 'UNKNOWN', details: {} },
    frontendAdminUi: { status: 'UNKNOWN', details: {} },
  };

  // 1. Auth Admin
  console.log('\n[1/7] Authenticating Admin user...');
  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin_new@routine.vn',
      password: 'Admin@123456',
    }),
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success || !loginJson.data?.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginJson));
  }
  const token = loginJson.data.token;
  console.log('  -> Admin authenticated successfully. Token verified.');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Revenue Analysis
  console.log('\n[2/7] Testing Revenue Analysis & Period Comparison...');
  const revRes = await fetch('http://localhost:5001/api/v1/bi/revenue?interval=day', { headers });
  const revJson = await revRes.json();
  const ovRes = await fetch('http://localhost:5001/api/v1/bi/overview', { headers });
  const ovJson = await ovRes.json();

  if (revJson.success && ovJson.success) {
    results.revenueAnalysis = {
      status: 'PASS',
      details: {
        totalValidRevenue: ovJson.data.validRevenue,
        validOrdersCount: ovJson.data.validOrdersCount,
        aov: ovJson.data.aov,
        growthPercent: revJson.data.comparison.growthPercent,
        topSellingCount: revJson.data.topSelling.length,
        slowMovingCount: revJson.data.slowMoving.length,
        categoriesCount: revJson.data.categoryBreakdown.length,
      },
    };
    console.log('  -> Revenue Analysis: PASS');
    console.log('     Valid Revenue:', ovJson.data.validRevenue.toLocaleString('vi-VN') + 'đ');
    console.log('     AOV:', ovJson.data.aov.toLocaleString('vi-VN') + 'đ');
    console.log('     Growth vs Previous Period: +' + revJson.data.comparison.growthPercent + '%');
  } else {
    results.revenueAnalysis.status = 'FAIL';
  }

  // 3. Inventory Forecast
  console.log('\n[3/7] Testing Inventory Restock Forecasting...');
  const invRes = await fetch('http://localhost:5001/api/v1/bi/inventory-forecast', { headers });
  const invJson = await invRes.json();

  if (invJson.success && invJson.data.summary) {
    results.inventoryForecast = {
      status: 'PASS',
      details: {
        totalAnalyzed: invJson.data.summary.totalAnalyzed,
        criticalCount: invJson.data.summary.criticalCount,
        highCount: invJson.data.summary.highCount,
        totalRecommendedUnits: invJson.data.summary.totalRecommendedUnits,
        estimatedCapital: invJson.data.summary.estimatedRestockCapital,
      },
    };
    console.log('  -> Inventory Forecasting: PASS');
    console.log('     Total Products Analyzed:', invJson.data.summary.totalAnalyzed);
    console.log('     Critical Stock Alerts:', invJson.data.summary.criticalCount);
    console.log('     Recommended Reorder Units:', invJson.data.summary.totalRecommendedUnits);
  } else {
    results.inventoryForecast.status = 'FAIL';
  }

  // 4. Store Distribution
  console.log('\n[4/7] Testing Store Distribution & Regional Analysis...');
  const storeRes = await fetch('http://localhost:5001/api/v1/bi/store-distribution', { headers });
  const storeJson = await storeRes.json();

  if (storeJson.success && storeJson.data.storeCount === 25) {
    results.storeDistribution = {
      status: 'PASS',
      details: {
        storeCount: storeJson.data.storeCount,
        regionalDemand: {
          north: storeJson.data.regionDemand.NORTH.percentage + '%',
          south: storeJson.data.regionDemand.SOUTH.percentage + '%',
          central: storeJson.data.regionDemand.CENTRAL.percentage + '%',
        },
        schemaNoticeGrounded: Boolean(storeJson.data.schemaNotice?.isCentralInventoryOnly),
      },
    };
    console.log('  -> Store Distribution: PASS');
    console.log('     Active Showrooms:', storeJson.data.storeCount);
    console.log('     Demand Shares: North=' + storeJson.data.regionDemand.NORTH.percentage + '%, South=' + storeJson.data.regionDemand.SOUTH.percentage + '%');
    console.log('     Schema Limitation Notice:', storeJson.data.schemaNotice.details.slice(0, 80) + '...');
  } else {
    results.storeDistribution.status = 'FAIL';
  }

  // 5. CRM & Customer 360
  console.log('\n[5/7] Testing CRM & Customer 360 RFM Analytics...');
  const crmRes = await fetch('http://localhost:5001/api/v1/bi/crm-rfm', { headers });
  const crmJson = await crmRes.json();

  if (crmJson.success && crmJson.data.customers.length > 0) {
    const sampleCustomer = crmJson.data.customers[0];
    const isPiiMasked = sampleCustomer.maskedPhone.includes('****') || sampleCustomer.maskedEmail.includes('****');
    results.crmCustomerAnalytics = {
      status: 'PASS',
      details: {
        totalCustomers: crmJson.data.summary.totalCustomers,
        repeatRate: crmJson.data.summary.repeatPurchaseRate,
        segments: crmJson.data.summary.segmentCounts,
        isPiiMasked,
      },
    };
    console.log('  -> CRM & Customer Analytics: PASS');
    console.log('     Total Customers:', crmJson.data.summary.totalCustomers);
    console.log('     Repeat Purchase Rate:', crmJson.data.summary.repeatPurchaseRate);
    console.log('     Sample Customer PII Protected:', isPiiMasked ? 'YES (' + sampleCustomer.maskedPhone + ')' : 'NO');
  } else {
    results.crmCustomerAnalytics.status = 'FAIL';
  }

  // 6. Gemini Marketing Campaign Planner
  console.log('\n[6/7] Testing Gemini Marketing Campaign Planner...');
  const mktRes = await fetch('http://localhost:5001/api/v1/bi/marketing-plan', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      objective: 'Tăng trưởng doanh thu BST Thu Đông Routine',
      targetSegment: 'Khách hàng At-Risk & Champions',
      budget: 40000000,
      timeframe: '4 tuần',
      focusCategory: 'Áo sơ mi & Quần Jean',
    }),
  });
  const mktJson = await mktRes.json();

  if (mktJson.success && mktJson.data.campaignPlan) {
    results.marketingCampaignPlanning = {
      status: 'PASS',
      details: {
        source: mktJson.data.source,
        planLength: mktJson.data.campaignPlan.length,
      },
    };
    console.log('  -> Marketing Campaign Planning: PASS (Source: ' + mktJson.data.source + ')');
    console.log('     Plan Preview:', mktJson.data.campaignPlan.slice(0, 120).replace(/\n/g, ' '));
  } else {
    results.marketingCampaignPlanning.status = 'FAIL';
  }

  // 7. Interactive Admin AI Assistant & Frontend Route
  console.log('\n[7/7] Testing Admin AI Q&A Assistant & Frontend Route...');
  const askRes = await fetch('http://localhost:5001/api/v1/bi/ask-assistant', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question: 'Phân tích nhanh doanh thu và sản phẩm có nguy cơ hết hàng?',
    }),
  });
  const askJson = await askRes.json();

  const feRes = await fetch('http://localhost:3000/admin/ai-bi');
  const feOk = feRes.status === 200;

  if (askJson.success && feOk) {
    results.adminAiAssistant = {
      status: 'PASS',
      details: {
        source: askJson.data.source,
        answerLength: askJson.data.answer.length,
      },
    };
    results.frontendAdminUi = {
      status: 'PASS',
      details: {
        route: '/admin/ai-bi',
        httpStatus: feRes.status,
      },
    };
    console.log('  -> Admin AI Q&A Assistant: PASS');
    console.log('     Answer Preview:', askJson.data.answer.slice(0, 120).replace(/\n/g, ' '));
    console.log('  -> Frontend Admin UI (/admin/ai-bi): PASS (HTTP ' + feRes.status + ')');
  } else {
    results.adminAiAssistant.status = 'FAIL';
    results.frontendAdminUi.status = 'FAIL';
  }

  console.log('\n====================================================');
  console.log('             FINAL ACCEPTANCE VERDICT               ');
  console.log('====================================================');
  const allPass = Object.values(results).every((r) => r.status === 'PASS');
  console.log('ALL MODULES AUDITED:', allPass ? '100% PASS' : 'SOME CHECKS FAILED');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runE2eAudit().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
