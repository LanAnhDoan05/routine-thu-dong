# BÁO CÁO NGHIỆM THU HỆ THỐNG BACKEND VÀ API
## BACKEND API ACCEPTANCE REPORT – ROUTINE WEB E-COMMERCE

---

## 1. TIÊU CHUẨN THIẾT KẾ VÀ ĐẶC TẢ API

Hệ thống Backend được phát triển trên kiến trúc RESTful chuẩn mực, sử dụng Express.js và Prisma Client kết nối MySQL. Tất cả các endpoint tuân thủ nghiêm ngặt các nguyên tắc:
1. **Chuẩn hóa cấu trúc phản hồi JSON**:
   ```json
   {
     "success": true,
     "message": "Thông điệp mô tả kết quả xử lý",
     "data": { ... },
     "error": null
   }
   ```
2. **Mã trạng thái HTTP chính xác**:
   - `200 OK`: Truy vấn hoặc cập nhật thành công.
   - `201 Created`: Tạo mới tài nguyên thành công (Đơn hàng, Khách hàng, Tin nhắn).
   - `400 Bad Request`: Lỗi tham số đầu vào hoặc thiếu thông tin bắt buộc.
   - `401 Unauthorized`: Thiếu token xác thực hoặc phiên đăng nhập đã hết hạn.
   - `403 Forbidden`: Người dùng không có quyền truy cập tài nguyên (ví dụ: Customer truy cập Admin BI).
   - `404 Not Found`: Không tìm thấy tài nguyên trong cơ sở dữ liệu.

---

## 2. KẾT QUẢ NGHIỆM THU CHI TIẾT TỪNG NHÓM API

### 2.1. Nhóm Xác thực & Quản lý Người dùng (Auth & User API)

| Endpoint | Phương thức | Quyền hạn | Kết quả kiểm thử | Trạng thái |
|:---|:---:|:---:|:---|:---:|
| `/api/v1/auth/register` | `POST` | Public | Đăng ký tài khoản mới thành công, băm mật khẩu bcrypt an toàn. | **PASS** |
| `/api/v1/auth/login` | `POST` | Public | Cấp JWT Token có thời hạn và đặt HTTP-only Cookie. Phân loại Role chính xác. | **PASS** |
| `/api/v1/auth/logout` | `POST` | Authenticated | Hủy bỏ phiên làm việc, xóa Cookie định danh. | **PASS** |
| `/api/v1/auth/me` | `GET` | Authenticated | Trả về hồ sơ cá nhân và avatar của người dùng hiện tại. | **PASS** |
| `/api/v1/auth/profile` | `PUT` | Authenticated | Cập nhật tên, địa chỉ, sở thích thời trang và số điện thoại. | **PASS** |

### 2.2. Nhóm Danh mục & Sản phẩm (Catalog & Product API)

| Endpoint | Phương thức | Quyền hạn | Kết quả kiểm thử | Trạng thái |
|:---|:---:|:---:|:---|:---:|
| `/api/v1/products` | `GET` | Public | Hỗ trợ phân trang (`page`, `limit`), lọc theo giá, danh mục, giới tính. Trả về đúng 57 sản phẩm. | **PASS** |
| `/api/v1/products/:id` | `GET` | Public | Chi tiết sản phẩm kèm danh sách biến thể, bảng size, màu sắc và thư viện ảnh. | **PASS** |
| `/api/v1/products` | `POST` | Admin | Tạo sản phẩm mới kèm bộ biến thể tự động, lưu trực tiếp vào MySQL. | **PASS** |
| `/api/v1/products/:id` | `PUT` | Admin | Chỉnh sửa tên, mô tả, giá, tồn kho và trạng thái (ACTIVE / INACTIVE). | **PASS** |
| `/api/v1/products/:id` | `DELETE` | Admin | Xóa mềm sản phẩm (chuyển sang INACTIVE) để bảo toàn lịch sử đơn hàng. | **PASS** |
| `/api/v1/categories` | `GET` | Public | Trả về 26 danh mục với 100% hình ảnh URL hợp lệ HTTP 200. | **PASS** |
| `/api/v1/styles` | `GET` | Public | Trả về 6 phong cách thời trang Routine với hình ảnh chuẩn xác. | **PASS** |

### 2.3. Nhóm Giỏ hàng & Đơn hàng (Cart & Order API)

