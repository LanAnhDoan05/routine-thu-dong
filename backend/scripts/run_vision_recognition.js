require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

async function getImageBuffer(imgUrl) {
  if (!imgUrl) return null;

  if (imgUrl.startsWith('http')) {
    try {
      const res = await fetch(imgUrl);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const ext = path.extname(imgUrl.split('?')[0]).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { buffer: Buffer.from(arrayBuffer), mime };
    } catch {
      return null;
    }
  }

  // Local file
  const clean = imgUrl.replace(/^\//, '');
  const candidates = [
    path.resolve(__dirname, '../../frontend/public', clean),
    path.resolve(__dirname, '../../backend/public', clean),
    path.resolve(__dirname, '../../frontend/public/media', path.basename(clean)),
    path.resolve(__dirname, '../../frontend/public/uploads', path.basename(clean)),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const ext = path.extname(c).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      return { buffer: fs.readFileSync(c), mime };
    }
  }

  return null;
}

async function main() {
  const products = require('./product_images_audit.json');
  console.log(`Bắt đầu phân tích hình ảnh AI cho ${products.length} sản phẩm bằng ${MODEL_NAME}...`);

  const results = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`[${i + 1}/${products.length}] Đang xử lý: ${p.id} - "${p.name}"`);

    const imgData = await getImageBuffer(p.firstImage);
    if (!imgData) {
      console.log(`  -> Không tìm thấy file ảnh cho ${p.firstImage}`);
      results.push({
        id: p.id,
        currentName: p.name,
        categorySlug: p.categorySlug,
        skus: p.skus,
        firstImage: p.firstImage,
        visualGarmentType: 'UNKNOWN',
        visualColor: 'UNKNOWN',
        matchConfidence: 0.0,
        nameMatchesImage: false,
        suggestedName: p.name,
        notes: 'Không thể đọc file ảnh vật lý',
      });
      continue;
    }

    try {
      const prompt = `Bạn là chuyên gia phân loại sản phẩm thời trang thương mại điện tử Routine Thu Đông.
Dưới đây là hình ảnh thực tế của một sản phẩm:
- Tên hiện tại trong Database: "${p.name}"
- Danh mục hiện tại: "${p.categorySlug}"
- SKU biến thể: "${p.skus.join(', ') || 'N/A'}"
- Màu sắc biến thể: "${p.colors.join(', ') || 'N/A'}"

Hãy nhận diện hình ảnh và trả về DUY NHẤT một khối JSON (không thêm text nào ngoài JSON):
{
  "visualGarmentType": "Loại trang phục nhận diện thực tế (Áo khoác, Áo len, Áo sơ mi, Áo polo, Áo thun, Áo blazer/vest, Áo hoodie/sweatshirt, Quần jeans, Quần tây/âu, Quần kaki, Quần short, Váy, Đầm, Nón/Mũ, Túi xách, Giày, Thắt lưng)",
  "visualColor": "Màu sắc chính trong ảnh",
  "visualStyle": "Kiểu dáng ngắn gọn (form regular, loose, slim, có mũ, cổ bẻ, v.v.)",
  "matchConfidence": <số thập phân từ 0.0 đến 1.0>,
  "nameMatchesImage": <true nếu tên hiện tại khớp với ảnh, false nếu sai loại trang phục hoặc sai hoàn toàn>,
  "suggestedName": "Tên tiếng Việt chuẩn xác, trang trọng của Routine Thu Đông (nếu đã đúng thì giữ nguyên)",
  "notes": "Nhận xét ngắn gọn vì sao đúng hoặc sai"
}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: imgData.mime, data: imgData.buffer.toString('base64') } }
            ]
          }
        ]
      });

      const rawText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawText);

      console.log(`  -> Nhận diện: ${parsed.visualGarmentType} | Match: ${parsed.nameMatchesImage ? 'KHỚP' : 'SAI LỆCH'} (${parsed.matchConfidence})`);
      if (!parsed.nameMatchesImage) {
        console.log(`     Đề xuất: "${parsed.suggestedName}" (Lý do: ${parsed.notes})`);
      }

      results.push({
        id: p.id,
        currentName: p.name,
        categorySlug: p.categorySlug,
        skus: p.skus,
        firstImage: p.firstImage,
        visualGarmentType: parsed.visualGarmentType,
        visualColor: parsed.visualColor,
        visualStyle: parsed.visualStyle,
        matchConfidence: parsed.matchConfidence,
        nameMatchesImage: parsed.nameMatchesImage,
        suggestedName: parsed.suggestedName || p.name,
        notes: parsed.notes,
      });

    } catch (err) {
      console.error(`  -> Lỗi gọi Gemini: ${err.message}`);
      results.push({
        id: p.id,
        currentName: p.name,
        categorySlug: p.categorySlug,
        skus: p.skus,
        firstImage: p.firstImage,
        visualGarmentType: 'ERROR',
        matchConfidence: 0.5,
        nameMatchesImage: true,
        suggestedName: p.name,
        notes: `Lỗi API: ${err.message}`,
      });
    }

    // Delay nhỏ 300ms giữa các request
    await new Promise(r => setTimeout(r, 300));
  }

  const outPath = path.join(__dirname, 'vision_recognition_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nHoàn tất phân tích AI cho ${results.length} sản phẩm. Đã lưu tại: ${outPath}`);

  const mismatches = results.filter(r => !r.nameMatchesImage);
  console.log(`Tổng số sản phẩm phát hiện SAI LỆCH tên/loại trang phục: ${mismatches.length}`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
