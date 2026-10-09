const { Op } = require('sequelize')
const { TripTemplate, Trip, Ticket, Route, Vehicle, User } = require('../models')
const { generateTripsFromTemplates } = require('../jobs/generateTripsFromTemplates')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')
const { mapDbError } = require('../utils/dbErrors')

// Tài xế mặc định / tài xế phụ của mẫu: phải là tài khoản tài xế đang hoạt động,
// và tài xế phụ khác tài xế chính. Trả về message lỗi hoặc null.
const validateTemplateDrivers = async (driverId, coDriverId) => {
  if (coDriverId && !driverId) return 'Hãy chọn tài xế chính trước khi chọn tài xế phụ.'
  if (driverId && coDriverId && Number(driverId) === Number(coDriverId)) return 'Tài xế phụ phải khác tài xế chính.'
  for (const id of [driverId, coDriverId]) {
    if (!id) continue
    const driver = await User.findByPk(id)
    if (!driver || driver.role !== 'driver' || !driver.is_active) {
      return 'Tài xế của mẫu chuyến phải là tài khoản tài xế đang hoạt động.'
    }
  }
  return null
}

const tripTemplateController = {
  // @desc    Get all trip templates — paginated when `page` is provided
  // @route   GET /api/trip-templates?page=&limit=
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const include = [
        Route,
        Vehicle,
        { model: User, as: 'Driver', attributes: ['id', 'full_name', 'phone'], required: false },
        { model: User, as: 'CoDriver', attributes: ['id', 'full_name', 'phone'], required: false },
      ]
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
        price, available_seats, days_of_week, driver_id, co_driver_id, is_active,
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

      const driverError = await validateTemplateDrivers(driver_id, co_driver_id)
      if (driverError) return res.status(400).json({ message: driverError })

      const template = await TripTemplate.create({
        route_id,
        vehicle_id,
        departure_time_of_day,
        duration_minutes,
        price,
        available_seats,
        days_of_week,
        driver_id: driver_id || null,
        co_driver_id: co_driver_id || null,
        is_active: is_active !== undefined ? is_active : true,
      })

      // Generate its trips immediately instead of waiting for the next job tick
      await generateTripsFromTemplates()

      return res.status(201).json(template)
    } catch (error) {
      console.error('Lỗi trip template create:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
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
        price, available_seats, days_of_week, driver_id, co_driver_id, is_active,
      } = req.body
      const template = await TripTemplate.findByPk(req.params.id)

      if (!template) {
        return res.status(404).json({ message: 'Không tìm thấy mẫu chuyến lặp lại.' })
      }

      // Chỉ kiểm tra khi đổi tài xế (VD bật/tắt mẫu không cần kiểm tra lại)
      if (driver_id !== undefined || co_driver_id !== undefined) {
        const driverError = await validateTemplateDrivers(
          driver_id !== undefined ? driver_id : template.driver_id,
          co_driver_id !== undefined ? co_driver_id : template.co_driver_id,
        )
        if (driverError) return res.status(400).json({ message: driverError })
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
      if (driver_id !== undefined) template.driver_id = driver_id
      if (co_driver_id !== undefined) template.co_driver_id = co_driver_id
      template.is_active = is_active !== undefined ? is_active : template.is_active

      await template.save()

      // Rebuild the not-yet-sold future trips of this template so the edit
      // shows up in search right away. Without this the old trips stay as-is
      // and, still occupying the vehicle, make the new schedule lose to
      // findVehicleScheduleConflict. Trips that already have tickets are kept
      // untouched so no sold seat/payment history is lost.
      const futureTrips = await Trip.findAll({
        where: {
          template_id: template.id,
          status: 'scheduled',
          departure_time: { [Op.gt]: new Date() },
        },
        include: [{ model: Ticket, attributes: ['id'], required: false }],
      })
      const unsoldIds = futureTrips.filter((trip) => trip.Tickets.length === 0).map((trip) => trip.id)
      if (unsoldIds.length > 0) {
        await Trip.destroy({ where: { id: unsoldIds } })
      }
      await generateTripsFromTemplates()

      return res.status(200).json(template)
    } catch (error) {
      console.error('Lỗi trip template update:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
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
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa mẫu chuyến lặp lại.' })
    }
  },
}

module.exports = tripTemplateController
