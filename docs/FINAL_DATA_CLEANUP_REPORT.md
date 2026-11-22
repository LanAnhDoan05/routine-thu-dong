# BÁO CÁO KIỂM KÊ VÀ LÀM SẠCH DỮ LIỆU KIỂM THỬ (FINAL DATA CLEANUP REPORT)
**Dự án:** Routine Web E-commerce  
**Môi trường thực hiện:** `routine_test_db` (Aiven Cloud MySQL SSL)  
**Ngày thực hiện:** 14/11/2026  
**Chuyên viên phụ trách:** Senior Full-stack Developer & Database Engineer  

---

## I. MỤC TIÊU VÀ NGUYÊN TẮC LÀM SẠCH DỮ LIỆU

Nhằm chuyển Routine Web từ trạng thái chứa các tài khoản test rời rạc và đơn hàng thử nghiệm đơn giản sang trạng thái một website thương mại điện tử mô phỏng vận hành kinh doanh thực tế, đợt kiểm kê và làm sạch dữ liệu tuân thủ nghiêm ngặt các nguyên tắc:

1. **Tuyệt đối không xóa diện rộng bằng lệnh phá hủy:** Không dùng `TRUNCATE`, `DROP DATABASE` hoặc xóa toàn bộ bảng dữ liệu.
2. **Bảo toàn dữ liệu sản phẩm gốc:** Giữ nguyên vẹn 100% catalog 38 sản phẩm thật (35 ACTIVE, 3 INACTIVE) cùng 100% hình ảnh thời trang Routine chất lượng cao.
3. **Bảo tồn cấu hình hệ thống:** Giữ nguyên 26 danh mục (categories), 25 showroom Routine (stores), 6 phong cách (styles), 9 outfits, và tài khoản Quản trị viên `admin_new@routine.vn`.
4. **Sao lưu trước khi tác động:** Đã xuất bản sao lưu toàn diện dạng JSON vào thư mục an toàn:  
   `backend/.backups/backup_routine_test_db_2026-11-13T21-52-49-248Z.json` (372.49 KB, chứa dữ liệu của toàn bộ 26 bảng).
5. **Xử lý ràng buộc khóa ngoại (Foreign Key Integrity):** Xóa dữ liệu phát sinh theo đúng trình tự phân cấp:  
   `order_items` -> `stock_reservations` -> `orders` -> `cart_items` -> `carts` -> `wishlist_items` -> `wishlists` -> `addresses` -> `reviews` -> `users`.

---

## II. KIỂM KÊ DỮ LIỆU TRƯỚC KHI LÀM SẠCH

Trước khi thực hiện làm sạch, hệ thống ghi nhận các nhóm dữ liệu như sau:

| STT | Bảng dữ liệu | Số bản ghi trước dọn dẹp | Phân loại dữ liệu | Biện pháp xử lý |
| :---: | :--- | :---: | :--- | :--- |
| 1 | `products` | 38 | Dữ liệu sản phẩm thật của Routine | **Bảo toàn 100%** |
| 2 | `categories` | 26 | Danh mục phân cấp thời trang | **Bảo toàn 100%** |
| 3 | `stores` | 25 | Hệ thống showroom 3 miền | **Bảo toàn 100%** |
| 4 | `styles` / `outfits` | 6 / 9 | Phong cách & Gợi ý phối đồ AI | **Bảo toàn 100%** |
| 5 | `shipping_rules` | 9 | Biểu phí giao hàng hành chính | **Bảo toàn 100%** |
| 6 | `coupons` | 6 | Mã ưu đãi khuyến mãi | **Bảo toàn 100%** |
| 7 | `media_files` | 96 | Kho tệp hình ảnh | **Bảo toàn 100%** |
| 8 | `users` | 12 | 1 Admin, 2 User thật, 9 User test rác | Giữ Admin & User thật; Xóa 9 user test |
| 9 | `orders` | 57 | 16 đơn thật, 28 đơn baseline, 13 đơn test rác | Giữ 44 đơn hợp lệ; Xóa 13 đơn test rác |
| 10 | `order_items` | 92 | 67 chi tiết đơn hợp lệ, 25 chi tiết rác | Giữ 67 chi tiết; Xóa 25 chi tiết test |
| 11 | `carts` / `cart_items` | 30 / 16 | Giỏ hàng của các phiên test | Xóa giỏ hàng liên kết user test |
| 12 | `wishlists` | 21 / 5 | Danh sách yêu thích | Xóa mục liên kết user test |

---

## III. DANH SÁCH CHI TIẾT CÁC BẢN GHI ĐÃ XÓA

