const { Op } = require('sequelize')
const { Trip, Ticket, Invoice, User, Route, Vehicle } = require('../models')
const { isMailConfigured, sendDepartureReminder } = require('../services/mailService')

const REMINDER_MINUTES = Number(process.env.DEPARTURE_REMINDER_MINUTES) || 30
const CHECK_INTERVAL_MS = Number(process.env.DEPARTURE_REMINDER_CHECK_INTERVAL_MS) || 60 * 1000

// Tìm vé 'booked' chưa nhắc của các chuyến 'scheduled' sắp khởi hành trong
// REMINDER_MINUTES phút tới, gửi 1 mail / (hóa đơn, chuyến) cho chủ hóa đơn.
// Đánh dấu theo từng vé (tickets.reminder_sent_at) chứ không theo chuyến, nên vé
// đặt khi chuyến đã lọt vào khung (khách đặt sát giờ) vẫn được nhắc ở lượt sau.
const sendDepartureReminders = async () => {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_MINUTES * 60 * 1000)

  const tickets = await Ticket.findAll({
    where: { booking_status: 'booked', reminder_sent_at: null },
    include: [
      {
        model: Trip,
        required: true,
        where: { status: 'scheduled', departure_time: { [Op.gt]: now, [Op.lte]: windowEnd } },
        include: [Route, Vehicle],
      },
      { model: Invoice, include: [{ model: User, attributes: ['id', 'full_name', 'email'] }] },
    ],
    order: [['trip_id', 'ASC'], ['seat_number', 'ASC']],
  })

  const groups = new Map()
  for (const ticket of tickets) {
    const key = `${ticket.trip_id}:${ticket.invoice_id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(ticket)
  }

  const tripsReminded = new Set()
  let emailsSent = 0

  for (const groupTickets of groups.values()) {
    const { Trip: trip, Invoice: invoice } = groupTickets[0]
    // Giành quyền gửi bằng cập nhật có điều kiện — idempotent kể cả khi hai
    // lượt chạy chồng nhau.
    const [claimed] = await Ticket.update(
      { reminder_sent_at: new Date() },
      { where: { id: groupTickets.map((t) => t.id), reminder_sent_at: null } },
    )
    if (!claimed) continue

    // Giữ trips.reminder_sent_at = lần nhắc đầu tiên của chuyến (tham khảo).
    if (!trip.reminder_sent_at) {
      await Trip.update({ reminder_sent_at: new Date() }, { where: { id: trip.id, reminder_sent_at: null } })
    }
    tripsReminded.add(trip.id)

    const owner = invoice?.User
    if (!owner) continue
    const ok = await sendDepartureReminder({
      to: owner.email,
      customerName: owner.full_name,
      trip,
      tickets: groupTickets,
    })
    if (ok) emailsSent++
  }

  return { tripsReminded: tripsReminded.size, emailsSent }
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
