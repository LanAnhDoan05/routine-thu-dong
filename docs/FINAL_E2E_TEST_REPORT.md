# BÁO CÁO KIỂM THỬ ĐẦU CUỐI 10 LUỒNG E2E CỐT LÕI (FINAL E2E TEST REPORT)

> **Dự án:** Routine Web E-commerce  
> **Phạm vi kiểm thử:** Toàn bộ chu trình nghiệp vụ liên thông Admin - Customer - Database - AI  
> **Môi trường thực thi:** Local Machine (Node.js v24, Chrome Browser Automation, MySQL `routine_test_db`)  
> **Kết quả tổng quát:** **10/10 LUỒNG E2E ĐẠT CHUẨN 100% (PASS)**

---

## I. MA TRẬN 10 LUỒNG KIỂM THỬ ĐẦU CUỐI (E2E)

| STT | Luồng nghiệp vụ | Các bước thực thi | Kỳ vọng kết quả | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | **Admin tạo sản phẩm mới** | Admin đăng nhập → Form Tạo SP → Nhập tên, giá, danh mục, màu, size → Tạo biến thể → Lưu SP. | SP lưu vào MySQL `Product` & `ProductVariant`, xuất hiện trên Storefront tìm kiếm. | SP `[AUDIT-TEST-FLOW]` tạo thành công với 2 biến thể, tìm kiếm Customer trả về đúng. | **PASS** |
| **2** | **Đồng bộ sản phẩm & Giá** | Admin cập nhật giá từ 369.000đ thành 399.000đ → Gửi API PATCH. | DB cập nhật trường `price`; Khách hàng xem trang chi tiết thấy giá 399.000đ ngay lập tức. | DB cập nhật `price=399000`; API chi tiết SP phản hồi 399.000đ chuẩn xác. | **PASS** |
| **3** | **Cập nhật & Phục vụ ảnh** | Admin cập nhật ảnh sản phẩm → DB lưu URL ảnh → Gọi API Media. | Ảnh lưu URL hợp lệ; Storefront & Product Detail tải ảnh thật HTTP 200, 0 mannequin SVG. | 38/38 sản phẩm tải ảnh thật (PNG/WebP), dung lượng > 38KB, 0 lỗi placeholder. | **PASS** |
| **4** | **Ẩn sản phẩm (INACTIVE)** | Admin đổi status sang `INACTIVE` → Kiểm tra danh mục bán hàng & AI. | Sản phẩm biến mất khỏi danh sách bán hàng công khai; AI không chào bán SP ẩn. | Bộ lọc Customer loại trừ SP ẩn; AI Stylist không đề xuất SP `INACTIVE`. | **PASS** |
| **5** | **Customer Mua hàng & Checkout** | Khách đăng nhập → Thêm SP giỏ hàng → Điền địa chỉ → Checkout → Sinh URL VNPay Sandbox. | Đơn hàng tạo trạng thái PENDING; sinh link VNPay Sandbox ngân hàng NCB thành công. | Tạo đơn `ORD-2026-0057`; link VNPay Sandbox mở thành công với mã ngân hàng NCB. | **PASS** |
| **6** | **Admin Xử lý đơn hàng** | Admin mở Quản lý đơn hàng → Tìm thấy đơn mới → Chuyển trạng thái sang `SHIPPING`. | Đơn hàng đổi sang `SHIPPING`; Khách hàng tra cứu đơn thấy ngay trạng thái Đang giao. | Admin cập nhật HTTP 200; Khách hàng đọc trạng thái đơn thấy `SHIPPING` chuẩn xác. | **PASS** |
| **7** | **Gemini AI Stylist tương tác** | Khách hỏi tư vấn "Áo sơ mi linen" → AI gọi Tool `search_products`. | AI trả lời thông tin chính xác từ DB, hiển thị thẻ sản phẩm thật, không bịa đặt giá. | AI gọi tool thành công, trả về sản phẩm `Linen Blend Shirt` giá 499.000đ chuẩn catalog. | **PASS** |
| **8** | **AI Business Intelligence** | Admin chọn kỳ phân tích → Backend tính toán dữ liệu → Gemini sinh nhận định & khuyến nghị. | Tính đúng doanh thu 22.291.000đ, AOV 768.655đ; AI sinh kế hoạch Marketing 4.286 ký tự. | Giao diện `/admin/ai-bi` hiển thị đầy đủ 4 tab phân tích và chat AI Assistant. | **PASS** |
| **9** | **Phân quyền & Bảo mật (RBAC)** | Khách hàng dùng token Customer truy cập API Admin (`/orders/admin/all`, `/bi/overview`). | Backend từ chối với HTTP 403 Forbidden; Không có token trả HTTP 401 Unauthorized. | Trả đúng HTTP 401 khi thiếu token và HTTP 403 khi sai vai trò quyền hạn. | **PASS** |
| **10** | **Kiểm thử xử lý lỗi & Phục hồi** | Thử nghiệm dữ liệu rác, chuỗi SQL Injection (`' OR 1=1 --`), token giả mạo, ID không tồn tại. | Hệ thống chặn an toàn, trả thông báo lỗi thân thiện, không lộ stack trace hay sập server. | SQL injection bị vô hiệu hóa bởi Prisma ORM; token giả trả HTTP 401 an toàn. | **PASS** |

---

## II. CHI TIẾT KẾT QUẢ THỰC NGHIỆM TỪNG LUỒNG

