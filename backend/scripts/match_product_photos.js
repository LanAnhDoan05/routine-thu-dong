const fs = require('fs');
const path = require('path');
const uploadsDir = path.resolve(__dirname, '../public/uploads');
const files = fs.readdirSync(uploadsDir);

// Find all files matching specific patterns
function findFiles(pattern) {
  return files.filter(f => f.includes(pattern));
}

console.log('--- Checking available photo sets for each target product ---');

const targets = {
  p001_tshirt: findFiles('nam_ao_len_ao_len_3'),
  p002_oversized_tee: findFiles('nam_ao_len_ao_len_5'),
  p003_white_shirt: findFiles('nam_ao_vest_ao_vest_4'),
  p004_linen_shirt: findFiles('nam_ao_len_ao_len_8'),
  p006_tapered_trousers: findFiles('nam_quan_tay_quan_tay_1'),
  p009_structured_blazer: findFiles('nu_ao_vest_ao_vest_1'),
  p015_basic_hoodie: findFiles('nam_ao_ni_ao_ni_1'),
  p017_cargo_pants: findFiles('nam_quan_kaki_quan_kaki_2'),
  p019_canvas_sneakers: findFiles('phu_kien_giay_dep_dep_1'),
  p020_chunky_sneakers: findFiles('phu_kien_giay_dep_dep_4'),
  p022_leather_belt: findFiles('phu_kien_tui_vi_balo_tui_1'),
  p023_bucket_hat: findFiles('phu_kien_non_bang_do_mu_1'),
  p024_wool_coat: findFiles('nam_ao_khoac_12'),
  p025_relaxed_polo: findFiles('nam_ao_len_ao_len_1'),
  p026_high_waist_jeans: findFiles('nu_quan_jean_quan_jean_1'),
  p027_silk_blouse: findFiles('nu_dam_dam_1'),
  p028_track_jacket: findFiles('nam_ao_khoac_15'),
};

for (const [k, v] of Object.entries(targets)) {
  console.log(`${k}: ${v.length} images found`);
  if (v.length > 0) {
    console.log(`   Sample: ${v[0]}`);
  }
}
