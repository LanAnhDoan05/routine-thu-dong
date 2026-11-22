const fs = require('fs');
const path = require('path');
const uploadsDir = path.resolve(__dirname, '../public/uploads');
const files = fs.readdirSync(uploadsDir);
const pkFiles = files.filter(f => f.startsWith('routine_phu_kien'));

const subcats = {};
for (const f of pkFiles) {
  // routine_phu_kien_20261107t221439z_1_001_phu_kien_giay_dep_dep_1_...
  const parts = f.split('_');
  const subcat = parts.slice(6, 11).join('_');
  subcats[subcat] = (subcats[subcat] || 0) + 1;
}
console.log('Phu kien subcategories:', subcats);
