const { Op } = require('sequelize')
const { Trip, User, DriverUnavailability } = require('../models')
const { DEFAULT_TRIP_DURATION_MS, getEffectiveArrivalMs } = require('./tripScheduling')
const { toVNDateString } = require('./dateVN')

// Điều kiện "chuyến có tài xế này" — làm tài xế chính HOẶC tài xế phụ.
const tripsOfDriver = (driverId) => ({ [Op.or]: [{ driver_id: driverId }, { co_driver_id: driverId }] })

// Chuyến khác (không bị hủy) mà tài xế này đang lái (chính hoặc phụ) có khung
// giờ chồng lấn.
const findDriverScheduleConflict = async ({ driverId, departureTime, arrivalTime, excludeTripId, transaction }) => {
  const where = {
    ...tripsOfDriver(driverId),
    status: { [Op.ne]: 'cancelled' },
  }
  if (excludeTripId) where.id = { [Op.ne]: excludeTripId }

  const candidates = await Trip.findAll({ where, transaction })

  const newStart = new Date(departureTime).getTime()
  const newEnd = arrivalTime ? new Date(arrivalTime).getTime() : newStart + DEFAULT_TRIP_DURATION_MS

  return candidates.find((trip) => {
    const existingStart = new Date(trip.departure_time).getTime()
    return existingStart < newEnd && getEffectiveArrivalMs(trip) > newStart
  })
}

// Ngày nghỉ của tài xế bao trùm ngày khởi hành (theo giờ VN), nếu có.
const findDriverUnavailability = async ({ driverId, departureTime, transaction }) => {
  const dateStr = toVNDateString(departureTime)
  return DriverUnavailability.findOne({
    where: {
      driver_id: driverId,
      start_date: { [Op.lte]: dateStr },
      end_date: { [Op.gte]: dateStr },
    },
    transaction,
  })
}

// Kiểm tra có thể phân công `driverId` cho một chuyến hay không. Trả về
// { status, message } nếu KHÔNG hợp lệ, hoặc null nếu hợp lệ.
const validateDriverAssignment = async ({ driverId, departureTime, arrivalTime, excludeTripId, transaction }) => {
  const driver = await User.findByPk(driverId, { transaction })
  if (!driver || driver.role !== 'driver') {
    return { status: 400, message: 'Tài xế được chọn không tồn tại hoặc không có vai trò tài xế.' }
  }
  if (!driver.is_active) {
    return { status: 400, message: 'Tài khoản tài xế đã bị khóa, không thể phân công.' }
  }

  const unavailable = await findDriverUnavailability({ driverId, departureTime, transaction })
  if (unavailable) {
    return { status: 400, message: `Tài xế ${driver.full_name} đã đăng ký nghỉ vào ngày khởi hành của chuyến này.` }
  }

  const conflict = await findDriverScheduleConflict({ driverId, departureTime, arrivalTime, excludeTripId, transaction })
  if (conflict) {
    return {
      status: 400,
      message: `Tài xế ${driver.full_name} đã được phân công chuyến khác (TRIP-${conflict.id}) trong khung giờ trùng lặp.`,
    }
  }

  return null
}

// Kiểm tra cặp tài xế chính + phụ của một chuyến. Trả về { status, message }
// nếu không hợp lệ, null nếu hợp lệ. Chỉ kiểm tra người có id.
const validateDriverPair = async ({ driverId, coDriverId, departureTime, arrivalTime, excludeTripId, transaction }) => {
  if (driverId && coDriverId && Number(driverId) === Number(coDriverId)) {
    return { status: 400, message: 'Tài xế phụ phải khác tài xế chính.' }
  }
  for (const id of [driverId, coDriverId]) {
    if (!id) continue
    const error = await validateDriverAssignment({ driverId: id, departureTime, arrivalTime, excludeTripId, transaction })
    if (error) return error
  }
  return null
}

module.exports = {
  tripsOfDriver,
  findDriverScheduleConflict,
  findDriverUnavailability,
  validateDriverAssignment,
  validateDriverPair,
}
