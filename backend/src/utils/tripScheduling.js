const { Op } = require('sequelize')
const { Trip } = require('../models')

// Fallback overlap-detection window for a trip that has no arrival_time
// recorded yet — not a claim about real trip duration, just enough headroom
// to catch obviously-conflicting bookings on the same vehicle.
const DEFAULT_TRIP_DURATION_MS = 2 * 60 * 60 * 1000

const getEffectiveArrivalMs = (trip) => (
  trip.arrival_time
    ? new Date(trip.arrival_time).getTime()
    : new Date(trip.departure_time).getTime() + DEFAULT_TRIP_DURATION_MS
)

// Returns a conflicting Trip (same vehicle, overlapping time window, not
// cancelled) if one exists, so a vehicle can never be double-booked onto two
// trips running at the same time. Shared by tripController (manual
// create/update) and jobs/generateTripsFromTemplates.js (auto-generation).
const findVehicleScheduleConflict = async ({ vehicleId, departureTime, arrivalTime, excludeTripId, transaction }) => {
  const where = {
    vehicle_id: vehicleId,
    status: { [Op.ne]: 'cancelled' },
  }
  if (excludeTripId) where.id = { [Op.ne]: excludeTripId }

  const candidates = await Trip.findAll({ where, transaction })

  const newStart = new Date(departureTime).getTime()
  const newEnd = arrivalTime ? new Date(arrivalTime).getTime() : newStart + DEFAULT_TRIP_DURATION_MS

  return candidates.find((trip) => {
    const existingStart = new Date(trip.departure_time).getTime()
    const existingEnd = getEffectiveArrivalMs(trip)
    return existingStart < newEnd && existingEnd > newStart
  })
}

// Chuyến đã chạy (đang chạy/hoàn thành) hoặc đã quá giờ khởi hành — khách
// không còn được tự hủy vé.
const hasTripDeparted = (trip) => (
  ['ongoing', 'completed'].includes(trip.status) || new Date(trip.departure_time).getTime() <= Date.now()
)

module.exports = {
  DEFAULT_TRIP_DURATION_MS,
  getEffectiveArrivalMs,
  hasTripDeparted,
  findVehicleScheduleConflict,
}
