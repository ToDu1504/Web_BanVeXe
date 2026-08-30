const { sequelize } = require('../config/db')
const { Ticket, Invoice, Trip } = require('../models')

// Matches the policy advertised on the Cancellation Policy page — self-service
// cancellation requires at least this many hours' notice before departure.
const CANCELLATION_CUTOFF_HOURS = 24

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

      // Advertised cancellation policy: self-service cancellation requires at
      // least 24h notice before departure. Staff/admin can override this.
      if (req.user.role === 'customer' && ticket.Trip) {
        const hoursLeft = (new Date(ticket.Trip.departure_time).getTime() - Date.now()) / (60 * 60 * 1000)
        if (hoursLeft < CANCELLATION_CUTOFF_HOURS) {
          await t.rollback()
          return res.status(400).json({
            message: `Chỉ có thể hủy vé trước giờ khởi hành tối thiểu ${CANCELLATION_CUTOFF_HOURS} giờ.`,
          })
        }
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
}

module.exports = ticketController
