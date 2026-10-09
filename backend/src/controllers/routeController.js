const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { Route, Trip } = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')

const routeController = {
  // @desc    Get all routes — paginated when `page` is provided, otherwise
  //          the full list (used by Route/Vehicle dropdowns elsewhere).
  // @route   GET /api/routes?page=&limit=&search=
  // @access  Public/Staff/Admin
  getAll: async (req, res) => {
    try {
      const { search } = req.query
      const where = search
        ? {
            [Op.or]: [
              { origin: { [Op.like]: `%${search}%` } },
              { destination: { [Op.like]: `%${search}%` } },
            ],
          }
        : {}
      const order = [['origin', 'ASC'], ['destination', 'ASC']]

      if (!req.query.page) {
        const routes = await Route.findAll({ where, order })
        return res.status(200).json(routes)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await Route.findAndCountAll({ where, order, limit, offset })
      return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
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
      const { origin, destination, distance_km, duration_min, base_price, create_return } = req.body

      // Tạo cả tuyến đi và tuyến về (B→A) trong cùng một transaction; bỏ qua
      // tuyến về nếu đã tồn tại hoặc điểm đi trùng điểm đến.
      const t = await sequelize.transaction()
      try {
        const route = await Route.create({
          origin,
          destination,
          distance_km,
          duration_min,
          base_price,
        }, { transaction: t })

        let returnRoute = null
        if (create_return !== false && origin !== destination) {
          const existingReturn = await Route.findOne({
            where: { origin: destination, destination: origin },
            transaction: t,
          })
          if (!existingReturn) {
            returnRoute = await Route.create({
              origin: destination,
              destination: origin,
              distance_km,
              duration_min,
              base_price,
            }, { transaction: t })
          }
        }

        await t.commit()
        return res.status(201).json({ route, returnRoute })
      } catch (innerError) {
        await t.rollback()
        throw innerError
      }
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

      // Block deletion when trips exist for this route — cascading the
      // delete would silently wipe Trip rows (and any Tickets/Invoices sold
      // against them). Deactivate the route (is_active: false) instead.
      const tripCount = await Trip.count({ where: { route_id: route.id } })
      if (tripCount > 0) {
        return res.status(400).json({
          message: 'Không thể xóa tuyến đường đã có chuyến xe được lập lịch. Hãy vô hiệu hóa tuyến đường thay vì xóa.',
        })
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
