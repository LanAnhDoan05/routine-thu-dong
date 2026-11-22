const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true, phoneNumber: true, role: true, passwordHash: true }
  });

  const testPw = 'Customer@123456';
  for (const u of users) {
    let match = false;
    try {
      match = await bcrypt.compare(testPw, u.passwordHash || '');
    } catch(e){}
    if (match) {
      console.log(`Matched Customer@123456: ${u.fullName} (${u.phoneNumber} / ${u.email}) [id: ${u.id}]`);
    }
  }

  const adminPw = 'Admin@123456';
  for (const u of users) {
    let match = false;
    try {
      match = await bcrypt.compare(adminPw, u.passwordHash || '');
    } catch(e){}
    if (match) {
      console.log(`Matched Admin@123456: ${u.fullName} (${u.phoneNumber} / ${u.email}) [id: ${u.id}]`);
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
