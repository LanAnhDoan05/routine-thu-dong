const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Setting up AI Business Intelligence tables in MySQL routine_test_db...");

  // 1. Create ai_bi_reports table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ai_bi_reports\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`admin_id\` VARCHAR(191) NULL,
      \`period\` VARCHAR(50) NOT NULL DEFAULT '30d',
      \`start_date\` DATETIME NULL,
      \`end_date\` DATETIME NULL,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
      \`metrics_snapshot\` JSON NULL,
      \`executive_summary\` LONGTEXT NULL,
      \`sales_analysis\` LONGTEXT NULL,
      \`demand_analysis\` LONGTEXT NULL,
      \`conversion_analysis\` LONGTEXT NULL,
      \`inventory_analysis\` LONGTEXT NULL,
      \`opportunity_analysis\` LONGTEXT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_bi_reports_created_at\` (\`created_at\`),
      INDEX \`idx_bi_reports_admin_id\` (\`admin_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✓ ai_bi_reports table ready");

  // 2. Create ai_bi_recommendations table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ai_bi_recommendations\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`report_id\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(50) NOT NULL DEFAULT 'PRODUCT',
      \`priority\` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
      \`issue_detected\` TEXT NOT NULL,
      \`data_evidence\` TEXT NOT NULL,
      \`root_cause_analysis\` TEXT NOT NULL,
      \`proposed_action\` TEXT NOT NULL,
      \`expected_outcome\` TEXT NOT NULL,
      \`risks_and_conditions\` TEXT NOT NULL,
      \`confidence_level\` TEXT NOT NULL,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_bi_rec_report_id\` (\`report_id\`),
      INDEX \`idx_bi_rec_status\` (\`status\`),
      INDEX \`idx_bi_rec_priority\` (\`priority\`),
      INDEX \`idx_bi_rec_category\` (\`category\`),
      CONSTRAINT \`fk_bi_rec_report\` FOREIGN KEY (\`report_id\`) REFERENCES \`ai_bi_reports\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("✓ ai_bi_recommendations table ready");

  // 3. Verify tables exist
  const tables = await prisma.$queryRawUnsafe(`SHOW TABLES LIKE 'ai_bi%'`);
  console.log("Verified BI tables in DB:", tables);
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