| Endpoint | Phương thức | Quyền hạn | Kết quả kiểm thử | Trạng thái |
|:---|:---:|:---:|:---|:---:|
| `/api/v1/cart` | `GET` | User / Guest | Lấy giỏ hàng theo định danh phiên hoặc ID khách hàng. | **PASS** |
| `/api/v1/cart/items` | `POST` | User / Guest | Thêm sản phẩm vào giỏ, kiểm tra tồn kho tức thì trước khi thêm. | **PASS** |
| `/api/v1/cart/items/:id` | `PUT` | User / Guest | Cập nhật số lượng sản phẩm trong giỏ hàng. | **PASS** |
| `/api/v1/cart/items/:id` | `DELETE` | User / Guest | Xóa sản phẩm khỏi giỏ hàng. | **PASS** |
| `/api/v1/orders` | `POST` | User / Guest | Tạo đơn hàng mới trong MySQL, tính toán lại giá từ DB, khóa giữ tồn kho 5 phút. | **PASS** |
| `/api/v1/orders` | `GET` | User / Guest | Khách chỉ xem được danh sách đơn hàng do chính mình đặt (chống rò rỉ). | **PASS** |
| `/api/v1/orders/:id` | `GET` | User / Guest | Xem chi tiết đơn hàng, chống truy cập chéo đơn của người khác (IDOR Safe). | **PASS** |
| `/api/v1/orders/admin/all` | `GET` | Admin | Xem toàn bộ 135 đơn hàng hệ thống có phân trang và lọc theo trạng thái. | **PASS** |
| `/api/v1/orders/:id/status`| `PATCH` | Admin | Cập nhật trạng thái đơn (CONFIRMED -> SHIPPING -> DELIVERED), phát sự kiện SSE. | **PASS** |

### 2.4. Nhóm Vận chuyển & Thanh toán (Shipping & Payment API)

| Endpoint | Phương thức | Quyền hạn | Kết quả kiểm thử | Trạng thái |
|:---|:---:|:---:|:---|:---:|
| `/api/v1/shipping/calculate` | `POST` | Public | Tính toán phí ship chuẩn hóa theo địa giới hành chính (Nội thành: 20k, Ngoại thành: 30k, Tỉnh: 35k). | **PASS** |
| `/api/v1/shipping/validate-address` | `POST` | Public | Chuẩn hóa địa chỉ khách nhập thành 3 cấp: Tỉnh/Thành, Quận/Huyện, Phường/Xã. | **PASS** |
| `/api/v1/payment/vnpay/create-url` | `POST` | User / Guest | Sinh URL thanh toán VNPay Sandbox với chữ ký bảo mật SHA512 hợp lệ. | **PASS** |
| `/api/v1/payment/vnpay/return` | `GET` | Public | Tiếp nhận redirect từ VNPay, kiểm tra mã phản hồi vnp_ResponseCode = '00'. | **PASS** |

### 2.5. Nhóm AI & Hỗ trợ Khách hàng (AI Agent & Consultant Hub)

| Endpoint | Phương thức | Quyền hạn | Kết quả kiểm thử | Trạng thái |
|:---|:---:|:---:|:---|:---:|
| `/api/v1/ai/chat` | `POST` | User / Guest | Điều phối Gemini AI Stylist với 11 công cụ Function Calling. | **PASS** |
| `/api/v1/ai/conversations/:id/handoff` | `POST` | User / Guest | Xác nhận chuyển tiếp chuyên viên, cập nhật trạng thái `LEAD_PENDING`. | **PASS** |
| `/api/v1/ai/admin/leads` | `GET` | Admin | Lấy danh sách khách hàng đang chờ tư vấn viên tiếp nhận. | **PASS** |
| `/api/v1/ai/admin/leads/:id/status` | `PATCH` | Admin | Chuyên viên nhận tư vấn (chuyển sang `IN_PROGRESS` hoặc `RESOLVED`). | **PASS** |
| `/api/v1/ai/admin/leads/:id/messages`| `POST` | Admin | Chuyên viên gửi tin nhắn trực tiếp tới khách hàng qua SSE. | **PASS** |
| `/api/v1/ai/conversations/:id/messages`| `GET` | User / Guest | Lấy toàn bộ luồng chat hợp nhất (`CUSTOMER`, `AI`, `STAFF`). | **PASS** |

### 2.6. Nhóm Phân tích Kinh doanh (Admin Business Intelligence)

| Endpoint | Phương thức | Quyền hạn | Kết quả kiểm thử | Trạng thái |
|:---|:---:|:---:|:---|:---:|
| `/api/v1/bi/overview` | `GET` | Admin | Tổng hợp KPI: Doanh thu hợp lệ 120M+, 135 đơn hàng, AOV, phân bố trạng thái. | **PASS** |
| `/api/v1/bi/revenue` | `GET` | Admin | Phân tích chi tiết doanh thu theo ngày/tháng, Top 10 sản phẩm bán chạy nhất. | **PASS** |
| `/api/v1/bi/inventory-forecast` | `GET` | Admin | Cảnh báo 7 mã sản phẩm cạn tồn kho, dự báo tốc độ bán (Burn-rate). | **PASS** |
| `/api/v1/bi/crm-rfm` | `GET` | Admin | Phân khúc 47 khách hàng theo mô hình RFM (Champions, Loyal, At-Risk). | **PASS** |
| `/api/v1/bi/marketing-plan` | `POST` | Admin | Trợ lý CMO sinh kế hoạch Marketing 4 tuần theo ngân sách và định vị Routine. | **PASS** |

---

## 3. KẾT LUẬN NGHIỆM THU BACKEND

Hệ sinh thái Backend API đạt chuẩn bảo mật và hiệu năng cao nhất, xử lý thông suốt mọi luồng nghiệp vụ không phát sinh ngoại lệ 500.