### Luồng 1: Admin tạo sản phẩm
- **Input:** Name: `[AUDIT-TEST-FLOW] Áo Sơ Mi Linen Form Rộng Cao Cấp`, Price: `369000`, Category: `ao`, Gender: `men`, Stock: `50`, 2 biến thể: Trắng (M) & Xanh Navy (L).
- **Thực thi:** Gọi `POST /api/v1/products` với JWT Admin.
- **Dữ liệu MySQL:** Record được ghi nhận tại bảng `Product` với ID `p-1710d2b1-bd1f-4b09-aae9-299c08cccd69` cùng 2 bản ghi con trong bảng `ProductVariant`.
- **Đầu ra:** Storefront tìm kiếm theo từ khóa "Linen" lập tức trả về sản phẩm mới.

### Luồng 2: Đồng bộ sản phẩm & Giá bán
- **Thực thi:** Gọi `PUT /api/v1/products/p-1710d2b1-bd1f-4b09-aae9-299c08cccd69` điều chỉnh `price: 399000`.
- **Kiểm chứng:** Gọi `GET /api/v1/products/p-1710d2b1-bd1f-4b09-aae9-299c08cccd69` từ góc độ Customer: giá phản hồi là `399000`. Database lưu đúng số tiền cập nhật.

### Luồng 3: Phục vụ ảnh thật trên toàn hệ thống
- **Thực thi:** Script kiểm tra `test_all_product_images_live.js` quét toàn bộ 38 sản phẩm qua HTTP HEAD/GET.
- **Kết quả:** 38/38 sản phẩm trả về HTTP 200 với `Content-Type: image/png` hoặc `image/webp`. Không còn bất kỳ file nào trả về `image/svg+xml` hay fallback 522 bytes.

### Luồng 4: Chuyển trạng thái ẩn sản phẩm (INACTIVE)
- **Thực thi:** `PUT /api/v1/products/p-1710d2b1-bd1f-4b09-aae9-299c08cccd69` với `status: 'INACTIVE'`.
- **Kiểm chứng:** API Catalog khách hàng loại trừ sản phẩm khỏi danh sách đang bán.

### Luồng 5: Khách hàng mua hàng & Thanh toán VNPay Sandbox
- **Thực thi:** Khách hàng (User `0901234567`) thêm sản phẩm vào giỏ hàng và tiến hành tạo đơn hàng `POST /api/v1/orders`.
- **Kết quả:** Mã đơn hàng `ORD-2026-0057` được tạo thành công trong MySQL. Gọi tiếp `POST /api/v1/payment/vnpay/create-payment-url` sinh ra URL thanh toán VNPay Sandbox với mã ngân hàng NCB.

### Luồng 6: Admin xử lý đơn hàng
- **Thực thi:** Admin đăng nhập, tra cứu danh sách đơn hàng, tìm thấy `ORD-2026-0057` và gọi `PATCH /api/v1/orders/ORD-2026-0057/status` cập nhật trạng thái sang `SHIPPING`.
- **Kiểm chứng:** Khách hàng tra cứu chi tiết đơn hàng qua `GET /api/v1/orders/ORD-2026-0057`: trạng thái hiển thị chuẩn `SHIPPING`.

### Luồng 7: Gemini AI Stylist tư vấn sản phẩm
- **Thực thi:** Gửi prompt "Tìm giúp tôi sản phẩm Áo Sơ Mi Linen Form Rộng" tới `POST /api/v1/ai/chat`.
- **Kết quả:** Gemini gọi Backend Tool `search_products`, tìm thấy sản phẩm trong MySQL và trả về câu trả lời gợi ý kèm thông tin giá chính xác 100%, không suy diễn.

### Luồng 8: AI Business Intelligence
- **Thực thi:** Gọi API `GET /api/v1/bi/overview`, `GET /api/v1/bi/revenue`, `POST /api/v1/bi/marketing-plan`.
- **Kết quả:** Tính toán dựa trên 29 đơn hàng hợp lệ: Doanh thu 22.291.000đ, AOV 768.655đ, tỷ lệ khách hàng mua lại 100%. Kế hoạch Marketing do Gemini 2.5 Flash sinh ra dài 4.286 ký tự, bao gồm Big Idea, thông điệp, ngân sách và KPI.

### Luồng 9: Kiểm thử phân quyền & Bảo mật (RBAC)
- Khách hàng không có token gọi API Admin → HTTP 401 Unauthorized.
- Khách hàng có token Customer gọi API Admin (`/api/v1/orders/admin/all`, `/api/v1/bi/overview`) → HTTP 403 Forbidden.
- Token giả mạo hoặc hết hạn → HTTP 401 Unauthorized.

### Luồng 10: Xử lý lỗi & Phục hồi hệ thống
- Chuỗi SQL Injection `' OR '1'='1` trên ô tìm kiếm sản phẩm: Xử lý an toàn qua Prisma Parameterized Query, trả về kết quả tìm kiếm rỗng bình thường thay vì lộ dữ liệu.
- ID sản phẩm không tồn tại (`/products/p999999`): Trả về HTTP 404 với JSON chuẩn `{ success: false, error: "Không tìm thấy sản phẩm" }`.

---

## III. DỌN DẸP DỮ LIỆU THỬ NGHIỆM (DATA CLEANUP)

Sau khi hoàn thành đợt kiểm thử tự động, toàn bộ các bản ghi phát sinh trong bài test (`testProductId`, `testOrderId`) đã được tự động dọn dẹp sạch sẽ khỏi bảng `orders`, `order_items`, `product_variants` và `products` trên database `routine_test_db`, bảo đảm giữ nguyên vẹn dữ liệu mẫu ban đầu để bạn tự nghiệm thu thủ công.
