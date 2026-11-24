const { randomUUID } = require('crypto');
require('dotenv').config();
const prisma = require('../src/config/prisma');

async function seed2MDataset() {
  console.log('--- SEEDING 2-MONTH SIMULATED BUSINESS DATASET (25M - 30M VNĐ) ---');
  
  // 1. Check if demo dataset already exists
  const existingDemo = await prisma.order.count({
    where: { attributionSource: 'DEMO_DATASET' }
  });
  if (existingDemo > 0) {
    console.log(`Found ${existingDemo} existing demo orders. Cleaning previous demo batch first...`);
    await prisma.paymentTransaction.deleteMany({
      where: { order: { attributionSource: 'DEMO_DATASET' } }
    });
    await prisma.orderItem.deleteMany({
      where: { order: { attributionSource: 'DEMO_DATASET' } }
    });
    await prisma.order.deleteMany({
      where: { attributionSource: 'DEMO_DATASET' }
    });
    console.log('Cleaned previous demo batch.');
  }

  // 2. Fetch active products from DB
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { variants: true },
    take: 30
  });

  if (products.length === 0) {
    throw new Error('No active products found in DB to attach to orders');
  }

  // 3. Fetch some users
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    take: 15
  });

  const vietnameseNames = [
    'Nguyễn Văn An', 'Trần Thị Mai', 'Lê Hoàng Nam', 'Phạm Quỳnh Chi',
    'Hoàng Đức Minh', 'Đặng Thảo Vy', 'Vũ Quốc Bảo', 'Bùi Lan Hương',
    'Ngô Quang Huy', 'Dương Thúy Hằng', 'Đỗ Minh Tuấn', 'Lý Hải Yến'
  ];

  const addresses = [
    'Số 12 ngõ 45 phố Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Hà Nội',
    '245 Nguyễn Trãi, Phường 2, Quận 5, TP. Hồ Chí Minh',
    '88 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    '152 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
    '64 Hoàng Hoa Thám, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
    '120 Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, Cần Thơ',
    '45 Lê Duẩn, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
    '78 Trần Phú, Phường Lộc Thọ, TP. Nha Trang, Khánh Hòa'
  ];

  // We want total paid revenue to hit exactly ~27.500.000 VNĐ (within 25.000.000 - 30.000.000 VNĐ)
  const TARGET_REVENUE = 27500000;
  let currentPaidTotal = 0;
  const createdOrders = [];

  // Generate 36 realistic orders spanning October 1, 2026 to November 24, 2026
  const startDate = new Date('2026-10-01T08:00:00.000Z');
  const endDate = new Date('2026-11-24T18:00:00.000Z');
  const totalDurationMs = endDate.getTime() - startDate.getTime();

  const orderPlan = [];
  const TOTAL_ORDERS = 38;

  for (let i = 0; i < TOTAL_ORDERS; i++) {
    // Generate order timestamp distributed across the 2 months
    const progress = (i + Math.random() * 0.4) / TOTAL_ORDERS;
    const orderTime = new Date(startDate.getTime() + Math.floor(progress * totalDurationMs));
    
    // Select 1 to 3 items
    const numItems = (i % 5 === 0) ? 3 : (i % 2 === 0 ? 2 : 1);
    const orderItems = [];
    let subtotal = 0;

    for (let k = 0; k < numItems; k++) {
      const prod = products[(i * 3 + k) % products.length];
      const variant = (prod.variants && prod.variants.length > 0)
        ? prod.variants[k % prod.variants.length]
        : null;
      const price = variant?.price || prod.price || 499000;
      const qty = 1;
      const itemSubtotal = price * qty;
      subtotal += itemSubtotal;

      const firstImg = Array.isArray(prod.images) ? prod.images[0] : (typeof prod.images === 'string' ? JSON.parse(prod.images)[0] : null);

      orderItems.push({
        productId: prod.id,
        name: prod.name,
        image: firstImg || '/media/img_1789390850925_czk0k9.webp',
        size: variant?.size || 'M',
        color: variant?.color || 'Đen',
        price: price,
        quantity: qty,
        subtotal: itemSubtotal
      });
    }

    const shippingFee = subtotal >= 700000 ? 0 : 30000;
    const discount = (i % 7 === 0) ? 50000 : 0;
    const total = subtotal + shippingFee - discount;

    // We make 32 of them DELIVERED & PAID to reach our revenue target, and 6 in other statuses
    const isPaid = (i < 32);
    const orderStatus = isPaid ? 'DELIVERED' : (i % 2 === 0 ? 'SHIPPING' : 'CONFIRMED');
    const paymentStatus = isPaid ? 'PAID' : 'UNPAID';
    const paymentMethod = (i % 3 === 0) ? 'VNPAY' : 'COD';

    orderPlan.push({
      orderTime,
      orderItems,
      subtotal,
      shippingFee,
      discount,
      total,
      orderStatus,
      paymentStatus,
      paymentMethod,
      customerName: vietnameseNames[i % vietnameseNames.length],
      phone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
      address: addresses[i % addresses.length],
      userId: users[i % users.length]?.id || null,
      isPaid
    });
  }

  // Adjust paid totals to land right at target ~27.500.000 VNĐ
  let preliminaryPaid = orderPlan.filter(o => o.isPaid).reduce((acc, o) => acc + o.total, 0);
  console.log(`Preliminary calculated paid revenue: ${preliminaryPaid.toLocaleString('vi-VN')} VNĐ`);

  const delta = TARGET_REVENUE - preliminaryPaid;
  // Distribute delta across the paid orders
  const paidOrders = orderPlan.filter(o => o.isPaid);
  const perOrderAdj = Math.floor(delta / paidOrders.length);
  const remainder = delta - (perOrderAdj * paidOrders.length);

  for (let idx = 0; idx < paidOrders.length; idx++) {
    const o = paidOrders[idx];
    const adj = perOrderAdj + (idx === 0 ? remainder : 0);
    o.subtotal += adj;
    o.total += adj;
    if (o.orderItems.length > 0) {
      o.orderItems[0].price += adj;
      o.orderItems[0].subtotal += adj;
    }
  }

  const finalPaidSum = orderPlan.filter(o => o.isPaid).reduce((acc, o) => acc + o.total, 0);
  console.log(`Final adjusted paid revenue: ${finalPaidSum.toLocaleString('vi-VN')} VNĐ (Target: 25.000.000 - 30.000.000 VNĐ)`);

  // Insert into DB
  for (let idx = 0; idx < orderPlan.length; idx++) {
    const op = orderPlan[idx];
    const orderId = `ORD-DEMO-2026-${String(idx + 1).padStart(4, '0')}`;

    const createdOrder = await prisma.order.create({
      data: {
        id: orderId,
        userId: op.userId,
        receiverName: op.customerName,
        phoneNumber: op.phone,
        shippingAddress: op.address,
        shippingMethod: 'standard',
        paymentMethod: op.paymentMethod,
        paymentStatus: op.paymentStatus,
        orderStatus: op.orderStatus,
        subtotal: op.subtotal,
        shippingFee: op.shippingFee,
        discount: op.discount,
        total: op.total,
        note: '[DEMO_2M_DATASET] Simulated 2-Month Autumn-Winter Business Revenue Verification',
        attributionSource: 'DEMO_DATASET',
        createdAt: op.orderTime,
        updatedAt: op.orderTime,
        items: {
          create: op.orderItems.map(it => ({
            productId: it.productId,
            name: it.name,
            image: it.image,
            size: it.size,
            color: it.color,
            price: it.price,
            quantity: it.quantity,
            subtotal: it.subtotal
          }))
        }
      }
    });

    // Create payment transaction for paid VNPAY or COD
    if (op.isPaid) {
      await prisma.paymentTransaction.create({
        data: {
          orderId: orderId,
          txnRef: `TXN-DEMO-${orderId}`,
          transactionNo: `VNPAY${Date.now()}${idx}`,
          bankCode: op.paymentMethod === 'VNPAY' ? 'NCB' : 'COD',
          cardType: op.paymentMethod === 'VNPAY' ? 'ATM' : 'CASH',
          amount: op.total,
          status: 'SUCCESS',
          responseCode: '00',
          payDate: op.orderTime.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14),
          createdAt: op.orderTime,
          updatedAt: op.orderTime
        }
      });
    }

    createdOrders.push(createdOrder);
  }

  console.log(`Successfully created ${createdOrders.length} orders in DEMO_DATASET!`);

  // Verify DB state
  const demoAgg = await prisma.order.aggregate({
    where: {
      attributionSource: 'DEMO_DATASET',
      paymentStatus: 'PAID'
    },
    _sum: { total: true },
    _count: { id: true }
  });

  const totalAgg = await prisma.order.aggregate({
    where: { paymentStatus: 'PAID' },
    _sum: { total: true },
    _count: { id: true }
  });

  console.log('=== VERIFICATION SUMMARY ===');
  console.log('Demo Paid Orders Count:', demoAgg._count.id);
  console.log('Demo Paid Revenue:', demoAgg._sum.total.toLocaleString('vi-VN'), 'VNĐ');
  console.log('Total DB Paid Orders Count (Real + Demo):', totalAgg._count.id);
  console.log('Total DB Paid Revenue (Real + Demo):', totalAgg._sum.total.toLocaleString('vi-VN'), 'VNĐ');
}

seed2MDataset()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
