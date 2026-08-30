<!--
GHI CHÚ SỬ DỤNG (xóa khối này trước khi nộp):
  - Điền các thông tin trong dấu [...] (GVHD, sinh viên, MSSV, lớp, ngành, chuyên ngành).
  - Cột "Ngày" điền theo ngày gặp/báo cáo GVHD thực tế của bạn (mỗi tuần 7 ngày).
  - Cột "Nhận xét của GVHD (Ký tên)" để trống — đưa phiếu cho GVHD ký sau mỗi buổi gặp/báo cáo
    hàng tuần, không ký gộp một lần ở cuối kỳ.
  - Nội dung 12 tuần dưới đây bám sát đúng phạm vi đồ án đã có trong README.md và
    BaoCao.md (hệ thống Đặt Vé Xe Khách), tiếp nối và đào sâu các module đã làm ở Đồ Án
    Cơ Sở (xem [[PhieuTheoDoiTienDoDACS.md]]) — tập trung hoàn thiện nghiệp vụ lõi (đặt vé,
    thanh toán MoMo), đủ 4 vai trò và kiểm thử/báo cáo. Có thể điều chỉnh câu chữ nếu tiến
    độ thực tế của bạn lệch đi (ví dụ dồn/tách công việc giữa các tuần).
-->

**Khoa: Công nghệ Thông tin**

# PHIẾU THEO DÕI TIẾN ĐỘ

## THỰC HIỆN ĐỒ ÁN CHUYÊN NGÀNH

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
| 1       |      | Xác định vai trò người dùng (Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên) và ma trận phân quyền tương ứng; ôn lại kết quả Đồ án cơ sở; lựa chọn/rà soát công nghệ (Node.js/Express, MySQL/Sequelize, React/Vite, JWT, Redux Toolkit, Tailwind CSS + shadcn/ui) và phạm vi nâng cao cho Đồ án chuyên ngành (thanh toán trực tuyến MoMo, thống kê doanh thu). | |
| 2       |      | Rà soát và hoàn thiện thiết kế cơ sở dữ liệu: ERD 6 thực thể (User, Route, Vehicle, Trip, Invoice, Ticket), ràng buộc `UNIQUE(trip_id, seat_number)` chống bán trùng ghế, các chỉ mục tối ưu truy vấn; đồng bộ CSDL `bus_ticket_db` từ Sequelize model. | |
| 3       |      | Hoàn thiện module Xác thực & Phân quyền: API đăng ký/đăng nhập/đăng xuất/lấy thông tin cá nhân, mã hóa mật khẩu bằng bcrypt, cấp JWT lưu trong HttpOnly Cookie; middleware `protect`/`authorize` phía Backend; component `PrivateRoute` chặn truy cập trái phép phía Frontend. | |
| 4       |      | Xây dựng/hoàn thiện module quản lý danh mục (Backend): API CRUD cho Tuyến xe (Route), Phương tiện (Vehicle), Chuyến xe (Trip); kiểm tra dữ liệu đầu vào bằng Joi thông qua middleware `validate`. | |
| 5       |      | Xây dựng module Đặt vé & Hóa đơn — nghiệp vụ lõi của hệ thống: endpoint `POST /api/invoices` tạo hóa đơn kèm nhiều vé trong một Database Transaction duy nhất, xử lý lỗi bán trùng ghế (`SequelizeUniqueConstraintError` → HTTP 409); đồng bộ `trips.available_seats`; xử lý hủy vé riêng lẻ, hủy hóa đơn và hoàn tiền (trả lại ghế trống). | |
| 6       |      | Tích hợp thanh toán trực tuyến MoMo (sandbox): xây dựng `momoService` ký/xác thực request theo chuẩn `captureWallet` (HMAC-SHA256), API `POST /api/payments/momo/create/:invoiceId`, `POST /api/payments/momo/ipn` (callback server-to-server), `POST /api/payments/momo/verify-return` (xác thực tham số khi MoMo redirect trình duyệt về, chạy được trên localhost); mã hóa `orderId` để đối chiếu ngược lại `Invoice`. | |
| 7       |      | Xây dựng giao diện Khách vãng lai/Khách hàng: Trang chủ + tìm kiếm chuyến xe, trang chi tiết chuyến xe với sơ đồ ghế tương tác (`SeatMap`), luồng chọn ghế → nhập thông tin hành khách → thanh toán (MoMo/khác), trang Lịch sử hóa đơn và Hồ sơ cá nhân. | |
| 8       |      | Xây dựng giao diện Nhân viên: trang Quản lý hóa đơn (tìm kiếm, cập nhật trạng thái thanh toán, hủy hóa đơn/vé thay khách), trang xem chuyến xe kèm sơ đồ ghế chi tiết, tra cứu Tuyến xe/Phương tiện, đặt vé hộ khách tại quầy.<br>Đánh giá công việc hoàn thành: \_\_\_\_%<br>Được tiếp tục: ☐ Không tiếp tục: ☐ | |
| 9       |      | Xây dựng giao diện Quản trị viên: Dashboard tổng quan (KPI theo ngày/tháng, danh sách chuyến sắp chạy), các module CRUD đầy đủ cho Tuyến xe/Chuyến xe/Phương tiện, quản lý người dùng (đổi vai trò, khóa/mở tài khoản), trang Thống kê doanh thu (biểu đồ Recharts). | |
| 10      |      | Kiểm thử tổng thể toàn hệ thống theo từng vai trò (đăng ký/đăng nhập, đặt vé, thanh toán MoMo, hủy vé/hoàn tiền, phân quyền, thống kê); rà soát tranh chấp ghế đồng thời (double booking); khắc phục các lỗi phát hiện được. | |
| 11      |      | Hoàn thiện tài liệu `README.md`; viết báo cáo đồ án chuyên ngành theo đúng quy định trình bày của Khoa (Tổng quan, Cơ sở lý thuyết, Kết quả thực nghiệm, Kết luận và kiến nghị). | |
| 12      |      | Chuẩn bị slide và kịch bản demo; rà soát chống đạo văn; hoàn tất và nộp báo cáo, sẵn sàng bảo vệ đồ án. | |

|                                                            |                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Giảng viên hướng dẫn phụ (nếu có)<br>(Ký và ghi rõ họ tên) | TP. HCM, ngày … tháng … năm ………. <br>Giảng viên hướng dẫn chính<br>(Ký và ghi rõ họ tên) |
