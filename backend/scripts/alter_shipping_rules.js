const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`shipping_rules\` 
    MODIFY COLUMN \`city\` VARCHAR(500) NOT NULL,
    MODIFY COLUMN \`district\` VARCHAR(1000) NULL;
  `);
  console.log('Altered shipping_rules columns to support longer text.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
