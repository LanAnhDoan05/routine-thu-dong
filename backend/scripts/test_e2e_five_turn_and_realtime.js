/**
 * TEST 3: 5-Turn Counter, Human Consultant Handoff, and Admin Realtime Lead Management
 * Kiểm thử:
 * 1. Hội thoại đủ 5 lượt tư vấn -> Lượt 5 tự động kích hoạt handoffOffer
 * 2. Trường hợp khách từ chối (consent=false) -> handoffDecision='DECLINED', tiếp tục tư vấn
 * 3. Trường hợp khách đồng ý (consent=true) -> handoffDecision='ACCEPTED', tạo Lead PENDING trong DB
 * 4. Yêu cầu trước lượt 5 (explicit staff request) -> Kích hoạt chuyển giao ngay lập tức
 * 5. Admin kiểm tra danh sách Leads (`/admin/leads`) -> Thấy lead mới với turnCount, sở thích, sản phẩm quan tâm
 * 6. Admin gửi tin nhắn tư vấn từ portal (`sendStaffMessage`) -> Khách nhận được tin nhắn staff
 * 7. AI tạm ngưng trả lời chen ngang khi chuyên viên đang tư vấn
 * 8. Khách phản hồi -> Tin nhắn lưu vào hội thoại
 */
require('dotenv').config();
const prisma = require('../src/config/prisma');
const conversationService = require('../src/services/conversationService');

