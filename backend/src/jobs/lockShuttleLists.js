const { Op } = require('sequelize')
const { Trip, Ticket, Invoice, User, Route, Vehicle } = require('../models')
const { isMailConfigured, sendShuttleNotice } = require('../services/mailService')
const { SHUTTLE_CUTOFF_MINUTES, SHUTTLE_PICKUP_LEAD_MINUTES, estimatePickupTime } = require('../utils/shuttle')

const CHECK_INTERVAL_MS = Number(process.env.SHUTTLE_CHECK_INTERVAL_MS) || 60 * 1000

// Chốt danh sách đón trung chuyển (md/DonKhachTrungChuyen.md R5): chuyến
// 'scheduled' còn <= SHUTTLE_CUTOFF_MINUTES phút nữa chạy mà chưa khóa thì đặt
// shuttle_locked_at (giành quyền bằng UPDATE có điều kiện — idempotent), rồi
// gửi mail báo khách đi trung chuyển (nếu đã cấu hình SMTP). Việc khóa luôn
// chạy, KHÔNG phụ thuộc SMTP — quầy vé vẫn in được danh sách.
const lockShuttleLists = async () => {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + SHUTTLE_CUTOFF_MINUTES * 60 * 1000)

  const trips = await Trip.findAll({
    where: {
      status: 'scheduled',
      shuttle_locked_at: null,
      departure_time: { [Op.gt]: now, [Op.lte]: windowEnd },
    },
    include: [Route, Vehicle],
  })

  let tripsLocked = 0
  let emailsSent = 0

  for (const trip of trips) {
    const [claimed] = await Trip.update(
      { shuttle_locked_at: new Date() },
      { where: { id: trip.id, shuttle_locked_at: null } },
    )
    if (!claimed) continue
    tripsLocked++

    if (!isMailConfigured() || !trip.Route?.shuttle_enabled) continue

    const tickets = await Ticket.findAll({
      where: { trip_id: trip.id, booking_status: 'booked', pickup_type: 'shuttle' },
      include: [{
        model: Invoice,
        where: { payment_status: 'paid' },
        include: [{ model: User, attributes: ['id', 'full_name', 'email'] }],
      }],
      order: [['seat_number', 'ASC']],
    })

    const byInvoice = new Map()
    for (const ticket of tickets) {
      if (!byInvoice.has(ticket.invoice_id)) byInvoice.set(ticket.invoice_id, [])
      byInvoice.get(ticket.invoice_id).push(ticket)
    }

    const pickupTime = estimatePickupTime(trip)
    for (const invoiceTickets of byInvoice.values()) {
      const owner = invoiceTickets[0].Invoice?.User
      if (!owner) continue
      const ok = await sendShuttleNotice({
        to: owner.email,
        customerName: owner.full_name,
        trip,
        tickets: invoiceTickets,
        pickupTime,
      })
      if (ok) emailsSent++
    }
  }

  return { tripsLocked, emailsSent }
}

const startLockShuttleListsJob = () => {
  if (SHUTTLE_CUTOFF_MINUTES <= SHUTTLE_PICKUP_LEAD_MINUTES) {
    console.warn('⚠️  SHUTTLE_CUTOFF_MINUTES nên lớn hơn SHUTTLE_PICKUP_LEAD_MINUTES (và DEPARTURE_REMINDER_MINUTES).')
  }
  const run = async () => {
    try {
      const { tripsLocked, emailsSent } = await lockShuttleLists()
      if (tripsLocked) console.log(`🚐 Chốt danh sách đón: ${tripsLocked} chuyến, ${emailsSent} email đã gửi.`)
    } catch (error) {
      console.error('Lỗi job chốt danh sách đón trung chuyển:', error.message)
    }
  }
  run()
  setInterval(run, CHECK_INTERVAL_MS)
}

module.exports = { lockShuttleLists, startLockShuttleListsJob }
