const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`addresses\` 
      ADD COLUMN \`latitude\` DECIMAL(10, 7) NULL,
      ADD COLUMN \`longitude\` DECIMAL(10, 7) NULL;
    `);
    console.log('Added latitude and longitude columns successfully!');
  } catch (err) {
    if (err.message.includes('Duplicate column')) {
      console.log('Columns already exist.');
    } else {
      throw err;
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
