const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { User, Vehicle, TripTemplate, Trip } = require('../models')
const { validateDriverAssignment } = require('../utils/driverScheduling')

// Tạo sẵn tài khoản tài xế cho DB ĐANG CÓ DỮ LIỆU (không xóa gì) và gán vào lịch:
//   - Mỗi xe đang có TripTemplate/chuyến sắp chạy → 2 tài xế: taixe1.<bienso>
//     (tài xế chính), taixe2.<bienso> (tài xế phụ) @datvexekhach.vn, mật khẩu "password".
//   - Mọi mẫu chuyến của xe: driver_id = tài xế 1, co_driver_id = tài xế 2 (chỉ
//     điền vị trí đang trống). Hai người luôn đi cùng xe nên lịch không chồng giờ.
//   - Backfill chuyến 'scheduled' tương lai còn trống tài xế chính/phụ: chuyến sinh
//     từ mẫu → theo mẫu, chuyến tạo tay → tài xế 1/2 của xe. Mỗi người đều qua
//     validateDriverAssignment; ai không hợp lệ thì để trống vị trí đó.
//   - Idempotent: chạy lại chỉ dùng lại tài khoản đã có, không tạo trùng.
//   - KHÔNG gửi email phân công (tránh spam khi gán hàng loạt).
// Dùng: `npm run db:seed-drivers`, hoặc gọi seedDrivers() từ seedData.js.

const DRIVER_PASSWORD = 'password'

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
const MIDDLE_NAMES = ['Văn', 'Minh', 'Quốc', 'Thanh', 'Đức', 'Hữu', 'Công', 'Ngọc']
const FIRST_NAMES = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Giang', 'Hải', 'Hùng', 'Khang', 'Long', 'Minh', 'Nam', 'Phong', 'Quang', 'Sơn', 'Tài', 'Thắng', 'Toàn', 'Trung', 'Vinh', 'Tuấn', 'Hiếu', 'Lộc', 'Phúc']

// Tên cố định theo số thứ tự để chạy lại vẫn ra cùng một tên.
const driverName = (n) =>
  `${LAST_NAMES[n % LAST_NAMES.length]} ${MIDDLE_NAMES[Math.floor(n / LAST_NAMES.length) % MIDDLE_NAMES.length]} ${FIRST_NAMES[n % FIRST_NAMES.length]}`

const plateSlug = (plate) => plate.toLowerCase().replace(/[^a-z0-9]/g, '')

