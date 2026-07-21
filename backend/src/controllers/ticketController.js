const { sequelize } = require('../config/db')
const { Ticket, Invoice, Trip } = require('../models')

const ticketController = {
  // @desc    Cancel a single ticket of a pending invoice
  // @route   DELETE /api/tickets/:id
  // @access  Private/Customer
  cancelTicket: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const ticket = await Ticket.findByPk(req.params.id, {
        include: [Invoice],
        transaction: t,
      })

      if (!ticket) {
        return res.status(404).json({ message: 'Không tìm thấy vé xe.' })
      }

      // Check owner if customer
      if (req.user.role === 'customer' && ticket.Invoice?.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' })
      }

      // Only allow cancellation for pending invoices
      if (ticket.Invoice?.payment_status !== 'pending') {
        return res.status(400).json({ message: 'Không thể hủy vé của hóa đơn đã thanh toán hoặc hoàn tiền.' })
      }

      if (ticket.booking_status === 'cancelled') {
        return res.status(400).json({ message: 'Vé này đã được hủy trước đó.' })
      }

      // Cancel ticket
      ticket.booking_status = 'cancelled'
      ticket.cancelled_at = new Date()
      await ticket.save({ transaction: t })

      // Release seat in trip
      const trip = await Trip.findByPk(ticket.trip_id, { transaction: t })
      if (trip) {
        trip.available_seats += 1
        await trip.save({ transaction: t })
      }

      // Reduce invoice total price
      const invoice = ticket.Invoice
      invoice.total_price = Math.max(0, parseFloat(invoice.total_price) - parseFloat(ticket.ticket_price))
      await invoice.save({ transaction: t })

      // If all tickets in the invoice are now cancelled, we can delete the invoice
      const activeTicketsCount = await Ticket.count({
        where: { invoice_id: invoice.id, booking_status: 'booked' },
        transaction: t,
      })

      if (activeTicketsCount === 0) {
        await invoice.destroy({ transaction: t })
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
