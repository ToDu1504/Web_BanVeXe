const { Op, fn, col } = require('sequelize')
const { sequelize } = require('../config/db')
const {
  Trip, Route, Vehicle, Ticket, Invoice, User, TripIncident, DriverUnavailability,
} = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')
const {
  toVNDateString, startOfVNDay, endOfVNDay, isValidDateString, getVNWeekRange,
} = require('../utils/dateVN')
const { sendIncidentNotice } = require('../services/mailService')
const { tripsOfDriver } = require('../utils/driverScheduling')
const { mapDbError } = require('../utils/dbErrors')

// Tài xế được bấm "Bắt đầu chạy" sớm tối đa bấy nhiêu phút trước giờ khởi hành.
const START_EARLY_MINUTES = 60

const TRIP_INCLUDE = [
  Route,
  Vehicle,
  { model: User, as: 'Driver', attributes: ['id', 'full_name', 'phone'] },
  { model: User, as: 'CoDriver', attributes: ['id', 'full_name', 'phone'] },
]

// Số vé đang 'booked' theo từng chuyến: Map<tripId, { sold, boarded }>
const getTicketCounts = async (tripIds) => {
  const counts = new Map()
  if (tripIds.length === 0) return counts
  const rows = await Ticket.findAll({
    where: { trip_id: { [Op.in]: tripIds }, booking_status: 'booked' },
    attributes: [
      'trip_id',
      [fn('COUNT', col('id')), 'sold'],
      [fn('COUNT', col('boarded_at')), 'boarded'],
    ],
    group: ['trip_id'],
    raw: true,
  })
  for (const row of rows) {
    counts.set(row.trip_id, { sold: Number(row.sold), boarded: Number(row.boarded) })
  }
  return counts
}

// Số sự cố chưa xử lý theo từng chuyến: Map<tripId, count>
const getOpenIncidentCounts = async (tripIds) => {
  const counts = new Map()
  if (tripIds.length === 0) return counts
  const rows = await TripIncident.findAll({
    where: { trip_id: { [Op.in]: tripIds }, resolved_at: null },
    attributes: ['trip_id', [fn('COUNT', col('id')), 'open']],
    group: ['trip_id'],
    raw: true,
  })
  for (const row of rows) counts.set(row.trip_id, Number(row.open))
  return counts
}

// userId: tài xế đang xem — gắn `my_role` ('main' | 'co') cho từng chuyến.
const serializeTrips = async (trips, userId) => {
  const ids = trips.map((t) => t.id)
  const [ticketCounts, incidentCounts] = await Promise.all([getTicketCounts(ids), getOpenIncidentCounts(ids)])
  return trips.map((trip) => {
    const json = trip.toJSON()
    const counts = ticketCounts.get(trip.id) || { sold: 0, boarded: 0 }
    json.sold_seats = counts.sold
    json.boarded_count = counts.boarded
    json.total_seats = trip.Vehicle?.total_seats ?? null
    json.open_incident_count = incidentCounts.get(trip.id) || 0
    json.my_role = trip.driver_id === userId ? 'main' : 'co'
    return json
  })
}

// Tìm chuyến theo :id và đảm bảo tài xế đang đăng nhập là tài xế chính hoặc
// tài xế phụ của chuyến (mainOnly: chỉ tài xế chính — dùng cho Bắt đầu/Hoàn
// thành). Đã tự trả response (404/403) khi không hợp lệ và khi đó trả về null.
const loadOwnedTrip = async (req, res, options = {}, { mainOnly = false } = {}) => {
  const trip = await Trip.findByPk(req.params.id, options)
  if (!trip) {
    res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
    return null
  }
  const isMain = trip.driver_id === req.user.id
  const isCo = trip.co_driver_id === req.user.id
  if (!isMain && !isCo) {
    res.status(403).json({ message: 'Chuyến xe này không được phân công cho bạn.' })
    return null
  }
  if (mainOnly && !isMain) {
    res.status(403).json({ message: 'Chỉ tài xế chính mới được bắt đầu/hoàn thành chuyến.' })
    return null
  }
  return trip
}

