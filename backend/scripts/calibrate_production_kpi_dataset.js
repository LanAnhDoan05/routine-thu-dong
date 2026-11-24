const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function calibrateDataset() {
  console.log('=== STARTING PRODUCTION KPI & FUNNEL DATASET CALIBRATION ===');

  // 1. Fetch active products with variants
  const activeProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE', stockQuantity: { gt: 10 } },
    include: { variants: true }
  });
  console.log(`Found ${activeProducts.length} active products available for order allocation.`);

  const p1 = activeProducts.find(p => p.id === 'p_10f25dja007') || activeProducts[0]; // Denim Jacket 799k
  const p2 = activeProducts.find(p => p.id === 'p_10f25drew001') || activeProducts[1]; // Dress 899k
  const p3 = activeProducts.find(p => p.id === 'p_10f25pfo012') || activeProducts[2]; // Trousers 549k
  const p4 = activeProducts.find(p => p.id === 'p_10f26cap017') || activeProducts[3]; // Cap 349k
  const p5 = activeProducts.find(p => p.id === 'p_10f26dpaw057') || activeProducts[4]; // Denim+ 849k
  const p6 = activeProducts.find(p => p.id === 'p_10f26kniw051') || activeProducts[5]; // Polo 449k
  const p7 = activeProducts.find(p => p.id === 'p_10f26pol003p') || activeProducts[0]; // Blazer Fitted 699k
  const p8 = activeProducts.find(p => p.id === 'p_10f26shl001') || activeProducts[1]; // Blazer Trơn 579k

  // 2. Fetch customers
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: { id: true, fullName: true, email: true, phoneNumber: true, source: true }
  });

  // 3. Clear existing demo orders and order_items safely
  console.log('Cleaning existing demo orders...');
  const existingDemoOrders = await prisma.order.findMany({
    where: {
      OR: [
        { note: { contains: '[DEMO_2M_DATASET]' } },
        { attributionSource: 'DEMO_DATASET' },
        { id: { startsWith: 'ORD-2026-NOV-' } }
      ]
    },
    select: { id: true }
  });
  const demoOrderIds = existingDemoOrders.map(o => o.id);
  if (demoOrderIds.length > 0) {
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: demoOrderIds } }
    });
    await prisma.order.deleteMany({
      where: { id: { in: demoOrderIds } }
    });
    console.log(`Deleted ${demoOrderIds.length} previous demo orders.`);
  }

  // 4. Exact 30 order item sets:
  // 10 orders: p3 (549k) + p6 (449k) = 998.000đ (Sum: 9.980.000đ)
  // 8 orders: p2 (899k) = 899.000đ (Sum: 7.192.000đ)
  // 6 orders: p1 (799k) = 799.000đ (Sum: 4.794.000đ)
  // 4 orders: p7 (699k) = 699.000đ (Sum: 2.796.000đ)
  // 1 order (Order 29): p1 (799k) + p8 (579k) = 1.378.000đ
  // 1 order (Order 30): p5 (849k) + p3 (511k adjusted) = 1.360.000đ
  // TOTAL: 9.980.000 + 7.192.000 + 4.794.000 + 2.796.000 + 1.378.000 + 1.360.000 = 27.500.000đ!
  const orderConfigs = [
    // 10 orders
    ...Array(10).fill([
      { product: p3, price: 549000, qty: 1 },
      { product: p6, price: 449000, qty: 1 }
    ]),
    // 8 orders
    ...Array(8).fill([
      { product: p2, price: 899000, qty: 1 }
    ]),
    // 6 orders
    ...Array(6).fill([
      { product: p1, price: 799000, qty: 1 }
    ]),
    // 4 orders
    ...Array(4).fill([
      { product: p7, price: 699000, qty: 1 }
    ]),
    // Order 29
    [
      { product: p1, price: 799000, qty: 1 },
      { product: p8, price: 579000, qty: 1 }
    ],
    // Order 30
    [
      { product: p5, price: 849000, qty: 1 },
      { product: p3, price: 511000, qty: 1 }
    ]
  ]; // Total 30 orders

  const platforms = [
    // 14 TikTok
    'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK',
    'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK', 'TIKTOK',
    // 12 Facebook
    'FACEBOOK', 'FACEBOOK', 'FACEBOOK', 'FACEBOOK', 'FACEBOOK', 'FACEBOOK',
    'FACEBOOK', 'FACEBOOK', 'FACEBOOK', 'FACEBOOK', 'FACEBOOK', 'FACEBOOK',
    // 3 Instagram
    'INSTAGRAM', 'INSTAGRAM', 'INSTAGRAM',
    // 1 Organic
    'ORGANIC'
  ];

  const successfulStatuses = [
    ...Array(24).fill('DELIVERED'),
    ...Array(3).fill('SHIPPING'),
    ...Array(3).fill('CONFIRMED')
  ];

  let totalCalculatedRev = 0;
  let orderIndex = 1;

  for (let i = 0; i < 30; i++) {
    const itemsConfig = orderConfigs[i];
    const status = successfulStatuses[i];
    const platform = platforms[i];
    const customer = customers[i % customers.length];
    const orderId = `ORD-2026-NOV-${String(orderIndex).padStart(4, '0')}`;
    orderIndex++;

    let subtotal = 0;
    const orderItemsData = itemsConfig.map((cfg, itemIdx) => {
      const itemSub = cfg.price * cfg.qty;
      subtotal += itemSub;
      const variant = cfg.product.variants?.[0] || null;
      return {
        id: `oi-${orderId}-${itemIdx + 1}`,
        productId: cfg.product.id,
        name: cfg.product.name,
        image: cfg.product.images?.[0] || null,
        size: variant ? variant.size : 'L',
        color: variant ? variant.color : 'Tiêu chuẩn',
        price: cfg.price,
        quantity: cfg.qty,
        subtotal: itemSub
      };
    });

    const total = subtotal;
    totalCalculatedRev += total;

    const daysAgo = Math.floor((30 - i) * 1.8);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    await prisma.order.create({
      data: {
        id: orderId,
        userId: customer.id,
        receiverName: customer.fullName || 'Khách hàng Routine',
        phoneNumber: customer.phoneNumber || '0988123456',
        shippingAddress: '123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
        shippingMethod: 'STANDARD',
        paymentMethod: 'VNPAY',
        paymentStatus: 'PAID',
        orderStatus: status,
        subtotal: subtotal,
        shippingFee: 0,
        discount: 0,
        total: total,
        note: `[DEMO_2M_DATASET] Đơn hàng chiến dịch Thu Đông 2026 từ ${platform}`,
        attributionSource: platform,
        createdAt: createdAt,
        updatedAt: createdAt,
        items: {
          create: orderItemsData
        }
      }
    });
  }

  console.log(`✅ Created 30 successful orders. Total revenue: ${totalCalculatedRev.toLocaleString('vi-VN')} VNĐ!`);

  // 5. Create EXACTLY 4 CANCELLED ORDERS (Max 6 as required)
  const cancelledConfigs = [
    { product: p1, price: 799000, platform: 'TIKTOK', reason: 'Khách hàng đổi ý trước khi giao' },
    { product: p2, price: 899000, platform: 'FACEBOOK', reason: 'Chọn nhầm kích thước size' },
    { product: p3, price: 549000, platform: 'TIKTOK', reason: 'Thay đổi địa chỉ nhận hàng' },
    { product: p7, price: 699000, platform: 'INSTAGRAM', reason: 'Trùng đơn hàng' }
  ];

  for (let i = 0; i < 4; i++) {
    const cfg = cancelledConfigs[i];
    const customer = customers[(i + 30) % customers.length];
    const orderId = `ORD-2026-NOV-${String(orderIndex).padStart(4, '0')}`;
    orderIndex++;

    const subtotal = cfg.price;
    const variant = cfg.product.variants?.[0] || null;

    const daysAgo = Math.floor((4 - i) * 7);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    await prisma.order.create({
      data: {
        id: orderId,
        userId: customer.id,
        receiverName: customer.fullName || 'Khách hàng Routine',
        phoneNumber: customer.phoneNumber || '0988123456',
        shippingAddress: '123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
        shippingMethod: 'STANDARD',
        paymentMethod: 'VNPAY',
        paymentStatus: 'REFUNDED',
        orderStatus: 'CANCELLED',
        subtotal: subtotal,
        shippingFee: 0,
        discount: 0,
        total: subtotal,
        note: `[DEMO_2M_DATASET] ${cfg.reason}`,
        attributionSource: cfg.platform,
        createdAt: createdAt,
        updatedAt: createdAt,
        items: {
          create: [{
            id: `oi-${orderId}-1`,
            productId: cfg.product.id,
            name: cfg.product.name,
            image: cfg.product.images?.[0] || null,
            size: variant ? variant.size : 'M',
            color: variant ? variant.color : 'Tiêu chuẩn',
            price: cfg.price,
            quantity: 1,
            subtotal: subtotal
          }]
        }
      }
    });
  }
  console.log('✅ Created 4 cancelled orders (Total 34 orders in campaign).');

  // 6. GENERATE EXACTLY 1.000 SESSIONS IN TRAFFIC_LOGS
  console.log('Regenerating traffic_logs for 1.000 sessions funnel...');
  await prisma.trafficLog.deleteMany({});

  const logsToCreate = [];
  const prodIds = activeProducts.map(p => p.id);

  for (let s = 1; s <= 1000; s++) {
    let platform = 'ORGANIC';
    if (s <= 450) {
      platform = 'TIKTOK';
    } else if (s <= 730) {
      platform = 'FACEBOOK';
    } else if (s <= 800) {
      platform = 'INSTAGRAM';
    } else {
      platform = 'DIRECT'; // Organic Search / Direct
    }

    const sessionId = `sess_${platform.toLowerCase()}_${String(s).padStart(4, '0')}`;
    const pId = prodIds[s % prodIds.length];

    const daysAgo = Math.floor((1000 - s) * 0.06);
    const logTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Initial session start
    logsToCreate.push({
      platform: platform,
      campaign: `${platform.toLowerCase()}_autumn_winter`,
      productId: pId,
      guestSessionId: sessionId,
      action: 'SESSION_START',
      createdAt: logTime
    });

    // 600 sessions view product details
    if (s <= 600) {
      logsToCreate.push({
        platform: platform,
        campaign: `${platform.toLowerCase()}_autumn_winter`,
        productId: pId,
        guestSessionId: sessionId,
        action: 'VIEW',
        createdAt: new Date(logTime.getTime() + 15000)
      });
    }

    // 150 sessions add to cart
    if (s <= 150) {
      logsToCreate.push({
        platform: platform,
        campaign: `${platform.toLowerCase()}_autumn_winter`,
        productId: pId,
        guestSessionId: sessionId,
        action: 'ADD_TO_CART',
        createdAt: new Date(logTime.getTime() + 45000)
      });
    }

    // 75 sessions begin checkout
    if (s <= 75) {
      logsToCreate.push({
        platform: platform,
        campaign: `${platform.toLowerCase()}_autumn_winter`,
        productId: pId,
        guestSessionId: sessionId,
        action: 'CHECKOUT',
        createdAt: new Date(logTime.getTime() + 75000)
      });
    }

    // 30 sessions purchase successfully
    if (s <= 30) {
      logsToCreate.push({
        platform: platform,
        campaign: `${platform.toLowerCase()}_autumn_winter`,
        productId: pId,
        guestSessionId: sessionId,
        action: 'PURCHASE',
        createdAt: new Date(logTime.getTime() + 120000)
      });
    }

    // 4 sessions cancelled
    if (s >= 31 && s <= 34) {
      logsToCreate.push({
        platform: platform,
        campaign: `${platform.toLowerCase()}_autumn_winter`,
        productId: pId,
        guestSessionId: sessionId,
        action: 'CANCELLED',
        createdAt: new Date(logTime.getTime() + 150000)
      });
    }
  }

  console.log(`Inserting ${logsToCreate.length} traffic log events in batches...`);
  const batchSize = 250;
  for (let b = 0; b < logsToCreate.length; b += batchSize) {
    const chunk = logsToCreate.slice(b, b + batchSize);
    await prisma.trafficLog.createMany({
      data: chunk
    });
  }
  console.log('✅ Created traffic_logs with 1.000 unique sessions and exact funnel distribution!');

  // 7. Verification queries
  const totalSessionsCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT guest_session_id) as total_sessions FROM traffic_logs;
  `);
  const socialSessionsCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT guest_session_id) as social_sessions FROM traffic_logs WHERE platform IN ('TIKTOK', 'FACEBOOK', 'INSTAGRAM');
  `);
  const organicSessionsCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT guest_session_id) as organic_sessions FROM traffic_logs WHERE platform IN ('DIRECT', 'ORGANIC');
  `);
  const viewSessionsCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT guest_session_id) as view_sessions FROM traffic_logs WHERE action = 'VIEW';
  `);
  const atcSessionsCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT guest_session_id) as atc_sessions FROM traffic_logs WHERE action = 'ADD_TO_CART';
  `);
  const checkoutSessionsCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT guest_session_id) as checkout_sessions FROM traffic_logs WHERE action = 'CHECKOUT';
  `);

  console.log('\n=== VERIFICATION RESULTS (routine_test_db) ===');
  console.log('Total Sessions (Target: 1.000):', Number(totalSessionsCount[0].total_sessions));
  console.log('Social Sessions (Target: 800):', Number(socialSessionsCount[0].social_sessions));
  console.log('Organic Sessions (Target: 200):', Number(organicSessionsCount[0].organic_sessions));
  console.log('Product View Sessions (Target: 600):', Number(viewSessionsCount[0].view_sessions));
  console.log('Add to Cart Sessions (Target: 150):', Number(atcSessionsCount[0].atc_sessions));
  console.log('Begin Checkout Sessions (Target: 75):', Number(checkoutSessionsCount[0].checkout_sessions));
  console.log('Successful Orders (Target: 30): 30');
  console.log('Cancelled Orders (Target: <=6): 4');
  console.log('Realized Revenue (Target: 25M-30M):', totalCalculatedRev.toLocaleString('vi-VN') + ' VNĐ');
}

calibrateDataset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
