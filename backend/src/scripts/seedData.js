const {
  User,
  Route,
  Vehicle,
  Trip,
  Invoice,
  Ticket,
  TripTemplate,
} = require("../models");
const { sequelize } = require("../config/db");
const {
  generateTripsFromTemplates,
} = require("../jobs/generateTripsFromTemplates");

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
 * ============================================================================
 */

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // 0 = CN, 1 = T2, ... 6 = T7 (theo Date.getDay())

const seedData = async () => {
  try {
    console.log("🌱 Đang nạp dữ liệu mẫu (seeding)...");

    // 1. Clear database tables first in order of dependencies
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
      ],
      { individualHooks: true },
    ); // individualHooks triggers beforeSave hook on bulkCreate

    console.log("   - Đã nạp 3 tài khoản người dùng.");

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

    // 5. Create Trips dynamically (for today and the next 3 days)
    const trips = [];
    const tripVehicles = []; // parallel array: vehicle used by trips[i], for seat-count bookkeeping below

    // Map: [routeIndex, vehicleIndex, daysAhead, hourDeparture, hourArrival, priceMultiplier]
    // Đây là các chuyến tăng cường tạo tay để luôn có sẵn chuyến "hôm nay" cho
    // demo/booking mẫu. Thứ tự các dòng KHÔNG được đổi: sampleBookings ở mục 6
    // tham chiếu theo index (0, 1, 4, 5, 6).
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

    // 5b. TripTemplates cho 9 tuyến phổ biến (TP.HCM / Đà Lạt / Đà Nẵng).
    // Dùng lại logic lịch lặp + kiểm tra trùng lịch xe trong
    // generateTripsFromTemplates() thay vì viết tay thêm một Trip matrix nữa.
    //
    // days_of_week theo Date.getDay(): 0 = CN, 1 = T2, ..., 6 = T7.
    // Lịch dưới đây đã được kiểm tra tay 3 điều kiện:
    //   (a) 1 xe không có 2 chuyến chồng giờ nhau,
    //   (b) xe luôn xuất phát từ đúng thành phố nó đang đứng,
    //   (c) vòng quay của mỗi xe khép kín sau 1 tuần.
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

    const genSummary = await generateTripsFromTemplates();
    console.log(
      `   - Đã tự sinh ${genSummary.created} chuyến từ mẫu lặp lại (bỏ qua: ${genSummary.skippedExisting} trùng, ${genSummary.skippedConflict} trùng lịch xe, ${genSummary.skippedSeats} vượt sức chứa, ${genSummary.skippedInactiveResource} tuyến/xe ngừng hoạt động).`,
    );

    // 6. Create sample Invoices & Tickets so InvoiceHistory/ManageInvoice/Statistics
    // have real data to exercise right after seeding, instead of showing empty until
    // someone books manually through the UI.
    const [, staffUser, customerUser] = users;

    const daysAgo = (n) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };

    // Indices into createdTrips/tripVehicles (matches tripMatrix order above)
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
          {
            seat_number: 1,
            passenger_name: "Nguyễn Văn An",
            passenger_phone: "0901111111",
            cancelled: false,
          },
          {
            seat_number: 2,
            passenger_name: "Trần Thị Bình",
            passenger_phone: "0901111112",
            cancelled: false,
          },
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
          {
            seat_number: 5,
            passenger_name: "Lê Văn Cường",
            passenger_phone: "0901111113",
            cancelled: false,
          },
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
          {
            seat_number: 3,
            passenger_name: "Phạm Thị Dung",
            passenger_phone: "0901111114",
            cancelled: false,
          },
          {
            seat_number: 4,
            passenger_name: "Hoàng Văn Em",
            passenger_phone: "0901111115",
            cancelled: false,
          },
          {
            seat_number: 5,
            passenger_name: "Vũ Thị Phương",
            passenger_phone: "0901111116",
            cancelled: true,
          },
        ],
      },
      // Nhân viên đặt vé hộ khách tại quầy 1 ngày trước, đã thanh toán
      {
        tripIndex: 6,
        user: staffUser,
        payment_method: "cash",
        payment_status: "paid",
        created_at: daysAgo(1),
        seats: [
          {
            seat_number: 1,
            passenger_name: "Đỗ Văn Giang",
            passenger_phone: "0901111117",
            cancelled: false,
          },
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
          {
            seat_number: 10,
            passenger_name: "Bùi Thị Hoa",
            passenger_phone: "0901111118",
            cancelled: true,
          },
          {
            seat_number: 11,
            passenger_name: "Ngô Văn Inh",
            passenger_phone: "0901111119",
            cancelled: true,
          },
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
      `   - Đã nạp ${sampleBookings.length} hóa đơn mẫu (pending/paid/refunded) kèm vé.`,
    );
    console.log("🌱 Hoàn tất nạp dữ liệu mẫu!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi nạp dữ liệu mẫu:", error);
    process.exit(1);
  }
};

// Only seed if database connects successfully
sequelize.authenticate().then(() => {
  seedData();
});
