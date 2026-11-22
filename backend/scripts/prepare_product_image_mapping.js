const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

const uploadsDir = path.resolve(__dirname, '../public/uploads');
const allUploadFiles = fs.readdirSync(uploadsDir);

// Group files by prefix (up to the timestamp part)
const groups = {};
for (const f of allUploadFiles) {
  // pattern: routine_{gender}_{ts}_{idx}_{gender}_{category}_{product_idx}_anh_chup_man_hinh...
  const match = f.match(/^(routine_[a-z0-9_]+?_[a-z0-9_]+?_[a-z0-9_]+?_[a-z0-9_]+?_[a-z0-9_]+?_[a-z0-9_]+?)_anh_chup/i);
  let groupKey = match ? match[1] : f.split('_').slice(0, 8).join('_');
  if (!groups[groupKey]) groups[groupKey] = [];
  groups[groupKey].push(f);
}

// Sort files in each group
for (const k of Object.keys(groups)) {
  groups[k].sort();
}

console.log(`Loaded ${Object.keys(groups).length} image groups from ${allUploadFiles.length} files`);

// Filter groups by category keyword
function findGroupsByKeyword(kw) {
  return Object.keys(groups).filter(k => k.toLowerCase().includes(kw.toLowerCase()));
}

console.log('\n--- Category Groups ---');
console.log('ao_len:', findGroupsByKeyword('ao_len'));
console.log('ao_ni:', findGroupsByKeyword('ao_ni'));
console.log('ao_vest:', findGroupsByKeyword('ao_vest'));
console.log('ao_khoac:', findGroupsByKeyword('ao_khoac'));
console.log('quan_tay:', findGroupsByKeyword('quan_tay'));
console.log('quan_kaki:', findGroupsByKeyword('quan_kaki'));
console.log('quan_jean:', findGroupsByKeyword('quan_jean'));
console.log('dam:', findGroupsByKeyword('dam'));
console.log('giay_dep:', findGroupsByKeyword('giay_dep'));
console.log('non_bang_do:', findGroupsByKeyword('non_bang_do'));
console.log('tui_vi_balo:', findGroupsByKeyword('tui_vi_balo'));
console.log('vo_tat:', findGroupsByKeyword('vo_tat'));
