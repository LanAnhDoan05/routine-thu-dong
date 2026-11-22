const bi = require('../src/services/businessIntelligenceService');

async function testBiService() {
  console.log('Testing BI Service...');
  try {
    const kpis = await bi.getOverviewKpis();
    console.log('1. getOverviewKpis:', {
      totalProducts: kpis.totalProducts,
      validRevenue: kpis.validRevenue,
      aov: kpis.aov,
      inventory: kpis.inventory,
    });

    const rev = await bi.getRevenueAnalytics();
    console.log('2. getRevenueAnalytics:', {
      timeSeriesPoints: rev.timeSeries.length,
      categoriesCount: rev.categoryBreakdown.length,
      topSellingCount: rev.topSelling.length,
      slowMovingCount: rev.slowMoving.length,
      growthPercent: rev.comparison.growthPercent,
    });

    const restock = await bi.getInventoryRestockForecast();
    console.log('3. getInventoryRestockForecast:', {
      totalAnalyzed: restock.summary.totalAnalyzed,
      criticalCount: restock.summary.criticalCount,
      recommendedUnits: restock.summary.totalRecommendedUnits,
    });

    const store = await bi.getStoreDistributionAnalytics();
    console.log('4. getStoreDistributionAnalytics:', {
      storeCount: store.storeCount,
      regions: store.storeRegionBreakdown,
      southShare: store.regionDemand.SOUTH.percentage,
      northShare: store.regionDemand.NORTH.percentage,
    });

    const crm = await bi.getCustomerCrmAnalytics();
    console.log('5. getCustomerCrmAnalytics:', {
      totalCustomers: crm.summary.totalCustomers,
      repeatRate: crm.summary.repeatPurchaseRate,
      segments: crm.summary.segmentCounts,
    });

    console.log('Testing Gemini AI Executive Insight...');
    const insight = await bi.generateBiAiInsight({ domain: 'REVENUE' });
    console.log('6. generateBiAiInsight source:', insight.source);
    console.log('Insight preview (first 150 chars):', insight.insight?.slice(0, 150));

    console.log('ALL BI SERVICE TESTS PASSED!');
  } catch (err) {
    console.error('BI SERVICE TEST FAILED:', err);
  } finally {
    const prisma = require('../src/config/prisma');
    await prisma.$disconnect();
  }
}

testBiService();
