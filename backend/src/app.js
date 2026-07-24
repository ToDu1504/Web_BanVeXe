const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const authRoutes = require('./routes/auth.routes')
const userRoutes = require('./routes/user.routes')
const invoiceRoutes = require('./routes/invoice.routes')
const ticketRoutes = require('./routes/ticket.routes')
const routeRoutes = require('./routes/route.routes')
const tripRoutes = require('./routes/trip.routes')
const vehicleRoutes = require('./routes/vehicle.routes')
const statsRoutes = require('./routes/stats.routes')

const app = express()

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
}))

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Hệ thống Đặt Vé Xe Khách hoạt động bình thường.' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/stats', statsRoutes)

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Đường dẫn ${req.originalUrl} không tồn tại trên máy chủ.` })
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack)
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    message: err.message || 'Có lỗi hệ thống xảy ra. Vui lòng liên hệ quản trị viên.',
    error: process.env.NODE_ENV === 'development' ? err : {},
  })
})

module.exports = app
