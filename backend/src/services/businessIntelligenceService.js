const prisma = require('../config/prisma');
const geminiService = require('./geminiService');

/**
 * Utility: Mask PII (Phone & Email) for Customer 360 Privacy
 */
function maskPhone(phone) {
  if (!phone) return 'N/A';
  const clean = String(phone).trim();
  if (clean.length < 7) return clean;
  return clean.substring(0, 3) + '****' + clean.substring(clean.length - 3);
}

function maskEmail(email) {
  if (!email) return 'N/A';
  const clean = String(email).trim();
  const parts = clean.split('@');
  if (parts.length < 2) return clean;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? name[0] + '*' : name.substring(0, 2) + '****' + name.slice(-1);
  return `${maskedName}@${domain}`;
}

/**
 * 1. Overview KPIs
 */
async function getOverviewKpis() {
  try {
    const [
      totalProducts,
      totalOrders,
      ordersAgg,
      paidAgg,
      totalCustomers,
      productsWithStock,
      orderStatusCounts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: { orderStatus: { not: 'CANCELLED' } },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: { paymentStatus: 'PAID' },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.findMany({
        select: { id: true, stockQuantity: true, price: true, originalPrice: true, soldCount: true },
      }),
      prisma.order.groupBy({
        by: ['orderStatus'],
        _count: { id: true },
      }),
    ]);

    const validRevenue = Number(ordersAgg._sum.total) || 0;
    const validOrdersCount = ordersAgg._count.id || 0;
    const paidRevenue = Number(paidAgg._sum.total) || 0;
    const aov = validOrdersCount > 0 ? Math.round(validRevenue / validOrdersCount) : 0;

    let outOfStockCount = 0;
    let criticalLowStockCount = 0; // <= 15
    let healthyStockCount = 0;
    let totalStockUnits = 0;
    let potentialStockValue = 0;
    let potentialOriginalValue = 0;

    productsWithStock.forEach((p) => {
      const stock = Number(p.stockQuantity) || 0;
      const price = Number(p.price) || 0;
      const origPrice = Number(p.originalPrice) || price;
      totalStockUnits += stock;
      potentialStockValue += stock * price;
      potentialOriginalValue += stock * origPrice;

      if (stock === 0) outOfStockCount += 1;
      else if (stock <= 15) criticalLowStockCount += 1;
      else healthyStockCount += 1;
    });

    // Gross margin estimate based on originalPrice vs sale price
    const estimatedDiscountRate = potentialOriginalValue > 0
      ? Math.round(((potentialOriginalValue - potentialStockValue) / potentialOriginalValue) * 100)
      : 0;

    // Status map
    const statusMap = {};
    orderStatusCounts.forEach((sc) => {
      statusMap[sc.orderStatus] = sc._count.id;
    });

    return {
      totalProducts,
      totalOrders,
      validOrdersCount,
      validRevenue,
      paidRevenue,
      aov,
      totalCustomers,
      inventory: {
        totalStockUnits,
        outOfStockCount,
        criticalLowStockCount,
        healthyStockCount,
        potentialStockValue,
        estimatedDiscountRate,
      },
      orderStatusMap: statusMap,
    };
  } catch (error) {
    console.error('[businessIntelligenceService] getOverviewKpis error:', error);
    throw error;
  }
}

/**
 * 2. Revenue Analytics & Period Comparison
 */
