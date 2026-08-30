# 🚌 Hệ Thống Quản Lý Bán Vé Xe Khách

Dự án web app quản lý bán vé xe khách với 4 vai trò: **Khách Vãng Lai**, **Khách Hàng**, **Nhân Viên (Staff)**, **Quản Trị Viên (Admin)**.

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
│   │   │   ├── userController.js
│   │   │   ├── invoiceController.js
│   │   │   ├── ticketController.js  # [MỚI] Tách riêng từ invoice
│   │   │   ├── routeController.js
│   │   │   ├── tripController.js
│   │   │   ├── tripTemplateController.js  # [MỚI] CRUD mẫu chuyến lặp lại + generate-now
│   │   │   ├── vehicleController.js
│   │   │   ├── statsController.js
│   │   │   └── paymentController.js # [MỚI] Tạo/xác thực thanh toán MoMo
│   │   ├── jobs/                # [MỚI] Tác vụ nền chạy bằng setInterval
│   │   │   ├── expireInvoices.js            # Tự hủy hóa đơn 'pending' quá hạn
│   │   │   └── generateTripsFromTemplates.js # Tự sinh Trip từ TripTemplate
│   │   ├── services/
│   │   │   └── momoService.js  # [MỚI] Ký request & xác thực chữ ký callback MoMo
│   │   ├── middlewares/
│   │   │   ├── auth.js         # JWT middleware (đọc từ HttpOnly Cookie)
│   │   │   ├── role.js         # Phân quyền theo role
│   │   │   └── validate.js     # [MỚI] Input validation (Joi)
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Invoice.js      # 1 lần thanh toán (1-N với Ticket)
│   │   │   ├── Ticket.js       # [MỚI] 1 ghế = 1 vé
│   │   │   ├── Route.js
│   │   │   ├── Trip.js
│   │   │   ├── TripTemplate.js # [MỚI] Mẫu chuyến lặp lại theo tuần
│   │   │   ├── Vehicle.js
│   │   │   └── index.js        # Đăng ký toàn bộ association
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── invoice.routes.js
│   │   │   ├── ticket.routes.js
│   │   │   ├── route.routes.js
│   │   │   ├── trip.routes.js
│   │   │   ├── tripTemplate.routes.js  # [MỚI] /api/trip-templates
│   │   │   ├── vehicle.routes.js
│   │   │   ├── stats.routes.js
│   │   │   └── payment.routes.js    # [MỚI] /api/payments/momo/*
│   │   ├── scripts/            # [MỚI] Script chạy tay qua npm run db:*
│   │   │   ├── syncDb.js       # Đồng bộ Sequelize models → MySQL
│   │   │   └── seedData.js     # Seed dữ liệu mẫu
│   │   ├── utils/
│   │   │   ├── joiSchemas.js   # [MỚI] Schema validate cho middlewares/validate.js
│   │   │   ├── pagination.js   # [MỚI] getPagination/buildPaginationMeta dùng chung
│   │   │   └── tripScheduling.js # [MỚI] findVehicleScheduleConflict dùng chung
│   │   └── app.js
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
    │   │   ├── ticketApi.js
    │   │   ├── tripApi.js
    │   │   ├── tripTemplateApi.js  # [MỚI] CRUD mẫu chuyến lặp lại + generateNow()
    │   │   ├── routeApi.js
    │   │   ├── vehicleApi.js
    │   │   ├── userApi.js
    │   │   ├── statsApi.js
    │   │   └── paymentApi.js   # [MỚI] Khởi tạo & xác thực thanh toán MoMo
    │   ├── components/
    │   │   ├── common/         # Navbar, Footer, AdminLayout, PageLayout...
    │   │   │   └── SmoothScrollProvider.jsx  # [MỚI] Lenis smooth-scroll + GSAP ScrollTrigger
    │   │   ├── ui/             # [shadcn/ui] Button, Input, Table, Badge, Dialog, Select...
    │   │   │   └── pagination.jsx  # [MỚI] Component phân trang dùng chung (tự viết, không phải shadcn)
    │   │   └── features/       # Feature-specific components
    │   │       ├── SeatMap.jsx         # Sơ đồ ghế tương tác
    │   │       ├── TripCard.jsx        # Card chuyến xe (Framer Motion)
    │   │       ├── InvoiceStatus.jsx   # Badge trạng thái hóa đơn
    │   │       ├── TripStatus.jsx      # [MỚI] Badge trạng thái chuyến xe
    │   │       ├── ActiveStatus.jsx    # [MỚI] Badge kích hoạt/vô hiệu hóa (user, route, vehicle...)
    │   │       ├── StatCard.jsx        # [MỚI] Thẻ KPI đếm số chạy (GSAP `useGSAP`)
    │   │       └── StatsChart.jsx      # Biểu đồ (Recharts)
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
    │   │   │   ├── ManageInvoice.jsx
    │   │   │   ├── Statistics.jsx
    │   │   │   ├── ViewTrips.jsx
    │   │   │   ├── ViewRoutes.jsx
    │   │   │   └── ViewVehicles.jsx
    │   │   └── admin/
    │   │       ├── Dashboard.jsx       # [MỚI] Tổng quan Admin
    │   │       ├── ManageUsers.jsx
    │   │       ├── ManageRoutes.jsx
    │   │       ├── ManageTrips.jsx
    │   │       ├── ManageTripTemplates.jsx  # [MỚI] Mẫu chuyến lặp lại + nút "Tạo Chuyến Ngay"
    │   │       └── ManageVehicles.jsx
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

