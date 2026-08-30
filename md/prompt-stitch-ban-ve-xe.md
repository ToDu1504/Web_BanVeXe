# Prompt Google Stitch — Redesign "Đặt Vé Xe Khách"

## 0. Cách dùng

1. Tạo project mới trong Google Stitch, chọn **Web**.
2. Dán **Prompt 1 — Design System** trước tiên để Stitch lập "gu" thiết kế chung (màu, font, style card/button).
3. Sau đó dán lần lượt từng prompt trang trong cùng project (không tạo project mới) để các màn hình dùng chung 1 hệ thống thiết kế.
4. Nếu Stitch generate lệch tông màu, thêm câu: *"Giữ nguyên design system đã thiết lập, chỉ đổi nội dung màn hình."*
5. Có 4 vai trò: Khách vãng lai/Khách hàng (xanh dương làm chủ đạo, cam cho nút CTA), Nhân viên & Admin (cùng bảng màu nhưng thiên về giao diện quản trị — sidebar, bảng dữ liệu).

Ghi chú: bảng màu hiện tại của code (`frontend/src/styles/globals.css`) đang là nền trung tính/đen; các prompt dưới đây đổi `--primary` sang xanh dương theo đúng định hướng PRD gốc của dự án.

---

## 1. Prompt tổng — Design System

```
Thiết kế hệ thống giao diện (design system) cho "Đặt Vé Xe Khách" — website bán vé xe khách trực tuyến tại Việt Nam, phục vụ 4 vai trò: khách vãng lai, khách hàng, nhân viên quầy vé, quản trị viên.

Định hướng thương hiệu: tin cậy, chuyên nghiệp, giống một hãng xe khách chất lượng cao (kiểu Phương Trang, Futa) nhưng giao diện hiện đại, tối giản như một SaaS/app đặt vé máy bay.

Bảng màu:
- Primary: xanh dương #3B82F6 (dùng cho header, link, icon chính, trạng thái active, biểu đồ)
- Primary hover/dark: #2563EB
- Accent (CTA quan trọng — nút "Đặt vé", "Thanh toán"): cam #F97316
- Success (vé đã thanh toán, ghế trống): xanh lá #16A34A
- Warning (chờ thanh toán): vàng cam #F59E0B
- Destructive (hủy vé, ghế đã đặt): đỏ #DC2626
- Nền sáng: trắng #FFFFFF / xám rất nhạt #F8FAFC cho section xen kẽ
- Chế độ tối: nền xanh than đậm gần đen (#0B1220), card #111827, primary xanh dương sáng hơn (#60A5FA) để đủ tương phản

Typography: font Inter (sans-serif hiện đại), heading đậm (600-700), body chữ thường, cỡ chữ rõ ràng cho bảng số liệu (tabular numbers cho giá vé, doanh thu).

Layout: mobile-first, responsive, bo góc medium (8-12px), shadow nhẹ cho card, nhiều khoảng trắng. Trang khách hàng dùng layout content rộng rãi kiểu landing/e-commerce; trang nhân viên/admin dùng layout dashboard với sidebar trái collapsible + topbar.

Component style: nút bo góc, input có border mảnh + focus ring xanh dương, badge trạng thái dạng pill có màu semantic (xanh lá/vàng/đỏ), bảng dữ liệu có hover row, sơ đồ ghế xe dạng lưới ô vuông bo góc (ghế trống viền xám, ghế chọn nền xanh dương, ghế đã đặt nền đỏ nhạt gạch chéo).

Animation: chuyển trang mượt (fade + slide nhẹ), danh sách card xuất hiện so le (stagger), modal scale-in.

Hỗ trợ Dark Mode đầy đủ, giữ đúng tỉ lệ tương phản.
```

---

## 2. Khách vãng lai / Khách hàng (Public + Customer)

### 2.1 Trang chủ & Tìm chuyến xe (Home)

