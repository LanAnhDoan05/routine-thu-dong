const prisma = require('../src/config/prisma');

async function run() {
  const media = await prisma.$queryRawUnsafe(
    'SELECT id, filename, size, HEX(SUBSTRING(data, 1, 30)) as hex_head FROM media_files LIMIT 20'
  );
  console.log('Sample media hex headers:');
  for (const m of media) {
    const isCorrupted = (m.hex_head || '').toLowerCase().includes('efbfbd');
    console.log(`[${m.id}] isCorrupted=${isCorrupted} | hex=${m.hex_head}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
