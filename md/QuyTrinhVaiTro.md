# Quy trình thực hiện tác vụ theo 4 vai trò

Tài liệu mô tả **quy trình thao tác thực tế trên hệ thống** (không phải thiết kế lý thuyết) cho 4 vai trò: **Khách vãng lai**, **Khách hàng**, **Nhân viên**, **Quản trị viên**. Nội dung được rút trực tiếp từ route map (`frontend/src/router/AppRouter.jsx`), các trang UI thật (`frontend/src/pages/**`) và logic backend tương ứng — phản ánh đúng những gì hệ thống đang làm tại thời điểm viết tài liệu này, sau 2 đợt vá lỗi (chi tiết cơ chế xem ghi chú trong `CLAUDE.md`):

- **Đợt 1 (4 lỗi nghiêm trọng)**: giá vé giả mạo, ghế "chết" sau hủy vé lẻ, xóa cascade mất lịch sử tài chính, hóa đơn `pending` giữ ghế vô thời hạn.
- **Đợt 2 (6 điểm chưa hợp lý)**: admin không đặt vé hộ được, hủy chuyến không cascade hủy vé/hoàn tiền, tạo/sửa chuyến thiếu ràng buộc (giờ quá khứ, trùng lịch xe, sức chứa), đổi sức chứa/sơ đồ ghế xe không kiểm tra chuyến đang chạy, chính sách hủy vé 24h không được thực thi, chuyển trạng thái hóa đơn tùy tiện.

Xác thực: JWT lưu trong **HttpOnly cookie**, mọi route được bảo vệ 2 lớp — `PrivateRoute` ở frontend (redirect nếu sai vai trò) và middleware `protect` + `authorize(...)` ở backend (chặn thật sự).

---

## 1. Khách vãng lai (Guest — chưa đăng nhập)

### Quy trình 1: Tìm kiếm chuyến xe
1. Vào trang chủ (`/`).
2. Chọn **Điểm đi**, **Điểm đến** (dropdown động theo dữ liệu tuyến thật), hoặc dùng nút hoán đổi. Có thể bỏ qua bước này bằng cách bấm thẳng vào một **"Tuyến đường phổ biến"** (chỉ hiển thị các tuyến xuất phát từ Sài Gòn).
3. Chọn **Ngày đi** (không cho chọn ngày trong quá khứ).
4. Bấm **"Tìm Kiếm Chuyến Xe"**.
5. Xem danh sách kết quả (thẻ chuyến xe) hoặc thông báo "Không có chuyến xe nào phù hợp".

### Quy trình 2: Xem chi tiết chuyến & chọn ghế
1. Từ kết quả tìm kiếm, bấm vào một chuyến → trang chi tiết.
2. Xem hành trình, loại xe, giờ khởi hành/đến, giá vé.
3. Chọn ghế trên sơ đồ ghế trực quan (chỉ chọn được ghế còn trống).
4. Bấm **"Tiếp tục đặt vé"**.
5. Hệ thống kiểm tra đăng nhập: **chưa đăng nhập** → chuyển sang trang Đăng nhập (giữ lại đường dẫn quay về sau khi đăng nhập thành công); **đã đăng nhập** → sang bước hoàn tất đặt vé (Quy trình 6, dành cho Khách hàng).

### Quy trình 3: Đăng ký tài khoản
1. Vào `/register`.
2. Nhập Họ tên, Email, Số điện thoại (đúng định dạng VN), Mật khẩu, Xác nhận mật khẩu.
3. Bấm **"Đăng ký"** → chuyển sang trang Đăng nhập.

### Quy trình 4: Đăng nhập
1. Vào `/login` (trực tiếp hoặc bị chuyển hướng từ bước chọn ghế).
2. Nhập Email, Mật khẩu.
3. Bấm **"Đăng nhập"** → điều hướng theo vai trò: **admin** → `/admin/dashboard`, **staff** → `/staff/invoices`, **customer** → trang trước đó hoặc trang chủ.

### Quy trình 5: Đọc các trang chính sách
Xem Điều khoản dịch vụ, Chính sách bảo mật, Chính sách hủy vé — chỉ đọc, không có thao tác.

---

## 2. Khách hàng (Customer)