```
Thiết kế trang chủ web bán vé xe khách, tông màu chủ đạo xanh dương #3B82F6.

Header: logo bên trái, menu (Trang chủ, Tra cứu vé, Chính sách), nút "Đăng nhập" viền xanh dương + nút "Đăng ký" nền xanh dương.

Hero section: hình ảnh xe khách hiện đại, tiêu đề ngắn gọn kiểu "Đặt vé xe khách nhanh chóng, an toàn", bên dưới là form tìm chuyến dạng card nổi đè lên hero — gồm 4 trường: Điểm đi (dropdown), Điểm đến (dropdown, có nút đảo chiều ở giữa), Ngày đi (date picker), Số hành khách (number input), nút "Tìm chuyến xe" màu cam nổi bật.

Bên dưới hero: danh sách "Chuyến xe nổi bật" hoặc kết quả tìm kiếm — dạng lưới card, mỗi card gồm: tên nhà xe, tuyến (Điểm đi → Điểm đến) với icon mũi tên, giờ khởi hành - giờ đến, loại xe (giường nằm/ghế ngồi), số ghế trống, giá vé nổi bật màu xanh dương đậm, nút "Chọn chuyến" màu cam. Card có hiệu ứng xuất hiện so le khi cuộn.

Section tin cậy: 3-4 điểm nổi bật dạng icon (An toàn, Đúng giờ, Hỗ trợ 24/7, Thanh toán đa dạng).

Footer nhiều cột: Về chúng tôi, Chính sách (Điều khoản, Bảo mật, Hủy vé), Liên hệ, mạng xã hội. Nền footer xanh dương đậm/xanh than, chữ trắng.
```

### 2.2 Chi tiết chuyến xe & Đặt vé (Trip Detail + Book Ticket)

```
Thiết kế trang chi tiết chuyến xe và đặt vé cho web bán vé xe khách, tông chủ đạo xanh dương #3B82F6, layout 2 cột trên desktop (1 cột trên mobile).

Trên cùng: breadcrumb + thông tin tóm tắt chuyến (nhà xe, tuyến đi, giờ khởi hành, loại xe, điểm đón/trả).

Cột trái (chiếm ~65%): Sơ đồ ghế xe khách tương tác — dạng lưới 2 tầng (giường nằm) hoặc lưới ghế ngồi, mỗi ghế là ô vuông bo góc có mã ghế; 3 trạng thái màu: ghế trống (viền xám, nền trắng), ghế đang chọn (nền xanh dương #3B82F6, chữ trắng, có dấu check), ghế đã đặt (nền đỏ nhạt, gạch chéo, không click được). Có chú thích màu (legend) phía trên sơ đồ. Dưới sơ đồ ghế là form thông tin hành khách: họ tên, số điện thoại, email — style input hiện đại với label nổi.

Cột phải (sticky, ~35%): Card "Tóm tắt đơn hàng" — liệt kê ghế đã chọn + giá từng ghế, tổng tiền in đậm màu xanh dương, chọn phương thức thanh toán (thẻ radio: Tiền mặt / MoMo có icon), nút "Xác nhận đặt vé" lớn màu cam full-width ở cuối card.
```

### 2.3 Lịch sử hóa đơn (Invoice History — Customer)

```
Thiết kế trang "Lịch sử hóa đơn" cho khách hàng đã đăng nhập, tông xanh dương #3B82F6.

Header trang: tiêu đề "Hóa đơn của tôi", thanh filter theo trạng thái (Tất cả / Chờ thanh toán / Đã thanh toán / Đã hủy) dạng tab hoặc segmented control màu xanh dương khi active.

Danh sách hóa đơn dạng card xếp dọc (không phải bảng), mỗi card gồm: mã hóa đơn, ngày đặt, tuyến xe + giờ khởi hành, số vé, tổng tiền (in đậm), badge trạng thái pill màu semantic (vàng = chờ thanh toán, xanh lá = đã thanh toán, đỏ = đã hủy), nút hành động bên phải: "Thanh toán MoMo" (nếu đang chờ thanh toán, màu hồng MoMo) hoặc "Hủy vé" (viền đỏ) hoặc "Xem chi tiết".

Trạng thái rỗng (chưa có hóa đơn nào): minh họa đơn giản + nút "Tìm chuyến xe ngay" màu cam.
```

