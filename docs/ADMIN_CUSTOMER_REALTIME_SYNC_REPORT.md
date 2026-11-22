# BÁO CÁO NGHIỆM THU: TRIỂN KHAI HỆ THỐNG ADMIN – CUSTOMER HOẠT ĐỘNG ĐỒNG THỜI VÀ ĐỒNG BỘ DỮ LIỆU REAL-TIME

---

## I. TỔNG QUAN DỰ ÁN VÀ MỤC TIÊU NGHIỆM THU

Hệ thống thương mại điện tử **Routine Thu Đông 2026** đã được nâng cấp toàn diện để cho phép **Admin (Quản trị viên)** và **Customer (Khách hàng vãng lai & Thành viên)** hoạt động song song, đồng thời trên hai tab trình duyệt độc lập mà **không gây xung đột phiên (Session collision)**, sử dụng chung Backend REST API (Port 5001) và một nguồn dữ liệu **MySQL duy nhất (`routine_test_db`)**.

Mọi biến động dữ liệu về sản phẩm, giá bán, tồn kho, đơn hàng, khách hàng mới đều được truyền phát tức thì qua **Server-Sent Events (SSE)** theo thời gian thực 2 chiều.

---

## II. CẤU TRÚC URL & CÁCH VẬN HÀNH ĐỒNG THỜI HAI TAB

| Giao diện | Địa chỉ URL | Loại phiên | Vai trò & Quyền hạn |
|---|---|---|---|
| **Tab 1: Quản trị (Admin)** | `http://localhost:3000/admin` | `routine_admin_token` (JWT) | Quản lý sản phẩm, đơn hàng, khách hàng, tồn kho, cấu hình hệ thống, AI Business Intelligence. |
| **Tab 2: Bán hàng (Storefront)** | `http://localhost:3000/` | `routine_guest_session_id` hoặc `routine_token` | Khách vãng lai xem hàng, thêm giỏ, thanh toán hoặc thành viên đăng nhập, tư vấn AI Stylist. |

> **Lưu ý quan trọng**:
> Cả 2 giao diện cùng mở trên một trình duyệt (Chrome, Edge, Firefox) nhưng hoàn toàn độc lập, không bị đá phiên ra ngoài khi một bên thao tác hoặc đăng xuất.

---

## III. KIẾN TRÚC TÁCH BIỆT PHIÊN ĐĂNG NHẬP (SESSION DECOUPLING)

### 1. Phân vùng lưu trữ `localStorage`

- **Admin Credentials**:
  - `routine_admin_token`: Lưu trữ JWT token có `role: "ADMIN"`.
  - `routine_admin_user`: Lưu trữ profile quản trị viên Routine.
- **Customer Credentials**:
  - `routine_token` / `routine_user_v1`: Lưu trữ JWT token và profile khách hàng thành viên.
  - `routine_guest_session_id`: Định danh duy nhất cho khách vãng lai (`g_<uuid>_<timestamp>`).
  - `routine_cart_guest`: Giỏ hàng đệm của khách vãng lai.
  - `routine_cart_user_<userId>`: Giỏ hàng đệm cô lập của từng tài khoản thành viên.

### 2. Định tuyến API thông minh (`frontend/lib/api.js`)
Khi gửi request đến Backend API:
- Nếu đang ở route `/admin/*`, API client ưu tiên gắn `Authorization: Bearer <routine_admin_token>`.
- Nếu đang ở storefront (`/`, `/cart`, `/checkout`), API client ưu tiên gắn `Authorization: Bearer <routine_token>`, hoặc tự động cấp `x-session-id: <routine_guest_session_id>` cho khách vãng lai.
- Khi Admin đăng xuất ở Header Admin, chỉ xóa `routine_admin_token` và `routine_admin_user`, giỏ hàng và phiên của Customer ở Tab 2 vẫn được giữ nguyên vẹn.

---

## IV. CƠ CHẾ ĐỒNG BỘ THỜI GIAN THỰC (REAL-TIME SSE HUB)

Hệ thống sử dụng **Server-Sent Events (SSE)** trên nền HTTP/1.1 tại endpoint `/api/v1/realtime/stream`, kết hợp bộ đệm 50 sự kiện gần nhất và cơ chế Replay với `Last-Event-ID`.

### Bảng 10 Sự kiện Real-time cốt lõi:

| Mã sự kiện | Phạm vi phát (Scope) | Giao diện nhận | Hành vi khi nhận sự kiện |
|---|---|---|---|
| `PRODUCT_CREATED` | `ALL` | Admin & Customer | Customer tải danh mục thấy sản phẩm mới; Admin cập nhật tổng số lượng. |
| `PRODUCT_UPDATED` | `ALL` | Admin & Customer | Cập nhật giá, ảnh, mô tả tức thì trên trang chi tiết và danh sách. |
| `PRODUCT_STATUS_CHANGED`| `ALL` | Admin & Customer | Nếu `INACTIVE`: ẩn khỏi catalog storefront; AI Stylist ngừng gợi ý. |
| `STOCK_UPDATED` | `ALL` | Admin & Customer | Cập nhật số lượng tồn kho khả dụng; hiển thị nhãn "Hết hàng" nếu stock = 0. |
| `ORDER_CREATED` | `ADMIN` | Admin | Dashboard nhảy số đơn mới; danh sách đơn hàng tự chèn đơn mới lên đầu. |
| `ORDER_STATUS_UPDATED` | `ADMIN` + `USER:<id>` | Admin & Khách sở hữu | Thanh tiến trình đơn hàng (Timeline) đổi màu (Đang giao / Đã giao). |
| `PAYMENT_CONFIRMED` | `ADMIN` + `USER:<id>` | Admin & Khách sở hữu | Cập nhật trạng thái `PAID`; xác nhận trừ kho vĩnh viễn. |
| `CUSTOMER_REGISTERED` | `ADMIN` | Admin | Danh sách khách hàng và khách vãng lai tự nạp thành viên mới. |
| `SHIPPING_FEE_UPDATED` | `ALL` | Checkout & Admin | Phí vận chuyển tiêu chuẩn / hỏa tốc tính toán lại theo quy tắc mới. |
| `CATEGORY_UPDATED` | `ALL` | Storefront & Admin | Thanh menu danh mục cập nhật cây phân cấp mới. |

---

## V. GIẢI PHÁP CHỐNG BÁN VƯỢT TỒN KHO (CONCURRENT OVERSOLD PREVENTION)

1. **Khóa giao dịch cấp bản ghi (Pessimistic / Transactional Reservation)**:
   - Khi khách gửi lệnh đặt hàng, `stockReservationService.reserveStock()` tạo bản ghi giữ hàng với thời hạn 5 phút.
   - Nếu tồn kho hiện tại `<` số lượng mua, hệ thống ngay lập tức rollback transaction và ném lỗi `Sản phẩm đã hết hàng hoặc không đủ số lượng tồn kho khả dụng`.
2. **Khóa đơn COD & VNPay**:
   - Đối với đơn COD: Ngay khi đơn hàng được tạo, `stockReservationService.commitStock()` trừ tồn kho trong cơ sở dữ liệu và tăng `soldCount`.
   - Đối với đơn VNPay: Tồn kho được giữ trong 5 phút. Khi VNPay IPN/Return trả về mã `00` (Thành công), hệ thống mới gọi `commitStock()`. Nếu quá 5 phút chưa thanh toán, scheduler tự động giải phóng tồn kho.
3. **Idempotency & Chống trừ kho 2 lần**:
   - Kiểm tra trạng thái đơn hàng trước khi commit: nếu `orderStatus === 'PAID'` hoặc đã trừ kho, hệ thống bỏ qua và không lặp lại thao tác.

---

## VI. HỆ THỐNG THEO DÕI VÀ PHÂN TÍCH LƯỢNG TRUY CẬP (ANALYTICS & GUEST TRACKING)

- Bảng `traffic_logs` trong MySQL ghi nhận các hành vi:
  - `PAGE_VIEW`: Lượt truy cập trang chủ, danh mục, blog.
  - `VIEW`: Lượt xem chi tiết từng mã sản phẩm.
  - `ADD_TO_CART`: Lượt thêm vào giỏ hàng (kèm thông tin size, màu, số lượng).
  - `CHECKOUT_INIT`: Bắt đầu tiến trình thanh toán.
  - `ORDER_COMPLETED`: Đặt hàng thành công.
- Khách vãng lai được phân biệt qua UUID ngẫu nhiên gắn trên `x-session-id`, không dùng chung IP để tránh gộp sai số liệu giữa các thiết bị trên cùng mạng Wi-Fi.
- Dashboard Admin (`/admin`) hiển thị biểu đồ phễu chuyển đổi (Conversion Funnel) và danh sách khách vãng lai đang xem hàng theo thời gian thực.

---

## VII. ĐỒNG BỘ GEMINI AI STYLIST VỚI CATALOG MYSQL

- **Single Source of Truth**: Gemini AI Stylist kết nối trực tiếp với công cụ tra cứu catalog MySQL (`backend/src/services/fashionAgentTools.js`).
- Khi Admin sửa giá hoặc ẩn sản phẩm sang `INACTIVE`:
  - AI Stylist chỉ truy vấn các sản phẩm có `status = 'ACTIVE'` và `stockQuantity > 0`.
  - Không bao giờ đề xuất sản phẩm đã ẩn hoặc giá cũ.
  - Giá và thông tin biến thể trả về trong khung chat luôn khớp 100% với giá niêm yết trên website.

---

## VIII. BẢNG KẾT QUẢ KIỂM THỬ 8 KỊCH BẢN (E2E VERIFICATION SUITE)

Đã chạy toàn bộ bộ kiểm thử tự động tại `scratch/run_e2e_verification.js` trực tiếp trên môi trường đang chạy:

