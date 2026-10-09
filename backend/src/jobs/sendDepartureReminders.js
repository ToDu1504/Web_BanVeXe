const { Op } = require('sequelize')
const { Trip, Ticket, Invoice, User, Route, Vehicle } = require('../models')
const { isMailConfigured, sendDepartureReminder } = require('../services/mailService')

const REMINDER_MINUTES = Number(process.env.DEPARTURE_REMINDER_MINUTES) || 30
const CHECK_INTERVAL_MS = Number(process.env.DEPARTURE_REMINDER_CHECK_INTERVAL_MS) || 60 * 1000

// Tìm chuyến 'scheduled' sắp khởi hành trong REMINDER_MINUTES phút tới mà chưa
// nhắc, gửi 1 mail / hóa đơn cho chủ hóa đơn có vé 'booked'.
const sendDepartureReminders = async () => {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_MINUTES * 60 * 1000)

  const trips = await Trip.findAll({
    where: {
      status: 'scheduled',
      reminder_sent_at: null,
      departure_time: { [Op.gt]: now, [Op.lte]: windowEnd },
    },
    include: [Route, Vehicle],
  })

  let tripsReminded = 0
  let emailsSent = 0

  for (const trip of trips) {
    // Giành quyền xử lý chuyến bằng cập nhật có điều kiện — idempotent kể cả
    // khi hai lượt chạy chồng nhau.
    const [claimed] = await Trip.update(
      { reminder_sent_at: new Date() },
      { where: { id: trip.id, reminder_sent_at: null } },
    )
    if (!claimed) continue

    const tickets = await Ticket.findAll({
      where: { trip_id: trip.id, booking_status: 'booked' },
      include: [{ model: Invoice, include: [{ model: User, attributes: ['id', 'full_name', 'email'] }] }],
      order: [['seat_number', 'ASC']],
    })

    const byInvoice = new Map()
    for (const ticket of tickets) {
      if (!byInvoice.has(ticket.invoice_id)) byInvoice.set(ticket.invoice_id, [])
      byInvoice.get(ticket.invoice_id).push(ticket)
    }

    for (const invoiceTickets of byInvoice.values()) {
      const owner = invoiceTickets[0].Invoice?.User
      if (!owner) continue
      const ok = await sendDepartureReminder({
        to: owner.email,
        customerName: owner.full_name,
        trip,
        tickets: invoiceTickets,
      })
      if (ok) emailsSent++
    }
    tripsReminded++
  }

  return { tripsReminded, emailsSent }
}

const startDepartureReminderJob = () => {
  if (!isMailConfigured()) {
    console.warn('✉️  Chưa cấu hình SMTP (SMTP_HOST/SMTP_USER) — job email nhắc chuyến đã tắt.')
    return
  }

  const run = async () => {
    try {
      const { tripsReminded, emailsSent } = await sendDepartureReminders()
      if (tripsReminded) {
        console.log(`✉️  Nhắc chuyến: ${tripsReminded} chuyến, ${emailsSent} email đã gửi.`)
      }
    } catch (error) {
      console.error('Lỗi job gửi email nhắc chuyến:', error.message)
    }
  }
  run()
  setInterval(run, CHECK_INTERVAL_MS)
}

module.exports = { sendDepartureReminders, startDepartureReminderJob }
