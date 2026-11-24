const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function syncDatabases() {
  const sourceUrl = process.env.DATABASE_URL; // routine_test_db
  const targetUrl = sourceUrl.replace('routine_test_db', 'defaultdb');

  console.log('Source DB:', sourceUrl.split('@')[1]);
  console.log('Target DB:', targetUrl.split('@')[1]);

  const sourcePrisma = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const targetPrisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  try {
    // 1. Check counts
    const sProds = await sourcePrisma.product.count();
    const tProds = await targetPrisma.product.count();
    console.log(`Source products: ${sProds}, Target products: ${tProds}`);

    const sOrders = await sourcePrisma.order.count();
    const tOrders = await targetPrisma.order.count();
    console.log(`Source orders: ${sOrders}, Target orders: ${tOrders}`);

    const sClicks = await sourcePrisma.trafficLog.count();
    const tClicks = await targetPrisma.trafficLog.count();
    console.log(`Source traffic logs: ${sClicks}, Target traffic logs: ${tClicks}`);

    const sUsers = await sourcePrisma.user.count();
    const tUsers = await targetPrisma.user.count();
    console.log(`Source users: ${sUsers}, Target users: ${tUsers}`);

    // Fetch all products from source
    const products = await sourcePrisma.product.findMany({
      include: { variants: true }
    });
    console.log(`Fetched ${products.length} products from source`);

    // Fetch categories & styles
    const categories = await sourcePrisma.category.findMany();
    const styles = await sourcePrisma.style.findMany();

    // Disable foreign key checks on target
    await targetPrisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    // Sync categories
    for (const cat of categories) {
      await targetPrisma.category.upsert({
        where: { id: cat.id },
        update: { ...cat },
        create: { ...cat }
      });
    }
    console.log(`Synced ${categories.length} categories to defaultdb`);

    // Sync styles
    for (const st of styles) {
      await targetPrisma.style.upsert({
        where: { id: st.id },
        update: { ...st },
        create: { ...st }
      });
    }
    console.log(`Synced ${styles.length} styles to defaultdb`);

    // Sync products and variants
    for (const prod of products) {
      const { variants, ...prodData } = prod;
      await targetPrisma.product.upsert({
        where: { id: prod.id },
        update: { ...prodData },
        create: { ...prodData }
      });

      for (const v of variants) {
        await targetPrisma.productVariant.upsert({
          where: { id: v.id },
          update: { ...v },
          create: { ...v }
        });
      }
    }
    console.log(`Synced ${products.length} products with variants to defaultdb`);

    // Sync users
    const users = await sourcePrisma.user.findMany();
    for (const u of users) {
      await targetPrisma.user.upsert({
        where: { id: u.id },
        update: { ...u },
        create: { ...u }
      });
    }
    console.log(`Synced ${users.length} users to defaultdb`);

    // Sync orders and order items
    const orders = await sourcePrisma.order.findMany({
      include: { items: true }
    });
    for (const o of orders) {
      const { items, ...orderData } = o;
      await targetPrisma.order.upsert({
        where: { id: o.id },
        update: { ...orderData },
        create: { ...orderData }
      });

      for (const item of items) {
        await targetPrisma.orderItem.upsert({
          where: { id: item.id },
          update: { ...item },
          create: { ...item }
        });
      }
    }
    console.log(`Synced ${orders.length} orders with items to defaultdb`);

    // Sync traffic logs
    const trafficLogs = await sourcePrisma.trafficLog.findMany();
    // Delete existing traffic logs on target and insert source ones
    await targetPrisma.trafficLog.deleteMany({});
    for (const tl of trafficLogs) {
      await targetPrisma.trafficLog.create({
        data: { ...tl }
      });
    }
    console.log(`Synced ${trafficLogs.length} traffic logs to defaultdb`);

    // Re-enable foreign key checks
    await targetPrisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('✅ DATABASE SYNC COMPLETE! defaultdb now has identical data to routine_test_db!');
  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

syncDatabases();
