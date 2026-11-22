const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Setting up shipping_rules table in routine_test_db ---');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`shipping_rules\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`city\` VARCHAR(100) NOT NULL,
      \`district\` VARCHAR(100) NULL,
      \`region\` VARCHAR(50) NOT NULL DEFAULT 'NORTH',
      \`base_fee\` INT NOT NULL DEFAULT 30000,
      \`free_ship_threshold\` INT NULL DEFAULT 499000,
      \`estimated_delivery\` VARCHAR(100) NULL DEFAULT '2-3 ngày',
      \`is_active\` BOOLEAN NOT NULL DEFAULT true,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`shipping_rules_city_idx\` (\`city\`),
      INDEX \`shipping_rules_region_idx\` (\`region\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  const initialRules = [
    // Nội thành Hà Nội
    {
      id: 'rule-hn-inner',
      city: 'Hà Nội',
      district: 'Ba Đình, Hoàn Kiếm, Đống Đa, Cầu Giấy, Hai Bà Trưng, Thanh Xuân, Tây Hồ',
      region: 'NORTH',
      base_fee: 20000,
      free_ship_threshold: 499000,
      estimated_delivery: '1-2 ngày',
      is_active: true
    },
    // Ngoại thành Hà Nội
    {
      id: 'rule-hn-outer',
      city: 'Hà Nội',
      district: 'Hà Đông, Long Biên, Nam Từ Liêm, Bắc Từ Liêm, Hoàng Mai, Gia Lâm, Đông Anh, Thanh Trì, Sóc Sơn',
      region: 'NORTH',
      base_fee: 30000,
      free_ship_threshold: 499000,
      estimated_delivery: '2-3 ngày',
      is_active: true
    },
    // Nội thành TP. Hồ Chí Minh
    {
      id: 'rule-hcm-inner',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 1, Quận 3, Quận 5, Quận 10, Phú Nhuận, Bình Thạnh, Gò Vấp, Tân Bình',
      region: 'SOUTH',
      base_fee: 20000,
      free_ship_threshold: 499000,
      estimated_delivery: '1-2 ngày',
      is_active: true
    },
    // Ngoại thành TP. Hồ Chí Minh
    {
      id: 'rule-hcm-outer',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 7, Quận 8, Quận 12, Bình Tân, Tân Phú, TP. Thủ Đức, Hóc Môn, Bình Chánh, Nhà Bè, Củ Chi, Cần Giờ',
      region: 'SOUTH',
      base_fee: 30000,
      free_ship_threshold: 499000,
      estimated_delivery: '2-3 ngày',
      is_active: true
    },
    // Nội thành Đà Nẵng
    {
      id: 'rule-danang-inner',
      city: 'Đà Nẵng',
      district: 'Hải Châu, Thanh Khê, Sơn Trà',
      region: 'CENTRAL',
      base_fee: 20000,
      free_ship_threshold: 499000,
      estimated_delivery: '1-2 ngày',
      is_active: true
    },
    // Ngoại thành Đà Nẵng
    {
      id: 'rule-danang-outer',
      city: 'Đà Nẵng',
      district: 'Ngũ Hành Sơn, Cẩm Lệ, Liên Chiểu, Hòa Vang',
      region: 'CENTRAL',
      base_fee: 30000,
      free_ship_threshold: 499000,
      estimated_delivery: '2-3 ngày',
      is_active: true
    },
    // Các tỉnh Đông Nam Bộ & Đồng bằng sông Hồng (tỉnh có showroom hoặc gần kho)
    {
      id: 'rule-tier-near',
      city: 'Bình Dương, Đồng Nai, Bà Rịa - Vũng Tàu, Hải Phòng, Bắc Ninh, Hưng Yên',
      district: null,
      region: 'REGIONAL',
      base_fee: 30000,
      free_ship_threshold: 499000,
      estimated_delivery: '2-3 ngày',
      is_active: true
    },
    // Các tỉnh thành phố khác toàn quốc
    {
      id: 'rule-tier-nationwide',
      city: 'Toàn quốc',
      district: null,
      region: 'NATIONWIDE',
      base_fee: 35000,
      free_ship_threshold: 599000,
      estimated_delivery: '3-4 ngày',
      is_active: true
    },
    // Khu vực vùng xa, miền núi, hải đảo
    {
      id: 'rule-tier-remote',
      city: 'Lào Cai, Lạng Sơn, Điện Biên, Lai Châu, Sơn La, Hà Giang, Cao Bằng, Bắc Kạn, Kon Tum, Đắk Nông, Cà Mau, Phú Quốc',
      district: null,
      region: 'REMOTE',
      base_fee: 45000,
      free_ship_threshold: 799000,
      estimated_delivery: '4-5 ngày',
      is_active: true
    }
  ];

  for (const rule of initialRules) {
    await prisma.shipping_rules.upsert({
      where: { id: rule.id },
      update: rule,
      create: rule
    });
  }

  const count = await prisma.shipping_rules.count();
  console.log(`Successfully seeded ${count} administrative shipping rules!`);
  const rules = await prisma.shipping_rules.findMany();
  console.log(rules);
}

main().catch(console.error).finally(() => prisma.$disconnect());
