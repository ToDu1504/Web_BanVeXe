const { Sequelize } = require('sequelize')
require('dotenv').config()

const sequelize = new Sequelize(
  process.env.DB_NAME || 'bus_ticket_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS ?? '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true, // Auto adds createdAt and updatedAt
      underscored: true, // Use snake_case for db columns (created_at, updated_at)
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    timezone: '+07:00', // Set to Vietnam timezone
  }
)

const connectDB = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ Kết nối database MySQL thành công qua Sequelize!')
  } catch (error) {
    console.warn(`⚠️  Không thể kết nối MySQL: ${error.message}`)
    console.warn('   Máy chủ API vẫn khởi động, nhưng các endpoint cần DB sẽ trả lỗi 500.')
    console.warn('   Cập nhật DB_PASS trong backend/.env rồi khởi động lại server.')
  }
}

module.exports = { sequelize, connectDB }
