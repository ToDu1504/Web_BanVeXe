const { Op } = require('sequelize')
const { Trip, Ticket, Invoice, User, Route, Vehicle } = require('../models')
const { isMailConfigured, sendShuttleNotice, sendStationNotice } = require('../services/mailService')
const { SHUTTLE_CUTOFF_MINUTES, SHUTTLE_PICKUP_LEAD_MINUTES, estimatePickupTime } = require('../utils/shuttle')

const CHECK_INTERVAL_MS = Number(process.env.SHUTTLE_CHECK_INTERVAL_MS) || 60 * 1000

// Khách tự đến bến được nhắc có mặt trước giờ chạy bao nhiêu phút.
const STATION_ARRIVE_EARLY_MINUTES = Number(process.env.STATION_ARRIVE_EARLY_MINUTES) || 30

// Gom vé theo hóa đơn: Map invoice_id -> tickets[].
const groupByInvoice = (tickets) => {
  const byInvoice = new Map()
  for (const ticket of tickets) {
    if (!byInvoice.has(ticket.invoice_id)) byInvoice.set(ticket.invoice_id, [])
    byInvoice.get(ticket.invoice_id).push(ticket)
  }
  return byInvoice
}

const findTripTickets = (trip, pickupType, paymentStatuses) => Ticket.findAll({
  where: { trip_id: trip.id, booking_status: 'booked', pickup_type: pickupType },
  include: [{
    model: Invoice,
    where: { payment_status: { [Op.in]: paymentStatuses } },
    include: [{ model: User, attributes: ['id', 'full_name', 'email'] }],
  }],
  order: [['seat_number', 'ASC']],
})

// Gửi 1 mail / hóa đơn bằng `send(owner, tickets)`; trả về { invoices, emailsSent }.
const mailPerInvoice = async (tickets, send) => {
  const byInvoice = groupByInvoice(tickets)
  let emailsSent = 0
  for (const invoiceTickets of byInvoice.values()) {
    const owner = invoiceTickets[0].Invoice?.User
    if (!owner) continue
    if (await send(owner, invoiceTickets)) emailsSent++
  }
  return { invoices: byInvoice.size, emailsSent }
}

// Gửi mail báo xe trung chuyển cho từng chủ hóa đơn có vé đón (booked + paid)
// của chuyến — 1 mail / hóa đơn. Dùng chung cho job chốt danh sách và nút
// "Gửi mail" ở quầy (POST /api/shuttles/notify). Trả về { invoices, emailsSent }.
const notifyShuttlePassengers = async (trip) => {
  const tickets = await findTripTickets(trip, 'shuttle', ['paid'])
  const pickupTime = estimatePickupTime(trip)
  return mailPerInvoice(tickets, (owner, invoiceTickets) => sendShuttleNotice({
    to: owner.email,
    customerName: owner.full_name,
    trip,
    tickets: invoiceTickets,
    pickupTime,
  }))
}

// Nhắc khách tự đến bến có mặt trước giờ chạy STATION_ARRIVE_EARLY_MINUTES phút
// (nút "Gửi mail" ở quầy). Gồm cả hóa đơn tiền mặt chưa thanh toán — khách vẫn
// cần ra bến (và trả tiền tại quầy). Trả về { invoices, emailsSent }.
const notifyStationPassengers = async (trip) => {
  const tickets = await findTripTickets(trip, 'station', ['paid', 'pending'])
  const arriveBy = new Date(new Date(trip.departure_time).getTime() - STATION_ARRIVE_EARLY_MINUTES * 60 * 1000)
  return mailPerInvoice(tickets, (owner, invoiceTickets) => sendStationNotice({
    to: owner.email,
    customerName: owner.full_name,
    trip,
    tickets: invoiceTickets,
    arriveBy,
  }))
}

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

    const { emailsSent: sent } = await notifyShuttlePassengers(trip)
    emailsSent += sent
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

module.exports = { lockShuttleLists, notifyShuttlePassengers, notifyStationPassengers, startLockShuttleListsJob }