## 🗄️ Database (MySQL)

Chạy lần lượt các lệnh SQL sau:

> **Lưu ý thiết kế DB:**
> - `invoices` = 1 lần thanh toán (có thể chứa nhiều vé).
> - `tickets` = 1 ghế cụ thể (quan hệ N-1 với `invoices`).
> - `UNIQUE(trip_id, active_seat_number)` ngăn chặn **double booking** ở tầng DB (chỉ áp dụng cho vé đang `booked`, vé `cancelled` có `active_seat_number = NULL` nên không chặn bán lại ghế).

```sql
CREATE DATABASE bus_ticket_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bus_ticket_db;

-- =============================================
-- BẢNG NGƯỜI DÙNG
-- =============================================
CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    full_name   VARCHAR(100)        NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    phone       VARCHAR(15),
    password    VARCHAR(255)        NOT NULL,
    role        ENUM('customer', 'staff', 'admin') DEFAULT 'customer',
    is_active   BOOLEAN             DEFAULT TRUE,
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- BẢNG TUYẾN XE
-- =============================================
CREATE TABLE routes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    origin          VARCHAR(100) NOT NULL,
    destination     VARCHAR(100) NOT NULL,
    distance_km     FLOAT,
    duration_min    INT,
    base_price      DECIMAL(10, 2) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BẢNG XE
-- =============================================
CREATE TABLE vehicles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    license_plate   VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type    ENUM('sleeper', 'limousine', 'standard') NOT NULL,
    total_seats     INT NOT NULL,
    seat_layout     JSON,               -- {"floors": 2, "rows": 5, "cols": [2, 1]}
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BẢNG MẪU CHUYẾN LẶP LẠI (sinh Trip tự động theo tuần)
-- =============================================
CREATE TABLE trip_templates (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    route_id               INT NOT NULL,
    vehicle_id             INT NOT NULL,
    departure_time_of_day  VARCHAR(5) NOT NULL,   -- "HH:mm"
    duration_minutes       INT,                    -- dùng tính arrival_time khi sinh Trip
    price                  DECIMAL(10, 2) NOT NULL,
    available_seats        INT NOT NULL,
    days_of_week           JSON NOT NULL,          -- [0..6] theo Date.getDay(), 0 = Chủ nhật
    is_active              BOOLEAN DEFAULT TRUE,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id)   REFERENCES routes(id)   ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- =============================================
-- BẢNG CHUYẾN XE
-- =============================================
CREATE TABLE trips (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    route_id        INT NOT NULL,
    vehicle_id      INT NOT NULL,
    departure_time  DATETIME NOT NULL,
    arrival_time    DATETIME,
    available_seats INT NOT NULL,
    price           DECIMAL(10, 2) NOT NULL,
    status          ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
    template_id     INT NULL,   -- không NULL nếu Trip này do trip_templates tự sinh ra
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id)   REFERENCES routes(id)   ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    -- Xóa template chỉ gỡ liên kết (template_id -> NULL), KHÔNG xóa Trip đã sinh
    -- (giữ nguyên vé/hóa đơn đã bán trên chuyến đó).
    FOREIGN KEY (template_id) REFERENCES trip_templates(id) ON DELETE SET NULL
);

-- =============================================
-- BẢNG HÓA ĐƠN (1 lần thanh toán)
-- =============================================
CREATE TABLE invoices (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    total_price     DECIMAL(10, 2) NOT NULL,
    payment_method  ENUM('cash', 'momo') DEFAULT 'cash',
    payment_status  ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- BẢNG VÉ (1 ghế = 1 vé, thuộc về 1 hóa đơn)
-- =============================================
CREATE TABLE tickets (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id      INT NOT NULL,
    trip_id         INT NOT NULL,
    seat_number     INT NOT NULL,
    active_seat_number INT NULL,  -- = seat_number khi booking_status='booked', NULL khi 'cancelled'
    passenger_name  VARCHAR(100)    NOT NULL,   -- Tên hành khách thực tế
    passenger_phone VARCHAR(15)     NOT NULL,   -- SDT hành khách
    ticket_price    DECIMAL(10, 2)  NOT NULL,
    booking_status  ENUM('booked', 'cancelled') DEFAULT 'booked',
    cancelled_at    TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id)    REFERENCES trips(id)    ON DELETE CASCADE,
    -- Chống double booking, chỉ tính vé đang 'booked': MySQL cho phép nhiều NULL
    -- trong UNIQUE KEY nên vé đã hủy (active_seat_number=NULL) không chặn bán lại ghế.
    UNIQUE KEY uq_trip_active_seat (trip_id, active_seat_number)
);

-- =============================================
-- INDEX GỢI Ý (TỐI ƯU QUERY)
-- =============================================
CREATE INDEX idx_trips_route        ON trips(route_id);
CREATE INDEX idx_trips_departure    ON trips(departure_time);
CREATE INDEX idx_tickets_invoice    ON tickets(invoice_id);
CREATE INDEX idx_tickets_trip       ON tickets(trip_id);
CREATE INDEX idx_invoices_user      ON invoices(user_id);
```

