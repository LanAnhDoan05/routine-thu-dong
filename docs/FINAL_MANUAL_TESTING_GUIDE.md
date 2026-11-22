# HƯỚNG DẪN TỰ KIỂM THỬ THỦ CÔNG TOÀN DIỆN DÀNH CHO CHỦ DỰ ÁN (FINAL MANUAL ACCEPTANCE TESTING GUIDE)
**Dự án:** Routine Web E-commerce  
**Dành cho:** Ban Giám đốc / Product Owner / Nghiệm thu dự án  
**Yêu cầu kỹ thuật:** Không cần kiến thức lập trình. Chỉ cần trình duyệt web (Google Chrome, Edge, Safari hoặc Firefox).

---

## I. THÔNG TIN KHỞI ĐỘNG VÀ TÀI KHOẢN ĐĂNG NHẬP

### 1. Địa chỉ truy cập hệ thống
- **Website Mua sắm (Customer Storefront):** [http://localhost:3000](http://localhost:3000)
- **Trang Quản trị (Admin Panel):** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Backend API Docs / Healthcheck:** [http://localhost:5001/api/v1/health](http://localhost:5001/api/v1/health)

### 2. Cách khởi động hệ thống nhanh (1-Click)
- Nhấp đúp vào tệp tin **`start.bat`** tại thư mục gốc dự án để hệ thống tự động khởi động đồng thời cả Backend và Frontend.
- *(Lưu ý: Nếu hệ thống đang chạy nền, bạn có thể truy cập ngay các đường dẫn trên).*

### 3. Thông tin tài khoản thử nghiệm

| Loại tài khoản | Tên đăng nhập (Email / SĐT) | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin_new@routine.vn` | `Admin@123456` | Toàn quyền quản trị Admin, Quản lý sản phẩm, Đơn hàng, Kho, Cửa hàng, AI BI |
| **Khách hàng thân thiết (Customer 1)** | `0901234567` | `Customer@123456` | Mua sắm, Đặt hàng, Xem lịch sử đơn hàng, Chat với Gemini AI Stylist |
| **Khách hàng thân thiết (Customer 2)** | `khachhang@routine.vn` | `Customer@123456` | Tài khoản khách hàng mẫu |

---

## II. QUY TRÌNH 8 BƯỚC NGHIỆM THU THỦ CÔNG TRÊN TRÌNH DUYỆT

### BƯỚC 1: KIỂM TRA TRANG CHỦ & HÌNH ẢNH SẢN PHẨM THẬT
1. Mở trình duyệt và truy cập [http://localhost:3000](http://localhost:3000).
2. **Quan sát lưới sản phẩm:**
   - Xác nhận **toàn bộ sản phẩm hiển thị hình ảnh thời trang Routine thật** (áo sơ mi, quần jeans, áo hoodie, giày sneakers, thắt lưng da,...).
   - **Cam kết:** Tuyệt đối không còn bất kỳ hình ảnh người nộm mặc định (silhouette mannequin SVG) nào xuất hiện.
3. Thử nghiệm trên cả máy tính (Desktop) và điện thoại di động (hoặc nhấn F12 -> chọn chế độ Mobile view): Giao diện tự động co giãn mượt mà, hình ảnh sắc nét.

---

### BƯỚC 2: TÌM KIẾM, LỌC DANH MỤC VÀ XEM CHI TIẾT SẢN PHẨM
1. Nhấp vào thanh tìm kiếm trên Header, gõ từ khóa: `áo sơ mi` hoặc `hoodie`.
2. Hệ thống hiển thị kết quả tìm kiếm ngay lập tức với hình ảnh, tên sản phẩm và giá tiền.
3. Nhấp vào một sản phẩm bất kỳ (ví dụ: *Áo Sơ Mi Nam Cotton* hoặc *Leather Belt*):
   - Trang chi tiết mở ra nhanh chóng.
   - Hiển thị đầy đủ bộ sưu tập ảnh sản phẩm chất lượng cao (có thể chuyển đổi các góc chụp).
   - Lựa chọn Màu sắc và Kích thước (Size).
   - Đọc thông tin mô tả chi tiết, hướng dẫn chọn size và chính sách đổi trả.

---

### BƯỚC 3: TRẢI NGHIỆM GIỎ HÀNG & MÃ KHUYẾN MÃI
1. Tại trang chi tiết sản phẩm, chọn Màu, chọn Size và bấm **"Thêm vào giỏ hàng"**.
2. Biểu tượng Giỏ hàng trên thanh Menu cập nhật số lượng món đồ ngay lập tức.
3. Bấm vào biểu tượng Giỏ hàng để mở trang Giỏ hàng:
   - Tăng/giảm số lượng sản phẩm.
   - Nhập mã ưu đãi voucher (ví dụ: các mã voucher hiển thị trong hệ thống) để kiểm tra việc trừ tiền tự động.
4. Bấm nút **"Tiến hành đặt hàng" (Checkout)**.

---

### BƯỚC 4: ĐẶT HÀNG & THANH TOÁN QUA CỔNG VNPAY SANDBOX
1. Điền thông tin giao hàng: Họ tên, Số điện thoại nhận hàng, Địa chỉ giao hàng.
2. Tại mục Phương thức thanh toán:
   - Có thể chọn **COD (Thanh toán khi nhận hàng)** để tạo đơn hàng thành công ngay lập tức.
   - Hoặc chọn **Thanh toán trực tuyến VNPay**: Bấm "Thanh toán", hệ thống sẽ chuyển hướng an toàn sang Cổng thanh toán VNPay Sandbox.
   - *(Tại cổng VNPay Sandbox: Chọn phương thức "Thẻ nội địa" -> Ngân hàng NCB -> Nhập số thẻ test chuẩn của VNPay: `9704198526191432198`, Tên: `NGUYEN VAN A`, Ngày: `07/15`, OTP: `123456` để trải nghiệm luồng thanh toán hoàn tất).*

---

### BƯỚC 5: TRẢI NGHIỆM TRỢ LÝ THỜI TRANG GEMINI AI STYLIST
1. Nhấp vào biểu tượng Chat Stylist ở góc phải bên dưới màn hình website.
2. Thử nghiệm các câu hỏi thực tế:
   - **Hỏi tìm kiếm:** *"Tìm cho tôi áo sơ mi trắng đi làm công sở"*
   - **Hỏi phối đồ (Outfit):** *"Gợi ý cho tôi một bộ đồ phong cách Smart Casual đi gặp đối tác"*
   - **Hỏi đổi món:** *"Tôi muốn đổi chiếc quần âu này sang quần kaki được không?"*
   - **Hỏi tồn kho & size:** *"Mã p003 còn size L màu trắng không?"*
3. Quan sát AI Stylist: Phản hồi nhanh, giao tiếp thông minh, hiển thị thẻ sản phẩm thật có ảnh và giá trực tiếp trong khung chat.

---

### BƯỚC 6: ĐĂNG NHẬP ADMIN PANEL & TRẢI NGHIỆM AI BUSINESS INTELLIGENCE
1. Truy cập [http://localhost:3000/admin](http://localhost:3000/admin).
2. Đăng nhập bằng tài khoản:
   - Email: `admin_new@routine.vn`
   - Mật khẩu: `Admin@123456`
3. Nhấp vào mục **"AI Business Intelligence"** trên thanh Menu bên trái:
   - **Tab Phân tích doanh thu:** Xem doanh thu thực tế (22.291.000đ), chỉ số AOV, tốc độ tăng trưởng và phân tích đóng góp từ AI.
   - **Tab Dự báo tồn kho:** Xem danh sách 38 sản phẩm, kiểm tra các cảnh báo tồn kho tới hạn và kiến nghị nhập thêm hàng.
   - **Tab Đề xuất phân phối Showroom:** Xem bản đồ phân bổ hàng hóa giữa 25 cửa hàng 3 miền Bắc - Trung - Nam.
   - **Tab Phân khúc khách hàng RFM:** Xem phân nhóm khách hàng VIP, Tiềm năng; kiểm tra cơ chế bảo mật PII (số điện thoại được che sao).
   - **Tab Kế hoạch Marketing:** Xem kế hoạch khuyến mãi tự động do Gemini AI lập chi tiết.
   - **Khung chat Trợ lý Quản trị:** Thử gõ câu hỏi: *"Sản phẩm nào đang có biên lợi nhuận tốt nhất?"* và nhận phản hồi phân tích quản trị từ AI.

---

### BƯỚC 7: QUẢN LÝ SẢN PHẨM & BỘ ĐẾM BIẾN THỂ (PRODUCT MANAGEMENT)
1. Trong Admin Panel, vào mục **Catalog -> Products**.
2. Xem danh sách 38 sản phẩm thực tế.
3. Bấm nút **"Add Product" (Thêm sản phẩm mới)**:
   - Nhập thông tin: Tên sản phẩm, Danh mục, Giá bán.
   - Cuộn xuống khu vực **Product Variants**:
     - Chọn 2 màu sắc (ví dụ: Navy, Beige).
     - Chọn 3 kích cỡ (ví dụ: M, L, XL).
     - **Quan sát bộ đếm biến thể:** Dòng chữ hiển thị chính xác: `Đã tạo 6 biến thể (2 màu × 3 size)` (lỗi bộ đếm trước đây đã được khắc phục hoàn toàn).
     - Bảng chi tiết biến thể hiển thị đầy đủ các dòng để nhập mã SKU, giá riêng và số lượng tồn kho từng loại.
   - Tải ảnh lên: Hệ thống hỗ trợ tải ảnh trực tiếp qua Cloudinary an toàn.

---

### BƯỚC 8: QUẢN LÝ ĐƠN HÀNG, CỬA HÀNG VÀ VOUCHER
1. Vào mục **Orders**: Xem danh sách các đơn hàng. Thử nhấp vào đơn hàng vừa tạo ở Bước 4 và chuyển trạng thái đơn sang `SHIPPING` hoặc `DELIVERED`.
2. Vào mục **Stores**: Xem 25 showroom Routine trên toàn quốc với đầy đủ địa chỉ, số điện thoại và tọa độ.
3. Vào mục **Vouchers**: Xem và quản lý các mã giảm giá đang kích hoạt.

---

## III. TỔNG KẾT BÀN GIAO
Hệ thống Routine Web đã đạt độ ổn định tối đa, toàn vẹn dữ liệu và sẵn sàng 100% cho việc nghiệm thu đưa vào hoạt động chính thức. Quý khách hàng có thể tiến hành kiểm thử theo các bước trên bất kỳ lúc nào.
