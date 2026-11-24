const data = require('./product_images_audit.json');
data.forEach((p, i) => {
  const imgStr = p.firstImage ? p.firstImage.slice(0, 60) : 'NO_IMG';
  console.log(`${i + 1}. [${p.id}] ${p.name} | Cat: ${p.categorySlug} | SKU: ${p.skus[0] || 'N/A'} | Img: ${imgStr}`);
});
