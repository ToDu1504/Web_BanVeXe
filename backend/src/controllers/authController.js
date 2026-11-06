const crypto = require('crypto')
const { Op } = require('sequelize')
const { User } = require('../models')
const jwt = require('jsonwebtoken')
const { mapDbError } = require('../utils/dbErrors')
const { sendPasswordReset, isMailConfigured, isDeliverableEmail } = require('../services/mailService')

const RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 30
// Chống spam: trong khoảng này sau lần gửi trước, yêu cầu mới bị bỏ qua (vẫn trả lời chung chung).
const RESET_RESEND_COOLDOWN_SECONDS = 60
const FORGOT_PASSWORD_MESSAGE = 'Nếu email này đã đăng ký tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục Spam).'

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

// Helper to generate JWT and set HttpOnly Cookie
const sendTokenResponse = (user, statusCode, res, extra = {}) => {
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
      ...extra,
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
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
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
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
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

      // Hash hook triggers automatically on user.save() (và đặt password_changed_at,
      // làm mọi JWT cũ hết hiệu lực) — cấp lại cookie để phiên hiện tại không bị đăng xuất.
      user.password = newPassword
      await user.save()

      return sendTokenResponse(user, 200, res, { message: 'Thay đổi mật khẩu thành công.' })
    } catch (error) {
      console.error('Lỗi changePassword:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi thay đổi mật khẩu.' })
    }
  },

  // @desc    Gửi link đặt lại mật khẩu qua email
  // @route   POST /api/auth/forgot-password
  // @access  Public
  // Luôn trả cùng một thông báo dù email có tồn tại hay không — không cho dò tài khoản.
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body
      const user = await User.findOne({ where: { email } })

      if (!user || !user.is_active) {
        return res.status(200).json({ success: true, message: FORGOT_PASSWORD_MESSAGE })
      }

      const lastIssuedAt = user.password_reset_expires_at
        ? user.password_reset_expires_at.getTime() - RESET_TOKEN_TTL_MINUTES * 60 * 1000
        : 0
      if (Date.now() - lastIssuedAt < RESET_RESEND_COOLDOWN_SECONDS * 1000) {
        return res.status(200).json({ success: true, message: FORGOT_PASSWORD_MESSAGE })
      }

      const token = crypto.randomBytes(32).toString('hex')
      user.password_reset_token_hash = hashResetToken(token)
      user.password_reset_expires_at = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)
      await user.save()

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`
      const sent = await sendPasswordReset({
        to: user.email,
        fullName: user.full_name,
        resetUrl,
        ttlMinutes: RESET_TOKEN_TTL_MINUTES,
      })

      // Dev không có SMTP (hoặc email thuộc domain dữ liệu mẫu): in link ra console để vẫn thử được.
      if (!sent && process.env.NODE_ENV !== 'production') {
        const reason = !isMailConfigured()
          ? 'chưa cấu hình SMTP'
          : !isDeliverableEmail(user.email) ? 'domain nằm trong MAIL_SKIP_DOMAINS' : 'gửi mail lỗi'
        console.log(`🔑 [dev] Link đặt lại mật khẩu cho ${user.email} (${reason}): ${resetUrl}`)
      }

      return res.status(200).json({ success: true, message: FORGOT_PASSWORD_MESSAGE })
    } catch (error) {
      console.error('Lỗi forgotPassword:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi xử lý yêu cầu quên mật khẩu.' })
    }
  },

  // @desc    Đặt lại mật khẩu bằng token trong email
  // @route   POST /api/auth/reset-password
  // @access  Public
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body

      const user = await User.findOne({
        where: {
          password_reset_token_hash: hashResetToken(token),
          password_reset_expires_at: { [Op.gt]: new Date() },
        },
      })
      if (!user || !user.is_active) {
        return res.status(400).json({ message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.' })
      }

      // Token dùng một lần; hook beforeSave hash mật khẩu và đặt password_changed_at
      // nên mọi phiên đăng nhập cũ đều bị đăng xuất.
      user.password = newPassword
      user.password_reset_token_hash = null
      user.password_reset_expires_at = null
      await user.save()

      return res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' })
    } catch (error) {
      console.error('Lỗi resetPassword:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi đặt lại mật khẩu.' })
    }
  },
}

module.exports = authController
