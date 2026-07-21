const { Vehicle } = require('../models')

const vehicleController = {
  // @desc    Get all vehicles
  // @route   GET /api/vehicles
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const vehicles = await Vehicle.findAll({
        order: [['license_plate', 'ASC']],
      })
      return res.status(200).json(vehicles)
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

      await vehicle.destroy()
      return res.status(200).json({ success: true, message: 'Xóa phương tiện xe thành công.' })
    } catch (error) {
      console.error('Lỗi vehicle delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa phương tiện.' })
    }
  },
}

module.exports = vehicleController
