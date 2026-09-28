const crypto = require('crypto')
const { Op } = require('sequelize')
const { User, Invoice } = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')

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

      user.role = role
      await user.save()

      return res.status(200).json({ success: true, message: 'Cập nhật phân quyền thành công.', user })
    } catch (error) {
      console.error('Lỗi user updateRole:', error)
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

      await user.destroy()
      return res.status(200).json({ success: true, message: 'Xóa tài khoản thành công.' })
    } catch (error) {
      console.error('Lỗi user delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa tài khoản.' })
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
      return res.status(500).json({ message: 'Lỗi máy chủ khi xử lý thông tin khách hàng.' })
    }
  },
}

module.exports = userController
