# 🚌 Hệ Thống Quản Lý Bán Vé Xe Khách

Dự án web app quản lý bán vé xe khách với 5 vai trò: **Khách Vãng Lai**, **Khách Hàng**, **Nhân Viên (Staff)**, **Tài Xế (Driver)** [MỚI], **Quản Trị Viên (Admin)**.

> **Tech Stack tổng quan:** React.js (Vite) + shadcn/ui + Framer Motion | Node.js + Express | MySQL + Sequelize | JWT Auth

---

## 📁 Cấu Trúc Dự Án

```
bus-ticket-system/
├── backend/                    # Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # Kết nối database (Sequelize)
│   │   │   └── momo.config.js  # [MỚI] Credentials sandbox cổng thanh toán MoMo
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js   # [MỚI] + searchCustomers/resolveOrCreateCustomer (tìm/tạo khách theo SĐT cho đặt vé hộ), + getDrivers/getDriverUnavailabilities, chặn xóa/đổi role tài xế còn chuyến
│   │   │   ├── invoiceController.js  # [MỚI] create nhận thêm customer_id (staff/admin đặt vé hộ đúng chủ)
│   │   │   ├── ticketController.js  # [MỚI] Tách riêng từ invoice; + printTicket/getPrintHistory/getPrintLog (quầy vé), + setBoarded (điểm danh lên xe)
│   │   │   ├── routeController.js  # [MỚI] create nhận create_return (tự tạo tuyến chiều về B→A)
│   │   │   ├── tripController.js   # [MỚI] + getPassengers (danh sách khách theo chuyến, cho cả tài xế của chuyến), sort/lọc theo thời gian, nhận driver_id (+ gửi mail phân công)
│   │   │   ├── driverController.js # [MỚI] Mọi chức năng của tài xế: lịch tuần, dashboard, bắt đầu/hoàn thành chuyến, điểm danh, lịch sử, xuất .ics, ngày nghỉ
│   │   │   ├── tripIncidentController.js # [MỚI] Báo sự cố/trễ chuyến (tài xế gửi, staff/admin xử lý)
│   │   │   ├── tripTemplateController.js  # [MỚI] CRUD mẫu chuyến lặp lại
│   │   │   ├── vehicleController.js
│   │   │   ├── statsController.js
│   │   │   └── paymentController.js # [MỚI] Tạo/xác thực thanh toán MoMo
│   │   ├── jobs/                # [MỚI] Tác vụ nền chạy bằng setInterval
│   │   │   ├── expireInvoices.js            # Tự hủy hóa đơn 'pending' quá hạn
│   │   │   ├── generateTripsFromTemplates.js # Tự sinh Trip từ TripTemplate
│   │   │   ├── updateTripStatuses.js         # Tự chuyển trạng thái chuyến theo giờ đi/đến ([MỚI] nhường quyền cho tài xế với chuyến đã phân công)
│   │   │   └── sendDepartureReminders.js     # [MỚI] Gửi mail nhắc khách trước giờ khởi hành 30 phút
│   │   ├── services/
│   │   │   ├── momoService.js  # [MỚI] Ký request & xác thực chữ ký callback MoMo
│   │   │   └── mailService.js  # [MỚI] Gửi email qua Nodemailer (SMTP): nhắc chuyến, phân công tài xế, báo trễ chuyến
│   │   ├── middlewares/
│   │   │   ├── auth.js         # JWT middleware (đọc từ HttpOnly Cookie)
│   │   │   ├── role.js         # Phân quyền theo role
│   │   │   └── validate.js     # [MỚI] Input validation (Joi)
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Invoice.js      # 1 lần thanh toán (1-N với Ticket)
│   │   │   ├── Ticket.js       # [MỚI] 1 ghế = 1 vé; + issued_at/issued_by/print_count (cache lần in gần nhất)
│   │   │   ├── TicketPrint.js  # [MỚI] Lịch sử đầy đủ mọi lần in vé (phục vụ đối soát cuối ca)
│   │   │   ├── Route.js
│   │   │   ├── Trip.js
│   │   │   ├── TripTemplate.js # [MỚI] Mẫu chuyến lặp lại theo tuần
│   │   │   ├── TripIncident.js # [MỚI] Sự cố/trễ chuyến do tài xế báo
│   │   │   ├── DriverUnavailability.js # [MỚI] Ngày nghỉ của tài xế
│   │   │   ├── Vehicle.js
│   │   │   └── index.js        # Đăng ký toàn bộ association
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js  # [MỚI] + /customers/search, /customers (staff/admin, khai báo trước blanket admin-only)
│   │   │   ├── invoice.routes.js
│   │   │   ├── ticket.routes.js  # [MỚI] + /:id/print, /:id/prints, /prints (quầy vé), + /:id/board (điểm danh)
│   │   │   ├── route.routes.js
│   │   │   ├── trip.routes.js  # [MỚI] + /:id/tickets (danh sách khách theo chuyến — staff/admin + tài xế của chuyến)
│   │   │   ├── driver.routes.js  # [MỚI] /api/driver/* (chỉ role driver)
│   │   │   ├── tripIncident.routes.js  # [MỚI] /api/trip-incidents (staff/admin)
│   │   │   ├── tripTemplate.routes.js  # [MỚI] /api/trip-templates
│   │   │   ├── vehicle.routes.js
│   │   │   ├── stats.routes.js
│   │   │   └── payment.routes.js    # [MỚI] /api/payments/momo/*
│   │   ├── db/                 # [MỚI] migrator.js (umzug), safety.js (rào chắn lệnh xóa dữ liệu), backup.js (mysqldump)
│   │   ├── scripts/            # Script chạy tay qua npm run db:*
│   │   │   ├── createDb.js, migrate.js, resetDb.js, backupDb.js, restoreDb.js  # [MỚI] quản lý DB
│   │   │   ├── seedDrivers.js  # [MỚI] Tạo sẵn 2 tài xế/xe + gán vào mẫu chuyến & chuyến sắp chạy (idempotent, giữ dữ liệu)
│   │   │   └── seedData.js     # Seed dữ liệu mẫu (gọi seedDrivers → taixe1/taixe2.<biển số>@datvexekhach.vn)
│   │   ├── utils/
│   │   │   ├── joiSchemas.js   # [MỚI] Schema validate cho middlewares/validate.js
│   │   │   ├── pagination.js   # [MỚI] getPagination/buildPaginationMeta dùng chung
│   │   │   ├── tripScheduling.js # [MỚI] findVehicleScheduleConflict dùng chung
│   │   │   ├── driverScheduling.js # [MỚI] validateDriverAssignment (tài xế hợp lệ, không nghỉ, không trùng lịch)
│   │   │   └── dateVN.js       # [MỚI] Ngày giờ theo múi giờ VN (tuần bắt đầu Thứ 2) dùng cho lịch tài xế
│   │   └── app.js
│   ├── migrations/             # [MỚI] Migration có phiên bản — nguồn chuẩn của schema
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/                   # React.js (Vite + shadcn/ui)
    ├── public/
    ├── src/
    │   ├── api/                # Axios instances & API calls
    │   │   ├── axiosInstance.js
    │   │   ├── authApi.js
    │   │   ├── invoiceApi.js
    │   │   ├── ticketApi.js    # [MỚI] + printTicket/getPrintHistory/getPrintLog
    │   │   ├── tripApi.js      # [MỚI] + getPassengers (danh sách khách theo chuyến)
    │   │   ├── driverApi.js    # [MỚI] Lịch tuần, dashboard, start/complete, điểm danh, lịch sử, .ics, ngày nghỉ
    │   │   ├── tripIncidentApi.js  # [MỚI] Báo/xử lý sự cố chuyến
    │   │   ├── tripTemplateApi.js  # [MỚI] CRUD mẫu chuyến lặp lại
    │   │   ├── routeApi.js
    │   │   ├── vehicleApi.js
    │   │   ├── userApi.js      # [MỚI] + searchCustomers/resolveOrCreateCustomer
    │   │   ├── statsApi.js
    │   │   └── paymentApi.js   # [MỚI] Khởi tạo & xác thực thanh toán MoMo
    │   ├── components/
    │   │   ├── common/         # Navbar, Footer, AdminLayout, PageLayout...
    │   │   │   └── SmoothScrollProvider.jsx  # [MỚI] Lenis smooth-scroll + GSAP ScrollTrigger
    │   │   ├── ui/             # [shadcn/ui] Button, Input, Table, Badge, Dialog, Select...
    │   │   │   ├── pagination.jsx  # [MỚI] Component phân trang dùng chung (tự viết, không phải shadcn)
    │   │   │   └── textarea.jsx    # [MỚI] Tự viết theo style input.jsx (dùng cho ô nhập lý do in lại)
    │   │   └── features/       # Feature-specific components
    │   │       ├── SeatMap.jsx         # Sơ đồ ghế tương tác
    │   │       ├── TripCard.jsx        # Card chuyến xe (Framer Motion)
    │   │       ├── InvoiceStatus.jsx   # Badge trạng thái hóa đơn
    │   │       ├── TripStatus.jsx      # [MỚI] Badge trạng thái chuyến xe
    │   │       ├── ActiveStatus.jsx    # [MỚI] Badge kích hoạt/vô hiệu hóa (user, route, vehicle...)
    │   │       ├── StatCard.jsx        # [MỚI] Thẻ KPI đếm số chạy (GSAP `useGSAP`)
    │   │       ├── StatsChart.jsx      # Biểu đồ (Recharts)
    │   │       ├── TicketPrintView.jsx     # [MỚI] Phiếu vé in cho từng khách (QR code, cảnh báo "IN LẠI")
    │   │       ├── TripPassengersDialog.jsx # [MỚI] Danh sách khách theo chuyến + in phiếu điểm danh cho phụ xe
    │   │       ├── DriverWeekSchedule.jsx   # [MỚI] Lưới lịch tuần T2→CN cho tài xế (mobile: danh sách theo ngày)
    │   │       └── IncidentReportDialog.jsx # [MỚI] Form tài xế báo sự cố/trễ chuyến
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── Login.jsx
    │   │   │   └── Register.jsx
    │   │   ├── public/
    │   │   │   ├── Home.jsx            # Trang chủ + tìm kiếm
    │   │   │   ├── TripDetail.jsx      # Chi tiết & chọn ghế
    │   │   │   ├── Terms.jsx           # [MỚI] Điều khoản sử dụng
    │   │   │   ├── PrivacyPolicy.jsx   # [MỚI] Chính sách bảo mật
    │   │   │   └── CancellationPolicy.jsx  # [MỚI] Quy chế hủy vé
    │   │   ├── customer/
    │   │   │   ├── BookTicket.jsx
    │   │   │   ├── InvoiceHistory.jsx
    │   │   │   ├── Profile.jsx
    │   │   │   └── PaymentReturn.jsx    # [MỚI] Trang MoMo redirect về sau khi thanh toán
    │   │   ├── staff/
    │   │   │   ├── ManageInvoice.jsx  # [MỚI] + nút In vé/In lại vé (quầy vé)
    │   │   │   ├── Statistics.jsx
    │   │   │   ├── ViewTrips.jsx      # [MỚI] + lọc "Khoảng thời gian", nhãn "Sắp khởi hành", nút Danh sách khách
    │   │   │   ├── ViewRoutes.jsx
    │   │   │   ├── ViewVehicles.jsx   # [MỚI] + cột Tài xế (đang/sắp chạy, đội thay ca)
    │   │   │   ├── PrintReconciliation.jsx  # [MỚI] Đối soát in vé (/staff/print-log)
    │   │   │   └── TripIncidents.jsx  # [MỚI] Danh sách sự cố tài xế báo + đánh dấu đã xử lý (/staff/incidents, staff/admin)
    │   │   ├── driver/             # [MỚI] Trang dành cho tài xế
    │   │   │   ├── MyTrips.jsx         # [MỚI] Dashboard + lịch chạy trong tuần (/driver/trips)
    │   │   │   ├── DriverTripDetail.jsx # [MỚI] Chi tiết chuyến: sơ đồ ghế, nút mở danh sách khách + điểm danh, bắt đầu/hoàn thành, báo sự cố (/driver/trips/:id)
    │   │   │   ├── TripHistory.jsx     # [MỚI] Lịch sử chuyến đã chạy + thống kê cá nhân (/driver/history)
    │   │   │   └── Unavailability.jsx  # [MỚI] Đăng ký ngày nghỉ (/driver/leave)
    │   │   └── admin/
    │   │       ├── Dashboard.jsx       # [MỚI] Tổng quan Admin
    │   │       ├── ManageUsers.jsx     # [MỚI] + option role `driver`, nút "Thêm tài khoản" (CreateUserDialog)
    │   │       ├── ManageRoutes.jsx    # [MỚI] + checkbox "Tự tạo tuyến chiều về"
    │   │       ├── ManageTrips.jsx     # [MỚI] + nút Danh sách khách (dùng chung TripPassengersDialog với staff), + chọn tài xế
    │   │       ├── ManageTripTemplates.jsx  # [MỚI] Mẫu chuyến lặp lại, + tài xế mặc định
    │   │       └── ManageVehicles.jsx  # [MỚI] + cột Tài xế
    │   ├── store/
    │   │   ├── authSlice.js    # { user, role, isAuthenticated }
    │   │   ├── bookingSlice.js # [MỚI] { selectedTrip, selectedSeats[] }
    │   │   └── store.js
    │   ├── router/
    │   │   ├── AppRouter.jsx
    │   │   └── PrivateRoute.jsx
    │   ├── hooks/              # [MỚI] Custom hooks
    │   │   ├── useAuth.js
    │   │   ├── useBooking.js
    │   │   └── useTheme.js     # [MỚI] Toggle dark/light, lưu localStorage
    │   ├── lib/                # [MỚI] Tiện ích dùng chung
    │   │   ├── utils.js        # cn() helper (shadcn/ui) + exportToCsv()
    │   │   └── gsap.js         # [MỚI] Import/đăng ký gsap + ScrollTrigger dùng chung
    │   ├── styles/             # [MỚI] Global styles & CSS Variables
    │   │   └── globals.css
    │   ├── App.jsx
    │   └── main.jsx
    ├── components.json         # [MỚI] Config shadcn/ui
    ├── .env
    └── package.json
```

