# MA TRẬN TRUY CẬP DỮ LIỆU HỆ THỐNG AI (ROUTINE WEB)
## DATA ACCESS MATRIX: MYSQL TABLES, ATTRIBUTES, READ/WRITE PERMISSIONS

---

## 1. NGUYÊN TẮC TRUY CẬP DỮ LIỆU

1. **Tuyệt đối không truy cập SQL trực tiếp**: Mô hình Gemini AI không có quyền thực thi bất kỳ câu lệnh SQL tự sinh (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Toàn bộ luồng dữ liệu bắt buộc đi qua tầng Service / Data Access Layer của Backend bằng Prisma ORM.
2. **Quy tắc Least Privilege (Đặc quyền tối thiểu)**: Customer AI chỉ được cấp quyền đọc các trường dữ liệu cần thiết cho việc hiển thị thông tin sản phẩm và phục vụ khách hàng.
3. **Bảo mật PII (Personally Identifiable Information)**: Dữ liệu nhạy cảm của khách hàng (mật khẩu băm, số điện thoại, email) được che mờ (*Masking*) hoặc loại bỏ hoàn toàn trước khi tổng hợp cho AI phân tích.

---

## 2. MA TRẬN TRUY CẬP THEO BẢNG DỮ LIỆU MYSQL

| Bảng MySQL | Trường dữ liệu cho phép truy cập | Customer AI | Admin AI | Mục đích sử dụng | Ràng buộc bảo mật |
|:---|:---|:---:|:---:|:---|:---|
| **Product** | `id`, `name`, `price`, `originalPrice`, `category`, `gender`, `styles`, `materials`, `stockQuantity`, `status` |  Chỉ đọc (`ACTIVE`) |  Đọc toàn bộ | Tìm kiếm, phối đồ, phân tích tồn kho, cảnh báo cạn hàng | Customer AI không được đọc sản phẩm `status = 'INACTIVE'` |
| | `costPrice` (Giá vốn), `supplier` |  **CẤM** |  Chỉ đọc | Phân tích biên lợi nhuận kinh doanh | Ẩn hoàn toàn khỏi Customer AI |
| **ProductVariant** | `id`, `productId`, `size`, `color`, `stockQuantity`, `sku`, `status` |  Chỉ đọc (`ACTIVE`) |  Đọc toàn bộ | Tư vấn kích cỡ còn hàng, kiểm tra size chart | Không suy diễn số lượng nếu chỉ có tồn kho tổng |
| **Category** | `id`, `name`, `slug`, `gender`, `description` |  Chỉ đọc |  Đọc toàn bộ | Định tuyến danh mục thời trang | Chỉ đọc danh mục đang hoạt động |
| **Order** | `id`, `orderCode`, `userId`, `guestSessionId`, `status`, `total`, `subtotal`, `shippingFee`, `createdAt` |  Chỉ đọc (Của chính mình) |  Đọc toàn bộ | Khách tra cứu tiến độ; Admin phân tích doanh thu | Bắt buộc kiểm tra quyền sở hữu (`userId` / `sessionId`) |
| | `receiverName`, `phoneNumber`, `shippingAddress` |  Chỉ đọc (Của chính mình) |  Đọc (PII Masking) | Giao vận và chăm sóc khách hàng | Admin BI tự động che số điện thoại (`098****888`) |
| **OrderItem** | `id`, `orderId`, `productId`, `name`, `price`, `quantity`, `size`, `color` |  Chỉ đọc (Của chính mình) |  Đọc toàn bộ | Hiển thị sản phẩm đã mua; Thống kê Top Selling | Chỉ đọc kèm đơn hàng được phân quyền |
| **User** | `id`, `fullName`, `stylePreference` |  Chỉ đọc (Profile mình) |  Đọc | Cá nhân hóa đề xuất thời trang | Không cho phép khách hàng đọc thông tin người khác |
| | `email`, `phoneNumber`, `role`, `createdAt` |  Chỉ đọc (Profile mình) |  Đọc (Phân khúc RFM) | Phân nhóm khách hàng Champions, Loyal, At-Risk | Mật khẩu băm (`passwordHash`) TUYỆT ĐỐI CẤM mọi AI truy cập |
| **Coupon** | `id`, `code`, `type`, `value`, `minOrderValue`, `maxDiscount`, `isActive` |  Chỉ đọc |  Đọc toàn bộ | Áp dụng ưu đãi hợp lệ cho giỏ hàng | AI không được tự bịa ra mã giảm giá hoặc sửa chiết khấu |
| **AiConversation** | `id`, `userId`, `guestSessionId`, `status`, `intentScore`, `handoffDecision`, `contextSummary` |  Đọc / Ghi (Của chính mình) |  Đọc / Ghi | Quản lý phiên hội thoại AI Stylist và hàng đợi Lead | Cách ly phiên tuyệt đối giữa các khách hàng |
| **AiConversationMessage**| `id`, `conversationId`, `role`, `text`, `metadata`, `createdAt` |  Đọc / Ghi (Của chính mình) |  Đọc / Ghi | Lưu trữ lịch sử tin nhắn tư vấn đa lượt | Khách chỉ thấy hội thoại của mình; Chuyên viên gửi vai trò `STAFF` |

---

## 3. CƠ CHẾ BẢO VỆ DỮ LIỆU CÁ NHÂN (PII MASKING)

Trong dịch vụ phân tích dữ liệu Admin BI (`businessIntelligenceService.js`), các hàm làm sạch dữ liệu tự động được kích hoạt:

```javascript
// Masking số điện thoại khách hàng cho AI phân tích
function maskPhone(phone) {
  if (!phone) return 'N/A';
  const clean = String(phone).trim();
  if (clean.length < 7) return clean;
  return clean.substring(0, 3) + '****' + clean.substring(clean.length - 3);
}

// Masking email khách hàng
function maskEmail(email) {
  if (!email) return 'N/A';
  const clean = String(email).trim();
  const parts = clean.split('@');
  if (parts.length < 2) return clean;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? name[0] + '*' : name.substring(0, 2) + '****' + name.slice(-1);
  return `${maskedName}@${domain}`;
}
```

Nhờ cơ chế này, ngay cả khi Admin AI phân tích Customer 360 hay phân khúc RFM, thông tin định danh cá nhân nhạy cảm của người dùng vẫn được bảo vệ tuyệt đối.