---

## ⚙️ Backend (Node.js + Express)

### Cài đặt

```bash
cd backend
npm install express mysql2 sequelize dotenv bcryptjs jsonwebtoken cors morgan cookie-parser joi
npm install --save-dev nodemon
```

### Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | `nodemon server.js` — chạy dev server (mặc định port `8080`) |
| `npm start` | `node server.js` — chạy production |
| `npm run db:sync` | Đồng bộ Sequelize models → MySQL (`src/scripts/syncDb.js`) |
| `npm run db:seed` | Seed dữ liệu mẫu (`src/scripts/seedData.js`) |

### `.env`

```env
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bus_ticket_db
DB_USER=root
DB_PASS=yourpassword
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Số phút giữ ghế tối đa cho hóa đơn 'pending' trước khi bị tự động hủy (mặc định: 30)
PENDING_INVOICE_TTL_MINUTES=30

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

#### 🎫 Invoices & Tickets

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/api/invoices` | Tạo hóa đơn + đặt nhiều vé (Transaction) | Customer/Staff/Admin |
| GET | `/api/invoices/my` | Lịch sử hóa đơn của tôi | Customer |
| GET | `/api/invoices/:id` | [MỚI] Chi tiết một hóa đơn | Chủ hóa đơn/Staff/Admin |
| DELETE | `/api/invoices/:id` | Hủy toàn bộ hóa đơn | Customer/Staff/Admin |
| DELETE | `/api/tickets/:id` | [MỚI] Hủy từng vé riêng lẻ | Customer/Staff/Admin |

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
| PUT | `/api/users/:id/role` | Phân quyền | Admin |
| PUT | `/api/users/:id/status` | [MỚI] Kích hoạt / Vô hiệu hóa tài khoản | Admin |
| DELETE | `/api/users/:id` | Xóa người dùng | Admin |

#### 🛣️ Routes (Staff/Admin)

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/routes` | Danh sách tuyến xe | Staff/Admin |
| GET | `/api/routes/:id` | [MỚI] Chi tiết tuyến xe (dùng cho Form sửa) | Staff/Admin |
| POST | `/api/routes` | Thêm tuyến xe | Admin |
| PUT | `/api/routes/:id` | Sửa tuyến xe | Admin |
| DELETE | `/api/routes/:id` | Xóa tuyến xe | Admin |

#### 🚌 Trips Management (Admin)

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/trips` | Danh sách chuyến xe | Staff/Admin |
| POST | `/api/trips` | Thêm chuyến xe | Admin |
| PUT | `/api/trips/:id` | Sửa chuyến xe | Admin |
| DELETE | `/api/trips/:id` | Xóa chuyến xe | Admin |

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
| POST | `/api/trip-templates` | Tạo mẫu chuyến mới | Admin |
| PUT | `/api/trip-templates/:id` | Sửa mẫu chuyến (chỉ ảnh hưởng lần sinh Trip *sau này*) | Admin |
| DELETE | `/api/trip-templates/:id` | Xóa mẫu (Trip đã sinh vẫn giữ nguyên, chỉ gỡ liên kết `template_id`) | Admin |
| POST | `/api/trip-templates/generate-now` | Ép chạy ngay job sinh Trip từ toàn bộ mẫu đang active | Admin |

