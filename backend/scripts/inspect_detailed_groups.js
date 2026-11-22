const fs = require('fs');
const path = require('path');
const uploadsDir = path.resolve(__dirname, '../public/uploads');
const files = fs.readdirSync(uploadsDir);

const groups = {};
for (const f of files) {
  const match = f.match(/^(routine_.*?)_anh_chup/);
  const groupKey = match ? match[1] : f.split('_').slice(0, 8).join('_');
  if (!groups[groupKey]) groups[groupKey] = [];
  groups[groupKey].push(f);
}

const detailedMap = {};
for (const key of Object.keys(groups)) {
  // e.g. routine_nam_20261107t221434z_1_001_nam_ao_khoac_10
  // Remove prefix 'routine_nam_20261107t221434z_1_001_' or similar
  const cleaned = key.replace(/^routine_(nam|nu|phu_kien)_[0-9a-z_]+_001_/, '');
  detailedMap[cleaned] = groups[key].length;
}

console.log('Detailed groups (count:', Object.keys(detailedMap).length, '):');
const sorted = Object.keys(detailedMap).sort();
for (const k of sorted) {
  console.log(`${k} (${detailedMap[k]} images)`);
}
