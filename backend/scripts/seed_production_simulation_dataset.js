const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Password hash chuẩn của "Customer@123456"
const PASSWORD_HASH = '$2b$10$X07scHlGYWgpVRALcTa6xuSlvtkK32ns0f3KDXX33sIXSz8ff.CRy';

const CUSTOMER_PROFILES = [
  // Hà Nội (12 khách)
  { fullName: 'Nguyễn Hoàng Nam', email: 'hoangnam.hn@demo.vn', phone: '0912001001', gender: 'Nam', dob: '1995-04-12', street: '18 Phố Huế', ward: 'Phường Hàng Bài', district: 'Quận Hoàn Kiếm', city: 'Hà Nội' },
  { fullName: 'Lê Tuấn Anh', email: 'tuananh.hn@demo.vn', phone: '0912001002', gender: 'Nam', dob: '1998-08-20', street: '45 Xuân Thủy', ward: 'Phường Dịch Vọng Hậu', district: 'Quận Cầu Giấy', city: 'Hà Nội' },
  { fullName: 'Phạm Minh Đức', email: 'minhduc.hn@demo.vn', phone: '0912001003', gender: 'Nam', dob: '1994-01-15', street: '128 Chùa Bộc', ward: 'Phường Quang Trung', district: 'Quận Đống Đa', city: 'Hà Nội' },
  { fullName: 'Trần Thị Mai', email: 'maitran.hn@demo.vn', phone: '0912001004', gender: 'Nữ', dob: '1999-11-05', street: '86 Đội Cấn', ward: 'Phường Đội Cấn', district: 'Quận Ba Đình', city: 'Hà Nội' },
  { fullName: 'Nguyễn Thùy Linh', email: 'thuylinh.hn@demo.vn', phone: '0912001005', gender: 'Nữ', dob: '2001-03-25', street: '210 Bà Triệu', ward: 'Phường Lê Đại Hành', district: 'Quận Hai Bà Trưng', city: 'Hà Nội' },
  { fullName: 'Vũ Phương Thảo', email: 'phuongthao.hn@demo.vn', phone: '0912001006', gender: 'Nữ', dob: '1997-07-19', street: '72 Nguyễn Trãi', ward: 'Phường Thượng Đình', district: 'Quận Thanh Xuân', city: 'Hà Nội' },
  { fullName: 'Đỗ Hải Đăng', email: 'haidang.hn@demo.vn', phone: '0912001007', gender: 'Nam', dob: '1996-09-30', street: '55 Lạc Long Quân', ward: 'Phường Bưởi', district: 'Quận Tây Hồ', city: 'Hà Nội' },
  { fullName: 'Hoàng Bích Ngọc', email: 'bichngoc.hn@demo.vn', phone: '0912001008', gender: 'Nữ', dob: '2000-05-14', street: '14 Quang Trung', ward: 'Phường Quang Trung', district: 'Quận Hà Đông', city: 'Hà Nội' },
  { fullName: 'Phan Gia Huy', email: 'giahuy.hn@demo.vn', phone: '0912001009', gender: 'Nam', dob: '1993-12-08', street: '320 Nguyễn Văn Cừ', ward: 'Phường Bồ Đề', district: 'Quận Long Biên', city: 'Hà Nội' },
  { fullName: 'Đặng Thanh Hằng', email: 'thanhhang.hn@demo.vn', phone: '0912001010', gender: 'Nữ', dob: '1998-02-17', street: '15 Lê Đức Thọ', ward: 'Phường Mỹ Đình 2', district: 'Quận Nam Từ Liêm', city: 'Hà Nội' },
  { fullName: 'Bùi Anh Khoa', email: 'anhkhoa.hn@demo.vn', phone: '0912001011', gender: 'Nam', dob: '1995-10-10', street: '89 Giải Phóng', ward: 'Phường Giáp Bát', district: 'Quận Hoàng Mai', city: 'Hà Nội' },
  { fullName: 'Đỗ Khánh Linh', email: 'khanhlinh.hn@demo.vn', phone: '0912001012', gender: 'Nữ', dob: '2002-06-22', street: '42 Cổ Loa', ward: 'Xã Cổ Loa', district: 'Huyện Đông Anh', city: 'Hà Nội' },

  // TP. Hồ Chí Minh (12 khách)
  { fullName: 'Trần Đình Trọng', email: 'dinhtrong.hcm@demo.vn', phone: '0913002001', gender: 'Nam', dob: '1994-06-18', street: '120 Lê Lợi', ward: 'Phường Bến Thành', district: 'Quận 1', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Vũ Quốc Bảo', email: 'quocbao.hcm@demo.vn', phone: '0913002002', gender: 'Nam', dob: '1996-03-11', street: '254 Cách Mạng Tháng 8', ward: 'Phường 10', district: 'Quận 3', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Lê Ngọc Ánh', email: 'ngocanh.hcm@demo.vn', phone: '0913002003', gender: 'Nữ', dob: '1999-09-09', street: '82 Trần Hưng Đạo', ward: 'Phường 7', district: 'Quận 5', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Hoàng Văn Hùng', email: 'vanhung.hcm@demo.vn', phone: '0913002004', gender: 'Nam', dob: '1992-12-01', street: '11 Sư Vạn Hạnh', ward: 'Phường 12', district: 'Quận 10', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Phạm Thu Trang', email: 'thutrang.hcm@demo.vn', phone: '0913002005', gender: 'Nữ', dob: '1998-04-03', street: '168 Phan Xích Long', ward: 'Phường 2', district: 'Quận Phú Nhuận', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Bùi Thúy Hằng', email: 'thuyhang.hcm@demo.vn', phone: '0913002006', gender: 'Nữ', dob: '2000-01-20', street: '49 Điện Biên Phủ', ward: 'Phường 15', district: 'Quận Bình Thạnh', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Đặng Tiến Đạt', email: 'tiendat.hcm@demo.vn', phone: '0913002007', gender: 'Nam', dob: '1995-07-14', street: '35 Quang Trung', ward: 'Phường 10', district: 'Quận Gò Vấp', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Phan Diệu Linh', email: 'dieulinh.hcm@demo.vn', phone: '0913002008', gender: 'Nữ', dob: '2001-08-16', street: '78 Trường Chinh', ward: 'Phường 12', district: 'Quận Tân Bình', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Dương Trọng Nghĩa', email: 'trongnghia.hcm@demo.vn', phone: '0913002009', gender: 'Nam', dob: '1993-05-28', street: '105 Nguyễn Thị Thập', ward: 'Phường Tân Phú', district: 'Quận 7', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Nguyễn Hải Yến', email: 'haiyen.hcm@demo.vn', phone: '0913002010', gender: 'Nữ', dob: '1997-10-12', street: '22 Võ Văn Ngân', ward: 'Phường Linh Chiểu', district: 'TP. Thủ Đức', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Ngô Quốc Cường', email: 'quoccuong.hcm@demo.vn', phone: '0913002011', gender: 'Nam', dob: '1994-02-09', street: '310 Tên Lửa', ward: 'Phường Bình Trị Đông B', district: 'Quận Bình Tân', city: 'TP. Hồ Chí Minh' },
  { fullName: 'Trần Bảo Trâm', email: 'baotram.hcm@demo.vn', phone: '0913002012', gender: 'Nữ', dob: '1999-12-30', street: '15 Lê Văn Khương', ward: 'Phường Thới An', district: 'Quận 12', city: 'TP. Hồ Chí Minh' },

  // Đà Nẵng (4 khách)
  { fullName: 'Hà Quang Vinh', email: 'quangvinh.dn@demo.vn', phone: '0914003001', gender: 'Nam', dob: '1995-11-11', street: '58 Bạch Đằng', ward: 'Phường Hải Châu 1', district: 'Quận Hải Châu', city: 'Đà Nẵng' },
  { fullName: 'Lê Mỹ Duyên', email: 'myduyen.dn@demo.vn', phone: '0914003002', gender: 'Nữ', dob: '2000-04-18', street: '112 Điện Biên Phủ', ward: 'Phường Chính Gián', district: 'Quận Thanh Khê', city: 'Đà Nẵng' },
  { fullName: 'Đoàn Minh Khôi', email: 'minhkhoi.dn@demo.vn', phone: '0914003003', gender: 'Nam', dob: '1997-09-05', street: '34 Nguyễn Văn Thoại', ward: 'Phường An Hải Đông', district: 'Quận Sơn Trà', city: 'Đà Nẵng' },
  { fullName: 'Phạm Quỳnh Nga', email: 'quynhnga.dn@demo.vn', phone: '0914003004', gender: 'Nữ', dob: '1998-03-22', street: '88 Ngũ Hành Sơn', ward: 'Phường Mỹ An', district: 'Quận Ngũ Hành Sơn', city: 'Đà Nẵng' },

  // Hải Phòng & Cần Thơ (4 khách)
  { fullName: 'Mai Văn Sơn', email: 'vanson.hp@demo.vn', phone: '0915004001', gender: 'Nam', dob: '1993-08-15', street: '45 Cầu Đất', ward: 'Phường Cầu Đất', district: 'Quận Ngô Quyền', city: 'Hải Phòng' },
  { fullName: 'Vũ Thảo Vy', email: 'thaovy.hp@demo.vn', phone: '0915004002', gender: 'Nữ', dob: '2001-12-14', street: '180 Tô Hiệu', ward: 'Phường Trại Cau', district: 'Quận Lê Chân', city: 'Hải Phòng' },
  { fullName: 'Trương Hữu Phước', email: 'huuphuoc.ct@demo.vn', phone: '0916005001', gender: 'Nam', dob: '1994-05-02', street: '25 Đại lộ Hòa Bình', ward: 'Phường Tân An', district: 'Quận Ninh Kiều', city: 'Cần Thơ' },
  { fullName: 'Đỗ Ngọc Huyền', email: 'ngochuyen.ct@demo.vn', phone: '0916005002', gender: 'Nữ', dob: '1999-07-27', street: '140 đường 30 Tháng 4', ward: 'Phường Hưng Lợi', district: 'Quận Ninh Kiều', city: 'Cần Thơ' },

  // Vùng cận trung tâm & vùng xa (3 khách)
  { fullName: 'Đinh Thế Anh', email: 'theanh.bd@demo.vn', phone: '0917006001', gender: 'Nam', dob: '1996-01-19', street: '512 Đại lộ Bình Dương', ward: 'Phường Hiệp Thành', district: 'TP. Thủ Dầu Một', city: 'Bình Dương' },
  { fullName: 'Hoàng Lan Anh', email: 'lananh.vt@demo.vn', phone: '0918007001', gender: 'Nữ', dob: '1998-10-08', street: '36 Ba Cu', ward: 'Phường 1', district: 'TP. Vũng Tàu', city: 'Bà Rịa - Vũng Tàu' },
  { fullName: 'Dương Thùy Chi', email: 'thuychi.lc@demo.vn', phone: '0919008001', gender: 'Nữ', dob: '2000-02-14', street: '12 Đường Fansipan', ward: 'Phường Sa Pa', district: 'Thị xã Sa Pa', city: 'Lào Cai' }
];

