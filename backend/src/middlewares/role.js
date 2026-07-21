const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn chưa được xác thực.' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Vai trò '${req.user.role}' không được phép truy cập tài nguyên này.`
      })
    }

    next()
  }
}

module.exports = { authorize }