### 1. Danh sách 9 tài khoản Customer test tự động đã xóa
1. `test_customer_1794599192771@gmail.com` (Tài khoản sinh từ script E2E, 0 đơn hàng).
2. `test_customer_1794599037198@gmail.com` (Tài khoản sinh từ script E2E, 0 đơn hàng).
3. `test_customer_1794599073823@gmail.com` (Tài khoản sinh từ script E2E, 0 đơn hàng).
4. `test_customer_1794599222692@gmail.com` (Tài khoản sinh từ script E2E, 1 đơn CANCELLED).
5. `test_customer_1794599258955@gmail.com` (Tài khoản sinh từ script E2E, 1 đơn CANCELLED).
6. `pkg_a_test@routine.vn` (Tài khoản thử nghiệm kiểm tra gói cước A, 0 đơn hàng).
7. `abc1@gmail.com` (Tài khoản test thủ công tên 'xy', 1 đơn CANCELLED).
8. `hihihi@gmail.com` (Tài khoản spam test thủ công, 7 đơn CANCELLED/CONFIRMED).
9. `nguoidepdatcang05@gmail.com` (Tài khoản test đơn lẻ, 1 đơn CANCELLED).

### 2. Danh sách 13 đơn hàng test đã xóa
1. `TEST-ORD-1794244043248` (Đơn hàng kiểm thử tự động, 0 sản phẩm, tổng tiền 100.000đ).
2. `TEST-ORD-1794597160524` (Đơn hàng kiểm thử tự động, 0 sản phẩm, tổng tiền 100.000đ).
3. `ORD-2026-0048` (Đơn hàng test của abc1@gmail.com).
4. `ORD-2026-0055` (Đơn hàng test của test_customer_1794599222692@gmail.com).
5. `ORD-2026-0056` (Đơn hàng test của test_customer_1794599258955@gmail.com).
6. `ORD-2026-0032` (Đơn hàng test của nguoidepdatcang05@gmail.com).
7. `ORD-2026-0034` (Đơn hàng test của hihihi@gmail.com).
8. `ORD-2026-0035` (Đơn hàng test của hihihi@gmail.com).
9. `ORD-2026-0036` (Đơn hàng test của hihihi@gmail.com).
10. `ORD-2026-0042` (Đơn hàng test của hihihi@gmail.com).
11. `ORD-2026-0043` (Đơn hàng test của hihihi@gmail.com).
12. `ORD-2026-0044` (Đơn hàng test của hihihi@gmail.com).
13. `ORD-2026-0045` (Đơn hàng test của hihihi@gmail.com).

### 3. Dữ liệu liên quan đã dọn dẹp theo tầng khóa ngoại
- **Order Items:** Đã xóa 25 bản ghi chi tiết đơn hàng tương ứng với 13 đơn trên.
- **Cart & Items:** Đã xóa 6 giỏ hàng và 8 sản phẩm trong giỏ của các tài khoản trên.
- **Wishlist & Items:** Đã xóa 3 wishlist và 2 mục yêu thích tương ứng.
- **Addresses:** 0 địa chỉ rác phát sinh ngoài lề.

---

## IV. BẢNG ĐỐI CHIẾU SỐ LIỆU TRƯỚC VÀ SAU LÀM SẠCH

| Thực thể dữ liệu | Trước dọn dẹp | Đã xóa | Sau dọn dẹp | Tỷ lệ bảo toàn dữ liệu thật |
| :--- | :---: | :---: | :---: | :---: |
| **Sản phẩm (Products)** | 38 | 0 | 38 | **100% Bảo toàn** |
| **Danh mục (Categories)** | 26 | 0 | 26 | **100% Bảo toàn** |
| **Cửa hàng (Stores)** | 25 | 0 | 25 | **100% Bảo toàn** |
| **Hình ảnh (Media Files)** | 96 | 0 | 96 | **100% Bảo toàn** |
| **Người dùng (Users)** | 12 | 9 | 3 | **100% Giữ tài khoản thật** |
| **Đơn hàng (Orders)** | 57 | 13 | 44 | **100% Giữ đơn hợp lệ** |
| **Chi tiết đơn (Order Items)** | 92 | 25 | 67 | **100% Giữ chi tiết hợp lệ** |

---

## V. XÁC NHẬN PHÂN LẬP MÔI TRƯỜNG VÀ AN TOÀN HỆ THỐNG
1. **Phân lập tuyệt đối:** Toàn bộ quá trình kiểm kê và làm sạch chỉ được thực thi trên môi trường thử nghiệm `routine_test_db`. Cơ sở dữ liệu gốc `defaultdb` không bị truy cập hay can thiệp.
2. **File sao lưu kiểm chứng:** File JSON sao lưu đã được lưu trữ vĩnh viễn và có thể phục hồi (rollback) bất kỳ thời điểm nào nếu có yêu cầu.
3. **Sẵn sàng cho bộ dữ liệu mô phỏng:** Hệ thống đã được làm sạch hoàn toàn khỏi các dữ liệu rác, tạo tiền đề vững chắc để nạp bộ dữ liệu mô phỏng vận hành 35 khách hàng và 75 đơn hàng theo Phần II.
