const prisma = require('../src/config/prisma');

async function updateHeroSetting() {
  const currentSetting = await prisma.storeSetting.findUnique({
    where: { settingKey: 'home_hero_banners' }
  });

  let parsed = {};
  if (currentSetting && currentSetting.settingValue) {
    try {
      parsed = JSON.parse(currentSetting.settingValue);
    } catch (e) {
      console.warn('Failed to parse current setting:', e.message);
    }
  }

  const updatedConfig = {
    ...parsed,
    title: 'THU ĐÔNG, ĐỊNH HÌNH PHONG CÁCH',
    subtitle: 'Khám phá những thiết kế thời trang hiện đại, tinh tế và linh hoạt cho phong cách mỗi ngày.',
    slideInterval: parsed.slideInterval || 3000,
    exploreLink: '/category/new-arrivals',
    outfitLink: '/smart-outfit',
  };

  await prisma.storeSetting.upsert({
    where: { settingKey: 'home_hero_banners' },
    update: {
      settingValue: JSON.stringify(updatedConfig),
      description: 'Hero Banners cấu hình bộ sưu tập Routine',
      updatedAt: new Date(),
    },
    create: {
      settingKey: 'home_hero_banners',
      settingValue: JSON.stringify(updatedConfig),
      description: 'Hero Banners cấu hình bộ sưu tập Routine',
    }
  });

  console.log('Successfully updated home_hero_banners in store_settings:', updatedConfig);
  await prisma.$disconnect();
}

updateHeroSetting().catch((err) => {
  console.error('Error updating hero setting:', err);
  process.exit(1);
});
