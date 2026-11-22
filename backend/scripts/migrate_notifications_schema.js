const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding reference_type, reference_id, recipient_id to notifications table...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`notifications\`
      ADD COLUMN IF NOT EXISTS \`reference_type\` VARCHAR(50) NULL AFTER \`message\`,
      ADD COLUMN IF NOT EXISTS \`reference_id\` VARCHAR(191) NULL AFTER \`reference_type\`,
      ADD COLUMN IF NOT EXISTS \`recipient_id\` VARCHAR(191) NULL AFTER \`recipient_role\`,
      ADD INDEX IF NOT EXISTS \`notifications_ref_idx\` (\`reference_type\`, \`reference_id\`);
    `);
    console.log('✓ Successfully altered notifications table!');
  } catch (err) {
    // MySQL older syntax fallback if IF NOT EXISTS in ADD COLUMN is not supported
    console.log('Trying individual column additions...');
    const cols = await prisma.$queryRawUnsafe('DESCRIBE notifications');
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes('reference_type')) {
      await prisma.$executeRawUnsafe('ALTER TABLE `notifications` ADD COLUMN `reference_type` VARCHAR(50) NULL');
    }
    if (!colNames.includes('reference_id')) {
      await prisma.$executeRawUnsafe('ALTER TABLE `notifications` ADD COLUMN `reference_id` VARCHAR(191) NULL');
    }
    if (!colNames.includes('recipient_id')) {
      await prisma.$executeRawUnsafe('ALTER TABLE `notifications` ADD COLUMN `recipient_id` VARCHAR(191) NULL');
    }
    console.log('✓ Fallback column checks/additions completed!');
  }

  const desc = await prisma.$queryRawUnsafe('DESCRIBE notifications');
  console.log('Current notifications columns:', desc.map(c => c.Field));
}

main().catch(console.error).finally(() => prisma.$disconnect());