Kế thừa toàn bộ Quy trình 1–2 (đã đăng nhập vẫn tìm/xem/chọn ghế bình thường), cộng thêm:

### Quy trình 6: Hoàn tất đặt vé
1. Tại trang nhập thông tin đặt vé (`/customer/book`), nhập **Họ tên** và **Số điện thoại hành khách** cho từng ghế đã chọn.
2. Chọn phương thức thanh toán: **Ví MoMo** hoặc **Tiền mặt**.
3. Bấm **"Xác nhận đặt vé"**:
   - Backend tạo `Invoice (pending)` + `Ticket (booked)` cho từng ghế trong **một transaction**, tự tính giá từ `Trip.price` (không tin giá do client gửi), khóa dòng `Trip` để tránh 2 người đặt trùng ghế cùng lúc.
   - Nếu **MoMo**: chuyển sang cổng thanh toán sandbox MoMo.
   - Nếu **Tiền mặt**: báo đặt vé thành công, chuyển sang trang Lịch sử hóa đơn — hóa đơn ở trạng thái **"Chờ thanh toán"** cho tới khi nhân viên xác nhận đã thu tiền.
4. (Nhánh MoMo) Sau khi thanh toán, MoMo chuyển hướng trình duyệt về trang kết quả (`/payment/momo/return`) → hệ thống xác thực chữ ký và cập nhật hóa đơn thành **"Đã thanh toán"**.
5. Nếu hóa đơn vẫn **"Chờ thanh toán"** quá thời hạn cấu hình (`PENDING_INVOICE_TTL_MINUTES`, mặc định 30 phút), hệ thống **tự động hủy** và trả ghế lại cho chuyến — khách cần đặt lại nếu bỏ dở thanh toán quá lâu.

### Quy trình 7: Xem & quản lý lịch sử hóa đơn
1. Vào `/customer/invoices`.
2. Xem bảng hóa đơn: mã, ngày đặt, phương thức, trạng thái, tổng tiền.
3. Bấm **"Chi tiết"** để xem danh sách vé (hành khách, ghế, tuyến, giờ chạy) trong hóa đơn.
4. Hóa đơn **"Chờ thanh toán"** + phương thức MoMo → có thêm nút **"Thanh toán MoMo"** để thanh toán lại.
5. Hóa đơn **"Chờ thanh toán"** hoặc **"Đã thanh toán"** → có thể **"Hủy"** toàn bộ hóa đơn (nút hiện "Hủy & Hoàn tiền" nếu đã thanh toán), hoặc trong dialog chi tiết **"Hủy vé này"** cho từng ghế lẻ — với điều kiện **còn tối thiểu 24 giờ trước giờ khởi hành** (đúng theo Chính sách hủy vé công bố, nay đã được backend thực thi thật). Hóa đơn đã thanh toán khi hủy sẽ chuyển thành **"Đã hoàn tiền"** (giữ lại hồ sơ) thay vì bị xóa. Ghế được trả lại ngay và **có thể bán lại cho khách khác** (đã vá lỗi "ghế chết" trước đây). Hóa đơn **"Đã hoàn tiền"** thì không hủy được nữa.

### Quy trình 8: Quản lý hồ sơ cá nhân
1. Vào `/customer/profile`.
2. Tab **"Thông tin cá nhân"**: sửa Họ tên/Số điện thoại (Email chỉ xem) → **"Lưu thông tin"**.
3. Tab **"Đổi mật khẩu"**: nhập Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới → **"Đổi mật khẩu"**.

---

## 3. Nhân viên (Staff)

Nhân viên có toàn bộ quyền của Khách hàng ở `/customer/book` (đặt vé hộ) và `/customer/profile`, cộng thêm các trang vận hành:

### Quy trình 9: Đặt vé hộ khách hàng (tại quầy/qua điện thoại)
Giống hệt Quy trình 6, thực hiện trên chính tài khoản nhân viên tại `/customer/book`.

