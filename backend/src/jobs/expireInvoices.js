const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { Invoice, Ticket, Trip } = require('../models')

// How long a 'pending' invoice may hold its seats before being auto-cancelled.
// Configurable via .env since the right value depends on the business (e.g.
// longer for cash-at-counter payments, shorter for online-only checkout).
const PENDING_INVOICE_TTL_MINUTES = Number(process.env.PENDING_INVOICE_TTL_MINUTES) || 30
const CHECK_INTERVAL_MS = 5 * 60 * 1000

// Cancels 'pending' invoices older than the TTL and releases their seats,
// mirroring invoiceController.cancelInvoice's transaction/cascade pattern.
// Without this, a customer who starts checkout and never pays (e.g. abandons
// the MoMo redirect) would hold their seats forever.
const expirePendingInvoices = async () => {
  const cutoff = new Date(Date.now() - PENDING_INVOICE_TTL_MINUTES * 60 * 1000)

  const expiredInvoiceIds = await Invoice.findAll({
    where: { payment_status: 'pending', created_at: { [Op.lt]: cutoff } },
    attributes: ['id'],
    raw: true,
  })

  for (const { id } of expiredInvoiceIds) {
    const t = await sequelize.transaction()
    try {
      // Re-fetch and lock inside the transaction in case it was just paid/cancelled.
      const invoice = await Invoice.findByPk(id, {
        include: [Ticket],
        transaction: t,
        lock: t.LOCK.UPDATE,
      })

      if (!invoice || invoice.payment_status !== 'pending') {
        await t.rollback()
        continue
      }

      const tripSeatsToReturn = {}
      for (const ticket of invoice.Tickets) {
        if (ticket.booking_status === 'booked') {
          tripSeatsToReturn[ticket.trip_id] = (tripSeatsToReturn[ticket.trip_id] || 0) + 1
        }
      }

      for (const tripId in tripSeatsToReturn) {
        const trip = await Trip.findByPk(tripId, { transaction: t, lock: t.LOCK.UPDATE })
        if (trip) {
          trip.available_seats += tripSeatsToReturn[tripId]
          await trip.save({ transaction: t })
        }
      }

      await invoice.destroy({ transaction: t })
      await t.commit()
      console.log(`⏱️  Tự động hủy hóa đơn #${id} do quá hạn thanh toán (${PENDING_INVOICE_TTL_MINUTES} phút) và giải phóng ghế.`)
    } catch (error) {
      await t.rollback()
      console.error(`Lỗi khi tự động hủy hóa đơn #${id}:`, error.message)
    }
  }
}

const startExpireInvoicesJob = () => {
  setInterval(() => {
    expirePendingInvoices().catch((error) => {
      console.error('Lỗi job tự động hủy hóa đơn hết hạn:', error.message)
    })
  }, CHECK_INTERVAL_MS)
}

module.exports = { startExpireInvoicesJob, expirePendingInvoices }
