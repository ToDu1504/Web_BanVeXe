<!--
GHI CHÚ SỬ DỤNG (xóa khối này trước khi nộp):
  - Điền các thông tin trong dấu [...] (GVHD, sinh viên, MSSV, lớp, khóa, ngày bắt đầu).
  - Cột "Từ ngày ... đến ngày ..." tính theo ngày bắt đầu thực tế của bạn (mỗi tuần 7 ngày).
  - Cột "Xác nhận của GVHD" để trống — đưa phiếu cho GVHD ký sau mỗi buổi gặp/báo cáo
    hàng tuần, không ký gộp một lần ở cuối kỳ.
  - Nội dung 10 tuần dưới đây bám sát đúng phạm vi đồ án đã có trong README.md và
    BaoCao.md (hệ thống VexereBus). Có thể điều chỉnh câu chữ nếu tiến độ thực tế
    của bạn lệch đi (ví dụ dồn/tách công việc giữa các tuần) — nhưng nên giữ đúng
    thứ tự logic: khảo sát → thiết kế → backend → frontend từng vai trò → kiểm thử
    → viết báo cáo, vì đây là trình tự đã tạo ra sản phẩm thật.
-->

# TRƯỜNG ĐẠI HỌC CÔNG NGHỆ TP.HCM (HUTECH)
## KHOA CÔNG NGHỆ THÔNG TIN

---

# PHIẾU THEO DÕI TIẾN ĐỘ THỰC HIỆN ĐỒ ÁN CƠ SỞ

**Tên đề tài:** Xây dựng hệ thống quản lý bán vé xe khách trực tuyến (VexereBus)

**Giảng viên hướng dẫn:** [Họ và tên GVHD]

**Sinh viên thực hiện:** [Họ và tên sinh viên] — **MSSV:** [MSSV]

**Lớp:** [Lớp] &nbsp;&nbsp;&nbsp; **Khóa:** [Khóa]

**Thời gian thực hiện:** 10 tuần, từ ngày [dd/mm/yyyy] đến ngày [dd/mm/yyyy]

---

## BẢNG THEO DÕI TIẾN ĐỘ