---

## 🗄️ Database (MySQL / MariaDB)

Schema được quản lý bằng **migration có phiên bản** (umzug) trong `backend/migrations/` — đó là nguồn chuẩn của schema
(bảng, khóa ngoại, CHECK, index). Thiết kế chi tiết, sơ đồ ERD, chính sách khóa ngoại và quy trình sao lưu:
[md/ThietKeDatabase.md](md/ThietKeDatabase.md). Không còn dùng `sequelize.sync()`.

**Cài đặt lần đầu** (XAMPP MariaDB 10.4 hoặc MySQL 8.x, mặc định `root` / mật khẩu rỗng):

```bash
cd backend
cp .env.example .env          # điền DB_PASS, JWT_SECRET...; DB_NAME=bus_ticket_dev
npm run db:create             # tạo database utf8mb4
npm run db:migrate            # tạo toàn bộ bảng
npm run db:seed -- --yes      # nạp dữ liệu mẫu (xóa dữ liệu cũ)
```

> **Lưu ý thiết kế DB:**
> - `invoices` = 1 lần thanh toán (có thể chứa nhiều vé); `paid_at` = thời điểm thanh toán (bắt buộc khi `paid`/`refunded`).
> - `tickets` = 1 ghế cụ thể (quan hệ N-1 với `invoices`).
> - `UNIQUE(trip_id, active_seat_number)` ngăn chặn **double booking** ở tầng DB (chỉ áp dụng cho vé đang `booked`, vé `cancelled` có `active_seat_number = NULL` nên không chặn bán lại ghế). CHECK `chk_tickets_active_seat` bắt buộc `active_seat_number` luôn khớp `booking_status`.
> - `ticket_prints` = lịch sử **mọi** lần in vé — `tickets.issued_at/issued_by/print_count` chỉ là cache, nguồn đối soát cuối ca là bảng này.
> - **Khóa ngoại**: `RESTRICT` cho lịch sử tiền/vé (users→invoices→tickets, trips→tickets, routes/vehicles→trips, ticket_prints) — DB tự chặn xóa làm mất lịch sử, kể cả khi xóa thẳng bằng SQL/phpMyAdmin; `SET NULL` cho tài xế/người thao tác; `CASCADE` cho dữ liệu phụ (mẫu chuyến, sự cố, ngày nghỉ).
> - **CHECK**: ghế trống không âm, giá > 0, giờ đến sau giờ đi, vé trung chuyển phải có địa chỉ, sự cố trễ phải có số phút… (danh sách đầy đủ trong migration baseline).
> - `trips.driver_id` / `co_driver_id`, `trip_templates.driver_id` / `co_driver_id` = tài xế chính/phụ (`role = 'driver'`); `trips.reminder_sent_at`, `shuttle_locked_at` = cờ idempotent của các job; `actual_departure_at` / `actual_arrival_at` = giờ chạy thực tế.
> - `tickets.boarded_at/boarded_by` = điểm danh; `tickets.pickup_*` = cách lên xe (tự đến bến / xe trung chuyển); `trip_incidents` = sự cố; `driver_unavailabilities` = ngày nghỉ tài xế.

**Sao lưu / khôi phục:** `npm run db:backup` (ra `backend/backups/*.sql.gz`, giữ 10 bản) · `npm run db:restore -- <file> --yes`.
**Không** chép thư mục `C:\xampp\mysql\backup` đè lên `data` khi XAMPP báo *MySQL shutdown unexpectedly* — đó là cách đã làm mất dữ liệu (xem mục 1 của tài liệu thiết kế).

---

## ⚙️ Backend (Node.js + Express)

### Cài đặt

```bash
cd backend
npm install express mysql2 sequelize dotenv bcryptjs jsonwebtoken cors morgan cookie-parser joi
npm install nodemailer   # [MỚI] Gửi email nhắc chuyến (mailService.js)
npm install --save-dev nodemon
```

### Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | `nodemon server.js` — chạy dev server (mặc định port `8080`) |
| `npm start` | `node server.js` — chạy production |
| `npm run db:create` | [MỚI] Tạo database `DB_NAME` (utf8mb4) nếu chưa có |
| `npm run db:migrate` | [MỚI] Chạy các migration chưa chạy (`backend/migrations/`) |
| `npm run db:migrate:undo -- --yes` | [MỚI] Lùi 1 migration (tự sao lưu trước) |
| `npm run db:status` | [MỚI] Xem migration đã chạy / đang chờ |
| `npm run db:reset -- --yes` | [MỚI] Sao lưu → xóa mọi bảng → migrate → seed. Chỉ chạy với DB tên `*_dev`/`*_test` |
| `npm run db:backup` | [MỚI] `mysqldump` ra `backups/<DB>-<thời gian>.sql.gz`, giữ `BACKUP_KEEP` bản |
| `npm run db:restore -- <file> --yes` | [MỚI] Khôi phục từ file sao lưu (sao lưu trạng thái hiện tại trước) |
| `npm run db:seed-drivers` | [MỚI] Tạo sẵn **2 tài xế/xe** (thay ca chiều đi – chiều về) cho mọi xe đang có mẫu chuyến, gán vào mẫu chuyến và các chuyến `scheduled` sắp tới còn trống tài xế. Không xóa dữ liệu, chạy lại không tạo trùng, không gửi mail. Đăng nhập: `taixe1.<biển số viết liền>@datvexekhach.vn` / `password` (VD `taixe1.51b11111@...`) |
| `npm run db:seed -- --yes` | Seed dữ liệu mẫu (`src/scripts/seedData.js`) — **xóa dữ liệu cũ**, chỉ chạy với DB `*_dev`/`*_test` đã migrate. Tạo admin/staff/5 khách, 22 xe, 36 mẫu chuyến, 44 tài xế (2/xe), 21 ngày lịch sử chạy có giờ thực tế + vé + điểm danh, chuyến 14 ngày tới (vé cho 3 ngày đầu), lịch nghỉ tài xế, sự cố đã/chưa xử lý, hóa đơn pending/hủy lẻ/hoàn tiền. Tài khoản demo in ra cuối lệnh (mật khẩu `password`), VD tài xế `taixe1.51b11111@datvexekhach.vn` |

### `.env`

```env
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bus_ticket_dev   # phải kết thúc bằng _dev/_test để dùng db:seed/db:reset/db:restore
DB_USER=root
DB_PASS=yourpassword
# Sao lưu / khôi phục (XAMPP) — đổi khi chuyển sang Docker
MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe
MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
BACKUP_DIR=backups
BACKUP_KEEP=10
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Số phút giữ ghế tối đa cho hóa đơn 'pending' trước khi bị tự động hủy — TTL này
# chỉ áp dụng cho payment_method='momo' (bỏ giỏ hàng khi thanh toán online), mặc định: 30
PENDING_INVOICE_TTL_MINUTES=30

# TTL kép cho hóa đơn 'pending' payment_method='cash' (đặt online chọn trả tại quầy,
# hoặc nhân viên đặt hộ) — được giữ LÂU HƠN để khách có thời gian ra quầy trả tiền,
# nhưng không giữ quá CASH_HOLD_DEPARTURE_BUFFER_MINUTES trước giờ khởi hành dù chưa
# hết CASH_HOLD_TTL_MINUTES (tránh giữ ghế vô ích khi khách rõ ràng không đến kịp).
CASH_HOLD_TTL_MINUTES=120
CASH_HOLD_DEPARTURE_BUFFER_MINUTES=30

# Job sinh Trip từ TripTemplate: số ngày sinh trước (mặc định: 14) và chu kỳ chạy lại tính bằng ms (mặc định: 4 giờ)
TRIP_TEMPLATE_ADVANCE_DAYS=14
TRIP_TEMPLATE_CHECK_INTERVAL_MS=14400000

# MoMo Payment Gateway (sandbox) — giá trị mặc định là merchant test công khai của MoMo
SERVER_URL=http://localhost:8080
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:5173/payment/momo/return
MOMO_IPN_URL=http://localhost:8080/api/payments/momo/ipn

# [MỚI] Email nhắc chuyến (Nodemailer SMTP) — thiếu SMTP_HOST/SMTP_USER thì job gửi mail tự tắt
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM="Nhà xe <your_email@gmail.com>"
# Domain không bao giờ gửi mail (tài khoản dữ liệu mẫu). Mặc định: datvexekhach.vn,khachhang.vn
# (@quayve.local luôn bị bỏ qua). Để trống nếu muốn gửi tới mọi domain.
MAIL_SKIP_DOMAINS=datvexekhach.vn,khachhang.vn
# Gửi trước giờ khởi hành bao nhiêu phút (mặc định: 30) và chu kỳ quét tính bằng ms (mặc định: 1 phút)
DEPARTURE_REMINDER_MINUTES=30
DEPARTURE_REMINDER_CHECK_INTERVAL_MS=60000

# [MỚI] Xe trung chuyển (md/DonKhachTrungChuyen.md): chốt danh sách đón trước giờ chạy bao nhiêu phút
# (mặc định 120), giờ đón dự kiến ghi trong mail = giờ chạy - số phút này (mặc định 60),
# chu kỳ job chốt danh sách tính bằng ms (mặc định 1 phút). Nên: CUTOFF > PICKUP_LEAD > DEPARTURE_REMINDER.
SHUTTLE_CUTOFF_MINUTES=120
SHUTTLE_PICKUP_LEAD_MINUTES=60
SHUTTLE_CHECK_INTERVAL_MS=60000

# [MỚI] Chuyến đã phân công tài xế mà tài xế quên bấm "Hoàn thành": job updateTripStatuses tự
# chuyển 'completed' sau arrival_time + số phút này (mặc định: 180)
TRIP_AUTO_COMPLETE_GRACE_MINUTES=180
```

### API Endpoints

#### ❤️ Health

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/health` | Kiểm tra server đang chạy | Public |

#### 🔐 Auth

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/api/auth/register` | Đăng ký tài khoản | Public |
| POST | `/api/auth/login` | Đăng nhập → set HttpOnly Cookie | Public |
| POST | `/api/auth/logout` | Đăng xuất → clear Cookie | Auth |
| GET | `/api/auth/me` | Lấy thông tin người dùng hiện tại | Auth |
| PUT | `/api/auth/profile` | Cập nhật thông tin cá nhân | Auth |
| PUT | `/api/auth/change-password` | Đổi mật khẩu | Auth |

#### 🔍 Trips (Public)

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/trips/search` | Tìm kiếm chuyến xe | Public |
| GET | `/api/trips/:id` | Chi tiết chuyến xe | Public |
| GET | `/api/trips/:id/booked-seats` | [MỚI] Danh sách ghế đã đặt | Public |
| GET | `/api/trips/:id/tickets` | [MỚI] Danh sách hành khách của chuyến (tên/SĐT/ghế/thanh toán/xuất vé/đã lên xe, kể cả vé đã hủy). [MỚI] Tài xế chỉ gọi được cho chuyến có `driver_id = req.user.id` (403 nếu không) và **không** nhận thông tin thanh toán/in vé | Staff/Admin/Driver |

#### 🎫 Invoices & Tickets

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/api/invoices` | Tạo hóa đơn + đặt nhiều vé (Transaction). Nhận thêm `customer_id` [MỚI] — chỉ staff/admin dùng được, để đặt vé hộ gắn đúng vào khách hàng thay vì tài khoản nhân viên | Customer/Staff/Admin |
| GET | `/api/invoices/my` | Lịch sử hóa đơn của tôi | Customer |
| GET | `/api/invoices/:id` | [MỚI] Chi tiết một hóa đơn | Chủ hóa đơn/Staff/Admin |
| DELETE | `/api/invoices/:id` | Hủy toàn bộ hóa đơn | Customer/Staff/Admin |
| DELETE | `/api/tickets/:id` | [MỚI] Hủy từng vé riêng lẻ | Customer/Staff/Admin |
| POST | `/api/tickets/:id/print` | [MỚI] In vé (chỉ khi hóa đơn đã `paid`); in lại (`print_count > 0`) bắt buộc `reason` | Staff/Admin |
| GET | `/api/tickets/:id/prints` | [MỚI] Lịch sử in của một vé | Staff/Admin |
| PUT | `/api/tickets/:id/board` | [MỚI] Điểm danh khách lên xe — body `{ boarded: true \| false }` (bỏ tick được để sửa nhầm). Chỉ vé `booked`, chuyến `scheduled`/`ongoing`; tài xế chỉ điểm danh được vé thuộc chuyến của mình (403 nếu không) | Driver/Staff/Admin |
| PUT | `/api/tickets/:id/pickup` | [MỚI] Đổi cách lên xe `{ pickup_type: 'station' \| 'shuttle', pickup_address?, pickup_note? }`. Khách chỉ đổi vé của mình và trước mốc chốt; staff/admin đổi bất kỳ lúc nào trước giờ chạy | Customer/Staff/Admin |
| GET | `/api/shuttles/queue` | [MỚI] Hàng chờ "Cần in danh sách đón" (`from`/`to`) — chuyến đã chốt chưa in / cần in lại / bị hủy sau khi in | Staff/Admin |
| GET | `/api/shuttles/pickup-list` | [MỚI] Dữ liệu tờ in danh sách đón (`trip_ids=1,2` hoặc `from`/`to`), chỉ vé `booked` của hóa đơn `paid`, gộp theo địa chỉ | Staff/Admin |
| POST | `/api/shuttles/mark-printed` | [MỚI] Ghi nhận đã in `{ trip_ids }` (cũng dùng để bấm "Đã xử lý" cho chuyến bị hủy sau khi in) | Staff/Admin |
| GET | `/api/tickets/prints` | [MỚI] Báo cáo đối soát in vé theo `from`/`to`/`printed_by` — nhân viên chỉ xem được của chính mình (backend ép `printed_by`, bỏ qua tham số client gửi), admin xem được toàn bộ | Staff/Admin |

