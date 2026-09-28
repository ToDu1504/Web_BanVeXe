# Quy trình sử dụng — Nhân viên & Quản trị viên

Tài liệu mô tả **quy trình thao tác thực tế** trên hệ thống cho hai vai trò nội bộ:
**Nhân viên (Staff)** và **Quản trị viên (Admin)**. Nội dung rút trực tiếp từ menu
điều hướng thật (`frontend/src/components/common/AdminLayout.jsx`), các trang UI thật
(`frontend/src/pages/staff/**`, `frontend/src/pages/admin/**`) và logic backend tương
ứng — tính đến thời điểm viết tài liệu này, bao gồm cả cụm tính năng **"quầy vé"** mới
thêm (in vé, đặt vé hộ khách đúng chủ, đối soát in vé, danh sách khách theo chuyến).

Nhân viên và Quản trị viên đăng nhập chung một trang (`/login`), hệ thống tự điều
hướng theo vai trò sau khi đăng nhập thành công. Cả hai dùng chung một layout quản trị
(`AdminLayout`) với sidebar hiện đúng các mục theo quyền hạn của từng vai trò.

---

## Phần 1 — Nhân viên (Staff)

Nhân viên có 7 mục trong sidebar: **Quản lý Hóa đơn, Đặt vé hộ khách, Xem chuyến xe,
Tra cứu Tuyến xe, Tra cứu Xe khách, Thống kê doanh thu, Đối soát in vé.**

### 1.1. Đặt vé hộ khách (tại quầy / qua điện thoại)

1. Vào sidebar bấm **"Đặt vé hộ khách"** → hệ thống đưa về trang chủ, thao tác **tìm
   chuyến → chọn ghế** giống hệt một khách hàng bình thường.
2. Bấm **"Tiếp tục đặt vé"** → vào trang đặt vé (`/customer/book`). Vì đang đăng nhập
   bằng tài khoản nhân viên, hệ thống hiện thêm khối **"Khách hàng nhận vé"** ở đầu
   trang:
   - Nhập **số điện thoại** khách → bấm **"Tìm khách"**.
   - Nếu tìm thấy: hiện danh sách tài khoản khách hàng khớp SĐT, bấm chọn một tài khoản.
   - Nếu không tìm thấy: hiện form nhập nhanh **Họ tên** (bắt buộc) + **Email** (tùy
     chọn) → bấm **"Tạo khách mới & đặt vé"** để tạo tài khoản khách hàng ngay tại chỗ
     (email để trống thì hệ thống tự sinh email dạng `khach.<sđt>@quayve.local`, khách
     có thể đăng ký lại bằng email thật sau nếu muốn tự quản lý tài khoản online).
   - Muốn đổi khách khác thì bấm **"Đổi khách khác"** để tìm lại từ đầu.
   - **Nút "Xác nhận đặt vé" bị khóa** cho đến khi đã chọn/tạo xong khách hàng nhận vé.
3. Nhập tên/SĐT hành khách cho từng ghế (mặc định điền sẵn theo tài khoản đang đăng
   nhập, cần sửa lại thành đúng hành khách thực tế), chọn phương thức thanh toán
   (**Ví MoMo** hoặc **Tiền mặt**), bấm **"Xác nhận đặt vé"**.
4. Hóa đơn được tạo và **gắn đúng vào tài khoản khách hàng đã chọn ở bước 2** — không
   còn bị gắn nhầm vào tài khoản nhân viên như trước, khách sẽ thấy hóa đơn này trong
   lịch sử đặt vé của chính họ nếu có tài khoản đăng nhập.
5. Nếu chọn **Tiền mặt**: hóa đơn ở trạng thái "Chờ thanh toán" — thu tiền và cập nhật
   trạng thái ở mục 1.2 bên dưới. Loại hóa đơn này được **giữ ghế lâu hơn** hóa đơn MoMo
   (xem ghi chú TTL kép ở cuối tài liệu) để khách có đủ thời gian ra quầy trả tiền.

### 1.2. Xử lý hóa đơn khách hàng (`/staff/invoices`)

1. Tìm theo mã HĐ / tên / email / SĐT, lọc theo trạng thái (Tất cả / Chờ thanh toán /
   Đã thanh toán / Đã hoàn tiền).
2. Bấm **biểu tượng mắt** để xem chi tiết hóa đơn — danh sách vé kèm hành khách, ghế,
   tuyến, giờ chạy, và (mới) **trạng thái xuất vé** của từng vé.
