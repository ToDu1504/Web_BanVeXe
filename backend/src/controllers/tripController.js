const { Op } = require('sequelize')
const { Trip, Route, Vehicle, Ticket } = require('../models')

const tripController = {
  // @desc    Public search trips
  // @route   GET /api/trips/search
  // @access  Public
  search: async (req, res) => {
    try {
      const { origin, destination, date } = req.query

      if (!origin || !destination || !date) {
        return res.status(400).json({ message: 'Thiếu tham số tìm kiếm (origin, destination, date).' })
      }

      // Format date range (start of day to end of day) in Local time (GMT+7)
      const startOfDay = new Date(`${date}T00:00:00.000Z`)
      const endOfDay = new Date(`${date}T23:59:59.999Z`)

      // Adjust offset for timezone check in query (GMT+7 is -7 hours offset from UTC)
      // Since departure_time is saved as DATETIME in MySQL, Op.between works great
      const trips = await Trip.findAll({
        where: {
          departure_time: {
            [Op.between]: [startOfDay, endOfDay],
          },
          status: 'scheduled',
        },
        include: [
          {
            model: Route,
            where: {
              origin,
              destination,
              is_active: true,
            },
          },
          {
            model: Vehicle,
            where: {
              is_active: true,
            },
          },
        ],
        order: [['departure_time', 'ASC']],
      })

      return res.status(200).json(trips)
    } catch (error) {
      console.error('Lỗi trip search:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tìm kiếm chuyến xe.' })
    }
  },

  // @desc    Get trip by ID
  // @route   GET /api/trips/:id
  // @access  Public
  getById: async (req, res) => {
    try {
      const trip = await Trip.findByPk(req.params.id, {
        include: [Route, Vehicle],
      })

      if (!trip) {
        return res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
      }

      return res.status(200).json(trip)
    } catch (error) {
      console.error('Lỗi trip getById:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chi tiết chuyến xe.' })
    }
  },

  // @desc    Get booked seat numbers list for a trip
  // @route   GET /api/trips/:id/booked-seats
  // @access  Public
  getBookedSeats: async (req, res) => {
    try {
      const tickets = await Ticket.findAll({
        where: {
          trip_id: req.params.id,
          booking_status: 'booked',
        },
        attributes: ['seat_number'],
      })

      const seatNumbers = tickets.map((t) => t.seat_number)
      return res.status(200).json(seatNumbers)
    } catch (error) {
      console.error('Lỗi getBookedSeats:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách ghế đã bán.' })
    }
  },

  // @desc    Get all trips (Admin/Staff)
  // @route   GET /api/trips
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const trips = await Trip.findAll({
        include: [Route, Vehicle],
        order: [['departure_time', 'DESC']],
      })
      return res.status(200).json(trips)
    } catch (error) {
      console.error('Lỗi trips getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách tất cả chuyến chạy.' })
    }
  },

  // @desc    Admin create new trip
  // @route   POST /api/trips
  // @access  Private/Admin
  create: async (req, res) => {
    try {
      const { route_id, vehicle_id, departure_time, arrival_time, price, available_seats, status } = req.body

      const trip = await Trip.create({
        route_id,
        vehicle_id,
        departure_time,
        arrival_time,
        price,
        available_seats,
        status: status || 'scheduled',
      })

      return res.status(201).json(trip)
    } catch (error) {
      console.error('Lỗi trip create:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lập lịch chuyến chạy mới.' })
    }
  },

  // @desc    Admin update trip
  // @route   PUT /api/trips/:id
  // @access  Private/Admin
  update: async (req, res) => {
    try {
      const { route_id, vehicle_id, departure_time, arrival_time, price, available_seats, status } = req.body
      const trip = await Trip.findByPk(req.params.id)

      if (!trip) {
        return res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
      }

      trip.route_id = route_id || trip.route_id
      trip.vehicle_id = vehicle_id || trip.vehicle_id
      trip.departure_time = departure_time || trip.departure_time
      trip.arrival_time = arrival_time !== undefined ? arrival_time : trip.arrival_time
      trip.price = price || trip.price
      trip.available_seats = available_seats !== undefined ? available_seats : trip.available_seats
      trip.status = status || trip.status

      await trip.save()
      return res.status(200).json(trip)
    } catch (error) {
      console.error('Lỗi trip update:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật chuyến xe.' })
    }
  },

  // @desc    Admin delete trip
  // @route   DELETE /api/trips/:id
  // @access  Private/Admin
  delete: async (req, res) => {
    try {
      const trip = await Trip.findByPk(req.params.id)
      if (!trip) {
        return res.status(404).json({ message: 'Không tìm thấy chuyến xe.' })
      }

      await trip.destroy()
      return res.status(200).json({ success: true, message: 'Xóa chuyến xe thành công.' })
    } catch (error) {
      console.error('Lỗi trip delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa chuyến xe.' })
    }
  },
}

module.exports = tripController
