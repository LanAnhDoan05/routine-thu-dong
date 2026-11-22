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

const typeMap = {};
for (const key of Object.keys(groups)) {
  // extract category part: e.g. nam_ao_khoac, nu_dam, etc.
  const parts = key.split('_');
  // find index of nam or nu or phu_kien
  let catIndex = parts.indexOf('nam');
  if (catIndex === -1) catIndex = parts.indexOf('nu');
  if (catIndex === -1) catIndex = parts.indexOf('phu');
  const catKey = parts.slice(catIndex, catIndex + 3).join('_');
  typeMap[catKey] = (typeMap[catKey] || 0) + 1;
}

console.log('Categories and group counts:', typeMap);