### Quy trình 10: Xử lý hóa đơn khách hàng
1. Vào `/staff/invoices`.
2. Tìm theo mã HĐ/tên/email/SĐT, lọc theo trạng thái (Tất cả/Chờ thanh toán/Đã thanh toán/Đã hoàn tiền).
3. Xem chi tiết hóa đơn + danh sách vé.
4. **Cập nhật trạng thái thanh toán** — chỉ cho phép các bước chuyển hợp lệ: `Chờ thanh toán → Đã thanh toán` (xác nhận thu tiền mặt tại quầy) và `Đã thanh toán → Đã hoàn tiền` (xử lý hoàn tiền); các bước chuyển vô lý khác (vd. đã thanh toán → chờ thanh toán) bị từ chối với thông báo lỗi rõ ràng.
5. **Hủy từng vé lẻ** trong hóa đơn, hoặc **hủy toàn bộ hóa đơn thay khách** (đều có xác nhận trước khi thực hiện) — nhân viên/quản trị viên **không bị ràng buộc bởi mốc 24 giờ** (chỉ áp dụng cho khách hàng tự hủy), phù hợp để xử lý ngoại lệ theo yêu cầu khách.

### Quy trình 11: Theo dõi lịch trình chuyến xe (chỉ xem)
1. `/staff/trips` — tìm/lọc theo điểm đi/đến/biển số xe/trạng thái chuyến.
2. Xem sơ đồ ghế đã bán/còn trống của từng chuyến (không sửa/xóa được).

### Quy trình 12: Tra cứu tuyến đường & phương tiện (chỉ xem)
`/staff/routes`, `/staff/vehicles` — tìm kiếm và xem thông tin, không có thao tác sửa/xóa.

### Quy trình 13: Xem báo cáo thống kê
1. `/staff/stats` — chọn khoảng thời gian (7/15/30 ngày qua).
2. Xem KPI (doanh thu, số vé bán, tỷ lệ hủy vé) và biểu đồ doanh thu theo ngày + tuyến được ưa chuộng.

---

## 4. Quản trị viên (Admin)

Kế thừa toàn bộ Quy trình 9–13 của Nhân viên (đặt vé hộ tại `/customer/book`, và các trang staff/admin dùng chung), cộng thêm quyền CRUD danh mục.

### Quy trình 14: Xem tổng quan hệ thống
1. `/admin/dashboard` — xem KPI hôm nay (doanh thu, vé bán, chuyến đang hoạt động, tổng người dùng), biểu đồ doanh thu 7 ngày gần nhất, bảng lịch trình sắp khởi hành.
2. Dùng các lối tắt (Quick Actions) để nhảy nhanh tới trang điều phối chuyến/tuyến/xe/người dùng.

### Quy trình 15: Quản lý tuyến đường
1. `/admin/routes` — **"Thêm Tuyến Đường"**: nhập điểm đi, điểm đến, cự ly (km), thời gian chạy (phút), giá vé gốc.
2. **Chỉnh sửa** tuyến (cùng form, prefill dữ liệu).
3. **Xóa** tuyến — nay **bị chặn nếu tuyến đã có chuyến xe được lập lịch** (báo lỗi, yêu cầu vô hiệu hóa `is_active` thay vì xóa) để tránh xóa cascade mất dữ liệu chuyến/vé.

### Quy trình 16: Quản lý phương tiện
1. `/admin/vehicles` — **"Thêm Phương Tiện"**: biển số xe, loại xe (Giường nằm/Limousine/Standard — tự set số ghế & sơ đồ mặc định theo loại), tổng số ghế bán, cấu trúc sơ đồ ghế (JSON floors/rows/cols, có xem trước trực quan).
2. **Chỉnh sửa** phương tiện — đổi **tổng số ghế** hoặc **sơ đồ ghế** nay **bị chặn nếu xe đang có chuyến ở trạng thái "Lên lịch"/"Đang chạy"** (tránh vé đã bán trỏ tới ghế không còn tồn tại trong sơ đồ mới); các trường khác (biển số, loại xe, trạng thái hoạt động) vẫn sửa tự do.
3. **Xóa** phương tiện — bị chặn nếu xe đã có chuyến xe được lập lịch.