### 2.4 Trang cá nhân (Profile — dùng chung Customer/Staff/Admin)

```
Thiết kế trang "Thông tin cá nhân" cho web bán vé xe khách, tông xanh dương #3B82F6.

Layout 2 cột: cột trái nhỏ hiển thị avatar tròn (viền xanh dương), tên, vai trò (badge), email; cột phải là 2 card xếp dọc — Card "Cập nhật thông tin" (họ tên, số điện thoại, email — email disabled) với nút "Lưu thay đổi" xanh dương, và Card "Đổi mật khẩu" (mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu) với nút viền xanh dương "Cập nhật mật khẩu".
```

### 2.5 Đăng nhập / Đăng ký (Login / Register)

```
Thiết kế trang đăng nhập và đăng ký cho web bán vé xe khách, tông xanh dương #3B82F6, layout căn giữa màn hình, form card trắng bo góc trên nền có gradient xanh dương nhạt hoặc hình minh họa xe khách bên cạnh (layout 2 cột trên desktop: bên trái hình ảnh/thương hiệu nền xanh dương đậm, bên phải form trắng).

Đăng nhập: logo phía trên, tiêu đề "Đăng nhập", input Email + Mật khẩu (có icon show/hide), link "Quên mật khẩu?", nút "Đăng nhập" nền xanh dương full-width, dòng "Chưa có tài khoản? Đăng ký ngay" bên dưới.

Đăng ký: cùng phong cách, thêm các trường Họ tên, Số điện thoại, Xác nhận mật khẩu, checkbox đồng ý điều khoản, nút "Đăng ký" nền xanh dương.
```

### 2.6 Kết quả thanh toán MoMo (Payment Return)

```
Thiết kế trang kết quả thanh toán sau khi redirect từ MoMo, tông xanh dương #3B82F6, layout căn giữa, card đơn giản.

Trạng thái thành công: icon check tròn lớn màu xanh lá, tiêu đề "Thanh toán thành công", tóm tắt mã hóa đơn + số tiền, 2 nút bên dưới: "Xem hóa đơn" (xanh dương) và "Về trang chủ" (viền xám).

Trạng thái thất bại: icon dấu X tròn màu đỏ, tiêu đề "Thanh toán thất bại", mô tả ngắn, nút "Thử lại thanh toán" màu cam và "Về trang chủ" viền xám.

Có thêm state đang xử lý: spinner tròn xanh dương + text "Đang xác nhận thanh toán...".
```

### 2.7 Trang chính sách (Terms / Privacy Policy / Cancellation Policy)

```
Thiết kế trang nội dung tĩnh (điều khoản sử dụng / chính sách bảo mật / chính sách hủy vé) cho web bán vé xe khách, tông xanh dương #3B82F6.

Header trang đơn giản: tiêu đề lớn căn giữa, ngày cập nhật gần nhất bên dưới dạng chữ nhỏ màu xám.

Nội dung: layout 1 cột rộng vừa phải (dễ đọc, ~700-800px), các mục có heading rõ ràng đánh số hoặc gạch đầu dòng, khoảng cách dòng thoải mái. Có mục lục (table of contents) dạng sticky sidebar bên trái trên desktop, ẩn thành accordion trên mobile, các link mục lục màu xanh dương khi hover/active.
```

---

## 3. Nhân viên (Staff)

### 3.1 Quản lý hóa đơn (Manage Invoice)

