const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

async function matchAdministrativeShippingRule(addressInput) {
  let fullText = '';
  let city = '';
  let district = '';

  if (typeof addressInput === 'string') {
    fullText = addressInput;
  } else if (addressInput && typeof addressInput === 'object') {
    city = addressInput.city || addressInput.province || '';
    district = addressInput.district || '';
    fullText = [
      addressInput.address || addressInput.street || '',
      addressInput.ward || '',
      district,
      city
    ].filter(Boolean).join(', ');
  }

  const normFull = normalizeText(fullText);
  const normCity = normalizeText(city);
  const normDistrict = normalizeText(district);

  const rules = await prisma.shipping_rules.findMany({
    where: { is_active: true }
  });

  const ruleMap = {};
  rules.forEach(r => { ruleMap[r.id] = r; });

  // 1. Hà Nội
  if (normCity.includes('ha noi') || normCity.includes('hn') || normFull.includes('ha noi') || normFull.includes('tp ha noi')) {
    const innerDistricts = ['ba dinh', 'hoan kiem', 'dong da', 'cau giay', 'hai ba trung', 'thanh xuan', 'tay ho'];
    const isInner = innerDistricts.some(d => normDistrict.includes(d) || normFull.includes(d));
    const matched = isInner ? ruleMap['rule-hn-inner'] : ruleMap['rule-hn-outer'];
    return { rule: matched || ruleMap['rule-hn-outer'], isInner, zone: isInner ? 'Nội thành Hà Nội' : 'Ngoại thành Hà Nội' };
  }

  // 2. TP. Hồ Chí Minh
  if (
    normCity.includes('ho chi minh') || normCity.includes('tphcm') || normCity.includes('tp hcm') ||
    normCity.includes('sai gon') || normCity.includes('hcm') ||
    normFull.includes('ho chi minh') || normFull.includes('tphcm') || normFull.includes('tp hcm') || normFull.includes('sai gon')
  ) {
    const innerDistricts = ['quan 1', 'quan 3', 'quan 5', 'quan 10', 'phu nhuan', 'binh thanh', 'go vap', 'tan binh'];
    const isInner = innerDistricts.some(d => normDistrict.includes(d) || normFull.includes(d));
    const matched = isInner ? ruleMap['rule-hcm-inner'] : ruleMap['rule-hcm-outer'];
    return { rule: matched || ruleMap['rule-hcm-outer'], isInner, zone: isInner ? 'Nội thành TP.HCM' : 'Ngoại thành TP.HCM' };
  }

  // 3. Đà Nẵng
  if (normCity.includes('da nang') || normFull.includes('da nang')) {
    const innerDistricts = ['hai chau', 'thanh khe', 'son tra'];
    const isInner = innerDistricts.some(d => normDistrict.includes(d) || normFull.includes(d));
    const matched = isInner ? ruleMap['rule-danang-inner'] : ruleMap['rule-danang-outer'];
    return { rule: matched || ruleMap['rule-danang-outer'], isInner, zone: isInner ? 'Nội thành Đà Nẵng' : 'Ngoại thành Đà Nẵng' };
  }

  // 4. Các tỉnh gần kho/showroom (Đông Nam Bộ & Đồng bằng sông Hồng)
  const nearKeywords = ['binh duong', 'dong nai', 'vung tau', 'ba ria', 'hai phong', 'bac ninh', 'hung yen'];
  if (nearKeywords.some(k => normCity.includes(k) || normFull.includes(k))) {
    return { rule: ruleMap['rule-tier-near'], isInner: false, zone: 'Khu vực cận trung tâm / Showroom vệ tinh' };
  }

  // 5. Khu vực vùng xa, miền núi, hải đảo
  const remoteKeywords = ['lao cai', 'lang son', 'dien bien', 'lai chau', 'son la', 'ha giang', 'cao bang', 'bac kan', 'kon tum', 'dak nong', 'ca mau', 'phu quoc'];
  if (remoteKeywords.some(k => normCity.includes(k) || normFull.includes(k))) {
    return { rule: ruleMap['rule-tier-remote'], isInner: false, zone: 'Khu vực vùng xa / Hải đảo / Miền núi' };
  }

  // 6. Toàn quốc mặc định
  return { rule: ruleMap['rule-tier-nationwide'], isInner: false, zone: 'Tỉnh / Thành phố khác toàn quốc' };
}

async function test() {
  const testCases = [
    { city: 'Hà Nội', district: 'Cầu Giấy', address: '123 Xuân Thủy' },
    { city: 'Hà Nội', district: 'Đông Anh', address: 'Xã Kim Chung' },
    { city: 'TP. Hồ Chí Minh', district: 'Quận 1', address: '45 Lê Lợi' },
    { city: 'TP. Hồ Chí Minh', district: 'Hóc Môn', address: 'Xã Bà Điểm' },
    { city: 'Đà Nẵng', district: 'Hải Châu', address: '78 Bạch Đằng' },
    { city: 'Bình Dương', district: 'Thủ Dầu Một', address: 'Đại lộ Bình Dương' },
    { city: 'Lào Cai', district: 'Sa Pa', address: 'Thị xã Sa Pa' },
    { city: 'Nam Định', district: 'TP Nam Định', address: 'Đường Trần Hưng Đạo' }
  ];

  for (const tc of testCases) {
    const res = await matchAdministrativeShippingRule(tc);
    console.log(`Address: ${tc.district}, ${tc.city} -> Zone: ${res.zone} | Base Fee: ${res.rule.base_fee}đ | Free threshold: ${res.rule.free_ship_threshold}đ | ETA: ${res.rule.estimated_delivery}`);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
