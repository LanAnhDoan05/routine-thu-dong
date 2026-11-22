const prisma = require('../src/config/prisma');

async function run() {
  const schema = await prisma.$queryRawUnsafe('DESCRIBE media_files');
  console.log('media_files columns:', schema.map(c => `${c.Field} (${c.Type})`));

  const media = await prisma.$queryRawUnsafe(
    'SELECT id, filename, mimetype, size, LENGTH(data) as data_len FROM media_files LIMIT 10'
  );
  console.log(`\nSample media rows:`);
  for (const m of media) {
    console.log(`[${m.id}] ${m.filename} | ${m.mimetype} | size=${m.size} | data_len=${m.data_len}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