#### 👤 Customer Lookup — Đặt vé hộ khách [MỚI]

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/users/customers/search?phone=` | Tìm tài khoản khách hàng theo SĐT (chỉ trả `role: 'customer'`) | Staff/Admin |
| POST | `/api/users/customers` | Tìm hoặc tạo mới tài khoản khách hàng theo SĐT (409 nếu SĐT trùng tài khoản staff/admin) | Staff/Admin |

#### 💳 Payments — MoMo Sandbox [MỚI]

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/api/payments/momo/create/:invoiceId` | Khởi tạo thanh toán, trả về `payUrl` MoMo | Chủ hóa đơn/Staff/Admin |
| POST | `/api/payments/momo/ipn` | Callback server-to-server từ MoMo, đánh dấu hóa đơn `paid` | Public (MoMo gọi) |
| POST | `/api/payments/momo/verify-return` | Xác thực chữ ký khi trình duyệt được MoMo redirect về | Auth |

#### 👥 Users (Admin)

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/users` | Danh sách người dùng | Admin |
| POST | `/api/users` | Thêm tài khoản mới | Admin |
| GET | `/api/users/drivers` | [MỚI] Tài xế đang hoạt động để phân công. Query tùy chọn: `date` hoặc `departure_time` + `arrival_time` (+ `exclude_trip_id` khi sửa chuyến), `vehicle_id`. Mỗi tài xế kèm `unavailable` (nghỉ ngày đó), `busy_trip` (trùng giờ chuyến khác), `is_vehicle_regular` (tài xế quen của xe); đã sắp xếp: quen & trống lịch → trống lịch → bận/nghỉ | Admin |
| PUT | `/api/users/:id/role` | Phân quyền (`customer` / `staff` / `admin` / `driver` [MỚI]) | Admin |
| PUT | `/api/users/:id/status` | [MỚI] Kích hoạt / Vô hiệu hóa tài khoản | Admin |
| DELETE | `/api/users/:id` | Xóa người dùng | Admin |

#### 🛣️ Routes (Staff/Admin)

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/routes` | Danh sách tuyến xe | Staff/Admin |
| GET | `/api/routes/:id` | [MỚI] Chi tiết tuyến xe (dùng cho Form sửa) | Staff/Admin |
| POST | `/api/routes` | Thêm tuyến xe (nhận thêm `origin_station`, `shuttle_enabled`, `shuttle_area_note` [MỚI]; `PUT` cũng vậy). Nhận thêm `create_return` [MỚI] (mặc định `true`) — tạo luôn tuyến chiều về B→A (cùng `distance_km`/`duration_min`/`base_price`) trong cùng transaction, bỏ qua nếu B→A đã tồn tại; trả về `{ route, returnRoute }` (`returnRoute = null` nếu không tạo) | Admin |
| PUT | `/api/routes/:id` | Sửa tuyến xe | Admin |
| DELETE | `/api/routes/:id` | Xóa tuyến xe | Admin |

#### 🚌 Trips Management (Admin)

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/trips` | Danh sách chuyến xe — **[MỚI] mặc định sắp xếp `departure_time ASC`** (gần nhất trước), nhận thêm `from`/`to` [MỚI] để lọc theo khoảng thời gian khởi hành | Staff/Admin |
| POST | `/api/trips` | Thêm chuyến xe. Nhận thêm `driver_id` [MỚI] (tùy chọn) — phải là user `role = 'driver'` đang active và không bị trùng giờ với chuyến khác của cùng tài xế | Admin |
| PUT | `/api/trips/:id` | Sửa chuyến xe (bao gồm đổi/gỡ `driver_id` [MỚI]). Gán/đổi tài xế → gửi mail phân công cho tài xế mới và mail hủy phân công cho tài xế cũ. Chặn gán nếu tài xế có ngày nghỉ (`driver_unavailabilities`) trùng ngày khởi hành | Admin |
| DELETE | `/api/trips/:id` | Xóa chuyến xe | Admin |

#### 🧑‍✈️ Driver — Tài xế [MỚI]

Mọi endpoint `/api/driver/*` yêu cầu role `driver`; endpoint có `:id` chuyến đều kiểm tra `trip.driver_id === req.user.id` (403 nếu không phải chuyến của mình).

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/driver/trips` | Lịch chạy của tài xế đang đăng nhập. Nhận `week_start=YYYY-MM-DD` (Thứ 2 của tuần, mặc định tuần hiện tại) — backend tự tính khoảng `[Thứ 2 00:00, Chủ nhật 23:59:59]` và trả về **toàn bộ** chuyến trong tuần (không phân trang); vẫn chấp nhận `from`/`to` + phân trang opt-in (`page`/`limit`) thay thế. Mỗi chuyến gồm tuyến (origin → destination), `departure_time`, `arrival_time`, biển số + loại xe, `status`, số ghế đã bán / tổng ghế; sort `departure_time ASC`; có cả chuyến `cancelled` để tài xế biết lịch bị hủy. Backend luôn lọc theo `req.user.id`, bỏ qua mọi `driver_id` client gửi | Driver |
| GET | `/api/driver/dashboard` | Chuyến kế tiếp (kèm số khách đã đặt), số chuyến + tổng giờ chạy hôm nay / tuần này, số sự cố chưa được xử lý | Driver |
| GET | `/api/driver/trips/:id` | Chi tiết một chuyến của mình (tuyến, xe + `seat_layout`, giờ theo lịch & thực tế, sự cố đã báo). Sơ đồ ghế dùng lại `GET /api/trips/:id/booked-seats`, danh sách khách dùng `GET /api/trips/:id/tickets` | Driver |
| POST | `/api/driver/trips/:id/start` | Bấm "Bắt đầu chạy": `scheduled → ongoing`, ghi `actual_departure_at`. Chỉ cho phép từ 60 phút trước `departure_time` | Driver |
| POST | `/api/driver/trips/:id/complete` | Bấm "Hoàn thành": `ongoing → completed`, ghi `actual_arrival_at` | Driver |
| POST | `/api/driver/trips/:id/incidents` | Báo sự cố/trễ chuyến — `{ type, delay_minutes?, note?, notify_passengers? }`; `notify_passengers = true` gửi mail báo khách có vé `booked` | Driver |
| GET | `/api/driver/history` | Lịch sử chuyến `completed` của mình (`from`/`to`, phân trang opt-in) + tổng hợp: số chuyến, tổng km (`routes.distance_km`), tổng khách đã lên xe, trễ trung bình (`actual_departure_at − departure_time`) | Driver |
| GET | `/api/driver/schedule.ics?week_start=` | Xuất lịch tuần dạng iCalendar (`text/calendar`) để thêm vào Google Calendar/điện thoại. Bản CSV xuất ở client bằng `exportToCsv()` | Driver |
| GET | `/api/driver/unavailabilities` | Danh sách ngày nghỉ của mình | Driver |
| POST | `/api/driver/unavailabilities` | Đăng ký ngày nghỉ `{ start_date, end_date, reason? }` — 409 kèm danh sách chuyến nếu đã được phân công chuyến trong khoảng đó (phải nhờ Admin gỡ phân công trước) | Driver |
| DELETE | `/api/driver/unavailabilities/:id` | Hủy đăng ký ngày nghỉ (chỉ ngày nghỉ chưa bắt đầu) | Driver |

#### 🚨 Trip Incidents — Sự cố chuyến [MỚI]

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/trip-incidents` | Danh sách sự cố (`status=open\|resolved`, `from`/`to`, phân trang opt-in), kèm chuyến + tài xế báo | Staff/Admin |
| PUT | `/api/trip-incidents/:id/resolve` | Đánh dấu đã xử lý (`resolved_at`, `resolved_by`) | Staff/Admin |
| GET | `/api/users/:id/unavailabilities` | Ngày nghỉ của một tài xế (để Admin xem khi phân công) | Admin |

#### 🚐 Vehicles (Admin)

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/vehicles` | Danh sách xe | Staff/Admin |
| GET | `/api/vehicles/:id` | [MỚI] Chi tiết xe (dùng cho Form sửa) | Staff/Admin |
| POST | `/api/vehicles` | Thêm xe | Admin |
| PUT | `/api/vehicles/:id` | Sửa xe | Admin |
| DELETE | `/api/vehicles/:id` | Xóa xe | Admin |

#### 📊 Invoices (Staff/Admin) & Stats

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/invoices` | Toàn bộ hóa đơn hệ thống | Staff/Admin |
| PUT | `/api/invoices/:id/status` | [MỚI] Cập nhật trạng thái thanh toán (chỉ `pending→paid`, `paid→refunded`) | Staff/Admin |
| GET | `/api/stats` | Thống kê tổng quan | Staff/Admin |
| GET | `/api/stats/revenue` | [MỚI] Doanh thu theo khoảng thời gian | Staff/Admin |

#### 🔁 Trip Templates — Mẫu chuyến lặp lại [MỚI]

Nội bộ (không phục vụ khách/guest) — mọi endpoint kể cả đọc đều yêu cầu Staff/Admin.

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/trip-templates` | Danh sách mẫu chuyến | Staff/Admin |
| GET | `/api/trip-templates/:id` | Chi tiết một mẫu chuyến | Staff/Admin |
| POST | `/api/trip-templates` | Tạo mẫu chuyến mới (nhận thêm `driver_id` [MỚI] — tài xế mặc định) | Admin |
| PUT | `/api/trip-templates/:id` | Sửa mẫu chuyến (chỉ ảnh hưởng lần sinh Trip *sau này*; nhận `driver_id` [MỚI]) | Admin |
| DELETE | `/api/trip-templates/:id` | Xóa mẫu (Trip đã sinh vẫn giữ nguyên, chỉ gỡ liên kết `template_id`) | Admin |

> 📄 **Phân trang & tìm kiếm server-side:** mọi endpoint `getAll` liệt kê ở trên (`routes`, `vehicles`, `users`, `trips`/`search`, `driver/trips`/`driver/history`, `trip-incidents`, `invoices`/`my`, `trip-templates`) đều nhận thêm query params tùy chọn `page`, `limit` (và `search`, `status`, `role` tùy resource). **Không** truyền `page` → trả về mảng thô như cũ (dùng cho dropdown chọn Route/Vehicle...); có `page` → trả về `{ data, pagination: { page, limit, total, totalPages } }`. Xem `backend/src/utils/pagination.js`.

---

## 🖥️ Frontend (React.js + Vite)

### Cài đặt

```bash
cd frontend

# 1. Khởi tạo project Vite + React
npm create vite@latest . -- --template react

# 2. Cài các thư viện core
npm install axios react-router-dom @reduxjs/toolkit react-redux

# 3. Cài Tailwind CSS v4 (dùng Vite plugin)
npm install tailwindcss @tailwindcss/vite

# 4. Khởi tạo shadcn/ui
npx shadcn@latest init

# 5. Cài thư viện UI/UX nâng cao
npm install framer-motion
npm install gsap @gsap/react lenis     # Scroll-driven animation + smooth scroll (SmoothScrollProvider.jsx)
npm install recharts
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react
npm install date-fns
npm install sonner
npm install qrcode.react   # [MỚI] Mã QR trên phiếu vé in (TicketPrintView.jsx) — <QRCodeSVG>, chỉ để đối chiếu thủ công
```

### Cấu hình Tailwind CSS v4 (`vite.config.js`)

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

### Cấu hình shadcn/ui (`components.json`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": false,
  "tailwind": {
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Theme Sáng / Tối (`src/styles/globals.css`)

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;      /* Xanh dương chủ đạo */
  --primary-foreground: 210 40% 98%;
  --accent: 24.6 95% 53.1%;           /* Cam nổi bật (nút CTA đặt vé) */
  --accent-foreground: 0 0% 100%;
  --muted: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --accent: 24.6 95% 53.1%;
  --muted: 217.2 32.6% 17.5%;
  --border: 217.2 32.6% 17.5%;
}
```

> Dark Mode được toggle qua class `dark` trên `<html>`. Preference lưu vào `localStorage`.

### `.env`

```env
VITE_API_URL=http://localhost:8080/api
```

### Phân quyền theo Role

| Trang | Khách Vãng Lai | Khách Hàng | Nhân Viên | Tài Xế [MỚI] | Quản Trị |
|-------|:-:|:-:|:-:|:-:|:-:|
| Trang chủ & Tìm kiếm chuyến xe | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chi tiết chuyến xe (xem) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / Đăng nhập | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đặt vé & Chọn ghế (Nhân viên/Admin có thêm chức năng tìm/tạo tài khoản khách để đặt hộ đúng chủ) | ❌ | ✅ | ✅ | ❌ | ✅ |
| Hủy vé / Hủy hóa đơn | ❌ | ✅ | ✅ | ❌ | ✅ |
| Xem lịch sử hóa đơn (của tôi) | ❌ | ✅ | ❌ | ❌ | ❌ |
| [MỚI] Nhận email nhắc trước giờ khởi hành 30 phút | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cập nhật thông tin cá nhân | ❌ | ✅ | ✅ | ✅ | ✅ |
| [MỚI] Xem lịch chạy trong tuần — chuyến được phân công + giờ đi/đến (`/driver/trips`) | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Dashboard tài xế (chuyến kế tiếp, số chuyến/giờ chạy hôm nay & tuần này) | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Xem sơ đồ ghế + danh sách khách / in phiếu điểm danh của **chuyến mình** | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Điểm danh khách lên xe | ❌ | ❌ | ✅ | ✅ | ✅ |
| [MỚI] Bấm "Bắt đầu chạy" / "Hoàn thành" chuyến của mình | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Báo sự cố / trễ chuyến (tùy chọn gửi mail báo khách) | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Xem & xử lý sự cố chuyến (`/staff/incidents`) | ❌ | ❌ | ✅ | ❌ | ✅ |
| [MỚI] Lịch sử chuyến đã chạy + thống kê cá nhân (`/driver/history`) | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Xuất lịch tuần (CSV / `.ics`) | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Đăng ký ngày nghỉ (`/driver/leave`) | ❌ | ❌ | ❌ | ✅ | ❌ |
| [MỚI] Nhận email phân công / hủy phân công chuyến | ❌ | ❌ | ❌ | ✅ | ❌ |
| Quản lý hóa đơn & Hủy vé hộ khách | ❌ | ❌ | ✅ | ❌ | ✅ |
| Cập nhật trạng thái hóa đơn | ❌ | ❌ | ✅ | ❌ | ✅ |
| In vé / In lại vé (chỉ khi hóa đơn đã thanh toán) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Đối soát in vé (chỉ xem lượt in của mình; Admin xem toàn bộ) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Xem danh sách & sơ đồ ghế chuyến xe | ❌ | ❌ | ✅ | ❌ | ✅ |
| Xem & in danh sách hành khách theo chuyến (phiếu điểm danh cho phụ xe) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Lọc chuyến xe theo khoảng thời gian sắp khởi hành | ❌ | ❌ | ✅ | ❌ | ✅ |
| Tra cứu tuyến xe / xe khách (Read-only) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Thống kê & Báo cáo | ❌ | ❌ | ✅ | ❌ | ✅ |
| Quản lý tuyến xe / chuyến xe / xe (CRUD; thêm tuyến có tùy chọn tự tạo chiều về [MỚI]) | ❌ | ❌ | ❌ | ❌ | ✅ |
| [MỚI] Phân công tài xế cho chuyến / mẫu chuyến | ❌ | ❌ | ❌ | ❌ | ✅ |
| Quản lý mẫu chuyến lặp lại (Trip Templates) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Quản lý người dùng & phân quyền | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dashboard Admin | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 Chạy Dự Án

```bash
# Lần đầu (hoặc sau khi pull có migration mới)
cd backend
npm run db:migrate

