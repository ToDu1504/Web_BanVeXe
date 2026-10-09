const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { Trip, Route, Vehicle, Ticket, Invoice, User, TripIncident } = require('../models')
const { findVehicleScheduleConflict } = require('../utils/tripScheduling')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')
const { validateDriverPair } = require('../utils/driverScheduling')
const { sendDriverAssigned, sendDriverUnassigned } = require('../services/mailService')

const DRIVER_ATTRIBUTES = ['id', 'full_name', 'phone', 'email']
// Endpoint công khai (tìm kiếm/chi tiết chuyến) chỉ lộ tên tài xế.
const PUBLIC_DRIVER_INCLUDE = { model: User, as: 'Driver', attributes: ['id', 'full_name'], required: false }
const PUBLIC_CO_DRIVER_INCLUDE = { model: User, as: 'CoDriver', attributes: ['id', 'full_name'], required: false }

// Gắn thêm số sự cố chưa xử lý (open_incident_count) vào từng chuyến để UI
// staff/admin hiện badge cảnh báo — truy vấn riêng thay vì include hasMany để
// không làm hỏng limit/offset của phân trang.
const withOpenIncidentCounts = async (trips) => {
  const ids = trips.map((t) => t.id)
  const counts = new Map()
  if (ids.length > 0) {
    const rows = await TripIncident.findAll({
      where: { trip_id: { [Op.in]: ids }, resolved_at: null },
      attributes: ['trip_id', [sequelize.fn('COUNT', sequelize.col('id')), 'open']],
      group: ['trip_id'],
      raw: true,
    })
    for (const row of rows) counts.set(row.trip_id, Number(row.open))
  }
  return trips.map((trip) => ({ ...trip.toJSON(), open_incident_count: counts.get(trip.id) || 0 }))
}

// Gửi mail phân công cho tài xế mới / hủy phân công cho tài xế cũ. Chạy SAU khi
// đã commit và không bao giờ làm hỏng response (lỗi chỉ log).
// before/after: { driverId, coDriverId } trước và sau khi lưu.
const notifyDriverChange = async ({ trip, before, after }) => {
  try {
    const fullTrip = await Trip.findByPk(trip.id, { include: [Route, Vehicle] })
    if (!fullTrip || fullTrip.status === 'cancelled') return
    const afterIds = [after.driverId, after.coDriverId].filter(Boolean)
    const roles = [
      { id: after.driverId, wasSame: before.driverId === after.driverId, isCoDriver: false },
      { id: after.coDriverId, wasSame: before.coDriverId === after.coDriverId, isCoDriver: true },
    ]
    for (const { id, wasSame, isCoDriver } of roles) {
      if (!id || wasSame) continue
      const driver = await User.findByPk(id)
      if (driver) await sendDriverAssigned({ driver, trip: fullTrip, isCoDriver })
    }
    for (const id of [before.driverId, before.coDriverId]) {
      if (!id || afterIds.includes(id)) continue
      const oldDriver = await User.findByPk(id)
      if (oldDriver) await sendDriverUnassigned({ driver: oldDriver, trip: fullTrip })
    }
  } catch (error) {
    console.error('Lỗi gửi mail phân công tài xế:', error.message)
  }
}

