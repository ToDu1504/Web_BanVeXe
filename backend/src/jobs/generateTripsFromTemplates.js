const { TripTemplate, Trip, Route, Vehicle } = require('../models')
const { findVehicleScheduleConflict } = require('../utils/tripScheduling')

// How many days ahead to keep the schedule filled in.
const TRIP_TEMPLATE_ADVANCE_DAYS = Number(process.env.TRIP_TEMPLATE_ADVANCE_DAYS) || 14
// How often to re-run the generation pass (idempotent, so re-running early
// is harmless — this just controls how quickly a new/edited template gets
// picked up).
const CHECK_INTERVAL_MS = Number(process.env.TRIP_TEMPLATE_CHECK_INTERVAL_MS) || 4 * 60 * 60 * 1000

// "Now"/day-of-week is computed with plain local Date arithmetic, matching
// the rest of the app (expireInvoices.js, statsController.js, seedData.js) —
// this assumes the server process itself runs in the Asia/Ho_Chi_Minh
// timezone, same pre-existing assumption those files already make.
const generateTripsFromTemplates = async () => {
  const summary = {
    created: 0,
    skippedExisting: 0,
    skippedConflict: 0,
    skippedSeats: 0,
    skippedInactiveResource: 0,
  }

  const templates = await TripTemplate.findAll({
    where: { is_active: true },
    include: [Route, Vehicle],
  })

  for (const template of templates) {
    for (let dayOffset = 0; dayOffset <= TRIP_TEMPLATE_ADVANCE_DAYS; dayOffset++) {
      const target = new Date()
      target.setDate(target.getDate() + dayOffset)

      if (!template.days_of_week.includes(target.getDay())) continue

      const [hours, minutes] = template.departure_time_of_day.split(':').map(Number)
      target.setHours(hours, minutes, 0, 0)

      // Skip instances whose time has already passed (relevant for dayOffset 0).
      if (target.getTime() <= Date.now()) continue

      if (!template.Route?.is_active || !template.Vehicle?.is_active) {
        summary.skippedInactiveResource++
        continue
      }

      if (template.available_seats > template.Vehicle.total_seats) {
        summary.skippedSeats++
        continue
      }

      const existing = await Trip.findOne({
        where: { template_id: template.id, departure_time: target },
      })
      if (existing) {
        summary.skippedExisting++
        continue
      }

      const arrivalTime = template.duration_minutes
        ? new Date(target.getTime() + template.duration_minutes * 60000)
        : null

      const conflict = await findVehicleScheduleConflict({
        vehicleId: template.vehicle_id,
        departureTime: target,
        arrivalTime,
      })
      if (conflict) {
        summary.skippedConflict++
        continue
      }

      await Trip.create({
        route_id: template.route_id,
        vehicle_id: template.vehicle_id,
        departure_time: target,
        arrival_time: arrivalTime,
        price: template.price,
        available_seats: template.available_seats,
        status: 'scheduled',
        template_id: template.id,
      })
      summary.created++
    }
  }

  console.log(
    `🔁 Đã sinh chuyến xe từ mẫu lặp lại: tạo mới ${summary.created}, ` +
    `bỏ qua (đã tồn tại) ${summary.skippedExisting}, ` +
    `bỏ qua (trùng lịch xe) ${summary.skippedConflict}, ` +
    `bỏ qua (vượt sức chứa) ${summary.skippedSeats}, ` +
    `bỏ qua (tuyến/xe ngừng hoạt động) ${summary.skippedInactiveResource}.`
  )

  return summary
}

const startGenerateTripsJob = () => {
  // Deliberate deviation from expireInvoices.js's pattern: run once
  // immediately on startup (not just after the first interval) so a server
  // restart doesn't leave the rolling window empty for hours.
  generateTripsFromTemplates().catch((error) => {
    console.error('Lỗi job sinh chuyến từ mẫu lặp lại:', error.message)
  })

  setInterval(() => {
    generateTripsFromTemplates().catch((error) => {
      console.error('Lỗi job sinh chuyến từ mẫu lặp lại:', error.message)
    })
  }, CHECK_INTERVAL_MS)
}

module.exports = { startGenerateTripsJob, generateTripsFromTemplates }