> 📄 **Phân trang & tìm kiếm server-side:** mọi endpoint `getAll` liệt kê ở trên (`routes`, `vehicles`, `users`, `trips`/`search`, `invoices`/`my`, `trip-templates`) đều nhận thêm query params tùy chọn `page`, `limit` (và `search`, `status`, `role` tùy resource). **Không** truyền `page` → trả về mảng thô như cũ (dùng cho dropdown chọn Route/Vehicle...); có `page` → trả về `{ data, pagination: { page, limit, total, totalPages } }`. Xem `backend/src/utils/pagination.js`.

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

| Trang | Khách Vãng Lai | Khách Hàng | Nhân Viên | Quản Trị |
|-------|:-:|:-:|:-:|:-:|
| Trang chủ & Tìm kiếm chuyến xe | ✅ | ✅ | ✅ | ✅ |
| Chi tiết chuyến xe (xem) | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / Đăng nhập | ✅ | ✅ | ✅ | ✅ |
| Đặt vé & Chọn ghế (Nhân viên có thêm chức năng đặt hộ khách) | ❌ | ✅ | ✅ | ❌ |
| Hủy vé / Hủy hóa đơn | ❌ | ✅ | ✅ | ✅ |
| Xem lịch sử hóa đơn (của tôi) | ❌ | ✅ | ❌ | ❌ |
| Cập nhật thông tin cá nhân | ❌ | ✅ | ✅ | ✅ |
| Quản lý hóa đơn & Hủy vé hộ khách | ❌ | ❌ | ✅ | ✅ |
| Cập nhật trạng thái hóa đơn | ❌ | ❌ | ✅ | ✅ |
| Xem danh sách & sơ đồ ghế chuyến xe | ❌ | ❌ | ✅ | ✅ |
| Tra cứu tuyến xe / xe khách (Read-only) | ❌ | ❌ | ✅ | ✅ |
| Thống kê & Báo cáo | ❌ | ❌ | ✅ | ✅ |
| Quản lý tuyến xe / chuyến xe / xe (CRUD) | ❌ | ❌ | ❌ | ✅ |
| Quản lý mẫu chuyến lặp lại (Trip Templates) | ❌ | ❌ | ❌ | ✅ |
| Quản lý người dùng & phân quyền | ❌ | ❌ | ❌ | ✅ |
| Dashboard Admin | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 Chạy Dự Án