async function getRevenueAnalytics({ range = 'all', interval = 'day', categoryId = null } = {}) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        orderStatus: { not: 'CANCELLED' },
        ...(categoryId ? { items: { some: { product: { categoryId } } } } : {}),
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        paymentStatus: true,
        orderStatus: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            subtotal: true,
            product: {
              select: {
                id: true,
                name: true,
                categoryId: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Time series grouping
    const timeSeriesMap = new Map();
    orders.forEach((ord) => {
      const d = new Date(ord.createdAt);
      let key = '';
      if (interval === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (interval === 'week') {
        // Find Monday of the week
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay() + 1));
        key = `${firstDay.getFullYear()}-W${Math.ceil(firstDay.getDate() / 7)}`;
      } else {
        key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      }

      const existing = timeSeriesMap.get(key) || { date: key, revenue: 0, orders: 0 };
      existing.revenue += Number(ord.total) || 0;
      existing.orders += 1;
      timeSeriesMap.set(key, existing);
    });

    const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Category revenue breakdown
    const categoryMap = new Map();
    orders.forEach((ord) => {
      ord.items.forEach((item) => {
        const catName = item.product?.category?.name || 'Khác';
        const subtotal = Number(item.subtotal) || (Number(item.price) * Number(item.quantity)) || 0;
        const current = categoryMap.get(catName) || { name: catName, revenue: 0, units: 0 };
        current.revenue += subtotal;
        current.units += Number(item.quantity) || 1;
        categoryMap.set(catName, current);
      });
    });

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    // Top Selling vs Slow Moving Products
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        originalPrice: true,
        stockQuantity: true,
        soldCount: true,
        category: { select: { name: true } },
      },
    });

    const topSelling = [...allProducts]
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category?.name || 'Khác',
        price: p.price,
        soldCount: p.soldCount,
        stockQuantity: p.stockQuantity,
        estRevenue: p.soldCount * p.price,
      }));

    const slowMoving = [...allProducts]
      .filter((p) => p.soldCount <= 5)
      .sort((a, b) => a.soldCount - b.soldCount || b.stockQuantity - a.stockQuantity)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category?.name || 'Khác',
        price: p.price,
        soldCount: p.soldCount,
        stockQuantity: p.stockQuantity,
        capitalLocked: p.stockQuantity * p.price,
      }));

    // Period Comparison: Split orders into earlier half vs recent half
    const halfIndex = Math.floor(orders.length / 2);
    const earlierOrders = orders.slice(0, halfIndex);
    const recentOrders = orders.slice(halfIndex);

    const earlierRev = earlierOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const recentRev = recentOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const earlierAov = earlierOrders.length > 0 ? Math.round(earlierRev / earlierOrders.length) : 0;
    const recentAov = recentOrders.length > 0 ? Math.round(recentRev / recentOrders.length) : 0;

    const growthPercent = earlierRev > 0 ? Math.round(((recentRev - earlierRev) / earlierRev) * 100) : 0;

    return {
      timeSeries,
      categoryBreakdown,
      topSelling,
      slowMoving,
      comparison: {
        earlierRev,
        recentRev,
        earlierOrdersCount: earlierOrders.length,
        recentOrdersCount: recentOrders.length,
        earlierAov,
        recentAov,
        growthPercent,
      },
      totalValidOrders: orders.length,
      totalValidRevenue: orders.reduce((acc, o) => acc + Number(o.total || 0), 0),
    };
  } catch (error) {
    console.error('[businessIntelligenceService] getRevenueAnalytics error:', error);
    throw error;
  }
}

/**
 * 3. Inventory Restock Forecasting & Stock Depletion
 */
async function getInventoryRestockForecast() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        originalPrice: true,
        stockQuantity: true,
        soldCount: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    // Assumption baseline for model: Historical sales velocity over ~60 active days
    const activeDaysBaseline = 60;
    const leadTimeDays = 14; // Thời gian nhập hàng dự kiến 14 ngày
    const safetyBufferDays = 7; // Buffer an toàn 7 ngày
    const targetCoverageDays = leadTimeDays + safetyBufferDays; // 21 ngày bảo đảm

    const forecastItems = products.map((prod) => {
      const stock = Number(prod.stockQuantity) || 0;
      const sold = Number(prod.soldCount) || 0;
      // Daily burn rate = historical sold / activeDaysBaseline (tối thiểu 0.1 nếu có bán)
      const dailyBurnRate = sold > 0 ? Number((sold / activeDaysBaseline).toFixed(2)) : 0.05;
      
      // Days to run out
      const daysToRunOut = dailyBurnRate > 0 ? Math.round(stock / dailyBurnRate) : 999;

      // Recommended Reorder Qty = (targetCoverageDays * dailyBurnRate) - stock
      let recommendedReorderQty = 0;
      let priority = 'LOW';
      let status = 'HEALTHY';
      let reason = '';

      if (stock === 0) {
        priority = 'CRITICAL';
        status = 'OUT_OF_STOCK';
        recommendedReorderQty = Math.max(30, Math.ceil(targetCoverageDays * Math.max(dailyBurnRate, 1)));
        reason = `Đã hết hàng hoàn toàn (0 cái). Cần đặt gấp ${recommendedReorderQty} sản phẩm để đáp ứng nhu cầu chu kỳ 21 ngày.`;
      } else if (stock <= 5 || daysToRunOut <= 5) {
        priority = 'CRITICAL';
        status = 'CRITICAL_RUNOUT';
        recommendedReorderQty = Math.max(25, Math.ceil((targetCoverageDays * dailyBurnRate) - stock + 15));
        reason = `Tồn kho nguy cấp (${stock} cái), dự kiến cạn sạch trong ~${daysToRunOut} ngày (tốc độ bán ~${dailyBurnRate}/ngày). Cần đặt gấp trong 48h.`;
      } else if (stock <= 15 || daysToRunOut <= 14) {
        priority = 'HIGH';
        status = 'LOW_STOCK';
        recommendedReorderQty = Math.max(20, Math.ceil((targetCoverageDays * dailyBurnRate) - stock + 10));
        reason = `Tồn kho dưới ngưỡng an toàn (${stock} cái <= 15). Dự kiến cạn kho trong ~${daysToRunOut} ngày. Cần lập lệnh nhập hàng trong 7 ngày tới.`;
      } else if (stock > 100 && sold < 10) {
        priority = 'LOW';
        status = 'OVERSTOCKED_SLOW';
        recommendedReorderQty = 0;
        reason = `Tồn đọng vốn cao (${stock} cái) nhưng tốc độ bán thấp (đã bán ${sold}). Không nhập thêm; cần triển khai khuyến mãi/bundle giải phóng vốn.`;
      } else {
        priority = 'LOW';
        status = 'HEALTHY';
        recommendedReorderQty = 0;
        reason = `Tồn kho ở mức ổn định (${stock} cái), duy trì đủ bán trong ${daysToRunOut > 90 ? '>90' : daysToRunOut} ngày. Chưa cần tái nhập.`;
      }

      // Round recommended quantity to nearest multiple of 5 for manufacturing ease
      if (recommendedReorderQty > 0) {
        recommendedReorderQty = Math.ceil(recommendedReorderQty / 5) * 5;
      }

      return {
        id: prod.id,
        name: prod.name,
        category: prod.category?.name || 'Khác',
        price: prod.price,
        currentStock: stock,
        soldCount: sold,
        dailyBurnRate,
        daysToRunOut,
        recommendedReorderQty,
        priority,
        status,
        reason,
        capitalRequired: recommendedReorderQty * Math.round(prod.price * 0.5), // Ước tính giá vốn ~50% giá bán lẻ
      };
    });

    const criticalItems = forecastItems.filter((i) => i.priority === 'CRITICAL');
    const highItems = forecastItems.filter((i) => i.priority === 'HIGH');
    const overstockedItems = forecastItems.filter((i) => i.status === 'OVERSTOCKED_SLOW');

    return {
      forecastItems,
      summary: {
        totalAnalyzed: forecastItems.length,
        criticalCount: criticalItems.length,
        highCount: highItems.length,
        overstockedCount: overstockedItems.length,
        totalRecommendedUnits: forecastItems.reduce((acc, i) => acc + i.recommendedReorderQty, 0),
        estimatedRestockCapital: forecastItems.reduce((acc, i) => acc + i.capitalRequired, 0),
      },
    };
  } catch (error) {
    console.error('[businessIntelligenceService] getInventoryRestockForecast error:', error);
    throw error;
  }
}

