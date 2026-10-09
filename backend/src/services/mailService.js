const nodemailer = require('nodemailer')
const { formatVNDateTime } = require('../utils/dateVN')

// Thiếu SMTP_HOST/SMTP_USER thì mọi tính năng gửi mail tự tắt (chỉ bỏ qua) —
// server vẫn chạy bình thường, hàm gửi mail không bao giờ throw ra ngoài.
const isMailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)

let transporter = null
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporter
}

// Domain không bao giờ gửi mail tới: email placeholder của khách tạo tại quầy
// (quayve.local) và các domain của tài khoản dữ liệu mẫu (seedData/seedDrivers)
// — tránh job nhắc chuyến gửi hàng loạt mail tới địa chỉ không có thật qua SMTP
// thật. Ghi đè bằng MAIL_SKIP_DOMAINS (phân tách bằng dấu phẩy, để trống = chỉ
// bỏ qua quayve.local).
const SKIP_DOMAINS = (process.env.MAIL_SKIP_DOMAINS ?? 'datvexekhach.vn,khachhang.vn')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)
  .concat('quayve.local')

const isDeliverableEmail = (email) => {
  if (!email) return false
  const domain = String(email).toLowerCase().split('@')[1] || ''
  return !SKIP_DOMAINS.includes(domain)
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

// Gửi 1 email. Trả về true nếu gửi thành công, false nếu bỏ qua/lỗi.
const sendMail = async ({ to, subject, html }) => {
  if (!isMailConfigured()) return false
  if (!isDeliverableEmail(to)) return false
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error(`Lỗi gửi email tới ${to}:`, error.message)
    return false
  }
}

const tripSummaryHtml = (trip) => {
  const route = trip.Route ? `${escapeHtml(trip.Route.origin)} → ${escapeHtml(trip.Route.destination)}` : ''
  const plate = trip.Vehicle ? escapeHtml(trip.Vehicle.license_plate) : ''
  return `
    <ul>
      <li><b>Tuyến:</b> ${route}</li>
      <li><b>Khởi hành:</b> ${formatVNDateTime(trip.departure_time)}</li>
      ${plate ? `<li><b>Biển số xe:</b> ${plate}</li>` : ''}
    </ul>`
}

// Nhắc khách: 1 mail / hóa đơn, liệt kê các ghế của hóa đơn đó trên chuyến.
const sendDepartureReminder = ({ to, customerName, trip, tickets }) => {
  const rows = tickets
    .map((t) => `<li>Ghế <b>${escapeHtml(t.seat_number)}</b> — ${escapeHtml(t.passenger_name)}</li>`)
    .join('')
  return sendMail({
    to,
    subject: `Nhắc chuyến: xe sắp khởi hành lúc ${formatVNDateTime(trip.departure_time)}`,
    html: `
      <p>Xin chào ${escapeHtml(customerName)},</p>
      <p>Chuyến xe của bạn sắp khởi hành. Vui lòng có mặt tại bến sớm.</p>
      ${tripSummaryHtml(trip)}
      <p><b>Vé của bạn:</b></p>
      <ul>${rows}</ul>
      <p>Chúc quý khách thượng lộ bình an!</p>`,
  })
}

const sendDriverAssigned = ({ driver, trip, isCoDriver = false }) => sendMail({
  to: driver.email,
  subject: `Bạn được phân công ${isCoDriver ? 'làm tài xế phụ ' : ''}chuyến ${formatVNDateTime(trip.departure_time)}`,
  html: `
    <p>Xin chào ${escapeHtml(driver.full_name)},</p>
    <p>Bạn vừa được phân công ${isCoDriver ? '<b>làm tài xế phụ</b> cho' : ''} một chuyến xe:</p>
    ${tripSummaryHtml(trip)}
    <p>Xem chi tiết tại mục "Lịch chạy" trong tài khoản tài xế.</p>`,
})

const sendDriverUnassigned = ({ driver, trip }) => sendMail({
  to: driver.email,
  subject: `Hủy phân công chuyến ${formatVNDateTime(trip.departure_time)}`,
  html: `
    <p>Xin chào ${escapeHtml(driver.full_name)},</p>
    <p>Bạn <b>không còn được phân công</b> chuyến xe sau:</p>
    ${tripSummaryHtml(trip)}`,
})

const INCIDENT_LABELS = {
  delay: 'Chuyến xe bị trễ',
  breakdown: 'Xe gặp sự cố kỹ thuật',
  accident: 'Chuyến xe gặp sự cố',
  other: 'Thông báo về chuyến xe',
}

const sendIncidentNotice = ({ to, customerName, trip, incident }) => {
  const label = INCIDENT_LABELS[incident.type] || INCIDENT_LABELS.other
  const delayText = incident.type === 'delay' && incident.delay_minutes
    ? ` — dự kiến trễ khoảng ${escapeHtml(incident.delay_minutes)} phút`
    : ''
  return sendMail({
    to,
    subject: `${label} — ${formatVNDateTime(trip.departure_time)}`,
    html: `
      <p>Xin chào ${escapeHtml(customerName)},</p>
      <p>Nhà xe xin thông báo về chuyến xe của bạn:</p>
      ${tripSummaryHtml(trip)}
      <p><b>${label}</b>${delayText}.</p>
      ${incident.note ? `<p>Ghi chú: ${escapeHtml(incident.note)}</p>` : ''}
      <p>Chúng tôi xin lỗi vì sự bất tiện này.</p>`,
  })
}

module.exports = {
  isMailConfigured,
  isDeliverableEmail,
  sendMail,
  sendDepartureReminder,
  sendDriverAssigned,
  sendDriverUnassigned,
  sendIncidentNotice,
}
