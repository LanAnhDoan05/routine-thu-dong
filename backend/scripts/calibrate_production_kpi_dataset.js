const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function calibrateDataset() {
  console.log('=== STARTING PRODUCTION KPI & ORDERS CALIBRATION (2-MONTH CAMPAIGN) ===');

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
  const p10 = activeProducts.find(p => p.id === 'p_10s26dps012') || activeProducts[2]; // Quần denim nam Loose 499k

  // 2. Fetch customers
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: { id: true, fullName: true, email: true, phoneNumber: true, source: true }
  });

  // 3. Clear existing demo orders and order_items safely (preserving all 167 real historical orders)
  console.log('Cleaning previous demo orders...');
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

  // 4. Build EXACT 35 SUCCESSFUL ORDERS
  // Target Revenue = 25,432,000 VNĐ
  // Composition:
  // - 6 orders of p2 (899k) = 5,394,000đ
  // - 6 orders of p1 (799k) = 4,794,000đ
  // - 5 orders of p7 (699k) = 3,495,000đ
  // - 5 orders of p8 (579k) = 2,895,000đ
  // - 4 orders of p3 (549k) = 2,196,000đ
  // - 4 orders of p10 (499k) = 1,996,000đ
  // - 3 orders of (p3 549k + p6 449k) = 998,000 * 3 = 2,994,000đ
  //   Subtotal 33 orders = 23,764,000đ
  // - Order 34: p5 (849k) = 849,000đ
  // - Order 35: p2 (899k) with voucher ROUTINEWINTER80K (discount 80k) = 819,000đ
  // TOTAL: 23,764,000 + 849,000 + 819,000 = 25,432,000 VNĐ!

  const successfulOrderConfigs = [
    // 6 orders p2
    ...Array(6).fill({
      items: [{ product: p2, price: 899000, qty: 1 }],
      shippingFee: 0,
      discount: 0,
      total: 899000
    }),
    // 6 orders p1
    ...Array(6).fill({
      items: [{ product: p1, price: 799000, qty: 1 }],
      shippingFee: 0,
      discount: 0,
      total: 799000
    }),
    // 5 orders p7
    ...Array(5).fill({
      items: [{ product: p7, price: 699000, qty: 1 }],
      shippingFee: 0,
      discount: 0,
      total: 699000
    }),
    // 5 orders p8
    ...Array(5).fill({
      items: [{ product: p8, price: 579000, qty: 1 }],
      shippingFee: 0,
      discount: 0,
      total: 579000
    }),
    // 4 orders p3
    ...Array(4).fill({
      items: [{ product: p3, price: 549000, qty: 1 }],
      shippingFee: 0,
      discount: 0,
      total: 549000
    }),
    // 4 orders p10
    ...Array(4).fill({
      items: [{ product: p10, price: 499000, qty: 1 }],
      shippingFee: 0,
      discount: 0,
      total: 499000
    }),
    // 3 orders (p3 + p6)
    ...Array(3).fill({
      items: [
        { product: p3, price: 549000, qty: 1 },
        { product: p6, price: 449000, qty: 1 }
      ],
      shippingFee: 0,
      discount: 0,
      total: 998000
    }),
    // Order 34: p5
    {
      items: [{ product: p5, price: 849000, qty: 1 }],
      shippingFee: 0,
      discount: 0,
      total: 849000
    },
    // Order 35: p2 with voucher
    {
      items: [{ product: p2, price: 899000, qty: 1 }],
      shippingFee: 0,
      discount: 80000,
      coupon: 'ROUTINEWINTER80K',
      total: 819000
    }
  ]; // Total: 35 orders

  const platforms35 = [
    // 17 TikTok
    ...Array(17).fill('TIKTOK'),
    // 11 Facebook
    ...Array(11).fill('FACEBOOK'),
    // 4 Instagram
    ...Array(4).fill('INSTAGRAM'),
    // 3 Organic
    ...Array(3).fill('ORGANIC')
  ];

  const successfulStatuses = [
    ...Array(27).fill('DELIVERED'),
    ...Array(4).fill('SHIPPING'),
    ...Array(4).fill('CONFIRMED')
  ];

  let totalCalculatedRev = 0;
  let orderIndex = 1;

  for (let i = 0; i < 35; i++) {
    const cfg = successfulOrderConfigs[i];
    const status = successfulStatuses[i];
    const platform = platforms35[i];
    const customer = customers[i % customers.length];
    const orderId = `ORD-2026-NOV-${String(orderIndex).padStart(4, '0')}`;
    orderIndex++;

    let subtotal = 0;
    const orderItemsData = cfg.items.map((itemCfg, itemIdx) => {
      const itemSub = itemCfg.price * itemCfg.qty;
      subtotal += itemSub;
      const variant = itemCfg.product.variants?.[0] || null;
      return {
        id: `oi-${orderId}-${itemIdx + 1}`,
        productId: itemCfg.product.id,
        name: itemCfg.product.name,
        image: itemCfg.product.images?.[0] || null,
        size: variant ? variant.size : 'L',
        color: variant ? variant.color : 'Tiêu chuẩn',
        price: itemCfg.price,
        quantity: itemCfg.qty,
        subtotal: itemSub
      };
    });

    const total = subtotal + (cfg.shippingFee || 0) - (cfg.discount || 0);
    totalCalculatedRev += total;

    const daysAgo = Math.floor((35 - i) * 1.5);
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
        shippingFee: cfg.shippingFee || 0,
        discount: cfg.discount || 0,
        appliedCoupon: cfg.coupon || null,
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

  console.log(`✅ Created 35 successful orders. Total revenue: ${totalCalculatedRev.toLocaleString('vi-VN')} VNĐ!`);

  // 5. Build EXACT 9 CANCELLED ORDERS (Total orders created in period = 35 + 9 = 44)
  const cancelledConfigs = [
    { product: p1, price: 799000, platform: 'TIKTOK', reason: 'Khách hàng đổi ý trước khi giao' },
    { product: p2, price: 899000, platform: 'FACEBOOK', reason: 'Chọn nhầm kích thước size' },
    { product: p3, price: 549000, platform: 'TIKTOK', reason: 'Thay đổi địa chỉ nhận hàng' },
    { product: p7, price: 699000, platform: 'INSTAGRAM', reason: 'Trùng đơn hàng' },
    { product: p8, price: 579000, platform: 'TIKTOK', reason: 'Thời gian giao hàng không phù hợp' },
    { product: p6, price: 449000, platform: 'FACEBOOK', reason: 'Khách đặt lại đơn khác kèm voucher' },
    { product: p4, price: 349000, platform: 'TIKTOK', reason: 'Muốn đổi màu sắc sản phẩm' },
    { product: p10, price: 499000, platform: 'FACEBOOK', reason: 'Khách hàng không liên lạc được' },
    { product: p5, price: 849000, platform: 'ORGANIC', reason: 'Hủy đơn do chuyển công tác' }
  ]; // Total 9 cancelled

  for (let i = 0; i < 9; i++) {
    const cfg = cancelledConfigs[i];
    const customer = customers[(i + 35) % customers.length];
    const orderId = `ORD-2026-NOV-${String(orderIndex).padStart(4, '0')}`;
    orderIndex++;

    const subtotal = cfg.price;
    const variant = cfg.product.variants?.[0] || null;

    const daysAgo = Math.floor((9 - i) * 5);
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
  console.log(`✅ Created 9 cancelled orders. Total orders in campaign = ${orderIndex - 1} (44 orders).`);

  // 6. GENERATE EXACTLY 1.423 SESSIONS IN TRAFFIC_LOGS
  // Social: 1.156 (TikTok: 650, Facebook: 400, Instagram: 106)
  // Organic: 267
  // Total: 1.423
  console.log('Regenerating traffic_logs for 1.423 sessions funnel...');
  await prisma.trafficLog.deleteMany({});

  const logsToCreate = [];
  const prodIds = activeProducts.map(p => p.id);

  for (let s = 1; s <= 1423; s++) {
    let platform = 'ORGANIC';
    if (s <= 650) {
      platform = 'TIKTOK';
    } else if (s <= 1050) {
      platform = 'FACEBOOK';
    } else if (s <= 1156) {
      platform = 'INSTAGRAM';
    } else {
      platform = 'DIRECT'; // Organic Search
    }

    const sessionId = `sess_${platform.toLowerCase()}_${String(s).padStart(5, '0')}`;
    const daysAgo = Math.floor((1423 - s) / 25);
    const logDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const assignedProdId = prodIds[s % prodIds.length];

    // Stage 1: SESSION_START (All 1.423 sessions)
    logsToCreate.push({
      platform: platform,
      campaign: 'thu-dong-2026',
      productId: assignedProdId,
      guestSessionId: sessionId,
      action: 'SESSION_START',
      createdAt: logDate
    });

    // Stage 2: VIEW (833 sessions)
    if (s <= 833) {
      logsToCreate.push({
        platform: platform,
        campaign: 'thu-dong-2026',
        productId: assignedProdId,
        guestSessionId: sessionId,
        action: 'VIEW',
        createdAt: new Date(logDate.getTime() + 15000)
      });
    }

    // Stage 3: ADD_TO_CART (198 sessions)
    if (s <= 198) {
      logsToCreate.push({
        platform: platform,
        campaign: 'thu-dong-2026',
        productId: assignedProdId,
        guestSessionId: sessionId,
        action: 'ADD_TO_CART',
        createdAt: new Date(logDate.getTime() + 45000)
      });
    }

    // Stage 4: CHECKOUT (95 sessions)
    if (s <= 95) {
      logsToCreate.push({
        platform: platform,
        campaign: 'thu-dong-2026',
        productId: assignedProdId,
        guestSessionId: sessionId,
        action: 'CHECKOUT',
        createdAt: new Date(logDate.getTime() + 90000)
      });
    }

    // Stage 5: PURCHASE (35 successful orders)
    if (s <= 35) {
      logsToCreate.push({
        platform: platform,
        campaign: 'thu-dong-2026',
        productId: assignedProdId,
        guestSessionId: sessionId,
        action: 'PURCHASE',
        createdAt: new Date(logDate.getTime() + 180000)
      });
    }

    // Stage 6: CANCELLED (9 cancelled orders)
    if (s > 35 && s <= 44) {
      logsToCreate.push({
        platform: platform,
        campaign: 'thu-dong-2026',
        productId: assignedProdId,
        guestSessionId: sessionId,
        action: 'CANCELLED',
        createdAt: new Date(logDate.getTime() + 180000)
      });
    }
  }

  // Insert logs in chunks of 500
  console.log(`Inserting ${logsToCreate.length} traffic log events...`);
  const chunkSize = 500;
  for (let i = 0; i < logsToCreate.length; i += chunkSize) {
    const chunk = logsToCreate.slice(i, i + chunkSize);
    await prisma.trafficLog.createMany({
      data: chunk
    });
  }

  console.log('=== CALIBRATION COMPLETED SUCCESSFULLY ===');
  console.log(`- Total Orders in campaign: 44 (35 valid + 9 cancelled)`);
  console.log(`- Total Revenue: ${totalCalculatedRev.toLocaleString('vi-VN')} VNĐ`);
  console.log(`- Total Sessions: 1.423 (Social: 1.156 [TikTok: 650, FB: 400, IG: 106], Organic: 267)`);
  console.log(`- Funnel: VIEW: 833, ADD_TO_CART: 198, CHECKOUT: 95, PURCHASE: 35, CANCELLED: 9`);

  await prisma.$disconnect();
}

calibrateDataset().catch(err => {
  console.error('Calibration failed:', err);
  process.exit(1);
});
