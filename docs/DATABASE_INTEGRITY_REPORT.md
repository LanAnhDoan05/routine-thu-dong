# BÁO CÁO TOÀN VẸN VÀ NHẤT QUÁN CƠ SỞ DỮ LIỆU
## DATABASE INTEGRITY REPORT – ROUTINE WEB E-COMMERCE

---

## 1. TỔNG QUAN HẠ TẦNG CƠ SỞ DỮ LIỆU

- **Hệ quản trị CSDL**: MySQL Cloud (Hosted on Aiven Cloud).
- **Cơ sở dữ liệu hoạt động**: `routine_test_db` (Phân lập hoàn toàn, bảo vệ nguyên trạng `defaultdb`).
- **ORM kết nối**: Prisma ORM v6.19.3.
- **Trạng thái kết nối**: Active & Connection Pooled (Max connections: 10, Timeout: 5000ms).

---

## 2. BẢNG THỐNG KÊ TOÀN DIỆN CÁC THỰC THỂ DỮ LIỆU

| Tên bảng trong MySQL | Model Prisma | Số lượng bản ghi | Mục đích dữ liệu | Trạng thái toàn vẹn |
|:---|:---|:---:|:---|:---:|
| `products` | `Product` | **57** | Danh mục sản phẩm thời trang Routine | **100% Khớp khóa ngoại, ảnh hợp lệ** |
| `product_variants` | `ProductVariant` | **160** | Biến thể (Màu sắc, Size, Giá, Tồn kho) | **0 Bản ghi mồ côi, 0 Tồn kho âm** |
| `categories` | `Category` | **26** | Phân loại ngành hàng thời trang | **100% URL ảnh phản hồi HTTP 200** |
| `styles` | `Style` | **6** | Phong cách định hình Routine | **100% URL ảnh phản hồi HTTP 200** |
| `outfits` | `Outfit` | **9** | Bộ phối trang phục mẫu cho AI Stylist | **100% URL ảnh phản hồi HTTP 200** |
| `stores` | `Store` | **25** | Hệ thống Showroom toàn quốc | **Tọa độ GPS Lat/Long đầy đủ** |
| `orders` | `Order` | **135** | Lịch sử và tiến trình đơn hàng | **100% Khớp công thức tính toán** |
| `order_items` | `OrderItem` | **219** | Chi tiết từng sản phẩm trong đơn | **100% Có ảnh sản phẩm thật** |
| `users` | `User` | **47** | Tài khoản Admin, Nhân viên và Khách | **Mật khẩu bcrypt, PII an toàn** |
| `ai_conversations` | `AiConversation` | **5** | Phiên tư vấn AI và Handoff Leads | **Điểm ý định & nhãn Lead chuẩn xác** |
| `media_files` | `MediaFile` | **96** | Tệp tin đa phương tiện lưu trong DB | **Dữ liệu nhị phân nguyên vẹn** |

---

## 3. KIỂM THỬ TÍNH TOÀN VẸN QUAN HỆ VÀ KHÓA NGOẠI

### 3.1. Kiểm tra Bản ghi Mồ côi (Orphan Records Audit)
- **Biến thể sản phẩm (`product_variants`)**:
  - Truy vấn kiểm tra: `SELECT * FROM product_variants WHERE product_id NOT IN (SELECT id FROM products);`
  - Kết quả: **0 Bản ghi mồ côi (0 Orphan Records)**.
- **Chi tiết đơn hàng (`order_items`)**:
  - Truy vấn kiểm tra: `SELECT * FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);`
  - Kết quả: **0 Bản ghi mồ côi (0 Orphan Records)**.
- **Sản phẩm trong chi tiết đơn hàng**:
  - Truy vấn kiểm tra: `SELECT * FROM order_items WHERE product_id NOT IN (SELECT id FROM products);`
  - Kết quả: **0 Bản ghi mồ côi (0 Orphan Records)**.

### 3.2. Kiểm tra Độ chính xác Toán học Nghiệp vụ (Financial Math Integrity)
Toàn bộ 135 đơn hàng được kiểm toán tự động theo quy tắc chuẩn mực:
$$\text{Tổng thanh toán (Total)} = \max(0, \text{Tiền hàng (Subtotal)} - \text{Giảm giá (Discount)} + \text{Phí vận chuyển (ShippingFee)})$$
$$\text{Tiền hàng (Subtotal)} = \sum_{i} (\text{Item.Price}_i \times \text{Item.Quantity}_i)$$

- Số lượng đơn hàng lệch công thức: **0 / 135 (Tỷ lệ khớp: 100%)**.
- Số lượng đơn hàng lệch tổng giá trị các món: **0 / 135 (Tỷ lệ khớp: 100%)**.

### 3.3. Kiểm tra Tồn kho và Trừ kho An toàn (Inventory Integrity)
- Số lượng biến thể có tồn kho âm ($< 0$): **0 / 160 biến thể**.
- Số lượng sản phẩm có giá bán không hợp lệ ($\le 0$): **0 / 57 sản phẩm**.
- Cơ chế **Stock Reservation (Khóa tồn kho 5 phút)**:
  - Khi đơn hàng được khởi tạo, số lượng tồn kho được giữ tạm trong bảng `stock_reservations`.
  - Nếu khách hủy hoặc quá 5 phút chưa thanh toán VNPay, tồn kho được tự động hoàn trả.
  - Khi đơn hàng COD được tạo thành công, `stockReservationService.commitStock` trừ trực tiếp vào tồn kho thật trong MySQL.

---

## 4. KẾT LUẬN TOÀN VẸN CƠ SỞ DỮ LIỆU

Cơ sở dữ liệu MySQL `routine_test_db` đạt mức độ toàn vẹn tham chiếu 100%, không xảy ra bất kỳ hiện tượng phân mảnh, sai lệch số liệu hay dữ liệu rác.
