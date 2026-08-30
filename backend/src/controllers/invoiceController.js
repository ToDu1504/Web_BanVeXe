const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { Invoice, Ticket, Trip, Route, Vehicle, User } = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')

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

// Matches the policy advertised on the Cancellation Policy page — self-service
// cancellation requires at least this many hours' notice before departure.
const CANCELLATION_CUTOFF_HOURS = 24

const invoiceController = {
  // @desc    Create invoice and tickets with Transaction & Double Booking check
  // @route   POST /api/invoices
  // @access  Private/Customer
  create: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const { payment_method, tickets } = req.body
      const userId = req.user.id

      if (!tickets || tickets.length === 0) {
        await t.rollback()
        return res.status(400).json({ message: 'Danh sách vé đặt không được để trống.' })
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

        ticketsToCreate.push({ trip_id, seat_number, passenger_name, passenger_phone, ticket_price })
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

      // Handle Double Booking Unique Constraint Error
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          message: 'Ghế bạn chọn đã được khách khác đặt trước đó một tích tắc. Vui lòng chọn ghế khác.',
        })
      }

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
              include: [Route, Vehicle],
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

      // Advertised cancellation policy (see CancellationPolicy.jsx): self-service
      // cancellation requires at least 24h notice before departure. Staff/admin
      // acting on a customer's behalf can override this.
      if (req.user.role === 'customer') {
        const now = Date.now()
        const tooLate = invoice.Tickets.some((ticket) => (
          ticket.booking_status === 'booked' &&
          ticket.Trip &&
          new Date(ticket.Trip.departure_time).getTime() - now < CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000
        ))
        if (tooLate) {
          await t.rollback()
          return res.status(400).json({
            message: `Chỉ có thể hủy vé trước giờ khởi hành tối thiểu ${CANCELLATION_CUTOFF_HOURS} giờ.`,
          })
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
        // Still pending — nothing was ever collected, delete outright
        // (cascade deletes tickets and releases the trip/seat unique key).
        await invoice.destroy({ transaction: t })
      }

      await t.commit()
      return res.status(200).json({ success: true, message: 'Đã hủy hóa đơn đặt vé thành công và giải phóng ghế trống.' })
    } catch (error) {
      await t.rollback()
      console.error('Lỗi cancelInvoice:', error)
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
                include: [Route, Vehicle],
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
              include: [Route, Vehicle],
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
      await invoice.save({ transaction: t })

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
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật hóa đơn.' })
    }
  },
}

module.exports = invoiceController