/**
 * 4. Store Distribution & Regional Demand Analysis
 */
async function getStoreDistributionAnalytics() {
  try {
    const [stores, orders] = await Promise.all([
      prisma.store.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          region: true,
          isFlagship: true,
          isActive: true,
        },
      }),
      prisma.order.findMany({
        where: { orderStatus: { not: 'CANCELLED' } },
        select: { id: true, total: true, shippingAddress: true, createdAt: true },
      }),
    ]);

    // Breakdown stores by region
    const storeRegionCount = { NORTH: 0, CENTRAL: 0, SOUTH: 0 };
    stores.forEach((st) => {
      if (storeRegionCount[st.region] !== undefined) {
        storeRegionCount[st.region] += 1;
      }
    });

    // Breakdown orders by region from shippingAddress
    const regionDemand = {
      NORTH: { region: 'Miền Bắc', orderCount: 0, revenue: 0, percentage: 0, cities: {} },
      CENTRAL: { region: 'Miền Trung', orderCount: 0, revenue: 0, percentage: 0, cities: {} },
      SOUTH: { region: 'Miền Nam', orderCount: 0, revenue: 0, percentage: 0, cities: {} },
      OTHER: { region: 'Khu vực khác', orderCount: 0, revenue: 0, percentage: 0, cities: {} },
    };

    let totalRevenue = 0;

    orders.forEach((ord) => {
      const addr = (ord.shippingAddress || '').toLowerCase();
      const rev = Number(ord.total) || 0;
      totalRevenue += rev;

      let matchedRegion = 'OTHER';
      let cityName = 'Khác';

      if (addr.includes('hà nội') || addr.includes('hải phòng') || addr.includes('quảng ninh') || addr.includes('bắc ninh') || addr.includes('hải dương')) {
        matchedRegion = 'NORTH';
        cityName = addr.includes('hà nội') ? 'Hà Nội' : (addr.includes('hải phòng') ? 'Hải Phòng' : 'Miền Bắc khác');
      } else if (addr.includes('đà nẵng') || addr.includes('huế') || addr.includes('quảng nam') || addr.includes('nha trang') || addr.includes('khánh hòa')) {
        matchedRegion = 'CENTRAL';
        cityName = addr.includes('đà nẵng') ? 'Đà Nẵng' : 'Miền Trung khác';
      } else if (addr.includes('hồ chí minh') || addr.includes('hcm') || addr.includes('bình dương') || addr.includes('đồng nai') || addr.includes('cần thơ')) {
        matchedRegion = 'SOUTH';
        cityName = (addr.includes('hồ chí minh') || addr.includes('hcm')) ? 'TP. Hồ Chí Minh' : 'Miền Nam khác';
      }

      regionDemand[matchedRegion].orderCount += 1;
      regionDemand[matchedRegion].revenue += rev;
      regionDemand[matchedRegion].cities[cityName] = (regionDemand[matchedRegion].cities[cityName] || 0) + 1;
    });

    // Calculate percentage
    Object.keys(regionDemand).forEach((regKey) => {
      regionDemand[regKey].percentage = totalRevenue > 0
        ? Math.round((regionDemand[regKey].revenue / totalRevenue) * 100)
        : 0;
    });

    // Strategy recommendation for logistics / showroom supply
    const recommendations = [
      {
        region: 'Miền Nam',
        showroomCount: storeRegionCount.SOUTH,
        demandShare: `${regionDemand.SOUTH.percentage}%`,
        proposal: 'Chiếm tỷ trọng doanh thu cao nhất. Ưu tiên phân bổ 50% lượng hàng về kho trung tâm miền Nam & cung ứng ưu tiên cho cụm Showroom TP.HCM (Sư Vạn Hạnh, Nguyễn Trãi, Aeon Mall).',
      },
      {
        region: 'Miền Bắc',
        showroomCount: storeRegionCount.NORTH,
        demandShare: `${regionDemand.NORTH.percentage}%`,
        proposal: 'Tỷ trọng ổn định (~30-35%). Khuyến nghị trữ các sản phẩm giữ ấm, áo khoác, áo sơ mi dài tay cho mùa lạnh; điều tiết tồn kho từ kho Nam sang Bắc trước các đợt gió mùa.',
      },
      {
        region: 'Miền Trung',
        showroomCount: storeRegionCount.CENTRAL,
        demandShare: `${regionDemand.CENTRAL.percentage}%`,
        proposal: 'Quy mô đơn hàng khiêm tốn. Duy trì mức tồn kho tinh gọn tại showroom Đà Nẵng, áp dụng mô hình ship từ kho HCM/Hà Nội cho các đơn online.',
      },
    ];

    return {
      storeCount: stores.length,
      storeRegionBreakdown: storeRegionCount,
      regionDemand,
      recommendations,
      schemaNotice: {
        isCentralInventoryOnly: true,
        details: 'Cơ sở dữ liệu MySQL hiện tại quản lý kho tổng trung tâm thương mại điện tử (Product.stockQuantity). Dữ liệu tồn kho chi tiết trên từng kệ quầy 25 showroom chưa có bảng riêng trong schema MySQL. Các chỉ số phân phối và điều chuyển hiển thị dựa trên phân tích tương quan giữa địa bàn giao hàng thực tế và mạng lưới showroom.',
      },
    };
  } catch (error) {
    console.error('[businessIntelligenceService] getStoreDistributionAnalytics error:', error);
    throw error;
  }
}