const tripDurationMinutes = (trip) => {
  if (!trip.arrival_time) return 0
  return Math.max(Math.round((new Date(trip.arrival_time) - new Date(trip.departure_time)) / 60000), 0)
}

const driverController = {
  // @desc    Lịch chạy của tài xế đang đăng nhập — theo tuần (`week_start`),
  //          hoặc khoảng `from`/`to`; phân trang opt-in khi có `page`.
  // @route   GET /api/driver/trips?week_start=&from=&to=&page=&limit=
  // @access  Private/Driver
  getTrips: async (req, res) => {
    try {
      const { week_start, from, to } = req.query
      const where = { ...tripsOfDriver(req.user.id) }

      if (from || to) {
        where.departure_time = {
          ...(from ? { [Op.gte]: new Date(from) } : {}),
          ...(to ? { [Op.lte]: new Date(to) } : {}),
        }
      } else if (!req.query.page) {
        const { start, end } = getVNWeekRange(week_start)
        where.departure_time = { [Op.between]: [start, end] }
      }

      const order = [['departure_time', 'ASC']]

      if (!req.query.page) {
        const trips = await Trip.findAll({ where, include: TRIP_INCLUDE, order })
        return res.status(200).json(await serializeTrips(trips, req.user.id))
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await Trip.findAndCountAll({
        where, include: TRIP_INCLUDE, order, limit, offset, distinct: true,
      })
      return res.status(200).json({
        data: await serializeTrips(rows, req.user.id),
        pagination: buildPaginationMeta(page, limit, count),
      })
    } catch (error) {
      console.error('Lỗi driver getTrips:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải lịch chạy.' })
    }
  },

  // @desc    Dashboard: chuyến kế tiếp, số chuyến/giờ chạy hôm nay & tuần này,
  //          số sự cố chưa xử lý.
  // @route   GET /api/driver/dashboard
  // @access  Private/Driver
  getDashboard: async (req, res) => {
    try {
      const now = new Date()
      const driverId = req.user.id

      // Ưu tiên chuyến đang chạy; nếu không có thì chuyến sắp khởi hành gần nhất.
      let nextTrip = await Trip.findOne({
        where: { ...tripsOfDriver(driverId), status: 'ongoing' },
        include: TRIP_INCLUDE,
        order: [['departure_time', 'ASC']],
      })
      if (!nextTrip) {
        nextTrip = await Trip.findOne({
          where: { ...tripsOfDriver(driverId), status: 'scheduled', departure_time: { [Op.gte]: now } },
          include: TRIP_INCLUDE,
          order: [['departure_time', 'ASC']],
        })
      }

      const todayStr = toVNDateString(now)
      const { start: weekStart, end: weekEnd } = getVNWeekRange()

      const weekTrips = await Trip.findAll({
        where: {
          ...tripsOfDriver(driverId),
          status: { [Op.ne]: 'cancelled' },
          departure_time: { [Op.between]: [weekStart, weekEnd] },
        },
      })
      const todayStart = startOfVNDay(todayStr)
      const todayEnd = endOfVNDay(todayStr)
      const todayTrips = weekTrips.filter((t) => {
        const dep = new Date(t.departure_time)
        return dep >= todayStart && dep <= todayEnd
      })
      const summarize = (list) => ({
        trips: list.length,
        hours: Math.round((list.reduce((sum, t) => sum + tripDurationMinutes(t), 0) / 60) * 10) / 10,
      })

      const myTripIds = (await Trip.findAll({ where: tripsOfDriver(driverId), attributes: ['id'], raw: true }))
        .map((t) => t.id)
      const openIncidents = myTripIds.length
        ? await TripIncident.count({ where: { trip_id: { [Op.in]: myTripIds }, resolved_at: null } })
        : 0

      let nextTripJson = null
      if (nextTrip) {
        ;[nextTripJson] = await serializeTrips([nextTrip], driverId)
      }

      return res.status(200).json({
        next_trip: nextTripJson,
        today: summarize(todayTrips),
        week: summarize(weekTrips),
        open_incidents: openIncidents,
      })
    } catch (error) {
      console.error('Lỗi driver getDashboard:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải dashboard tài xế.' })
    }
  },

  // @desc    Chi tiết một chuyến của tài xế (kèm sự cố đã báo)
  // @route   GET /api/driver/trips/:id
  // @access  Private/Driver
  getTripById: async (req, res) => {
    try {
      const owned = await loadOwnedTrip(req, res, { include: TRIP_INCLUDE })
      if (!owned) return

      const [serialized] = await serializeTrips([owned], req.user.id)
      const incidents = await TripIncident.findAll({
        where: { trip_id: owned.id },
        order: [['created_at', 'DESC']],
      })
      return res.status(200).json({ ...serialized, incidents })
    } catch (error) {
      console.error('Lỗi driver getTripById:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải chi tiết chuyến.' })
    }
  },

  // @desc    Bấm "Bắt đầu chạy": scheduled → ongoing, ghi giờ xuất bến thực tế
  // @route   POST /api/driver/trips/:id/start
  // @access  Private/Driver
  startTrip: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const trip = await loadOwnedTrip(req, res, { transaction: t, lock: t.LOCK.UPDATE }, { mainOnly: true })
      if (!trip) {
        await t.rollback()
        return
      }

      if (trip.status !== 'scheduled') {
        await t.rollback()
        return res.status(400).json({ message: 'Chỉ có thể bắt đầu chuyến đang ở trạng thái "Đã lên lịch".' })
      }

      const now = new Date()
      const earliest = new Date(new Date(trip.departure_time).getTime() - START_EARLY_MINUTES * 60 * 1000)
      if (now < earliest) {
        await t.rollback()
        return res.status(400).json({
          message: `Chỉ được bắt đầu chuyến từ ${START_EARLY_MINUTES} phút trước giờ khởi hành.`,
        })
      }

      trip.status = 'ongoing'
      trip.actual_departure_at = now
      await trip.save({ transaction: t })
      await t.commit()
      return res.status(200).json(trip)
    } catch (error) {
      await t.rollback()
      console.error('Lỗi driver startTrip:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi bắt đầu chuyến.' })
    }
  },

  // @desc    Bấm "Hoàn thành": ongoing → completed, ghi giờ đến thực tế
  // @route   POST /api/driver/trips/:id/complete
  // @access  Private/Driver
  completeTrip: async (req, res) => {
    const t = await sequelize.transaction()
    try {
      const trip = await loadOwnedTrip(req, res, { transaction: t, lock: t.LOCK.UPDATE }, { mainOnly: true })
      if (!trip) {
        await t.rollback()
        return
      }

      if (trip.status !== 'ongoing') {
        await t.rollback()
        return res.status(400).json({ message: 'Chỉ có thể hoàn thành chuyến đang chạy.' })
      }

      trip.status = 'completed'
      trip.actual_arrival_at = new Date()
      await trip.save({ transaction: t })
      await t.commit()
      return res.status(200).json(trip)
    } catch (error) {
      await t.rollback()
      console.error('Lỗi driver completeTrip:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi hoàn thành chuyến.' })
    }
  },

  // @desc    Báo sự cố / trễ chuyến; tùy chọn gửi mail báo khách có vé booked
  // @route   POST /api/driver/trips/:id/incidents
  // @access  Private/Driver
  createIncident: async (req, res) => {
    try {
      const trip = await loadOwnedTrip(req, res, { include: TRIP_INCLUDE })
      if (!trip) return

      if (!['scheduled', 'ongoing'].includes(trip.status)) {
        return res.status(400).json({ message: 'Chỉ có thể báo sự cố cho chuyến đang chờ hoặc đang chạy.' })
      }

      const { type, delay_minutes, note, notify_passengers } = req.body
      if (type === 'delay' && !delay_minutes) {
        return res.status(400).json({ message: 'Vui lòng nhập số phút dự kiến trễ.' })
      }

      const incident = await TripIncident.create({
        trip_id: trip.id,
        reported_by: req.user.id,
        type,
        delay_minutes: type === 'delay' ? delay_minutes : null,
        note: note || null,
      })

      if (notify_passengers) {
        const tickets = await Ticket.findAll({
          where: { trip_id: trip.id, booking_status: 'booked' },
          include: [{ model: Invoice, include: [{ model: User, attributes: ['id', 'full_name', 'email'] }] }],
        })
        const owners = new Map() // 1 mail / hóa đơn
        for (const ticket of tickets) {
          const owner = ticket.Invoice?.User
          if (owner && !owners.has(ticket.invoice_id)) owners.set(ticket.invoice_id, owner)
        }
        let sent = 0
        for (const owner of owners.values()) {
          const ok = await sendIncidentNotice({
            to: owner.email, customerName: owner.full_name, trip, incident,
          })
          if (ok) sent++
        }
        // Chỉ đánh dấu đã báo khách khi có ít nhất một email thực sự được gửi
        // (không cấu hình SMTP / khách dùng email placeholder thì để NULL).
        if (sent > 0) {
          incident.passengers_notified_at = new Date()
          await incident.save()
        }
        return res.status(201).json({ ...incident.toJSON(), emails_sent: sent })
      }

      return res.status(201).json(incident)
    } catch (error) {
      console.error('Lỗi driver createIncident:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi báo sự cố.' })
    }
  },

  // @desc    Lịch sử chuyến đã hoàn thành + thống kê cá nhân
  // @route   GET /api/driver/history?from=&to=&page=&limit=
  // @access  Private/Driver
  getHistory: async (req, res) => {
    try {
      const { from, to } = req.query
      const where = { ...tripsOfDriver(req.user.id), status: 'completed' }
      if (from || to) {
        where.departure_time = {
          ...(from ? { [Op.gte]: new Date(from) } : {}),
          ...(to ? { [Op.lte]: new Date(to) } : {}),
        }
      }

      const trips = await Trip.findAll({
        where, include: TRIP_INCLUDE, order: [['departure_time', 'DESC']],
      })
      const serialized = await serializeTrips(trips, req.user.id)

      const delays = serialized
        .filter((t) => t.actual_departure_at)
        .map((t) => (new Date(t.actual_departure_at) - new Date(t.departure_time)) / 60000)
      const summary = {
        total_trips: serialized.length,
        total_km: Math.round(serialized.reduce((sum, t) => sum + Number(t.Route?.distance_km || 0), 0)),
        total_boarded: serialized.reduce((sum, t) => sum + t.boarded_count, 0),
        avg_delay_minutes: delays.length
          ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
          : null,
      }

      const monthMap = new Map()
      for (const trip of serialized) {
        const key = toVNDateString(trip.departure_time).slice(0, 7) // YYYY-MM
        monthMap.set(key, (monthMap.get(key) || 0) + 1)
      }
      const by_month = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, trips: count }))

      if (!req.query.page) {
        return res.status(200).json({ data: serialized, summary, by_month })
      }
      const { page, limit, offset } = getPagination(req.query)
      return res.status(200).json({
        data: serialized.slice(offset, offset + limit),
        pagination: buildPaginationMeta(page, limit, serialized.length),
        summary,
        by_month,
      })
    } catch (error) {
      console.error('Lỗi driver getHistory:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải lịch sử chuyến.' })
    }
  },

  // @desc    Xuất lịch tuần dạng iCalendar
  // @route   GET /api/driver/schedule.ics?week_start=
  // @access  Private/Driver
  getScheduleIcs: async (req, res) => {
    try {
      const { start, end } = getVNWeekRange(req.query.week_start)
      const trips = await Trip.findAll({
        where: {
          ...tripsOfDriver(req.user.id),
          status: { [Op.ne]: 'cancelled' },
          departure_time: { [Op.between]: [start, end] },
        },
        include: TRIP_INCLUDE,
        order: [['departure_time', 'ASC']],
      })

      const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
      const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dat Ve Xe Khach//Lich tai xe//VI',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
      ]
      for (const trip of trips) {
        const endAt = trip.arrival_time
          ? new Date(trip.arrival_time)
          : new Date(new Date(trip.departure_time).getTime() + 2 * 60 * 60 * 1000)
        const route = trip.Route ? `${trip.Route.origin} → ${trip.Route.destination}` : `Chuyến #${trip.id}`
        lines.push(
          'BEGIN:VEVENT',
          `UID:trip-${trip.id}@datvexekhach.local`,
          `DTSTAMP:${fmt(new Date())}`,
          `DTSTART:${fmt(trip.departure_time)}`,
          `DTEND:${fmt(endAt)}`,
          `SUMMARY:${esc(route)}`,
          `DESCRIPTION:${esc(`Xe ${trip.Vehicle?.license_plate || ''}`)}`,
          'END:VEVENT',
        )
      }
      lines.push('END:VCALENDAR')

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="lich-chay-${toVNDateString(start)}.ics"`)
      return res.status(200).send(lines.join('\r\n'))
    } catch (error) {
      console.error('Lỗi driver getScheduleIcs:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xuất lịch.' })
    }
  },

  // @desc    Ngày nghỉ đã đăng ký của tôi
  // @route   GET /api/driver/unavailabilities
  // @access  Private/Driver
  getUnavailabilities: async (req, res) => {
    try {
      const rows = await DriverUnavailability.findAll({
        where: { driver_id: req.user.id },
        order: [['start_date', 'DESC']],
      })
      return res.status(200).json(rows)
    } catch (error) {
      console.error('Lỗi driver getUnavailabilities:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách ngày nghỉ.' })
    }
  },

  // @desc    Đăng ký ngày nghỉ — 409 nếu đang được phân công chuyến trong khoảng đó
  // @route   POST /api/driver/unavailabilities
  // @access  Private/Driver
  createUnavailability: async (req, res) => {
    try {
      const { start_date, end_date, reason } = req.body
      if (!isValidDateString(start_date) || !isValidDateString(end_date)) {
        return res.status(400).json({ message: 'Ngày nghỉ không đúng định dạng YYYY-MM-DD.' })
      }
      if (end_date < start_date) {
        return res.status(400).json({ message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.' })
      }
      if (start_date < toVNDateString()) {
        return res.status(400).json({ message: 'Không thể đăng ký nghỉ cho ngày đã qua.' })
      }

      const overlap = await DriverUnavailability.findOne({
        where: {
          driver_id: req.user.id,
          start_date: { [Op.lte]: end_date },
          end_date: { [Op.gte]: start_date },
        },
      })
      if (overlap) {
        return res.status(400).json({ message: 'Khoảng ngày này trùng với một đăng ký nghỉ đã có.' })
      }

      const assignedTrips = await Trip.findAll({
        where: {
          ...tripsOfDriver(req.user.id),
          status: { [Op.in]: ['scheduled', 'ongoing'] },
          departure_time: { [Op.between]: [startOfVNDay(start_date), endOfVNDay(end_date)] },
        },
        include: [Route],
        order: [['departure_time', 'ASC']],
      })
      if (assignedTrips.length > 0) {
        return res.status(409).json({
          message: 'Bạn đang được phân công chuyến trong khoảng ngày này. Hãy nhờ Quản trị viên gỡ phân công trước.',
          trips: assignedTrips.map((trip) => ({
            id: trip.id,
            departure_time: trip.departure_time,
            origin: trip.Route?.origin,
            destination: trip.Route?.destination,
          })),
        })
      }

      const row = await DriverUnavailability.create({
        driver_id: req.user.id,
        start_date,
        end_date,
        reason: reason || null,
      })
      return res.status(201).json(row)
    } catch (error) {
      console.error('Lỗi driver createUnavailability:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký ngày nghỉ.' })
    }
  },

  // @desc    Hủy đăng ký nghỉ (chỉ khi chưa bắt đầu)
  // @route   DELETE /api/driver/unavailabilities/:id
  // @access  Private/Driver
  deleteUnavailability: async (req, res) => {
    try {
      const row = await DriverUnavailability.findByPk(req.params.id)
      if (!row || row.driver_id !== req.user.id) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký nghỉ.' })
      }
      if (row.start_date <= toVNDateString()) {
        return res.status(400).json({ message: 'Chỉ có thể hủy đăng ký nghỉ chưa bắt đầu.' })
      }
      await row.destroy()
      return res.status(200).json({ success: true, message: 'Đã hủy đăng ký nghỉ.' })
    } catch (error) {
      console.error('Lỗi driver deleteUnavailability:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi hủy đăng ký nghỉ.' })
    }
  },
}

module.exports = driverController
