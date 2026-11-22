const prisma = require('../src/config/prisma');

async function checkAI() {
  const convs = await prisma.aiConversation.findMany({
    where: {
      OR: [
        { intentReason: { contains: 'Test' } },
        { summary: { contains: 'Test' } },
      ]
    },
    select: { id: true, intentReason: true, summary: true }
  });
  console.log('Dummy AI convs:', convs.length);

  const msgs = await prisma.aiConversationMessage.findMany({
    where: {
      OR: [
        { text: { contains: 'Nguyễn Văn Test' } },
        { text: { contains: 'Test Name' } }
      ]
    },
    select: { id: true, text: true }
  });
  console.log('Dummy AI msgs:', msgs.length);
  await prisma.$disconnect();
}
checkAI().catch(console.error);
