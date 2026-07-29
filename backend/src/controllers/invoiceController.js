const { sequelize } = require('../config/db')
const { Invoice, Ticket, Trip, Route, Vehicle, User } = require('../models')

const invoiceController = {
  // @desc    Create invoice and tickets with Transaction & Double Booking check
  // @route   POST /api/invoices
  // @access  Private/Customer
  create: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const { total_price, payment_method, tickets } = req.body
      const userId = req.user.id

      if (!tickets || tickets.length === 0) {
        return res.status(400).json({ message: 'Danh sách vé đặt không được để trống.' })
      }

      // Create Invoice
      const invoice = await Invoice.create({
        user_id: userId,
        total_price,
        payment_method,
        payment_status: 'pending',
      }, { transaction: t })

      // Group tickets by trip_id to update available_seats later
      const tripSeatCounts = {}

      // Create Tickets
      for (const tInfo of tickets) {
        const { trip_id, seat_number, passenger_name, passenger_phone, ticket_price } = tInfo

        // Track seats count per trip
        tripSeatCounts[trip_id] = (tripSeatCounts[trip_id] || 0) + 1

        // Insert ticket. UNIQUE(trip_id, seat_number) will trigger error if double-booked
        await Ticket.create({
          invoice_id: invoice.id,
          trip_id,
          seat_number,
          passenger_name,
          passenger_phone,
          ticket_price,
          booking_status: 'booked',
        }, { transaction: t })
      }

      // Update Trip available seats
      for (const tripId in tripSeatCounts) {
        const trip = await Trip.findByPk(tripId, { transaction: t })
        if (!trip) {
          throw new Error(`Không tìm thấy chuyến xe ID ${tripId}`)
        }

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

  // @desc    Get current user's invoices history
  // @route   GET /api/invoices/my
  // @access  Private/Customer
  getMyInvoices: async (req, res) => {
    try {
      const invoices = await Invoice.findAll({
        where: { user_id: req.user.id },
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
        order: [['created_at', 'DESC']],
      })
      return res.status(200).json(invoices)
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
        include: [Ticket],
        transaction: t,
      })

      if (!invoice) {
        return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' })
      }

      // Check owner if customer
      if (req.user.role === 'customer' && invoice.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' })
      }

      // Only allow cancelling pending invoices
      if (invoice.payment_status !== 'pending') {
        return res.status(400).json({ message: 'Chỉ có thể hủy hóa đơn đang chờ thanh toán.' })
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

      // Delete invoice (cascade deletes tickets and releases unique key constraint on trip/seat)
      await invoice.destroy({ transaction: t })

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

  // @desc    Get all invoices (Admin/Staff)
  // @route   GET /api/invoices
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const invoices = await Invoice.findAll({
        include: [
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
        ],
        order: [['created_at', 'DESC']],
      })
      return res.status(200).json(invoices)
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
        return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' })
      }

      const prevStatus = invoice.payment_status
      invoice.payment_status = payment_status
      await invoice.save({ transaction: t })

      // If status is updated to refunded, release the seats and cancel the tickets
      if (payment_status === 'refunded' && prevStatus !== 'refunded') {
        const tripSeatsToReturn = {}
        for (const ticket of invoice.Tickets) {
          if (ticket.booking_status === 'booked') {
            ticket.booking_status = 'cancelled'
            ticket.cancelled_at = new Date()
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
