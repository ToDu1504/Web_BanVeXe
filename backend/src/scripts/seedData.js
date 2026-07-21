const { User, Route, Vehicle, Trip } = require('../models')
const { sequelize } = require('../config/db')

const seedData = async () => {
  try {
    console.log('🌱 Đang nạp dữ liệu mẫu (seeding)...')

    // 1. Clear database tables first in order of dependencies
    await Trip.destroy({ where: {} })
    await Route.destroy({ where: {} })
    await Vehicle.destroy({ where: {} })
    await User.destroy({ where: {} })

    // 2. Create Users (passwords will be hashed via beforeSave hook)
    const users = await User.bulkCreate([
      {
        full_name: 'Quản Trị Viên',
        email: 'admin@vexerebus.vn',
        phone: '0987654321',
        password: 'password',
        role: 'admin',
        is_active: true,
      },
      {
        full_name: 'Nhân Viên Điều Phối',
        email: 'staff@vexerebus.vn',
        phone: '0987654322',
        password: 'password',
        role: 'staff',
        is_active: true,
      },
      {
        full_name: 'Khách Hàng Thân Thiết',
        email: 'customer@vexerebus.vn',
        phone: '0987654323',
        password: 'password',
        role: 'customer',
        is_active: true,
      },
    ], { individualHooks: true }) // individualHooks triggers beforeSave hook on bulkCreate

    console.log('   - Đã nạp 3 tài khoản người dùng.')

    // 3. Create Routes
    const routes = await Route.bulkCreate([
      {
        origin: 'Hà Nội',
        destination: 'Hải Phòng',
        distance_km: 120,
        duration_min: 120,
        base_price: 150000,
        is_active: true,
      },
      {
        origin: 'Hà Nội',
        destination: 'Sa Pa',
        distance_km: 320,
        duration_min: 300,
        base_price: 350000,
        is_active: true,
      },
      {
        origin: 'Sài Gòn',
        destination: 'Đà Lạt',
        distance_km: 310,
        duration_min: 360,
        base_price: 300000,
        is_active: true,
      },
      {
        origin: 'Sài Gòn',
        destination: 'Nha Trang',
        distance_km: 430,
        duration_min: 480,
        base_price: 400000,
        is_active: true,
      },
    ])

    console.log('   - Đã nạp 4 tuyến đường vận chuyển.')

    // 4. Create Vehicles
    const vehicles = await Vehicle.bulkCreate([
      {
        license_plate: '29B-12345',
        vehicle_type: 'sleeper',
        total_seats: 36,
        seat_layout: { floors: 2, rows: 6, cols: 3 },
        is_active: true,
      },
      {
        license_plate: '29B-99999',
        vehicle_type: 'limousine',
        total_seats: 9,
        seat_layout: { floors: 1, rows: 3, cols: 3 },
        is_active: true,
      },
      {
        license_plate: '51B-55555',
        vehicle_type: 'standard',
        total_seats: 40,
        seat_layout: { floors: 1, rows: 10, cols: 4 },
        is_active: true,
      },
    ])

    console.log('   - Đã nạp 3 phương tiện xe khách.')

    // Helper to add days to current date
    const getFutureDate = (days, hoursOffset) => {
      const d = new Date()
      d.setDate(d.getDate() + days)
      d.setHours(hoursOffset, 0, 0, 0)
      return d
    }

    // 5. Create Trips dynamically (for today and the next 5 days)
    const trips = []

    // Map: [routeIndex, vehicleIndex, daysAhead, hourDeparture, hourArrival, priceMultiplier]
    const tripMatrix = [
      // Hanoi - Haiphong trips
      [0, 2, 0, 8, 10, 1.0], // Today 08:00
      [0, 2, 0, 14, 16, 1.0], // Today 14:00
      [0, 2, 1, 8, 10, 1.0], // Tomorrow 08:00
      [0, 2, 1, 14, 16, 1.0], // Tomorrow 14:00
      [0, 2, 2, 8, 10, 1.0], // Day 2 08:00
      [0, 2, 3, 14, 16, 1.0], // Day 3 14:00

      // Hanoi - Sapa trips
      [1, 0, 0, 22, 3, 1.2], // Today 22:00 (sleeper)
      [1, 0, 1, 22, 3, 1.2], // Tomorrow 22:00 (sleeper)
      [1, 1, 2, 7, 12, 1.5], // Day 2 07:00 (limousine)
      [1, 0, 3, 22, 3, 1.2], // Day 3 22:00 (sleeper)

      // Saigon - Dalat trips
      [2, 0, 0, 23, 5, 1.1], // Today 23:00 (sleeper)
      [2, 0, 1, 23, 5, 1.1], // Tomorrow 23:00 (sleeper)
      [2, 1, 2, 8, 14, 1.4], // Day 2 08:00 (limousine)
      [2, 0, 3, 23, 5, 1.1], // Day 3 23:00 (sleeper)

      // Saigon - Nhatrang trips
      [3, 0, 0, 21, 5, 1.1], // Today 21:00 (sleeper)
      [3, 0, 1, 21, 5, 1.1], // Tomorrow 21:00 (sleeper)
      [3, 2, 2, 7, 15, 1.0], // Day 2 07:00 (standard)
      [3, 0, 3, 21, 5, 1.1], // Day 3 21:00 (sleeper)
    ]

    for (const item of tripMatrix) {
      const [rIdx, vIdx, days, depHour, arrHour, priceMul] = item
      const r = routes[rIdx]
      const v = vehicles[vIdx]
      
      trips.push({
        route_id: r.id,
        vehicle_id: v.id,
        departure_time: getFutureDate(days, depHour),
        arrival_time: getFutureDate(days, arrHour),
        price: r.base_price * priceMul,
        available_seats: v.total_seats,
        status: 'scheduled',
      })
    }

    await Trip.bulkCreate(trips)
    console.log(`   - Đã nạp ${trips.length} chuyến xe lịch trình sắp chạy.`)
    console.log('🌱 Hoàn tất nạp dữ liệu mẫu!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu mẫu:', error)
    process.exit(1)
  }
}

// Only seed if database connects successfully
sequelize.authenticate().then(() => {
  seedData()
})