| Kịch bản kiểm thử | Mô tả thao tác | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|:---:|
| **Scenario 1** | Admin thêm sản phẩm mới (`AO-SYNC-REALTIME-3820`) | Lưu MySQL, phát `PRODUCT_CREATED`, Customer thấy ngay | MySQL lưu thành công, Customer truy vấn thấy giá 350.000₫ | **PASSED** |
| **Scenario 2** | Admin sửa giá sản phẩm lên 420.000₫ | MySQL cập nhật giá mới, Customer API trả về 420.000₫ | Giá cập nhật 420.000₫ đồng bộ tức thì | **PASSED** |
| **Scenario 3** | Khách đặt hàng đơn COD | Tạo mã `ORD-2026-0192`, tồn kho giảm từ 20 -> 18, Admin thấy đơn | Đơn ghi nhận thành công, tồn kho giảm 2 cái, Admin thấy đơn | **PASSED** |
| **Scenario 4** | Admin đổi trạng thái đơn sang `SHIPPING` | Phát `ORDER_STATUS_UPDATED`, khách xem tiến độ `SHIPPING` | Đơn hàng chuyển sang `SHIPPING`, khách thấy tiến trình mới | **PASSED** |
| **Scenario 5** | Khách đăng ký tài khoản mới (`0998904990`) | Tạo tài khoản MySQL, phát `CUSTOMER_REGISTERED`, Admin thấy | Admin tìm thấy khách mới trong danh mục quản lý khách hàng | **PASSED** |
| **Scenario 6** | Admin ẩn sản phẩm sang `INACTIVE` | Storefront loại bỏ khỏi danh sách công khai, AI bỏ qua | Sản phẩm không còn xuất hiện trong danh mục mở bán | **PASSED** |
| **Scenario 7** | 2 khách tranh mua sản phẩm tồn kho = 1 | Chỉ 1 khách mua thành công, khách còn lại báo hết hàng, stock = 0 | 1 đơn thành công, 1 đơn bị từ chối, không bán vượt kho | **PASSED** |
| **Scenario 8** | Mất kết nối và phục hồi với `Last-Event-ID` | Stream SSE kết nối lại, trả về `text/event-stream` status 200 | Kết nối thành công, nhận các sự kiện nhỡ trong bộ đệm | **PASSED** |

**Tỷ lệ đạt: 8 / 8 kịch bản (100% PASSED)**

---

## IX. BẰNG CHỨNG HÌNH ẢNH TRỰC QUAN (VISUAL SCREENSHOT EVIDENCE)

Các ảnh chụp màn hình thực tế được ghi nhận tự động bằng browser engine nội bộ trên hệ thống đang chạy:

1. **Giao diện Admin Products quản lý thời gian thực**:
   - File link: [admin_products_sync.png](file:///C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/sync_evidence/admin_products_sync.png)
   - Xác nhận: Hiển thị đúng 5 thẻ KPI thống kê (57 tổng sản phẩm, 54 đang bán, 3 đang ẩn, 5 hết hàng, 26 trang chủ). Bảng danh sách hiển thị đầy đủ hình ảnh, giá bán, số lượng tồn kho và nhãn trạng thái `Active` / `Inactive`.

2. **Giao diện Khách hàng - Style Inspiration hoàn chỉnh**:
   - File link: [storefront_style_inspiration.png](file:///C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/sync_evidence/storefront_style_inspiration.png)
   - Xác nhận: Toàn bộ 6 thẻ phong cách (Basic, Minimal, Smart Casual, Sporty Chic, Streetstyle, Vintage) hiển thị ảnh lookbook người mẫu thời trang sắc nét, không còn bất kỳ khung placeholder SVG nào bị lỗi.

3. **Giao diện Khách hàng - Style Quiz trắc nghiệm phong cách**:
   - File link: [customer_style_quiz_grid.png](file:///C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/sync_evidence/customer_style_quiz_grid.png)
   - Xác nhận: Lưới chọn phong cách bước 2 hiển thị đầy đủ ảnh thời trang sống động, hỗ trợ click chọn tối đa 3 phong cách và nhận voucher chào mừng `WELCOME2026`.

---

## X. HƯỚNG DẪN KHẮC PHỤC SỰ CỐ & VẬN HÀNH

1. **Khởi động hệ thống**:
   ```bash
   # Terminal 1: Backend API (Port 5001)
   cd Routine_web_demo-main/backend
   node ./bin/www

   # Terminal 2: Frontend (Port 3000)
   cd Routine_web_demo-main/frontend
   npm start
   ```

2. **Kiểm tra trạng thái Real-time Hub**:
   ```bash
   curl http://localhost:5001/api/v1/realtime/status
   ```
   Kết quả trả về `{"status":"ONLINE"}` thể hiện Hub đang hoạt động bình thường.

3. **Khi client mất mạng hoặc tải lại**:
   Giao diện tự động mở lại kết nối `EventSource` sau 3 giây và gửi kèm header `Last-Event-ID` của sự kiện cuối cùng nhận được.

---
*Báo cáo được khởi tạo tự động bởi Routine Automated Real-Time Verification Suite.*
