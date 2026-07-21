const { User } = require('../models')

const userController = {
  // @desc    Get all users
  // @route   GET /api/users
  // @access  Private/Admin
  getAll: async (req, res) => {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
      })
      return res.status(200).json(users)
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

      await user.destroy()
      return res.status(200).json({ success: true, message: 'Xóa tài khoản thành công.' })
    } catch (error) {
      console.error('Lỗi user delete:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xóa tài khoản.' })
    }
  },
}

module.exports = userController
