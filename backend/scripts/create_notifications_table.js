const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  const createSql = `
    CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`type\` VARCHAR(50) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`data\` TEXT NULL,
      \`link\` VARCHAR(255) NULL,
      \`is_read\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`read_at\` DATETIME(3) NULL,
      \`recipient_role\` VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
      \`user_id\` VARCHAR(191) NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`notifications_recipient_role_is_read_idx\` (\`recipient_role\`, \`is_read\`),
      INDEX \`notifications_created_at_idx\` (\`created_at\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;
  await prisma.$executeRawUnsafe(createSql);
  console.log('Table `notifications` created or verified successfully!');
  const tables = await prisma.$queryRawUnsafe("SHOW TABLES LIKE 'notifications'");
  console.log('Check result:', tables);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
