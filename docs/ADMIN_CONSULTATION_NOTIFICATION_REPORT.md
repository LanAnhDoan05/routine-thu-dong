# BÁO CÁO HỆ THỐNG THÔNG BÁO VÀ TIẾP NHẬN YÊU CẦU TƯ VẤN CHO QUẢN TRỊ VIÊN (ADMIN NOTIFICATION) – ROUTINE WEB

**Dự án**: Routine E-Commerce Platform  
**Phiên bản**: 2.0.0-PROD  
**Phạm vi**: Realtime SSE Service, Notification Context, Admin Leads View  
**Ngày thực hiện**: 14/11/2026  
**Trạng thái**: ✅ **HOẠT ĐỘNG HOÀN HẢO THEO THỜI GIAN THỰC**

---

## 1. TỔNG QUAN HỆ THỐNG THÔNG BÁO

Khi khách hàng đồng ý kết nối với chuyên viên tư vấn sau 5 lượt tương tác với AI Stylist, thông báo cần được chuyển tới đội ngũ chuyên viên bán hàng tại trang quản trị Admin ngay lập tức mà không yêu cầu làm mới trình duyệt.

Hệ thống sử dụng công nghệ **Server-Sent Events (SSE)** kết nối trực tiếp giữa Backend Express và Frontend Next.js Admin Panel thông qua kênh phát `ADMIN`.

---

## 2. CẤU TRÚC GÓI TIN THÔNG BÁO THỜI GIAN THỰC

### 2.1. Sự kiện `CONSULTATION_REQUESTED`
Khi khách hàng xác nhận kết nối, Backend phát sự kiện với payload đầy đủ:
```json
{
  "conversationId": "c6874c88-af8f-4204-9737-84750ce04917",
  "turnCount": 5,
  "userId": null,
  "guestSessionId": "test_chat_session_001",
  "customerName": "Khách vãng lai",
  "customerEmail": null,
  "customerPhone": null,
  "interestedProducts": [
    "Áo Polo Nam Ngắn Tay Cotton Poly Form Fitted Premium (Easy Buy)",
    "Túi tote demin kẻ sọc Freesize"
  ],
  "status": "LEAD_PENDING",
  "reason": "Khách hàng Khách vãng lai yêu cầu kết nối chuyên viên sau 5 lượt trao đổi với AI Stylist.",
  "timestamp": "2026-11-14T06:46:50.120Z"
}
```

### 2.2. Xử lý tại Frontend Admin (`RealtimeContext.jsx` & `admin/leads/page.jsx`)
1. **Lắng nghe sự kiện**: `RealtimeContext` đã được bổ sung sự kiện `"CONSULTATION_REQUESTED"`, tự động dispatch `CustomEvent("routine:consultation_requested")` lên cửa sổ trình duyệt.
2. **Hiển thị Toast Notification**: Khi sự kiện đến, trang hiển thị thông báo toast màu xanh/xanh dương:
   `🛎️ Yêu cầu tư vấn mới từ Khách vãng lai (5 lượt trao đổi với AI)`
3. **Tự động làm mới danh sách**: Gọi `loadLeads()` tự động nạp yêu cầu tư vấn mới vào hàng đợi `LEAD_PENDING` mà chuyên viên không cần ấn F5.

---

## 3. GIAO DIỆN QUẢN LÝ HÀNG ĐỢI TƯ VẤN (`/admin/leads`)

Trang quản trị cung cấp quy trình 3 bước trực quan:

```
[Danh sách Yêu cầu tư vấn]           [Khung chi tiết & Chat hợp nhất]
┌─────────────────────────────────┐   ┌─────────────────────────────────────────┐
│ Khách vãng lai        47/100    │   │ Khách vãng lai                          │
│ Đang tư vấn • 5 lượt tư vấn    │   │ Khách chưa đăng nhập                    │
│ Tư vấn cho mình phụ kiện...     │   │ Trạng thái: [Đang tư vấn]               │
├─────────────────────────────────┤   ├─────────────────────────────────────────┤
│ xuân anh              100/100   │   │ LỊCH SỬ TƯ VẤN:                         │
│ Chờ tiếp nhận • 1 lượt tư vấn   │   │ [Khách]: Tìm áo thun nam mùa hè...      │
│ Gặp nhân viên tư vấn ngay...    │   │ [AI]: Routine gợi ý áo Polo...          │
└─────────────────────────────────┘   │ [Chuyên viên]: Chào bạn! Mình kiểm tra..│
                                      ├─────────────────────────────────────────┤
                                      │ [ Nhập tin nhắn tư vấn... ]  [ Gửi ]    │
                                      └─────────────────────────────────────────┘
```

1. **Bộ lọc trạng thái linh hoạt**:
   - `Tất cả`: Xem toàn bộ yêu cầu.
   - `Chờ tiếp nhận` (`LEAD_PENDING`): Các khách hàng vừa đồng ý chuyển tiếp, đang chờ nhân viên phản hồi.
   - `Đang tư vấn` (`IN_PROGRESS`): Các phiên tư vấn đang được chuyên viên hỗ trợ trực tiếp.
   - `Đã đóng` (`CLOSED`): Các phiên tư vấn đã giải quyết xong hoặc khách hàng đã chốt đơn thành công.
2. **Huy hiệu lượt tư vấn**:
   Mỗi thẻ lead hiển thị rõ ràng số lượt trao đổi: `• 5 lượt tư vấn với AI`, giúp chuyên viên nắm bắt mức độ quan tâm của khách hàng trước khi trả lời.
3. **Hành động chuyển trạng thái**:
   - Nút `Nhận tư vấn`: Chuyển ngay từ `LEAD_PENDING` sang `IN_PROGRESS`.
   - Nút `Đóng yêu cầu`: Kết thúc phiên tư vấn khi khách hàng đã hoàn tất mua sắm.
   - Nút `Mở lại`: Mở lại phiên nếu khách có câu hỏi phát sinh.

---

## 4. KẾT QUẢ XÁC NHẬN BẰNG BROWSER SUBAGENT

Subagent kiểm thử giao diện `8524b228-3008-4e9c-994a-7c3055bf2d0d` đã truy cập trực tiếp `http://localhost:3000/admin/leads` và chụp ảnh bằng chứng:
- **Tệp bằng chứng**: `acceptance_evidence/admin_leads_turn_count.png`.
- **Hàng đợi hiển thị**: 6 yêu cầu tư vấn thực tế.
- **Huy hiệu hiển thị chuẩn**:
  - Lead 1: `Khách vãng lai` (47/100) -> `Đang tư vấn • 5 lượt tư vấn với AI`.
  - Lead 2: `xuân anh` (100/100) -> `Chờ tiếp nhận • 1 lượt tư vấn với AI`.
  - Lead 3: `xuân anh` (100/100) -> `Đang tư vấn • 1 lượt tư vấn với AI`.
- **Phản hồi realtime**: Nhận sự kiện tức thì qua SSE stream (`/api/v1/realtime/stream`).
