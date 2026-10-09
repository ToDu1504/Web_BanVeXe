const { sequelize } = require('../config/db')
const { Invoice, Ticket, Trip } = require('../models')
const { isPastShuttleCutoff } = require('../utils/shuttle')

// How long a 'pending' invoice may hold its seats before being auto-cancelled.
// Split by payment_method, because the two cases mean very different things:
//  - 'momo': an abandoned online checkout (customer never completed/returned
//    from the MoMo redirect) — clean these up fast.
//  - 'cash': the customer intends to pay at the counter, possibly hours after
//    booking — give them much longer, but never hold a seat past
//    CASH_HOLD_DEPARTURE_BUFFER_MINUTES before departure even if the TTL
//    hasn't elapsed yet, so a near-term trip isn't blocked by a no-show.
const PENDING_INVOICE_TTL_MINUTES = Number(process.env.PENDING_INVOICE_TTL_MINUTES) || 30
const CASH_HOLD_TTL_MINUTES = Number(process.env.CASH_HOLD_TTL_MINUTES) || 120
const CASH_HOLD_DEPARTURE_BUFFER_MINUTES = Number(process.env.CASH_HOLD_DEPARTURE_BUFFER_MINUTES) || 30
const CHECK_INTERVAL_MS = 5 * 60 * 1000

const isExpired = (invoice, now) => {
  // Vé trung chuyển chưa thanh toán không được nằm trong danh sách đã chốt
  // (md/DonKhachTrungChuyen.md R4): hủy ngay khi chuyến của vé đó qua mốc chốt,
  // bất kể cash hay momo.
  const shuttleLocked = invoice.Tickets.some((ticket) => (
    ticket.booking_status === 'booked'
    && ticket.pickup_type === 'shuttle'
    && ticket.Trip
    && isPastShuttleCutoff(ticket.Trip, new Date(now))
  ))
  if (shuttleLocked) return true

  const ageMs = now - new Date(invoice.created_at).getTime()

  if (invoice.payment_method === 'momo') {
    return ageMs > PENDING_INVOICE_TTL_MINUTES * 60 * 1000
  }

  // cash: expired once it's been held too long...
  if (ageMs > CASH_HOLD_TTL_MINUTES * 60 * 1000) return true

  // ...or once any of its trips departs too soon to keep waiting.
  const departureTimes = invoice.Tickets
    .map((ticket) => ticket.Trip?.departure_time)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
  if (departureTimes.length === 0) return false

  const earliestDeparture = Math.min(...departureTimes)
  return earliestDeparture - now < CASH_HOLD_DEPARTURE_BUFFER_MINUTES * 60 * 1000
}

// Cancels 'pending' invoices past their TTL and releases their seats,
// mirroring invoiceController.cancelInvoice's transaction/cascade pattern.
// Without this, a customer who starts checkout and never pays (e.g. abandons
// the MoMo redirect, or never shows up to pay cash at the counter) would
// hold their seats forever.
const expirePendingInvoices = async () => {
  const now = Date.now()

  const pendingInvoices = await Invoice.findAll({
    where: { payment_status: 'pending' },
    include: [{ model: Ticket, include: [Trip] }],
  })

  const expiredIds = pendingInvoices.filter((invoice) => isExpired(invoice, now)).map((invoice) => invoice.id)

  for (const id of expiredIds) {
    const t = await sequelize.transaction()
    try {
      // Re-fetch and lock inside the transaction in case it was just paid/cancelled.
      const invoice = await Invoice.findByPk(id, {
        include: [{ model: Ticket, include: [Trip] }],
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

      const reasonLabel = invoice.Tickets.some((tk) => tk.pickup_type === 'shuttle')
        && invoice.Tickets.some((tk) => tk.Trip && isPastShuttleCutoff(tk.Trip))
        ? 'chưa thanh toán khi chốt danh sách xe trung chuyển'
        : invoice.payment_method === 'momo'
        ? `quá hạn thanh toán MoMo (${PENDING_INVOICE_TTL_MINUTES} phút)`
        : 'quá hạn giữ chỗ thanh toán tại quầy'
      // FK tickets.invoice_id là RESTRICT: xóa vé trước rồi mới xóa hóa đơn.
      await Ticket.destroy({ where: { invoice_id: invoice.id }, transaction: t })
      await invoice.destroy({ transaction: t })
      await t.commit()
      console.log(`⏱️  Tự động hủy hóa đơn #${id} do ${reasonLabel} và giải phóng ghế.`)
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
