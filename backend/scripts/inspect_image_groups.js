const fs = require('fs');
const path = require('path');
const uploadsDir = path.resolve(__dirname, '../public/uploads');
const files = fs.readdirSync(uploadsDir);

// Group files by product group (e.g. routine_nam_..._ao_khoac_10, etc.)
const groups = {};
for (const f of files) {
  // match regex: (routine_[a-z_]+_[0-9a-z]+_[0-9]+_[0-9]+_[a-z_]+_[0-9]+)_anh_chup
  // or split before _anh_chup
  const match = f.match(/^(routine_.*?)_anh_chup/);
  const groupKey = match ? match[1] : f.split('_').slice(0, 8).join('_');
  if (!groups[groupKey]) groups[groupKey] = [];
  groups[groupKey].push(f);
}

console.log('Total distinct product image sets:', Object.keys(groups).length);
console.log('\n--- Sample 40 product groups ---');
for (const [k, v] of Object.entries(groups).slice(0, 40)) {
  console.log(`${k} -> ${v.length} images`);
}

console.log('\n--- Accessories product groups ---');
for (const [k, v] of Object.entries(groups)) {
  if (k.includes('phu_kien')) {
    console.log(`${k} -> ${v.length} images`);
  }
}
