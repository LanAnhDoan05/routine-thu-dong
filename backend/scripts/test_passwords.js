const authService = require('../src/services/authService');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

async function testPasswords() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  console.log('Admin email:', admin.email);
  const passwordsToTest = ['Admin@123456', 'admin123', 'Routine@2026', '123456', 'routine123'];
  for (const p of passwordsToTest) {
    const match = await bcrypt.compare(p, admin.passwordHash);
    if (match) {
      console.log('Admin password match found:', p);
      break;
    }
  }

  const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  console.log('Customer email:', customer.email);
  for (const p of ['123456', 'Customer@123', 'Password123!', 'demo123456', 'tiendat123']) {
    const match = await bcrypt.compare(p, customer.passwordHash);
    if (match) {
      console.log('Customer password match found:', p);
      break;
    }
  }
  await prisma.$disconnect();
}
testPasswords();
