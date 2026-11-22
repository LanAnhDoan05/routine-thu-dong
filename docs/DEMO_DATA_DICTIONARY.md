# TỪ ĐIỂN DỮ LIỆU MÔ PHỎNG KINH DOANH THỰC TẾ (DEMO DATA DICTIONARY)
**Dự án:** Routine Web E-commerce  
**Môi trường:** `routine_test_db`  
**Phiên bản dữ liệu:** Synthetic Simulation Dataset v2.0  
**Ngày phát hành:** 14/11/2026  

---

## I. MỤC ĐÍCH VÀ NGUYÊN TẮC PHÂN ĐỊNH DỮ LIỆU

> [!IMPORTANT]
> **Tuyên bố minh bạch dữ liệu:** Dữ liệu khách hàng và đơn hàng trong tài liệu này là **bộ dữ liệu mô phỏng vận hành thực tế (Synthetic / Business Simulation Dataset)**. Hệ thống không sử dụng dữ liệu định danh của người thật và không phát sinh giao dịch tiền tệ thật. Bộ dữ liệu này phục vụ trình diễn trọn vẹn nghiệp vụ mua sắm, quản trị, vận chuyển, báo cáo tài chính và Trí tuệ Nhân tạo.

### Dấu hiệu phân biệt trong Cơ sở dữ liệu:
- **Tài khoản người dùng mô phỏng:** Cột `source` trong bảng `users` được gán giá trị **`DEMO`**.
- **Đơn hàng mô phỏng:** Cột `attribution_source` trong bảng `orders` mang giá trị **`DEMO`**, trường `note` mang tiền tố **`[MÔ PHỎNG VẬN HÀNH THỰC TẾ]`**.
- **Liên kết thực:** Toàn bộ đơn hàng mô phỏng liên kết 100% với danh mục 38 sản phẩm thật, biến thể size/màu thật và áp dụng đúng bảng giá vận chuyển hành chính.

---

## II. TẬP KHÁCH HÀNG MÔ PHỎNG (35 CUSTOMER PROFILES)

Tất cả tài khoản khách hàng mô phỏng đều có mật khẩu đăng nhập đồng nhất: **`Customer@123456`**.

### 1. Khu vực Miền Bắc (Hà Nội & lân cận - 13 khách hàng)
1. **Nguyễn Hoàng Nam** | Email: `hoangnam.hn@demo.vn` | SĐT: `0912001001` | Đ/c: 18 Phố Huế, P. Hàng Bài, Q. Hoàn Kiếm, Hà Nội
2. **Lê Tuấn Anh** | Email: `tuananh.hn@demo.vn` | SĐT: `0912001002` | Đ/c: 45 Xuân Thủy, P. Dịch Vọng Hậu, Q. Cầu Giấy, Hà Nội
3. **Phạm Minh Đức** | Email: `minhduc.hn@demo.vn` | SĐT: `0912001003` | Đ/c: 128 Chùa Bộc, P. Quang Trung, Q. Đống Đa, Hà Nội
4. **Trần Thị Mai** | Email: `maitran.hn@demo.vn` | SĐT: `0912001004` | Đ/c: 86 Đội Cấn, P. Đội Cấn, Q. Ba Đình, Hà Nội
5. **Nguyễn Thùy Linh** | Email: `thuylinh.hn@demo.vn` | SĐT: `0912001005` | Đ/c: 210 Bà Triệu, P. Lê Đại Hành, Q. Hai Bà Trưng, Hà Nội
6. **Vũ Phương Thảo** | Email: `phuongthao.hn@demo.vn` | SĐT: `0912001006` | Đ/c: 72 Nguyễn Trãi, P. Thượng Đình, Q. Thanh Xuân, Hà Nội
7. **Đỗ Hải Đăng** | Email: `haidang.hn@demo.vn` | SĐT: `0912001007` | Đ/c: 55 Lạc Long Quân, P. Bưởi, Q. Tây Hồ, Hà Nội
8. **Hoàng Bích Ngọc** | Email: `bichngoc.hn@demo.vn` | SĐT: `0912001008` | Đ/c: 14 Quang Trung, P. Quang Trung, Q. Hà Đông, Hà Nội
9. **Phan Gia Huy** | Email: `giahuy.hn@demo.vn` | SĐT: `0912001009` | Đ/c: 320 Nguyễn Văn Cừ, P. Bồ Đề, Q. Long Biên, Hà Nội
10. **Đặng Thanh Hằng** | Email: `thanhhang.hn@demo.vn` | SĐT: `0912001010` | Đ/c: 15 Lê Đức Thọ, P. Mỹ Đình 2, Q. Nam Từ Liêm, Hà Nội
11. **Bùi Anh Khoa** | Email: `anhkhoa.hn@demo.vn` | SĐT: `0912001011` | Đ/c: 89 Giải Phóng, P. Giáp Bát, Q. Hoàng Mai, Hà Nội
12. **Đỗ Khánh Linh** | Email: `khanhlinh.hn@demo.vn` | SĐT: `0912001012` | Đ/c: 42 Cổ Loa, Xã Cổ Loa, Huyện Đông Anh, Hà Nội
13. **Dương Thùy Chi** | Email: `thuychi.lc@demo.vn` | SĐT: `0919008001` | Đ/c: 12 Đường Fansipan, P. Sa Pa, Thị xã Sa Pa, Lào Cai

