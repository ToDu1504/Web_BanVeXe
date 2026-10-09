const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { Invoice, Ticket, Trip, Route, Vehicle, User } = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')
const { hasTripDeparted } = require('../utils/tripScheduling')
const { assertShuttleAllowed, normalizePickup } = require('../utils/shuttle')
const { mapDbError } = require('../utils/dbErrors')

// Tài xế của chuyến hiển thị kèm vé (chỉ tên — không lộ SĐT tài xế cho khách).
const TRIP_DRIVER_INCLUDE = { model: User, as: 'Driver', attributes: ['id', 'full_name'] }
const TRIP_CO_DRIVER_INCLUDE = { model: User, as: 'CoDriver', attributes: ['id', 'full_name'] }

// Only these payment_status transitions make business sense:
//   pending  -> paid      (staff confirms cash/MoMo payment received)
//   paid     -> refunded  (staff processes a refund)
// 'refunded' is terminal, and nothing can be "un-paid" or refunded before it
// was ever paid (use cancelInvoice for that — it deletes the pending
// invoice outright instead of leaving a nonsensical refunded record).
const ALLOWED_STATUS_TRANSITIONS = {
  pending: ['paid'],
  paid: ['refunded'],
  refunded: [],
}

const invoiceController = {
  // @desc    Create invoice and tickets with Transaction & Double Booking check
  // @route   POST /api/invoices
  // @access  Private/Customer
  create: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const { payment_method, tickets, customer_id } = req.body

      if (!tickets || tickets.length === 0) {
        await t.rollback()
        return res.status(400).json({ message: 'Danh sách vé đặt không được để trống.' })
      }

      // Ai là chủ hóa đơn: mặc định là người gọi API. Nhân viên/quản trị viên
      // đặt vé hộ khách có thể chỉ định customer_id để hóa đơn gắn đúng vào
      // khách hàng thật thay vì vào tài khoản của chính họ. Khách hàng thường
      // không được phép gán hóa đơn cho người khác.
      let userId = req.user.id
      if (customer_id) {
        if (!['staff', 'admin'].includes(req.user.role)) {
          await t.rollback()
          return res.status(403).json({ message: 'Bạn không có quyền đặt vé cho tài khoản khác.' })
        }
        const targetCustomer = await User.findByPk(customer_id, { transaction: t })
        if (!targetCustomer) {
          await t.rollback()
          return res.status(404).json({ message: 'Không tìm thấy tài khoản khách hàng được chỉ định.' })
        }
        userId = targetCustomer.id
      }

      // Load the trips referenced by the tickets and lock their rows for the
      // duration of the transaction. Price and seat-count math below is
      // derived ONLY from these authoritative rows — client-supplied
      // total_price/ticket_price are ignored so a tampered request can never
      // change what gets charged.
      const tripIds = [...new Set(tickets.map((tk) => tk.trip_id))]
      const trips = await Trip.findAll({
        where: { id: tripIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      })
      const tripsById = new Map(trips.map((trip) => [trip.id, trip]))

      for (const tripId of tripIds) {
        if (!tripsById.has(tripId)) {
          throw new Error(`Không tìm thấy chuyến xe ID ${tripId}`)
        }
        const trip = tripsById.get(tripId)
        if (trip.status !== 'scheduled' || new Date(trip.departure_time).getTime() <= Date.now()) {
          throw new Error(`Chuyến xe ID ${tripId} đã khởi hành hoặc không còn mở bán.`)
        }
      }

      // Xe trung chuyển (R1/R2): chỉ tuyến bật shuttle_enabled và trước mốc chốt
      // (staff/admin được bỏ qua mốc chốt). Ghi pickup_updated_at để danh sách
      // đón biết vé này mới vào.
      const shuttleTripIds = [...new Set(tickets.filter((tk) => tk.pickup_type === 'shuttle').map((tk) => tk.trip_id))]
      if (shuttleTripIds.length > 0) {
        const routeIds = [...new Set(shuttleTripIds.map((id) => tripsById.get(id).route_id))]
        const routes = await Route.findAll({ where: { id: routeIds }, transaction: t })
        const routesById = new Map(routes.map((r) => [r.id, r]))
        for (const tripId of shuttleTripIds) {
          const trip = tripsById.get(tripId)
          assertShuttleAllowed(trip, routesById.get(trip.route_id), { role: req.user.role })
        }
      }

      // Group tickets by trip_id to update available_seats later, and
      // compute the authoritative ticket/total price from Trip.price.
      const tripSeatCounts = {}
      let total_price = 0
      const ticketsToCreate = []

      for (const tInfo of tickets) {
        const { trip_id, seat_number, passenger_name, passenger_phone } = tInfo
        const trip = tripsById.get(trip_id)
        const ticket_price = trip.price

        tripSeatCounts[trip_id] = (tripSeatCounts[trip_id] || 0) + 1
        total_price += Number(ticket_price)

        const pickup = normalizePickup(tInfo)
        ticketsToCreate.push({
          trip_id, seat_number, passenger_name, passenger_phone, ticket_price,
          ...pickup,
          pickup_updated_at: pickup.pickup_type === 'shuttle' ? new Date() : null,
        })
      }

      // Create Invoice
      const invoice = await Invoice.create({
        user_id: userId,
        total_price,
        payment_method,
        payment_status: 'pending',
      }, { transaction: t })

      // Create Tickets. UNIQUE(trip_id, active_seat_number) will trigger error if double-booked
      for (const ticketData of ticketsToCreate) {
        await Ticket.create({
          invoice_id: invoice.id,
          ...ticketData,
          active_seat_number: ticketData.seat_number,
          booking_status: 'booked',
        }, { transaction: t })
      }

      // Update Trip available seats
      for (const tripId in tripSeatCounts) {
        const trip = tripsById.get(Number(tripId))
        const seatsToBook = tripSeatCounts[tripId]
        if (trip.available_seats < seatsToBook) {
          throw new Error('Số lượng ghế trống còn lại không đủ.')
        }

        trip.available_seats -= seatsToBook
        await trip.save({ transaction: t })
      }

      await t.commit()
      return res.status(201).json({
        success: true,
        message: 'Đặt vé xe thành công.',
        invoiceId: invoice.id,
      })
    } catch (error) {
      await t.rollback()
      console.error('Lỗi khi tạo hóa đơn:', error)

      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message })
      }

      // Handle Double Booking Unique Constraint Error
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          message: 'Ghế bạn chọn đã được khách khác đặt trước đó một tích tắc. Vui lòng chọn ghế khác.',
        })
      }

      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({
        message: error.message || 'Lỗi hệ thống khi đặt vé. Vui lòng thử lại.',
      })
    }
  },

  // @desc    Get current user's invoices history — paginated when `page` is provided
  // @route   GET /api/invoices/my?page=&limit=
  // @access  Private/Customer
  getMyInvoices: async (req, res) => {
    try {
      const where = { user_id: req.user.id }
      const include = [
        {
          model: Ticket,
          include: [
            {
              model: Trip,
              include: [Route, Vehicle, TRIP_DRIVER_INCLUDE, TRIP_CO_DRIVER_INCLUDE],
            },
          ],
        },
      ]
      const order = [['created_at', 'DESC']]

      if (!req.query.page) {
        const invoices = await Invoice.findAll({ where, include, order })
        return res.status(200).json(invoices)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await Invoice.findAndCountAll({
        where, include, order, limit, offset, distinct: true,
      })
      return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
    } catch (error) {
      console.error('Lỗi getMyInvoices:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải lịch sử hóa đơn.' })
    }
  },

  // @desc    Cancel entire invoice and release seats
  // @route   DELETE /api/invoices/:id
  // @access  Private/Customer
  cancelInvoice: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [{ model: Ticket, include: [Trip] }],
        transaction: t,
      })

      if (!invoice) {
        await t.rollback()
        return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' })
      }

      // Check owner if customer
      if (req.user.role === 'customer' && invoice.user_id !== req.user.id) {
        await t.rollback()
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' })
      }

      // Cancel/refund is only meaningful once — a refunded invoice has nothing left to release
      if (invoice.payment_status === 'refunded') {
        await t.rollback()
        return res.status(400).json({ message: 'Hóa đơn này đã được hoàn tiền trước đó.' })
      }

      // Khách tự hủy được bất cứ lúc nào TRƯỚC giờ khởi hành — không được hủy
      // (và nhận hoàn tiền) khi có chuyến đã chạy. Staff/admin vẫn được hủy hộ.
      if (req.user.role === 'customer') {
        const departed = invoice.Tickets.some((ticket) => (
          ticket.booking_status === 'booked' && ticket.Trip && hasTripDeparted(ticket.Trip)
        ))
        if (departed) {
          await t.rollback()
          return res.status(400).json({ message: 'Có chuyến xe trong hóa đơn đã khởi hành, không thể hủy.' })
        }
      }

      // Group active tickets to return seats to trip
      const tripSeatsToReturn = {}
      for (const ticket of invoice.Tickets) {
        if (ticket.booking_status === 'booked') {
          tripSeatsToReturn[ticket.trip_id] = (tripSeatsToReturn[ticket.trip_id] || 0) + 1
        }
      }

      // Release seats back to trips
      for (const tripId in tripSeatsToReturn) {
        const trip = await Trip.findByPk(tripId, { transaction: t })
        if (trip) {
          trip.available_seats += tripSeatsToReturn[tripId]
          await trip.save({ transaction: t })
        }
      }

      if (invoice.payment_status === 'paid') {
        // Money was already collected — keep the record as a refund, don't erase it.
        for (const ticket of invoice.Tickets) {
          if (ticket.booking_status === 'booked') {
            ticket.booking_status = 'cancelled'
            ticket.cancelled_at = new Date()
            ticket.active_seat_number = null
            await ticket.save({ transaction: t })
          }
        }
        invoice.payment_status = 'refunded'
        await invoice.save({ transaction: t })
      } else {
        // Still pending — nothing was ever collected, delete outright. FK
        // tickets.invoice_id là RESTRICT: xóa vé trước (giải phóng luôn khóa
        // uq_trip_active_seat), rồi mới xóa hóa đơn.
        await Ticket.destroy({ where: { invoice_id: invoice.id }, transaction: t })
        await invoice.destroy({ transaction: t })
      }

      await t.commit()
      return res.status(200).json({ success: true, message: 'Đã hủy hóa đơn đặt vé thành công và giải phóng ghế trống.' })
    } catch (error) {
      await t.rollback()
      console.error('Lỗi cancelInvoice:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi hủy hóa đơn.' })
    }
  },

  // @desc    Get a single invoice by id
  // @route   GET /api/invoices/:id
  // @access  Private (owner customer, or staff/admin)
  getById: async (req, res) => {
    try {
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [
          {
            model: Ticket,
            include: [
              {
                model: Trip,
                include: [Route, Vehicle, TRIP_DRIVER_INCLUDE, TRIP_CO_DRIVER_INCLUDE],
              },
            ],
          },
        ],
      })

      if (!invoice) {
        return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' })
      }

      if (req.user.role === 'customer' && invoice.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền xem hóa đơn này.' })
      }

      return res.status(200).json(invoice)
    } catch (error) {
      console.error('Lỗi invoice getById:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải hóa đơn.' })
    }
  },

  // @desc    Get all invoices (Admin/Staff) — paginated when `page` is provided
  // @route   GET /api/invoices?page=&limit=&search=&status=
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const { search, status } = req.query
      const andConditions = []

      if (search) {
        const like = `%${search}%`
        // Ticket passenger name/phone are nested one level deeper than the
        // Invoice/User join, so an EXISTS subquery matches them without
        // pulling Ticket into the top-level join (which would multiply rows).
        const ticketMatch = sequelize.literal(
          `EXISTS (SELECT 1 FROM tickets WHERE tickets.invoice_id = Invoice.id ` +
          `AND (tickets.passenger_name LIKE ${sequelize.escape(like)} OR tickets.passenger_phone LIKE ${sequelize.escape(like)}))`
        )
        andConditions.push({
          [Op.or]: [
            sequelize.where(sequelize.cast(sequelize.col('Invoice.id'), 'char'), { [Op.like]: like }),
            { '$User.full_name$': { [Op.like]: like } },
            { '$User.email$': { [Op.like]: like } },
            { '$User.phone$': { [Op.like]: like } },
            ticketMatch,
          ],
        })
      }
      if (status && status !== 'all') {
        andConditions.push({ payment_status: status })
      }

      const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {}
      const include = [
        {
          model: User,
          attributes: ['id', 'full_name', 'email', 'phone'],
        },
        {
          model: Ticket,
          include: [
            {
              model: Trip,
              include: [Route, Vehicle, TRIP_DRIVER_INCLUDE, TRIP_CO_DRIVER_INCLUDE],
            },
          ],
        },
      ]
      const order = [['created_at', 'DESC']]

      if (!req.query.page) {
        const invoices = await Invoice.findAll({ where, include, order })
        return res.status(200).json(invoices)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await Invoice.findAndCountAll({
        where, include, order, limit, offset, distinct: true, subQuery: false,
      })
      return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
    } catch (error) {
      console.error('Lỗi invoices getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách hóa đơn.' })
    }
  },

  // @desc    Update invoice payment status (Staff/Admin)
  // @route   PUT /api/invoices/:id/status
  // @access  Private/Staff/Admin
  updateStatus: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const { payment_status } = req.body
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [Ticket],
        transaction: t,
      })

      if (!invoice) {
        await t.rollback()
        return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' })
      }

      const prevStatus = invoice.payment_status
      if (prevStatus !== payment_status && !ALLOWED_STATUS_TRANSITIONS[prevStatus]?.includes(payment_status)) {
        await t.rollback()
        return res.status(400).json({
          message: `Không thể chuyển trạng thái hóa đơn từ "${prevStatus}" sang "${payment_status}".`,
        })
      }

      invoice.payment_status = payment_status
      if (payment_status === 'paid' && prevStatus !== 'paid') invoice.paid_at = new Date()
      await invoice.save({ transaction: t })

      // Hóa đơn vừa thanh toán: vé trung chuyển của nó giờ mới đủ điều kiện vào
      // danh sách đón (R4/R7).
      if (payment_status === 'paid' && prevStatus !== 'paid') {
        await Ticket.update(
          { pickup_updated_at: new Date() },
          { where: { invoice_id: invoice.id, pickup_type: 'shuttle' }, transaction: t },
        )
      }

      // If status is updated to refunded, release the seats and cancel the tickets
      if (payment_status === 'refunded' && prevStatus !== 'refunded') {
        const tripSeatsToReturn = {}
        for (const ticket of invoice.Tickets) {
          if (ticket.booking_status === 'booked') {
            ticket.booking_status = 'cancelled'
            ticket.cancelled_at = new Date()
            ticket.active_seat_number = null
            await ticket.save({ transaction: t })

            tripSeatsToReturn[ticket.trip_id] = (tripSeatsToReturn[ticket.trip_id] || 0) + 1
          }
        }

        // Return seats
        for (const tripId in tripSeatsToReturn) {
          const trip = await Trip.findByPk(tripId, { transaction: t })
          if (trip) {
            trip.available_seats += tripSeatsToReturn[tripId]
            await trip.save({ transaction: t })
          }
        }
      }

      await t.commit()
      return res.status(200).json({ success: true, message: 'Cập nhật trạng thái hóa đơn thành công.' })
    } catch (error) {
      await t.rollback()
      console.error('Lỗi updateStatus:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật hóa đơn.' })
    }
  },
}

module.exports = invoiceController
