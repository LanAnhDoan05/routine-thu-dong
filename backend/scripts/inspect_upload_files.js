const fs = require('fs');
const path = require('path');
const uploadsDir = path.resolve(__dirname, '../public/uploads');
const files = fs.readdirSync(uploadsDir);
console.log('Total files in uploads:', files.length);

console.log('\n--- First 30 files ---');
console.log(files.slice(0, 30).join('\n'));

// Categorize files
const categories = {};
for (const f of files) {
  let cat = 'other';
  if (f.startsWith('routine_nam_')) cat = 'routine_nam';
  else if (f.startsWith('routine_nu_')) cat = 'routine_nu';
  else if (f.startsWith('routine_phu_kien_')) cat = 'routine_phu_kien';
  else if (f.startsWith('img_')) cat = 'img_';
  else if (f.startsWith('img-')) cat = 'img-';
  else if (f.startsWith('prod_')) cat = 'prod_';
  categories[cat] = (categories[cat] || 0) + 1;
}
console.log('\nCategory breakdown:', categories);

// Subcategories of routine files
const subcats = {};
for (const f of files) {
  if (f.startsWith('routine_')) {
    // pattern: routine_{gender}_{timestamp}_{idx}_{gender}_{subcat}_...
    // e.g. routine_nam_20261107t221434z_1_001_nam_quan_jean_...
    const parts = f.split('_');
    const key = parts.slice(0, 7).join('_');
    subcats[key] = (subcats[key] || 0) + 1;
  }
}
console.log('\nRoutine subcategories count:', Object.keys(subcats).length);
console.log('Sample Routine subcategories:', Object.keys(subcats).slice(0, 20));
