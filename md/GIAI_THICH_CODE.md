# Giải Thích Code — Đặt Vé Xe Khách

Tài liệu này giải thích **cách code hoạt động** (kiến trúc, luồng dữ liệu, các quyết định thiết kế quan trọng) để người đọc mới có thể nắm dự án nhanh. Về danh sách lệnh chạy dự án và DDL database chi tiết, xem [README.md](README.md).

---

## 1. Tổng quan kiến trúc

Đây là monorepo gồm 2 app độc lập, mỗi app có `node_modules`/`package.json` riêng:

```
Web_BanVeXe/
├── backend/     # Express + Sequelize (MySQL) — REST API
└── frontend/    # React 19 + Vite + Redux Toolkit — SPA
```

Frontend gọi API qua Axios (`VITE_API_URL`), backend chỉ cho phép CORS từ `CLIENT_URL`. Xác thực dùng **JWT lưu trong HttpOnly cookie** — không có token nào nằm trong localStorage hay header, nên toàn bộ request đều gửi kèm cookie tự động (`withCredentials: true`).

4 vai trò người dùng: **Guest** (chưa đăng nhập) → **Customer** → **Staff** → **Admin**, quyền tăng dần.

---

## 2. Backend (`backend/`)

### 2.1 Điểm khởi động

- `server.js`: load `.env` → `connectDB()` (không fatal nếu DB lỗi, server vẫn chạy) → `require('./src/models')` (side-effect: đăng ký toàn bộ association Sequelize) → `app.listen(PORT)`.
- `src/app.js`: cấu hình middleware toàn cục (cors với `credentials: true`, morgan, cookie-parser, json body parser), mount router theo resource dưới `/api/*`, kết thúc bằng 404 handler và error handler toàn cục (đọc `err.statusCode`/`err.message`, chỉ log stack ở server).

### 2.2 Kiến trúc phân lớp

```
routes/  →  controllers/  →  models/
```

Không có service layer riêng. Controller là object chứa các hàm async thuần (không dùng class), ví dụ `src/controllers/invoiceController.js` export `{ create, getMyInvoices, cancelInvoice, getAll, updateStatus }`.

| Resource | Route file | Controller |
|---|---|---|
| Xác thực | `auth.routes.js` | `authController.js` |
| Người dùng | `user.routes.js` | `userController.js` |
| Hóa đơn | `invoice.routes.js` | `invoiceController.js` |
| Vé | `ticket.routes.js` | `ticketController.js` |
| Tuyến đường | `route.routes.js` | `routeController.js` |
| Chuyến xe | `trip.routes.js` | `tripController.js` |
| Xe khách | `vehicle.routes.js` | `vehicleController.js` |
| Thống kê | `stats.routes.js` | `statsController.js` |

### 2.3 Xác thực & phân quyền

- `src/middlewares/auth.js` (`protect`): đọc `req.cookies.token` → verify JWT → load `User` theo `id` trong payload → kiểm tra `user.is_active` → gắn `req.user`. Không có token/hết hạn/tài khoản bị khóa đều trả 401.
- `src/middlewares/role.js` (`authorize(...roles)`): so `req.user.role` (`customer` | `staff` | `admin`) với danh sách role được phép, không khớp trả 403. Luôn dùng **sau** `protect`.
- `src/middlewares/validate.js` + `src/utils/joiSchemas.js`: validate `req.body` bằng Joi trước khi vào controller (ví dụ `schemas.createInvoice`, `schemas.register`).

Ví dụ áp quyền trong `invoice.routes.js`: mọi route trong file đều `router.use(protect)` trước, sau đó từng route tự thêm `authorize(...)` theo vai trò — customer chỉ thấy hóa đơn của chính mình (`GET /my`), staff/admin xem toàn bộ (`GET /`) và đổi trạng thái thanh toán.

### 2.4 Mô hình dữ liệu & quan hệ

Định nghĩa association tập trung tại `src/models/index.js`:

```
User      1───N  Invoice   (user_id, CASCADE)
Invoice   1───N  Ticket    (invoice_id, CASCADE)
Trip      1───N  Ticket    (trip_id, CASCADE)
Route     1───N  Trip      (route_id, CASCADE)
Vehicle   1───N  Trip      (vehicle_id, CASCADE)
```

Điểm mấu chốt cần nhớ khi đọc code booking:

- **1 Invoice = 1 lần thanh toán** (`payment_status`: `pending` → `paid`/`refunded`), có thể chứa nhiều vé (đặt nhiều ghế cùng lúc, kể cả khác chuyến).
- **1 Ticket = 1 ghế** trên 1 `Trip` (`booking_status`: `booked`/`cancelled`).
- Ràng buộc **`UNIQUE(trip_id, seat_number)`** trên bảng `tickets` (index `uq_trip_seat` trong `Ticket.js`) là tuyến phòng thủ cuối cùng chống trùng ghế ở tầng DB, độc lập với logic ứng dụng.
- `trips.available_seats` là một bộ đếm **được duy trì thủ công** song song với số vé `booked` thực tế — mọi chỗ tăng/giảm ghế phải đi cùng transaction tạo/hủy vé, nếu không hai số liệu sẽ lệch nhau.

### 2.5 Luồng đặt vé (transactional) — phần quan trọng nhất

`POST /api/invoices` (`invoiceController.create`, `backend/src/controllers/invoiceController.js:8`) nhận `{ total_price, payment_method, tickets: [...] }` và chạy toàn bộ trong **một `sequelize.transaction()`**:

1. Tạo `Invoice` (`payment_status: 'pending'`).
2. Với từng phần tử trong `tickets[]`: tạo `Ticket` tương ứng. Nếu 2 request đặt trùng ghế cùng lúc, ràng buộc UNIQUE ở DB sẽ ném `SequelizeUniqueConstraintError` — được bắt và trả về **409** kèm thông báo tiếng Việt *"Ghế bạn chọn đã được khách khác đặt..."*.
3. Gom số ghế đã đặt theo từng `trip_id`, kiểm tra `trip.available_seats` đủ không, rồi trừ đi và `save()` — vẫn trong transaction.
4. Nếu mọi bước ok → `t.commit()`. Nếu bất kỳ bước nào lỗi → `t.rollback()`, không để lại dữ liệu rác.

Cùng pattern transaction này lặp lại ở:

- `cancelInvoice` (`DELETE /api/invoices/:id`): chỉ hủy được hóa đơn còn `pending`; cộng trả `available_seats` cho từng trip theo số vé `booked`, rồi `invoice.destroy()` (cascade xóa hết ticket liên quan nhờ `onDelete: 'CASCADE'`).
- `updateStatus` (`PUT /api/invoices/:id/status`): khi staff/admin chuyển trạng thái sang `refunded`, code duyệt từng ticket đang `booked`, đổi thành `cancelled` (+ `cancelled_at`), rồi cộng trả ghế — đảm bảo `available_seats` luôn khớp với số vé `booked` thực tế.

> Khi sửa bất kỳ code nào liên quan đến đặt/hủy vé, **luôn giữ nguyên cặp transaction + cập nhật `available_seats`** — đây là cơ chế duy nhất chống bán vượt số ghế (overselling).

### 2.6 Database

MySQL, schema định nghĩa qua các model Sequelize (không dùng migration file) và áp dụng bằng `npm run db:sync` (`src/scripts/syncDb.js`). `npm run db:seed` để tạo dữ liệu mẫu. DDL tham chiếu đầy đủ nằm ở README.md.

---

## 3. Frontend (`frontend/`)

### 3.1 Routing & phân quyền trang

`src/router/AppRouter.jsx` khai báo toàn bộ route bằng `react-router-dom`. Trang được nhóm theo đối tượng dùng dưới `src/pages/`: `public/`, `auth/`, `customer/`, `staff/`, `admin/`.

Mỗi route được bảo vệ bọc trong `src/router/PrivateRoute.jsx` với prop `allowedRoles`:
- Chưa đăng nhập → redirect `/login`.
- Đã đăng nhập nhưng `user.role` không nằm trong `allowedRoles` → redirect `/`.

Layout dùng chung: trang public/customer bọc trong `PageLayout` (có Navbar/Footer), trang staff/admin bọc trong `AdminLayout` (sidebar quản trị).

### 3.2 State management (Redux Toolkit)

Store tại `src/store/store.js`, gồm 2 slice chính:

- **`authSlice`**: `{ user, isAuthenticated }` — set sau khi login/`GET /api/auth/me`, dispatch `logout()` khi 401.
- **`bookingSlice`** (`src/store/bookingSlice.js`): quản lý trạng thái đặt vé đang thao tác dở — `selectedTrip`, `selectedSeats[]` (ghế đang chọn + tên/SĐT hành khách), `bookedSeats[]` (ghế đã có người đặt, fetch từ `GET /api/trips/:id/booked-seats`). Dùng xuyên suốt luồng trang chi tiết chuyến → chọn ghế → thanh toán (`TripDetail` → `BookTicket`).

