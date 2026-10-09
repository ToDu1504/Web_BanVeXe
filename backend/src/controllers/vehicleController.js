const { Op } = require('sequelize')
const { Vehicle, Trip, TripTemplate, User } = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')

const DRIVER_ATTRIBUTES = ['id', 'full_name', 'phone']

// Gắn thông tin tài xế cho trang danh sách xe (truy vấn gộp, không include
// hasMany để không làm hỏng limit/offset):
//   - current_driver / current_co_driver / current_trip: tài xế của chuyến đang chạy, nếu không có
//     thì của chuyến sắp khởi hành gần nhất của xe.
//   - regular_drivers: tài xế mặc định trên các mẫu chuyến của xe (đội thay ca).
const withDriverInfo = async (vehicles) => {
  const ids = vehicles.map((v) => v.id)
  if (ids.length === 0) return []

  const trips = await Trip.findAll({
    where: {
      vehicle_id: { [Op.in]: ids },
      driver_id: { [Op.ne]: null },
      [Op.or]: [
        { status: 'ongoing' },
        { status: 'scheduled', departure_time: { [Op.gte]: new Date() } },
      ],
    },
    include: [
      { model: User, as: 'Driver', attributes: DRIVER_ATTRIBUTES },
      { model: User, as: 'CoDriver', attributes: DRIVER_ATTRIBUTES },
    ],
    order: [['departure_time', 'ASC']],
  })
  const currentByVehicle = new Map()
  for (const trip of trips) {
    const existing = currentByVehicle.get(trip.vehicle_id)
    // Chuyến đang chạy luôn được ưu tiên hơn chuyến sắp chạy
    if (!existing || (trip.status === 'ongoing' && existing.status !== 'ongoing')) {
      currentByVehicle.set(trip.vehicle_id, trip)
    }
  }

  const templates = await TripTemplate.findAll({
    where: { vehicle_id: { [Op.in]: ids } },
    include: [
      { model: User, as: 'Driver', attributes: DRIVER_ATTRIBUTES },
      { model: User, as: 'CoDriver', attributes: DRIVER_ATTRIBUTES },
    ],
  })
  const regularByVehicle = new Map()
  for (const template of templates) {
    for (const person of [template.Driver, template.CoDriver]) {
      if (!person) continue
      if (!regularByVehicle.has(template.vehicle_id)) regularByVehicle.set(template.vehicle_id, new Map())
      regularByVehicle.get(template.vehicle_id).set(person.id, person.toJSON())
    }
  }

  return vehicles.map((vehicle) => {
    const trip = currentByVehicle.get(vehicle.id)
    return {
      ...vehicle.toJSON(),
      current_driver: trip?.Driver ? trip.Driver.toJSON() : null,
      current_co_driver: trip?.CoDriver ? trip.CoDriver.toJSON() : null,
      current_trip: trip ? { id: trip.id, status: trip.status, departure_time: trip.departure_time } : null,
      regular_drivers: [...(regularByVehicle.get(vehicle.id)?.values() || [])],
    }
  })
}

