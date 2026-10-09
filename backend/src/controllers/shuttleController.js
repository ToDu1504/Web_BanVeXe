const { Op } = require('sequelize')
const { Trip, Ticket, Invoice, Route, Vehicle, User } = require('../models')
const { mapDbError } = require('../utils/dbErrors')
const {
  SHUTTLE_CUTOFF_MINUTES,
  ELIGIBLE_SHUTTLE_INVOICE,
  countShuttleByTrip,
  estimatePickupTime,
  normalizeAddressKey,
} = require('../utils/shuttle')

const TRIP_INCLUDE = [
  { model: Route, attributes: ['id', 'origin', 'destination', 'origin_station', 'shuttle_enabled'] },
  { model: Vehicle, attributes: ['id', 'license_plate'] },
  { model: User, as: 'Driver', attributes: ['id', 'full_name', 'phone'], required: false },
]

// Khung giờ mặc định cho hàng chờ: từ bây giờ tới +SHUTTLE_CUTOFF_MINUTES.
const resolveWindow = (query) => {
  const from = query.from ? new Date(query.from) : new Date()
  const to = query.to ? new Date(query.to) : new Date(from.getTime() + SHUTTLE_CUTOFF_MINUTES * 60 * 1000)
  return { from, to }
}

const shuttleController = {
  // @desc    Hàng chờ "Cần in danh sách đón" (R6, R7): chuyến đã khóa có khách
  //          đón chưa in / cần in lại / bị hủy sau khi in.
  // @route   GET /api/shuttles/queue?from=&to=
  // @access  Private/Staff/Admin
  getQueue: async (req, res) => {
    try {
      const { from, to } = resolveWindow(req.query)
      const trips = await Trip.findAll({
        where: {
          departure_time: { [Op.gte]: from, [Op.lte]: to },
          shuttle_locked_at: { [Op.ne]: null },
        },
        include: TRIP_INCLUDE,
        order: [['departure_time', 'ASC']],
      })

      const counts = await countShuttleByTrip(trips.map((t) => t.id))

      // Vé trung chuyển thay đổi sau lần in gần nhất (vào/ra danh sách).
      const printedTrips = trips.filter((t) => t.shuttle_list_printed_at)
      const changedTripIds = new Set()
      if (printedTrips.length > 0) {
        const candidates = await Ticket.findAll({
          where: { trip_id: { [Op.in]: printedTrips.map((t) => t.id) }, pickup_type: 'shuttle' },
          include: [{ model: Invoice, attributes: ['id', 'payment_status'] }],
        })
        const printedAt = new Map(printedTrips.map((t) => [t.id, new Date(t.shuttle_list_printed_at).getTime()]))
        for (const ticket of candidates) {
          const since = printedAt.get(ticket.trip_id)
          const touched = ticket.pickup_updated_at && new Date(ticket.pickup_updated_at).getTime() > since
          const cancelledLater = ticket.booking_status === 'cancelled'
            && ticket.cancelled_at && new Date(ticket.cancelled_at).getTime() > since
          // Vé chưa paid chưa từng nằm trong danh sách nên thay đổi của nó không tính.
          if ((touched && ticket.Invoice?.payment_status === 'paid') || cancelledLater) {
            changedTripIds.add(ticket.trip_id)
          }
        }
      }

      const queue = []
      for (const trip of trips) {
        const shuttleCount = counts.get(trip.id) || 0
        const printed = Boolean(trip.shuttle_list_printed_at)
        // Chuyến hủy sau khi in: các vé đón bị hủy theo (cancelled_at > lần in) — bấm "Đã xử lý" (mark-printed) để gỡ khỏi hàng chờ.
        const cancelledAfterPrint = printed && trip.status === 'cancelled' && changedTripIds.has(trip.id)
        const needsReprint = printed && !cancelledAfterPrint && changedTripIds.has(trip.id)
        if (!printed && (shuttleCount === 0 || trip.status === 'cancelled')) continue
        if (printed && !needsReprint && !cancelledAfterPrint) continue
        queue.push({
          ...trip.toJSON(),
          shuttle_count: shuttleCount,
          needs_reprint: needsReprint,
          is_cancelled_after_print: cancelledAfterPrint,
        })
      }

      return res.status(200).json(queue)
    } catch (error) {
      console.error('Lỗi shuttle getQueue:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải hàng chờ in danh sách đón.' })
    }
  },

  // @desc    Dữ liệu tờ in danh sách đón (gộp theo địa chỉ, theo giờ chạy)
  // @route   GET /api/shuttles/pickup-list?trip_ids=1,2 | ?from=&to=
  // @access  Private/Staff/Admin
  getPickupList: async (req, res) => {
    try {
      let where
      if (req.query.trip_ids) {
        const ids = String(req.query.trip_ids).split(',').map(Number).filter(Number.isInteger)
        if (ids.length === 0) return res.status(400).json({ message: 'Danh sách chuyến không hợp lệ.' })
        where = { id: { [Op.in]: ids } }
      } else {
        const { from, to } = resolveWindow(req.query)
        where = { departure_time: { [Op.gte]: from, [Op.lte]: to } }
      }

      const trips = await Trip.findAll({
        where: { ...where, status: { [Op.ne]: 'cancelled' } },
        include: TRIP_INCLUDE,
        order: [['departure_time', 'ASC']],
      })

      const tickets = trips.length === 0 ? [] : await Ticket.findAll({
        where: {
          trip_id: { [Op.in]: trips.map((t) => t.id) },
          booking_status: 'booked',
          pickup_type: 'shuttle',
        },
        include: [ELIGIBLE_SHUTTLE_INVOICE],
        order: [['seat_number', 'ASC']],
      })

      const result = trips.map((trip) => {
        const groups = new Map()
        for (const ticket of tickets.filter((tk) => tk.trip_id === trip.id)) {
          const key = normalizeAddressKey(ticket.pickup_address)
          if (!groups.has(key)) groups.set(key, { address: ticket.pickup_address, passengers: [] })
          groups.get(key).passengers.push({
            id: ticket.id,
            seat_number: ticket.seat_number,
            passenger_name: ticket.passenger_name,
            passenger_phone: ticket.passenger_phone,
            pickup_note: ticket.pickup_note,
          })
        }
        const stops = [...groups.values()].sort((a, b) => a.address.localeCompare(b.address, 'vi'))
        return {
          trip: trip.toJSON(),
          estimated_pickup_time: estimatePickupTime(trip),
          stops,
          passenger_count: stops.reduce((n, s) => n + s.passengers.length, 0),
        }
      }).filter((entry) => entry.passenger_count > 0 || req.query.trip_ids)

      return res.status(200).json(result)
    } catch (error) {
      console.error('Lỗi shuttle getPickupList:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách đón.' })
    }
  },

  // @desc    Đánh dấu đã in danh sách đón (R8)
  // @route   POST /api/shuttles/mark-printed
  // @access  Private/Staff/Admin
  markPrinted: async (req, res) => {
    try {
      const [updated] = await Trip.update(
        { shuttle_list_printed_at: new Date() },
        { where: { id: { [Op.in]: req.body.trip_ids } } },
      )
      return res.status(200).json({ success: true, updated })
    } catch (error) {
      console.error('Lỗi shuttle markPrinted:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi ghi nhận in danh sách đón.' })
    }
  },
}

module.exports = shuttleController
