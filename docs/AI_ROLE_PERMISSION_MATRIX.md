# MA TRẬN VAI TRÒ VÀ QUYỀN HẠN HỆ THỐNG AI (ROUTINE WEB)
## ROLE & PERMISSION MATRIX: CUSTOMER AI VS. ADMIN AI

---

## 1. NGUYÊN TẮC PHÂN CHIA VAI TRÒ TỔNG THỂ

Hệ thống Routine Web nghiêm cấm mô hình AI dùng chung quyền hạn không giới hạn. Mọi hoạt động của AI phải được phân định rõ ràng giữa hai không gian chức năng:
1. **Customer AI (Trợ lý mua sắm khách hàng)**: Tích hợp tại Storefront, chỉ phục vụ trải nghiệm xem sản phẩm, phối đồ, giỏ hàng, vận chuyển và kết nối hỗ trợ.
2. **Admin AI (Trợ lý điều hành quản trị viên)**: Tích hợp tại Admin Panel, phục vụ phân tích số liệu tài chính, quản lý tồn kho, hành vi khách hàng và chiến lược kinh doanh.

---

## 2. BẢNG MA TRẬN PHÂN QUYỀN CHI TIẾT (ROLE-BASED ACCESS CONTROL)

| Nhóm nghiệp vụ | Chức năng cụ thể | Customer AI (Storefront) | Admin AI (Admin Panel) | Cơ chế kiểm soát Backend |
|:---|:---|:---:|:---:|:---|
| **Sản phẩm & Danh mục** | Tìm kiếm sản phẩm đang bán |  Cho phép |  Cho phép | `product.status = 'ACTIVE'` & `stockQuantity > 0` |
| | Xem chi tiết sản phẩm & thông số |  Cho phép |  Cho phép | Đọc từ `productService.getProductById` |
| | Xem kích thước & tồn kho khả dụng |  Cho phép |  Cho phép | Kiểm tra `availableSizes` và tổng tồn kho |
| | Xem sản phẩm đã ẩn / bản nháp |  **BỊ CHẶN** |  Cho phép | Backend lọc bỏ sản phẩm `INACTIVE` với Customer |
| | Quản lý giá nhập, giá vốn |  **BỊ CHẶN** |  Cho phép | Trường `costPrice` bị ẩn khỏi Customer DTO |
| **Stylist & Tư vấn** | Phối đồ trang phục theo phong cách |  Cho phép |  Cho phép | Gọi tool `recommend_outfit` |
| | Đổi sản phẩm trong bộ phối đồ |  Cho phép |  Cho phép | Gọi tool `replace_outfit_item` |
| | Giải thích căn cứ gợi ý |  Cho phép |  Cho phép | Gọi tool `get_recommendation_explanation` |
| **Giỏ hàng & Đơn hàng** | Xem giỏ hàng của chính mình |  Cho phép |  Cho phép | Xác thực qua Cookie / Token / SessionId |
| | Tra cứu đơn hàng của chính mình |  Cho phép |  Cho phép | Tool `lookup_customer_order` kiểm tra quyền sở hữu |
| | Tra cứu đơn hàng của khách hàng khác |  **BỊ CHẶN** |  Cho phép | Chặn IDOR: Trả về 403 / Not Found nếu không khớp ID |
| | Cập nhật trạng thái đơn hàng |  **BỊ CHẶN** |  Cho phép | Chỉ Admin mới có quyền đổi trạng thái qua API |
| **Vận chuyển & Địa chỉ** | Chuẩn hóa địa chỉ giao hàng |  Cho phép |  Cho phép | Gọi `normalize_customer_address` |
| | Xác thực đơn vị hành chính Việt Nam |  Cho phép |  Cho phép | Gọi `validate_customer_address` |
| | Tính phí ship theo biểu phí niêm yết |  Cho phép |  Cho phép | Gọi `calculate_shipping_fee` (Biểu phí chuẩn 20k-45k) |
| **Chăm sóc & Handoff** | Gửi yêu cầu gặp chuyên viên tư vấn |  Cho phép |  Cho phép | Gán `LEAD_PENDING` và phát SSE `CONSULTATION_REQUESTED` |
| | Xem danh sách khách hàng đang chờ |  **BỊ CHẶN** |  Cho phép | API `/ai/admin/leads` yêu cầu `authorizeAdmin` |
| | Tiếp nhận và chat với khách hàng |  **BỊ CHẶN** |  Cho phép | API `/ai/admin/leads/:id/messages` (Role: `STAFF`) |
| **Kinh doanh & Quản trị** | Báo cáo doanh thu & AOV thực tế |  **BỊ CHẶN** |  Cho phép | API `/bi/revenue` yêu cầu `authorizeAdmin` |
| | Phân tích cơ cấu sản phẩm bán chạy/ế |  **BỊ CHẶN** |  Cho phép | API `/bi/revenue` (Top selling vs Slow moving) |
| | Dự báo hết hàng & khuyến nghị nhập |  **BỊ CHẶN** |  Cho phép | API `/bi/inventory-forecast` (Tồn kho <= 15) |
| | Phân tích phân khúc khách hàng RFM |  **BỊ CHẶN** |  Cho phép | API `/bi/crm-rfm` (Champions, Loyal, At-Risk) |
| | Lập kế hoạch chiến dịch Marketing đa kênh |  **BỊ CHẶN** |  Cho phép | API `/bi/marketing-plan` (Gemini BI Engine) |
| | Tự ý sửa đổi trực tiếp dữ liệu Database |  **BỊ CHẶN** |  **BỊ CHẶN** | AI chỉ được đề xuất (PROPOSE), Admin duyệt thủ công |

---

## 3. CƠ CHẾ THỰC THI BẢO MẬT (ENFORCEMENT MECHANISM)

### 3.1. Phân tầng Endpoint & Middleware
- **Endpoint công khai / Khách hàng**:
  ```javascript
  // backend/src/routes/aiRoutes.js
  router.post('/chat', identifyUser, aiController.chat);
  router.post('/stylist', identifyUser, aiController.getOutfitRecommendation);
  router.get('/conversations/:id/messages', identifyUser, conversationController.getCustomerMessages);
  router.post('/conversations/:id/handoff', identifyUser, conversationController.decideHandoff);
  ```
- **Endpoint Quản trị viên (Admin AI & BI)**:
  ```javascript
  // backend/src/routes/businessIntelligenceRoutes.js & aiRoutes.js
  router.use(authenticate, authorizeAdmin);
  router.get('/admin/leads', authenticate, authorizeAdmin, conversationController.listLeads);
  router.patch('/admin/leads/:id/status', authenticate, authorizeAdmin, conversationController.updateLeadStatus);
  router.post('/admin/leads/:id/messages', authenticate, authorizeAdmin, conversationController.sendStaffMessage);
  ```

### 3.2. Ngăn chặn Prompt Injection vượt quyền
- Customer AI được tiêm quy tắc bất biến trong `systemInstruction`:
  > *"TUYỆT ĐỐI không cung cấp số liệu doanh thu nội bộ, lợi nhuận, thống kê bán hàng của doanh nghiệp (đây là quyền của Admin AI trong trang Quản trị). Nếu khách hỏi nội dung ngoài phạm vi mua sắm thời trang Routine, lịch sự từ chối và hướng dẫn khách quay lại sản phẩm Routine."*
- Khi phát hiện Prompt Injection yêu cầu quyền Admin hoặc xem doanh thu, Customer AI lập tức trả lời từ chối theo kịch bản bảo mật đã được kiểm thử 100% đạt chuẩn.