const vehicleController = {
  // @desc    Get all vehicles — paginated when `page` is provided, otherwise
  //          the full list (used by Route/Vehicle dropdowns elsewhere).
  // @route   GET /api/vehicles?page=&limit=&search=
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const { search } = req.query
      const where = search
        ? {
            [Op.or]: [
              { license_plate: { [Op.like]: `%${search}%` } },
              { vehicle_type: { [Op.like]: `%${search}%` } },
            ],
          }
        : {}
      const order = [['license_plate', 'ASC']]

      if (!req.query.page) {
        const vehicles = await Vehicle.findAll({ where, order })
        return res.status(200).json(vehicles)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await Vehicle.findAndCountAll({ where, order, limit, offset })
      return res.status(200).json({
        data: await withDriverInfo(rows),
        pagination: buildPaginationMeta(page, limit, count),
      })
    } catch (error) {
      console.error('Lỗi vehicle getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách phương tiện.' })
    }
  },

  // @desc    Get vehicle by ID
  // @route   GET /api/vehicles/:id
  // @access  Private/Staff/Admin
  getById: async (req, res) => {
    try {
      const vehicle = await Vehicle.findByPk(req.params.id)
      if (!vehicle) {
        return res.status(404).json({ message: 'Không tìm thấy xe.' })
      }
      return res.status(200).json(vehicle)
    } catch (error) {
      console.error('Lỗi vehicle getById:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết xe.' })
    }
  },

  // @desc    Admin create new vehicle
  // @route   POST /api/vehicles
  // @access  Private/Admin
  create: async (req, res) => {
    try {
      const { license_plate, vehicle_type, total_seats, seat_layout } = req.body

      // Check plate uniqueness
      const exists = await Vehicle.findOne({ where: { license_plate } })
      if (exists) {
        return res.status(400).json({ message: 'Biển số xe này đã được đăng ký cho phương tiện khác.' })
      }

      const vehicle = await Vehicle.create({
        license_plate,
        vehicle_type,
        total_seats,
        seat_layout,
      })

      return res.status(201).json(vehicle)
    } catch (error) {
      console.error('Lỗi vehicle create:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký xe khách mới.' })
    }
  },

  // @desc    Admin update vehicle
  // @route   PUT /api/vehicles/:id
  // @access  Private/Admin
  update: async (req, res) => {
    try {
      const { license_plate, vehicle_type, total_seats, seat_layout, is_active } = req.body
      const vehicle = await Vehicle.findByPk(req.params.id)

      if (!vehicle) {
        return res.status(404).json({ message: 'Không tìm thấy xe.' })
      }

      // Changing capacity/layout while trips are scheduled/running on this
      // vehicle can invalidate already-sold seat numbers (a ticket could end
      // up pointing at a seat that no longer exists in the new layout).
      const isChangingCapacity = total_seats !== undefined && Number(total_seats) !== vehicle.total_seats
      const isChangingLayout = seat_layout !== undefined && JSON.stringify(seat_layout) !== JSON.stringify(vehicle.seat_layout)

      if (isChangingCapacity || isChangingLayout) {
        const activeTripCount = await Trip.count({
          where: { vehicle_id: vehicle.id, status: { [Op.in]: ['scheduled', 'ongoing'] } },
        })
        if (activeTripCount > 0) {
          return res.status(400).json({
            message: 'Không thể thay đổi tổng số ghế/sơ đồ ghế khi phương tiện đang có chuyến xe lên lịch hoặc đang chạy. Hãy hủy hoặc chờ hoàn thành các chuyến trước.',
          })
        }
      }

      // Check plate uniqueness if changing
      if (license_plate && license_plate !== vehicle.license_plate) {
        const exists = await Vehicle.findOne({ where: { license_plate } })
        if (exists) {
          return res.status(400).json({ message: 'Biển số xe này đã được đăng ký cho phương tiện khác.' })
        }
        vehicle.license_plate = license_plate
      }

      vehicle.vehicle_type = vehicle_type || vehicle.vehicle_type
      vehicle.total_seats = total_seats || vehicle.total_seats
      vehicle.seat_layout = seat_layout !== undefined ? seat_layout : vehicle.seat_layout
      vehicle.is_active = is_active !== undefined ? is_active : vehicle.is_active

      await vehicle.save()
      return res.status(200).json(vehicle)
    } catch (error) {
      console.error('Lỗi vehicle update:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật thông tin xe.' })
    }
  },

  // @desc    Admin delete vehicle
  // @route   DELETE /api/vehicles/:id
  // @access  Private/Admin
  delete: async (req, res) => {
    try {
      const vehicle = await Vehicle.findByPk(req.params.id)
      if (!vehicle) {
        return res.status(404).json({ message: 'Không tìm thấy xe.' })
      }

      // Block deletion when trips exist for this vehicle — cascading the
      // delete would silently wipe Trip rows (and any Tickets/Invoices sold
      // against them). Deactivate the vehicle (is_active: false) instead.
      const tripCount = await Trip.count({ where: { vehicle_id: vehicle.id } })
      if (tripCount > 0) {
        return res.status(400).json({
          message: 'Không thể xóa phương tiện đã có chuyến xe được lập lịch. Hãy vô hiệu hóa phương tiện thay vì xóa.',
        })
      }

      await vehicle.destroy()
      return res.status(200).json({ success: true, message: 'Xóa phương tiện xe thành công.' })
    } catch (error) {
      console.error('Lỗi vehicle delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa phương tiện.' })
    }
  },
}

module.exports = vehicleController