# Backend
cd backend
npm run dev       # nodemon server.js (cảnh báo nếu còn migration chưa chạy)

# Frontend
cd frontend
npm run dev       # Vite dev server
```

- Backend: http://localhost:8080  
- Frontend: http://localhost:5173

---

## 🛠️ Tech Stack

| Phần | Công nghệ |
|------|-----------|
| Backend | Node.js, Express.js |
| Frontend | React.js (Vite) |
| Database | MySQL + Sequelize ORM |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Styling | Tailwind CSS |
| State | Redux Toolkit |
| HTTP Client | Axios |
| Animation | Framer Motion (page/list/modal) + GSAP + Lenis (smooth scroll, count-up KPI) |
| Email | Nodemailer (SMTP) [MỚI] |

---

## 🔒 Bảo Mật & Best Practices

| Vấn đề | Giải pháp |
|--------|-----------|
| Token storage | **HttpOnly Cookie** — backend đọc từ `req.cookies.token`, tránh XSS |
| Password | Hash bằng `bcryptjs` trước khi lưu DB |
| Input validation (BE) | `Joi` validate toàn bộ request body qua middleware |
| Form validation (FE) | `Zod` schema + `react-hook-form` |
| Double booking | `UNIQUE(trip_id, active_seat_number)` + Sequelize Transaction (row lock trên `trips`) |
| Giá vé giả mạo | Giá luôn tính lại từ `Trip.price` phía server, không tin `total_price`/`ticket_price` client gửi |
| Giữ ghế vô thời hạn | Job nền tự hủy invoice `pending` quá hạn (`backend/src/jobs/expireInvoices.js`) |
| Đổi trạng thái hóa đơn tùy tiện | `updateStatus` chỉ cho phép `pending→paid`, `paid→refunded` (`ALLOWED_STATUS_TRANSITIONS`), `refunded` là trạng thái cuối |
| Hủy vé sát giờ | Không còn ràng buộc thời gian — khách có thể tự hủy bất cứ lúc nào |
| Mất dữ liệu tài chính khi xóa | Xóa Trip/Route/Vehicle/User có Ticket/Trip/Invoice phụ thuộc bị chặn (400, gợi ý vô hiệu hóa thay vì xóa) dù association là `onDelete: 'CASCADE'` |
| Race condition | **Database Transaction** khi tạo invoice + tickets đồng thời |
| CORS | Chỉ cho phép request từ `CLIENT_URL` trong `.env` |
| Role guard | `PrivateRoute.jsx` (FE) + `role.js` middleware (BE) |
| Payment callback forgery | Mọi kết quả thanh toán MoMo (IPN lẫn redirect) đều được xác thực chữ ký HMAC-SHA256 (`momoService.verifySignature`) trước khi cập nhật `payment_status` |
| Tài xế xem/thao tác chuyến người khác [MỚI] | `GET /api/driver/trips` luôn lọc theo `req.user.id`, bỏ qua mọi `driver_id` client gửi (cùng pattern với báo cáo đối soát in vé); mọi endpoint có `:id` chuyến/vé (danh sách khách, start/complete, điểm danh, báo sự cố) kiểm tra `trip.driver_id === req.user.id`, trả 403 nếu không khớp |
| Tài xế xem thông tin thanh toán [MỚI] | `GET /api/trips/:id/tickets` bỏ các trường thanh toán/in vé khi người gọi là `driver` — tài xế chỉ cần tên/SĐT/ghế/đã lên xe |
| Job ghi đè trạng thái tài xế bấm [MỚI] | `updateTripStatuses.js` không tự chuyển `scheduled → ongoing` cho chuyến đã có `driver_id`; chỉ tự `completed` khi quá `arrival_time + TRIP_AUTO_COMPLETE_GRACE_MINUTES` |
| Gửi mail nhắc trùng [MỚI] | Cờ `trips.reminder_sent_at` — job chỉ xử lý chuyến có giá trị `NULL`, set ngay sau khi gửi |

> `role` trong JWT payload dùng để phân quyền. Backend bắt lỗi `SequelizeUniqueConstraintError` trả về thông báo "Ghế đã được đặt" thân thiện cho người dùng.

---

## 📌 Ghi Chú Quan Trọng

- **Đặt nhiều ghế:** Một request `POST /api/invoices` nhận mảng `tickets[]`, xử lý trong một DB Transaction duy nhất.
- **Sơ đồ ghế:** Component `SeatMap.jsx` nhận `totalSeats`, `layout` (từ `vehicles.seat_layout` JSON) và `bookedSeats[]` (từ API `GET /api/trips/:id/booked-seats`).
- **Framer Motion:** Dùng cho page transition, stagger list trên trang kết quả tìm kiếm, và modal animation.
- **Thanh toán MoMo (sandbox):** Khi khách chọn phương thức `momo` lúc đặt vé, hóa đơn vẫn được tạo `pending` như bình thường (không đổi transaction đặt vé), sau đó FE gọi `POST /api/payments/momo/create/:invoiceId` để lấy `payUrl` và redirect sang trang thanh toán MoMo test. `orderId` gửi cho MoMo mã hóa sẵn id hóa đơn (`INV{id}-{timestamp}`) nên không cần thêm cột DB để tra ngược. Kết quả được xác nhận qua **cả hai** đường: IPN (`/momo/ipn`, cần domain public/ngrok để chạy được ở local) và xác thực chữ ký ngay tại trang redirect (`/momo/verify-return`, hoạt động được trên `localhost` vì trình duyệt gọi thẳng backend của mình) — cả hai dùng chung logic idempotent để đánh dấu hóa đơn `paid`. Nếu tạo `payUrl` thất bại hoặc thanh toán chưa xong, khách có thể bấm lại nút "Thanh toán MoMo" ở trang Lịch sử hóa đơn.
- **Mẫu chuyến lặp lại (Trip Templates):** Thay vì tạo tay từng `Trip` mỗi ngày, Admin định nghĩa `TripTemplate` (tuyến, xe, giờ khởi hành "HH:mm", các thứ trong tuần lặp lại) tại `/admin/trip-templates`. Job nền `generateTripsFromTemplates.js` tự sinh `Trip` thật cho cửa sổ `TRIP_TEMPLATE_ADVANCE_DAYS` ngày tới (chạy ngay khi server khởi động, rồi lặp lại mỗi `TRIP_TEMPLATE_CHECK_INTERVAL_MS`), bỏ qua các trường hợp đã tồn tại, trùng lịch xe, hoặc tuyến/xe đã bị vô hiệu hóa. Tạo hoặc sửa mẫu sẽ sinh lại chuyến ngay lập tức. Xóa một template chỉ gỡ liên kết (`Trip.template_id → NULL`), **không** xóa các Trip đã sinh ra từ nó.
- **Hủy chuyến xe (cascade):** Khi Admin đổi `status` của một Trip thành `cancelled`, toàn bộ vé `booked` trên chuyến đó tự động bị hủy, và mỗi hóa đơn liên quan được: giảm trừ (nếu còn vé ở chuyến khác), chuyển `refunded` (nếu đã `paid` và không còn vé nào active), hoặc xóa hẳn (nếu vẫn `pending`, chưa thu tiền).
- **Xuất báo cáo CSV:** Nút "Xuất báo cáo" ở `staff/Statistics.jsx` dùng `exportToCsv()` (`frontend/src/lib/utils.js`) — tự thêm BOM UTF-8 + khai báo `sep=,` (để Excel bản tiếng Việt không tự đổi thành `;`) và tự đóng ngoặc kép các ô dạng ngày `dd-MM`/`dd/MM` để Excel không hiểu nhầm thành định dạng ngày kiểu Mỹ.
- **Smooth scroll & scroll animation:** Toàn app được bọc trong `SmoothScrollProvider.jsx` (Lenis) để cuộn mượt trang public/customer; tự tắt trên các route `/admin` và `/staff` (vì `AdminLayout` tự cuộn nội bộ) và tự tắt hoàn toàn nếu trình duyệt bật `prefers-reduced-motion`. `StatCard.jsx` (Dashboard, Statistics) dùng GSAP để chạy hiệu ứng đếm số KPI.
- **"Tuyến đường phổ biến" ở trang chủ:** Danh sách 3 thành phố × 3 điểm đến hiển thị ở `Home.jsx` lấy từ mảng `FEATURED_CITIES` viết cứng trong code (khớp theo đúng chuỗi điểm đi/điểm đến với các `Route` đã tải) — **không** dựa trên số liệu đặt vé thực tế và **không** có UI cấu hình cho Admin; muốn đổi tuyến nổi bật phải sửa trực tiếp mảng này.
- **In vé & đối soát cuối ca (quầy vé) [MỚI]:** Vé chỉ in được sau khi hóa đơn đã `paid` (dialog chi tiết ở `ManageInvoice.jsx`, component `TicketPrintView.jsx` — có mã QR bằng `qrcode.react` để đối chiếu thủ công lúc lên xe, **không** có màn hình quét/soát vé trong hệ thống). Vé đã in trước đó bắt buộc nhập lý do khi in lại, tự đánh nhãn "BẢN IN LẠI — LẦN N". Mọi lượt in được ghi vào bảng `ticket_prints` (không chỉ cache `issued_at`/`print_count` trên `tickets`), xem lại tại trang "Đối soát in vé" (`/staff/print-log`) — nhân viên chỉ thấy lượt in của mình, Admin thấy toàn bộ và lọc được theo nhân viên.
- **Đặt vé hộ khách gắn đúng chủ [MỚI]:** Trước đây nhân viên đặt vé hộ khách tại `/customer/book` khiến hóa đơn bị gắn vào chính tài khoản nhân viên. Nay `BookTicket.jsx` hiện thêm khối "Khách hàng nhận vé" (chỉ với role staff/admin): tìm khách theo SĐT (`GET /api/users/customers/search`) hoặc tạo nhanh tài khoản mới (`POST /api/users/customers`, email placeholder dạng `khach.<sđt>@quayve.local` nếu không nhập), rồi gửi `customer_id` khi tạo hóa đơn để hóa đơn thuộc về đúng khách hàng.
- **Giữ ghế theo phương thức thanh toán (TTL kép) [MỚI]:** `expireInvoices.js` không còn dùng một TTL chung cho mọi hóa đơn `pending` — `momo` vẫn hủy sau `PENDING_INVOICE_TTL_MINUTES` (mặc định 30 phút, dọn giỏ hàng bỏ dở), còn `cash` (đặt online chọn trả tại quầy, hoặc nhân viên đặt hộ) được giữ tới `CASH_HOLD_TTL_MINUTES` (mặc định 120 phút) nhưng không giữ quá `CASH_HOLD_DEPARTURE_BUFFER_MINUTES` (mặc định 30 phút) trước giờ khởi hành dù chưa hết hạn.
- **Danh sách hành khách theo chuyến [MỚI]:** `GET /api/trips/:id/tickets` (component `TripPassengersDialog.jsx`, dùng chung ở `staff/ViewTrips.jsx` và `admin/ManageTrips.jsx`) hiện đầy đủ tên/SĐT/ghế/trạng thái thanh toán/trạng thái xuất vé của từng hành khách trên một chuyến (kể cả vé đã hủy, đánh dấu mờ). Có nút in **phiếu điểm danh cho cả chuyến** (khác với vé xe từng khách) để phụ xe đối chiếu lúc lên xe — không giới hạn theo trạng thái thanh toán, có cột trống để tick tay. Phiếu in được portal thẳng ra `document.body` để tránh bị cắt bởi vùng cuộn của dialog.
- **Lọc chuyến xe sắp khởi hành [MỚI]:** `ViewTrips.jsx` (`/staff/trips`) nay sắp xếp mặc định theo giờ khởi hành gần nhất trước (trước đây bị ngược), có thêm bộ lọc "Khoảng thời gian" (2h/6h/hôm nay, dùng `from`/`to` trên `GET /api/trips`) và nhãn đỏ "Sắp khởi hành" cho chuyến trong vòng 2 giờ tới.
- **Role Tài xế (`driver`) [MỚI]:** Admin tạo tài khoản hoặc đổi role người dùng thành `driver` ở `ManageUsers.jsx`, rồi gán `driver_id` khi tạo/sửa Trip (`ManageTrips.jsx`) hoặc TripTemplate (`ManageTripTemplates.jsx` — job sinh chuyến tự kế thừa tài xế của mẫu). Khi gán, backend kiểm tra user đúng là `driver`, đang active, và không bị trùng giờ với chuyến khác của chính tài xế đó. Tài xế đăng nhập được chuyển thẳng tới `/driver/trips` (`driver/MyTrips.jsx`), mặc định mở **lịch chạy tuần hiện tại** (`DriverWeekSchedule.jsx`, gọi `GET /api/driver/trips?week_start=`): mỗi ngày từ Thứ 2 → Chủ nhật liệt kê các chuyến được phân công với tuyến, giờ đi–giờ đến, biển số xe, trạng thái, số ghế đã bán; có nút "Tuần trước" / "Tuần này" / "Tuần sau", ngày hôm nay được tô nổi bật. Tuần hiển thị bắt đầu từ Thứ 2 (quy ước VN) dù `days_of_week` của TripTemplate dùng `Date.getDay()` (0 = CN) — chỉ khác ở tầng hiển thị. Lịch gồm cả chuyến tạo tay lẫn chuyến sinh từ TripTemplate; tuần xa hơn `TRIP_TEMPLATE_ADVANCE_DAYS` có thể còn trống vì job chưa sinh tới. Tài xế **không** đặt vé, không xem hóa đơn/thanh toán, và chỉ được ghi dữ liệu trong phạm vi chuyến của mình (điểm danh, bắt đầu/hoàn thành, báo sự cố) cùng ngày nghỉ của chính mình. Xóa user `driver` đang có chuyến `scheduled`/`ongoing` bị chặn (400), theo đúng quy tắc chặn xóa khi còn dữ liệu phụ thuộc.
- **Dashboard tài xế [MỚI]:** Đầu trang `/driver/trips` có các thẻ KPI (dùng lại `StatCard.jsx`): chuyến kế tiếp với đồng hồ đếm ngược tới giờ khởi hành và số khách đã đặt, số chuyến + tổng giờ chạy hôm nay / tuần này, số sự cố đã báo chưa được xử lý (`GET /api/driver/dashboard`).
- **Chi tiết chuyến cho tài xế [MỚI]:** Bấm một chuyến trong lịch tuần → `/driver/trips/:id` (`DriverTripDetail.jsx`): sơ đồ ghế read-only (dùng lại `SeatMap.jsx` + `GET /api/trips/:id/booked-seats`), nút "Danh sách khách & điểm danh" mở `TripPassengersDialog.jsx` (dùng lại `GET /api/trips/:id/tickets` — backend mở cho tài xế **của đúng chuyến đó** và ẩn thông tin thanh toán/in vé) với checkbox điểm danh và nút in phiếu.
- **Điểm danh khách lên xe [MỚI]:** Trong danh sách khách, tài xế tick từng vé "Đã lên xe" (`PUT /api/tickets/:id/board`) → ghi `tickets.boarded_at`/`boarded_by`; bỏ tick được nếu nhầm. Chỉ áp dụng vé `booked` trên chuyến `scheduled`/`ongoing`. Header hiện "Đã lên X / Y khách". Staff/Admin cũng thấy cột "Đã lên xe" trong `TripPassengersDialog.jsx`. Phiếu điểm danh in giấy vẫn giữ cột "Đối chiếu" để dùng khi không có mạng.
- **Bắt đầu / hoàn thành chuyến [MỚI]:** Tài xế bấm "Bắt đầu chạy" (`scheduled → ongoing`, cho phép từ 60 phút trước giờ khởi hành, ghi `actual_departure_at`) và "Hoàn thành" (`ongoing → completed`, ghi `actual_arrival_at`). Để không bị job ghi đè, `updateTripStatuses.js` **không** tự chuyển `scheduled → ongoing` cho chuyến đã có `driver_id`, và chỉ tự `completed` khi đã quá `arrival_time + TRIP_AUTO_COMPLETE_GRACE_MINUTES` (mặc định 180 phút — phòng khi tài xế quên bấm). Chuyến **chưa** phân công tài xế giữ nguyên hành vi tự động cũ.
- **Báo sự cố / trễ chuyến [MỚI]:** `IncidentReportDialog.jsx` cho tài xế chọn loại (`delay` — bắt buộc nhập số phút trễ, `breakdown`, `accident`, `other`) + ghi chú; tick "Gửi email báo khách" thì `mailService.js` gửi 1 mail / hóa đơn có vé `booked` (bỏ qua email `@quayve.local`) và ghi `passengers_notified_at`. Staff/Admin xem sự cố ở `/staff/incidents` (`TripIncidents.jsx`) và đánh dấu đã xử lý; chuyến có sự cố chưa xử lý hiện badge cảnh báo ở `ViewTrips.jsx`/`ManageTrips.jsx`. Báo sự cố **không** tự đổi giờ chạy hay hủy chuyến — việc đó vẫn do Admin quyết định.
- **Email phân công tài xế [MỚI]:** Khi Admin gán/đổi `driver_id` trên một Trip, tài xế mới nhận mail "Bạn được phân công chuyến…" (tuyến, giờ đi, biển số), tài xế cũ (nếu có) nhận mail hủy phân công. Chuyến do TripTemplate tự sinh **không** gửi mail từng chuyến (tránh spam hàng chục mail/tuần) — tài xế xem trong lịch tuần.
- **Lịch sử & thống kê cá nhân [MỚI]:** `/driver/history` (`TripHistory.jsx`) liệt kê chuyến đã `completed` theo khoảng ngày, kèm tổng số chuyến, tổng km (cộng `routes.distance_km`), tổng khách đã lên xe, độ trễ xuất bến trung bình; biểu đồ số chuyến theo tháng (dùng lại `StatsChart.jsx`).
- **Xuất lịch tuần [MỚI]:** Nút "Xuất CSV" dùng `exportToCsv()` (`frontend/src/lib/utils.js`) với dữ liệu lịch tuần đang xem; nút "Thêm vào lịch" tải file `.ics` từ `GET /api/driver/schedule.ics` (mỗi chuyến là một `VEVENT`, tự sinh text iCalendar, không cần thêm thư viện) để import vào Google Calendar/điện thoại.
- **Ngày nghỉ của tài xế [MỚI]:** Tài xế đăng ký khoảng ngày nghỉ ở `/driver/leave` (`Unavailability.jsx`); 409 nếu đã có chuyến được phân công trong khoảng đó (phải nhờ Admin gỡ phân công trước). Admin chọn tài xế cho Trip/TripTemplate: tài xế đang nghỉ ngày đó bị disable trong Select, backend chặn thêm một lớp (400). Job `generateTripsFromTemplates.js` gặp ngày tài xế mặc định của template đang nghỉ thì **vẫn sinh chuyến** nhưng để `driver_id = NULL` (đếm vào `skippedDriverUnavailable` — gồm cả tài xế nghỉ, bị khóa hoặc trùng lịch) để Admin phân công người khác — không bỏ chuyến của khách.
- **Tài xế phụ [MỚI]:** Mỗi chuyến/mẫu chuyến có thể có thêm **tài xế phụ** (`co_driver_id`, có hoặc không, phải khác tài xế chính và chỉ chọn được khi đã có tài xế chính). Khi lập chuyến (`ManageTrips.jsx`) có 2 ô "Tài xế chính" / "Tài xế phụ" dùng chung component `DriverSelect.jsx`: đều chia nhóm **Trống lịch** / **Không khả dụng** theo giờ đi–đến đang nhập; tài xế chính tự điền tài xế quen của xe, tài xế phụ để trống cho admin tự chọn. Một tài xế làm phụ ở chuyến nào thì cũng tính là bận khung giờ đó. Tài xế phụ đăng nhập thấy chuyến trong lịch tuần (nhãn "Tài xế phụ"), xem danh sách khách, điểm danh và báo sự cố được, nhưng **chỉ tài xế chính** bấm "Bắt đầu chạy"/"Hoàn thành". Mọi nơi hiển thị tài xế (danh sách chuyến, trang xe, danh sách khách/phiếu in, kết quả tìm chuyến, vé của khách) đều hiện thêm tài xế phụ.
- **Tài xế có sẵn & đề xuất khi lập lịch [MỚI]:** `npm run db:seed-drivers` tạo 2 tài xế cho mỗi xe: tài xế 1 làm **tài xế chính**, tài xế 2 làm **tài xế phụ** trên mọi chuyến của xe (hai người đi theo xe nên lịch không chồng giờ), rồi gán vào các chuyến sắp chạy đang trống. Khi admin tạo chuyến (`ManageTrips.jsx`), ô "Tài xế phụ trách" tự gọi `GET /api/users/drivers` theo xe + giờ đi/đến đang nhập, chia nhóm **Trống lịch** (★ tài xế của xe đứng đầu) / **Không khả dụng** (ghi rõ "đang nghỉ" hoặc "trùng TRIP-x") và tự điền tài xế phù hợp nhất (admin chọn tay thì không bị ghi đè). Form mẫu chuyến tự điền tài xế quen khi chọn xe. Trang xe (`ViewVehicles.jsx`/`ManageVehicles.jsx`, component `VehicleDriverCell.jsx`) hiện tài xế của chuyến đang/sắp chạy + đội thay ca; danh sách khách và phiếu điểm danh in hiện tên + SĐT tài xế. Admin tạo thẳng tài khoản tài xế/nhân viên bằng nút "Thêm tài khoản" ở Quản lý người dùng.
- **Xe trung chuyển [MỚI]:** khách chọn khi đặt vé (từng vé) "Tự đến bến" hoặc "Xe trung chuyển đón" + địa chỉ, ở tuyến có `shuttle_enabled` và trước mốc chốt `SHUTTLE_CUTOFF_MINUTES` (mặc định 120 phút). Job `lockShuttleLists.js` (luôn chạy, không cần SMTP) khóa danh sách ở mốc chốt và gửi mail báo khách đi trung chuyển; quầy vé in danh sách tại `/staff/shuttles` (hoặc nút "In danh sách đón" trong dialog danh sách khách) đưa cho tài xế trung chuyển. Chỉ vé của hóa đơn đã thanh toán vào danh sách; hóa đơn `pending` có vé trung chuyển bị tự hủy khi chuyến qua mốc chốt. Chi tiết: `md/DonKhachTrungChuyen.md`. Cột/bảng nằm trong migration baseline.
- **Email nhắc chuyến [MỚI]:** Job nền `sendDepartureReminders.js` chạy mỗi `DEPARTURE_REMINDER_CHECK_INTERVAL_MS` (mặc định 1 phút), tìm các chuyến `scheduled` sẽ khởi hành trong vòng `DEPARTURE_REMINDER_MINUTES` (mặc định **30 phút**) và có `reminder_sent_at IS NULL`, gửi **1 email / hóa đơn** tới chủ hóa đơn có vé `booked` (liệt kê số ghế, tên hành khách, tuyến, giờ khởi hành, biển số xe) qua `mailService.js` (Nodemailer), rồi set `reminder_sent_at`. Bỏ qua email placeholder `khach.<sđt>@quayve.local` của khách tạo tại quầy. Lỗi SMTP chỉ được log, không làm dừng job; thiếu cấu hình SMTP thì job tự tắt khi khởi động server.
- **Tự tạo tuyến chiều về [MỚI]:** Form "Thêm tuyến" ở `ManageRoutes.jsx` có checkbox "Tự tạo tuyến chiều về" (**mặc định bật**). Khi bật, `POST /api/routes` tạo thêm tuyến B→A với cùng `distance_km`/`duration_min`/`base_price` trong cùng một transaction; nếu tuyến B→A đã tồn tại thì bỏ qua (không tạo trùng). Chỉ áp dụng khi **tạo mới** — sửa/vô hiệu hóa một tuyến **không** tự đồng bộ sang tuyến chiều ngược lại.
- **shadcn/ui components đã cài (`frontend/src/components/ui/`):**

```bash
npx shadcn@latest add button input label form-field table badge card
npx shadcn@latest add dialog alert-dialog dropdown-menu select tabs switch
npx shadcn@latest add avatar skeleton sonner
```
`pagination.jsx` và `textarea.jsx` trong cùng thư mục là component tự viết (không phải shadcn) — xem ghi chú cấu trúc dự án phía trên.


## 🎨 PRD Thiết Kế Frontend

### Màn hình cần xây dựng

#### Luồng Khách Hàng (Guest & Customer)
- **Home & Search:** Form tìm kiếm (Điểm đi, Điểm đến, Ngày đi, Số hành khách). Danh sách chuyến xe dạng card với Framer Motion stagger animation.
- **Trip Detail & Booking:** Sơ đồ ghế tương tác (`SeatMap.jsx`), form thông tin hành khách (react-hook-form + Zod), tóm tắt đơn hàng.
- **Login / Register:** Form xác thực với validation inline.
- **Invoice History:** Bảng hóa đơn với filter trạng thái, nút hủy vé.
- **Profile:** Form cập nhật thông tin và đổi mật khẩu.

#### Luồng Nhân Viên (Staff)
- **Manage Invoices:** Bảng hóa đơn toàn hệ thống, filter đa chiều, cập nhật trạng thái thanh toán, hủy hóa đơn hoặc hủy vé riêng lẻ thay cho khách, tìm kiếm nâng cao theo tên/SĐT hành khách. **[MỚI]** In vé/in lại vé (phiếu vé QR) ngay trong dialog chi tiết khi hóa đơn đã thanh toán.
- **View Trips:** Xem danh sách chuyến xe và sơ đồ ghế tương tác của từng chuyến (ghế trống/đã đặt) để nắm bắt thông tin và hỗ trợ hành khách. **[MỚI]** Lọc theo khoảng thời gian sắp khởi hành (2h/6h/hôm nay), nhãn "Sắp khởi hành", và nút "Danh sách khách" xem + in phiếu điểm danh cho phụ xe.
- **View Routes & Vehicles:** [MỚI] Tra cứu nhanh danh sách các tuyến đường vận chuyển và danh sách phương tiện xe khách hiện có trong hệ thống (chế độ Read-only).
- **Book Ticket (At counter):** [MỚI] Đặt vé và chọn ghế trực tiếp tại quầy hoặc qua điện thoại thay cho khách hàng — dùng chung trang `customer/BookTicket.jsx` (route `/customer/book` cho phép cả `customer`/`staff`/`admin`), không phải trang riêng. **[MỚI]** Khối "Khách hàng nhận vé" để tìm/tạo đúng tài khoản khách hàng theo SĐT, đảm bảo hóa đơn gắn vào khách chứ không phải tài khoản nhân viên.
- **Print Reconciliation:** [MỚI] Trang "Đối soát in vé" (`/staff/print-log`) xem lại mọi lượt in vé theo khoảng ngày — chỉ thấy lượt in của chính mình.
- **Trip Incidents:** [MỚI] Trang `/staff/incidents` (staff/admin) — danh sách sự cố tài xế báo (lọc chưa xử lý / đã xử lý), xem chuyến liên quan, nút "Đã xử lý". Cột "Đã lên xe" trong dialog Danh sách khách.
- **Statistics:** Biểu đồ doanh thu bằng Recharts (Line chart theo ngày, Bar chart theo tháng), thẻ KPI đếm số (GSAP) và nút xuất báo cáo CSV.

#### Luồng Tài Xế (Driver) [MỚI]
- **Lịch chạy trong tuần (My Trips):** Trang `/driver/trips`, mở ngay sau khi tài xế đăng nhập. Desktop: lưới 7 cột (T2…CN), mỗi chuyến là một thẻ nhỏ gồm giờ đi–giờ đến, tuyến, biển số, badge trạng thái (dùng lại `TripStatus.jsx`), số ghế đã bán; chuyến `cancelled` hiển thị gạch ngang. Mobile: danh sách nhóm theo ngày. Header có tổng số chuyến / tổng giờ chạy trong tuần, điều hướng tuần trước/này/sau, nhãn "Sắp khởi hành" cho chuyến trong 2 giờ tới. Phía trên lịch là các thẻ KPI dashboard (chuyến kế tiếp + đếm ngược, số chuyến/giờ chạy hôm nay & tuần này, sự cố chưa xử lý). Nút "Xuất CSV" / "Thêm vào lịch (.ics)".
- **Chi tiết chuyến:** `/driver/trips/:id` — thông tin chuyến (giờ theo lịch & thực tế), sơ đồ ghế read-only, danh sách khách với checkbox "Đã lên xe" (đếm "Đã lên X / Y"), nút in phiếu điểm danh, nút lớn "Bắt đầu chạy" / "Hoàn thành" (tối ưu cho điện thoại), nút "Báo sự cố" mở `IncidentReportDialog.jsx`.
- **Lịch sử chuyến:** `/driver/history` — bảng chuyến đã hoàn thành theo khoảng ngày + thẻ tổng hợp (số chuyến, km, khách, trễ trung bình) + biểu đồ theo tháng.
- **Ngày nghỉ:** `/driver/leave` — danh sách ngày nghỉ đã đăng ký, form đăng ký mới (date range), nút hủy với ngày nghỉ chưa bắt đầu.
- **Điều hướng:** dùng chung `AdminLayout` với sidebar riêng cho driver (Lịch chạy / Lịch sử / Ngày nghỉ / Hồ sơ); giao diện ưu tiên mobile vì tài xế dùng điện thoại trên xe.

#### Luồng Quản Trị (Admin)
- **Dashboard:** Widget thống kê nhanh (tổng vé hôm nay, doanh thu tháng, chuyến đang chạy), biểu đồ mini, thẻ KPI đếm số (GSAP).
- **Manage Routes:** CRUD tuyến đường với Dialog + Form shadcn/ui. **[MỚI]** Checkbox "Tự tạo tuyến chiều về" (mặc định bật) trong form thêm tuyến.
- **Manage Trips:** CRUD chuyến xe, gán xe + tuyến. **[MỚI]** Nút "Danh sách khách" xem + in phiếu điểm danh hành khách theo chuyến (dùng chung component với `staff/ViewTrips.jsx`). **[MỚI]** Select chọn tài xế (chỉ liệt kê user `role = 'driver'` đang active; tài xế đang nghỉ ngày đó bị disable kèm ghi chú), badge cảnh báo chuyến có sự cố chưa xử lý, cột giờ chạy thực tế.
- **Manage Trip Templates:** [MỚI] CRUD mẫu chuyến lặp lại theo tuần (`route`, `vehicle`, giờ khởi hành, các thứ trong tuần, tài xế mặc định).
- **Manage Vehicles:** CRUD phương tiện, cấu hình sơ đồ ghế (JSON).
- **Manage Users:** Bảng người dùng, đổi role bằng Select (thêm option `driver` [MỚI]), toggle trạng thái bằng Switch.

### Phong Cách Thiết Kế
- **Màu sắc:** `--primary` Xanh dương `#3B82F6` (tin cậy) + `--accent` Cam `#F97316` (CTA đặt vé).
- **Typography:** Font `Inter` (Google Fonts) — Sans-serif hiện đại.
- **Dark Mode:** Hỗ trợ đầy đủ qua CSS Variables của shadcn/ui.
- **Animation:** Framer Motion — page transitions, stagger list, modal scale-in.
- **Layout:** Mobile-first responsive. Sidebar collapsible cho Admin/Staff dùng shadcn `Sheet`.

### Redux State Shape

```js
// authSlice
{ user: { id, fullName, email, role }, isAuthenticated: false }  // role: 'customer' | 'staff' | 'admin' | 'driver' [MỚI]

// bookingSlice
{
  selectedTrip: null,         // Object chuyến xe đã chọn
  selectedSeats: [],          // [{ seatNumber, passengerName, passengerPhone }]
  bookedSeats: [],            // Ghế đã đặt (fetch từ API)
}
```