async function main() {
  console.log('=== KHỞI TẠO BỘ DỮ LIỆU MÔ PHỎNG VẬN HÀNH THỰC TẾ (DEMO SIMULATION) ===');

  // 1. Lấy danh sách sản phẩm active từ catalog thật
  const activeProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      price: true,
      sizes: true,
      colors: true,
      images: true,
      stockQuantity: true
    }
  });

  if (activeProducts.length === 0) {
    throw new Error('Không tìm thấy sản phẩm ACTIVE nào trong database!');
  }
  console.log(`Đã nạp ${activeProducts.length} sản phẩm ACTIVE từ catalog để liên kết đơn hàng.`);

  // 2. Tạo 35 Khách hàng mô phỏng
  const createdCustomers = [];
  for (let i = 0; i < CUSTOMER_PROFILES.length; i++) {
    const p = CUSTOMER_PROFILES[i];
    // Ngày đăng ký trải từ 01/06/2026 đến 15/10/2026
    const regDaysAgo = Math.floor(30 + Math.random() * 130);
    const regDate = new Date(Date.now() - regDaysAgo * 24 * 60 * 60 * 1000);

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        fullName: p.fullName,
        phoneNumber: p.phone,
        source: 'DEMO',
        gender: p.gender,
        dateOfBirth: new Date(p.dob),
        createdAt: regDate
      },
      create: {
        email: p.email,
        fullName: p.fullName,
        phoneNumber: p.phone,
        passwordHash: PASSWORD_HASH,
        role: 'CUSTOMER',
        gender: p.gender,
        dateOfBirth: new Date(p.dob),
        source: 'DEMO',
        createdAt: regDate
      }
    });

    // Tạo địa chỉ mặc định
    await prisma.address.deleteMany({ where: { userId: user.id } });
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        receiverName: p.fullName,
        phone: p.phone,
        street: p.street,
        ward: p.ward,
        district: p.district,
        city: p.city,
        isDefault: true,
        createdAt: regDate
      }
    });

    createdCustomers.push({ user, address, profile: p });
  }
  console.log(`✅ Đã tạo thành công ${createdCustomers.length} khách hàng mô phỏng đa dạng 3 miền.`);

  // 3. Tạo 75 Đơn hàng mô phỏng trải đều 6 tháng (Tháng 6 -> Tháng 11/2026)
  // Xóa các đơn hàng DEMO cũ nếu đã từng sinh trước đó (giữ lại 16 đơn thật của Nguyễn Văn A)
  const oldDemoOrders = await prisma.order.findMany({
    where: { attributionSource: 'DEMO' },
    select: { id: true }
  });
  if (oldDemoOrders.length > 0) {
    const oldIds = oldDemoOrders.map(o => o.id);
    await prisma.orderItem.deleteMany({ where: { orderId: { in: oldIds } } });
    await prisma.order.deleteMany({ where: { id: { in: oldIds } } });
    console.log(`Đã dọn dẹp ${oldIds.length} đơn hàng DEMO phiên bản trước.`);
  }

  const shippingRules = await prisma.shipping_rules.findMany({ where: { is_active: true } });
  const ruleMap = {};
  shippingRules.forEach(r => { ruleMap[r.id] = r; });

  const paymentMethods = ['COD', 'VNPAY', 'MOMO', 'CARD'];
  const attributionSources = ['ORGANIC', 'FACEBOOK', 'TIKTOK', 'INSTAGRAM', 'GOOGLE'];
  const coupons = ['ROUTINE50K', 'WELCOME10', 'FREESHIP', null, null, null];

  // 75 đơn hàng:
  // - 50 đơn DELIVERED (Hoàn tất giao, thanh toán PAID)
  // - 9 đơn SHIPPING (Đang vận chuyển)
  // - 8 đơn CONFIRMED (Đã xác nhận, đang soạn hàng)
  // - 4 đơn PENDING (Mới đặt)
  // - 4 đơn CANCELLED (Hủy đơn)
  const orderPlan = [];
  for (let i = 0; i < 50; i++) orderPlan.push('DELIVERED');
  for (let i = 0; i < 9; i++) orderPlan.push('SHIPPING');
  for (let i = 0; i < 8; i++) orderPlan.push('CONFIRMED');
  for (let i = 0; i < 4; i++) orderPlan.push('PENDING');
  for (let i = 0; i < 4; i++) orderPlan.push('CANCELLED');

  // Trộn ngẫu nhiên thứ tự trạng thái
  orderPlan.sort(() => Math.random() - 0.5);

  let createdOrdersCount = 0;
  const soldCountMap = {};

  for (let i = 0; i < 75; i++) {
    const orderNum = 100 + i + 1; // ORD-2026-0101 đến ORD-2026-0175
    const orderId = `ORD-2026-0${orderNum}`;
    const status = orderPlan[i];

    // Chọn khách hàng ngẫu nhiên từ danh sách 35 khách
    const custIndex = i % createdCustomers.length;
    const cust = createdCustomers[custIndex];

    // Phân bổ ngày tạo đơn từ Tháng 6 đến Tháng 11/2026 (160 ngày trước đến 1 ngày trước)
    // Đơn DELIVERED trải từ ngày 160 đến ngày 7 trước
    // Đơn SHIPPING trong 1-5 ngày gần đây
    // Đơn CONFIRMED và PENDING trong 1-3 ngày gần đây
    let daysAgo = 10;
    if (status === 'DELIVERED') {
      daysAgo = Math.floor(7 + Math.random() * 150); // 7 đến 157 ngày trước
    } else if (status === 'SHIPPING') {
      daysAgo = Math.floor(1 + Math.random() * 4); // 1-4 ngày trước
    } else if (status === 'CONFIRMED') {
      daysAgo = Math.floor(1 + Math.random() * 3); // 1-3 ngày trước
    } else if (status === 'PENDING') {
      daysAgo = Math.floor(Math.random() * 2); // 0-1 ngày trước
    } else if (status === 'CANCELLED') {
      daysAgo = Math.floor(10 + Math.random() * 120);
    }
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Chọn 1 đến 3 sản phẩm ngẫu nhiên
    const numItems = (i % 5 === 0) ? 3 : (i % 2 === 0 ? 2 : 1);
    const selectedProdIndices = new Set();
    while (selectedProdIndices.size < numItems) {
      selectedProdIndices.add(Math.floor(Math.random() * activeProducts.length));
    }

    const orderItemsData = [];
    let subtotal = 0;

    for (const pIdx of selectedProdIndices) {
      const prod = activeProducts[pIdx];
      const qty = (status !== 'CANCELLED' && Math.random() > 0.8) ? 2 : 1;
      const itemSubtotal = prod.price * qty;
      subtotal += itemSubtotal;

      const sizes = Array.isArray(prod.sizes) && prod.sizes.length > 0 ? prod.sizes : ['M', 'L'];
      const colors = Array.isArray(prod.colors) && prod.colors.length > 0 ? prod.colors : ['Đen', 'Trắng'];
      const images = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images : ['/uploads/img-placeholder.png'];

      const chosenSize = sizes[Math.floor(Math.random() * sizes.length)];
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      const primaryImage = images[0];

      orderItemsData.push({
        productId: prod.id,
        name: prod.name,
        image: primaryImage,
        size: chosenSize,
        color: chosenColor,
        price: prod.price,
        quantity: qty,
        subtotal: itemSubtotal
      });

      // Tích lũy soldCount nếu đơn giao thành công
      if (status === 'DELIVERED') {
        soldCountMap[prod.id] = (soldCountMap[prod.id] || 0) + qty;
      }
    }

    // Tính phí ship theo khu vực hành chính
    let baseShippingFee = 30000;
    const cityNorm = cust.address.city.toLowerCase();
    const isHnOrHcmInner = (cityNorm.includes('hà nội') || cityNorm.includes('hồ chí minh')) &&
      ['hoàn kiếm', 'cầu giấy', 'đống đa', 'ba đình', 'quận 1', 'quận 3', 'quận 5', 'quận 10'].some(d => cust.address.district.toLowerCase().includes(d));

    if (isHnOrHcmInner) {
      baseShippingFee = 20000;
    } else if (cityNorm.includes('lào cai') || cityNorm.includes('cà mau')) {
      baseShippingFee = 45000;
    } else if (cityNorm.includes('hải phòng') || cityNorm.includes('đà nẵng') || cityNorm.includes('bình dương')) {
      baseShippingFee = 30000;
    } else {
      baseShippingFee = 35000;
    }

    const freeThreshold = 499000;
    let shippingFee = subtotal >= freeThreshold ? 0 : baseShippingFee;

    // Mã giảm giá
    const coupon = coupons[i % coupons.length];
    let discount = 0;
    if (coupon === 'ROUTINE50K' && subtotal >= 500000) {
      discount = 50000;
    } else if (coupon === 'WELCOME10') {
      discount = Math.min(Math.round(subtotal * 0.1), 50000);
    } else if (coupon === 'FREESHIP') {
      discount = 0;
      shippingFee = 0;
    }

    const total = Math.max(0, subtotal + shippingFee - discount);

    // Phương thức thanh toán & Trạng thái thanh toán
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    let paymentStatus = 'UNPAID';
    if (status === 'DELIVERED') {
      paymentStatus = 'PAID';
    } else if (status === 'SHIPPING') {
      paymentStatus = (paymentMethod === 'VNPAY' || paymentMethod === 'MOMO' || paymentMethod === 'CARD') ? 'PAID' : 'UNPAID';
    } else if (status === 'CONFIRMED') {
      paymentStatus = (paymentMethod === 'VNPAY' || paymentMethod === 'MOMO') ? 'PAID' : 'UNPAID';
    } else if (status === 'CANCELLED') {
      paymentStatus = (paymentMethod === 'VNPAY' && Math.random() > 0.5) ? 'REFUNDED' : 'UNPAID';
    }

    const fullAddrString = `${cust.address.street}, ${cust.address.ward}, ${cust.address.district}, ${cust.address.city}`;

    // Tạo Order
    const newOrder = await prisma.order.create({
      data: {
        id: orderId,
        userId: cust.user.id,
        receiverName: cust.address.receiverName,
        phoneNumber: cust.address.phone,
        shippingAddress: fullAddrString,
        shippingMethod: isHnOrHcmInner && (i % 7 === 0) ? 'express' : 'standard',
        paymentMethod,
        paymentStatus,
        orderStatus: status,
        subtotal,
        shippingFee,
        discount,
        total,
        appliedCoupon: coupon,
        attributionSource: 'DEMO',
        note: `[MÔ PHỎNG VẬN HÀNH THỰC TẾ] Đơn hàng từ kênh ${attributionSources[i % attributionSources.length]}`,
        createdAt: orderDate,
        updatedAt: orderDate,
        items: {
          create: orderItemsData
        }
      }
    });

    createdOrdersCount++;
  }

  console.log(`✅ Đã tạo thành công ${createdOrdersCount} đơn hàng mô phỏng đầy đủ chi tiết và tính toán nhất quán.`);

  // 4. Cập nhật soldCount trên bảng Product theo dữ liệu đơn DELIVERED thực tế
  console.log('--- CẬP NHẬT TỒN KHO VÀ SẢN PHẨM ĐÃ BÁN (SOLD COUNT) ---');
  for (const [prodId, count] of Object.entries(soldCountMap)) {
    await prisma.product.update({
      where: { id: prodId },
      data: { soldCount: { increment: count } }
    });
  }
  console.log(`Đã cập nhật chỉ số bán hàng soldCount cho ${Object.keys(soldCountMap).length} sản phẩm.`);

  // 5. Thống kê tổng hợp sau khi nạp dữ liệu mô phỏng
  const [totalUsers, totalOrders, totalDelivered, sumRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: 'DELIVERED' } }),
    prisma.order.aggregate({
      where: { orderStatus: { in: ['DELIVERED', 'SHIPPING', 'CONFIRMED'] }, paymentStatus: 'PAID' },
      _sum: { total: true }
    })
  ]);

  console.log('\n=== TỔNG KẾT BỘ DỮ LIỆU MÔ PHỎNG HOÀN THIỆN ===');
  console.log(`- Tổng khách hàng trong hệ thống:     ${totalUsers} (35 khách hàng mô phỏng + tài khoản Admin & User thật)`);
  console.log(`- Tổng số đơn hàng trong hệ thống:     ${totalOrders} (75 đơn mô phỏng + các đơn baseline)`);
  console.log(`- Đơn hàng đã giao thành công:        ${totalDelivered}`);
  console.log(`- Doanh thu thực tế đã ghi nhận:      ${(sumRevenue._sum.total || 0).toLocaleString('vi-VN')} VNĐ`);
  console.log('===================================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
