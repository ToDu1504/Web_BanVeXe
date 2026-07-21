const jwt = require('jsonwebtoken')
const { User } = require('../models')

const protect = async (req, res, next) => {
  try {
    let token = req.cookies.token

    if (!token) {
      return res.status(401).json({ message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.' })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vexerebus_jwt_super_secret_key_2024')

    // Find user
    const user = await User.findByPk(decoded.id)
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại trên hệ thống.' })
    }

    if (!user.is_active) {
      return res.status(401).json({ message: 'Tài khoản của bạn đã bị khóa.' })
    }

    // Attach user context to request
    req.user = user
    next()
  } catch (error) {
    console.error('Lỗi middleware protect:', error.message)
    return res.status(401).json({ message: 'Token xác thực không hợp lệ hoặc đã hết hạn.' })
  }
}

module.exports = { protect }
