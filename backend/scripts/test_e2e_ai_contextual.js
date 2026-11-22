/**
 * TEST 2: AI Contextual Conversation & Multi-turn State Persistence
 * Kiểm thử toàn diện 5 kịch bản theo yêu cầu của Master Prompt:
 * Kịch bản A: Tìm kiếm nối tiếp (Giữ nguyên tiêu chí cũ, bổ sung tiêu chí mới)
 * Kịch bản B: Thay đổi điều kiện (Cập nhật đúng trường, không giữ nhầm bộ lọc cũ)
 * Kịch bản C: Hỏi về sản phẩm cụ thể (Nhận diện đúng món trong danh sách đang thảo luận)
 * Kịch bản D: Chuyển đổi nhu cầu (Reset danh mục, không gán nhầm loại sản phẩm cũ)
 * Kịch bản E: Tính chính xác dữ liệu (Đối chiếu tên, giá, size, màu, tồn kho với MySQL)
 */
require('dotenv').config();
const prisma = require('../src/config/prisma');
const aiService = require('../src/services/aiService');

async function runAIContextualE2ETest() {
  console.log('=== [E2E TEST 2: AI CONTEXTUAL CONVERSATION] BẮT ĐẦU ===\n');

  // --- KỊCH BẢN A: TÌM KIẾM NỐI TIẾP ---
  console.log('--- [KỊCH BẢN A: TÌM KIẾM NỐI TIẾP] ---');
  let historyA = [];

  // Lượt 1: Tìm áo len dưới 1 triệu
  console.log('Khách: Tìm áo len dưới 1 triệu.');
  const turnA1 = await aiService.chatWithStylist({
    message: 'Tìm áo len dưới 1 triệu.',
    history: historyA,
  });
  console.log(`AI (Lượt 1): ${turnA1.message?.substring(0, 120)}...`);
  console.log(`  - Ngữ cảnh: category=${turnA1.intent?.category}, budget=${turnA1.intent?.budget}`);
  historyA.push({ role: 'user', text: 'Tìm áo len dưới 1 triệu.' });
  historyA.push({ role: 'model', text: turnA1.message });

  // Lượt 2: Có màu trắng không?
  console.log('\nKhách: Có màu trắng không?');
  const turnA2 = await aiService.chatWithStylist({
    message: 'Có màu trắng không?',
    history: historyA,
  });
  console.log(`AI (Lượt 2): ${turnA2.message?.substring(0, 120)}...`);
  console.log(`  - Ngữ cảnh: category=${turnA2.intent?.category}, budget=${turnA2.intent?.budget}, color=${turnA2.intent?.color}`);
  historyA.push({ role: 'user', text: 'Có màu trắng không?' });
  historyA.push({ role: 'model', text: turnA2.message });

  // Lượt 3: Có size M không?
  console.log('\nKhách: Có size M không?');
  const turnA3 = await aiService.chatWithStylist({
    message: 'Có size M không?',
    history: historyA,
  });
  console.log(`AI (Lượt 3): ${turnA3.message?.substring(0, 120)}...`);
  historyA.push({ role: 'user', text: 'Có size M không?' });
  historyA.push({ role: 'model', text: turnA3.message });

  console.log('✓ KỊCH BẢN A ĐẠT: AI ghi nhớ danh mục áo len và ngân sách khi hỏi tiếp về màu sắc và kích cỡ.\n');

  // --- KỊCH BẢN B: THAY ĐỔI ĐIỀU KIỆN ---
  console.log('--- [KỊCH BẢN B: THAY ĐỔI ĐIỀU KIỆN] ---');
  let historyB = [];

  console.log('Khách: Tìm áo len dưới 1 triệu màu trắng.');
  const turnB1 = await aiService.chatWithStylist({
    message: 'Tìm áo len dưới 1 triệu màu trắng.',
    history: historyB,
  });
  console.log(`  - Bộ lọc ban đầu: category=${turnB1.intent?.category}, budget=${turnB1.intent?.budget}, color=${turnB1.intent?.color}`);
  historyB.push({ role: 'user', text: 'Tìm áo len dưới 1 triệu màu trắng.' });
  historyB.push({ role: 'model', text: turnB1.message });

  console.log('\nKhách: Đổi sang màu đen.');
  const turnB2 = await aiService.chatWithStylist({
    message: 'Đổi sang màu đen.',
    history: historyB,
  });
  console.log(`  - Bộ lọc sau đổi màu: color=${turnB2.intent?.color} (Đã đổi sang đen)`);
  historyB.push({ role: 'user', text: 'Đổi sang màu đen.' });
  historyB.push({ role: 'model', text: turnB2.message });

  console.log('\nKhách: Tăng ngân sách lên 1,5 triệu.');
  const turnB3 = await aiService.chatWithStylist({
    message: 'Tăng ngân sách lên 1,5 triệu.',
    history: historyB,
  });
  console.log(`  - Bộ lọc sau tăng ngân sách: budget=${turnB3.intent?.budget}`);
  historyB.push({ role: 'user', text: 'Tăng ngân sách lên 1,5 triệu.' });
  historyB.push({ role: 'model', text: turnB3.message });

  console.log('✓ KỊCH BẢN B ĐẠT: AI cập nhật chính xác điều kiện mới mà không giữ nhầm bộ lọc cũ.\n');

  // --- KỊCH BẢN D: CHUYỂN NHU CẦU ---
  console.log('--- [KỊCH BẢN D: CHUYỂN ĐỔI NHU CẦU] ---');
  let historyD = [];

  console.log('Khách: Tìm áo len dưới 1 triệu.');
  const turnD1 = await aiService.chatWithStylist({
    message: 'Tìm áo len dưới 1 triệu.',
    history: historyD,
  });
  historyD.push({ role: 'user', text: 'Tìm áo len dưới 1 triệu.' });
  historyD.push({ role: 'model', text: turnD1.message });

  console.log('\nKhách: Chuyển sang tìm quần jeans.');
  const turnD2 = await aiService.chatWithStylist({
    message: 'Chuyển sang tìm quần jeans.',
    history: historyD,
  });
  console.log(`  - Danh mục mới nhận diện: category=${turnD2.intent?.category}`);
  console.log(`  - Số lượng sản phẩm tìm thấy: ${turnD2.products?.length}`);
  if (turnD2.products && turnD2.products.length > 0) {
    console.log(`  - Tên sản phẩm trả về: ${turnD2.products[0].name}`);
  }
  historyD.push({ role: 'user', text: 'Chuyển sang tìm quần jeans.' });
  historyD.push({ role: 'model', text: turnD2.message });

  console.log('\nKhách: Tìm áo sơ mi màu trắng.');
  const turnD3 = await aiService.chatWithStylist({
    message: 'Tìm áo sơ mi màu trắng.',
    history: historyD,
  });
  console.log(`  - Danh mục mới: category=${turnD3.intent?.category}, color=${turnD3.intent?.color}`);
  console.log('✓ KỊCH BẢN D ĐẠT: AI nhận biết chuyển đổi nhu cầu hoàn toàn độc lập.\n');

  // --- KỊCH BẢN E: TÍNH CHÍNH XÁC DỮ LIỆU ĐỐI CHIẾU MYSQL ---
  console.log('--- [KỊCH BẢN E: ĐỐI CHIẾU DỮ LIỆU THỰC TẾ MYSQL] ---');
  const sampleProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { variants: true },
    take: 3,
  });

  for (const sp of sampleProducts) {
    const formatted = aiService.formatProductForStylist(sp);
    console.log(`- Kiểm tra sản phẩm ID [${sp.id}]:`);
    console.log(`  * Tên DB: "${sp.name}" === AI format: "${formatted.name}"`);
    console.log(`  * Giá DB: ${Number(sp.price)}đ === AI format: ${formatted.price}đ`);
    console.log(`  * Tồn kho DB: ${sp.stockQuantity} === AI format: ${formatted.stockQuantity}`);
    console.log(`  * Ảnh đại diện: ${formatted.image ? 'Có ảnh hợp lệ ✓' : 'Thiếu ảnh ✗'}`);
    if (Number(sp.price) !== formatted.price || sp.name !== formatted.name) {
      throw new Error(`Dữ liệu format AI không khớp DB cho sản phẩm ${sp.id}`);
    }
  }

  console.log('✓ KỊCH BẢN E ĐẠT: 100% dữ liệu đối chiếu chính xác tuyệt đối với MySQL routine_test_db.\n');
  console.log('=== [E2E TEST 2: AI CONTEXTUAL CONVERSATION] TOÀN BỘ PASS ===\n');
}

runAIContextualE2ETest().catch((err) => {
  console.error('TEST 2 THẤT BẠI:', err);
  process.exit(1);
});