const tripController = {
  // @desc    Public search trips
  // @route   GET /api/trips/search
  // @access  Public
  search: async (req, res) => {
    try {
      const { origin, destination, date } = req.query

      if (!origin || !destination || !date) {
        return res.status(400).json({ message: 'Thiếu tham số tìm kiếm (origin, destination, date).' })
      }

      // departure_time stored as DATETIME (no timezone) in MySQL — compare as local VN time (UTC+7)
      const startOfDay = new Date(`${date}T00:00:00+07:00`)
      const endOfDay = new Date(`${date}T23:59:59.999+07:00`)
      // Never offer trips that have already departed (e.g. searching today's date)
      const now = new Date()
      const where = {
        departure_time: {
          [Op.between]: [startOfDay > now ? startOfDay : now, endOfDay],
        },
        status: 'scheduled',
      }
      const include = [
        {
          model: Route,
          where: {
            origin,
            destination,
            is_active: true,
          },
        },
        {
          model: Vehicle,
          where: {
            is_active: true,
          },
        },
        PUBLIC_DRIVER_INCLUDE,
        PUBLIC_CO_DRIVER_INCLUDE,
      ]
      const order = [['departure_time', 'ASC']]

      if (!req.query.page) {
        const trips = await Trip.findAll({ where, include, order })
        return res.status(200).json(trips)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await Trip.findAndCountAll({
        where, include, order, limit, offset, distinct: true, subQuery: false,
      })
      return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
    } catch (error) {
      console.error('Lỗi trip search:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tìm kiếm chuyến xe.' })
    }
  },

  // @desc    Get trip by ID
  // @route   GET /api/trips/:id
  // @access  Public
  getById: async (req, res) => {
    try {
      const trip = await Trip.findByPk(req.params.id, {
        include: [Route, Vehicle, PUBLIC_DRIVER_INCLUDE, PUBLIC_CO_DRIVER_INCLUDE],
      })

      if (!trip) {
        return res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
      }

      return res.status(200).json(trip)
    } catch (error) {
      console.error('Lỗi trip getById:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết chuyến xe.' })
    }
  },

  // @desc    Get booked seat numbers list for a trip
  // @route   GET /api/trips/:id/booked-seats
  // @access  Public
  getBookedSeats: async (req, res) => {
    try {
      const tickets = await Ticket.findAll({
        where: {
          trip_id: req.params.id,
          booking_status: 'booked',
        },
        attributes: ['seat_number'],
      })

      const seatNumbers = tickets.map((t) => t.seat_number)
      return res.status(200).json(seatNumbers)
    } catch (error) {
      console.error('Lỗi getBookedSeats:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách ghế đã bán.' })
    }
  },

  // @desc    Danh sách hành khách (kèm trạng thái thanh toán & xuất vé) của
  //          một chuyến xe cụ thể — phục vụ nhân viên chuẩn bị chuyến chạy.
  //          Trả về cả vé đã hủy (đánh dấu rõ) để không gây hiểu lầm về sức
  //          chứa còn lại của chuyến.
  // @route   GET /api/trips/:id/tickets
  // @access  Private/Staff/Admin/Driver (tài xế chỉ xem được chuyến của mình)
  getPassengers: async (req, res) => {
    try {
      const trip = await Trip.findByPk(req.params.id, {
        include: [
          Route,
          Vehicle,
          { model: User, as: 'Driver', attributes: ['id', 'full_name', 'phone'] },
          { model: User, as: 'CoDriver', attributes: ['id', 'full_name', 'phone'] },
        ],
      })
      if (!trip) {
        return res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
      }

      const isDriver = req.user.role === 'driver'
      if (isDriver && trip.driver_id !== req.user.id && trip.co_driver_id !== req.user.id) {
        return res.status(403).json({ message: 'Chuyến xe này không được phân công cho bạn.' })
      }

      // Tài xế chỉ cần tên/SĐT/ghế/đã lên xe — không lộ thông tin thanh toán, in vé.
      const tickets = await Ticket.findAll({
        where: { trip_id: req.params.id },
        ...(isDriver
          ? { attributes: ['id', 'seat_number', 'passenger_name', 'passenger_phone', 'booking_status', 'boarded_at'] }
          : { include: [{ model: Invoice, attributes: ['id', 'payment_status', 'payment_method'] }] }),
        order: [['seat_number', 'ASC']],
      })

      return res.status(200).json({ trip, tickets })
    } catch (error) {
      console.error('Lỗi getPassengers:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách hành khách.' })
    }
  },

  // @desc    Get all trips (Admin/Staff) — paginated when `page` is provided.
  //          Sorted soonest-departure-first by default so staff preparing for
  //          an upcoming trip see it at the top instead of buried behind
  //          trips departing weeks out. Optional `from`/`to` narrows to a
  //          departure-time window (e.g. "trips leaving in the next 2h").
  // @route   GET /api/trips?page=&limit=&search=&status=&from=&to=
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const { search, status, from, to } = req.query
      const andConditions = []
      if (search) {
        andConditions.push({
          [Op.or]: [
            { '$Route.origin$': { [Op.like]: `%${search}%` } },
            { '$Route.destination$': { [Op.like]: `%${search}%` } },
            { '$Vehicle.license_plate$': { [Op.like]: `%${search}%` } },
          ],
        })
      }
      if (status && status !== 'all') {
        andConditions.push({ status })
      }
      if (from || to) {
        andConditions.push({
          departure_time: {
            ...(from ? { [Op.gte]: new Date(from) } : {}),
            ...(to ? { [Op.lte]: new Date(to) } : {}),
          },
        })
      }
      const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {}
      const include = [
        Route,
        Vehicle,
        { model: User, as: 'Driver', attributes: DRIVER_ATTRIBUTES, required: false },
        { model: User, as: 'CoDriver', attributes: DRIVER_ATTRIBUTES, required: false },
      ]
      const order = [['departure_time', 'ASC']]

      if (!req.query.page) {
        const trips = await Trip.findAll({ where, include, order })
        return res.status(200).json(await withOpenIncidentCounts(trips))
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await Trip.findAndCountAll({
        where, include, order, limit, offset, distinct: true, subQuery: false,
      })
      return res.status(200).json({
        data: await withOpenIncidentCounts(rows),
        pagination: buildPaginationMeta(page, limit, count),
      })
    } catch (error) {
      console.error('Lỗi trips getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách tất cả chuyến chạy.' })
    }
  },

  // @desc    Admin create new trip
  // @route   POST /api/trips
  // @access  Private/Admin
  create: async (req, res) => {
    try {
      const { route_id, vehicle_id, departure_time, arrival_time, price, available_seats, status, driver_id, co_driver_id } = req.body

      if (new Date(departure_time).getTime() <= Date.now()) {
        return res.status(400).json({ message: 'Giờ khởi hành phải ở trong tương lai.' })
      }

      const vehicle = await Vehicle.findByPk(vehicle_id)
      if (!vehicle) {
        return res.status(404).json({ message: 'Không tìm thấy phương tiện đã chọn.' })
      }
      if (available_seats > vehicle.total_seats) {
        return res.status(400).json({
          message: `Số ghế mở bán không được vượt quá tổng số ghế của xe (${vehicle.total_seats}).`,
        })
      }

      const conflict = await findVehicleScheduleConflict({
        vehicleId: vehicle_id,
        departureTime: departure_time,
        arrivalTime: arrival_time,
      })
      if (conflict) {
        return res.status(400).json({
          message: `Phương tiện đã được lập lịch cho chuyến khác (TRIP-${conflict.id}) trong khung giờ trùng lặp.`,
        })
      }

      if (co_driver_id && !driver_id) {
        return res.status(400).json({ message: 'Hãy chọn tài xế chính trước khi chọn tài xế phụ.' })
      }
      if (driver_id || co_driver_id) {
        const driverError = await validateDriverPair({
          driverId: driver_id,
          coDriverId: co_driver_id,
          departureTime: departure_time,
          arrivalTime: arrival_time,
        })
        if (driverError) {
          return res.status(driverError.status).json({ message: driverError.message })
        }
      }

      const trip = await Trip.create({
        route_id,
        vehicle_id,
        departure_time,
        arrival_time,
        price,
        available_seats,
        status: status || 'scheduled',
        driver_id: driver_id || null,
        co_driver_id: co_driver_id || null,
      })

      if (trip.driver_id || trip.co_driver_id) {
        await notifyDriverChange({
          trip,
          before: { driverId: null, coDriverId: null },
          after: { driverId: trip.driver_id, coDriverId: trip.co_driver_id },
        })
      }

      return res.status(201).json(trip)
    } catch (error) {
      console.error('Lỗi trip create:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lập lịch chuyến chạy mới.' })
    }
  },

  // @desc    Admin update trip
  // @route   PUT /api/trips/:id
  // @access  Private/Admin
  update: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const { route_id, vehicle_id, departure_time, arrival_time, price, available_seats, status, driver_id, co_driver_id } = req.body
      const trip = await Trip.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE })

      if (!trip) {
        await t.rollback()
        return res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
      }

      // Only validate fields that are actually being changed, so editing an
      // already-past/seeded trip's unrelated fields (e.g. price, driver,
      // cancelling it) still works. The admin form always resends
      // departure_time/arrival_time, so compare against the stored values
      // instead of just checking for presence.
      // (minute precision — the form's datetime-local input drops seconds)
      const toMinute = (v) => (v ? Math.floor(new Date(v).getTime() / 60000) : null)
      const sameTime = (a, b) => toMinute(a) === toMinute(b)
      const departureChanged = departure_time !== undefined && !sameTime(departure_time, trip.departure_time)
      const arrivalChanged = arrival_time !== undefined && !sameTime(arrival_time, trip.arrival_time)
      if (departureChanged && new Date(departure_time).getTime() <= Date.now()) {
        await t.rollback()
        return res.status(400).json({ message: 'Giờ khởi hành phải ở trong tương lai.' })
      }

      const effectiveVehicleId = vehicle_id || trip.vehicle_id

      if (available_seats !== undefined) {
        const vehicle = await Vehicle.findByPk(effectiveVehicleId, { transaction: t })
        if (!vehicle) {
          await t.rollback()
          return res.status(404).json({ message: 'Không tìm thấy phương tiện đã chọn.' })
        }
        if (available_seats > vehicle.total_seats) {
          await t.rollback()
          return res.status(400).json({
            message: `Số ghế mở bán không được vượt quá tổng số ghế của xe (${vehicle.total_seats}).`,
          })
        }

        const activeTicketsCount = await Ticket.count({
          where: { trip_id: trip.id, booking_status: 'booked' },
          transaction: t,
        })
        if (available_seats < activeTicketsCount) {
          await t.rollback()
          return res.status(400).json({
            message: `Số ghế mở bán không được nhỏ hơn số vé đã bán hiện tại (${activeTicketsCount}).`,
          })
        }
      }

      const vehicleChanged = vehicle_id !== undefined && Number(vehicle_id) !== trip.vehicle_id
      if (vehicleChanged || departureChanged || arrivalChanged) {
        const conflict = await findVehicleScheduleConflict({
          vehicleId: effectiveVehicleId,
          departureTime: departure_time || trip.departure_time,
          arrivalTime: arrival_time !== undefined ? arrival_time : trip.arrival_time,
          excludeTripId: trip.id,
          transaction: t,
        })
        if (conflict) {
          await t.rollback()
          return res.status(400).json({
            message: `Phương tiện đã được lập lịch cho chuyến khác (TRIP-${conflict.id}) trong khung giờ trùng lặp.`,
          })
        }
      }

      // Tài xế: kiểm tra khi đổi tài xế, hoặc khi đổi giờ của chuyến đã có tài
      // xế (tránh trùng lịch/ngày nghỉ). Bỏ qua nếu chuyến bị hủy.
      const before = { driverId: trip.driver_id, coDriverId: trip.co_driver_id }
      const effectiveDriverId = driver_id !== undefined ? driver_id : trip.driver_id
      const effectiveCoDriverId = co_driver_id !== undefined ? co_driver_id : trip.co_driver_id
      const willBeCancelled = (status || trip.status) === 'cancelled'
      const driverChanged = effectiveDriverId !== before.driverId || effectiveCoDriverId !== before.coDriverId
      const timingChanged = departureChanged || arrivalChanged
      if (effectiveCoDriverId && !effectiveDriverId) {
        await t.rollback()
        return res.status(400).json({ message: 'Hãy chọn tài xế chính trước khi chọn tài xế phụ.' })
      }
      if ((effectiveDriverId || effectiveCoDriverId) && !willBeCancelled && (driverChanged || timingChanged)) {
        const driverError = await validateDriverPair({
          driverId: effectiveDriverId,
          coDriverId: effectiveCoDriverId,
          departureTime: departure_time || trip.departure_time,
          arrivalTime: arrival_time !== undefined ? arrival_time : trip.arrival_time,
          excludeTripId: trip.id,
          transaction: t,
        })
        if (driverError) {
          await t.rollback()
          return res.status(driverError.status).json({ message: driverError.message })
        }
      }

      const isCancelling = status === 'cancelled' && trip.status !== 'cancelled'

      trip.route_id = route_id || trip.route_id
      trip.vehicle_id = vehicle_id || trip.vehicle_id
      trip.departure_time = departure_time || trip.departure_time
      trip.arrival_time = arrival_time !== undefined ? arrival_time : trip.arrival_time
      trip.price = price || trip.price
      trip.available_seats = available_seats !== undefined ? available_seats : trip.available_seats
      trip.status = status || trip.status
      if (driver_id !== undefined) trip.driver_id = driver_id
      if (co_driver_id !== undefined) trip.co_driver_id = co_driver_id

      await trip.save({ transaction: t })

      if (isCancelling) {
        // Cancelling a trip means no one is riding it anymore — cascade-cancel
        // every active ticket and refund/void the invoices that paid for
        // them, instead of leaving customers holding tickets for a trip that
        // no longer runs.
        const tickets = await Ticket.findAll({
          where: { trip_id: trip.id, booking_status: 'booked' },
          transaction: t,
        })

        const affectedInvoiceIds = new Set()
        for (const ticket of tickets) {
          ticket.booking_status = 'cancelled'
          ticket.cancelled_at = new Date()
          ticket.active_seat_number = null
          await ticket.save({ transaction: t })
          affectedInvoiceIds.add(ticket.invoice_id)
        }

        for (const invoiceId of affectedInvoiceIds) {
          const invoice = await Invoice.findByPk(invoiceId, {
            include: [Ticket],
            transaction: t,
          })
          if (!invoice) continue

          const stillActive = invoice.Tickets.some((tk) => tk.booking_status === 'booked')
          if (stillActive) {
            // Invoice also covers tickets on other trips — just drop this
            // trip's share of the total instead of touching invoice status.
            const activeTotal = invoice.Tickets
              .filter((tk) => tk.booking_status === 'booked')
              .reduce((sum, tk) => sum + Number(tk.ticket_price), 0)
            invoice.total_price = activeTotal
            await invoice.save({ transaction: t })
          } else if (invoice.payment_status === 'paid') {
            invoice.payment_status = 'refunded'
            await invoice.save({ transaction: t })
          } else if (invoice.payment_status === 'pending') {
            await invoice.destroy({ transaction: t })
          }
        }
      }

      await t.commit()

      if (driverChanged) {
        await notifyDriverChange({ trip, before, after: { driverId: trip.driver_id, coDriverId: trip.co_driver_id } })
      }

      return res.status(200).json(trip)
    } catch (error) {
      await t.rollback()
      console.error('Lỗi trip update:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật chuyến xe.' })
    }
  },

  // @desc    Admin delete trip
  // @route   DELETE /api/trips/:id
  // @access  Private/Admin
  delete: async (req, res) => {
    try {
      const trip = await Trip.findByPk(req.params.id)
      if (!trip) {
        return res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
      }

      // Block deletion when tickets exist for this trip — cascading the
      // delete would silently wipe paid Ticket rows out from under their
      // Invoice, destroying financial/audit history. Cancel the trip
      // (status: 'cancelled') instead of deleting it.
      const ticketCount = await Ticket.count({ where: { trip_id: trip.id } })
      if (ticketCount > 0) {
        return res.status(400).json({
          message: 'Không thể xóa chuyến xe đã có vé được đặt. Hãy chuyển trạng thái chuyến xe sang "Đã hủy" thay vì xóa.',
        })
      }

      await trip.destroy()
      return res.status(200).json({ success: true, message: 'Xóa chuyến xe thành công.' })
    } catch (error) {
      console.error('Lỗi trip delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa chuyến xe.' })
    }
  },
}

module.exports = tripController
