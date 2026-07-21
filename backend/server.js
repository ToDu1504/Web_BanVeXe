require('dotenv').config()
const app = require('./src/app')
const { connectDB } = require('./src/config/db')
require('./src/models') // Register all Sequelize associations

const PORT = process.env.PORT || 8080

const startServer = async () => {
  // Attempt DB connection (non-fatal so server still starts without DB)
  await connectDB()

  app.listen(PORT, () => {
    console.log(`🚌 VexereBus Server đang chạy tại: http://localhost:${PORT}`)
    console.log(`📦 Môi trường: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📋 Đọc API docs tại: http://localhost:${PORT}/api/health`)
  })
}

startServer()