```bash
# Backend
cd backend
npm run dev       # nodemon server.js

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
| Hủy vé sát giờ | Khách tự hủy (`role='customer'`) bị chặn nếu còn dưới `CANCELLATION_CUTOFF_HOURS` (24h) trước giờ khởi hành; Staff/Admin hủy hộ thì bỏ qua ràng buộc này |
| Mất dữ liệu tài chính khi xóa | Xóa Trip/Route/Vehicle/User có Ticket/Trip/Invoice phụ thuộc bị chặn (400, gợi ý vô hiệu hóa thay vì xóa) dù association là `onDelete: 'CASCADE'` |
| Race condition | **Database Transaction** khi tạo invoice + tickets đồng thời |
| CORS | Chỉ cho phép request từ `CLIENT_URL` trong `.env` |
| Role guard | `PrivateRoute.jsx` (FE) + `role.js` middleware (BE) |
| Payment callback forgery | Mọi kết quả thanh toán MoMo (IPN lẫn redirect) đều được xác thực chữ ký HMAC-SHA256 (`momoService.verifySignature`) trước khi cập nhật `payment_status` |

> `role` trong JWT payload dùng để phân quyền. Backend bắt lỗi `SequelizeUniqueConstraintError` trả về thông báo "Ghế đã được đặt" thân thiện cho người dùng.

---

## 📌 Ghi Chú Quan Trọng

- **Đặt nhiều ghế:** Một request `POST /api/invoices` nhận mảng `tickets[]`, xử lý trong một DB Transaction duy nhất.
- **Sơ đồ ghế:** Component `SeatMap.jsx` nhận `totalSeats`, `layout` (từ `vehicles.seat_layout` JSON) và `bookedSeats[]` (từ API `GET /api/trips/:id/booked-seats`).
- **Framer Motion:** Dùng cho page transition, stagger list trên trang kết quả tìm kiếm, và modal animation.
- **Thanh toán MoMo (sandbox):** Khi khách chọn phương thức `momo` lúc đặt vé, hóa đơn vẫn được tạo `pending` như bình thường (không đổi transaction đặt vé), sau đó FE gọi `POST /api/payments/momo/create/:invoiceId` để lấy `payUrl` và redirect sang trang thanh toán MoMo test. `orderId` gửi cho MoMo mã hóa sẵn id hóa đơn (`INV{id}-{timestamp}`) nên không cần thêm cột DB để tra ngược. Kết quả được xác nhận qua **cả hai** đường: IPN (`/momo/ipn`, cần domain public/ngrok để chạy được ở local) và xác thực chữ ký ngay tại trang redirect (`/momo/verify-return`, hoạt động được trên `localhost` vì trình duyệt gọi thẳng backend của mình) — cả hai dùng chung logic idempotent để đánh dấu hóa đơn `paid`. Nếu tạo `payUrl` thất bại hoặc thanh toán chưa xong, khách có thể bấm lại nút "Thanh toán MoMo" ở trang Lịch sử hóa đơn.
- **Mẫu chuyến lặp lại (Trip Templates):** Thay vì tạo tay từng `Trip` mỗi ngày, Admin định nghĩa `TripTemplate` (tuyến, xe, giờ khởi hành "HH:mm", các thứ trong tuần lặp lại) tại `/admin/trip-templates`. Job nền `generateTripsFromTemplates.js` tự sinh `Trip` thật cho cửa sổ `TRIP_TEMPLATE_ADVANCE_DAYS` ngày tới (chạy ngay khi server khởi động, rồi lặp lại mỗi `TRIP_TEMPLATE_CHECK_INTERVAL_MS`), bỏ qua các trường hợp đã tồn tại, trùng lịch xe, hoặc tuyến/xe đã bị vô hiệu hóa. Nút "Tạo Chuyến Ngay" gọi `POST /api/trip-templates/generate-now` để ép chạy thủ công. Xóa một template chỉ gỡ liên kết (`Trip.template_id → NULL`), **không** xóa các Trip đã sinh ra từ nó.
- **Hủy chuyến xe (cascade):** Khi Admin đổi `status` của một Trip thành `cancelled`, toàn bộ vé `booked` trên chuyến đó tự động bị hủy, và mỗi hóa đơn liên quan được: giảm trừ (nếu còn vé ở chuyến khác), chuyển `refunded` (nếu đã `paid` và không còn vé nào active), hoặc xóa hẳn (nếu vẫn `pending`, chưa thu tiền).
- **Xuất báo cáo CSV:** Nút "Xuất báo cáo" ở `staff/Statistics.jsx` dùng `exportToCsv()` (`frontend/src/lib/utils.js`) — tự thêm BOM UTF-8 + khai báo `sep=,` (để Excel bản tiếng Việt không tự đổi thành `;`) và tự đóng ngoặc kép các ô dạng ngày `dd-MM`/`dd/MM` để Excel không hiểu nhầm thành định dạng ngày kiểu Mỹ.
- **Smooth scroll & scroll animation:** Toàn app được bọc trong `SmoothScrollProvider.jsx` (Lenis) để cuộn mượt trang public/customer; tự tắt trên các route `/admin` và `/staff` (vì `AdminLayout` tự cuộn nội bộ) và tự tắt hoàn toàn nếu trình duyệt bật `prefers-reduced-motion`. `StatCard.jsx` (Dashboard, Statistics) dùng GSAP để chạy hiệu ứng đếm số KPI.
- **"Tuyến đường phổ biến" ở trang chủ:** Danh sách 3 thành phố × 3 điểm đến hiển thị ở `Home.jsx` lấy từ mảng `FEATURED_CITIES` viết cứng trong code (khớp theo đúng chuỗi điểm đi/điểm đến với các `Route` đã tải) — **không** dựa trên số liệu đặt vé thực tế và **không** có UI cấu hình cho Admin; muốn đổi tuyến nổi bật phải sửa trực tiếp mảng này.
- **shadcn/ui components đã cài (`frontend/src/components/ui/`):**

```bash
npx shadcn@latest add button input label form-field table badge card
npx shadcn@latest add dialog alert-dialog dropdown-menu select tabs switch
npx shadcn@latest add avatar skeleton sonner
```
`pagination.jsx` trong cùng thư mục là component tự viết (không phải shadcn) — xem ghi chú cấu trúc dự án phía trên.


## 🎨 PRD Thiết Kế Frontend

### Màn hình cần xây dựng

#### Luồng Khách Hàng (Guest & Customer)
- **Home & Search:** Form tìm kiếm (Điểm đi, Điểm đến, Ngày đi, Số hành khách). Danh sách chuyến xe dạng card với Framer Motion stagger animation.
- **Trip Detail & Booking:** Sơ đồ ghế tương tác (`SeatMap.jsx`), form thông tin hành khách (react-hook-form + Zod), tóm tắt đơn hàng.
- **Login / Register:** Form xác thực với validation inline.
- **Invoice History:** Bảng hóa đơn với filter trạng thái, nút hủy vé.
- **Profile:** Form cập nhật thông tin và đổi mật khẩu.

#### Luồng Nhân Viên (Staff)
- **Manage Invoices:** Bảng hóa đơn toàn hệ thống, filter đa chiều, cập nhật trạng thái thanh toán, hủy hóa đơn hoặc hủy vé riêng lẻ thay cho khách, tìm kiếm nâng cao theo tên/SĐT hành khách.
- **View Trips:** Xem danh sách chuyến xe và sơ đồ ghế tương tác của từng chuyến (ghế trống/đã đặt) để nắm bắt thông tin và hỗ trợ hành khách.
- **View Routes & Vehicles:** [MỚI] Tra cứu nhanh danh sách các tuyến đường vận chuyển và danh sách phương tiện xe khách hiện có trong hệ thống (chế độ Read-only).
- **Book Ticket (At counter):** [MỚI] Đặt vé và chọn ghế trực tiếp tại quầy hoặc qua điện thoại thay cho khách hàng — dùng chung trang `customer/BookTicket.jsx` (route `/customer/book` cho phép cả `customer`/`staff`/`admin`), không phải trang riêng.
- **Statistics:** Biểu đồ doanh thu bằng Recharts (Line chart theo ngày, Bar chart theo tháng), thẻ KPI đếm số (GSAP) và nút xuất báo cáo CSV.

#### Luồng Quản Trị (Admin)
- **Dashboard:** Widget thống kê nhanh (tổng vé hôm nay, doanh thu tháng, chuyến đang chạy), biểu đồ mini, thẻ KPI đếm số (GSAP).
- **Manage Routes:** CRUD tuyến đường với Dialog + Form shadcn/ui.
- **Manage Trips:** CRUD chuyến xe, gán xe + tuyến.
- **Manage Trip Templates:** [MỚI] CRUD mẫu chuyến lặp lại theo tuần (`route`, `vehicle`, giờ khởi hành, các thứ trong tuần) + nút "Tạo Chuyến Ngay" ép chạy job sinh Trip.
- **Manage Vehicles:** CRUD phương tiện, cấu hình sơ đồ ghế (JSON).
- **Manage Users:** Bảng người dùng, đổi role bằng Select, toggle trạng thái bằng Switch.

### Phong Cách Thiết Kế
- **Màu sắc:** `--primary` Xanh dương `#3B82F6` (tin cậy) + `--accent` Cam `#F97316` (CTA đặt vé).
- **Typography:** Font `Inter` (Google Fonts) — Sans-serif hiện đại.
- **Dark Mode:** Hỗ trợ đầy đủ qua CSS Variables của shadcn/ui.
- **Animation:** Framer Motion — page transitions, stagger list, modal scale-in.
- **Layout:** Mobile-first responsive. Sidebar collapsible cho Admin/Staff dùng shadcn `Sheet`.

### Redux State Shape

```js
// authSlice
{ user: { id, fullName, email, role }, isAuthenticated: false }

// bookingSlice
{
  selectedTrip: null,         // Object chuyến xe đã chọn
  selectedSeats: [],          // [{ seatNumber, passengerName, passengerPhone }]
  bookedSeats: [],            // Ghế đã đặt (fetch từ API)
}
```