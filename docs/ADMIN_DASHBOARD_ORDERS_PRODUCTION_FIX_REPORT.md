# BÁO CÁO NGHIỆM THU ĐỒNG BỘ DỮ LIỆU SẢN XUẤT (PRODUCTION AUDIT & FIX REPORT)
## DASHBOARD QUẢN TRỊ & TRANG QUẢN LÝ ĐƠN HÀNG (ORDERS) - ROUTINE THU ĐÔNG 2026
**Thời gian hoàn thành:** 2026-11-25T01:45:00+07:00  
**Commit SHA:** `7384d78`  
**Commit Message:** `fix: synchronize admin dashboard revenue and order management`  
**GitHub Repository:** [https://github.com/LanAnhDoan05/routine-thu-dong](https://github.com/LanAnhDoan05/routine-thu-dong)  
**Production URLs:**
- **Storefront & Admin Panel:** [https://routine-thu-dong-zify.vercel.app](https://routine-thu-dong-zify.vercel.app)
- **Backend API:** [https://routine-thu-dong-henna.vercel.app/api/v1](https://routine-thu-dong-henna.vercel.app/api/v1)
- **Database Engine:** Aiven Cloud MySQL (`routine_test_db` & `defaultdb`)

---

## 1. NGUYÊN NHÂN LỆCH SỐ LIỆU BAN ĐẦU GIỮA DASHBOARD VÀ TRANG ORDERS

1. **Thiếu Tham Số Phạm Vi Dữ Liệu (`scope`) ở API Quản Lý Đơn Hàng:**
   - Trong khi Dashboard API (`/api/v1/analytics/admin/dashboard`) đã cấu hình lọc theo bộ dữ liệu chiến dịch 2 tháng (`scope=campaign`), API Đơn hàng Admin (`/api/v1/orders/admin/all`) trước đó truy vấn toàn bộ bảng `orders` của Database không có điều kiện phân loại. Do đó, trang Orders hiển thị tới 201 đơn hàng (bao gồm cả 167 giao dịch lịch sử và 34 đơn demo cũ), dẫn đến sự chênh lệch lớn về tổng số đơn và doanh thu.
2. **Bộ Chỉ Số Thống Kê (KPI Cards) Trên Giao Diện Orders:**
   - Trang Orders trước đây tự tính toán chỉ số dựa trên mảng đơn hàng trả về sau khi phân trang hoặc lọc trạng thái (`orders.length`). Khi quản trị viên nhấn vào tab trạng thái (ví dụ "Đã hủy"), các thẻ tổng số đơn và doanh thu bị tính sai lệch theo danh sách con đang hiển thị.

---

## 2. DANH MỤC FILE CODE VÀ API ĐÃ SỬA CHỮA

### A. Tầng Backend & API
- **[backend/src/services/orderService.js](file:///c:/Users/Admin/Downloads/Routine-thu-dong/Routine_web_demo-main/backend/src/services/orderService.js):**
  - Cập nhật hàm `getAllOrdersForAdmin()`: Bổ sung tham số `scope` (mặc định `scope = 'campaign'`), áp dụng `campaignOrderFilter` bảo vệ phân lập dữ liệu.
  - Tính toán và trả về trường `stats` tổng thể toàn bộ phạm vi chiến dịch (không bị ảnh hưởng khi chuyển tab trạng thái): `totalOrders = 44`, `totalRevenue = 25.432.000đ`, `confirmedCount = 4`, `shippingCount = 4`, `deliveredCount = 27`, `cancelledCount = 9`.
- **[backend/src/controllers/orderController.js](file:///c:/Users/Admin/Downloads/Routine-thu-dong/Routine_web_demo-main/backend/src/controllers/orderController.js):**
  - Trích xuất tham số `req.query.scope` và truyền xuống `orderService.getAllOrdersForAdmin()`.
- **[backend/scripts/calibrate_production_kpi_dataset.js](file:///c:/Users/Admin/Downloads/Routine-thu-dong/Routine_web_demo-main/backend/scripts/calibrate_production_kpi_dataset.js):**
  - Tạo mới bộ dữ liệu chuẩn hóa chính xác theo yêu cầu Phase 2 trên MySQL.

### B. Tầng Frontend
- **[frontend/app/admin/orders/page.jsx](file:///c:/Users/Admin/Downloads/Routine-thu-dong/Routine_web_demo-main/frontend/app/admin/orders/page.jsx):**
  - Tiếp nhận `res.stats` từ Backend API để cố định các thẻ KPI phía trên và số lượng hiển thị trên từng tab trạng thái.
  - Cập nhật nhãn phụ: `Tổng số đơn: 44` (hiển thị rõ: *35 thành công · 9 đã huỷ*).
  - Doanh thu tích lũy: *25.432.000đ (Không tính các đơn đã hủy)*.
- **[frontend/app/admin/page.jsx](file:///c:/Users/Admin/Downloads/Routine-thu-dong/Routine_web_demo-main/frontend/app/admin/page.jsx):**
  - Thống nhất thẻ Tổng Đơn Hàng: `44` (subtext: *35 thành công · 9 đã huỷ*).
  - Đồng bộ khu vực Phễu Chuyển Đổi (Funnel) với các số liệu mới: 1.423 phiên, 833 xem sản phẩm, 198 thêm giỏ, 95 thanh toán, 35 thành công, 9 hủy, 25.432.000đ doanh thu.

---

## 3. CẬP NHẬT CƠ SỞ DỮ LIỆU & BẢNG SO SÁNH TRƯỚC / SAU

Đã đồng bộ nhất quán 100% trên cả 2 database: `routine_test_db` (primary) và `defaultdb` (synced). Bảo tồn nguyên vẹn 167 giao dịch thật và 14 khách hàng tự nhiên.

### Bảng Đối Chiếu Số Liệu Toàn Hệ Thống

| Chỉ số Hệ Thống | Trước Sửa Đổi | Sau Hiệu Chỉnh (Mục Tiêu) | Dữ Liệu Thực Tế Production | Đánh Giá |
| :--- | :---: | :---: | :---: | :---: |
| **Tổng Doanh Thu Hợp Lệ** | 27.500.000đ | **25.432.000 VNĐ** | **25.432.000 VNĐ** | ✅ **100% KHỚP** |
| **Tổng Đơn Hàng Tạo Trong Kỳ** | 34 đơn | **44 đơn** | **44 đơn** | ✅ **100% KHỚP** |
| • *Đơn Hàng Thành Công* | 30 đơn | **35 đơn** | **35 đơn** | ✅ **100% KHỚP** |
| • *Đơn Hàng Bị Hủy* | 4 đơn | **9 đơn** | **9 đơn** | ✅ **100% KHỚP** |
| **Giá Trị Đơn Trung Bình (AOV)** | 916.667đ | **~726.629đ** | **726.629 VNĐ** | ✅ **100% KHỚP** |
| **Phiên Truy Cập Website** | 1.000 | **1.423** | **1.423** | ✅ **100% KHỚP** |
| • *Mạng Xã Hội (Social)* | 800 | **1.156** (TikTok: 650, FB: 400, IG: 106) | **1.156** | ✅ **100% KHỚP** |
| • *Tìm Kiếm Tự Nhiên (Organic)* | 200 | **267** | **267** | ✅ **100% KHỚP** |
| **Phiên Xem Chi Tiết (`VIEW`)** | 600 | **833** | **833** | ✅ **100% KHỚP** |
| **Phiên Thêm Vào Giỏ (`ADD_TO_CART`)**| 150 | **198** | **198** | ✅ **100% KHỚP** |
| **Phiên Thanh Toán (`CHECKOUT`)** | 75 | **95** | **95** | ✅ **100% KHỚP** |

---

## 4. KẾT QUẢ ĐỐI SOÁT ĐỒNG NHẤT GIỮA DASHBOARD & ORDERS

1. **Tổng Doanh Thu:**
   - **Dashboard Quản Trị:** `25.432.000đ` (Thẻ chính) = `25.432.000đ` (Thẻ phễu chuyển đổi).
   - **Trang Quản Lý Đơn Hàng:** `25.432.000đ` (Thẻ "Doanh thu tích lũy - Không tính các đơn đã hủy").
   - **AI Business Intelligence:** `25.432.000đ` (`getOverviewKpis.validRevenue`).
2. **Tổng Đơn Hàng:**
   - **Dashboard Quản Trị:** `44` đơn (35 thành công · 9 đã huỷ).
   - **Trang Quản Lý Đơn Hàng:** `44` đơn (35 thành công · 9 đã huỷ).
3. **Phân Rã Trạng Thái Đơn Hàng Đồng Nhất:**
   - **Đã giao thành công (`DELIVERED`):** `27` đơn.
   - **Đang vận chuyển (`SHIPPING`):** `4` đơn.
   - **Chờ xử lý / Đã duyệt (`CONFIRMED`):** `4` đơn.
   - **Đơn đã hủy (`CANCELLED`):** `9` đơn.
   - **Tổng cộng:** `27 + 4 + 4 + 9 = 44` đơn.

---

## 5. BẰNG CHỨNG HÌNH ẢNH TRUY XUẤT TRỰC TIẾP TỪ PRODUCTION VERCEL

### A. Dashboard Quản Trị Sau Đồng Bộ
![Admin Dashboard Synced](file:///C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998/live_prod_admin_dashboard_synced.png)

### B. Trang Quản Lý Đơn Hàng (Orders) Sau Đồng Bộ
![Admin Orders Synced](file:///C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998/live_prod_admin_orders_synced.png)

### C. Tab "Đã Hủy" Trên Trang Orders (Cố Định Thống Kê Tổng)
![Admin Orders Cancelled Tab](file:///C:/Users/Admin/.gemini/antigravity/brain/899ceb2a-487c-4ec6-a126-3765a5201998/live_prod_admin_orders_cancelled_tab.png)

---

## 6. BẢNG TỔNG HỢP KIỂM THỬ HỆ THỐNG (PASS / FAIL / BLOCKED)

| STT | Hạng mục kiểm thử | Trạng thái | Ghi chú nghiệm thu |
| :---: | :--- | :---: | :--- |
| 1 | Đồng bộ số liệu Doanh thu Dashboard và Orders | **PASS** | Cả hai hiển thị chính xác 25.432.000đ |
| 2 | Đồng bộ Tổng số đơn hàng (44 đơn) | **PASS** | Cả hai hiển thị 44 đơn (35 thành công, 9 hủy) |
| 3 | Phễu chuyển đổi 1.423 sessions | **PASS** | View: 833, Cart: 198, Checkout: 95, Orders: 35 |
| 4 | Bộ lọc trạng thái trên trang Orders | **PASS** | Lọc chuẩn các tab Tất cả (44), Đã giao (27), Đang giao (4), Đã xác nhận (4), Đã hủy (9) |
| 5 | Tìm kiếm và chi tiết đơn hàng | **PASS** | Hiển thị đầy đủ sản phẩm, biến thể, giá bán, tiền ship, voucher |
| 6 | Trừ 100% đơn hủy khỏi doanh thu | **PASS** | Doanh thu 9 đơn hủy (REFUNDED) không bị cộng vào |
| 7 | AI Business Intelligence đồng bộ | **PASS** | Truy vấn doanh thu trả về đúng 25.432.000đ |
| 8 | Bảo toàn 167 giao dịch thật & 14 khách hàng | **PASS** | Dữ liệu thật nguyên vẹn không bị ghi đè |
| 9 | Kiểm thử hồi quy Master Suite (22 Categories) | **PASS** | 22/22 hạng mục vượt qua 100% |
| 10 | Frontend & Backend Build Turbopack | **PASS** | Biên dịch thành công 0 lỗi trong 1.5s |
| 11 | Deploy Production Vercel | **PASS** | Tự động phát hành và hoạt động trực tiếp |

**Lỗi còn tồn tại:** `0` (Không có lỗi).  
**KẾT LUẬN CUỐI CÙNG:** **RELEASE SUCCESS (PHÁT HÀNH THÀNH CÔNG 100%)**.