```
Thiết kế trang quản lý hóa đơn toàn hệ thống dành cho nhân viên, tông xanh dương #3B82F6, layout dashboard có sidebar trái (menu: Quản lý hóa đơn, Xem chuyến xe, Tra cứu tuyến/xe, Đặt vé tại quầy, Thống kê) + topbar (avatar, tên nhân viên, nút đăng xuất).

Nội dung chính: thanh filter nâng cao phía trên (tìm theo tên/SĐT khách, trạng thái thanh toán, khoảng ngày) dạng hàng ngang các input/select nhỏ gọn.

Bảng dữ liệu: cột Mã hóa đơn, Khách hàng, Chuyến xe, Số vé, Tổng tiền, Trạng thái (badge màu semantic), Ngày đặt, Hành động (dropdown menu: Cập nhật trạng thái, Hủy hóa đơn, Hủy vé riêng lẻ, Xem chi tiết). Bảng có hover row, phân trang phía dưới.

Khi bấm "Xem chi tiết": mở dialog/sheet liệt kê từng vé trong hóa đơn kèm nút hủy từng vé riêng lẻ.
```

### 3.2 Xem chuyến xe & Sơ đồ ghế (View Trips)

```
Thiết kế trang xem danh sách chuyến xe cho nhân viên (chế độ chỉ xem + đặt vé hộ), tông xanh dương #3B82F6, layout dashboard sidebar trái.

Danh sách chuyến dạng bảng hoặc card gọn: tuyến, giờ khởi hành, xe, số ghế trống/tổng, trạng thái chuyến (badge: sắp chạy/đang chạy/đã hoàn thành). Mỗi dòng có nút "Xem sơ đồ ghế" mở dialog lớn hiển thị sơ đồ ghế tương tác (ghế trống/đã đặt, giống trang khách hàng) kèm nút "Đặt vé cho khách" màu cam để chuyển sang luồng đặt vé tại quầy.
```

### 3.3 Tra cứu tuyến xe / xe khách (View Routes / View Vehicles — read-only)

```
Thiết kế 2 trang tra cứu (read-only) cho nhân viên: "Tra cứu tuyến xe" và "Tra cứu xe khách", tông xanh dương #3B82F6, layout dashboard sidebar trái, không có nút thêm/sửa/xóa (chỉ xem + ô tìm kiếm/lọc).

Trang tuyến xe: bảng gồm Điểm đi, Điểm đến, Khoảng cách, Thời gian di chuyển dự kiến, Giá vé cơ bản.

Trang xe khách: dạng lưới card, mỗi card gồm ảnh minh họa loại xe, biển số, loại xe (giường nằm/ghế ngồi), tổng số ghế, badge trạng thái (đang hoạt động/bảo trì).
```

### 3.4 Thống kê (Statistics)

```
Thiết kế trang thống kê doanh thu cho nhân viên, tông xanh dương #3B82F6, layout dashboard sidebar trái.

Trên cùng: 3 stat card ngang hàng (Doanh thu hôm nay, Số vé bán hôm nay, Số chuyến đang chạy) — icon tròn nền xanh dương nhạt, số liệu lớn in đậm, mũi tên tăng/giảm % nhỏ màu xanh lá/đỏ.

Bên dưới: 2 biểu đồ — Line chart "Doanh thu theo ngày" (đường màu xanh dương, có gradient fill nhạt phía dưới đường), Bar chart "Doanh thu theo tháng" (cột màu xanh dương, cột đang chọn màu cam để nổi bật). Có bộ lọc khoảng thời gian (7 ngày/30 ngày/theo tháng) dạng segmented control phía trên biểu đồ.
```

---

## 4. Quản trị viên (Admin)

### 4.1 Dashboard

