const { User } = require('../models')
const jwt = require('jsonwebtoken')

// Helper to generate JWT and set HttpOnly Cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'vexerebus_jwt_super_secret_key_2024',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  }

  // Remove password from response
  const userResponse = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    is_active: user.is_active,
  }

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: userResponse,
    })
}

const authController = {
  // @desc    Register user
  // @route   POST /api/auth/register
  // @access  Public
  register: async (req, res) => {
    try {
      const { full_name, email, phone, password } = req.body

      // Check if user exists
      const userExists = await User.findOne({ where: { email } })
      if (userExists) {
        return res.status(400).json({ message: 'Email này đã được đăng ký tài khoản khác.' })
      }

      // Create user
      const user = await User.create({
        full_name,
        email,
        phone,
        password,
      })

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công.',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      })
    } catch (error) {
      console.error('Lỗi register:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký tài khoản.' })
    }
  },

  // @desc    Login user
  // @route   POST /api/auth/login
  // @access  Public
  login: async (req, res) => {
    try {
      const { email, password } = req.body

      // Check for user
      const user = await User.findOne({ where: { email } })
      if (!user) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' })
      }

      if (!user.is_active) {
        return res.status(401).json({ message: 'Tài khoản của bạn đã bị vô hiệu hóa.' })
      }

      // Check password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' })
      }

      sendTokenResponse(user, 200, res)
    } catch (error) {
      console.error('Lỗi login:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.' })
    }
  },

  // @desc    Log user out / clear cookie
  // @route   POST /api/auth/logout
  // @access  Private
  logout: async (req, res) => {
    try {
      res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      })

      return res.status(200).json({ success: true, message: 'Đăng xuất thành công.' })
    } catch (error) {
      console.error('Lỗi logout:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi đăng xuất.' })
    }
  },

  // @desc    Get current user profile
  // @route   GET /api/auth/me
  // @access  Private
  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'full_name', 'email', 'phone', 'role', 'is_active'],
      })
      return res.status(200).json({ success: true, user })
    } catch (error) {
      console.error('Lỗi getMe:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy profile.' })
    }
  },

  // @desc    Update profile
  // @route   PUT /api/auth/profile
  // @access  Private
  updateProfile: async (req, res) => {
    try {
      const { full_name, phone } = req.body

      const user = await User.findByPk(req.user.id)
      user.full_name = full_name || user.full_name
      user.phone = phone || user.phone

      await user.save()

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin cá nhân thành công.',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      })
    } catch (error) {
      console.error('Lỗi updateProfile:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật thông tin.' })
    }
  },

  // @desc    Change password
  // @route   PUT /api/auth/change-password
  // @access  Private
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body

      const user = await User.findByPk(req.user.id)

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword)
      if (!isMatch) {
        return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' })
      }

      // Hash hook triggers automatically on user.save()
      user.password = newPassword
      await user.save()

      return res.status(200).json({ success: true, message: 'Thay đổi mật khẩu thành công.' })
    } catch (error) {
      console.error('Lỗi changePassword:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi thay đổi mật khẩu.' })
    }
  },
}

module.exports = authController
