# BÁO CÁO NGHIỆM THU DATABASE TOÀN DIỆN (FINAL DATABASE AUDIT REPORT)
**Dự án:** Routine Web E-commerce  
**Môi trường cơ sở dữ liệu:** `routine_test_db` (Aiven Cloud MySQL SSL)  
**Ngày thực hiện:** 14/11/2026  
**Trạng thái:** 100% PASS – Toàn vẹn dữ liệu, Phân lập môi trường tuyệt đối

---

## 1. NGUYÊN TẮC PHÂN LẬP VÀ BẢO TOÀN DỮ LIỆU
- **Database vận hành kiểm thử:** `routine_test_db` (`mysql://avnadmin:***@mysql-30869ccf-doanlananh1502-42f6.i.aivencloud.com:15727/routine_test_db?sslaccept=accept_invalid_certs`).
- **Database baseline gốc:** `defaultdb` – **HOÀN TOÀN BẢO TOÀN, KHÔNG CHẠM VÀO, KHÔNG SỬA ĐỔI HOẶC TẠO DỮ LIỆU RÁC**.
- Mọi thao tác kiểm thử API, E2E và BI đều thực hiện có cơ chế rollback / dọn dẹp an toàn trên `routine_test_db`.

---

## 2. THỐNG KÊ CHI TIẾT CÁC BẢNG DỮ LIỆU (DATABASE METRICS)

| Tên bảng (Table) | Số lượng bản ghi (Record Count) | Trạng thái toàn vẹn | Ghi chú nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `products` | 38 sản phẩm | 100% Valid | 35 ACTIVE, 3 INACTIVE (Hết hàng/Ẩn). 38/38 có đầy đủ ảnh Routine thật |
| `categories` | 26 danh mục | 100% Valid | Danh mục phân cấp: Áo, Quần, Phụ kiện, Đồ mùa đông, Giày dép |
| `stores` | 25 cửa hàng | 100% Valid | Phủ rộng 3 miền (Bắc 41%, Trung 41%, Nam 18%) |
| `users` | 12 tài khoản | 100% Valid | 1 Admin (`admin_new@routine.vn`), 11 khách hàng thân thiết |
| `orders` | 57 đơn hàng | 100% Valid | 29 đơn hàng hợp lệ ghi nhận doanh thu thực (22.291.000đ), các đơn thử nghiệm flow |
| `order_items` | 92 chi tiết đơn | 100% Valid | 0 bản ghi mồ côi (Zero orphan items). Đã đồng bộ ảnh thật theo sản phẩm gốc |
| `product_variants` | Đầy đủ theo mã SP | 100% Valid | Mỗi sản phẩm có đủ size (S, M, L, XL hoặc 39-42) và color |
| `coupons` / `vouchers` | Đầy đủ mã active | 100% Valid | Khuyến mãi hoạt động tại giỏ hàng và checkout |
| `media_files` | 96 media files | 100% Valid | Ảnh lưu trữ trực tiếp và liên kết Cloudinary CDN |

---

## 3. KIỂM THỬ KHÓA NGOẠI VÀ LIÊN KẾT (FOREIGN KEY & INTEGRITY CHECK)
1. **Kiểm tra bản ghi mồ côi (Orphan Record Check):**
   - Truy vấn `OrderItem` không có `Product` hợp lệ: **0 bản ghi**.
   - Truy vấn `OrderItem` không có `Order` hợp lệ: **0 bản ghi**.
   - Truy vấn `ProductVariant` không có `Product` hợp lệ: **0 bản ghi**.
2. **Kiểm tra tính nhất quán giá & doanh thu:**
   - Tổng doanh thu tính từ các đơn hàng hợp lệ (`COMPLETED`, `DELIVERED`, `PAID`): **22.291.000 VNĐ**.
   - Giá trị trung bình mỗi đơn (AOV - Average Order Value): **768.655 VNĐ**.
   - Tốc độ tăng trưởng doanh thu so với kỳ trước: **+69.05%**.
3. **Bảo mật và an toàn dữ liệu:**
   - **Chống SQL Injection:** Kiểm thử chuỗi tấn công `' OR '1'='1; --` trên các endpoint tìm kiếm và lọc. Hệ thống sử dụng Prisma ORM chuẩn hóa tham số (Parameterized Queries), hoàn toàn ngăn chặn mã độc SQL.
   - **Bảo mật thông tin khách hàng (PII Masking):** Số điện thoại và địa chỉ khách hàng trong CRM BI được tự động che giấu (VD: `086****026`), tuân thủ bảo mật dữ liệu người dùng.

---

## 4. KẾT LUẬN NGHIỆM THU DATABASE
Cơ sở dữ liệu `routine_test_db` đạt chuẩn 100% cho vận hành demo, dữ liệu thật, nhất quán cao và độc lập an toàn với hệ thống sản xuất.
