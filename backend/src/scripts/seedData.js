const {
  User,
  Route,
  Vehicle,
  Trip,
  Invoice,
  Ticket,
  TripTemplate,
  TicketPrint,
  TripIncident,
  DriverUnavailability,
} = require("../models");
const { Op } = require("sequelize");
const { toVNDateString } = require("../utils/dateVN");
const { sequelize } = require("../config/db");
const {
  generateTripsFromTemplates,
} = require("../jobs/generateTripsFromTemplates");
const { seedDrivers } = require("./seedDrivers");
const { migrator } = require("../db/migrator");
const { assertDestructiveAllowed } = require("../db/safety");

/**
 * ============================================================================
 * KẾ HOẠCH KHAI THÁC (dùng để tính số chuyến/ngày và số xe cần thiết)
 * ============================================================================
 * Phạm vi: chỉ khai thác khu vực miền Nam – Nam Trung Bộ – Tây Nguyên
 * (TP.HCM / Đà Lạt / Đà Nẵng / Nha Trang / Cần Thơ / Long Xuyên).
 * Các tuyến miền Bắc (Hà Nội – Hải Phòng, Hà Nội – Sa Pa) đã được gỡ bỏ.
 *
 * Nguyên tắc:
 *  - 1 xe chỉ chạy 1 chuyến tại 1 thời điểm (generateTripsFromTemplates sẽ
 *    bỏ qua template nếu trùng lịch xe).
 *  - Tuyến <= 8h/lượt  -> 1 xe quay đầu trong ngày (đi + về), nghỉ >= 6h.
 *  - Tuyến >  8h/lượt  -> 1 xe chỉ chạy 1 lượt/ngày, hôm sau chạy lượt ngược
 *    lại. Vì 1 tuần có 7 ngày (số lẻ) nên 2 xe luân phiên KHÔNG thể phủ hết
 *    7 ngày cho cả 2 chiều -> cần 3 xe: 2 xe chạy vòng chính (T2..T7) + 1 xe
 *    "vòng C" gánh CN/T2 rồi nằm bãi chờ tuần sau.
 *
 *  Tuyến (2 chiều)          | 1 lượt | chuyến/ngày | xe
 *  -------------------------|--------|-------------|----
 *  TP.HCM <-> Đà Lạt        |   8h   |      6      | 3
 *  TP.HCM <-> Cần Thơ       | 5h13   |      4      | 2
 *  TP.HCM <-> Long Xuyên    | 4h27   |      4      | 2
 *  Đà Nẵng <-> Nha Trang    |  10h   |      4      | 2
 *  Đà Lạt <-> Đà Nẵng       |  14h   |      2      | 3
 *  Đà Lạt <-> Cần Thơ       |  11h   |      2      | 3
 *  Đà Nẵng <-> TP.HCM       |  20h   |      2      | 3
 *  -------------------------|--------|-------------|----
 *  TỔNG (9 tuyến phổ biến)  |        |   24/ngày   | 18
 *
 *  Cộng thêm 4 xe tăng cường cho các chuyến demo tạo tay trong tripMatrix
 *  (TP.HCM -> Đà Lạt, TP.HCM -> Nha Trang) => tổng đội xe 22 chiếc.
 *
 *  TÀI XẾ (seedDrivers.js): 2 tài xế/xe => 44 tài khoản. Mọi chuyến của xe:
 *  tài xế 1 = tài xế chính, tài xế 2 = tài xế phụ (cùng đi theo xe nên lịch
 *  không bao giờ chồng giờ).
 *
 *  Dữ liệu sinh ra phủ đủ màn hình của mọi role:
 *   - 21 ngày lịch sử chạy (completed + ongoing hôm nay) có giờ chạy thực tế,
 *     vé đã bán và điểm danh  → lịch sử/thống kê tài xế, doanh thu, đối soát.
 *   - Chuyến 14 ngày tới (từ mẫu) + vé cho 3 ngày tới → lịch tuần, danh sách khách.
 *   - Lịch nghỉ tài xế, sự cố đã/chưa xử lý, hóa đơn pending/hủy lẻ/hoàn tiền.
 * ============================================================================
 */

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // 0 = CN, 1 = T2, ... 6 = T7 (theo Date.getDay())

