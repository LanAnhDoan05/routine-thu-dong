const fs = require('fs');
const path = require('path');

const catJpg = path.resolve(__dirname, '../../frontend/public/images/categories/tshirt.jpg');
const catBuf = fs.readFileSync(catJpg);
console.log('categories/tshirt.jpg size:', catBuf.length, 'preview:', catBuf.slice(0, 30).toString());

const prodJpg = path.resolve(__dirname, '../../frontend/public/images/products/product-01.jpg');
const prodBuf = fs.readFileSync(prodJpg);
console.log('products/product-01.jpg size:', prodBuf.length, 'preview:', prodBuf.slice(0, 30).toString());

const upload1 = path.resolve(__dirname, '../public/uploads/routine_nam_20261107t221434z_1_001_nam_ao_khoac_10_anh_chup_man_hinh_2026_09_16_103119.png');
const upBuf = fs.readFileSync(upload1);
console.log('uploads/routine_nam...png size:', upBuf.length, 'preview hex:', upBuf.slice(0, 8).toString('hex'));
