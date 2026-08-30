<!--
GHI CHÚ SỬ DỤNG (xóa khối này trước khi nộp):
  - Điền các thông tin trong dấu [...] (GVHD, sinh viên, MSSV, lớp, ngành, chuyên ngành).
  - Cột "Ngày" điền theo ngày gặp/báo cáo GVHD thực tế của bạn (mỗi tuần 7 ngày).
  - Cột "Nhận xét của GVHD (Ký tên)" để trống — đưa phiếu cho GVHD ký sau mỗi buổi gặp/báo cáo
    hàng tuần, không ký gộp một lần ở cuối kỳ.
  - Nội dung 10 tuần dưới đây bám sát đúng phạm vi đồ án đã có trong README.md và
    BaoCao.md (hệ thống Đặt Vé Xe Khách). Có thể điều chỉnh câu chữ nếu tiến độ thực tế
    của bạn lệch đi (ví dụ dồn/tách công việc giữa các tuần) — nhưng nên giữ đúng
    thứ tự logic: khảo sát → thiết kế → backend → frontend từng vai trò → kiểm thử
    → viết báo cáo, vì đây là trình tự đã tạo ra sản phẩm thật. Xem thêm bản tiếp nối
    ở Đồ Án Chuyên Ngành: [[PhieuTheoDoiTienDoDACN.md]].
-->

**Khoa: Công nghệ Thông tin**

# PHIẾU THEO DÕI TIẾN ĐỘ

## THỰC HIỆN ĐỒ ÁN CƠ SỞ

1. **Tên đề tài:** Xây dựng hệ thống quản lý bán vé xe khách trực tuyến (Đặt Vé Xe Khách)

2. **Giảng viên hướng dẫn:** [Họ và tên GVHD]

3. **Sinh viên/ nhóm sinh viên thực hiện đề tài:**
   1. MSSV: ******\_\_\_****** Lớp: ******\_\_\_******
   2. MSSV: ******\_\_\_****** Lớp: ******\_\_\_******
   3. MSSV: ******\_\_\_****** Lớp: ******\_\_\_******

**Ngành:** Công nghệ thông tin

**Chuyên ngành:** [Chuyên ngành]

| Tuần lễ | Ngày | Nội dung                                                                       | Nhận xét của GVHD (Ký tên) |
| ------- | ---- | ------------------------------------------------------------------------------ | -------------------------- |
| 1       |      | Khảo sát yêu cầu đề tài; xác định 4 vai trò người dùng (Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên) và ma trận phân quyền tương ứng; lựa chọn công nghệ (Node.js/Express, MySQL/Sequelize, React/Vite, JWT, Redux Toolkit, Tailwind CSS + shadcn/ui); phác thảo sơ bộ mô hình thực thể kết hợp (ERD) gồm 6 thực thể: User, Route, Vehicle, Trip, Invoice, Ticket. | |
| 2       |      | Thiết kế chi tiết cơ sở dữ liệu: hoàn thiện ERD, xác định ràng buộc `UNIQUE(trip_id, seat_number)` chống bán trùng ghế và các chỉ mục tối ưu truy vấn; khởi tạo cấu trúc thư mục dự án (monorepo `backend/` + `frontend/`); cài đặt khung Express (routes/controllers/middlewares/models) và khung React (Vite + Tailwind CSS v4 + shadcn/ui); đồng bộ CSDL `bus_ticket_db` từ Sequelize model (`npm run db:sync`). | |
| 3       |      | Xây dựng module Xác thực & Phân quyền: API đăng ký/đăng nhập/đăng xuất/lấy thông tin cá nhân, mã hóa mật khẩu bằng bcrypt, cấp JWT lưu trong HttpOnly Cookie; middleware `protect` (xác thực) và `authorize` (phân quyền theo vai trò) phía Backend; component `PrivateRoute` chặn truy cập trái phép phía Frontend. | |
| 4       |      | Xây dựng module quản lý danh mục (Backend): API CRUD cho Tuyến xe (Route), Phương tiện (Vehicle), Chuyến xe (Trip); áp dụng kiểm tra dữ liệu đầu vào bằng Joi thông qua middleware `validate`; kiểm thử được bộ API `/api/routes`, `/api/vehicles`, `/api/trips` bằng Postman/curl. | |
| 5       |      | Xây dựng module Đặt vé & Hóa đơn — nghiệp vụ lõi của hệ thống: endpoint `POST /api/invoices` tạo hóa đơn kèm nhiều vé trong một Database Transaction duy nhất, xử lý lỗi bán trùng ghế (`SequelizeUniqueConstraintError` → HTTP 409); đồng bộ `trips.available_seats`; xử lý hủy vé riêng lẻ, hủy hóa đơn và hoàn tiền (trả lại ghế trống); kiểm thử được kịch bản tranh chấp ghế đồng thời (double booking). | |
| 6       |      | Xây dựng giao diện Khách vãng lai/Khách hàng: Trang chủ + tìm kiếm chuyến xe, trang chi tiết chuyến xe với sơ đồ ghế tương tác (`SeatMap`), luồng chọn ghế → nhập thông tin hành khách → thanh toán, trang Lịch sử hóa đơn và Hồ sơ cá nhân — chạy hoàn chỉnh trên trình duyệt. | |
| 7       |      | Xây dựng giao diện Nhân viên: trang Quản lý hóa đơn (tìm kiếm, cập nhật trạng thái thanh toán, hủy hóa đơn/vé thay khách), trang Xem chuyến xe kèm sơ đồ ghế chi tiết, trang tra cứu Tuyến xe/Phương tiện (chỉ xem), chức năng đặt vé hộ khách tại quầy — đúng ma trận phân quyền. | |
| 8       |      | Xây dựng giao diện Quản trị viên: Dashboard tổng quan (KPI theo ngày/tháng, danh sách chuyến sắp chạy), các module CRUD đầy đủ cho Tuyến xe/Chuyến xe/Phương tiện, quản lý người dùng (đổi vai trò, khóa/mở tài khoản), trang Thống kê doanh thu (biểu đồ Recharts) — hoàn thiện đủ 4 vai trò. | |
| 9       |      | Kiểm thử tổng thể toàn hệ thống theo từng vai trò (đăng ký/đăng nhập, đặt vé, hủy vé, phân quyền, thống kê); rà soát và khắc phục các lỗi phát hiện được trong quá trình kiểm thử (số liệu thống kê theo ngày/tháng, dữ liệu mẫu, các lỗi giao diện); hoàn thiện tài liệu `README.md` — hệ thống ổn định, sẵn sàng viết báo cáo. | |
| 10      |      | Hoàn thiện báo cáo đồ án theo đúng quy định trình bày của Khoa (4 chương: Tổng quan, Cơ sở lý thuyết, Kết quả thực nghiệm, Kết luận và kiến nghị); chuẩn bị slide và kịch bản demo; rà soát chống đạo văn trước khi nộp. | |

|                                                             |                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Giảng viên hướng dẫn phụ (nếu có)<br>(Ký và ghi rõ họ tên) | TP. HCM, ngày … tháng … năm ………. <br>Giảng viên hướng dẫn chính<br>(Ký và ghi rõ họ tên) |