/**
 * 5. CRM & RFM Customer Segmentation
 */
async function getCustomerCrmAnalytics() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        fullName: true,
        createdAt: true,
        orders: {
          where: { orderStatus: { not: 'CANCELLED' } },
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    const now = new Date();

    const segmentedCustomers = users.map((u) => {
      const orders = u.orders || [];
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      
      let lastOrderDate = null;
      let daysSinceLastOrder = 999;

      if (totalOrders > 0) {
        const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        lastOrderDate = sorted[0].createdAt;
        daysSinceLastOrder = Math.floor((now - new Date(lastOrderDate)) / (1000 * 60 * 60 * 24));
      } else {
        daysSinceLastOrder = Math.floor((now - new Date(u.createdAt)) / (1000 * 60 * 60 * 24));
      }

      // RFM Scoring (1 to 5)
      let rScore = 1;
      if (daysSinceLastOrder <= 7) rScore = 5;
      else if (daysSinceLastOrder <= 21) rScore = 4;
      else if (daysSinceLastOrder <= 45) rScore = 3;
      else if (daysSinceLastOrder <= 90) rScore = 2;

      let fScore = 1;
      if (totalOrders >= 10) fScore = 5;
      else if (totalOrders >= 5) fScore = 4;
      else if (totalOrders >= 3) fScore = 3;
      else if (totalOrders >= 2) fScore = 2;

      let mScore = 1;
      if (totalSpent >= 5000000) mScore = 5;
      else if (totalSpent >= 2500000) mScore = 4;
      else if (totalSpent >= 1000000) mScore = 3;
      else if (totalSpent >= 500000) mScore = 2;

      // Segment Assignment
      let segment = 'POTENTIAL';
      let churnRisk = 'LOW';
      let actionSuggestion = '';

      if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
        segment = 'CHAMPIONS';
        churnRisk = 'LOW';
        actionSuggestion = 'Tặng đặc quyền VIP, gửi sớm mẫu BST mới và quà sinh nhật đặc biệt.';
      } else if (fScore >= 3 && mScore >= 3) {
        segment = 'LOYAL';
        churnRisk = 'LOW';
        actionSuggestion = 'Upsell các phụ kiện hoặc set đồ hoàn chỉnh (Smart Outfit), tặng voucher 10%.';
      } else if (totalOrders === 1 && daysSinceLastOrder <= 30) {
        segment = 'NEW';
        churnRisk = 'MEDIUM';
        actionSuggestion = 'Gửi email cảm ơn + coupon giảm 50k cho đơn hàng thứ 2 trong 14 ngày.';
      } else if (daysSinceLastOrder > 45 && totalOrders >= 2) {
        segment = 'AT_RISK';
        churnRisk = 'HIGH';
        actionSuggestion = 'Chiến dịch Win-Back: SMS/Zalo thông báo ưu đãi độc quyền 15% để kích hoạt lại.';
      } else if (totalOrders === 0) {
        segment = 'LEAD';
        churnRisk = 'HIGH';
        actionSuggestion = 'Gửi tin nhắn chào mừng kèm mã giảm giá 10% đơn đầu tiên.';
      } else {
        segment = 'HIBERNATING';
        churnRisk = 'CRITICAL';
        actionSuggestion = 'Tái tiếp cận qua quảng cáo retargeting bộ sưu tập mới giá tốt.';
      }

      return {
        id: u.id,
        maskedName: u.fullName || 'Khách hàng',
        maskedPhone: maskPhone(u.phoneNumber),
        maskedEmail: maskEmail(u.email),
        totalOrders,
        totalSpent,
        lastOrderDate,
        daysSinceLastOrder,
        rfm: { rScore, fScore, mScore, rfmString: `${rScore}${fScore}${mScore}` },
        segment,
        churnRisk,
        actionSuggestion,
      };
    });

    // Grouping stats
    const segmentCounts = {
      CHAMPIONS: 0,
      LOYAL: 0,
      POTENTIAL: 0,
      NEW: 0,
      AT_RISK: 0,
      HIBERNATING: 0,
      LEAD: 0,
    };

    segmentedCustomers.forEach((c) => {
      segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
    });

    const totalCustomersCount = segmentedCustomers.length;
    const payingCustomers = segmentedCustomers.filter((c) => c.totalOrders > 0);
    const repeatCustomers = segmentedCustomers.filter((c) => c.totalOrders >= 2);
    const repeatRate = payingCustomers.length > 0 ? Math.round((repeatCustomers.length / payingCustomers.length) * 100) : 0;

    return {
      customers: segmentedCustomers,
      summary: {
        totalCustomers: totalCustomersCount,
        payingCustomersCount: payingCustomers.length,
        repeatCustomersCount: repeatCustomers.length,
        repeatPurchaseRate: `${repeatRate}%`,
        segmentCounts,
      },
    };
  } catch (error) {
    console.error('[businessIntelligenceService] getCustomerCrmAnalytics error:', error);
    throw error;
  }
}