### 2. Khu vực Miền Nam (TP. Hồ Chí Minh & Đông Nam Bộ - 14 khách hàng)
14. **Trần Đình Trọng** | Email: `dinhtrong.hcm@demo.vn` | SĐT: `0913002001` | Đ/c: 120 Lê Lợi, P. Bến Thành, Quận 1, TP.HCM
15. **Vũ Quốc Bảo** | Email: `quocbao.hcm@demo.vn` | SĐT: `0913002002` | Đ/c: 254 CMT8, P. 10, Quận 3, TP.HCM
16. **Lê Ngọc Ánh** | Email: `ngocanh.hcm@demo.vn` | SĐT: `0913002003` | Đ/c: 82 Trần Hưng Đạo, P. 7, Quận 5, TP.HCM
17. **Hoàng Văn Hùng** | Email: `vanhung.hcm@demo.vn` | SĐT: `0913002004` | Đ/c: 11 Sư Vạn Hạnh, P. 12, Quận 10, TP.HCM
18. **Phạm Thu Trang** | Email: `thutrang.hcm@demo.vn` | SĐT: `0913002005` | Đ/c: 168 Phan Xích Long, P. 2, Q. Phú Nhuận, TP.HCM
19. **Bùi Thúy Hằng** | Email: `thuyhang.hcm@demo.vn` | SĐT: `0913002006` | Đ/c: 49 Điện Biên Phủ, P. 15, Q. Bình Thạnh, TP.HCM
20. **Đặng Tiến Đạt** | Email: `tiendat.hcm@demo.vn` | SĐT: `0913002007` | Đ/c: 35 Quang Trung, P. 10, Q. Gò Vấp, TP.HCM
21. **Phan Diệu Linh** | Email: `dieulinh.hcm@demo.vn` | SĐT: `0913002008` | Đ/c: 78 Trường Chinh, P. 12, Q. Tân Bình, TP.HCM
22. **Dương Trọng Nghĩa** | Email: `trongnghia.hcm@demo.vn` | SĐT: `0913002009` | Đ/c: 105 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM
23. **Nguyễn Hải Yến** | Email: `haiyen.hcm@demo.vn` | SĐT: `0913002010` | Đ/c: 22 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP.HCM
24. **Ngô Quốc Cường** | Email: `quoccuong.hcm@demo.vn` | SĐT: `0913002011` | Đ/c: 310 Tên Lửa, P. Bình Trị Đông B, Q. Bình Tân, TP.HCM
25. **Trần Bảo Trâm** | Email: `baotram.hcm@demo.vn` | SĐT: `0913002012` | Đ/c: 15 Lê Văn Khương, P. Thới An, Quận 12, TP.HCM
26. **Đinh Thế Anh** | Email: `theanh.bd@demo.vn` | SĐT: `0917006001` | Đ/c: 512 Đại lộ Bình Dương, P. Hiệp Thành, TP. Thủ Dầu Một, Bình Dương
27. **Hoàng Lan Anh** | Email: `lananh.vt@demo.vn` | SĐT: `0918007001` | Đ/c: 36 Ba Cu, Phường 1, TP. Vũng Tàu, Bà Rịa - Vũng Tàu

### 3. Khu vực Miền Trung & Miền Tây (8 khách hàng)
28. **Hà Quang Vinh** | Email: `quangvinh.dn@demo.vn` | SĐT: `0914003001` | Đ/c: 58 Bạch Đằng, P. Hải Châu 1, Q. Hải Châu, Đà Nẵng
29. **Lê Mỹ Duyên** | Email: `myduyen.dn@demo.vn` | SĐT: `0914003002` | Đ/c: 112 Điện Biên Phủ, P. Chính Gián, Q. Thanh Khê, Đà Nẵng
30. **Đoàn Minh Khôi** | Email: `minhkhoi.dn@demo.vn` | SĐT: `0914003003` | Đ/c: 34 Nguyễn Văn Thoại, P. An Hải Đông, Q. Sơn Trà, Đà Nẵng
31. **Phạm Quỳnh Nga** | Email: `quynhnga.dn@demo.vn` | SĐT: `0914003004` | Đ/c: 88 Ngũ Hành Sơn, P. Mỹ An, Q. Ngũ Hành Sơn, Đà Nẵng
32. **Mai Văn Sơn** | Email: `vanson.hp@demo.vn` | SĐT: `0915004001` | Đ/c: 45 Cầu Đất, P. Cầu Đất, Q. Ngô Quyền, Hải Phòng
33. **Vũ Thảo Vy** | Email: `thaovy.hp@demo.vn` | SĐT: `0915004002` | Đ/c: 180 Tô Hiệu, P. Trại Cau, Q. Lê Chân, Hải Phòng
34. **Trương Hữu Phước** | Email: `huuphuoc.ct@demo.vn` | SĐT: `0916005001` | Đ/c: 25 Đại lộ Hòa Bình, P. Tân An, Q. Ninh Kiều, Cần Thơ
35. **Đỗ Ngọc Huyền** | Email: `ngochuyen.ct@demo.vn` | SĐT: `0916005002` | Đ/c: 140 đường 30 Tháng 4, P. Hưng Lợi, Q. Ninh Kiều, Cần Thơ

