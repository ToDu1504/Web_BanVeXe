require('dotenv').config()
const app = require('./src/app')
const { connectDB } = require('./src/config/db')
require('./src/models') // Register all Sequelize associations
const { startExpireInvoicesJob } = require('./src/jobs/expireInvoices')
const { startGenerateTripsJob } = require('./src/jobs/generateTripsFromTemplates')
const { startUpdateTripStatusesJob } = require('./src/jobs/updateTripStatuses')
const { startDepartureReminderJob } = require('./src/jobs/sendDepartureReminders')
const { startLockShuttleListsJob } = require('./src/jobs/lockShuttleLists')
const { migrator } = require('./src/db/migrator')

const PORT = process.env.PORT || 8080

const startServer = async () => {
  // Attempt DB connection (non-fatal so server still starts without DB)
  await connectDB()

  // Schema do migration quản lý — chỉ cảnh báo (không tự chạy) nếu DB đang chậm phiên bản.
  try {
    const pending = await migrator.pending()
    if (pending.length > 0) {
      console.warn(`⚠️  Còn ${pending.length} migration chưa chạy: ${pending.map((m) => m.name).join(', ')}`)
      console.warn('   Chạy "npm run db:migrate" rồi khởi động lại server.')
    }
  } catch (error) {
    console.warn(`⚠️  Không kiểm tra được phiên bản schema: ${error.message}`)
  }

  startExpireInvoicesJob()
  startGenerateTripsJob()
  startUpdateTripStatusesJob()
  startDepartureReminderJob()
  startLockShuttleListsJob()

  app.listen(PORT, () => {
    console.log(`🚌 Đặt Vé Xe Khách Server đang chạy tại: http://localhost:${PORT}`)
    console.log(`📦 Môi trường: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📋 Đọc API docs tại: http://localhost:${PORT}/api/health`)
  })
}

startServer()