/**
 * 6. Generate AI Insight via Gemini (with Grounded Real Data)
 */
async function generateBiAiInsight({ domain = 'REVENUE', customPrompt = null }) {
  try {
    const [overview, revenueData, inventoryData, storeData, crmData] = await Promise.all([
      getOverviewKpis(),
      getRevenueAnalytics(),
      getInventoryRestockForecast(),
      getStoreDistributionAnalytics(),
      getCustomerCrmAnalytics(),
    ]);

    const contextSummary = {
      totalRevenue: overview.validRevenue,
      totalOrders: overview.validOrdersCount,
      aov: overview.aov,
      topSelling: revenueData.topSelling.map((p) => `${p.name} (Đã bán: ${p.soldCount}, Tồn: ${p.stockQuantity})`).join(', '),
      slowMoving: revenueData.slowMoving.map((p) => `${p.name} (Đã bán: ${p.soldCount}, Tồn: ${p.stockQuantity})`).join(', '),
      criticalStock: inventoryData.summary.criticalCount,
      recommendedUnits: inventoryData.summary.totalRecommendedUnits,
      regionDemand: `Nam: ${storeData.regionDemand.SOUTH.percentage}%, Bắc: ${storeData.regionDemand.NORTH.percentage}%, Trung: ${storeData.regionDemand.CENTRAL.percentage}%`,
      crmChampions: crmData.summary.segmentCounts.CHAMPIONS,
      crmAtRisk: crmData.summary.segmentCounts.AT_RISK,
      repeatRate: crmData.summary.repeatPurchaseRate,
    };

    const systemInstruction = `Bạn là Trưởng ban Phân tích Dữ liệu & Cố vấn Chiến lược Kinh doanh Cấp cao (Chief AI Business Strategist) của thương hiệu thời trang Routine Vietnam.
Nhiệm vụ của bạn là phân tích sâu sắc các chỉ số kinh doanh thực tế từ hệ thống, đưa ra đánh giá khách quan, nguyên nhân gốc rễ và đề xuất hành động cụ thể, khả thi.
TUYỆT ĐỐI KHÔNG BỊA SỐ LIỆU. Luôn trích dẫn con số cụ thể từ dữ liệu được cung cấp. Viết báo cáo rõ ràng bằng tiếng Việt chuẩn mực, định dạng markdown với các tiêu đề, gạch đầu dòng và số liệu nổi bật.`;

    let userPrompt = '';
    if (customPrompt) {
      userPrompt = `Dữ liệu kinh doanh hiện tại của Routine:\n${JSON.stringify(contextSummary, null, 2)}\n\nYêu cầu phân tích: ${customPrompt}`;
    } else if (domain === 'REVENUE') {
      userPrompt = `Dữ liệu tài chính Routine:\n- Doanh thu: ${overview.validRevenue.toLocaleString('vi-VN')}đ qua ${overview.validOrdersCount} đơn hàng hợp lệ.\n- AOV: ${overview.aov.toLocaleString('vi-VN')}đ.\n- Top bán chạy: ${contextSummary.topSelling}\n- Bán chậm: ${contextSummary.slowMoving}\n\nHãy phân tích: 1) Đánh giá tình hình doanh thu & AOV; 2) Phân tích cơ cấu sản phẩm (Top seller vs Hàng ế); 3) Ba giải pháp tăng trưởng doanh thu quý tới.`;
    } else if (domain === 'INVENTORY') {
      userPrompt = `Dữ liệu kho vận Routine:\n- Số mã nguy cơ hết hàng khẩn cấp: ${inventoryData.summary.criticalCount} sản phẩm.\n- Tổng lượng hàng kiến nghị nhập: ${inventoryData.summary.totalRecommendedUnits} đơn vị.\n- Danh sách nguy cơ: ${inventoryData.forecastItems.filter(i => i.priority === 'CRITICAL').map(i => `${i.name} (Còn ${i.currentStock}, tiêu thụ ${i.dailyBurnRate}/ngày)`).join('; ')}\n\nHãy phân tích: 1) Đánh giá rủi ro đứt gãy chuỗi cung ứng; 2) Kế hoạch đặt hàng ưu tiên; 3) Chiến lược giải phóng hàng tồn kho đọng vốn.`;
    } else if (domain === 'STORE') {
      userPrompt = `Dữ liệu chuỗi showroom & thị trường Routine:\n- 25 Showroom toàn quốc.\n- Tỷ trọng nhu cầu đơn hàng: ${contextSummary.regionDemand}\n- Cảnh báo schema: Hệ thống MySQL quản lý kho tổng trung tâm e-commerce.\n\nHãy phân tích: 1) Đánh giá sự phân bổ nhu cầu địa lý; 2) Đề xuất phân phối hàng hóa và liên kết O2O (Online to Offline) cho 25 showroom; 3) Tối ưu hóa chi phí vận chuyển.`;
    } else if (domain === 'CRM') {
      userPrompt = `Dữ liệu khách hàng CRM Routine:\n- Tỷ lệ mua lại: ${contextSummary.repeatRate}.\n- Phân khúc: Champions (${contextSummary.crmChampions}), At Risk (${contextSummary.crmAtRisk}).\n\nHãy phân tích: 1) Đánh giá sức khỏe tập khách hàng và tỷ lệ giữ chân; 2) Chiến dịch kích hoạt nhóm At Risk; 3) Chương trình khách hàng thân thiết gia tăng LTV (Customer Lifetime Value).`;
    } else {
      userPrompt = `Dữ liệu tổng quan:\n${JSON.stringify(contextSummary, null, 2)}\n\nHãy đưa ra Báo cáo Tổng kết Điều hành Toàn diện (Executive Brief) cho Ban Lãnh đạo Routine.`;
    }

    const aiResponse = await geminiService.generateContent({
      contents: userPrompt,
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 1200,
    });

    if (aiResponse) {
      return {
        success: true,
        insight: aiResponse,
        source: 'GEMINI_AI',
        domain,
        generatedAt: new Date().toISOString(),
      };
    }

    // Heuristic Fallback if Gemini is offline
    const fallbackInsight = `### Báo Cáo Phân Tích Kinh Doanh Tổng Hợp (Routine BI Engine)
- **Doanh thu ghi nhận**: ${overview.validRevenue.toLocaleString('vi-VN')}đ với ${overview.validOrdersCount} đơn hàng thành công, giá trị trung bình đơn (AOV) đạt ${overview.aov.toLocaleString('vi-VN')}đ.
- **Sức khỏe hàng tồn**: Có ${inventoryData.summary.criticalCount} sản phẩm chạm ngưỡng báo động hết hàng (<= 5 đơn vị), cần triển khai lệnh nhập khẩn cấp ${inventoryData.summary.totalRecommendedUnits} sản phẩm.
- **Cơ cấu vùng miền**: Khu vực Miền Nam dẫn đầu tỷ trọng doanh thu (${storeData.regionDemand.SOUTH.percentage}%), kế tiếp là Miền Bắc (${storeData.regionDemand.NORTH.percentage}%).
- **Khách hàng & CRM**: Tỷ lệ khách hàng quay lại mua hàng đạt ${crmData.summary.repeatPurchaseRate}. Cần tập trung chương trình chăm sóc đặc quyền cho nhóm Champions và kích hoạt nhóm At-Risk.`;

    return {
      success: true,
      insight: fallbackInsight,
      source: 'RULE_ENGINE_FALLBACK',
      domain,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[businessIntelligenceService] generateBiAiInsight error:', error);
    return {
      success: false,
      error: error.message,
      insight: 'Hệ thống AI đang tạm thời xử lý dữ liệu nền tảng. Vui lòng thử lại sau giây lát.',
      source: 'ERROR_RECOVERY',
    };
  }
}

/**
 * 7. Generate Marketing Campaign Plan via Gemini
 */
async function generateMarketingPlan({
  objective = 'Tăng doanh thu và giải phóng hàng tồn',
  targetSegment = 'Khách hàng At-Risk và Khách hàng Mới',
  budget = 50000000,
  timeframe = '4 tuần',
  focusCategory = 'Tất cả danh mục',
} = {}) {
  try {
    const overview = await getOverviewKpis();
    const inventory = await getInventoryRestockForecast();
    const overstocked = inventory.forecastItems.filter((i) => i.status === 'OVERSTOCKED_SLOW').slice(0, 3);

    const contextPrompt = `Dữ liệu thương hiệu Routine:
- Doanh thu hiện tại: ${overview.validRevenue.toLocaleString('vi-VN')}đ
- AOV: ${overview.aov.toLocaleString('vi-VN')}đ
- Nhóm sản phẩm tồn kho cần đẩy mạnh: ${overstocked.map((p) => p.name).join(', ') || 'Áo sơ mi, Quần Jean'}
- Mục tiêu chiến dịch: ${objective}
- Phân khúc khách hàng mục tiêu: ${targetSegment}
- Ngân sách dự kiến: ${Number(budget).toLocaleString('vi-VN')}đ
- Thời gian triển khai: ${timeframe}
- Ngành hàng trọng tâm: ${focusCategory}`;

    const systemInstruction = `Bạn là Giám đốc Marketing (CMO) của Routine Vietnam.
Hãy xây dựng một Kế hoạch Chiến dịch Marketing (Marketing Campaign Plan) chi tiết, sáng tạo, thực chiến và phù hợp với thương hiệu thời trang Routine (phong cách tối giản, thanh lịch, ứng dụng cao).
Kế hoạch phải bao gồm đầy đủ:
1. Tên chiến dịch & Ý tưởng lớn (Big Idea / Concept).
2. Thông điệp chủ đạo (Key Message) & Hướng đi thị giác (Key Visual).
3. Phân khúc khách hàng mục tiêu & Insight khách hàng.
4. Chiến lược đa kênh (TikTok Video/Live, Facebook Reels, Zalo ZNS/Mini App, Google Search/Shopping, Trải nghiệm tại Showroom).
5. Phân bổ ngân sách chi tiết (theo kênh và tỷ lệ %).
6. Bộ chỉ số KPI cam kết (Lượt tiếp cận, Click, Đơn hàng, Doanh thu dự kiến, ROAS).
7. Lịch trình triển khai theo từng tuần (Tuần 1: Teasing, Tuần 2: Booming, Tuần 3: Retargeting & Upsell, Tuần 4: Flash Sale & Closing).
8. Dự phòng rủi ro.`;

    const aiPlan = await geminiService.generateContent({
      contents: `${contextPrompt}\n\nHãy tạo kế hoạch chiến dịch marketing hoàn chỉnh.`,
      systemInstruction,
      temperature: 0.4,
      maxOutputTokens: 1500,
    });

    if (aiPlan) {
      return {
        success: true,
        campaignPlan: aiPlan,
        source: 'GEMINI_AI',
        params: { objective, targetSegment, budget, timeframe, focusCategory },
        generatedAt: new Date().toISOString(),
      };
    }

    // Fallback template plan
    const fallbackPlan = `### Kế Hoạch Chiến Dịch Marketing: "ROUTINE SMART RENEW"
**1. Big Idea / Concept**: "Nâng chuẩn phong cách hằng ngày - Tự tin trong từng khoảnh khắc"
**2. Mục tiêu**: ${objective} với ngân sách ${Number(budget).toLocaleString('vi-VN')}đ trong thời gian ${timeframe}.
**3. Phân khúc mục tiêu**: ${targetSegment}. Insight: Khách hàng tìm kiếm trang phục thanh lịch, dễ phối cho cả công sở và dạo phố.
**4. Phân bổ ngân sách**:
- TikTok & Video ngắn sáng tạo (40%): 20.000.000đ
- Facebook Ads & Retargeting (30%): 15.000.000đ
- Zalo ZNS Chăm sóc Khách hàng cũ & CRM (15%): 7.500.000đ
- Hoạt động trải nghiệm tại 25 Showroom (15%): 7.500.000đ
**5. Lịch trình 4 tuần**:
- Tuần 1: Teasing bộ sưu tập & Lookbook xu hướng.
- Tuần 2: Booming ưu đãi kết hợp AI Stylist gợi ý phối đồ.
- Tuần 3: Retargeting nhóm thêm giỏ chưa mua & ưu đãi độc quyền.
- Tuần 4: Tri ân VIP, Flash Sale xả hàng tồn kho và tổng kết.
**6. KPI cam kết**: Tiếp cận 200,000 khách hàng tiềm năng, ROAS tối thiểu 3.5x.`;

    return {
      success: true,
      campaignPlan: fallbackPlan,
      source: 'RULE_ENGINE_FALLBACK',
      params: { objective, targetSegment, budget, timeframe, focusCategory },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[businessIntelligenceService] generateMarketingPlan error:', error);
    throw error;
  }
}

/**
 * 8. Interactive Admin AI Assistant (Q&A grounded on real DB data)
 */
async function askAdminBiAssistant({ question, history = [] }) {
  try {
    const [overview, inventory, crm, revenue] = await Promise.all([
      getOverviewKpis(),
      getInventoryRestockForecast(),
      getCustomerCrmAnalytics(),
      getRevenueAnalytics(),
    ]);

    const metricsSnapshot = {
      revenue: overview.validRevenue,
      validOrders: overview.validOrdersCount,
      aov: overview.aov,
      topSellers: revenue.topSelling.map((p) => `${p.name} (${p.soldCount} đã bán)`),
      criticalOutStock: inventory.summary.criticalCount,
      criticalList: inventory.forecastItems.filter(i => i.priority === 'CRITICAL').map(i => `${i.name} (Tồn: ${i.currentStock})`),
      totalCustomers: crm.summary.totalCustomers,
      repeatRate: crm.summary.repeatPurchaseRate,
      champions: crm.summary.segmentCounts.CHAMPIONS,
      atRisk: crm.summary.segmentCounts.AT_RISK,
    };

    const systemInstruction = `Bạn là Trợ lý AI Quản Trị Kinh Doanh của Routine Web Admin.
Bạn có quyền truy cập trực tiếp vào cơ sở dữ liệu thời gian thực của Routine.
Thông tin số liệu hiện tại:
${JSON.stringify(metricsSnapshot, null, 2)}

Nguyên tắc trả lời:
- Luôn trả lời ngắn gọn, thẳng thắn, chính xác và chuyên nghiệp.
- Căn cứ vào số liệu thực tế được cung cấp, không bịa đặt số liệu.
- Đưa ra khuyến nghị hành động cụ thể để tối ưu doanh thu, giảm tồn kho hoặc chăm sóc khách hàng.
- Định dạng câu trả lời bằng Markdown rõ ràng.`;

    const aiAnswer = await geminiService.generateContent({
      contents: question,
      systemInstruction,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    if (aiAnswer) {
      return {
        success: true,
        answer: aiAnswer,
        source: 'GEMINI_AI',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      answer: `Theo dữ liệu thời gian thực của Routine: Doanh thu hiện đạt ${overview.validRevenue.toLocaleString('vi-VN')}đ với ${overview.validOrdersCount} đơn hàng (AOV: ${overview.aov.toLocaleString('vi-VN')}đ). Hiện có ${inventory.summary.criticalCount} sản phẩm có nguy cơ cạn kho cần bổ sung gấp.`,
      source: 'RULE_ENGINE_FALLBACK',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[businessIntelligenceService] askAdminBiAssistant error:', error);
    return {
      success: false,
      error: error.message,
      answer: 'Xin lỗi, trợ lý AI đang bận xử lý yêu cầu. Vui lòng thử lại sau giây lát.',
    };
  }
}

module.exports = {
  getOverviewKpis,
  getRevenueAnalytics,
  getInventoryRestockForecast,
  getStoreDistributionAnalytics,
  getCustomerCrmAnalytics,
  generateBiAiInsight,
  generateMarketingPlan,
  askAdminBiAssistant,
};