### 3.3 API layer

Mỗi resource có 1 module Axios riêng dưới `src/api/` (`tripApi.js`, `invoiceApi.js`, ...), tất cả dựng trên `src/api/axiosInstance.js` — instance này set sẵn `withCredentials: true` (bắt buộc để cookie JWT được gửi kèm) và có **response interceptor xử lý 401 tập trung**: tự động `dispatch(logout())` + redirect `/login`. Vì vậy **không cần** xử lý 401 riêng lẻ ở từng lời gọi API.

### 3.4 UI & styling

- Component nền tảng từ shadcn/ui nằm ở `src/components/ui/` (sinh ra bằng `npx shadcn@latest add ...`, cấu hình `components.json`) — ưu tiên dùng lại thay vì tự viết component mới trùng chức năng.
- Component nghiệp vụ (domain) ở `src/components/features/`: `SeatMap.jsx` (vẽ sơ đồ ghế từ `vehicles.seat_layout` JSON kết hợp `bookedSeats[]`), `StatsChart.jsx` (biểu đồ Recharts), `TripCard.jsx`, `InvoiceStatus.jsx`.
- Chrome dùng chung (`Navbar`, `Footer`, `AdminLayout`, `PageLayout`) ở `src/components/common/`.
- Tailwind CSS v4 (qua Vite plugin, không có `tailwind.config.js`), dark mode toggle bằng class `dark` trên `<html>` (`src/hooks/useTheme.js`), lưu preference vào `localStorage`. Alias `@` trỏ tới `src/`.
- Form: `react-hook-form` + `zod` resolver. Animation: Framer Motion.

---

## 4. Danh sách API chính (tham khảo nhanh)

| Method | Endpoint | Quyền | Ghi chú |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Tạo tài khoản customer |
| POST | `/api/auth/login` | Public | Set cookie JWT |
| POST | `/api/auth/logout` | Đã login | Xóa cookie |
| GET | `/api/auth/me` | Đã login | Lấy thông tin user hiện tại |
| PUT | `/api/auth/profile`, `/api/auth/change-password` | Đã login | |
| GET | `/api/trips/search`, `/api/trips/:id`, `/api/trips/:id/booked-seats` | Public | Tìm chuyến, xem ghế đã đặt |
| GET/POST/PUT/DELETE | `/api/trips` | staff/admin xem, admin sửa | Quản lý chuyến xe |
| GET | `/api/routes`, `/api/routes/:id` | Public | Guest cũng tìm được tuyến |
| POST/PUT/DELETE | `/api/routes` | admin | |
| GET/POST/PUT/DELETE | `/api/vehicles` | staff xem, admin sửa | |
| POST | `/api/invoices` | customer/staff/admin | **Tạo hóa đơn + vé (transaction)** |
| GET | `/api/invoices/my` | customer | Lịch sử đặt vé của chính mình |
| GET | `/api/invoices` | staff/admin | Toàn bộ hóa đơn |
| DELETE | `/api/invoices/:id` | chủ hóa đơn/staff/admin | Hủy hóa đơn `pending`, trả ghế |
| PUT | `/api/invoices/:id/status` | staff/admin | Đổi `payment_status`, `refunded` → trả ghế |
| DELETE | `/api/tickets/:id` | customer/staff/admin | Hủy 1 vé |
| GET/POST/PUT/DELETE | `/api/users` | admin only | Quản lý người dùng, khóa/mở, đổi role |
| GET | `/api/stats`, `/api/stats/revenue` | staff/admin | Số liệu thống kê, doanh thu |

---

## 5. Những điểm cần lưu ý khi sửa code

1. **Không phá vỡ cặp transaction + `available_seats`** khi đụng vào flow đặt/hủy/hoàn tiền vé — đây là cơ chế chống overselling duy nhất.
2. Thông báo lỗi/thành công trả về cho người dùng đều bằng **tiếng Việt** — giữ nhất quán khi thêm endpoint mới.
3. Interceptor 401 đã tập trung ở `axiosInstance.js` — không thêm xử lý 401 riêng ở từng API call.
4. Ưu tiên dùng lại component shadcn/ui sẵn có trước khi tự viết mới.
5. JWT luôn nằm trong HttpOnly cookie — không lưu token vào localStorage/state ở frontend.
