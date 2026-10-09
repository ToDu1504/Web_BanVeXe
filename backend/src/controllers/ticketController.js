const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { Ticket, Invoice, Trip, Route, Vehicle, User, TicketPrint } = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')
const { hasTripDeparted } = require('../utils/tripScheduling')

const ticketController = {
  // @desc    Cancel a single ticket (of a pending or already-paid invoice)
  // @route   DELETE /api/tickets/:id
  // @access  Private/Customer
  cancelTicket: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const ticket = await Ticket.findByPk(req.params.id, {
        include: [Invoice, Trip],
        transaction: t,
      })

      if (!ticket) {
        await t.rollback()
        return res.status(404).json({ message: 'Không tìm thấy vé xe.' })
      }

      // Check owner if customer
      if (req.user.role === 'customer' && ticket.Invoice?.user_id !== req.user.id) {
        await t.rollback()
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' })
      }

      // A refunded invoice has nothing left to cancel; pending/paid are both fine.
      if (ticket.Invoice?.payment_status === 'refunded') {
        await t.rollback()
        return res.status(400).json({ message: 'Không thể hủy vé của hóa đơn đã được hoàn tiền.' })
      }

      if (ticket.booking_status === 'cancelled') {
        await t.rollback()
        return res.status(400).json({ message: 'Vé này đã được hủy trước đó.' })
      }

      // Khách tự hủy được bất cứ lúc nào TRƯỚC giờ khởi hành — không được hủy
      // (và nhận hoàn tiền) khi chuyến đã chạy. Staff/admin vẫn được hủy hộ.
      if (req.user.role === 'customer' && ticket.Trip && hasTripDeparted(ticket.Trip)) {
        await t.rollback()
        return res.status(400).json({ message: 'Chuyến xe đã khởi hành, không thể hủy vé.' })
      }

      // Cancel ticket
      ticket.booking_status = 'cancelled'
      ticket.cancelled_at = new Date()
      ticket.active_seat_number = null
      await ticket.save({ transaction: t })

      // Release seat in trip
      const trip = ticket.Trip || await Trip.findByPk(ticket.trip_id, { transaction: t })
      if (trip) {
        trip.available_seats += 1
        await trip.save({ transaction: t })
      }

      // Reduce invoice total price
      const invoice = ticket.Invoice
      invoice.total_price = Math.max(0, parseFloat(invoice.total_price) - parseFloat(ticket.ticket_price))
      await invoice.save({ transaction: t })

      // If all tickets in the invoice are now cancelled: a still-pending invoice
      // never collected any money, so delete it outright; a paid one did, so
      // keep the record and mark it refunded instead of erasing it.
      const activeTicketsCount = await Ticket.count({
        where: { invoice_id: invoice.id, booking_status: 'booked' },
        transaction: t,
      })

      if (activeTicketsCount === 0) {
        if (invoice.payment_status === 'paid') {
          invoice.payment_status = 'refunded'
          await invoice.save({ transaction: t })
        } else {
          await invoice.destroy({ transaction: t })
        }
      }

      await t.commit()
      return res.status(200).json({ success: true, message: 'Hủy vé đơn lẻ thành công và giải phóng ghế.' })
    } catch (error) {
      await t.rollback()
      console.error('Lỗi cancelTicket:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi hủy vé.' })
    }
  },

  // @desc    Print a ticket (quầy vé) — only allowed once its invoice is paid.
  //          Every call is recorded in TicketPrint; a ticket printed more than
  //          once requires a `reason` and is flagged as a reprint so staff and
  //          later reconciliation can see it was reissued, not double-sold.
  // @route   POST /api/tickets/:id/print
  // @access  Private/Staff/Admin
  printTicket: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const ticket = await Ticket.findByPk(req.params.id, {
        include: [
          { model: Invoice },
          { model: Trip, include: [Route, Vehicle] },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      })

      if (!ticket) {
        await t.rollback()
        return res.status(404).json({ message: 'Không tìm thấy vé xe.' })
      }

      if (ticket.booking_status !== 'booked') {
        await t.rollback()
        return res.status(400).json({ message: 'Không thể in vé đã hủy.' })
      }

      if (ticket.Invoice?.payment_status !== 'paid') {
        await t.rollback()
        return res.status(400).json({
          message: 'Hóa đơn chưa được thanh toán. Vui lòng cập nhật trạng thái thanh toán trước khi in vé.',
        })
      }

      const reason = req.body?.reason?.trim()
      if (ticket.print_count > 0 && !reason) {
        await t.rollback()
        return res.status(400).json({ message: 'Vé này đã được in trước đó. Vui lòng nhập lý do in lại.' })
      }

      const printSequence = ticket.print_count + 1
      const printType = ticket.print_count === 0 ? 'original' : 'reprint'

      const printRecord = await TicketPrint.create({
        ticket_id: ticket.id,
        invoice_id: ticket.invoice_id,
        printed_by: req.user.id,
        print_type: printType,
        print_sequence: printSequence,
        reason: printType === 'reprint' ? reason : null,
      }, { transaction: t })

      ticket.issued_at = printRecord.printed_at
      ticket.issued_by = req.user.id
      ticket.print_count = printSequence
      await ticket.save({ transaction: t })

      await t.commit()

      return res.status(200).json({
        success: true,
        print: printRecord,
        ticket: {
          id: ticket.id,
          seat_number: ticket.seat_number,
          passenger_name: ticket.passenger_name,
          passenger_phone: ticket.passenger_phone,
          ticket_price: ticket.ticket_price,
          issued_at: ticket.issued_at,
          issued_by: ticket.issued_by,
          print_count: ticket.print_count,
          invoice_id: ticket.invoice_id,
          Trip: ticket.Trip,
        },
      })
    } catch (error) {
      await t.rollback()
      console.error('Lỗi printTicket:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi in vé.' })
    }
  },

  // @desc    Full print history of one ticket (for the "in lại" confirmation
  //          dialog and per-ticket audit).
  // @route   GET /api/tickets/:id/prints
  // @access  Private/Staff/Admin
  getPrintHistory: async (req, res) => {
    try {
      const prints = await TicketPrint.findAll({
        where: { ticket_id: req.params.id },
        include: [{ model: User, as: 'PrintedByUser', attributes: ['id', 'full_name'] }],
        order: [['print_sequence', 'ASC']],
      })
      return res.status(200).json(prints)
    } catch (error) {
      console.error('Lỗi getPrintHistory:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch sử in vé.' })
    }
  },

  // @desc    End-of-shift print reconciliation report — every print in a date
  //          range, optionally filtered to one staff member.
  // @route   GET /api/tickets/prints?from=&to=&printed_by=&page=&limit=
  // @access  Private/Staff/Admin
  getPrintLog: async (req, res) => {
    try {
      const { from, to, printed_by } = req.query

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)

      const where = {
        printed_at: {
          [Op.between]: [
            from ? new Date(from) : startOfToday,
            to ? new Date(to) : endOfToday,
          ],
        },
      }
      // Nhân viên chỉ được xem lượt in của chính mình — bỏ qua mọi printed_by
      // do client gửi lên. Chỉ admin mới được lọc theo nhân viên bất kỳ.
      if (req.user.role === 'admin') {
        if (printed_by) where.printed_by = printed_by
      } else {
        where.printed_by = req.user.id
      }

      const include = [
        { model: User, as: 'PrintedByUser', attributes: ['id', 'full_name'] },
        {
          model: Ticket,
          attributes: ['id', 'seat_number', 'passenger_name', 'passenger_phone'],
          include: [{ model: Trip, attributes: ['id', 'departure_time'], include: [Route] }],
        },
      ]

      if (req.query.page) {
        const { page, limit, offset } = getPagination(req.query)
        const { rows, count } = await TicketPrint.findAndCountAll({
          where,
          include,
          order: [['printed_at', 'DESC']],
          limit,
          offset,
          distinct: true,
        })
        return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
      }

      const prints = await TicketPrint.findAll({ where, include, order: [['printed_at', 'DESC']] })
      return res.status(200).json(prints)
    } catch (error) {
      console.error('Lỗi getPrintLog:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy báo cáo đối soát in vé.' })
    }
  },

  // @desc    Điểm danh khách lên xe (tick/bỏ tick). Tài xế chỉ điểm danh được
  //          vé thuộc chuyến của mình; staff/admin điểm danh được mọi chuyến.
  //          Chỉ áp dụng cho vé 'booked' trên chuyến scheduled/ongoing.
  // @route   PUT /api/tickets/:id/board
  // @access  Private/Driver/Staff/Admin
  setBoarded: async (req, res) => {
    try {
      const { boarded } = req.body
      const ticket = await Ticket.findByPk(req.params.id, { include: [Trip] })
      if (!ticket) {
        return res.status(404).json({ message: 'Không tìm thấy vé.' })
      }

      if (req.user.role === 'driver' && ticket.Trip?.driver_id !== req.user.id && ticket.Trip?.co_driver_id !== req.user.id) {
        return res.status(403).json({ message: 'Vé này không thuộc chuyến được phân công cho bạn.' })
      }
      if (ticket.booking_status !== 'booked') {
        return res.status(400).json({ message: 'Vé đã hủy, không thể điểm danh.' })
      }
      if (!['scheduled', 'ongoing'].includes(ticket.Trip?.status)) {
        return res.status(400).json({ message: 'Chỉ điểm danh được khi chuyến đang chờ hoặc đang chạy.' })
      }

      ticket.boarded_at = boarded ? new Date() : null
      ticket.boarded_by = boarded ? req.user.id : null
      await ticket.save()

      return res.status(200).json({
        id: ticket.id,
        boarded_at: ticket.boarded_at,
        boarded_by: ticket.boarded_by,
      })
    } catch (error) {
      console.error('Lỗi setBoarded:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi điểm danh khách.' })
    }
  },
}

module.exports = ticketController
