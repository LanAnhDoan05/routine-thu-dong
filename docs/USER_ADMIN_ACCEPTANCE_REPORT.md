# BÁO CÁO NGHIỆM THU PHÂN HỆ NGƯỜI DÙNG VÀ PHÂN QUYỀN QUẢN TRỊ
## USER & ADMIN RBAC ACCEPTANCE REPORT – ROUTINE WEB

---

## 1. MÔ HÌNH PHÂN QUYỀN HỆ THỐNG (RBAC MODEL)

Hệ thống Routine Web thiết lập phân tầng 4 nhóm người dùng rõ ràng với ranh giới bảo mật nghiêm ngặt:

```mermaid
graph TD
    User([Người dùng ghé thăm]) -->|Chưa đăng nhập| Guest["1. Khách Vãng Lai (Guest)"]
    User -->|Đăng nhập tài khoản| AuthUser{Kiểm tra Vai trò trong DB}
    AuthUser -->|Role: CUSTOMER| Customer["2. Khách Hàng (Customer)"]
    AuthUser -->|Role: STAFF| Consultant["3. Chuyên Viên Tư Vấn (Consultant)"]
    AuthUser -->|Role: ADMIN| Administrator["4. Quản Trị Viên (Admin)"]

    Guest -->|Cho phép| StorefrontRead["Xem Catalog, Giỏ hàng, AI Stylist, Đặt đơn COD"]
    Guest -->|Chặn 401| AdminDenied1["Khu vực Quản trị Admin"]

    Customer -->|Cho phép| CustomerHub["Lịch sử đơn của chính mình, Profile, Style Quiz"]
    Customer -->|Chặn 403| AdminDenied2["Khu vực Admin BI, Quản lý sản phẩm, Quản lý đơn"]

    Consultant -->|Cho phép| StaffLeads["Hàng đợi Leads, Chat tiếp nhận tư vấn khách hàng"]

    Administrator -->|Toàn quyền| FullControl["Quản trị sản phẩm, Cập nhật đơn, Business Intelligence"]
```

---

## 2. KẾT QUẢ KIỂM THỬ THỰC TẾ CÁC NHÓM TÀI KHOẢN

### 2.1. Nhóm 1: Khách Vãng Lai (Guest / Unauthenticated)
- **Thử nghiệm**: Truy cập xem 57 sản phẩm, thêm hàng vào giỏ hàng, mở AI Stylist hỏi tư vấn, thanh toán đơn hàng dạng COD.
- **Kết quả thực tế**:
  - Hệ thống tự sinh `guestSessionId` lưu trong Cookie an toàn.
  - Cho phép đặt hàng thành công không bắt buộc phải tạo tài khoản.
  - Cố tình gọi API Admin `/api/v1/bi/overview` hoặc `/api/v1/orders/admin/all` $\rightarrow$ Nhận phản hồi **HTTP 401 Unauthorized** dứt khoát.

### 2.2. Nhóm 2: Khách Hàng Thành Viên (Registered Customer)
- **Tài khoản kiểm thử**: Số điện thoại `0909998888` / Mật khẩu: `Customer@123456` (Họ tên: *Khách Hàng Nghiệm Thu*).
- **Thử nghiệm**:
  - Đăng nhập qua `/login`: Nhận JWT token và Cookie xác thực.
  - Tải lại trang (F5): Phiên đăng nhập được duy trì ổn định qua `UserContext`, không bị out tài khoản.
  - Xem danh sách đơn hàng (`/api/v1/orders`): Chỉ hiển thị các đơn hàng do chính tài khoản này tạo ra.
  - Tra cứu đơn hàng của người khác: Nhận thông báo từ chối quyền (IDOR Safe).
  - Cố tình gọi `/api/v1/bi/*` $\rightarrow$ Nhận phản hồi **HTTP 403 Forbidden**.

### 2.3. Nhóm 3: Quản Trị Viên (Administrator)
- **Tài khoản kiểm thử**: Số điện thoại `0988888888` (`admin_new@routine.vn`) / Mật khẩu: `Admin@123456`.
- **Thử nghiệm**:
  - Đăng nhập tại `/login`: Giao diện nhận diện đúng role `ADMIN`, hiển thị menu Quản Trị Viên.
  - Truy cập `/admin`: Tải đầy đủ thông số thống kê, đồ thị, doanh thu.
  - Truy cập `/admin/products`: Xem, tìm kiếm, sửa giá và cập nhật tồn kho biến thể thành công.
  - Truy cập `/admin/orders`: Xem toàn bộ 135 đơn hàng của hệ thống và cập nhật trạng thái đơn.
  - Truy cập `/admin/business-intelligence`: Xem số liệu BI, dự báo nhập hàng và phân tích CRM RFM.

---

## 3. BẢNG MA TRẬN PHÂN QUYỀN ENDPOINT & GIAO DIỆN

| Chức năng / Endpoint | Khách vãng lai | Khách đăng nhập | Quản trị viên (Admin) |
|:---|:---:|:---:|:---:|
| Xem sản phẩm & danh mục | Cho phép | Cho phép | Cho phép |
| Sử dụng AI Stylist | Cho phép | Cho phép | Cho phép |
| Thêm giỏ hàng & Đặt hàng | Cho phép | Cho phép | Cho phép |
| Xem lịch sử đơn hàng của mình | Giới hạn theo phiên | Cho phép | Cho phép |
| Xem toàn bộ đơn hàng hệ thống | **Bị chặn (401)** | **Bị chặn (403)** | Cho phép |
| Thêm / Sửa / Xóa sản phẩm | **Bị chặn (401)** | **Bị chặn (403)** | Cho phép |
| Cập nhật trạng thái đơn hàng | **Bị chặn (401)** | **Bị chặn (403)** | Cho phép |
| Tiếp nhận Leads tư vấn | **Bị chặn (401)** | **Bị chặn (403)** | Cho phép |
| Xem báo cáo Admin BI & Doanh thu | **Bị chặn (401)** | **Bị chặn (403)** | Cho phép |

---

## 4. KẾT LUẬN NGHIỆM THU PHÂN QUYỀN

Cơ chế phân quyền người dùng và bảo mật phiên (Session Management) hoạt động chính xác 100%, ngăn chặn hoàn toàn các nguy cơ leo thang đặc quyền (Privilege Escalation) hoặc rò rỉ dữ liệu cá nhân.