---

## III. CƠ CHẾ SINH VÀ PHÂN BỔ 75 ĐƠN HÀNG MÔ PHỎNG

### 1. Phân bổ theo trạng thái đơn hàng (Order Status Distribution)
- **`DELIVERED` (Hoàn tất giao hàng):** 50 đơn (~66.7%). Tất cả đơn đều có trạng thái thanh toán `PAID`.
- **`SHIPPING` (Đang vận chuyển trên đường):** 9 đơn (~12.0%). Trạng thái thanh toán: `PAID` (nếu trả qua VNPay/MoMo) hoặc `UNPAID` (nếu COD).
- **`CONFIRMED` (Đã duyệt, đang đóng gói tại kho):** 8 đơn (~10.7%).
- **`PENDING` (Chờ khách thanh toán):** 4 đơn (~5.3%). Trạng thái thanh toán: `UNPAID`.
- **`CANCELLED` (Đơn hủy hợp lệ):** 4 đơn (~5.3%). Đi kèm lý do hủy thực tế (khách đổi size, trùng đơn), trạng thái thanh toán `UNPAID` hoặc `REFUNDED`.

### 2. Dòng thời gian kinh doanh 6 tháng (Timeline)
- **Tháng 06/2026:** 8 đơn hàng (khởi đầu chiến dịch mùa hè).
- **Tháng 07/2026:** 12 đơn hàng (tăng trưởng đều).
- **Tháng 08/2026:** 14 đơn hàng (cao điểm hè).
- **Tháng 09/2026:** 16 đơn hàng (Back to School).
- **Tháng 10/2026:** 15 đơn hàng (chuyển mùa Thu Đông).
- **Tháng 11/2026:** 10 đơn hàng (gần nhất, phục vụ các luồng xử lý đơn mới).

### 3. Nguyên tắc tính toán tài chính nhất quán (Mathematical Invariants)
Mỗi đơn hàng được kiểm soát độ chính xác tuyệt đối theo công thức:
$$\text{Total} = \text{Subtotal} + \text{ShippingFee} - \text{Discount}$$
Trong đó:
- $\text{Subtotal} = \sum (\text{Đơn giá sản phẩm} \times \text{Số lượng})$.
- $\text{ShippingFee}$: Tính toán tự động theo bảng giá hành chính (20k / 30k / 35k / 45k), miễn phí khi $\text{Subtotal} \ge 499.000\text{đ}$.
- $\text{Discount}$: Áp dụng theo mã coupon hợp lệ (`ROUTINE50K`, `WELCOME10`, `FREESHIP`).

---

## IV. BẢNG TỔNG HỢP CHỈ SỐ KINH DOANH SAU KHI NẠP DỮ LIỆU

| Chỉ số kinh doanh (KPI) | Giá trị thực tế trên Database | Ý nghĩa nghiệp vụ |
| :--- | :---: | :--- |
| **Tổng số đơn hàng hệ thống** | **119 đơn hàng** | Bao gồm 75 đơn mô phỏng mới + 44 đơn baseline |
| **Tổng số đơn hàng hợp lệ** | **96 đơn hàng** | Các đơn phát sinh doanh thu không bị hủy |
| **Đơn hàng đã giao thành công** | **55 đơn hàng** | Đã thu tiền thành công, cập nhật tồn kho |
| **Doanh thu thuần đã thanh toán** | **100.908.200 VNĐ** | Tiền mặt / chuyển khoản đã đối soát thành công |
| **Doanh thu ghi nhận hợp lệ** | **118.279.200 VNĐ** | Bao gồm cả các đơn đang giao và đang đóng gói |
| **Giá trị đơn hàng trung bình (AOV)** | **1.232.075 VNĐ** | Phù hợp với phân khúc thời trang cao cấp Routine |
| **Tổng khách hàng trong CRM** | **37 khách hàng** | Phân loại RFM: Champions, Loyal, At Risk,... |
| **Tổng sản phẩm trong kho** | **3.175 sản phẩm** | Tổng giá trị hàng hóa kho: 1.946.205.000 VNĐ |
