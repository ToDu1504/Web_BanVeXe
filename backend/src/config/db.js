const { Sequelize } = require('sequelize')
require('dotenv').config()

const sequelize = new Sequelize(
  process.env.DB_NAME || 'bus_ticket_dev',
  process.env.DB_USER || 'root',
  process.env.DB_PASS ?? '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    define: {
      timestamps: true, // Auto adds createdAt and updatedAt
      underscored: true, // Use snake_case for db columns (created_at, updated_at)
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+07:00', // Set to Vietnam timezone
    dialectOptions: {
      // MySQL's JSON columns (Vehicle.seat_layout, TripTemplate.days_of_week)
      // travel over the wire protocol tagged as field.type 'BLOB' (not
      // 'JSON', despite the column actually being JSON) — mysql2 hands them
      // back as raw text, and Sequelize's DataTypes.JSON doesn't re-parse
      // for MySQL, so without this every JSON field comes back as a
      // double-encoded string instead of a real object/array. This app has
      // no real BLOB columns, so it's safe to treat every 'BLOB' field as
      // JSON here — parse once, for the whole app.
      typeCast: (field, next) => {
        // MySQL DATE columns (DataTypes.DATEONLY, e.g. DriverUnavailability
        // start_date/end_date) come back from mysql2 as a JS Date built in the
        // connection timezone (+07:00) — serialized to JSON it shifts back to
        // the previous day ("2026-12-19T17:00:00.000Z"). Keep the raw
        // 'YYYY-MM-DD' string instead. DATETIME/TIMESTAMP are separate field
        // types and unaffected.
        if (field.type === 'DATE') {
          return field.string()
        }
        if (field.type === 'BLOB' || field.type === 'JSON') {
          const raw = field.string()
          if (raw === null) return null
          try {
            return JSON.parse(raw)
          } catch {
            return raw
          }
        }
        return next()
      },
    },
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
