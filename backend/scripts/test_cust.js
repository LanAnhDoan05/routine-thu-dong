const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

async function testCust() {
  const custs = await prisma.user.findMany({ where: { role: 'CUSTOMER' }, take: 10 });
  const common = ['123456', 'Admin@123456', 'routine123', 'demo123', 'password', '12345678', 'Mai@123456'];
  for (const c of custs) {
    for (const p of common) {
      if (await bcrypt.compare(p, c.passwordHash)) {
        console.log(`Matched customer: ${c.email} with password: ${p}`);
        await prisma.$disconnect();
        return;
      }
    }
  }
  console.log('No common password matched');
  await prisma.$disconnect();
}
testCust();
