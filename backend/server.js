require('dotenv').config()
const app = require('./src/app')
const { connectDB } = require('./src/config/db')
require('./src/models') // Register all Sequelize associations
const { startExpireInvoicesJob } = require('./src/jobs/expireInvoices')
const { startGenerateTripsJob } = require('./src/jobs/generateTripsFromTemplates')
const { startUpdateTripStatusesJob } = require('./src/jobs/updateTripStatuses')
const { startDepartureReminderJob } = require('./src/jobs/sendDepartureReminders')

const PORT = process.env.PORT || 8080

const startServer = async () => {
  // Attempt DB connection (non-fatal so server still starts without DB)
  await connectDB()

  startExpireInvoicesJob()
  startGenerateTripsJob()
  startUpdateTripStatusesJob()
  startDepartureReminderJob()

  app.listen(PORT, () => {
    console.log(`🚌 Đặt Vé Xe Khách Server đang chạy tại: http://localhost:${PORT}`)
    console.log(`📦 Môi trường: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📋 Đọc API docs tại: http://localhost:${PORT}/api/health`)
  })
}

startServer()

