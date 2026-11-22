const prisma = require('../src/config/prisma');

async function cleanRemaining() {
  await prisma.user.update({
    where: { id: 'c80bc912-a635-43ec-bec8-079ab19f979d' },
    data: { fullName: 'Trần Thị Thu Trang', email: 'thutrang.tran01@routine.vn' }
  });
  await prisma.user.update({
    where: { id: 'd0854d19-2564-4f37-9692-fbe35f90a18f' },
    data: { fullName: 'Trần Thị Thu Hương', email: 'thuhuong.tran02@routine.vn' }
  });
  await prisma.user.update({
    where: { id: 'd13b7af9-5507-478a-ab66-800c7f07699a' },
    data: { fullName: 'Nguyễn Hải Yến', email: 'haiyen.nguyen88@gmail.com' }
  });
  console.log('✓ Cleaned 3 remaining user names & emails');
  await prisma.$disconnect();
}
cleanRemaining().catch(console.error);