const seedDrivers = async ({ log = console.log } = {}) => {
  const summary = {
    accountsCreated: 0,
    accountsReused: 0,
    templatesAssigned: 0,
    tripsAssigned: 0,
    tripsSkipped: 0,
  }

  const templates = await TripTemplate.findAll({ order: [['vehicle_id', 'ASC'], ['route_id', 'ASC'], ['departure_time_of_day', 'ASC']] })
  // Xe cần tài xế = xe có mẫu chuyến + xe có chuyến tạo tay sắp chạy (VD xe tăng cường)
  const upcomingTripVehicles = await Trip.findAll({
    where: { status: 'scheduled', departure_time: { [Op.gt]: new Date() } },
    attributes: ['vehicle_id'],
    group: ['vehicle_id'],
    raw: true,
  })
  const vehicleIds = [...new Set([
    ...templates.map((t) => t.vehicle_id),
    ...upcomingTripVehicles.map((t) => t.vehicle_id),
  ])]
  const vehicles = await Vehicle.findAll({ where: { id: { [Op.in]: vehicleIds } }, order: [['id', 'ASC']] })

  // 1. Tài khoản: 2 tài xế / xe
  const driversByVehicle = new Map() // vehicleId -> [driver1, driver2]
  for (const [vIndex, vehicle] of vehicles.entries()) {
    const pair = []
    for (const k of [1, 2]) {
      const email = `taixe${k}.${plateSlug(vehicle.license_plate)}@datvexekhach.vn`
      let driver = await User.findOne({ where: { email } })
      if (driver) {
        summary.accountsReused++
      } else {
        const n = vIndex * 2 + (k - 1)
        driver = await User.create({
          full_name: driverName(n),
          email,
          // 10 số, đầu 038 — hợp lệ theo regex SĐT VN của Joi, không trùng giữa các tài xế
          phone: `038${String(vehicle.id).padStart(6, '0')}${k}`,
          password: DRIVER_PASSWORD,
          role: 'driver',
          is_active: true,
        })
        summary.accountsCreated++
      }
      pair.push(driver)
    }
    driversByVehicle.set(vehicle.id, pair)
  }

  // 2. Mẫu chuyến: tài xế 1 = chính, tài xế 2 = phụ
  const templateDrivers = new Map() // templateId -> { driverId, coDriverId }
  for (const template of templates) {
    const [main, co] = driversByVehicle.get(template.vehicle_id)
    let changed = false
    if (!template.driver_id) {
      template.driver_id = main.id
      changed = true
    }
    if (!template.co_driver_id && template.driver_id !== co.id) {
      template.co_driver_id = co.id
      changed = true
    }
    if (changed) {
      await template.save()
      summary.templatesAssigned++
    }
    templateDrivers.set(template.id, { driverId: template.driver_id, coDriverId: template.co_driver_id })
  }

  // 3. Backfill chuyến tương lai còn trống tài xế chính hoặc phụ
  const trips = await Trip.findAll({
    where: {
      vehicle_id: { [Op.in]: vehicleIds },
      status: 'scheduled',
      departure_time: { [Op.gt]: new Date() },
      [Op.or]: [{ driver_id: null }, { co_driver_id: null }],
    },
    order: [['departure_time', 'ASC']],
  })
  const isValid = async (driverId, trip) => !(await validateDriverAssignment({
    driverId,
    departureTime: trip.departure_time,
    arrivalTime: trip.arrival_time,
    excludeTripId: trip.id,
  }))
  for (const trip of trips) {
    const [main, co] = driversByVehicle.get(trip.vehicle_id)
    const wanted = templateDrivers.get(trip.template_id) || { driverId: main.id, coDriverId: co.id }
    let changed = false
    if (!trip.driver_id && wanted.driverId && wanted.driverId !== trip.co_driver_id && await isValid(wanted.driverId, trip)) {
      trip.driver_id = wanted.driverId
      changed = true
    }
    if (!trip.co_driver_id && wanted.coDriverId && trip.driver_id && wanted.coDriverId !== trip.driver_id &&
        await isValid(wanted.coDriverId, trip)) {
      trip.co_driver_id = wanted.coDriverId
      changed = true
    }
    if (changed) {
      await trip.save()
      summary.tripsAssigned++
    } else {
      summary.tripsSkipped++
    }
  }

  log(
    `   - Tài xế: tạo mới ${summary.accountsCreated}, dùng lại ${summary.accountsReused} (tài xế chính + phụ cho ${vehicles.length} xe); ` +
    `gán ${summary.templatesAssigned} mẫu chuyến, ${summary.tripsAssigned} chuyến (${summary.tripsSkipped} chuyến không đổi do trùng lịch/nghỉ).`
  )
  // driversByVehicle (vehicleId -> [tài xế 1, tài xế 2]) để seedData.js dựng
  // lịch sử chạy/điểm danh/sự cố đúng người.
  return { ...summary, driversByVehicle }
}

if (require.main === module) {
  sequelize.authenticate()
    .then(async () => {
      console.log('🚍 Đang tạo sẵn tài xế và gán vào lịch chạy (giữ nguyên dữ liệu)...')
      await seedDrivers()
      console.log(`✅ Xong! Đăng nhập: taixe1.<biển số viết liền>@datvexekhach.vn / ${DRIVER_PASSWORD}`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Lỗi tạo tài xế:', error.message)
      process.exit(1)
    })
}

module.exports = { seedDrivers }
