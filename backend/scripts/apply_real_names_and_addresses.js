const prisma = require('../src/config/prisma');

async function updateRealData() {
  console.log('=== CẬP NHẬT TÊN THẬT, SỐ ĐIỆN THOẠI THẬT, ĐỊA CHỈ THẬT CHO USERS & ADDRESSES ===\n');

  // 1. Cập nhật tài khoản Admin
  await prisma.user.update({
    where: { id: 'c0d4fbad-b038-11f1-9fbc-005056c00001' },
    data: {
      fullName: 'Trần Đức Trọng (Quản trị viên)',
      phoneNumber: '0988123456',
    },
  });
  console.log('✓ Updated Admin: Trần Đức Trọng - 0988123456');

  // 2. Cập nhật tài khoản Khách hàng chính (dùng trong test)
  await prisma.user.update({
    where: { id: 'd6267df9-91b4-4ca9-8c23-28e4d2ed5357' },
    data: {
      fullName: 'Nguyễn Hoàng Long',
      email: 'hoanglong.nguyen@routine.vn',
      phoneNumber: '0912456789',
    },
  });
  console.log('✓ Updated Customer (d6267df9): Nguyễn Hoàng Long - 0912456789 - hoanglong.nguyen@routine.vn');

  // Thêm hoặc cập nhật địa chỉ thật cho Nguyễn Hoàng Long
  const existingAddr = await prisma.address.findFirst({
    where: { userId: 'd6267df9-91b4-4ca9-8c23-28e4d2ed5357' }
  });
  if (existingAddr) {
    await prisma.address.update({
      where: { id: existingAddr.id },
      data: {
        receiverName: 'Nguyễn Hoàng Long',
        phone: '0912456789',
        street: 'Số 88 Phố Huế',
        ward: 'Phường Hàng Bài',
        district: 'Quận Hoàn Kiếm',
        city: 'Hà Nội',
        isDefault: true,
      }
    });
  } else {
    await prisma.address.create({
      data: {
        userId: 'd6267df9-91b4-4ca9-8c23-28e4d2ed5357',
        receiverName: 'Nguyễn Hoàng Long',
        phone: '0912456789',
        street: 'Số 88 Phố Huế',
        ward: 'Phường Hàng Bài',
        district: 'Quận Hoàn Kiếm',
        city: 'Hà Nội',
        isDefault: true,
      }
    });
  }
  console.log('✓ Updated Address for Nguyễn Hoàng Long: 88 Phố Huế, P. Hàng Bài, Q. Hoàn Kiếm, Hà Nội');

  // 3. Cập nhật các tài khoản dummy khác
  // a840cef9: Nguyễn Văn Test -> Hoàng Văn Nam
  try {
    await prisma.user.update({
      where: { id: 'a840cef9-2a73-4300-b623-7dba816f87b4' },
      data: {
        fullName: 'Hoàng Văn Nam',
        email: 'hoangvannam.tb@gmail.com',
        phoneNumber: '0973456789',
      }
    });
    console.log('✓ Updated User (a840cef9): Hoàng Văn Nam - 0973456789');
  } catch (e) {}

  // a9629176: Nguyen Van Test -> Nguyễn Thanh Tùng
  try {
    await prisma.user.update({
      where: { id: 'a9629176-04b2-4f2f-8c99-36e3a93b6d6b' },
      data: {
        fullName: 'Nguyễn Thanh Tùng',
        email: 'thanhtung.routine@gmail.com',
        phoneNumber: '0961234567',
      }
    });
    console.log('✓ Updated User (a9629176): Nguyễn Thanh Tùng - 0961234567');
  } catch (e) {}

  // 46e61a40: Test Name -> Trần Quang Huy
  try {
    await prisma.user.update({
      where: { id: '46e61a40-95ea-43ae-8c2c-a3fc9eb12518' },
      data: {
        fullName: 'Trần Quang Huy',
        email: 'quanghuy.tran@gmail.com',
        phoneNumber: '0982345678',
      }
    });
    console.log('✓ Updated User (46e61a40): Trần Quang Huy - 0982345678');
  } catch (e) {}

  // 86a7f48b: Khách Hàng Mới -> Võ Ngọc Bích
  try {
    await prisma.user.update({
      where: { id: '86a7f48b-94b4-4748-bacf-209ce48acf83' },
      data: {
        fullName: 'Võ Ngọc Bích',
        email: 'ngocbich.vo@gmail.com',
        phoneNumber: '0938456789',
      }
    });
    console.log('✓ Updated User (86a7f48b): Võ Ngọc Bích - 0938456789');
  } catch (e) {}

  // usr-customer-001: Nguyễn Văn A -> Nguyễn Tuấn Anh
  try {
    await prisma.user.update({
      where: { id: 'usr-customer-001' },
      data: {
        fullName: 'Nguyễn Tuấn Anh',
        email: 'tuananh.nguyen@gmail.com',
        phoneNumber: '0901234567',
      }
    });
    console.log('✓ Updated User (usr-customer-001): Nguyễn Tuấn Anh - 0901234567');
  } catch (e) {}

  console.log('\n=== HOÀN TẤT CẬP NHẬT DỮ LIỆU THỰC TẾ TRONG MYSQL ===');
  await prisma.$disconnect();
}

updateRealData().catch((err) => {
  console.error('Error updating real data:', err);
  process.exit(1);
});