3. **Cập nhật trạng thái thanh toán** (biểu tượng bút) — chỉ cho phép hai bước chuyển:
   `Chờ thanh toán → Đã thanh toán` (xác nhận thu tiền mặt tại quầy) và
   `Đã thanh toán → Đã hoàn tiền`; các bước chuyển vô lý khác bị từ chối.
4. **Hủy từng vé lẻ** hoặc **hủy toàn bộ hóa đơn thay khách** — nhân viên không bị
   ràng buộc mốc 24 giờ trước giờ khởi hành (chỉ áp dụng cho khách tự hủy).
5. **In vé (mới):** trong dialog chi tiết, mỗi vé còn hiệu lực có nút:
   - **"In vé"** (viền xanh) — chỉ hiện khi hóa đơn đã **"Đã thanh toán"**; nếu chưa
     thanh toán, chỗ đó chỉ hiện chữ xám **"Chưa thể in"**. Bấm vào mở dialog **phiếu
     vé** (tuyến, giờ chạy, biển số xe, ghế, tên/SĐT hành khách, giá vé, **mã QR** để
     đối chiếu thủ công lúc lên xe) kèm nút **"In vé"** gọi lệnh in của trình duyệt.
   - **"In lại vé"** (viền cam) — hiện thay thế nút trên nếu vé đã in ít nhất 1 lần.
     Bấm vào bắt buộc nhập **lý do in lại** (ví dụ: khách làm mất vé) trước khi xác
     nhận; phiếu vé in lại có thêm banner đỏ **"BẢN IN LẠI — LẦN N"** để nhân viên/soát
     vé khác biết mà cảnh giác.
   - Ngay dưới tên hành khách trong danh sách sẽ ghi rõ **"Đã xuất vé lúc ..."** (và số
     lần in nếu > 1) để biết vé nào đã giao cho khách chưa.

### 1.3. Theo dõi lịch trình chuyến xe (`/staff/trips`, chỉ xem)

1. Tìm/lọc theo điểm đi/đến, biển số xe, trạng thái chuyến. Danh sách **mặc định sắp
   xếp theo giờ khởi hành gần nhất lên đầu** (trước đây bị ngược — chuyến xa nhất hiện
   trước — đã sửa).
2. **Lọc "Khoảng thời gian" (mới):** Tất cả / Trong 2 giờ tới / Trong 6 giờ tới / Hôm
   nay — thu hẹp danh sách về đúng những chuyến sắp chạy trong ca làm việc, khỏi phải
   dò tay qua nhiều trang.
3. Chuyến nào khởi hành **trong vòng 2 giờ tới** tự động có nhãn đỏ **"⏱ Sắp khởi
   hành"** ngay cạnh giờ chạy — hiện độc lập với bộ lọc đang chọn, nhìn thoáng qua là
   biết chuyến nào gấp mà không cần đổi bộ lọc.
4. Mỗi chuyến có hai nút xem:
   - **Biểu tượng người — "Danh sách khách":** mở bảng đầy đủ hành khách của
     chuyến — Ghế, Hành khách (tên + SĐT), Mã HĐ, **Trạng thái thanh toán**, **Trạng
     thái xuất vé** ("Đã xuất" / "Đã xuất (N lần)" / "Chưa in"). Vé đã hủy vẫn hiện
     nhưng làm mờ và gắn nhãn "Đã hủy" để không gây hiểu lầm về sức chứa còn lại. Đây
     là màn hình dùng để **chuẩn bị cho chuyến xe sắp chạy** — biết chính xác ai đã lên
     danh sách, ai đã thanh toán, ai đã cầm vé.
     - **Nút "In danh sách khách" (mới):** in **một tờ cho cả chuyến** — khác với "vé
       xe" từng khách ở mục 1.2 (đó là vé riêng giao khách, có mã QR, chỉ in được khi
       đã thanh toán). Tờ này là tài liệu nội bộ để **phụ xe đối chiếu lúc lên xe**:
       header chuyến (mã, giờ chạy, biển số, loại xe, tổng số khách) + bảng STT / Ghế /
       Họ tên / SĐT / Thanh toán (khách chưa trả tiền tô đỏ **"Chưa TT"** để nhắc thu
       trước giờ chạy) / cột **"Đối chiếu"** để trống cho phụ xe tự tick tay. In được
       bất cứ lúc nào, không giới hạn theo trạng thái thanh toán như vé xe.
   - **Biểu tượng mắt — "Sơ đồ ghế":** xem trực quan ghế nào đã bán/còn trống (không
     có tên khách, chỉ số ghế).

