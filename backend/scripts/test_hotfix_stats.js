require('dotenv').config();
const analyticsService = require('../src/services/analyticsService');
const biService = require('../src/services/businessIntelligenceService');

async function testStats() {
  console.log('=== TESTING HOTFIX LOCAL CALCULATION ===');
  
  const dashboard = await analyticsService.getDashboardStats();
  console.log('\n1. Dashboard KPI:');
  console.log('Total Revenue:', dashboard.kpi.totalRevenue.toLocaleString('vi-VN'), 'VNĐ');
  console.log('Paid Revenue:', dashboard.kpi.paidRevenue.toLocaleString('vi-VN'), 'VNĐ');
  console.log('Total Orders:', dashboard.kpi.totalOrders);
  console.log('Valid Orders:', dashboard.kpi.validOrders);
  console.log('Average Order Value (AOV):', dashboard.kpi.averageOrderValue.toLocaleString('vi-VN'), 'VNĐ');

  console.log('\n2. Social Ecosystem Summary:');
  console.log(dashboard.socialEcosystem.summary);

  console.log('\n3. Social Ecosystem Breakdown:');
  console.log('TikTok:', dashboard.socialEcosystem.breakdown.TIKTOK);
  console.log('Facebook:', dashboard.socialEcosystem.breakdown.FACEBOOK);
  console.log('Instagram:', dashboard.socialEcosystem.breakdown.INSTAGRAM);
  console.log('Organic:', dashboard.socialEcosystem.breakdown.ORGANIC || dashboard.socialEcosystem.breakdown.DIRECT);

  const bi = await biService.getOverviewKpis();
  console.log('\n4. BI Overview KPIs:');
  console.log('Valid Revenue:', bi.validRevenue.toLocaleString('vi-VN'), 'VNĐ');
  console.log('Valid Orders:', bi.validOrdersCount);
  console.log('AOV:', bi.aov.toLocaleString('vi-VN'), 'VNĐ');
}

testStats().catch(console.error).finally(() => process.exit(0));