```
Thiết kế trang Dashboard tổng quan cho quản trị viên web bán vé xe khách, tông xanh dương #3B82F6, layout sidebar trái cố định (menu: Dashboard, Quản lý tuyến xe, Quản lý chuyến xe, Quản lý xe khách, Quản lý người dùng) + topbar trên cùng.

Hàng đầu: 4 stat card ngang hàng — Doanh thu hôm nay, Vé bán hôm nay, Chuyến đang chạy, Tổng người dùng — mỗi card icon riêng (Ticket, Bus, Activity, Users) nền tròn xanh dương nhạt, số liệu lớn.

Hàng giữa: biểu đồ mini doanh thu (line chart xanh dương, gradient fill) chiếm 2/3 chiều ngang, cạnh đó là danh sách "Chuyến xe sắp khởi hành" dạng list gọn (tuyến, giờ, badge số ghế trống).

Hàng dưới: bảng "5 chuyến xe gần nhất" — cột tuyến, giờ khởi hành, xe, ghế trống, trạng thái badge.
```

### 4.2 Quản lý tuyến xe (Manage Routes)

```
Thiết kế trang quản lý tuyến xe (CRUD) cho admin, tông xanh dương #3B82F6, layout dashboard sidebar trái.

Header nội dung: tiêu đề "Quản lý tuyến xe", ô tìm kiếm bên trái, nút "+ Thêm tuyến xe" nền xanh dương bên phải.

Bảng: Điểm đi, Điểm đến, Khoảng cách (km), Thời gian dự kiến, Giá vé cơ bản, Hành động (icon sửa/xóa). Bấm "+ Thêm" hoặc "Sửa" mở Dialog form: Điểm đi, Điểm đến, Khoảng cách, Thời gian, Giá vé — nút "Lưu" xanh dương, "Hủy" viền xám. Xóa có dialog xác nhận màu đỏ.
```

### 4.3 Quản lý chuyến xe (Manage Trips)

```
Thiết kế trang quản lý chuyến xe (CRUD) cho admin, tông xanh dương #3B82F6, layout dashboard sidebar trái.

Bảng: Tuyến xe, Xe khách gán, Giờ khởi hành, Giờ đến, Giá vé, Ghế trống/Tổng, Trạng thái (badge). Nút "+ Thêm chuyến xe" mở Dialog form: chọn Tuyến (select), chọn Xe khách (select), Ngày giờ khởi hành (date+time picker dạng Calendar popover), Giá vé — nút "Lưu" xanh dương.
```

### 4.4 Quản lý xe khách (Manage Vehicles)

```
Thiết kế trang quản lý xe khách (CRUD) cho admin, tông xanh dương #3B82F6, layout dashboard sidebar trái.

Danh sách dạng lưới card hoặc bảng: Biển số, Loại xe, Tổng số ghế, Trạng thái hoạt động (Switch bật/tắt), nút sửa/xóa. Form thêm/sửa xe trong Dialog: Biển số, Loại xe (select: ghế ngồi/giường nằm), Tổng số ghế, và trình cấu hình sơ đồ ghế trực quan (lưới ô có thể bấm để tạo/xóa vị trí ghế, thay vì nhập JSON thô) — có preview sơ đồ ghế xanh dương bên cạnh.
```

### 4.5 Quản lý người dùng (Manage Users)

```
Thiết kế trang quản lý người dùng cho admin, tông xanh dương #3B82F6, layout dashboard sidebar trái.

Header: tiêu đề "Quản lý người dùng", ô tìm kiếm theo tên/email, filter theo vai trò (dropdown: Khách hàng/Nhân viên/Admin).

Bảng: Avatar tròn nhỏ, Họ tên, Email, Số điện thoại, Vai trò (Select đổi role trực tiếp trong bảng, dùng badge màu khác nhau theo vai trò — khách hàng xám, nhân viên xanh dương, admin tím), Trạng thái hoạt động (Switch bật/tắt màu xanh dương khi bật), Ngày tạo. Không có cột xóa cứng — chỉ khóa/mở khóa tài khoản qua Switch.
```