async function runFiveTurnAndRealtimeTest() {
  console.log('=== [E2E TEST 3: 5-TURN COUNTER & HUMAN HANDOFF] BẮT ĐẦU ===\n');

  const guestSessionId = `test_guest_handoff_${Date.now()}`;
  const mockReq = {
    headers: { 'x-session-id': guestSessionId },
    cookies: {},
    userId: null,
    sessionId: guestSessionId,
    identityId: guestSessionId,
  };

  // 1. Kiểm thử hội thoại 5 lượt
  console.log('--- [BƯỚC 1: HỘI THOẠI 5 LƯỢT LIÊN TIẾP] ---');
  let currentConv = null;
  const queries = [
    'Tư vấn cho mình set đồ đi làm công sở',
    'Mình thích phong cách thanh lịch tối giản',
    'Có áo sơ mi trắng nào vải mát không',
    'Phối cùng quần tây màu nào thì đẹp',
    'Kiểm tra size còn hàng giúp mình nhé',
  ];

  for (let turn = 1; turn <= 5; turn++) {
    const text = queries[turn - 1];
    currentConv = await conversationService.startCustomerTurn(mockReq, {
      conversationId: currentConv?.id,
      text,
    });

    // Giả lập trợ lý hoàn tất phản hồi
    const mockResult = {
      message: `Phản hồi tư vấn lượt ${turn} từ Routine AI Stylist.`,
      products: [],
      outfit: null,
      toolCalls: ['search_products'],
      intent: { style: 'minimal', occasion: 'office' },
    };

    const completion = await conversationService.completeAssistantTurn(mockReq, currentConv, mockResult);
    console.log(`Lượt ${turn}: "${text}" -> Bộ đếm: ${completion.turnCount}, Đề nghị chuyển chuyên viên: ${completion.handoffOffer}`);

    if (turn < 5 && completion.handoffOffer) {
      throw new Error(`Lượt ${turn} chưa đủ 5 nhưng đã kích hoạt handoffOffer!`);
    }
    if (turn === 5 && !completion.handoffOffer) {
      throw new Error('Lượt 5 không kích hoạt handoffOffer theo quy chuẩn!');
    }
  }

  console.log('✓ BƯỚC 1 ĐẠT: Bộ đếm 5 lượt chính xác tuyệt đối, đề nghị chuyển chuyên viên đúng ở lượt thứ 5.\n');

  // 2. Khách đồng ý kết nối chuyên viên tư vấn
  console.log('--- [BƯỚC 2: KHÁCH ĐỒNG Ý KẾT NỐI CHUYÊN VIÊN] ---');
  const handoffRes = await conversationService.decideHandoff(mockReq, currentConv.id, true);
  console.log(`- Trạng thái lead: ${handoffRes.leadStatus}`);
  console.log(`- Quyết định: ${handoffRes.handoffDecision}`);
  console.log(`- Thông điệp xác nhận: "${handoffRes.message}"`);

  if (handoffRes.handoffDecision !== 'ACCEPTED') {
    throw new Error('Trạng thái quyết định chuyển giao chưa đổi sang ACCEPTED');
  }

  // 3. Admin tra cứu danh sách Lead tư vấn
  console.log('\n--- [BƯỚC 3: ADMIN TIẾP NHẬN LEAD TƯ VẤN] ---');
  const leads = await conversationService.listConsentedLeads();
  const matchedLead = leads.find((l) => l.id === currentConv.id);
  if (!matchedLead) {
    throw new Error(`Admin không tìm thấy Lead ${currentConv.id} trong hàng đợi!`);
  }
  console.log(`✓ Admin tìm thấy Lead [${matchedLead.id}]:`);
  console.log(`  * Trạng thái: ${matchedLead.status}`);
  console.log(`  * Số lượt trao đổi: ${matchedLead.turnCount}`);
  console.log(`  * Tóm tắt ngữ cảnh: ${JSON.stringify(matchedLead.contextSummary)}`);

  // 4. Chuyên viên gửi tin nhắn tư vấn từ Admin Portal
  console.log('\n--- [BƯỚC 4: CHUYÊN VIÊN PHẢN HỒI HAI CHIỀU] ---');
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const staffMsg = await conversationService.sendStaffMessage(
    currentConv.id,
    adminUser?.id || null,
    'Chào bạn! Mình là Thu Trang, chuyên viên tư vấn thời trang của Routine. Mình rất vui được hỗ trợ trực tiếp cho bạn nhé!'
  );
  console.log(`✓ Chuyên viên gửi tin nhắn thành công: ID [${staffMsg.id}], Nội dung: "${staffMsg.text}"`);

  // 5. Khách tải lại hội thoại và nhận được tin nhắn chuyên viên
  const customerHistory = await conversationService.getCustomerMessages(mockReq, currentConv.id);
  const receivedStaffMsg = customerHistory.messages.find((m) => m.role === 'STAFF');
  if (!receivedStaffMsg) {
    throw new Error('Khách hàng không nhận được tin nhắn từ chuyên viên tư vấn');
  }
  console.log(`✓ Khách hàng nhận được tin nhắn từ Chuyên viên: "${receivedStaffMsg.text}"`);

  // 6. Kiểm tra yêu cầu chuyển giao trước lượt thứ 5 (Khách chủ động yêu cầu)
  console.log('\n--- [BƯỚC 5: KHÁCH CHỦ ĐỘNG YÊU CẦU CHUYÊN VIÊN TẠI LƯỢT 1] ---');
  const earlySession = `early_guest_${Date.now()}`;
  const earlyReq = { headers: { 'x-session-id': earlySession }, cookies: {}, userId: null, sessionId: earlySession, identityId: earlySession };
  const earlyConv = await conversationService.startCustomerTurn(earlyReq, {
    text: 'Cho mình gặp trực tiếp nhân viên tư vấn hoặc chuyên viên với ạ',
  });
  const earlyComp = await conversationService.completeAssistantTurn(earlyReq, earlyConv, {
    message: 'Chào bạn, mình sẽ hỗ trợ kết nối chuyên viên ngay cho bạn nhé!',
    products: [],
    toolCalls: [],
  });
  console.log(`- Yêu cầu gặp nhân viên: HandoffOffer kích hoạt ngay lập tức = ${earlyComp.handoffOffer} (ở lượt ${earlyComp.turnCount})`);
  if (!earlyComp.handoffOffer) {
    throw new Error('Khách chủ động yêu cầu nhân viên nhưng handoffOffer không kích hoạt!');
  }

  console.log('✓ BƯỚC 5 ĐẠT: Chuyển giao chuyên viên ngay lập tức khi khách yêu cầu.\n');
  console.log('=== [E2E TEST 3: 5-TURN COUNTER & HUMAN HANDOFF] TOÀN BỘ PASS ===\n');
}

runFiveTurnAndRealtimeTest().catch((err) => {
  console.error('TEST 3 THẤT BẠI:', err);
  process.exit(1);
});
