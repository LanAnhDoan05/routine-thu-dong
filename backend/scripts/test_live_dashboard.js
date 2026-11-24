require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');

async function testAdminDashboard() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign(
    { userId: admin.id, role: admin.role, email: admin.email },
    process.env.JWT_SECRET || 'routine_fallback_secret_key_2026',
    { expiresIn: '7d' }
  );

  const res = await fetch('https://routine-thu-dong-henna.vercel.app/api/v1/analytics/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Status:', res.status);
  const json = await res.json();
  console.log('KPI:', json.data?.kpi);
  console.log('Social Ecosystem Summary:', json.data?.socialEcosystem?.summary);
  console.log('Social Ecosystem Breakdown:', JSON.stringify(json.data?.socialEcosystem?.breakdown, null, 2));
}

testAdminDashboard().catch(console.error).finally(() => process.exit(0));