const seedData = async () => {
  try {
    console.log("🌱 Đang nạp dữ liệu mẫu (seeding)...");

    // 1. Clear database tables first in order of dependencies
    await TripIncident.destroy({ where: {} });
    await DriverUnavailability.destroy({ where: {} });
    await TicketPrint.destroy({ where: {} });
    await Ticket.destroy({ where: {} });
    await Invoice.destroy({ where: {} });
    await Trip.destroy({ where: {} });
    await TripTemplate.destroy({ where: {} });
    await Route.destroy({ where: {} });
    await Vehicle.destroy({ where: {} });
    await User.destroy({ where: {} });

    // 2. Create Users (passwords will be hashed via beforeSave hook)
    const users = await User.bulkCreate(
      [
        {
          full_name: "Quản Trị Viên",
          email: "admin@datvexekhach.vn",
          phone: "0987654321",
          password: "password",
          role: "admin",
          is_active: true,
        },
        {
          full_name: "Nhân Viên Điều Phối",
          email: "staff@datvexekhach.vn",
          phone: "0987654322",
          password: "password",
          role: "staff",
          is_active: true,
        },
        {
          full_name: "Khách Hàng Thân Thiết",
          email: "customer@datvexekhach.vn",
          phone: "0987654323",
          password: "password",
          role: "customer",
          is_active: true,
        },
        // Thêm vài khách để hóa đơn/vé mẫu đa dạng chủ sở hữu
        ...[
          ["Trần Minh Khoa", "khoa"],
          ["Lê Thị Thu Hà", "thuha"],
          ["Phạm Quốc Bảo", "quocbao"],
          ["Võ Ngọc Anh", "ngocanh"],
        ].map(([full_name, slug], i) => ({
          full_name,
          email: `${slug}@khachhang.vn`,
          phone: `09876543${30 + i}`,
          password: "password",
          role: "customer",
          is_active: true,
        })),
      ],
      { individualHooks: true },
    ); // individualHooks triggers beforeSave hook on bulkCreate

    console.log(`   - Đã nạp ${users.length} tài khoản người dùng (admin, staff, ${users.length - 2} khách hàng). Tài xế tạo ở mục 6.`);

    // 3. Create Routes
    //    routes[0..9]  : tuyến chính (9 tuyến phổ biến ở Home.jsx + TP.HCM - Nha Trang)
    //    routes[10..14]: tuyến chiều về, để xe có đường quay đầu thay vì chạy
    //                    một chiều rồi "biến mất" ở tỉnh khác.
    //    tripMatrix và sampleBookings bên dưới tham chiếu theo index -> giữ nguyên thứ tự.
    const routes = await Route.bulkCreate([
      {
        // [0]
        origin: "Tp Hồ Chí Minh",
        destination: "Đà Lạt",
        distance_km: 310,
        duration_min: 480,
        base_price: 290000,
        is_active: true,
      },
      {
        // [1] — dùng 'Tp Hồ Chí Minh' (không phải 'Sài Gòn') để thống nhất tên
        // thành phố với FEATURED_CITIES, nếu không tìm kiếm theo thành phố sẽ lệch.
        origin: "Tp Hồ Chí Minh",
        destination: "Nha Trang",
        distance_km: 430,
        duration_min: 480,
        base_price: 400000,
        is_active: true,
      },
      {
        // [2]
        origin: "Tp Hồ Chí Minh",
        destination: "Cần Thơ",
        distance_km: 172,
        duration_min: 313,
        base_price: 165000,
        is_active: true,
      },
      {
        // [3]
        origin: "Tp Hồ Chí Minh",
        destination: "Long Xuyên",
        distance_km: 209,
        duration_min: 267,
        base_price: 200000,
        is_active: true,
      },
      {
        // [4]
        origin: "Đà Lạt",
        destination: "Tp Hồ Chí Minh",
        distance_km: 305,
        duration_min: 480,
        base_price: 290000,
        is_active: true,
      },
      {
        // [5]
        origin: "Đà Lạt",
        destination: "Đà Nẵng",
        distance_km: 700,
        duration_min: 840,
        base_price: 430000,
        is_active: true,
      },
      {
        // [6]
        origin: "Đà Lạt",
        destination: "Cần Thơ",
        distance_km: 464,
        duration_min: 660,
        base_price: 445000,
        is_active: true,
      },
      {
        // [7]
        origin: "Đà Nẵng",
        destination: "Đà Lạt",
        distance_km: 700,
        duration_min: 840,
        base_price: 290000,
        is_active: true,
      },
      {
        // [8]
        origin: "Đà Nẵng",
        destination: "Tp Hồ Chí Minh",
        distance_km: 990,
        duration_min: 1200,
        base_price: 430000,
        is_active: true,
      },
      {
        // [9]
        origin: "Đà Nẵng",
        destination: "Nha Trang",
        distance_km: 550,
        duration_min: 600,
        base_price: 445000,
        is_active: true,
      },
      // ==== Chiều về (index 10..14) ====
      {
        // [10]
        origin: "Cần Thơ",
        destination: "Tp Hồ Chí Minh",
        distance_km: 172,
        duration_min: 313,
        base_price: 165000,
        is_active: true,
      },
      {
        // [11]
        origin: "Long Xuyên",
        destination: "Tp Hồ Chí Minh",
        distance_km: 209,
        duration_min: 267,
        base_price: 200000,
        is_active: true,
      },
      {
        // [12]
        origin: "Nha Trang",
        destination: "Đà Nẵng",
        distance_km: 550,
        duration_min: 600,
        base_price: 445000,
        is_active: true,
      },
      {
        // [13]
        origin: "Cần Thơ",
        destination: "Đà Lạt",
        distance_km: 464,
        duration_min: 660,
        base_price: 445000,
        is_active: true,
      },
      {
        // [14]
        origin: "Tp Hồ Chí Minh",
        destination: "Đà Nẵng",
        distance_km: 990,
        duration_min: 1200,
        base_price: 430000,
        is_active: true,
      },
    ]);

    // Bến xuất phát + xe trung chuyển: tuyến có index chẵn bật trung chuyển (md/DonKhachTrungChuyen.md).
    for (const [index, route] of routes.entries()) {
      await route.update({
        origin_station: `Bến xe ${route.origin} — văn phòng nhà xe, ${route.origin}`,
        shuttle_enabled: index % 2 === 0,
        shuttle_area_note: index % 2 === 0 ? `Nội thành ${route.origin} (bán kính ~15 km)` : null,
      });
    }
    const shuttleRouteIds = new Set(routes.filter((r) => r.shuttle_enabled).map((r) => r.id));
    const SHUTTLE_ADDRESSES = [
      "12 Nguyễn Huệ, Quận 1", "45 Lê Văn Sỹ, Quận 3", "88 Cách Mạng Tháng 8, Quận 10",
      "230 Điện Biên Phủ, Bình Thạnh", "17 Phan Xích Long, Phú Nhuận", "5 Hoàng Văn Thụ, Tân Bình",
    ];
    console.log(`   - Đã nạp ${routes.length} tuyến đường vận chuyển.`);

    // 4. Create Vehicles
    //    Biển số theo đúng vùng khai thác (51 TP.HCM, 43 Đà Nẵng, 49 Lâm Đồng,
    //    65 Cần Thơ, 67 An Giang, 79 Khánh Hòa) để dữ liệu "đọc được" khi demo.
    //    Index 0..3 dành cho tripMatrix, 4..21 là đội xe chạy TripTemplate.
    const vehicles = await Vehicle.bulkCreate([
      // ---- Xe tăng cường cho các chuyến demo trong tripMatrix ----
      {
        license_plate: "51B-12345",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [0] TP.HCM -> Đà Lạt (tăng cường đêm)
      {
        license_plate: "51B-23456",
        vehicle_type: "limousine",
        total_seats: 9,
        seat_layout: { floors: 1, rows: 3, cols: 3 },
        is_active: true,
      }, // [1] TP.HCM -> Đà Lạt (limousine)
      {
        license_plate: "51B-34567",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [2] TP.HCM -> Nha Trang (đêm)
      {
        license_plate: "51B-45678",
        vehicle_type: "standard",
        total_seats: 40,
        seat_layout: { floors: 1, rows: 10, cols: 4 },
        is_active: true,
      }, // [3] TP.HCM -> Nha Trang (ghế ngồi)

      // ---- TP.HCM <-> Đà Lạt: 3 xe, mỗi xe 1 vòng đi–về/ngày ----
      {
        license_plate: "51B-11111",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [4] ca sáng
      {
        license_plate: "51B-22222",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [5] ca chiều
      {
        license_plate: "51B-33333",
        vehicle_type: "limousine",
        total_seats: 9,
        seat_layout: { floors: 1, rows: 3, cols: 3 },
        is_active: true,
      }, // [6] ca đêm (limousine)

      // ---- TP.HCM <-> Cần Thơ: 2 xe ----
      {
        license_plate: "51B-44444",
        vehicle_type: "standard",
        total_seats: 40,
        seat_layout: { floors: 1, rows: 10, cols: 4 },
        is_active: true,
      }, // [7] ca sáng
      {
        license_plate: "65B-11111",
        vehicle_type: "standard",
        total_seats: 40,
        seat_layout: { floors: 1, rows: 10, cols: 4 },
        is_active: true,
      }, // [8] ca trưa

      // ---- TP.HCM <-> Long Xuyên: 2 xe ----
      {
        license_plate: "51B-66666",
        vehicle_type: "standard",
        total_seats: 40,
        seat_layout: { floors: 1, rows: 10, cols: 4 },
        is_active: true,
      }, // [9]  ca sáng
      {
        license_plate: "67B-11111",
        vehicle_type: "standard",
        total_seats: 40,
        seat_layout: { floors: 1, rows: 10, cols: 4 },
        is_active: true,
      }, // [10] ca chiều

      // ---- Đà Nẵng <-> Nha Trang: 2 xe ----
      {
        license_plate: "43B-11111",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [11] ca ngày
      {
        license_plate: "79B-11111",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [12] ca đêm

      // ---- Đà Lạt <-> Đà Nẵng (14h/lượt): 3 xe luân phiên ----
      {
        license_plate: "49B-11111",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [13] vòng A
      {
        license_plate: "43B-22222",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [14] vòng B
      {
        license_plate: "49B-22222",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [15] vòng C (CN–T2)

      // ---- Đà Lạt <-> Cần Thơ (11h/lượt): 3 xe luân phiên ----
      {
        license_plate: "49B-33333",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [16] vòng A
      {
        license_plate: "65B-22222",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [17] vòng B
      {
        license_plate: "49B-44444",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [18] vòng C (CN–T2)

      // ---- Đà Nẵng <-> TP.HCM (20h/lượt): 3 xe luân phiên ----
      {
        license_plate: "43B-33333",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [19] vòng A
      {
        license_plate: "51B-77777",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [20] vòng B
      {
        license_plate: "43B-44444",
        vehicle_type: "sleeper",
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      }, // [21] vòng C (CN–T2)
    ]);

    console.log(`   - Đã nạp ${vehicles.length} phương tiện xe khách.`);

    // Helper to add days to current date
    const getFutureDate = (days, hoursOffset) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(hoursOffset, 0, 0, 0);
      return d;
    };

    // RNG cố định (mulberry32) — mỗi lần seed ra cùng một bộ dữ liệu "ngẫu nhiên",
    // tiện so sánh khi demo/debug.
    let rngState = 20261008;
    const rand = () => {
      rngState |= 0;
      rngState = (rngState + 0x6d2b79f5) | 0;
      let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
    const pick = (list) => list[Math.floor(rand() * list.length)];
    const minutes = (n) => n * 60 * 1000;

    // 5. Chuyến tăng cường tạo tay (luôn có chuyến "hôm nay" để demo đặt vé).
    const trips = [];
    const tripVehicles = []; // parallel array: vehicle used by trips[i], for seat-count bookkeeping below

    // Map: [routeIndex, vehicleIndex, daysAhead, hourDeparture, hourArrival, priceMultiplier]
    // Thứ tự các dòng KHÔNG được đổi: sampleBookings ở mục 9 tham chiếu theo
    // index (0, 1, 4, 5, 6).
    const tripMatrix = [
      // TP.HCM - Đà Lạt (51B-12345 giường nằm, 51B-23456 limousine)
      [0, 0, 0, 23, 5, 1.1], // [0] Today 23:00 (sleeper)
      [0, 0, 1, 23, 5, 1.1], // [1] Tomorrow 23:00 (sleeper)
      [0, 1, 2, 8, 14, 1.4], // [2] Day 2 08:00 (limousine)
      [0, 0, 3, 23, 5, 1.1], // [3] Day 3 23:00 (sleeper)

      // TP.HCM - Nha Trang (51B-34567 giường nằm, 51B-45678 ghế ngồi)
      [1, 2, 0, 21, 5, 1.1], // [4] Today 21:00 (sleeper)
      [1, 2, 1, 21, 5, 1.1], // [5] Tomorrow 21:00 (sleeper)
      [1, 3, 2, 7, 15, 1.0], // [6] Day 2 07:00 (standard)
      [1, 2, 3, 21, 5, 1.1], // [7] Day 3 21:00 (sleeper)
    ];

    for (const item of tripMatrix) {
      const [rIdx, vIdx, days, depHour, arrHour, priceMul] = item;
      const r = routes[rIdx];
      const v = vehicles[vIdx];

      // Chuyến qua đêm (giờ đến <= giờ đi) phải cộng thêm 1 ngày, nếu không
      // arrival_time sẽ nằm TRƯỚC departure_time (VD: đi 23:00 - đến 05:00).
      const arrivalDays = arrHour <= depHour ? days + 1 : days;

      trips.push({
        route_id: r.id,
        vehicle_id: v.id,
        departure_time: getFutureDate(days, depHour),
        arrival_time: getFutureDate(arrivalDays, arrHour),
        price: Number(r.base_price) * priceMul,
        available_seats: v.total_seats,
        status: "scheduled",
      });
      tripVehicles.push(v);
    }

    const createdTrips = await Trip.bulkCreate(trips);
    console.log(`   - Đã nạp ${trips.length} chuyến xe tăng cường sắp chạy.`);

    // 5a. TripTemplates cho 9 tuyến phổ biến (TP.HCM / Đà Lạt / Đà Nẵng).
    // days_of_week theo Date.getDay(): 0 = CN, 1 = T2, ..., 6 = T7.
    // Lịch dưới đây đã được kiểm tra tay 3 điều kiện:
    //   (a) 1 xe không có 2 chuyến chồng giờ nhau,
    //   (b) xe luôn xuất phát từ đúng thành phố nó đang đứng,
    //   (c) vòng quay của mỗi xe khép kín sau 1 tuần.
    // Tài xế KHÔNG khai báo ở đây — seedDrivers() (mục 6) gán tài xế 1 làm
    // tài xế chính, tài xế 2 làm tài xế phụ cho mọi mẫu của xe.
    const T = (
      routeIdx,
      vehicleIdx,
      timeOfDay,
      days = ALL_DAYS,
      priceMul = 1,
    ) => {
      const r = routes[routeIdx];
      const v = vehicles[vehicleIdx];
      return {
        route_id: r.id,
        vehicle_id: v.id,
        departure_time_of_day: timeOfDay,
        duration_minutes: r.duration_min,
        price: Math.round(Number(r.base_price) * priceMul),
        available_seats: v.total_seats,
        days_of_week: days,
        is_active: true,
      };
    };

    const tripTemplates = [
      // ================= TP.HCM <-> Đà Lạt (8h) — 3 xe, 6 chuyến/ngày ==========
      // 51B-11111: HCM 06:00 -> ĐL 14:00 | ĐL 16:00 -> HCM 00:00 (nghỉ 6h)
      T(0, 4, "06:00"),
      T(4, 4, "16:00"),
      // 51B-22222: HCM 13:00 -> ĐL 21:00 | ĐL 23:00 -> HCM 07:00 (nghỉ 6h)
      T(0, 5, "13:00"),
      T(4, 5, "23:00"),
      // 51B-33333 (limousine, giá x1.5): HCM 22:00 -> ĐL 06:00 | ĐL 08:00 -> HCM 16:00
      T(0, 6, "22:00", ALL_DAYS, 1.5),
      T(4, 6, "08:00", ALL_DAYS, 1.5),

      // ================= TP.HCM <-> Cần Thơ (5h13) — 2 xe, 4 chuyến/ngày ======
      // 51B-44444: HCM 06:00 -> CT 11:13 | CT 14:00 -> HCM 19:13
      T(2, 7, "06:00"),
      T(10, 7, "14:00"),
      // 65B-11111: HCM 12:00 -> CT 17:13 | CT 20:00 -> HCM 01:13
      T(2, 8, "12:00"),
      T(10, 8, "20:00"),

      // ================= TP.HCM <-> Long Xuyên (4h27) — 2 xe, 4 chuyến/ngày ===
      // 51B-66666: HCM 07:00 -> LX 11:27 | LX 13:30 -> HCM 17:57
      T(3, 9, "07:00"),
      T(11, 9, "13:30"),
      // 67B-11111: HCM 15:00 -> LX 19:27 | LX 21:00 -> HCM 01:27
      T(3, 10, "15:00"),
      T(11, 10, "21:00"),

      // ================= Đà Nẵng <-> Nha Trang (10h) — 2 xe, 4 chuyến/ngày ====
      // 43B-11111: ĐN 06:00 -> NT 16:00 | NT 18:00 -> ĐN 04:00 (quay đầu 2h)
      T(9, 11, "06:00"),
      T(12, 11, "18:00"),
      // 79B-11111: ĐN 20:00 -> NT 06:00 | NT 08:00 -> ĐN 18:00
      T(9, 12, "20:00"),
      T(12, 12, "08:00"),

      // ================= Đà Lạt <-> Đà Nẵng (14h) — 3 xe, 2 chuyến/ngày =======
      // Xe chỉ chạy 1 lượt/ngày (đi 19:00, tới 09:00 hôm sau, nghỉ 10h).
      // 49B-11111 vòng A: ĐL->ĐN T2/T4/T6, ĐN->ĐL T3/T5/T7, nghỉ CN tại Đà Lạt
      T(5, 13, "19:00", [1, 3, 5]),
      T(7, 13, "19:00", [2, 4, 6]),
      // 43B-22222 vòng B: ĐL->ĐN T3/T5/T7, ĐN->ĐL T4/T6/CN, nghỉ T2 tại Đà Lạt
      T(5, 14, "19:00", [2, 4, 6]),
      T(7, 14, "19:00", [3, 5, 0]),
      // 49B-22222 vòng C: chỉ gánh CN + T2 rồi nằm bãi Đà Lạt chờ tuần sau
      T(5, 15, "19:00", [0]),
      T(7, 15, "19:00", [1]),

      // ================= Đà Lạt <-> Cần Thơ (11h) — 3 xe, 2 chuyến/ngày =======
      // Đi 07:00, tới 18:00 cùng ngày, nghỉ đêm rồi hôm sau chạy chiều ngược lại.
      T(6, 16, "07:00", [1, 3, 5]),
      T(13, 16, "07:00", [2, 4, 6]), // 49B-33333 vòng A
      T(6, 17, "07:00", [2, 4, 6]),
      T(13, 17, "07:00", [3, 5, 0]), // 65B-22222 vòng B
      T(6, 18, "07:00", [0]),
      T(13, 18, "07:00", [1]), // 49B-44444 vòng C

      // ================= Đà Nẵng <-> TP.HCM (20h) — 3 xe, 2 chuyến/ngày ======
      // Đi 07:00, tới 03:00 hôm sau, đổi tài và quay đầu lúc 07:00.
      T(8, 19, "07:00", [1, 3, 5]),
      T(14, 19, "07:00", [2, 4, 6]), // 43B-33333 vòng A
      T(8, 20, "07:00", [2, 4, 6]),
      T(14, 20, "07:00", [3, 5, 0]), // 51B-77777 vòng B
      T(8, 21, "07:00", [0]),
      T(14, 21, "07:00", [1]), // 43B-44444 vòng C
    ];

    await TripTemplate.bulkCreate(tripTemplates);
    console.log(
      `   - Đã nạp ${tripTemplates.length} mẫu chuyến lặp lại (~24 chuyến/ngày cho 9 tuyến phổ biến).`,
    );

    // 6. Tài xế: 2 người/xe (tài xế chính + tài xế phụ) cho mọi xe có mẫu chuyến
    // hoặc chuyến tăng cường. Chạy TRƯỚC khi sinh chuyến để chuyến sinh ra kế
    // thừa luôn tài xế của mẫu (và job tự kiểm tra ngày nghỉ/trùng lịch).
    const { driversByVehicle } = await seedDrivers();
    const driverOf = (vehicle, k = 0) => driversByVehicle.get(vehicle.id)[k];

    // 6a. Ngày nghỉ mẫu:
    //   - Tài xế 2 (tài xế phụ) của 51B-11111 nghỉ ngày +2..+3 → các chuyến của
    //     xe hai ngày đó sinh ra không có tài xế phụ (demo admin chọn người thay).
    //   - Tài xế 1 của 51B-22222 có lịch nghỉ tuần sau (demo màn đăng ký nghỉ).
    const leaveDriver = driverOf(vehicles[4], 1);
    await DriverUnavailability.bulkCreate([
      {
        driver_id: leaveDriver.id,
        start_date: toVNDateString(getFutureDate(2, 12)),
        end_date: toVNDateString(getFutureDate(3, 12)),
        reason: "Việc gia đình",
      },
      {
        driver_id: driverOf(vehicles[5], 0).id,
        start_date: toVNDateString(getFutureDate(9, 12)),
        end_date: toVNDateString(getFutureDate(9, 12)),
        reason: "Khám sức khỏe định kỳ",
      },
    ]);
    console.log(`   - Đã nạp 2 lịch nghỉ của tài xế (${leaveDriver.full_name} nghỉ ngày +2..+3).`);

    // 7. Sinh chuyến tương lai từ mẫu (job dùng chung với server).
    const genSummary = await generateTripsFromTemplates();
    console.log(
      `   - Đã tự sinh ${genSummary.created} chuyến từ mẫu lặp lại (bỏ qua: ${genSummary.skippedExisting} trùng, ${genSummary.skippedConflict} trùng lịch xe, ${genSummary.skippedSeats} vượt sức chứa, ${genSummary.skippedInactiveResource} tuyến/xe ngừng hoạt động; ${genSummary.skippedDriverUnavailable} chuyến để trống tài xế).`,
    );

    // 8. Lịch sử chạy PAST_DAYS ngày qua theo đúng các mẫu chuyến — để tài xế có
    // lịch sử/thống kê cá nhân, nhân viên có số liệu doanh thu, đối soát.
    //   - Chuyến đã tới nơi → 'completed' với giờ chạy thực tế (lệch vài phút).
    //   - Chuyến đã khởi hành nhưng chưa tới (hôm nay) → 'ongoing', tài xế đã bấm
    //     "Bắt đầu chạy" (demo dashboard "chuyến kế tiếp" + điểm danh).
    const PAST_DAYS = 21;
    const createdTemplates = await TripTemplate.findAll();
    const now = Date.now();
    const pastTrips = [];
    for (const template of createdTemplates) {
      const [h, m] = template.departure_time_of_day.split(":").map(Number);
      for (let offset = -PAST_DAYS; offset <= 0; offset++) {
        const dep = new Date();
        dep.setDate(dep.getDate() + offset);
        if (!template.days_of_week.includes(dep.getDay())) continue;
        dep.setHours(h, m, 0, 0);
        if (dep.getTime() > now) continue; // tương lai do generateTripsFromTemplates lo
        const arr = new Date(dep.getTime() + minutes(template.duration_minutes));
        const completed = arr.getTime() <= now;
        const actualDep = new Date(dep.getTime() + minutes(randInt(-3, 15)));
        pastTrips.push({
          route_id: template.route_id,
          vehicle_id: template.vehicle_id,
          template_id: template.id,
          driver_id: template.driver_id,
          co_driver_id: template.co_driver_id,
          departure_time: dep,
          arrival_time: arr,
          price: template.price,
          available_seats: template.available_seats,
          status: completed ? "completed" : "ongoing",
          actual_departure_at: actualDep,
          actual_arrival_at: completed ? new Date(arr.getTime() + minutes(randInt(-10, 25))) : null,
          // không nhắc lại chuyến đã chạy
          reminder_sent_at: dep,
        });
      }
    }

    // Vài chuyến tăng cường đã chạy tuần trước (xe [0..3]) — giữ như bản cũ,
    // nay có thêm tài xế + giờ chạy thực tế.
    // [routeIndex, vehicleIndex, daysAgo, hourDeparture, hourArrival, priceMultiplier]
    const completedMatrix = [
      [0, 0, 6, 23, 5, 1.1], // TP.HCM -> Đà Lạt
      [0, 1, 5, 8, 14, 1.4],
      [0, 0, 3, 23, 5, 1.1],
      [1, 2, 6, 21, 5, 1.1], // TP.HCM -> Nha Trang
      [1, 3, 4, 7, 15, 1.0],
      [1, 2, 2, 21, 5, 1.1],
    ];
    for (const [rIdx, vIdx, daysAgo, depHour, arrHour, priceMul] of completedMatrix) {
      const r = routes[rIdx];
      const v = vehicles[vIdx];
      const arrivalDaysAgo = arrHour <= depHour ? daysAgo - 1 : daysAgo;
      const dep = getFutureDate(-daysAgo, depHour);
      const arr = getFutureDate(-arrivalDaysAgo, arrHour);
      pastTrips.push({
        route_id: r.id,
        vehicle_id: v.id,
        driver_id: driverOf(v, 0).id,
        co_driver_id: driverOf(v, 1).id,
        departure_time: dep,
        arrival_time: arr,
        price: Number(r.base_price) * priceMul,
        available_seats: v.total_seats,
        status: "completed",
        actual_departure_at: new Date(dep.getTime() + minutes(randInt(0, 10))),
        actual_arrival_at: new Date(arr.getTime() + minutes(randInt(-5, 20))),
        reminder_sent_at: dep,
      });
    }
    const createdPastTrips = await Trip.bulkCreate(pastTrips);
    const ongoingCount = createdPastTrips.filter((t) => t.status === "ongoing").length;
    console.log(
      `   - Đã nạp ${createdPastTrips.length} chuyến đã chạy trong ${PAST_DAYS} ngày qua (${ongoingCount} chuyến đang chạy lúc seed), kèm tài xế + giờ chạy thực tế.`,
    );

    // 9. Hóa đơn & vé.
    const [adminUser, staffUser, customerUser, ...extraCustomers] = users;
    const customers = [customerUser, ...extraCustomers];
    const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
    const PASSENGER_LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Võ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương"];
    const PASSENGER_FIRST = ["An", "Bảo", "Chi", "Dung", "Giang", "Hà", "Hạnh", "Hoa", "Khánh", "Lan", "Linh", "Mai", "My", "Nam", "Ngọc", "Phúc", "Quân", "Thảo", "Trang", "Vy"];
    const randomPassenger = () => ({
      passenger_name: `${pick(PASSENGER_LAST)} ${pick(["Văn", "Thị", "Minh", "Ngọc", "Hoàng"])} ${pick(PASSENGER_FIRST)}`,
      passenger_phone: `09${String(randInt(10000000, 99999999))}`,
    });

    // Đặt ngẫu nhiên vài vé (đã thanh toán) cho một chuyến, chia thành các hóa
    // đơn 1–3 ghế của các khách khác nhau. Chuyến đã/đang chạy thì điểm danh
    // phần lớn khách (boarded_at/boarded_by = tài xế).
    let invoiceCount = 0;
    let ticketCount = 0;
    const bookRandomSeats = async (trip, { min, max, boardRate, bookedAt }) => {
      const vehicle = vehicleById.get(trip.vehicle_id);
      const seatCount = Math.min(randInt(min, max), vehicle.total_seats);
      if (seatCount === 0) return;
      let shuttleTicketCount = 0;
      const seatPool = Array.from({ length: vehicle.total_seats }, (_, i) => i + 1);
      const seats = [];
      for (let i = 0; i < seatCount; i++) {
        seats.push(seatPool.splice(Math.floor(rand() * seatPool.length), 1)[0]);
      }

      while (seats.length > 0) {
        const groupSeats = seats.splice(0, Math.min(randInt(1, 3), seats.length));
        const createdAt = bookedAt();
        const invoice = await Invoice.create({
          user_id: pick(customers).id,
          total_price: groupSeats.length * Number(trip.price),
          payment_method: rand() < 0.5 ? "momo" : "cash",
          payment_status: "paid",
          paid_at: createdAt,
          created_at: createdAt,
          updated_at: createdAt,
        });
        invoiceCount++;
        const boardedAt = trip.actual_departure_at
          ? new Date(new Date(trip.actual_departure_at).getTime() - minutes(randInt(2, 20)))
          : null;
        await Ticket.bulkCreate(
          groupSeats.map((seat) => {
            const boarded = boardedAt && rand() < boardRate;
            const useShuttle = shuttleRouteIds.has(trip.route_id) && rand() < 0.2;
            if (useShuttle) shuttleTicketCount++;
            return {
              pickup_type: useShuttle ? "shuttle" : "station",
              pickup_address: useShuttle ? pick(SHUTTLE_ADDRESSES) : null,
              pickup_note: useShuttle && rand() < 0.3 ? "Gọi trước khi tới" : null,
              pickup_updated_at: useShuttle ? createdAt : null,
              invoice_id: invoice.id,
              trip_id: trip.id,
              seat_number: seat,
              active_seat_number: seat,
              ...randomPassenger(),
              ticket_price: trip.price,
              booking_status: "booked",
              boarded_at: boarded ? boardedAt : null,
              boarded_by: boarded ? trip.driver_id : null,
              created_at: createdAt,
            };
          }),
        );
        ticketCount += groupSeats.length;
      }
      await trip.update({ available_seats: vehicle.total_seats - seatCount });
      // Chuyến đã qua mốc chốt thì khóa danh sách đón; chuyến quá khứ coi như đã in.
      const departureMs = new Date(trip.departure_time).getTime();
      if (departureMs - minutes(Number(process.env.SHUTTLE_CUTOFF_MINUTES) || 120) <= Date.now()) {
        await trip.update({
          shuttle_locked_at: new Date(departureMs - minutes(Number(process.env.SHUTTLE_CUTOFF_MINUTES) || 120)),
          shuttle_list_printed_at: shuttleTicketCount > 0 && departureMs < Date.now()
            ? new Date(departureMs - minutes(100))
            : null,
        });
      }
    };

    for (const trip of createdPastTrips) {
      const dep = new Date(trip.departure_time).getTime();
      await bookRandomSeats(trip, {
        min: 3,
        max: 14,
        boardRate: trip.status === "completed" ? 0.92 : 0.8,
        // đặt trước giờ đi 1 giờ – 5 ngày
        bookedAt: () => new Date(dep - minutes(randInt(60, 5 * 24 * 60))),
      });
    }

    // Chuyến sắp chạy trong 3 ngày tới: vài vé để tài xế có danh sách khách.
    const upcomingTrips = await Trip.findAll({
      where: {
        status: "scheduled",
        template_id: { [Op.ne]: null },
        departure_time: { [Op.between]: [new Date(), getFutureDate(3, 23)] },
      },
    });
    for (const trip of upcomingTrips) {
      await bookRandomSeats(trip, {
        min: 0,
        max: 8,
        boardRate: 0,
        bookedAt: () => new Date(now - minutes(randInt(30, 3 * 24 * 60))),
      });
    }
    console.log(
      `   - Đã nạp ${invoiceCount} hóa đơn / ${ticketCount} vé ngẫu nhiên cho chuyến đã chạy và 3 ngày tới (có điểm danh lên xe).`,
    );

    // Các tình huống hóa đơn đặc biệt trên chuyến tăng cường (pending, hủy lẻ,
    // hoàn tiền, đặt hộ tại quầy) — giữ như bản cũ, tham chiếu theo index tripMatrix.
    const daysAgo = (n) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };

    const sampleBookings = [
      // Khách hàng đặt 2 ghế TP.HCM -> Đà Lạt tối nay, đã thanh toán hôm nay
      // -> phục vụ số liệu "hôm nay" ở màn Thống kê
      {
        tripIndex: 0,
        user: customerUser,
        payment_method: "momo",
        payment_status: "paid",
        created_at: new Date(),
        seats: [
          { seat_number: 1, passenger_name: "Nguyễn Văn An", passenger_phone: "0901111111", cancelled: false },
          { seat_number: 2, passenger_name: "Trần Thị Bình", passenger_phone: "0901111112", cancelled: false },
        ],
      },
      // Khách hàng đặt 1 ghế TP.HCM -> Nha Trang tối nay, đang chờ thanh toán
      {
        tripIndex: 4,
        user: customerUser,
        payment_method: "cash",
        payment_status: "pending",
        created_at: new Date(),
        seats: [
          { seat_number: 5, passenger_name: "Lê Văn Cường", passenger_phone: "0901111113", cancelled: false },
        ],
      },
      // Khách hàng đặt 3 ghế 2 ngày trước, đã thanh toán, 1 ghế bị hủy riêng lẻ sau đó
      {
        tripIndex: 1,
        user: customerUser,
        payment_method: "momo",
        payment_status: "paid",
        created_at: daysAgo(2),
        seats: [
          { seat_number: 3, passenger_name: "Phạm Thị Dung", passenger_phone: "0901111114", cancelled: false },
          { seat_number: 4, passenger_name: "Hoàng Văn Em", passenger_phone: "0901111115", cancelled: false },
          { seat_number: 5, passenger_name: "Vũ Thị Phương", passenger_phone: "0901111116", cancelled: true },
        ],
      },
      // Nhân viên đặt vé hộ khách tại quầy 1 ngày trước, đã thanh toán
      {
        tripIndex: 6,
        user: extraCustomers[0],
        payment_method: "cash",
        payment_status: "paid",
        created_at: daysAgo(1),
        seats: [
          { seat_number: 1, passenger_name: "Đỗ Văn Giang", passenger_phone: "0901111117", cancelled: false },
        ],
      },
      // Khách hàng đặt 2 ghế 3 ngày trước rồi được hoàn tiền toàn bộ hóa đơn
      {
        tripIndex: 5,
        user: customerUser,
        payment_method: "cash",
        payment_status: "refunded",
        created_at: daysAgo(3),
        seats: [
          { seat_number: 10, passenger_name: "Bùi Thị Hoa", passenger_phone: "0901111118", cancelled: true },
          { seat_number: 11, passenger_name: "Ngô Văn Inh", passenger_phone: "0901111119", cancelled: true },
        ],
      },
    ];

    for (const booking of sampleBookings) {
      const trip = createdTrips[booking.tripIndex];
      const vehicle = tripVehicles[booking.tripIndex];
      const activeSeats = booking.seats.filter((s) => !s.cancelled);
      const totalPrice = activeSeats.length * parseFloat(trip.price);

      const invoice = await Invoice.create({
        user_id: booking.user.id,
        total_price: totalPrice,
        payment_method: booking.payment_method,
        payment_status: booking.payment_status,
        paid_at: booking.payment_status === "pending" ? null : booking.created_at,
        created_at: booking.created_at,
        updated_at: booking.created_at,
      });

      for (const seat of booking.seats) {
        await Ticket.create({
          invoice_id: invoice.id,
          trip_id: trip.id,
          seat_number: seat.seat_number,
          passenger_name: seat.passenger_name,
          passenger_phone: seat.passenger_phone,
          ticket_price: trip.price,
          booking_status: seat.cancelled ? "cancelled" : "booked",
          active_seat_number: seat.cancelled ? null : seat.seat_number,
          cancelled_at: seat.cancelled ? booking.created_at : null,
          created_at: booking.created_at,
        });
      }

      // Keep trips.available_seats consistent with the count of still-booked tickets,
      // same invariant the booking/cancel controllers maintain at runtime.
      const bookedCount = await Ticket.count({
        where: { trip_id: trip.id, booking_status: "booked" },
      });
      await trip.update({ available_seats: vehicle.total_seats - bookedCount });
    }
    console.log(
      `   - Đã nạp ${sampleBookings.length} hóa đơn tình huống đặc biệt (pending/hủy lẻ/hoàn tiền/đặt hộ).`,
    );

    // 9b. Kịch bản xe trung chuyển (md/DonKhachTrungChuyen.md) trên 3 chuyến sắp chạy
    //     gần nhất của các tuyến bật trung chuyển — để demo đủ các trạng thái ở
    //     /staff/shuttles mà không phụ thuộc giờ chạy seed:
    //       A. đã chốt + đã in, rồi CÓ THAY ĐỔI sau khi in (đổi điểm đón, hủy vé) -> "Cần in lại"
    //       B. đã chốt, CHƯA in, 3 khách / 2 địa chỉ (có 2 khách cùng địa chỉ để thấy gộp nhóm)
    //          + 1 vé trung chuyển CHƯA thanh toán (không được lên danh sách in)
    //       C. chưa chốt (còn hạn đăng ký): hóa đơn tiền mặt pending có vé trung chuyển + 1 vé đã thanh toán
    //     (trạng thái chốt/in ở đây là dữ liệu minh họa, độc lập với đồng hồ thật.)
    const shuttleDemoTrips = await Trip.findAll({
      where: {
        status: "scheduled",
        route_id: { [Op.in]: [...shuttleRouteIds] },
        departure_time: { [Op.gt]: new Date() },
      },
      order: [["departure_time", "ASC"]],
      limit: 3,
    });
    const nowMs = Date.now();
    const createShuttleBooking = async (trip, { seatCount, status, method, addresses, note, paidMinutesAgo = 60 }) => {
      const vehicle = vehicleById.get(trip.vehicle_id);
      const taken = new Set((await Ticket.findAll({ where: { trip_id: trip.id, booking_status: "booked" }, attributes: ["seat_number"] })).map((t) => t.seat_number));
      const seats = [];
      for (let n = 1; n <= vehicle.total_seats && seats.length < seatCount; n++) if (!taken.has(n)) seats.push(n);
      if (seats.length < seatCount) return [];
      const createdAt = new Date(nowMs - minutes(paidMinutesAgo));
      const invoice = await Invoice.create({
        user_id: pick(customers).id,
        total_price: seats.length * Number(trip.price),
        payment_method: method,
        payment_status: status,
        paid_at: status === "pending" ? null : createdAt,
        created_at: createdAt,
        updated_at: createdAt,
      });
      const created = [];
      for (const [i, seat] of seats.entries()) {
        created.push(await Ticket.create({
          invoice_id: invoice.id,
          trip_id: trip.id,
          seat_number: seat,
          active_seat_number: seat,
          ...randomPassenger(),
          ticket_price: trip.price,
          booking_status: "booked",
          pickup_type: "shuttle",
          pickup_address: addresses[i % addresses.length],
          pickup_note: i === 0 ? note : null,
          pickup_updated_at: createdAt,
          created_at: createdAt,
        }));
      }
      const bookedCount = await Ticket.count({ where: { trip_id: trip.id, booking_status: "booked" } });
      await trip.update({ available_seats: vehicle.total_seats - bookedCount });
      return created;
    };

    if (shuttleDemoTrips.length === 3) {
      const [tripA, tripB, tripC] = shuttleDemoTrips;

      // A: đã in cách đây 30 phút, sau đó 1 khách đổi điểm đón và 1 khách hủy vé.
      const ticketsA = await createShuttleBooking(tripA, {
        seatCount: 3, status: "paid", method: "momo", addresses: [SHUTTLE_ADDRESSES[0], SHUTTLE_ADDRESSES[1], SHUTTLE_ADDRESSES[2]], note: "Gọi trước 10 phút", paidMinutesAgo: 240,
      });
      await tripA.update({ shuttle_locked_at: new Date(nowMs - minutes(60)), shuttle_list_printed_at: new Date(nowMs - minutes(30)) });
      if (ticketsA.length === 3) {
        await ticketsA[0].update({ pickup_address: "99 Hai Bà Trưng, Quận 1", pickup_updated_at: new Date(nowMs - minutes(10)) });
        await ticketsA[2].update({ booking_status: "cancelled", active_seat_number: null, cancelled_at: new Date(nowMs - minutes(5)) });
        await tripA.increment("available_seats", { by: 1 });
      }

      // B: đã chốt, chưa in; 2 khách chung địa chỉ; thêm 1 hóa đơn pending (không lên danh sách).
      await tripB.update({ shuttle_locked_at: new Date(nowMs - minutes(20)) });
      await createShuttleBooking(tripB, {
        seatCount: 3, status: "paid", method: "cash", addresses: [SHUTTLE_ADDRESSES[3], SHUTTLE_ADDRESSES[3], SHUTTLE_ADDRESSES[4]], note: "Cổng xanh, hẻm 12", paidMinutesAgo: 180,
      });
      await createShuttleBooking(tripB, {
        seatCount: 1, status: "pending", method: "cash", addresses: [SHUTTLE_ADDRESSES[5]], note: "Chưa thanh toán", paidMinutesAgo: 15,
      });

      // C: còn hạn đăng ký — khách vẫn đổi được cách lên xe ở /customer/invoices.
      await createShuttleBooking(tripC, {
        seatCount: 2, status: "pending", method: "cash", addresses: [SHUTTLE_ADDRESSES[1]], note: null, paidMinutesAgo: 10,
      });
      await createShuttleBooking(tripC, {
        seatCount: 1, status: "paid", method: "momo", addresses: [SHUTTLE_ADDRESSES[2]], note: "Gọi trước khi tới", paidMinutesAgo: 30,
      });
      console.log("   - Đã nạp 3 kịch bản xe trung chuyển (cần in lại / chờ in / còn hạn đăng ký) — xem /staff/shuttles.");
    } else {
      console.log("   - Bỏ qua kịch bản xe trung chuyển: không đủ 3 chuyến sắp chạy trên tuyến có trung chuyển.");
    }

    // 10. Sự cố chuyến xe do tài xế báo:
    //   - 1 sự cố đã xử lý trên một chuyến đã chạy (trễ 25 phút, đã báo khách).
    //   - 1 sự cố CHƯA xử lý trên chuyến đang chạy (hoặc chuyến sắp chạy gần nhất
    //     nếu lúc seed không có chuyến nào đang chạy) → badge đỏ ở trang Chuyến xe.
    const completedWithDriver = createdPastTrips.filter((t) => t.status === "completed" && t.driver_id);
    const resolvedTrip = completedWithDriver[Math.floor(completedWithDriver.length / 2)];
    const openTrip =
      createdPastTrips.find((t) => t.status === "ongoing" && t.driver_id) ||
      (await Trip.findOne({
        where: { status: "scheduled", driver_id: { [Op.ne]: null }, departure_time: { [Op.gt]: new Date() } },
        order: [["departure_time", "ASC"]],
      }));
    const incidents = [];
    if (resolvedTrip) {
      incidents.push({
        trip_id: resolvedTrip.id,
        reported_by: resolvedTrip.driver_id,
        type: "delay",
        delay_minutes: 25,
        note: "Kẹt xe đoạn cửa ngõ thành phố",
        passengers_notified_at: resolvedTrip.departure_time,
        resolved_at: resolvedTrip.arrival_time,
        resolved_by: staffUser.id,
        created_at: resolvedTrip.departure_time,
      });
    }
    if (openTrip) {
      incidents.push({
        trip_id: openTrip.id,
        reported_by: openTrip.driver_id,
        type: openTrip.status === "ongoing" ? "breakdown" : "delay",
        delay_minutes: openTrip.status === "ongoing" ? null : 15,
        note: openTrip.status === "ongoing" ? "Xe báo lỗi đèn cảnh báo, đang kiểm tra tại trạm dừng" : "Chờ khách đón dọc đường",
      });
    }
    await TripIncident.bulkCreate(incidents);
    console.log(`   - Đã nạp ${incidents.length} sự cố chuyến xe (1 đã xử lý, ${openTrip ? 1 : 0} chưa xử lý).`);

    // Tài khoản demo để đăng nhập nhanh
    const demoDriver = driverOf(vehicles[0], 0);
    console.log("🌱 Hoàn tất nạp dữ liệu mẫu! Tài khoản demo (mật khẩu: password):");
    console.log(`   admin:     ${adminUser.email}`);
    console.log(`   nhân viên: ${staffUser.email}`);
    console.log(`   khách:     ${customerUser.email}`);
    console.log(`   tài xế:    ${demoDriver.email} (${demoDriver.full_name}, xe ${vehicles[0].license_plate}) — tài xế đánh số taixe1…taixe${driversByVehicle.size * 2}@datvexekhach.vn (lẻ = tài xế chính, chẵn = phụ của cùng xe)`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi nạp dữ liệu mẫu:", error);
    process.exit(1);
  }
};

// Rào chắn: seed XÓA toàn bộ dữ liệu hiện có (bước 1) — chỉ chạy trên DB *_dev/*_test
// với cờ --yes, và chỉ khi schema đã được tạo bằng migration (npm run db:migrate).
const guard = async () => {
  assertDestructiveAllowed("Xóa dữ liệu hiện có và nạp dữ liệu mẫu");
  await sequelize.authenticate();
  const executed = await migrator.executed();
  if (executed.length === 0) {
    throw new Error('Database chưa có schema. Hãy chạy "npm run db:migrate" trước.');
  }
  const pending = await migrator.pending();
  if (pending.length > 0) {
    throw new Error(`Còn ${pending.length} migration chưa chạy. Hãy chạy "npm run db:migrate" trước.`);
  }
};

guard()
  .then(() => seedData())
  .catch((error) => {
    console.error("❌", error.message);
    process.exit(1);
  });