### 1.4. Tra cứu tuyến đường & phương tiện (chỉ xem)

`/staff/routes`, `/staff/vehicles` — tìm kiếm và xem thông tin, không có thao tác sửa/xóa.

### 1.5. Xem báo cáo thống kê (`/staff/stats`)

1. Chọn khoảng thời gian (7 / 15 / 30 ngày qua).
2. Xem KPI (doanh thu lũy kế, số vé bán, tỷ lệ hủy vé) và hai biểu đồ: doanh thu theo
   ngày + tuyến xe được ưa chuộng nhất.
3. Bấm **"Xuất báo cáo (CSV)"** để tải file excel-friendly (có BOM + `sep=,` cho Excel
   tiếng Việt).

### 1.6. Đối soát in vé (`/staff/print-log`, mới)

1. Mặc định hiện **lượt in vé của chính mình** trong ngày hôm nay.
2. Chọn lại khoảng ngày (từ ngày – đến ngày) để xem lại các ca trước.
3. Mỗi dòng hiển thị: thời điểm in, mã vé/HĐ, hành khách, tuyến-chuyến, loại in
   (**"BẢN GỐC"** màu xanh hoặc **"IN LẠI — LẦN N"** màu cam kèm lý do), nhân viên in.
4. Nhân viên **chỉ xem được lượt in của chính mình** — giới hạn này được chặn ở cả
   frontend lẫn backend, không thể qua mặt bằng cách sửa tham số truy vấn.

---

## Phần 2 — Quản trị viên (Admin)

Quản trị viên kế thừa **toàn bộ Phần 1** (mọi trang staff dùng chung), cộng thêm 6 mục
quản lý danh mục trong sidebar: **Dashboard, Quản lý Tuyến xe, Quản lý Chuyến xe, Mẫu
chuyến lặp lại, Quản lý Phương tiện, Quản lý Người dùng.**

### 2.1. Tổng quan hệ thống (`/admin/dashboard`)

Xem KPI hôm nay (doanh thu, vé bán, chuyến đang hoạt động, tổng người dùng), biểu đồ
doanh thu 7 ngày gần nhất, bảng lịch trình sắp khởi hành, và các lối tắt (Quick Actions)
nhảy nhanh tới trang điều phối chuyến/tuyến/xe/người dùng.

### 2.2. Quản lý tuyến đường (`/admin/routes`)

1. **"Thêm Tuyến Đường"**: điểm đi, điểm đến, cự ly (km), thời gian chạy (phút), giá
   vé gốc.
2. **Chỉnh sửa** tuyến (form tương tự, có sẵn dữ liệu cũ).
3. **Xóa** tuyến — bị chặn nếu tuyến đã có chuyến xe được lập lịch (nên **vô hiệu hóa**
   thay vì xóa để không mất dữ liệu chuyến/vé liên quan).

### 2.3. Quản lý chuyến xe (`/admin/trips`)

1. **"Điều Phối Chuyến Xe"**: chọn Tuyến đường, chọn Phương tiện, giờ khởi hành/giờ
   đến dự kiến, giá vé (tự điền theo giá gốc tuyến, sửa được), số ghế mở bán (tự điền
   theo tổng ghế xe), trạng thái vận hành. Hệ thống chặn: giờ khởi hành ở quá khứ, xe
   trùng lịch với chuyến khác đang hoạt động, số ghế mở bán vượt sức chứa xe.
