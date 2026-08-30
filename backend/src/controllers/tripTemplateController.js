const { TripTemplate, Route, Vehicle } = require('../models')
const { generateTripsFromTemplates } = require('../jobs/generateTripsFromTemplates')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')

const tripTemplateController = {
  // @desc    Get all trip templates — paginated when `page` is provided
  // @route   GET /api/trip-templates?page=&limit=
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const include = [Route, Vehicle]
      const order = [['id', 'DESC']]

      if (!req.query.page) {
        const templates = await TripTemplate.findAll({ include, order })
        return res.status(200).json(templates)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await TripTemplate.findAndCountAll({ include, order, limit, offset, distinct: true })
      return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
    } catch (error) {
      console.error('Lỗi trip template getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách mẫu chuyến lặp lại.' })
    }
  },

  // @desc    Get a single trip template
  // @route   GET /api/trip-templates/:id
  // @access  Private/Staff/Admin
  getById: async (req, res) => {
    try {
      const template = await TripTemplate.findByPk(req.params.id, {
        include: [Route, Vehicle],
      })
      if (!template) {
        return res.status(404).json({ message: 'Không tìm thấy mẫu chuyến lặp lại.' })
      }
      return res.status(200).json(template)
    } catch (error) {
      console.error('Lỗi trip template getById:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết mẫu chuyến lặp lại.' })
    }
  },

  // @desc    Admin create new trip template
  // @route   POST /api/trip-templates
  // @access  Private/Admin
  create: async (req, res) => {
    try {
      const {
        route_id, vehicle_id, departure_time_of_day, duration_minutes,
        price, available_seats, days_of_week, is_active,
      } = req.body

      const vehicle = await Vehicle.findByPk(vehicle_id)
      if (!vehicle) {
        return res.status(404).json({ message: 'Không tìm thấy phương tiện đã chọn.' })
      }
      if (available_seats > vehicle.total_seats) {
        return res.status(400).json({
          message: `Số ghế mở bán không được vượt quá tổng số ghế của xe (${vehicle.total_seats}).`,
        })
      }

      const template = await TripTemplate.create({
        route_id,
        vehicle_id,
        departure_time_of_day,
        duration_minutes,
        price,
        available_seats,
        days_of_week,
        is_active: is_active !== undefined ? is_active : true,
      })

      return res.status(201).json(template)
    } catch (error) {
      console.error('Lỗi trip template create:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tạo mẫu chuyến lặp lại.' })
    }
  },

  // @desc    Admin update trip template
  // @route   PUT /api/trip-templates/:id
  // @access  Private/Admin
  update: async (req, res) => {
    try {
      const {
        route_id, vehicle_id, departure_time_of_day, duration_minutes,
        price, available_seats, days_of_week, is_active,
      } = req.body
      const template = await TripTemplate.findByPk(req.params.id)

      if (!template) {
        return res.status(404).json({ message: 'Không tìm thấy mẫu chuyến lặp lại.' })
      }

      const effectiveVehicleId = vehicle_id !== undefined ? vehicle_id : template.vehicle_id
      const effectiveSeats = available_seats !== undefined ? available_seats : template.available_seats

      if (vehicle_id !== undefined || available_seats !== undefined) {
        const vehicle = await Vehicle.findByPk(effectiveVehicleId)
        if (!vehicle) {
          return res.status(404).json({ message: 'Không tìm thấy phương tiện đã chọn.' })
        }
        if (effectiveSeats > vehicle.total_seats) {
          return res.status(400).json({
            message: `Số ghế mở bán không được vượt quá tổng số ghế của xe (${vehicle.total_seats}).`,
          })
        }
      }

      template.route_id = route_id !== undefined ? route_id : template.route_id
      template.vehicle_id = vehicle_id !== undefined ? vehicle_id : template.vehicle_id
      template.departure_time_of_day = departure_time_of_day !== undefined ? departure_time_of_day : template.departure_time_of_day
      template.duration_minutes = duration_minutes !== undefined ? duration_minutes : template.duration_minutes
      template.price = price !== undefined ? price : template.price
      template.available_seats = available_seats !== undefined ? available_seats : template.available_seats
      template.days_of_week = days_of_week !== undefined ? days_of_week : template.days_of_week
      template.is_active = is_active !== undefined ? is_active : template.is_active

      await template.save()
      return res.status(200).json(template)
    } catch (error) {
      console.error('Lỗi trip template update:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật mẫu chuyến lặp lại.' })
    }
  },

  // @desc    Admin delete trip template (generated Trips are kept —
  //          template_id on them is just cleared, see models/index.js)
  // @route   DELETE /api/trip-templates/:id
  // @access  Private/Admin
  delete: async (req, res) => {
    try {
      const template = await TripTemplate.findByPk(req.params.id)
      if (!template) {
        return res.status(404).json({ message: 'Không tìm thấy mẫu chuyến lặp lại.' })
      }

      await template.destroy()
      return res.status(200).json({ success: true, message: 'Xóa mẫu chuyến lặp lại thành công.' })
    } catch (error) {
      console.error('Lỗi trip template delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa mẫu chuyến lặp lại.' })
    }
  },

  // @desc    Force an immediate generation pass instead of waiting for the interval
  // @route   POST /api/trip-templates/generate-now
  // @access  Private/Admin
  generateNow: async (req, res) => {
    try {
      const summary = await generateTripsFromTemplates()
      return res.status(200).json(summary)
    } catch (error) {
      console.error('Lỗi trip template generateNow:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi sinh chuyến xe từ mẫu lặp lại.' })
    }
  },
}

module.exports = tripTemplateController
