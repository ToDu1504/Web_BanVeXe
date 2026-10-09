const crypto = require('crypto')
const { Op } = require('sequelize')
const {
  User, Invoice, Trip, TripTemplate, DriverUnavailability, TicketPrint, TripIncident,
} = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')
const { DEFAULT_TRIP_DURATION_MS, getEffectiveArrivalMs } = require('../utils/tripScheduling')
const { toVNDateString, isValidDateString } = require('../utils/dateVN')
const { mapDbError } = require('../utils/dbErrors')

// Số chuyến sắp/đang chạy còn gắn với tài xế — chặn xóa/đổi role khi > 0.
const countActiveDriverTrips = (driverId) => Trip.count({
  where: {
    [Op.or]: [{ driver_id: driverId }, { co_driver_id: driverId }],
    status: { [Op.in]: ['scheduled', 'ongoing'] },
  },
})

const userController = {
  // @desc    Get all users — paginated when `page` is provided
  // @route   GET /api/users?page=&limit=&search=&role=
  // @access  Private/Admin
  getAll: async (req, res) => {
    try {
      const { search, role } = req.query
      const where = {}
      if (search) {
        where[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ]
      }
      if (role && role !== 'all') {
        where.role = role
      }
      const order = [['created_at', 'DESC']]
      const attributes = { exclude: ['password'] }

      if (!req.query.page) {
        const users = await User.findAll({ where, attributes, order })
        return res.status(200).json(users)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await User.findAndCountAll({ where, attributes, order, limit, offset })
      return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
    } catch (error) {
      console.error('Lỗi user getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách tài khoản.' })
    }
  },

  // @desc    Admin create new user
  // @route   POST /api/users
  // @access  Private/Admin
  create: async (req, res) => {
    try {
      const { full_name, email, phone, password, role } = req.body

      const userExists = await User.findOne({ where: { email } })
      if (userExists) {
        return res.status(400).json({ message: 'Email này đã tồn tại trên hệ thống.' })
      }

      const user = await User.create({
        full_name,
        email,
        phone,
        password,
        role: role || 'customer',
      })

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản người dùng thành công.',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_active: user.is_active,
        },
      })
    } catch (error) {
      console.error('Lỗi user create:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi tạo tài khoản.' })
    }
  },

  // @desc    Admin update user role
  // @route   PUT /api/users/:id/role
  // @access  Private/Admin
  updateRole: async (req, res) => {
    try {
      const { role } = req.body
      const user = await User.findByPk(req.params.id)

      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng.' })
      }

      // Check if admin is trying to update their own role
      if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Bạn không thể tự đổi quyền hạn của bản thân.' })
      }

      // Không đổi role một tài xế đang còn chuyến được phân công — sẽ để lại
      // chuyến gắn với người không còn là tài xế.
      if (user.role === 'driver' && role !== 'driver' && await countActiveDriverTrips(user.id) > 0) {
        return res.status(400).json({
          message: 'Tài xế này vẫn còn chuyến được phân công (đang chờ/đang chạy). Hãy gỡ phân công trước khi đổi vai trò.',
        })
      }

      user.role = role
      await user.save()

      return res.status(200).json({ success: true, message: 'Cập nhật phân quyền thành công.', user })
    } catch (error) {
      console.error('Lỗi user updateRole:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi đổi vai trò.' })
    }
  },

  // @desc    Admin lock/unlock user status
  // @route   PUT /api/users/:id/status
  // @access  Private/Admin
  updateStatus: async (req, res) => {
    try {
      const { is_active } = req.body
      const user = await User.findByPk(req.params.id)

      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng.' })
      }

      // Cannot lock self
      if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Bạn không thể tự khóa tài khoản của bản thân.' })
      }

      user.is_active = is_active
      await user.save()

      return res.status(200).json({
        success: true,
        message: `Tài khoản đã được ${is_active ? 'mở khóa' : 'khóa'} thành công.`,
        user,
      })
    } catch (error) {
      console.error('Lỗi user updateStatus:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật trạng thái.' })
    }
  },

  // @desc    Admin delete user
  // @route   DELETE /api/users/:id
  // @access  Private/Admin
  delete: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id)

      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng.' })
      }

      if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của bản thân.' })
      }

      // Block deletion when this user has invoices — cascading the delete
      // would silently wipe their purchase/financial history (Invoice ->
      // Ticket). Lock the account (is_active: false) instead.
      const invoiceCount = await Invoice.count({ where: { user_id: user.id } })
      if (invoiceCount > 0) {
        return res.status(400).json({
          message: 'Không thể xóa tài khoản đã có lịch sử hóa đơn. Hãy khóa tài khoản thay vì xóa.',
        })
      }

      // Tương tự với tài xế còn chuyến đang chờ/đang chạy được phân công.
      if (user.role === 'driver' && await countActiveDriverTrips(user.id) > 0) {
        return res.status(400).json({
          message: 'Không thể xóa tài xế đang được phân công chuyến chờ/đang chạy. Hãy gỡ phân công hoặc khóa tài khoản thay vì xóa.',
        })
      }

      // Nhật ký in vé (TicketPrint.printed_by) và sự cố đã báo
      // (TripIncident.reported_by) là khóa ngoại NOT NULL tới users — xóa sẽ
      // lỗi FK hoặc mất lịch sử đối soát. Khóa tài khoản thay vì xóa.
      const [printCount, incidentCount] = await Promise.all([
        TicketPrint.count({ where: { printed_by: user.id } }),
        TripIncident.count({ where: { reported_by: user.id } }),
      ])
      if (printCount > 0 || incidentCount > 0) {
        return res.status(400).json({
          message: 'Không thể xóa tài khoản đã có lịch sử in vé hoặc báo sự cố. Hãy khóa tài khoản thay vì xóa.',
        })
      }

      await user.destroy()
      return res.status(200).json({ success: true, message: 'Xóa tài khoản thành công.' })
    } catch (error) {
      console.error('Lỗi user delete:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa tài khoản.' })
    }
  },

  // @desc    Danh sách tài xế đang hoạt động để Admin phân công chuyến, kèm gợi ý:
  //          `unavailable` (nghỉ ngày đó), `busy_trip` (trùng giờ chuyến khác khi
  //          có departure_time/arrival_time), `is_vehicle_regular` (tài xế quen của
  //          vehicle_id). Đã sắp xếp: quen & trống → trống → bận/nghỉ.
  // @route   GET /api/users/drivers?date=&departure_time=&arrival_time=&exclude_trip_id=&vehicle_id=
  // @access  Private/Admin
  getDrivers: async (req, res) => {
    try {
      const drivers = await User.findAll({
        where: { role: 'driver', is_active: true },
        attributes: ['id', 'full_name', 'phone', 'email'],
        order: [['full_name', 'ASC']],
      })

      const { departure_time, arrival_time, exclude_trip_id, vehicle_id } = req.query
      const departure = departure_time ? new Date(departure_time) : null
      if (departure && Number.isNaN(departure.getTime())) {
        return res.status(400).json({ message: 'Giờ khởi hành không hợp lệ.' })
      }
      const date = req.query.date || (departure ? toVNDateString(departure) : null)

      // Đang nghỉ ngày khởi hành
      let unavailableIds = new Set()
      if (date) {
        if (!isValidDateString(date)) {
          return res.status(400).json({ message: 'Ngày không đúng định dạng YYYY-MM-DD.' })
        }
        const rows = await DriverUnavailability.findAll({
          where: { start_date: { [Op.lte]: date }, end_date: { [Op.gte]: date } },
          attributes: ['driver_id'],
        })
        unavailableIds = new Set(rows.map((r) => r.driver_id))
      }

      // Bận chuyến khác trùng khung giờ — 1 truy vấn cho mọi tài xế (cùng quy tắc
      // chồng giờ với findDriverScheduleConflict)
      const busyByDriver = new Map()
      if (departure) {
        const newStart = departure.getTime()
        const arrival = arrival_time ? new Date(arrival_time) : null
        const newEnd = arrival && !Number.isNaN(arrival.getTime())
          ? arrival.getTime()
          : newStart + DEFAULT_TRIP_DURATION_MS
        const where = {
          [Op.or]: [{ driver_id: { [Op.ne]: null } }, { co_driver_id: { [Op.ne]: null } }],
          status: { [Op.ne]: 'cancelled' },
          // chuyến dài nhất ~20h → lùi 2 ngày là đủ bắt mọi chuyến còn chạy tới newStart
          departure_time: { [Op.lt]: new Date(newEnd), [Op.gt]: new Date(newStart - 2 * 24 * 60 * 60 * 1000) },
        }
        if (exclude_trip_id) where.id = { [Op.ne]: exclude_trip_id }
        const trips = await Trip.findAll({ where, attributes: ['id', 'driver_id', 'co_driver_id', 'departure_time', 'arrival_time'] })
        for (const trip of trips) {
          if (getEffectiveArrivalMs(trip) <= newStart) continue
          for (const id of [trip.driver_id, trip.co_driver_id]) {
            if (id && !busyByDriver.has(id)) {
              busyByDriver.set(id, { id: trip.id, departure_time: trip.departure_time })
            }
          }
        }
      }

      // Tài xế quen của xe: tài xế mặc định của mẫu chuyến + tài xế các chuyến gần nhất
      const regularIds = new Set()
      const regularMainIds = new Set() // thường lái chính xe này
      if (vehicle_id) {
        const templates = await TripTemplate.findAll({
          where: { vehicle_id },
          attributes: ['driver_id', 'co_driver_id'],
        })
        const recent = await Trip.findAll({
          where: { vehicle_id, driver_id: { [Op.ne]: null } },
          attributes: ['driver_id', 'co_driver_id'],
          order: [['departure_time', 'DESC']],
          limit: 10,
        })
        for (const row of [...templates, ...recent]) {
          if (row.driver_id) {
            regularIds.add(row.driver_id)
            regularMainIds.add(row.driver_id)
          }
          if (row.co_driver_id) regularIds.add(row.co_driver_id)
        }
      }

      const result = drivers.map((d) => ({
        ...d.toJSON(),
        unavailable: unavailableIds.has(d.id),
        busy_trip: busyByDriver.get(d.id) || null,
        is_vehicle_regular: regularIds.has(d.id),
      }))
      // Tài xế quen của xe & trống lịch → trống lịch → bận/nghỉ
      // (tài xế chính quen của xe xếp trước tài xế phụ quen để ô tự điền chọn đúng người)
      const rank = (d) => {
        if (d.unavailable || d.busy_trip) return 3
        if (regularMainIds.has(d.id)) return 0
        return d.is_vehicle_regular ? 1 : 2
      }
      result.sort((a, b) => rank(a) - rank(b) || a.full_name.localeCompare(b.full_name, 'vi'))

      return res.status(200).json(result)
    } catch (error) {
      console.error('Lỗi user getDrivers:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách tài xế.' })
    }
  },

  // @desc    Ngày nghỉ (từ hôm nay trở đi) của một tài xế — Admin xem khi phân công
  // @route   GET /api/users/:id/unavailabilities
  // @access  Private/Admin
  getDriverUnavailabilities: async (req, res) => {
    try {
      const rows = await DriverUnavailability.findAll({
        where: {
          driver_id: req.params.id,
          end_date: { [Op.gte]: toVNDateString() },
        },
        order: [['start_date', 'ASC']],
      })
      return res.status(200).json(rows)
    } catch (error) {
      console.error('Lỗi user getDriverUnavailabilities:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải ngày nghỉ của tài xế.' })
    }
  },

  // @desc    Quầy vé — tìm khách hàng theo SĐT để đặt vé hộ (chỉ trả về tài
  //          khoản role 'customer', không cho phép chọn tài khoản staff/admin
  //          làm chủ hóa đơn).
  // @route   GET /api/users/customers/search?phone=
  // @access  Private/Staff/Admin
  searchCustomers: async (req, res) => {
    try {
      const { phone } = req.query
      if (!phone || phone.trim().length < 3) {
        return res.status(400).json({ message: 'Vui lòng nhập ít nhất 3 số điện thoại để tìm kiếm.' })
      }

      const customers = await User.findAll({
        where: { phone: { [Op.like]: `%${phone.trim()}%` }, role: 'customer' },
        attributes: ['id', 'full_name', 'phone', 'email'],
        limit: 10,
      })

      return res.status(200).json(customers)
    } catch (error) {
      console.error('Lỗi searchCustomers:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tìm khách hàng.' })
    }
  },

  // @desc    Quầy vé — tìm khách hàng theo SĐT, tạo mới nếu chưa có tài
  //          khoản, để nhân viên đặt vé hộ gắn đúng vào khách hàng thật thay
  //          vì gắn vào tài khoản của chính nhân viên.
  // @route   POST /api/users/customers
  // @access  Private/Staff/Admin
  resolveOrCreateCustomer: async (req, res) => {
    try {
      const { full_name, phone, email } = req.body

      const existing = await User.findOne({ where: { phone } })
      if (existing) {
        if (existing.role !== 'customer') {
          return res.status(409).json({
            message: 'Số điện thoại này thuộc về một tài khoản nhân viên/quản trị viên, không thể đặt vé hộ.',
          })
        }
        return res.status(200).json({
          id: existing.id, full_name: existing.full_name, phone: existing.phone, email: existing.email,
        })
      }

      // Khách chưa có tài khoản: tạo nhanh một tài khoản customer. Email và
      // mật khẩu là placeholder — khách không dùng để đăng nhập ngay, có thể
      // đăng ký lại với email thật sau nếu muốn tự quản lý tài khoản online.
      let placeholderEmail = email?.trim() || `khach.${phone}@quayve.local`
      if (!email) {
        const clash = await User.findOne({ where: { email: placeholderEmail } })
        if (clash) {
          placeholderEmail = `khach.${phone}.${crypto.randomBytes(2).toString('hex')}@quayve.local`
        }
      }

      const newCustomer = await User.create({
        full_name,
        phone,
        email: placeholderEmail,
        password: crypto.randomBytes(16).toString('hex'),
        role: 'customer',
        is_active: true,
      })

      return res.status(201).json({
        id: newCustomer.id, full_name: newCustomer.full_name, phone: newCustomer.phone, email: newCustomer.email,
      })
    } catch (error) {
      console.error('Lỗi resolveOrCreateCustomer:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi xử lý thông tin khách hàng.' })
    }
  },
}

module.exports = userController