2. **Chỉnh sửa** — cùng các ràng buộc trên; riêng số ghế mở bán không được thấp hơn số
   vé đã bán thực tế. Đổi trạng thái sang **"Đã hủy"** sẽ tự động hủy toàn bộ vé đang
   đặt trên chuyến, hoàn ghế, và xử lý hóa đơn liên quan (đã thanh toán → "Đã hoàn
   tiền", chờ thanh toán → xóa).
3. **Xóa** — bị chặn nếu chuyến đã có vé, dùng "Đã hủy" thay thế.
4. **"Danh sách khách":** giống mục 1.3 (dùng chung 1 component với trang staff) — xem
   đầy đủ hành khách + trạng thái thanh toán/xuất vé, và **in được tờ danh sách khách**
   cho phụ xe đối chiếu, ngay tại trang quản lý (không cần qua trang staff riêng). Riêng
   bộ lọc "Khoảng thời gian" / nhãn "Sắp khởi hành" ở mục 1.3 hiện chỉ có ở trang staff
   (`/staff/trips`), trang quản lý chuyến xe của admin chưa có hai lọc này.

### 2.4. Mẫu chuyến lặp lại (`/admin/trip-templates`)

Dùng cho các tuyến chạy cố định hằng ngày/hằng tuần — định nghĩa một lần, hệ thống tự
sinh chuyến xe thật, không cần tạo tay mỗi ngày.

1. **"Thêm Mẫu Chuyến"**: chọn Tuyến đường, Phương tiện, giờ khởi hành trong ngày
   (HH:mm), thời gian chạy (phút, tự điền theo tuyến), giá vé, số ghế mở bán (tự điền
   theo xe), và **chọn các ngày trong tuần lặp lại** (T2–CN, bấm chọn nhiều ngày).
2. Một tác vụ nền tự động quét mẫu đang bật và sinh chuyến xe thật cho **14 ngày tới**;
   không cần chờ, bấm **"Tạo Chuyến Ngay"** để hệ thống chạy tác vụ này ngay lập tức —
   thông báo kết quả rõ số chuyến tạo mới / bỏ qua (đã tồn tại, trùng lịch xe, vượt sức
   chứa, tuyến-xe ngừng hoạt động).
3. Công tắc bật/tắt nhanh (**is_active**) mỗi mẫu ngay trên bảng danh sách — tắt thì
   ngừng sinh chuyến mới nhưng không đụng tới chuyến đã sinh ra trước đó.
4. **Xóa** mẫu — chỉ ngừng sinh chuyến mới, các chuyến đã sinh ra trước đó (kể cả đã
   bán vé) vẫn giữ nguyên.

### 2.5. Quản lý phương tiện (`/admin/vehicles`)

1. **"Thêm Phương Tiện"**: biển số xe, loại xe (Giường nằm/Limousine/Standard — tự set
   số ghế & sơ đồ mặc định theo loại), tổng số ghế bán, cấu trúc sơ đồ ghế (có xem
   trước trực quan).
2. **Chỉnh sửa** — đổi **tổng số ghế** hoặc **sơ đồ ghế** bị chặn nếu xe đang có chuyến
   "Lên lịch"/"Đang chạy" (tránh vé đã bán trỏ tới ghế không còn tồn tại); các trường
   khác sửa tự do.
3. **Xóa** — bị chặn nếu xe đã có chuyến xe được lập lịch.

### 2.6. Quản lý tài khoản người dùng (`/admin/users`)

1. Tìm theo tên/email/SĐT, lọc theo vai trò.
2. **Đổi vai trò** trực tiếp trên từng dòng (Khách hàng/Nhân viên/Quản trị viên).
3. **Khóa/Mở khóa** tài khoản qua công tắc trạng thái.
4. **Xóa** tài khoản — bị chặn nếu tài khoản đã có hóa đơn (khóa thay vì xóa để giữ
   lịch sử tài chính).

---

## Ghi chú kỹ thuật liên quan trực tiếp đến thao tác hằng ngày

- **Giữ ghế theo phương thức thanh toán (TTL kép):** hóa đơn "Chờ thanh toán" bằng
  **MoMo** tự hủy sau 30 phút nếu khách bỏ dở (đúng như trước). Hóa đơn "Chờ thanh
  toán" bằng **Tiền mặt** (đặt online chọn trả tại quầy, hoặc nhân viên đặt hộ) được
  giữ tối đa **120 phút**, nhưng không giữ quá **30 phút trước giờ khởi hành** dù chưa
  hết 120 phút — tránh giữ ghế vô ích khi khách rõ ràng không đến kịp. Vé bị hệ thống
  tự hủy do hết hạn giữ chỗ thì xử lý như một lượt đặt vé mới nếu khách vẫn đến.
- **Trạng thái hóa đơn chỉ đi một chiều:** `Chờ thanh toán → Đã thanh toán → Đã hoàn
  tiền`, không quay ngược lại được.
- **Ràng buộc 24 giờ khi hủy vé** chỉ áp dụng khi khách hàng tự hủy; nhân viên/quản trị
  viên hủy thay khách không bị giới hạn này.
- **In vé chỉ thực hiện được sau khi hóa đơn đã "Đã thanh toán"** — không thể in vé cho
  hóa đơn còn "Chờ thanh toán", tránh phát vé giấy trước khi thu tiền.
