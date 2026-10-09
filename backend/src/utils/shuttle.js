// Xe trung chuyển — quy tắc dùng chung (md/DonKhachTrungChuyen.md, R1–R4).
const { Op } = require('sequelize')
const { sequelize } = require('../config/db')
const { Ticket, Invoice } = require('../models')

const SHUTTLE_CUTOFF_MINUTES = Number(process.env.SHUTTLE_CUTOFF_MINUTES) || 120
const SHUTTLE_PICKUP_LEAD_MINUTES = Number(process.env.SHUTTLE_PICKUP_LEAD_MINUTES) || 60

const cutoffTime = (trip) => new Date(new Date(trip.departure_time).getTime() - SHUTTLE_CUTOFF_MINUTES * 60 * 1000)

// Chuyến đã qua mốc chốt danh sách đón (còn <= SHUTTLE_CUTOFF_MINUTES phút nữa chạy).
const isPastShuttleCutoff = (trip, now = new Date()) => now >= cutoffTime(trip)

const estimatePickupTime = (trip) => new Date(new Date(trip.departure_time).getTime() - SHUTTLE_PICKUP_LEAD_MINUTES * 60 * 1000)

const httpError = (statusCode, message) => {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

// Kiểm tra được phép chọn 'shuttle' cho vé trên chuyến này. Staff/admin được
// bỏ qua mốc chốt (khách gọi điện lên quầy) nhưng không bỏ qua cờ của tuyến.
const assertShuttleAllowed = (trip, route, { role, now = new Date() } = {}) => {
  if (!route?.shuttle_enabled) throw httpError(400, 'Tuyến này không hỗ trợ xe trung chuyển.')
  if (trip.status !== 'scheduled') throw httpError(400, 'Chuyến xe không còn nhận đăng ký xe trung chuyển.')
  const privileged = role === 'staff' || role === 'admin'
  if (!privileged && isPastShuttleCutoff(trip, now)) {
    throw httpError(400, `Đã quá hạn đăng ký xe trung chuyển (trước giờ chạy ${SHUTTLE_CUTOFF_MINUTES} phút).`)
  }
}

// Chuẩn hóa dữ liệu điểm đón theo R2: 'station' xóa trắng địa chỉ/ghi chú.
const normalizePickup = ({ pickup_type, pickup_address, pickup_note }) => {
  if (pickup_type === 'shuttle') {
    return {
      pickup_type: 'shuttle',
      pickup_address: String(pickup_address).trim(),
      pickup_note: pickup_note ? String(pickup_note).trim() || null : null,
    }
  }
  return { pickup_type: 'station', pickup_address: null, pickup_note: null }
}

const normalizeAddressKey = (address) => String(address || '').trim().toLowerCase().replace(/\s+/g, ' ')

// Include hóa đơn cho vé đón hợp lệ (R4): chỉ vé của hóa đơn đã paid.
const ELIGIBLE_SHUTTLE_INVOICE = {
  model: Invoice,
  attributes: ['id', 'payment_status', 'payment_method'],
  where: { payment_status: 'paid' },
  required: true,
}

// Map trip_id -> số vé đón hợp lệ (truy vấn gộp, không include hasMany để không hỏng limit).
const countShuttleByTrip = async (tripIds) => {
  const counts = new Map()
  if (!tripIds.length) return counts
  const rows = await Ticket.findAll({
    where: { trip_id: { [Op.in]: tripIds }, booking_status: 'booked', pickup_type: 'shuttle' },
    include: [{ model: Invoice, attributes: [], where: { payment_status: 'paid' }, required: true }],
    attributes: ['trip_id', [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'n']],
    group: ['trip_id'],
    raw: true,
  })
  for (const row of rows) counts.set(row.trip_id, Number(row.n))
  return counts
}

module.exports = {
  ELIGIBLE_SHUTTLE_INVOICE,
  countShuttleByTrip,
  SHUTTLE_CUTOFF_MINUTES,
  SHUTTLE_PICKUP_LEAD_MINUTES,
  isPastShuttleCutoff,
  estimatePickupTime,
  assertShuttleAllowed,
  normalizePickup,
  normalizeAddressKey,
  cutoffTime,
}