| Tuần | Thời gian | Nội dung công việc thực hiện | Kết quả đạt được | Xác nhận của GVHD |
|:-:|---|---|---|---|
| 1 | Từ ... đến ... | Khảo sát yêu cầu đề tài; xác định 4 vai trò người dùng (Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên) và ma trận phân quyền tương ứng; lựa chọn công nghệ (Node.js/Express, MySQL/Sequelize, React/Vite, JWT, Redux Toolkit, Tailwind CSS + shadcn/ui); phác thảo sơ bộ mô hình thực thể kết hợp (ERD) gồm 6 thực thể: User, Route, Vehicle, Trip, Invoice, Ticket. | Đề cương đề tài; sơ đồ ERD sơ bộ; danh sách công nghệ sử dụng. | |
| 2 | Từ ... đến ... | Thiết kế chi tiết cơ sở dữ liệu: hoàn thiện ERD, xác định ràng buộc `UNIQUE(trip_id, seat_number)` chống bán trùng ghế và các chỉ mục tối ưu truy vấn; khởi tạo cấu trúc thư mục dự án (monorepo `backend/` + `frontend/`); cài đặt khung Express (routes/controllers/middlewares/models) và khung React (Vite + Tailwind CSS v4 + shadcn/ui). | CSDL `bus_ticket_db` được đồng bộ từ Sequelize model (`npm run db:sync`); khung dự án Backend/Frontend chạy được ở trạng thái rỗng. | |
| 3 | Từ ... đến ... | Xây dựng module Xác thực & Phân quyền: API đăng ký/đăng nhập/đăng xuất/lấy thông tin cá nhân, mã hóa mật khẩu bằng bcrypt, cấp JWT lưu trong HttpOnly Cookie; middleware `protect` (xác thực) và `authorize` (phân quyền theo vai trò) phía Backend; component `PrivateRoute` chặn truy cập trái phép phía Frontend. | Luồng đăng ký/đăng nhập/đăng xuất hoạt động đầy đủ cho cả 3 vai trò tài khoản (customer/staff/admin); route được bảo vệ đúng theo vai trò. | |
| 4 | Từ ... đến ... | Xây dựng module quản lý danh mục (Backend): API CRUD cho Tuyến xe (Route), Phương tiện (Vehicle), Chuyến xe (Trip); áp dụng kiểm tra dữ liệu đầu vào bằng Joi thông qua middleware `validate`. | Bộ API `/api/routes`, `/api/vehicles`, `/api/trips` hoàn chỉnh, kiểm thử được bằng Postman/curl. | |
| 5 | Từ ... đến ... | Xây dựng module Đặt vé & Hóa đơn — nghiệp vụ lõi của hệ thống: endpoint `POST /api/invoices` tạo hóa đơn kèm nhiều vé trong một Database Transaction duy nhất, xử lý lỗi bán trùng ghế (`SequelizeUniqueConstraintError` → HTTP 409); đồng bộ `trips.available_seats`; xử lý hủy vé riêng lẻ, hủy hóa đơn và hoàn tiền (trả lại ghế trống). | API `/api/invoices`, `/api/tickets` hoạt động đúng, kiểm thử được kịch bản tranh chấp ghế đồng thời (double booking). | |
| 6 | Từ ... đến ... | Xây dựng giao diện Khách vãng lai/Khách hàng: Trang chủ + tìm kiếm chuyến xe, trang chi tiết chuyến xe với sơ đồ ghế tương tác (`SeatMap`), luồng chọn ghế → nhập thông tin hành khách → thanh toán, trang Lịch sử hóa đơn và Hồ sơ cá nhân. | Luồng tìm chuyến → đặt vé → xem lịch sử hóa đơn hoàn chỉnh, chạy được trên trình duyệt. | |
| 7 | Từ ... đến ... | Xây dựng giao diện Nhân viên: trang Quản lý hóa đơn (tìm kiếm, cập nhật trạng thái thanh toán, hủy hóa đơn/vé thay khách), trang Xem chuyến xe kèm sơ đồ ghế chi tiết, trang tra cứu Tuyến xe/Phương tiện (chỉ xem), chức năng đặt vé hộ khách tại quầy. | Toàn bộ trang dành cho vai trò Nhân viên hoạt động đúng ma trận phân quyền. | |
| 8 | Từ ... đến ... | Xây dựng giao diện Quản trị viên: Dashboard tổng quan (KPI theo ngày/tháng, danh sách chuyến sắp chạy), các module CRUD đầy đủ cho Tuyến xe/Chuyến xe/Phương tiện, quản lý người dùng (đổi vai trò, khóa/mở tài khoản), trang Thống kê doanh thu (biểu đồ Recharts). | Toàn bộ trang dành cho vai trò Quản trị viên hoạt động đúng ma trận phân quyền; hệ thống hoàn thiện đủ 4 vai trò. | |
| 9 | Từ ... đến ... | Kiểm thử tổng thể toàn hệ thống theo từng vai trò (đăng ký/đăng nhập, đặt vé, hủy vé, phân quyền, thống kê); rà soát và khắc phục các lỗi phát hiện được trong quá trình kiểm thử (số liệu thống kê theo ngày/tháng, dữ liệu mẫu, các lỗi giao diện); hoàn thiện tài liệu `README.md`. | Bảng kết quả kiểm thử các chức năng chính; danh sách lỗi đã phát hiện và khắc phục; hệ thống ở trạng thái ổn định, sẵn sàng viết báo cáo. | |
| 10 | Từ ... đến ... | Hoàn thiện báo cáo đồ án theo đúng quy định trình bày của Khoa (4 chương: Tổng quan, Cơ sở lý thuyết, Kết quả thực nghiệm, Kết luận và kiến nghị); chuẩn bị slide và kịch bản demo; rà soát chống đạo văn trước khi nộp. | Báo cáo đồ án hoàn chỉnh (định dạng đúng chuẩn); slide thuyết trình; sẵn sàng bảo vệ đồ án. | |

---

*Sinh viên và Giảng viên hướng dẫn ký xác nhận vào cột cuối cùng sau mỗi tuần làm việc.*
