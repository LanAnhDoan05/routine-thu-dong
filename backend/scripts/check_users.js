const authService = require('../src/services/authService');
const prisma = require('../src/config/prisma');

async function checkCreds() {
  const users = await prisma.user.findMany({ take: 3, select: { email: true, role: true } });
  console.log('Sample users in DB:', users);
  await prisma.$disconnect();
}
checkCreds();
