const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  try {
    const settings = await prisma.storeSetting.findMany();
    const matchingSettings = settings.filter(s => /routine\s*thu\s*đông/i.test(JSON.stringify(s)));
    console.log('Matching settings:', matchingSettings.length);
    for (const s of matchingSettings) {
      console.log('Setting key:', s.settingKey, 'description:', s.description);
    }

    const products = await prisma.product.findMany({ select: { id: true, name: true, description: true } });
    const matchingProducts = products.filter(p => /routine\s*thu\s*đông/i.test(p.name + ' ' + (p.description || '')));
    console.log('Matching products:', matchingProducts.length);

    const categories = await prisma.category.findMany();
    const matchingCategories = categories.filter(c => /routine\s*thu\s*đông/i.test(c.name + ' ' + (c.description || '')));
    console.log('Matching categories:', matchingCategories.length);

    const notifications = await prisma.notification.findMany();
    const matchingNotifs = notifications.filter(n => /routine\s*thu\s*đông/i.test(n.title + ' ' + n.message));
    console.log('Matching notifications:', matchingNotifs.length);

    const aiReports = await prisma.aiBiReport.findMany();
    const matchingReports = aiReports.filter(r => /routine\s*thu\s*đông/i.test(JSON.stringify(r)));
    console.log('Matching AI BI reports:', matchingReports.length);
  } catch (err) {
    console.error('DB check error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
checkDb();
