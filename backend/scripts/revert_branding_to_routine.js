const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const targetFiles = [
  'backend/scripts/update_hero_banners.js',
  'backend/src/services/businessIntelligenceService.js',
  'backend/src/services/emailService.js',
  'frontend/app/admin/ai-bi/page.jsx',
  'frontend/app/admin/layout.jsx',
  'frontend/app/admin/leads/page.jsx',
  'frontend/app/admin/orders/page.jsx',
  'frontend/app/admin/page.jsx',
  'frontend/app/admin/vouchers/page.jsx',
  'frontend/app/category/[slug]/page.js',
  'frontend/app/checkout/payment/vnpay-gateway/page.jsx',
  'frontend/app/checkout/payment/vnpay-return/page.jsx',
  'frontend/app/checkout/success/page.js',
  'frontend/app/layout.js',
  'frontend/app/orders/page.js',
  'frontend/app/page.js',
  'frontend/app/product/[id]/page.js',
  'frontend/app/profile/page.js',
  'frontend/app/profile/page.jsx',
  'frontend/app/register/page.jsx',
  'frontend/app/register/style/page.jsx',
  'frontend/app/smart-outfit/ai-stylist/page.js',
  'frontend/app/verify-otp/page.jsx',
  'frontend/components/admin/AdminHeader.jsx',
  'frontend/components/admin/AdminSidebar.jsx',
  'frontend/components/ai/AIStylistChat.jsx',
  'frontend/components/ai/AIStylistFloatingWidget.jsx',
  'frontend/components/ai/InteractiveOutfitCard.jsx',
  'frontend/components/auth/AuthLayout.jsx',
  'frontend/components/auth/AuthLogo.jsx',
  'frontend/components/home/HeroSlider.jsx',
  'frontend/components/layout/Footer.jsx',
  'frontend/components/layout/Header.jsx',
  'frontend/components/layout/Logo.jsx',
  'frontend/components/layout/MobileMenu.jsx',
  'frontend/components/wishlist/WishlistButton.jsx'
];

function replaceBranding(content) {
  return content.replace(/routine\s*thu\s*đông/gi, (match) => {
    if (match === match.toUpperCase()) return 'ROUTINE';
    if (match[0] === 'r') return 'routine';
    return 'Routine';
  });
}

async function main() {
  const baseDir = path.resolve(__dirname, '..', '..');
  console.log('Base directory:', baseDir);

  let totalReplacedFiles = 0;
  let totalReplacements = 0;

  for (const relPath of targetFiles) {
    const fullPath = path.join(baseDir, relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn('File not found:', fullPath);
      continue;
    }

    const originalContent = fs.readFileSync(fullPath, 'utf8');
    const matches = originalContent.match(/routine\s*thu\s*đông/gi);
    if (matches && matches.length > 0) {
      const updatedContent = replaceBranding(originalContent);
      fs.writeFileSync(fullPath, updatedContent, 'utf8');
      console.log(`[UPDATED] ${relPath}: ${matches.length} replacements.`);
      totalReplacedFiles++;
      totalReplacements += matches.length;
    } else {
      console.log(`[SKIPPED] ${relPath}: no matches.`);
    }
  }

  console.log(`\nFiles updated: ${totalReplacedFiles}, Total occurrences replaced: ${totalReplacements}`);

  // Database update
  const prisma = new PrismaClient();
  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { settingKey: 'home_hero_banners' }
    });
    if (setting && /routine\s*thu\s*đông/i.test(setting.description)) {
      const newDesc = replaceBranding(setting.description);
      await prisma.storeSetting.update({
        where: { settingKey: 'home_hero_banners' },
        data: { description: newDesc }
      });
      console.log('[DB UPDATED] storeSetting.home_hero_banners description updated to:', newDesc);
    }
  } catch (err) {
    console.error('[DB ERROR]', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
