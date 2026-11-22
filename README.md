# ROUTINE THU ĐÔNG — Nền Tảng Thương Mại Điện Tử Thời Trang Thông Minh & AI Stylist

> **Dự án:** ROUTINE THU ĐÔNG (`routine-thu-dong`)  
> **Thương hiệu hiển thị:** ROUTINE THU ĐÔNG  
> **GitHub Repository:** [https://github.com/LanAnhDoan05/routine-thu-dong](https://github.com/LanAnhDoan05/routine-thu-dong)  
> **Mục tiêu:** Nền tảng thương mại điện tử chuyên ngành thời trang tối giản và hiện đại cho mùa Thu Đông, kết hợp trợ lý AI Stylist tư vấn phong cách đa lượt, hệ thống phân tích kinh doanh thông minh (AI Business Intelligence), cổng thanh toán điện tử VNPay và cổng quản trị vận hành Admin Portal toàn diện.

---

## 📑 Mục Lục

1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Tổng quan chức năng](#2-tổng-quan-chức-năng)
   - [2.1 Phân hệ khách hàng (Storefront)](#21-phân-hệ-khách-hàng-storefront)
   - [2.2 Phân hệ Quản trị viên (Admin Portal)](#22-phân-hệ-quản-trị-viên-admin-portal)
   - [2.3 Trợ lý AI Stylist (Fashion Multi-turn Assistant)](#23-trợ-lý-ai-stylist-fashion-multi-turn-assistant)
   - [2.4 Trí tuệ doanh nghiệp AI Business Intelligence (AI BI)](#24-trí-tuệ-doanh-nghiệp-ai-business-intelligence-ai-bi)
   - [2.5 Cổng thanh toán VNPay & Quản lý đơn hàng](#25-cổng-thanh-toán-vnpay--quản-lý-đơn-hàng)
3. [Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
4. [Kiến trúc hệ thống](#4-kiến-trúc-hệ-thống)
5. [Cấu trúc thư mục dự án](#5-cấu-trúc-thư-mục-dự-án)
6. [Cấu hình biến môi trường (Environment Variables)](#6-cấu-hình-biến-môi-trường-environment-variables)
7. [Hướng dẫn cài đặt và khởi chạy dự án](#7-hướng-dẫn-cài-đặt-và-khởi-chạy-dự-án)
8. [Hướng dẫn sử dụng](#8-hướng-dẫn-sử-dụng)
9. [Kiểm thử và triển khai (Testing & Deployment)](#9-kiểm-thử-và-triển-khai-testing--deployment)
10. [Tình trạng dự án và báo cáo nghiệm thu](#10-tình-trạng-dự-án-và-báo-cáo-nghiệm-thu)

---

## 1. Giới thiệu dự án

**ROUTINE THU ĐÔNG** là giải pháp số hóa toàn diện dành cho thương hiệu thời trang Routine trong chiến dịch mùa Thu Đông. Hệ thống được kiến trúc theo mô hình phân tách độc lập giữa **Frontend Storefront (Next.js 16)** và **Backend API (Node.js/Express & Prisma ORM)**, kết nối trực tiếp với cơ sở dữ liệu quan hệ **MySQL**.

### Mục tiêu xây dựng
- Xây dựng trải nghiệm mua sắm mượt mà, tối giản, sang trọng theo đúng ngôn ngữ thiết kế của thương hiệu Routine.
- Ứng dụng trí tuệ nhân tạo (Google Gemini API) trong việc tư vấn phong cách ăn mặc, phối đồ thông minh (Smart Outfit), kiểm tra kích cỡ chuẩn xác nhằm gia tăng tỷ lệ chuyển đổi và giảm thiểu tối đa tỷ lệ hoàn hàng.
- Cung cấp công cụ phân tích kinh doanh chuyên sâu (AI Business Intelligence) cho cấp quản lý với các báo cáo doanh thu, tồn kho, kênh phân phối và phân nhóm khách hàng RFM được tính toán trực tiếp từ cơ sở dữ liệu thật.

### Đối tượng sử dụng
1. **Khách hàng mua sắm (Customers):** Người dùng có nhu cầu tìm kiếm trang phục mùa Thu Đông, xây dựng outfit đi làm/đi chơi, nhận tư vấn thời trang cá nhân hóa từ AI và thanh toán trực tuyến thuận tiện.
2. **Quản trị viên & Chuyên viên thời trang (Admins & Stylists):** Đội ngũ quản lý sản phẩm, điều phối đơn hàng, tiếp nhận các ca tư vấn chuyển tiếp từ AI, theo dõi biến động tồn kho và tham khảo các kiến nghị chiến lược từ hệ thống AI BI.

### Các vấn đề dự án giải quyết
- **Xóa bỏ hiện tượng "Ảo giác" (Hallucination) của AI:** AI chỉ giới thiệu các sản phẩm có thật, đang kinh doanh (`ACTIVE`), đúng giá niêm yết và còn tồn kho thực tế trong MySQL database.
- **Tính toán chi phí và thanh toán minh bạch:** Tự động tính toán khoảng cách từ địa chỉ khách hàng tới 25 showroom Routine trên toàn quốc bằng thuật toán Haversine kết hợp biểu phí hành chính, áp dụng miễn phí vận chuyển cho đơn hàng từ 499.000đ.
- **Bảo mật và toàn vẹn dữ liệu:** Không lưu mật khẩu dạng văn bản thô (sử dụng `bcryptjs` 10 salt rounds), bảo vệ API quản trị bằng JWT Bearer Token và phân quyền RBAC nghiêm ngặt, chống tấn công lặp thanh toán (Idempotency) trên cổng VNPay.

---

## 2. Tổng quan chức năng

### 2.1 Phân hệ khách hàng (Storefront)
- **Trang chủ & Banner tương tác:** Hiển thị Hero Slider mùa Thu Đông, danh mục thịnh hành, sản phẩm mới nhất (`New Arrivals`) và các set phối đồ nổi bật (`Trending Outfits`).
- **Danh mục & Bộ lọc đa chiều:**
  - Phân loại theo Danh mục: Áo sơ mi, Áo thun, Áo khoác, Quần jeans, Quần tây, Đầm/Váy, Phụ kiện.
  - Phân loại theo Giới tính: Nam, Nữ, Unisex.
  - Phân loại theo Phong cách: Casual, Smart Casual, Minimalist, Streetwear, Office Chic.
  - Lọc theo khoảng giá linh hoạt, màu sắc và kích cỡ.
- **Tìm kiếm thông minh:** Tìm kiếm toàn văn (Full-text Search), gợi ý tự động khi gõ (Search Suggestions) và trực quan hóa bản đồ phong cách 2D Vector.
- **Chi tiết sản phẩm:** Lựa chọn biến thể màu sắc và kích cỡ theo thời gian thực; tự động cập nhật tồn kho theo SKU; hiển thị bảng hướng dẫn chọn size chuẩn Routine; danh sách đánh giá và bình luận đã kiểm duyệt.
- **Danh sách yêu thích (Wishlist):** Lưu trữ các sản phẩm quan tâm, đồng bộ cho cả tài khoản thành viên và khách vãng lai.
- **Giỏ hàng (Cart):** Thêm, bớt, cập nhật số lượng, xóa sản phẩm; cơ chế kiểm tra và khóa tồn kho tạm thời (Stock Reservation) ngăn ngừa tình trạng bán vượt tồn.
- **Quy trình Thanh toán & Checkout:**
  - Xác thực nghiêm ngặt thông tin người nhận: họ tên tối thiểu 2 ký tự, số điện thoại chuẩn di động Việt Nam (10 chữ số).
  - Xác thực địa chỉ giao hàng 3 cấp (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã) theo danh mục 63 tỉnh thành Việt Nam kết hợp kiểm tra Geocoding (Google Maps / OpenStreetMap Nominatim).
  - Tự động định vị Showroom gần nhất để tính toán phí ship tối ưu.
  - Áp dụng mã voucher giảm giá và mã miễn phí vận chuyển.
- **Quản lý tài khoản:** Đăng ký, đăng nhập (Email / Số điện thoại), xác thực OTP, quên mật khẩu, cập nhật thông tin cá nhân và quản lý sổ địa chỉ giao hàng.
- **Lịch sử đơn hàng:** Tra cứu chi tiết đơn hàng, mã vận đơn, tiến trình thời gian thực (Timeline 4 bước: Đã đặt hàng -> Đã duyệt -> Đang giao -> Đã nhận).

### 2.2 Phân hệ Quản trị viên (Admin Portal)
- **Đăng nhập & Phân quyền (RBAC):** Chỉ tài khoản có vai trò `ADMIN` mới được quyền truy cập các API và trang quản trị tại `/admin`.
- **Dashboard điều hành:** Tổng quan doanh thu thực tế, số lượng đơn hàng, số khách hàng mới, tỷ lệ hoàn tất đơn và biểu đồ xu hướng.
- **Quản lý sản phẩm toàn diện:**
  - Thêm sản phẩm mới với đầy đủ biến thể màu sắc, kích cỡ, SKU, giá bán, giá gốc và tồn kho.
  - Tự động chuẩn hóa giới tính (`men`, `women`, `unisex`) và danh mục.
  - Chỉnh sửa thông tin, giá bán, tồn kho tức thời (đồng bộ thời gian thực sang giao diện khách hàng).
  - Bật/tắt trạng thái hiển thị (`ACTIVE`, `DRAFT`, `INACTIVE`) hoặc xóa sản phẩm an toàn.
  - Tích hợp tải ảnh sản phẩm trực tiếp lên Cloudinary CDN hoặc lưu trữ an toàn.
- **Quản lý đơn hàng:** Xem danh sách toàn bộ đơn hàng, lọc theo trạng thái (`PENDING`, `CONFIRMED`, `SHIPPING`, `DELIVERED`, `CANCELLED`), cập nhật tiến độ xử lý và xem chi tiết đối soát thanh toán.
- **Quản lý khách hàng (CRM):** Danh sách khách hàng, tổng chi tiêu, số đơn hàng đã mua, ngày đăng ký và nguồn tiếp cận (Attribution Source).
- **Hệ thống thông báo thời gian thực (SSE & Database Notifications):**
  - Nhận chuông báo tức thì khi có đơn hàng mới hoặc khi khách hàng yêu cầu chuyển tiếp sang tư vấn viên.
  - Đánh dấu đã đọc từng thông báo hoặc toàn bộ thông báo.
  - Bấm vào thông báo để điều hướng trực tiếp (Deep Link) đến trang đơn hàng hoặc trang trao đổi tư vấn (`/admin/leads?chatId=...`).
- **Quản lý Voucher & Banners:** Cấu hình mã giảm giá (phần trăm, số tiền cố định, freeship, điều kiện đơn tối thiểu) và quản lý hình ảnh Hero Banner trang chủ.

### 2.3 Trợ lý AI Stylist (Fashion Multi-turn Assistant)
- **Hiểu ngôn ngữ tự nhiên tiếng Việt:** Tích hợp bộ giải mã ngữ nghĩa thời trang Routine (`fashionThesaurus.js`), nhận biết tiếng lóng và thuật ngữ phom dáng đời thường (ví dụ: *"thùng thình/rộng"* $\rightarrow$ *Loose/Oversized*, *"ôm/bó"* $\rightarrow$ *Slim fit*).
- **Ghi nhớ ngữ cảnh hội thoại đa lượt (Contextual Multi-turn Memory):**
  - Duy trì các điều kiện đã nêu ở các lượt trước khi khách hỏi thêm chi tiết (Ví dụ: Lượt 1 tìm *"áo len dưới 1 triệu"* $\rightarrow$ Lượt 2 hỏi *"có màu trắng không?"* $\rightarrow$ AI tự động kết hợp tìm áo len màu trắng có giá $\le$ 1.000.000đ).
  - Cập nhật chính xác khi khách hàng thay đổi tiêu chí (đổi màu, tăng ngân sách).
  - Nhận diện khi khách chuyển đổi hẳn sang nhu cầu mới (ví dụ chuyển từ tìm áo sang tìm quần).
- **Dữ liệu thật 100% (Database Grounding):** Sử dụng cơ chế Function Calling (`search_products`, `get_product_details`, `recommend_outfit`, `replace_outfit_item`) để truy vấn trực tiếp bảng `products` và `product_variants`. Tuyệt đối không bịa đặt sản phẩm hoặc giá bán.
- **Phối đồ thông minh (Smart Outfit):** Tạo set trang phục hoàn chỉnh theo ngân sách và phong cách mong muốn; cho phép thay thế từng món trong set đồ mà vẫn giữ nguyên các món còn lại.
- **Chuyển tiếp cho chuyên viên tư vấn (Human Handoff):** Khi phát hiện khách hàng có ý định mua cao hoặc yêu cầu gặp người thật, AI chủ động đề xuất hỗ trợ chuyên viên; khi khách đồng ý, hệ thống tự động lưu hội thoại vào cơ sở dữ liệu và bắn thông báo tức thời đến Admin Portal.

### 2.4 Trí tuệ doanh nghiệp AI Business Intelligence (AI BI)
- **Báo cáo tài chính & Doanh thu:** Tính toán tổng doanh thu, giá trị trung bình đơn hàng (AOV), doanh thu theo ngày/tháng từ các giao dịch thành công trong MySQL.
- **Phân tích sản phẩm & Nút thắt chuyển đổi:** Nhận diện các sản phẩm bán chạy nhất (`Top Performers`) và các sản phẩm có lượt xem cao nhưng tỷ lệ mua thấp để đề xuất tối ưu hình ảnh/giá bán.
- **Dự báo nhu cầu nhập kho (Inventory Restock Forecast):** Phân tích tốc độ bán ra (run rate) và số ngày tồn kho còn lại (`days until out of stock`) để cảnh báo nhập hàng trước khi hết sạch.
- **Phân bổ hàng hóa showroom:** Đánh giá nhu cầu tiêu thụ tại từng khu vực địa lý để gợi ý điều chuyển hàng giữa 25 showroom Routine.
- **Phân nhóm khách hàng RFM (Customer 360):** Phân chia khách hàng thành các nhóm: *Champions*, *Loyal Customers*, *Potential Loyalists*, *At Risk*, *Lost* kèm chính sách chăm sóc riêng biệt.
- **Bảo vệ quyền riêng tư (PII Masking):** Số điện thoại và email khách hàng được che dấu tự động (`090****567`, `tu****h@gmail.com`) trước khi đưa vào phân tích AI.
- **Giám đốc Thương mại ảo (Virtual CCO):** Google Gemini đóng vai trò diễn giải các số liệu thực tế, giải thích nguyên nhân và đưa ra các đề xuất hành động cụ thể kèm mức độ rủi ro và điều kiện thực hiện.

### 2.5 Cổng thanh toán VNPay & Quản lý đơn hàng
- **Tích hợp VNPay Sandbox tiêu chuẩn:** Khởi tạo URL thanh toán với mã giao dịch duy nhất, đơn vị tiền tệ VND (nhân 100 theo chuẩn VNPay).
- **Bảo mật chữ ký số HMAC-SHA512:** Mã hóa và kiểm tra chuỗi băm bảo mật (`vnp_SecureHash`) trên cả Return URL và IPN webhook.
- **Giao diện Cổng thanh toán & QR Code:** Tự động sinh mã VietQR / VNPay QR động hiển thị trực quan để khách hàng quét mã chuyển khoản nhanh chóng.
- **Chống lặp thanh toán (Idempotency):** Xử lý an toàn khi VNPay gửi nhiều lần tín hiệu callback hoặc khi người dùng tải lại trang kết quả, đảm bảo số tiền và trạng thái đơn hàng không bị cập nhật sai lệch.

---

## 3. Công nghệ sử dụng

| Tầng hệ thống | Công nghệ / Thư viện | Phiên bản | Vai trò & Đặc tính kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js** | **16.4.3** | App Router, Server Components & Client Components, Turbopack, tối ưu SEO |
| **UI Library** | **React** | **19.2.3** | Quản lý trạng thái bằng React Context API (Cart, Wishlist, Order, Auth) |
| **Styling** | **CSS Modules** | Thuần CSS | Thiết kế tối giản, đồng bộ nhận diện ROUTINE THU ĐÔNG, 100% Responsive |
| **Mã QR** | **QRCode** | **1.5.4** | Sinh mã QR động cho cổng thanh toán VNPay Gateway |
| **Backend Framework** | **Express.js** | **4.22.3** | RESTful API server, Middleware pipeline, xử lý lỗi tập trung |
| **ORM** | **Prisma ORM** | **6.19.3** | Quản lý Schema, Migrations, quan hệ dữ liệu chặt chẽ giữa 16 models |
| **Cơ sở dữ liệu** | **MySQL** | **8.0+** | Lưu trữ toàn bộ sản phẩm, biến thể, đơn hàng, người dùng, thông báo và báo cáo BI |
| **AI Engine** | **Google Gen AI SDK** | **2.32.0** | Tích hợp Google Gemini (`gemini-3.8-flash` / `gemini-3.5-flash-lite`) |
| **Thời trang NLP** | **Fashion Thesaurus** | Nội bộ | Chuẩn hóa từ khóa thời trang tiếng Việt, ánh xạ form dáng, màu sắc |
| **Thanh toán** | **VNPay SDK** | **2.5.0** | Khởi tạo giao dịch, tạo URL thanh toán, xác thực chữ ký số HMAC-SHA512 |
| **Lưu trữ đám mây** | **Cloudinary SDK** | **2.11.0** | Tải lên và phân phối hình ảnh sản phẩm qua mạng lưới Cloudinary CDN |
| **Xác thực & Mã hóa** | **bcryptjs** | **3.0.3** | Băm mật khẩu người dùng với 10 salt rounds an toàn |
| **Phiên đăng nhập** | **jsonwebtoken (JWT)** | **9.0.3** | Cấp phát Bearer Token có thời hạn, xác thực danh tính và vai trò người dùng |
| **Bảo mật Web** | **Helmet & CORS** | 8.3 / 2.8 | Thiết lập HTTP security headers, giới hạn nguồn truy cập Cross-Origin |
| **Chống Brute-force** | **express-rate-limit** | **8.7.0** | Giới hạn tần suất gọi API, ngăn chặn tấn công từ chối dịch vụ (DoS) |
| **Gửi Email** | **Nodemailer** | **10.0.1** | Gửi email hóa đơn đơn hàng và mã OTP xác thực qua Gmail SMTP |

---

## 4. Kiến trúc hệ thống

```mermaid
flowchart TD
    subgraph Client["Trình duyệt Khách hàng & Admin"]
        UI_User["Giao diện Khách hàng (Desktop / Mobile)"]
        UI_Admin["Giao diện Quản trị viên (Admin Portal)"]
        UI_Stylist["Giao diện Trợ lý AI Stylist & Floating Widget"]
    end

    subgraph Frontend["Frontend Service (Next.js 16 - Port 3000)"]
        AppRouter["Next.js App Router (38 Routes)"]
        ClientContext["Context State (Auth, Cart, Wishlist, Order)"]
        NextConfig["Next.js Rewrite Proxy (/api/v1/media, /uploads)"]
    end

    subgraph Backend["Backend Service (Express.js - Port 5001)"]
        ApiRouter["RESTful API Pipeline (/api/v1)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        RateLimit["Rate Limiter & Helmet Security"]
        
        subgraph Controllers["Bộ điều khiển nghiệp vụ (Controllers)"]
            ProdCtrl["Product & Category Controller"]
            OrderCtrl["Order & Shipping Controller"]
            AiCtrl["AI Stylist & Context Controller"]
            BiCtrl["Business Intelligence Controller"]
            PayCtrl["Payment & VNPay Controller"]
            NotifCtrl["Notification & SSE Controller"]
        end

        subgraph Services["Tầng dịch vụ (Services)"]
            ProdSvc["Product Service"]
            OrderSvc["Order Service (Single Source of Truth)"]
            ShipSvc["Shipping Service (Haversine & 25 Stores)"]
            FashionAgent["Fashion Agent Service (Gemini Function Calling)"]
            Thesaurus["Fashion Thesaurus (NLP Tiếng Việt)"]
            BiSvc["BI Service (KPI Calculations & RFM)"]
            VnpaySvc["VNPay Service (HMAC-SHA512)"]
            CloudinarySvc["Cloudinary Upload Service"]
        end
    end

    subgraph Database["Cơ sở dữ liệu (Database)"]
        PrismaClient["Prisma ORM Client 6.19.3"]
        MySQL[("MySQL Database (routine_db / routine_test_db)")]
    end

    subgraph External["Dịch vụ bên ngoài (External Integrations)"]
        GeminiAPI["Google Gemini API (gemini-3.8-flash)"]
        VNPayGateway["Cổng thanh toán VNPay Sandbox"]
        CloudinaryCDN["Cloudinary Media Cloud"]
        SMTPServer["Gmail SMTP Server (Nodemailer)"]
        MapsAPI["Google Maps / OSM Geocoding"]
    end

    %% Client to Frontend
    UI_User --> AppRouter
    UI_Admin --> AppRouter
    UI_Stylist --> AppRouter
    AppRouter --> ClientContext

    %% Frontend to Backend
    AppRouter -->|HTTP REST API /api/v1| ApiRouter
    NextConfig -.->|Rewrite media/uploads| ApiRouter

    %% Backend internal flow
    ApiRouter --> RateLimit --> AuthMiddleware
    AuthMiddleware --> ProdCtrl & OrderCtrl & AiCtrl & BiCtrl & PayCtrl & NotifCtrl
    ProdCtrl --> ProdSvc
    OrderCtrl --> OrderSvc
    OrderSvc --> ShipSvc
    AiCtrl --> FashionAgent
    FashionAgent --> Thesaurus & ProdSvc
    BiCtrl --> BiSvc
    PayCtrl --> VnpaySvc

    %% Services to Database
    ProdSvc & OrderSvc & ShipSvc & BiSvc & VnpaySvc --> PrismaClient
    PrismaClient --> MySQL

    %% Services to External
    FashionAgent -->|Function Calling & Chat| GeminiAPI
    BiSvc -->|Executive Insights| GeminiAPI
    VnpaySvc -->|Tạo URL & Xác thực| VNPayGateway
    ProdSvc -->|Upload ảnh| CloudinarySvc --> CloudinaryCDN
    OrderSvc -->|Gửi hóa đơn| SMTPServer
    ShipSvc -->|Chuẩn hóa địa chỉ| MapsAPI
```

---

## 5. Cấu trúc thư mục dự án

```
Routine-thu-dong/
├── Routine_web_demo-main/          # Thư mục mã nguồn chính (Git Repository)
│   ├── backend/                    # Phân hệ Backend API (Node.js & Express)
│   │   ├── bin/www                 # Entry point khởi tạo HTTP server cổng 5001
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Prisma Schema định nghĩa 16 bảng dữ liệu
│   │   ├── src/
│   │   │   ├── config/             # Cấu hình Prisma, VNPay, Cloudinary, App
│   │   │   ├── controllers/        # 26 Controllers xử lý yêu cầu HTTP
│   │   │   ├── middlewares/        # Xác thực JWT, kiểm tra quyền Admin, validation
│   │   │   ├── routes/             # Định tuyến API tại /api/v1
│   │   │   ├── services/           # Nghiệp vụ: AI, BI, Order, Product, Shipping, VNPay
│   │   │   └── utils/              # Tiện ích: format response, băm SHA512, lưu file
│   │   ├── scripts/                # Kịch bản kiểm thử, kiểm toán dữ liệu và đo đạc
│   │   ├── tests/                  # Bộ unit test độc lập cho AI, Grounding, Validation
│   │   ├── package.json            # Cấu hình dependencies Backend
│   │   └── .env.example            # Bản mẫu biến môi trường Backend
│   │
│   ├── frontend/                   # Phân hệ Frontend Storefront (Next.js 16)
│   │   ├── app/                    # 38 Routes App Router (Khách hàng & Admin)
│   │   │   ├── page.js             # Trang chủ ROUTINE THU ĐÔNG
│   │   │   ├── admin/              # Toàn bộ các trang quản trị (Products, Orders, BI,...)
│   │   │   ├── category/[slug]/    # Danh mục sản phẩm
│   │   │   ├── product/[id]/       # Chi tiết sản phẩm & biến thể
│   │   │   ├── cart/               # Giỏ hàng
│   │   │   ├── checkout/           # Đặt hàng, tính phí ship, thanh toán VNPay
│   │   │   ├── orders/             # Lịch sử và chi tiết đơn hàng
│   │   │   ├── smart-outfit/       # AI Stylist tư vấn và phối đồ
│   │   │   └── profile/            # Thông tin tài khoản và sổ địa chỉ
│   │   ├── components/             # Các thành phần giao diện tái sử dụng
│   │   │   ├── layout/             # Header, Footer, Logo, MobileMenu
│   │   │   ├── admin/              # AdminHeader, AdminSidebar, Báo cáo BI
│   │   │   ├── ai/                 # AIStylistChat, InteractiveOutfitCard
│   │   │   ├── checkout/           # AddressForm, PaymentOptions
│   │   │   └── product/            # ProductCard, ProductGallery, Reviews
│   │   ├── context/                # AuthContext, CartContext, OrderContext
│   │   ├── lib/                    # Client services, shippingService, validators
│   │   ├── public/                 # Hình ảnh sản phẩm, hero banners, icons
│   │   ├── package.json            # Cấu hình dependencies Frontend
│   │   └── .env.example            # Bản mẫu biến môi trường Frontend
│   │
│   ├── docs/                       # Báo cáo kỹ thuật, kiểm toán và tài liệu nghiệm thu
│   ├── package.json                # Root package.json điều phối build và dev:all
│   ├── vercel.json                 # Cấu hình triển khai nền tảng Vercel
│   └── .gitignore                  # Cấu hình loại trừ file nhạy cảm và build output
│
├── package.json                    # Package.json điều phối cấp gốc
├── start.bat                       # Script khởi động nhanh hệ thống trên Windows (CMD)
└── start.ps1                       # Script khởi động nhanh hệ thống trên Windows (PowerShell)
```

---

## 6. Cấu hình biến môi trường (Environment Variables)

Hệ thống phân tách biến môi trường giữa Backend và Frontend để đảm bảo **tuyệt đối không để lộ khóa bí mật (API Keys / Secrets) ra phía trình duyệt khách hàng**.

### 6.1 Backend (`backend/.env`)

| Tên biến | Mục đích sử dụng | Giá trị mẫu minh họa |
| :--- | :--- | :--- |
| `PORT` | Cổng lắng nghe của Backend API server | `5001` |
| `NODE_ENV` | Môi trường thực thi (`development` / `production`) | `development` |
| `DATABASE_URL` | Chuỗi kết nối MySQL (Local hoặc Cloud Database) | `mysql://user:pass@localhost:3306/routine_db` |
| `JWT_SECRET` | Khóa bí mật dùng để ký và xác thực JSON Web Token | Chuỗi ngẫu nhiên tối thiểu 32 ký tự |
| `JWT_EXPIRES_IN` | Thời gian sống của JWT token | `7d` |
| `FRONTEND_URL` | Địa chỉ Frontend được phép truy cập CORS | `http://localhost:3000` |
| `GEMINI_API_KEY` | Khóa API dịch vụ Google Gemini | Lấy từ Google AI Studio |
| `GEMINI_MODEL` | Tên mô hình AI sử dụng | `gemini-3.8-flash` hoặc `gemini-3.5-flash-lite` |
| `GEMINI_TIMEOUT_MS`| Thời gian chờ tối đa cho mỗi yêu cầu AI | `15000` |
| `VNP_TMN_CODE` | Mã định danh thương nhân trên cổng VNPay Sandbox | Được cấp bởi VNPay Sandbox |
| `VNP_HASH_SECRET` | Khóa bí mật dùng để sinh chữ ký số HMAC-SHA512 | Được cấp bởi VNPay Sandbox |
| `VNP_URL` | Địa chỉ cổng thanh toán VNPay Sandbox | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| `VNP_RETURN_URL` | URL chuyển hướng trình duyệt sau thanh toán VNPay | `http://localhost:3000/checkout/payment/vnpay-return` |
| `CLOUDINARY_CLOUD_NAME` | Tên Cloud lưu trữ ảnh trên Cloudinary | Được cấp từ Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | Khóa API của tài khoản Cloudinary | Được cấp từ Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | Khóa bí mật API Cloudinary | Được cấp từ Cloudinary Dashboard |
| `SMTP_HOST` | Địa chỉ máy chủ gửi email hóa đơn và OTP | `smtp.gmail.com` |
| `SMTP_PORT` | Cổng máy chủ SMTP (TLS) | `587` |
| `SMTP_USER` | Email quản trị gửi thư thông báo | `your-email@gmail.com` |
| `SMTP_PASS` | Mật khẩu ứng dụng Gmail (App Password 16 ký tự) | Mật khẩu ứng dụng từ Google Account |

### 6.2 Frontend (`frontend/.env.local`)

| Tên biến | Mục đích sử dụng | Giá trị mẫu minh họa |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Địa chỉ gốc của Backend API mà Frontend gọi tới | `http://localhost:5001/api/v1` |
| `NEXT_PUBLIC_SITE_URL`| Địa chỉ công khai của website Frontend | `http://localhost:3000` |

---

## 7. Hướng dẫn cài đặt và khởi chạy dự án

### Yêu cầu tiên quyết
- **Node.js:** Phiên bản `>= 18.18.0` (Khuyến nghị Node.js `20.x` hoặc `22.x LTS`).
- **NPM:** Phiên bản `>= 9.x`.
- **MySQL Server:** Phiên bản `>= 8.0` đang chạy cục bộ (Port 3306) hoặc tài khoản MySQL trên đám mây (Aiven, PlanetScale, Supabase/RDS).
- **Git:** Đã cài đặt trên hệ điều hành.

### Các bước cài đặt chi tiết

#### Bước 1: Sao chép mã nguồn (Clone Repository)
```bash
git clone https://github.com/LanAnhDoan05/routine-thu-dong.git
cd routine-thu-dong/Routine_web_demo-main
```

#### Bước 2: Cài đặt Dependencies cho toàn bộ dự án
```bash
# Cài đặt đồng thời cho Root, Backend và Frontend
npm install
npm --prefix backend install
npm --prefix frontend install
```

#### Bước 3: Thiết lập biến môi trường
```bash
# Cấu hình Backend
cp backend/.env.example backend/.env
# Mở file backend/.env và điền thông tin kết nối MySQL thật cùng GEMINI_API_KEY

# Cấu hình Frontend
cp frontend/.env.example frontend/.env.local
```

#### Bước 4: Khởi tạo Cơ sở dữ liệu với Prisma
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

#### Bước 5: Khởi động hệ thống phát triển (Development)
Chạy cả Backend (Port 5001) và Frontend (Port 3000) đồng thời chỉ với 1 câu lệnh:
```bash
npm run dev:all
```
Hoặc trên môi trường Windows, nhấp đúp vào file `start.bat` tại thư mục gốc.

#### Bước 6: Truy cập ứng dụng
- **Trang chủ Khách hàng:** [http://localhost:3000](http://localhost:3000)
- **Trang Quản trị Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Báo cáo AI Business Intelligence:** [http://localhost:3000/admin/ai-bi](http://localhost:3000/admin/ai-bi)
- **Trợ lý AI Stylist:** [http://localhost:3000/smart-outfit/ai-stylist](http://localhost:3000/smart-outfit/ai-stylist)
- **Kiểm tra trạng thái Backend API:** [http://localhost:5001/api/v1/health](http://localhost:5001/api/v1/health)

---

## 8. Hướng dẫn sử dụng

### 8.1 Dành cho Khách hàng
1. **Duyệt và mua sắm:** Truy cập trang chủ, lựa chọn danh mục hoặc tìm kiếm theo từ khóa. Chọn sản phẩm để xem ảnh chi tiết, lựa chọn màu sắc và size.
2. **Sử dụng AI Stylist:** Nhấn vào biểu tượng Trợ lý ảo ở góc dưới bên phải hoặc menu "Smart Outfit". Gõ câu hỏi tự nhiên bằng tiếng Việt (ví dụ: *"Tìm áo khoác ấm đi Đà Lạt dưới 800k"*). AI sẽ gợi ý sản phẩm phù hợp. Bạn có thể hỏi nối tiếp: *"Có màu đen không?"* hoặc *"Tăng ngân sách lên 1 triệu"* để AI tiếp tục tinh chỉnh.
3. **Thanh toán:** Thêm sản phẩm vào giỏ, nhập họ tên và số điện thoại chuẩn. Điền địa chỉ nhận hàng để hệ thống tính phí vận chuyển chính xác. Chọn phương thức thanh toán **VNPay** để quét mã QR thanh toán nhanh hoặc **COD** để trả tiền mặt khi nhận hàng.

### 8.2 Dành cho Quản trị viên (Admin)
1. **Đăng nhập:** Truy cập `/login`, đăng nhập với tài khoản Admin được cấp.
2. **Quản lý danh mục & Sản phẩm:** Vào mục "Sản phẩm", nhấn "Thêm sản phẩm mới" để nhập thông tin, giá bán, biến thể và tải ảnh trực tiếp lên Cloudinary. Dữ liệu sẽ xuất hiện ngay trên trang khách hàng.
3. **Quản lý đơn hàng:** Vào mục "Đơn hàng" để theo dõi các đơn vừa đặt, duyệt đơn và cập nhật trạng thái vận chuyển.
4. **Theo dõi thông báo thời gian thực:** Biểu tượng chuông trên thanh điều hướng sẽ hiển thị số lượng đơn hàng mới hoặc yêu cầu tư vấn cần chuyên viên hỗ trợ.
5. **Khai thác AI BI:** Vào mục "AI BI Analytics" (`/admin/ai-bi`) để xem báo cáo doanh thu, phân tích sản phẩm chuyển đổi kém, dự báo tồn kho và yêu cầu AI Giám đốc Thương mại phân tích chuyên sâu.

---

## 9. Kiểm thử và triển khai (Testing & Deployment)

### 9.1 Chạy các bộ kiểm thử tự động (Automated Testing Suites)

Toàn bộ các bài kiểm thử đã được chạy thực tế trên hệ thống và vượt qua 100%:

```bash
cd Routine_web_demo-main/backend

# 1. Kiểm thử xác thực yêu cầu AI Stylist & giới hạn Payload
npm run test:ai-validation

# 2. Kiểm thử đối chiếu dữ liệu thật sản phẩm AI (Product Grounding)
npm run test:ai-product-grounding

# 3. Kiểm thử phối đồ AI theo ngân sách (Outfit Budgeting)
npm run test:ai-outfit-budget

# 4. Kiểm thử Function Calling của Fashion Agent với Google Gemini
npm run test:fashion-agent

# 5. Kiểm thử khóa tồn kho tạm thời (Stock Reservation)
npm run test:stock-reservations

# 6. Kiểm thử dữ liệu giỏ hàng đối chiếu cơ sở dữ liệu thật
npm run test:cart-database-grounding

# 7. Kiểm thử nhận diện ý định mua hàng (Purchase Intent Scoring)
npm run test:purchase-intent

# 8. Kiểm thử xác thực hợp lệ khi Admin tạo sản phẩm
npm run test:product-validation

# 9. Kiểm thử tải ảnh trực tiếp lên Cloudinary
npm run test:cloudinary

# 10. Chạy toàn bộ kiểm toán API, Bảo mật & Cơ sở dữ liệu (33 API Endpoints & 7 Security Rules)
node scripts/audit_api_security_db.js

# 11. Chạy kiểm thử End-to-End toàn trình mua hàng (Catalog -> Geocoding -> Order -> VNPay -> Paid -> Admin Queue)
node scripts/test_e2e_full_customer_journey.js

# 12. Chạy kiểm thử chu trình thanh toán VNPay Gateway & Chống lặp (Idempotency)
node scripts/test_e2e_payment_lifecycle.js

# 13. Chạy kiểm thử đồng bộ dữ liệu thời gian thực giữa Admin - Storefront - AI
node scripts/test_e2e_admin_storefront_sync.js

# 14. Chạy kiểm thử AI Stylist đa lượt (Sequential Filtering, Condition Updates, Intent Switching)
node scripts/test_e2e_ai_contextual.js
```

### 9.2 Hướng dẫn Build ứng dụng Production
```bash
# Build Backend (Prisma Client generation)
cd Routine_web_demo-main/backend
npm run build

# Build Frontend (Next.js 16 Production Build - 38 Routes compiled)
cd ../frontend
npm run build

# Khởi chạy bản Build hoàn tất
npm run start
```

### 9.3 Triển khai lên Vercel (Vercel Deployment Guide)

Kiến trúc triển khai khuyến nghị trên Vercel:

1. **Frontend (Next.js 16 Storefront):**
   - Import repository `https://github.com/LanAnhDoan05/routine-thu-dong` trên Vercel Dashboard.
   - Thiết lập **Root Directory** là `Routine_web_demo-main/frontend` (hoặc `frontend` nếu triển khai từ thư mục con).
   - Thiết lập Framework Preset: **Next.js**.
   - Cấu hình Environment Variables trên Vercel:
     - `NEXT_PUBLIC_API_URL`: `https://<ten-mien-backend-api-cua-ban>/api/v1`
     - `NEXT_PUBLIC_SITE_URL`: `https://<ten-mien-frontend-vercel-cua-ban>.vercel.app`

2. **Backend (Node.js/Express API):**
   - Triển khai riêng biệt dưới dạng Serverless Functions trên Vercel (sử dụng file `backend/vercel.json` với runtime `@vercel/node`), hoặc triển khai trên các nền tảng Container hỗ trợ Node.js dài hạn (Render, Railway, Fly.io, AWS EC2 / VPS).
   - Thiết lập đầy đủ các biến môi trường Production: `DATABASE_URL` (MySQL Cloud có kết nối SSL), `JWT_SECRET`, `GEMINI_API_KEY`, `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `CLOUDINARY_*`, `SMTP_*`.

---

## 10. Tình trạng dự án và báo cáo nghiệm thu

### Bảng trạng thái xác minh chức năng thực tế

| Phân hệ / Nghiệp vụ | Trạng thái | Bằng chứng kiểm thử thực tế | Ghi chú vận hành |
| :--- | :---: | :--- | :--- |
| **Frontend UI/UX** | **Passed** | Next.js 16 build thành công 38/38 routes; responsive Desktop & Mobile | Thiết kế nhận diện ROUTINE THU ĐÔNG thống nhất |
| **Backend REST API** | **Passed** | 33/33 API endpoints kiểm toán phản hồi HTTP 200 (Latency 15ms - 1300ms) | Kiểm toán qua `audit_api_security_db.js` |
| **Database Integrity** | **Passed** | 0 bản ghi mồ côi (OrderItem: 0, ProductVariant: 0), 57 sản phẩm, 160 biến thể | Đối chiếu trên bảng MySQL `routine_test_db` |
| **Bảo mật & RBAC** | **Passed** | 7/7 kịch bản chặn trái phép (401 không token, 403 khách truy cập admin, chống SQL Injection) | Chặn triệt để mọi truy cập trái quyền |
| **Xác thực Địa chỉ & SĐT** | **Passed** | Chặn tên rỗng, chặn SĐT sai chuẩn di động VN, xác thực địa chỉ 63 tỉnh thành & Geocoding | Kiểm thử tự động trên `orderService.createOrder` |
| **Thanh toán VNPay** | **Passed** | 10/10 tiêu chí đạt: tạo QR động, băm SHA512, cập nhật PAID, chống lặp Idempotency | Chạy qua `test_e2e_payment_lifecycle.js` |
| **AI Stylist Đa Lượt** | **Passed** | 5/5 kịch bản: ghi nhớ bộ lọc qua nhiều lượt, đổi màu, tăng ngân sách, đổi danh mục, 100% dữ liệu thật | Chạy trực tiếp qua `test_e2e_ai_contextual.js` |
| **AI Business Intelligence** | **Passed** | 8/8 endpoint BI hoạt động; KPI tính từ Database thật; Gemini phân tích CCO; bảo mật PII | Đã kiểm tra thực tế trên `/admin/ai-bi` |
| **Thông báo Admin Realtime** | **Passed** | 9/9 ca kiểm thử trình duyệt: nhận đơn mới, nhận lead tư vấn, điều hướng deep link, reload bền vững | Chạy qua `run_e2e_notification_acceptance.js` |
| **Vercel Deployment** | **Phụ thuộc Token** | Frontend & Backend đã cấu hình đầy đủ `vercel.json` và build thành công 100% | Cần người dùng liên kết tài khoản Vercel / cung cấp `VERCEL_TOKEN` |

---
**© 2026 ROUTINE THU ĐÔNG — Giữ toàn quyền phát triển và vận hành.**
