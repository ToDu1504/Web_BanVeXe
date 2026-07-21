const { sequelize } = require('../config/db')
const models = require('../models') // Import models to register them in sequelize

const syncDB = async () => {
  try {
    console.log('🔄 Đang đồng bộ hóa database MySQL...')
    // Force sync will drop tables and recreate them (best for clean start)
    await sequelize.sync({ force: true })
    console.log('✅ Đồng bộ database MySQL hoàn tất! Đã tạo các bảng và Index.')
    process.exit(0)
  } catch (error) {
    console.error('❌ Lỗi đồng bộ database:', error.message)
    process.exit(1)
  }
}

syncDB()
