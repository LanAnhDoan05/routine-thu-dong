const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

const uploadsDir = path.resolve(__dirname, '../public/uploads');
const allFiles = fs.readdirSync(uploadsDir);

// Helper to get all files for a prefix
function getFilesForPrefix(prefix) {
  const matches = allFiles.filter(f => f.startsWith(prefix) && /\.(png|jpg|jpeg|webp)$/i.test(f));
  matches.sort();
  return matches.map(f => `/uploads/${f}`);
}

// Complete mapping of products to authentic Routine photo sets
const PRODUCT_PHOTO_MAP = {
  p001: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_3'),
  p002: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_5'),
  p003: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_vest_ao_vest_4'),
  p004: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_8'),
  p005: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_quan_jean_quan_jean_3'),
  p006: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_quan_tay_quan_tay_1'),
  p009: getFilesForPrefix('routine_nu_20261107t221437z_1_001_nu_ao_vest_ao_vest_1'),
  p015: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_ni_ao_ni_1'),
  p017: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_quan_kaki_quan_kaki_2'),
  p019: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_giay_dep_dep_1'),
  p020: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_giay_dep_dep_4'),
  p022: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_tui_vi_balo_tui_1'),
  p023: getFilesForPrefix('routine_phu_kien_20261107t221439z_1_001_phu_kien_non_bang_do_mu_1_'),
  p024: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_khoac_12'),
  p025: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_1'),
  p026: getFilesForPrefix('routine_nu_20261107t221437z_1_001_nu_quan_jean_quan_jean_1_'),
  p027: getFilesForPrefix('routine_nu_20261107t221437z_1_001_nu_dam_dam_1'),
  p028: getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_khoac_15'),
  'p-e6244704-0d29-42b6-9811-a0e1e3062278': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_ni_ao_ni_2'),
  'p-4e04fa24-20b5-402d-9c30-72313ccaf180': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_len_ao_len_6'),
  'p-62700679-c969-4e7e-b980-92882116625f': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_vest_ao_vest_2'),
  'p-8805812c-40bb-46cf-929d-d16793795da3': getFilesForPrefix('routine_nam_20261107t221434z_1_001_nam_ao_vest_ao_vest_3'),
};

console.log('--- Checking mapped photo counts ---');
for (const [id, imgs] of Object.entries(PRODUCT_PHOTO_MAP)) {
  console.log(`[${id}] -> ${imgs.length} real images`);
  if (imgs.length === 0) {
    console.error(`ERROR: No images found for ${id}!`);
  }
}
