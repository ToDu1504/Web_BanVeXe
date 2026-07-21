const { Route } = require('../models')

const routeController = {
  // @desc    Get all routes
  // @route   GET /api/routes
  // @access  Public/Staff/Admin
  getAll: async (req, res) => {
    try {
      const routes = await Route.findAll({
        order: [['origin', 'ASC'], ['destination', 'ASC']],
      })
      return res.status(200).json(routes)
    } catch (error) {
      console.error('Lỗi route getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách tuyến đường.' })
    }
  },

  // @desc    Get route by ID
  // @route   GET /api/routes/:id
  // @access  Private/Staff/Admin
  getById: async (req, res) => {
    try {
      const route = await Route.findByPk(req.params.id)
      if (!route) {
        return res.status(404).json({ message: 'Không tìm thấy tuyến đường.' })
      }
      return res.status(200).json(route)
    } catch (error) {
      console.error('Lỗi route getById:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết tuyến đường.' })
    }
  },

  // @desc    Admin create new route
  // @route   POST /api/routes
  // @access  Private/Admin
  create: async (req, res) => {
    try {
      const { origin, destination, distance_km, duration_min, base_price } = req.body

      const route = await Route.create({
        origin,
        destination,
        distance_km,
        duration_min,
        base_price,
      })

      return res.status(201).json(route)
    } catch (error) {
      console.error('Lỗi route create:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi thêm tuyến đường.' })
    }
  },

  // @desc    Admin update route
  // @route   PUT /api/routes/:id
  // @access  Private/Admin
  update: async (req, res) => {
    try {
      const { origin, destination, distance_km, duration_min, base_price, is_active } = req.body
      const route = await Route.findByPk(req.params.id)

      if (!route) {
        return res.status(404).json({ message: 'Không tìm thấy tuyến đường.' })
      }

      route.origin = origin || route.origin
      route.destination = destination || route.destination
      route.distance_km = distance_km !== undefined ? distance_km : route.distance_km
      route.duration_min = duration_min !== undefined ? duration_min : route.duration_min
      route.base_price = base_price || route.base_price
      route.is_active = is_active !== undefined ? is_active : route.is_active

      await route.save()
      return res.status(200).json(route)
    } catch (error) {
      console.error('Lỗi route update:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật tuyến đường.' })
    }
  },

  // @desc    Admin delete route
  // @route   DELETE /api/routes/:id
  // @access  Private/Admin
  delete: async (req, res) => {
    try {
      const route = await Route.findByPk(req.params.id)
      if (!route) {
        return res.status(404).json({ message: 'Không tìm thấy tuyến đường.' })
      }

      await route.destroy()
      return res.status(200).json({ success: true, message: 'Xóa tuyến đường thành công.' })
    } catch (error) {
      console.error('Lỗi route delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa tuyến đường.' })
    }
  },
}

module.exports = routeController
