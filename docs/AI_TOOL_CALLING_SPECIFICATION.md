# ĐẶC TẢ DANH MỤC CÔNG CỤ FUNCTION CALLING AI (ROUTINE WEB)
## AI TOOL CALLING & FUNCTION DECLARATIONS SPECIFICATION

---

## 1. TỔNG QUAN HỆ THỐNG CÔNG CỤ (TOOL REGISTRY)

Hệ thống tích hợp **11 Function Handlers** chính thức được khai báo trong `TOOL_DECLARATIONS` của `fashionAgentService.js` và thực thi qua `fashionAgentTools.js`. Toàn bộ công cụ đều nhận tham số đã qua kiểm duyệt (`boundedInteger`, `boundedText`) và trả về dữ liệu nén (`compactToolResult`) để tối ưu số token tiêu thụ.

---

## 2. CHI TIẾT CÁC HÀM CÔNG CỤ (FUNCTION SPECIFICATIONS)

### 2.1. `search_products`
- **Mục đích**: Tìm kiếm danh mục sản phẩm Routine đang bán theo từ khóa, ngành hàng, màu sắc, kiểu dáng, giới tính, khoảng giá kèm phân trang.
- **Parameters**:
  ```json
  {
    "type": "object",
    "properties": {
      "keyword": { "type": "string", "description": "Từ khóa tên sản phẩm hoặc chất liệu" },
      "category": { "type": "string", "description": "Loại hàng như áo sơ mi, quần jeans, chân váy" },
      "color": { "type": "string", "description": "Màu sắc khách yêu cầu" },
      "fit": { "type": "string", "description": "Kiểu dáng: oversize, slim-fit, regular" },
      "priceMin": { "type": "integer", "description": "Giá tối thiểu (VND)" },
      "priceMax": { "type": "integer", "description": "Giá tối đa (VND)" },
      "gender": { "type": "string", "enum": ["men", "women", "unisex"] },
      "page": { "type": "integer", "description": "Số trang (mặc định 1)" },
      "limit": { "type": "integer", "description": "Số sản phẩm mỗi trang (mặc định 8, tối đa 20)" }
    }
  }
  ```
- **Return Contract**:
  `{ totalCount, count, page, totalPages, hasMore, products: [...], catalogFacts: [...] }`
- **Ràng buộc**: Bắt buộc chỉ trả về sản phẩm `status = 'ACTIVE'` và `availableStock > 0`.

---

### 2.2. `get_product_details`
- **Mục đích**: Lấy thông tin thuộc tính thực tế (giá niêm yết, chất liệu, màu sắc, form dáng, mô tả) của một mã sản phẩm đang bán.
- **Parameters**: `{ "productId": { "type": "string" } }` (Required)
- **Return Contract**: `{ found: boolean, product: {...}, details: {...} }`
- **Ràng buộc**: Nếu không tìm thấy trong database, trả về `{ found: false, product: null }`. Không tự tạo dữ liệu giả.

---

### 2.3. `recommend_outfit`
- **Mục đích**: Tìm và phối hợp các sản phẩm thực tế trong catalog thành bộ trang phục hoàn chỉnh (Áo + Quần/Váy + Phụ kiện).
- **Parameters**:
  ```json
  {
    "type": "object",
    "properties": {
      "style": { "type": "string", "description": "Phong cách: thanh lịch, năng động, tối giản" },
      "occasion": { "type": "string", "enum": ["office", "weekend", "date", "party", "travel", "everyday"] },
      "budget": { "type": "integer", "description": "Ngân sách tối đa cho cả set (VND)" },
      "gender": { "type": "string", "enum": ["men", "women", "unisex"] },
      "category": { "type": "string", "description": "Loại sản phẩm chính muốn phối" }
    }
  }
  ```
- **Return Contract**: `{ found: boolean, outfit: { id, title, total, products: [...] } }`
- **Ràng buộc**: Chỉ gọi khi khách có ý định phối đồ rõ ràng. Không tự gọi khi khách chỉ tìm kiếm đơn lẻ.

---

### 2.4. `replace_outfit_item`
- **Mục đích**: Thay thế duy nhất một món trong bộ trang phục đã gợi ý gần nhất, giữ nguyên tất cả các món còn lại.
- **Parameters**:
  ```json
  {
    "type": "object",
    "properties": {
      "replaceType": { "type": "string", "enum": ["top", "bottom", "outerwear", "accessory"] },
      "category": { "type": "string" },
      "color": { "type": "string" },
      "gender": { "type": "string", "enum": ["men", "women", "unisex"] },
      "budget": { "type": "integer" }
    },
    "required": ["replaceType"]
  }
  ```
- **Return Contract**: `{ replaced: boolean, slot: string, outfit: {...} }`

---

### 2.5. `get_available_sizes`
- **Mục đích**: Kiểm tra các size còn hàng và số lượng tồn kho theo từng biến thể màu/size của sản phẩm.
- **Parameters**: `{ "productId": { "type": "string" } }` (Required)
- **Return Contract**: `{ found: boolean, inventoryByVariant: boolean, availableSizes: [...] }`

---

### 2.6. `lookup_customer_order`
- **Mục đích**: Tra cứu thông tin, số lượng sản phẩm, tiền thanh toán và trạng thái vận chuyển đơn hàng của chính khách hàng.
- **Parameters**: `{ "orderId": { "type": "string" } }` (Required)
- **Return Contract**:
  - Hợp lệ: `{ found: true, orderId, status, paymentStatus, totalAmount, shippingFee, receiverName, items: [...] }`
  - Không có quyền: `{ found: false, error: "Bạn không có quyền truy cập thông tin đơn hàng này..." }`

---

### 2.7. `normalize_customer_address` & `validate_customer_address`
- **Mục đích**: Phân tích chuỗi địa chỉ giao hàng và xác thực với danh mục đơn vị hành chính 63 Tỉnh/Thành phố của Việt Nam.
- **Parameters**:
  - `normalize_customer_address`: `{ "raw_address": { "type": "string" } }`
  - `validate_customer_address`: `{ "province": string, "district": string, "ward": string, "street": string }`
- **Return Contract**:
  - Khi thiếu cấp hành chính: `{ status: "NEED_MORE_INFORMATION", missing_fields: ["ward"], message: "..." }`
  - Đầy đủ & hợp lệ: `{ status: "VALID", valid: true, formattedAddress: "..." }`

---

### 2.8. `calculate_shipping_fee` & `get_shipping_policy`
- **Mục đích**: Tính toán phí vận chuyển chính xác theo biểu phí niêm yết của Routine Vietnam.
- **Biểu phí niêm yết chuẩn**:
  - **Miễn phí vận chuyển (Freeship)**: Đơn hàng từ 500.000đ trở lên toàn quốc.
  - **Nội thành Hà Nội / TP.HCM / Đà Nẵng**: 20.000đ (Giao 1-2 ngày).
  - **Ngoại thành Hà Nội / TP.HCM / Đà Nẵng**: 30.000đ (Giao 2-3 ngày).
  - **Tỉnh thành khác toàn quốc**: 35.000đ (Giao 3-4 ngày).
  - **Vùng sâu vùng xa, hải đảo**: 45.000đ (Giao 4-5 ngày).
  - **Giao hỏa tốc nội thành (2-4h)**: 50.000đ.
- **Return Contract**: `{ status: "SUCCESS", zone, shippingFee, baseFee, isFree, freeShipThreshold, eta, finalTotal }`
