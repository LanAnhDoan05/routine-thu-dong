const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = 'C:\\Ảnh routine';
const BACKEND_UPLOADS = path.resolve(__dirname, '../public/uploads');

function scanDir(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      result.push(...scanDir(full));
    } else if (item.isFile() && /\.(png|jpg|jpeg|webp|avif)$/i.test(item.name)) {
      result.push({ full, name: item.name, rel: path.relative(SOURCE_ROOT, full) });
    }
  }
  return result;
}

const sourceFiles = scanDir(SOURCE_ROOT);
console.log(`Source files in C:\\Ảnh routine: ${sourceFiles.length}`);

const uploadFiles = new Set(fs.readdirSync(BACKEND_UPLOADS));
console.log(`Upload files in backend/public/uploads: ${uploadFiles.size}`);

// Group source files by category folder
const catMap = {};
for (const f of sourceFiles) {
  const parts = f.rel.split(path.sep);
  // parts: [ 'Nam-20261107T221434Z-1-001', 'Nam', 'QUẦN JEAN', 'quần jean 1', 'file.png' ]
  const group = parts.slice(1, -1).join(' > ');
  catMap[group] = (catMap[group] || 0) + 1;
}

console.log('\nSource Category Breakdown:');
for (const [k, v] of Object.entries(catMap)) {
  console.log(`  ${k}: ${v} files`);
}
