require('dotenv').config();
const biService = require('../src/services/businessIntelligenceService');

async function testBiAsk() {
  const answer = await biService.askAdminBiAssistant({
    question: 'Tổng doanh thu thực tế và số lượng đơn hàng của chiến dịch 2 tháng Thu Đông hiện tại là bao nhiêu?'
  });
  console.log('BI Answer:', answer);
}

testBiAsk().catch(console.error).finally(() => process.exit(0));