### Quy trình 17: Điều phối chuyến xe
1. `/admin/trips` — **"Điều Phối Chuyến Xe"**: chọn Tuyến đường, chọn Phương tiện, giờ khởi hành/giờ đến dự kiến, giá vé (tự điền theo giá gốc tuyến, có thể sửa), số ghế mở bán (tự điền theo tổng ghế xe), trạng thái vận hành (Lên lịch/Đang chạy/Hoàn thành/Đã hủy). Hệ thống kiểm tra: **giờ khởi hành phải ở tương lai**, **xe không được trùng lịch với chuyến khác đang hoạt động**, và **số ghế mở bán không vượt quá tổng số ghế của xe**.
2. **Chỉnh sửa** chuyến xe — cùng 3 ràng buộc trên (chỉ áp dụng cho trường đang thay đổi, nên sửa giá của một chuyến cũ vẫn được); riêng **số ghế mở bán** còn không được phép nhỏ hơn số vé đã bán thực tế. **Đổi trạng thái sang "Đã hủy"** giờ sẽ tự động: hủy toàn bộ vé đang `booked` trên chuyến, hoàn ghế, và với các hóa đơn liên quan — hóa đơn đã thanh toán chuyển thành **"Đã hoàn tiền"**, hóa đơn chờ thanh toán bị xóa (chưa thu tiền nên không cần giữ lại).
3. **Xóa** chuyến xe — bị chặn nếu chuyến đã có vé được đặt (yêu cầu đổi trạng thái sang "Đã hủy" thay vì xóa, xem mục 2 ở trên).

### Quy trình 18: Quản lý tài khoản người dùng
1. `/admin/users` — tìm kiếm theo tên/email/SĐT, lọc theo vai trò.
2. **Đổi vai trò** trực tiếp trên từng dòng (Khách hàng/Nhân viên/Quản trị viên).
3. **Khóa/Mở khóa** tài khoản qua công tắc trạng thái.
4. **Xóa** tài khoản — nay **bị chặn nếu tài khoản đã có hóa đơn** (yêu cầu khóa thay vì xóa để giữ lịch sử tài chính).

---

## Lịch sử vá lỗi

**Đợt 1 — 4 lỗi nghiêm trọng (tiền/dữ liệu):**

1. Giá vé do client tự gửi → server nay tự tính lại từ `Trip.price`.
2. Hủy 1 vé lẻ làm ghế "chết" vĩnh viễn → thêm cột `active_seat_number`, unique index chỉ tính vé đang `booked`.
3. Xóa Trip/Route/Vehicle/User cascade xóa mất lịch sử tài chính → chặn xóa khi còn dữ liệu liên quan.
4. Hóa đơn `pending` giữ ghế vô thời hạn → job nền tự hủy sau `PENDING_INVOICE_TTL_MINUTES` (mặc định 30 phút).

**Đợt 2 — 6 điểm chưa hợp lý (nghiệp vụ):**

5. Admin không đặt vé hộ được trong khi staff làm được → đã thêm `admin` vào `allowedRoles` của `/customer/book`.
6. Đổi trạng thái chuyến sang "Đã hủy" không cascade hủy vé/hoàn tiền → nay tự động hủy vé đang `booked` và chuyển hóa đơn liên quan sang "Đã hoàn tiền" (nếu đã thanh toán) hoặc xóa (nếu chưa thanh toán).
7. Tạo/sửa chuyến thiếu ràng buộc → nay validate giờ khởi hành phải ở tương lai, chặn trùng lịch xe (overlap theo `departure_time`/`arrival_time`), chặn vượt sức chứa xe, chặn sửa `available_seats` thấp hơn số vé đã bán.
8. Đổi sức chứa/sơ đồ ghế xe không kiểm tra chuyến đang chạy → nay chặn nếu xe có chuyến `scheduled`/`ongoing`.
9. Chính sách hủy vé 24h chỉ là lời hứa, không được thực thi → nay backend chặn khách hàng tự hủy vé/hóa đơn nếu còn dưới 24 giờ tới giờ khởi hành (nhân viên/quản trị viên không bị ràng buộc này); hóa đơn đã thanh toán khi hủy sẽ chuyển "Đã hoàn tiền" thay vì chỉ chặn hoàn toàn.
10. Cập nhật trạng thái hóa đơn cho chuyển tùy ý → nay chỉ cho phép `Chờ thanh toán → Đã thanh toán → Đã hoàn tiền` (một chiều), các bước chuyển khác bị từ chối.

Tất cả 10 điểm trên đã được vá và **kiểm chứng qua API thật** (không chỉ đọc code) — chi tiết cơ chế xem ghi chú trong `CLAUDE.md`.
