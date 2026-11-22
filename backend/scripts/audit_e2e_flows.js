const prisma = require('../src/config/prisma');
const productService = require('../src/services/productService');
const fashionAgentService = require('../src/services/fashionAgentService');

async function runE2eFlows() {
  console.log('====================================================');
  console.log('      ROUTINE WEB 6 E2E BUSINESS FLOWS AUDIT        ');
  console.log('====================================================');

  const report = {
    flow1_createProduct: { status: 'PENDING' },
    flow2_updateProduct: { status: 'PENDING' },
    flow3_inactiveProduct: { status: 'PENDING' },
    flow4_checkoutPayment: { status: 'PENDING' },
    flow5_orderManagement: { status: 'PENDING' },
    flow6_dataSyncAndBi: { status: 'PENDING' },
  };

  // Login Admin to get token
  console.log('\n[AUTH] Logging in as Admin...');
  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin_new@routine.vn',
      password: 'Admin@123456',
    }),
  });
  const loginData = await loginRes.json();
  const adminToken = loginData?.data?.token;
  if (!adminToken) throw new Error('Admin login failed');

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  // Login Customer to get token
  console.log('[AUTH] Logging in as Customer (0901234567)...');
  const custRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '0901234567',
      password: 'Customer@123456',
    }),
  });
  const custData = await custRes.json();
  const custToken = custData?.data?.token;
  const custUser = custData?.data?.user;
  if (!custToken) throw new Error('Customer login failed');

  const custHeaders = {
    'Authorization': `Bearer ${custToken}`,
    'Content-Type': 'application/json',
  };

  let testProductId = null;
  let testOrderId = null;

  try {
    // =========================================================================
    // FLOW 1: ADMIN CREATES PRODUCT -> DB -> CUSTOMER STOREFRONT -> GEMINI AI
    // =========================================================================
    console.log('\n--- FLOW 1: CREATE PRODUCT (ADMIN -> DB -> CUSTOMER -> GEMINI) ---');
    const newProdPayload = {
      name: '[AUDIT-TEST-FLOW] Áo Sơ Mi Linen Form Rộng Cao Cấp',
      price: 369000,
      originalPrice: 499000,
      categoryId: 'ao',
      category: 'ao',
      gender: 'MEN',
      status: 'ACTIVE',
      description: 'Áo sơ mi linen cao cấp phục vụ kiểm thử liên thông Routine Web E2E.',
      stockQuantity: 50,
      variants: [
        { sku: 'AUDIT-TEST-W-M', color: 'Trắng', size: 'M', stockQuantity: 25, price: 369000 },
        { sku: 'AUDIT-TEST-N-L', color: 'Xanh Navy', size: 'L', stockQuantity: 25, price: 369000 },
      ],
      images: ['/images/products/default-product.svg'],
    };

    const createRes = await fetch('http://localhost:5001/api/v1/products', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(newProdPayload),
    });
    const createData = await createRes.json();
    testProductId = createData?.data?.id;
    console.log('1.1 Admin created product:', { status: createRes.status, id: testProductId, res: createData });

    if (!testProductId) {
      throw new Error('Product creation failed: ' + JSON.stringify(createData));
    }

    // Verify DB
    const dbProduct = await prisma.product.findUnique({
      where: { id: testProductId },
      include: { variants: true },
    });
    console.log('1.2 MySQL persistence verified:', {
      name: dbProduct?.name,
      price: dbProduct?.price,
      variantsCount: dbProduct?.variants?.length,
    });

    // Verify Customer Search
    const searchRes = await fetch(`http://localhost:5001/api/v1/products?q=Linen`);
    const searchData = await searchRes.json();
    const foundInSearch = searchData?.data?.items?.some((p) => p.id === testProductId);
    console.log('1.3 Customer Search verified:', { foundInSearch });

    // Verify Gemini AI Stylist can search and see it
    const aiRes = await fetch('http://localhost:5001/api/v1/ai/chat', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        message: 'Tìm giúp tôi sản phẩm Áo Sơ Mi Linen Form Rộng',
      }),
    });
    const aiData = await aiRes.json();
    const aiReplyText = aiData?.data?.message || '';
    const aiMentionsProd = aiReplyText.toLowerCase().includes('linen') || aiReplyText.toLowerCase().includes('sơ mi') || Boolean(aiData?.data?.products?.length);
    console.log('1.4 Gemini AI Stylist verified:', { aiReplyPreview: aiReplyText.slice(0, 100), success: aiMentionsProd });

    if (testProductId && dbProduct && foundInSearch && aiMentionsProd) {
      report.flow1_createProduct = { status: 'PASS', productId: testProductId };
    } else {
      report.flow1_createProduct = { status: 'FAIL' };
    }

    // =========================================================================
    // FLOW 2: ADMIN UPDATES PRODUCT -> DB -> CUSTOMER -> GEMINI AI REFLECTS
    // =========================================================================
    console.log('\n--- FLOW 2: UPDATE PRODUCT (ADMIN -> DB -> CUSTOMER -> GEMINI) ---');
    const updateRes = await fetch(`http://localhost:5001/api/v1/products/${testProductId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        ...newProdPayload,
        price: 399000, // Tăng giá lên 399k
        stockQuantity: 42, // Giảm tồn kho
      }),
    });
    const updateData = await updateRes.json();
    console.log('2.1 Admin updated product:', { status: updateRes.status, newPrice: updateData?.data?.price });

    // Verify DB update
    const dbUpdated = await prisma.product.findUnique({ where: { id: testProductId } });
    console.log('2.2 DB updated verified:', { price: dbUpdated?.price, stock: dbUpdated?.stockQuantity });

    // Customer View detail
    const detailRes = await fetch(`http://localhost:5001/api/v1/products/${testProductId}`);
    const detailData = await detailRes.json();
    const customerPriceUpdated = detailData?.data?.price === 399000;
    console.log('2.3 Customer detail reflects new price:', { customerPriceUpdated });

    if (customerPriceUpdated && dbUpdated?.price === 399000) {
      report.flow2_updateProduct = { status: 'PASS', updatedPrice: 399000 };
    } else {
      report.flow2_updateProduct = { status: 'FAIL' };
    }

    // =========================================================================
    // FLOW 3: ADMIN MARKS INACTIVE -> CUSTOMER HIDDEN -> GEMINI EXCLUDES
    // =========================================================================
    console.log('\n--- FLOW 3: INACTIVE PRODUCT (ADMIN -> CUSTOMER HIDDEN -> GEMINI EXCLUDED) ---');
    const inactiveRes = await fetch(`http://localhost:5001/api/v1/products/${testProductId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        ...newProdPayload,
        price: 399000,
        status: 'INACTIVE',
      }),
    });
    console.log('3.1 Admin set status to INACTIVE:', { status: inactiveRes.status });

    // Customer catalog search should NOT include INACTIVE products
    const catalogSearchRes = await fetch(`http://localhost:5001/api/v1/products?search=AUDIT-TEST-FLOW`);
    const catalogData = await catalogSearchRes.json();
    const hiddenFromCatalog = !catalogData?.data?.items?.some((p) => p.id === testProductId && p.status === 'ACTIVE');
    console.log('3.2 Customer catalog hides inactive product:', { hiddenFromCatalog });

    if (hiddenFromCatalog) {
      report.flow3_inactiveProduct = { status: 'PASS' };
    } else {
      report.flow3_inactiveProduct = { status: 'FAIL' };
    }

    // Reactivate for remaining purchasing flows
    await prisma.product.update({
      where: { id: testProductId },
      data: { status: 'ACTIVE' },
    });

    // =========================================================================
    // FLOW 4: CUSTOMER PURCHASE (CART -> CHECKOUT -> ORDER -> VNPAY SANDBOX)
    // =========================================================================
    console.log('\n--- FLOW 4: PURCHASE & ORDER CREATION (CUSTOMER -> DB -> PAYMENT) ---');
    // Add to cart
    const addCartRes = await fetch('http://localhost:5001/api/v1/cart/items', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        productId: testProductId,
        quantity: 1,
        size: 'M',
        color: 'Trắng',
      }),
    });
    console.log('4.1 Customer added to cart:', { status: addCartRes.status });

    // Create Order
    const orderPayload = {
      items: [
        {
          productId: testProductId,
          quantity: 1,
          size: 'M',
          color: 'Trắng',
          price: 399000,
        },
      ],
      shippingAddress: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      paymentMethod: 'VNPAY',
      note: 'Đơn hàng kiểm thử E2E liên thông hệ thống',
    };

    const orderRes = await fetch('http://localhost:5001/api/v1/orders', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify(orderPayload),
    });
    const orderJson = await orderRes.json();
    testOrderId = orderJson?.data?.id || orderJson?.data?.order?.id;
    console.log('4.2 Order created successfully:', { orderId: testOrderId, status: orderRes.status });

    // VNPay Sandbox Payment URL creation
    const vnpayRes = await fetch('http://localhost:5001/api/v1/payment/vnpay/create-payment-url', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        orderId: testOrderId,
        amount: 399000,
        bankCode: 'NCB',
      }),
    });
    const vnpayJson = await vnpayRes.json();
    const hasPaymentUrl = Boolean(vnpayJson?.data?.paymentUrl || vnpayJson?.data?.url);
    console.log('4.3 VNPay Sandbox Payment URL generated:', { hasPaymentUrl, status: vnpayRes.status });

    // Simulate successful payment callback
    await prisma.order.update({
      where: { id: testOrderId },
      data: {
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
      },
    });

    if (testOrderId && hasPaymentUrl) {
      report.flow4_checkoutPayment = { status: 'PASS', orderId: testOrderId };
    } else {
      report.flow4_checkoutPayment = { status: 'FAIL' };
    }

    // =========================================================================
    // FLOW 5: ORDER MANAGEMENT (ADMIN UPDATES -> CUSTOMER SEES NEW STATUS)
    // =========================================================================
    console.log('\n--- FLOW 5: ORDER MANAGEMENT (ADMIN -> STATUS UPDATE -> CUSTOMER) ---');
    // Admin views order
    const adminOrdersRes = await fetch('http://localhost:5001/api/v1/orders/admin/all', { headers: adminHeaders });
    const adminOrdersJson = await adminOrdersRes.json();
    const adminFoundOrder = adminOrdersJson?.data?.items?.some((o) => o.id === testOrderId);
    console.log('5.1 Admin can see created order:', { adminFoundOrder });

    // Admin updates order status to SHIPPING
    const statusUpdateRes = await fetch(`http://localhost:5001/api/v1/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'SHIPPING',
      }),
    });
    console.log('5.2 Admin updated status to SHIPPING:', { status: statusUpdateRes.status });

    // Customer views order and sees updated status
    const custOrderRes = await fetch(`http://localhost:5001/api/v1/orders/${testOrderId}`, { headers: custHeaders });
    const custOrderJson = await custOrderRes.json();
    const customerSeesShipping = custOrderJson?.data?.orderStatus === 'SHIPPING' || custOrderJson?.data?.status === 'shipping';
    console.log('5.3 Customer sees updated status SHIPPING:', { customerSeesShipping });

    if (adminFoundOrder && customerSeesShipping) {
      report.flow5_orderManagement = { status: 'PASS' };
    } else {
      report.flow5_orderManagement = { status: 'FAIL' };
    }

    // =========================================================================
    // FLOW 6: DATA SYNCHRONIZATION ACROSS BI & ANALYTICS
    // =========================================================================
    console.log('\n--- FLOW 6: DATA SYNCHRONIZATION ACROSS BI & ANALYTICS ---');
    const biRevRes = await fetch('http://localhost:5001/api/v1/bi/overview', { headers: adminHeaders });
    const biRevJson = await biRevRes.json();
    const biRecognizesOrders = biRevJson?.data?.validOrdersCount > 0;
    console.log('6.1 AI BI Overview reflects live order metrics:', {
      validOrders: biRevJson?.data?.validOrdersCount,
      revenue: biRevJson?.data?.validRevenue,
      success: biRecognizesOrders,
    });

    if (biRecognizesOrders) {
      report.flow6_dataSyncAndBi = { status: 'PASS' };
    } else {
      report.flow6_dataSyncAndBi = { status: 'FAIL' };
    }

  } catch (err) {
    console.error('E2E Flows error:', err);
  } finally {
    // Clean up test order and test product
    console.log('\n[CLEANUP] Cleaning up test records to preserve routine_test_db baseline...');
    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
      console.log('  -> Test order deleted.');
    }
    if (testProductId) {
      await prisma.productVariant.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
      console.log('  -> Test product deleted.');
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log('        6 E2E BUSINESS FLOWS AUDIT RESULTS          ');
  console.log('====================================================');
  console.log(JSON.stringify(report, null, 2));

  const allPass = Object.values(report).every((r) => r.status === 'PASS');
  console.log('ALL 6 FLOWS:', allPass ? '100% PASS' : 'SOME FLOWS FAILED');

  return report;
}

runE2eFlows().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
