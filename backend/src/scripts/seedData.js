const { User, Route, Vehicle, Trip, Invoice, Ticket } = require('../models')
const { sequelize } = require('../config/db')

const seedData = async () => {
  try {
    console.log('🌱 Đang nạp dữ liệu mẫu (seeding)...')

    // 1. Clear database tables first in order of dependencies
    await Ticket.destroy({ where: {} })
    await Invoice.destroy({ where: {} })
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
    const tripVehicles = [] // parallel array: vehicle used by trips[i], for seat-count bookkeeping below

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
      tripVehicles.push(v)
    }

    const createdTrips = await Trip.bulkCreate(trips)
    console.log(`   - Đã nạp ${trips.length} chuyến xe lịch trình sắp chạy.`)

    // 6. Create sample Invoices & Tickets so InvoiceHistory/ManageInvoice/Statistics
    // have real data to exercise right after seeding, instead of showing empty until
    // someone books manually through the UI.
    const [, staffUser, customerUser] = users

    const daysAgo = (n) => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return d
    }

    // Indices into createdTrips/tripVehicles (matches tripMatrix order above)
    const sampleBookings = [
      // Khách hàng đặt 2 ghế, đã thanh toán hôm nay -> phục vụ số liệu "hôm nay"
      {
        tripIndex: 0,
        user: customerUser,
        payment_method: 'banking',
        payment_status: 'paid',
        created_at: new Date(),
        seats: [
          { seat_number: 1, passenger_name: 'Nguyễn Văn An', passenger_phone: '0901111111', cancelled: false },
          { seat_number: 2, passenger_name: 'Trần Thị Bình', passenger_phone: '0901111112', cancelled: false },
        ],
      },
      // Khách hàng đặt 1 ghế, đang chờ thanh toán
      {
        tripIndex: 1,
        user: customerUser,
        payment_method: 'cash',
        payment_status: 'pending',
        created_at: new Date(),
        seats: [
          { seat_number: 5, passenger_name: 'Lê Văn Cường', passenger_phone: '0901111113', cancelled: false },
        ],
      },
      // Khách hàng đặt 3 ghế 2 ngày trước, đã thanh toán, 1 ghế bị hủy riêng lẻ sau đó
      {
        tripIndex: 2,
        user: customerUser,
        payment_method: 'momo',
        payment_status: 'paid',
        created_at: daysAgo(2),
        seats: [
          { seat_number: 3, passenger_name: 'Phạm Thị Dung', passenger_phone: '0901111114', cancelled: false },
          { seat_number: 4, passenger_name: 'Hoàng Văn Em', passenger_phone: '0901111115', cancelled: false },
          { seat_number: 5, passenger_name: 'Vũ Thị Phương', passenger_phone: '0901111116', cancelled: true },
        ],
      },
      // Nhân viên đặt vé hộ khách tại quầy 1 ngày trước, đã thanh toán
      {
        tripIndex: 6,
        user: staffUser,
        payment_method: 'cash',
        payment_status: 'paid',
        created_at: daysAgo(1),
        seats: [
          { seat_number: 1, passenger_name: 'Đỗ Văn Giang', passenger_phone: '0901111117', cancelled: false },
        ],
      },
      // Khách hàng đặt 2 ghế 3 ngày trước rồi được hoàn tiền toàn bộ hóa đơn
      {
        tripIndex: 10,
        user: customerUser,
        payment_method: 'banking',
        payment_status: 'refunded',
        created_at: daysAgo(3),
        seats: [
          { seat_number: 10, passenger_name: 'Bùi Thị Hoa', passenger_phone: '0901111118', cancelled: true },
          { seat_number: 11, passenger_name: 'Ngô Văn Inh', passenger_phone: '0901111119', cancelled: true },
        ],
      },
    ]

    for (const booking of sampleBookings) {
      const trip = createdTrips[booking.tripIndex]
      const vehicle = tripVehicles[booking.tripIndex]
      const activeSeats = booking.seats.filter((s) => !s.cancelled)
      const totalPrice = activeSeats.length * parseFloat(trip.price)

      const invoice = await Invoice.create({
        user_id: booking.user.id,
        total_price: totalPrice,
        payment_method: booking.payment_method,
        payment_status: booking.payment_status,
        created_at: booking.created_at,
        updated_at: booking.created_at,
      })

      for (const seat of booking.seats) {
        await Ticket.create({
          invoice_id: invoice.id,
          trip_id: trip.id,
          seat_number: seat.seat_number,
          passenger_name: seat.passenger_name,
          passenger_phone: seat.passenger_phone,
          ticket_price: trip.price,
          booking_status: seat.cancelled ? 'cancelled' : 'booked',
          cancelled_at: seat.cancelled ? booking.created_at : null,
          created_at: booking.created_at,
        })
      }

      // Keep trips.available_seats consistent with the count of still-booked tickets,
      // same invariant the booking/cancel controllers maintain at runtime.
      const bookedCount = await Ticket.count({
        where: { trip_id: trip.id, booking_status: 'booked' },
      })
      await trip.update({ available_seats: vehicle.total_seats - bookedCount })
    }

    console.log(`   - Đã nạp ${sampleBookings.length} hóa đơn mẫu (pending/paid/refunded) kèm vé.`)
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
