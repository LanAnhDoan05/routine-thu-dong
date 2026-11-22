const prisma = require('../src/config/prisma');
const http = require('http');

function checkUrl(urlStr) {
  return new Promise((resolve) => {
    let fullUrl = urlStr;
    if (urlStr.startsWith('/')) {
      fullUrl = `http://localhost:5001${urlStr}`;
    }
    
    try {
      const u = new URL(fullUrl);
      const mod = u.protocol === 'https:' ? require('https') : require('http');
      const req = mod.request(u, { method: 'HEAD', timeout: 5000 }, (res) => {
        const contentType = res.headers['content-type'] || '';
        const contentLength = parseInt(res.headers['content-length'] || '0', 10);
        const isPlaceholderSvg = contentType.includes('svg') || contentLength === 522;
        resolve({
          status: res.statusCode,
          contentType,
          contentLength,
          isRealImage: res.statusCode === 200 && !isPlaceholderSvg && contentLength > 1000
        });
      });
      req.on('error', (err) => {
        resolve({ status: 0, error: err.message, isRealImage: false });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, error: 'TIMEOUT', isRealImage: false });
      });
      req.end();
    } catch (e) {
      resolve({ status: 0, error: e.message, isRealImage: false });
    }
  });
}

async function run() {
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log(`Checking live HTTP serving for ${products.length} products...`);
  const report = [];
  
  for (const p of products) {
    let imgs = p.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
    }
    if (!Array.isArray(imgs)) imgs = [];
    
    const results = [];
    for (const img of imgs) {
      const res = await checkUrl(img);
      results.push({ url: img, ...res });
    }
    
    const realCount = results.filter(r => r.isRealImage).length;
    report.push({
      id: p.id,
      name: p.name,
      status: p.status,
      categorySlug: p.categorySlug,
      total: imgs.length,
      realCount,
      results
    });
  }
  
  console.log('\n=== LIVE IMAGE SERVING REPORT ===');
  let goodProducts = 0;
  let brokenProducts = 0;
  
  for (const r of report) {
    if (r.realCount > 0) {
      goodProducts++;
      console.log(`[PASS] ${r.id} | ${r.name} | real: ${r.realCount}/${r.total} | status=${r.status}`);
    } else {
      brokenProducts++;
      console.log(`[FAIL] ${r.id} | ${r.name} | real: 0/${r.total} | status=${r.status}`);
      r.results.forEach(res => {
        console.log(`   URL: ${res.url} -> HTTP ${res.status} | ${res.contentType} | len=${res.contentLength}`);
      });
    }
  }
  
  console.log(`\nSummary: ${goodProducts} products PASS, ${brokenProducts} products FAIL`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
