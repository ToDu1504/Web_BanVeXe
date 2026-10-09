const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const { TripIncident, DriverUnavailability } = require('../models')

// Migration BỔ SUNG, an toàn chạy lại nhiều lần (idempotent) và KHÔNG xóa dữ
// liệu — dùng cho DB đã có sẵn dữ liệu thay vì `db:sync` (force: true). Thêm:
//   - users.role: giá trị 'driver'
//   - trips: driver_id, co_driver_id, reminder_sent_at, actual_departure_at, actual_arrival_at
//   - trip_templates: driver_id, co_driver_id
//   - tickets: boarded_at, boarded_by
//   - bảng trip_incidents, driver_unavailabilities
//   - index idx_trips_driver + FK driver_id -> users(id) ON DELETE SET NULL
const qi = sequelize.getQueryInterface()

const addColumnIfMissing = async (table, column, definition) => {
  const columns = await qi.describeTable(table)
  if (columns[column]) {
    console.log(`   = ${table}.${column} đã có, bỏ qua.`)
    return
  }
  await qi.addColumn(table, column, definition)
  console.log(`   + Đã thêm ${table}.${column}`)
}

const addForeignKeyIfMissing = async (table, column, name) => {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column
       AND REFERENCED_TABLE_NAME = 'users'`,
    { replacements: { table, column } },
  )
  if (rows.length > 0) {
    console.log(`   = FK ${table}.${column} đã có, bỏ qua.`)
    return
  }
  await sequelize.query(
    `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\`
     FOREIGN KEY (\`${column}\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
  )
  console.log(`   + Đã thêm FK ${table}.${column} -> users.id`)
}

const migrate = async () => {
  try {
    console.log('🔄 Đang bổ sung schema cho tính năng tài xế (giữ nguyên dữ liệu)...')

    await sequelize.query(
      "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('customer','staff','admin','driver') NULL DEFAULT 'customer'",
    )
    console.log("   ~ users.role đã hỗ trợ 'driver'")

    await addColumnIfMissing('trips', 'driver_id', { type: DataTypes.INTEGER, allowNull: true })
    await addColumnIfMissing('trips', 'reminder_sent_at', { type: DataTypes.DATE, allowNull: true })
    await addColumnIfMissing('trips', 'actual_departure_at', { type: DataTypes.DATE, allowNull: true })
    await addColumnIfMissing('trips', 'actual_arrival_at', { type: DataTypes.DATE, allowNull: true })
    await addColumnIfMissing('trip_templates', 'driver_id', { type: DataTypes.INTEGER, allowNull: true })
    await addColumnIfMissing('trips', 'co_driver_id', { type: DataTypes.INTEGER, allowNull: true })
    await addColumnIfMissing('trip_templates', 'co_driver_id', { type: DataTypes.INTEGER, allowNull: true })
    await addColumnIfMissing('tickets', 'boarded_at', { type: DataTypes.DATE, allowNull: true })
    await addColumnIfMissing('tickets', 'boarded_by', { type: DataTypes.INTEGER, allowNull: true })

    await addForeignKeyIfMissing('trips', 'driver_id', 'trips_driver_id_fk')
    await addForeignKeyIfMissing('trip_templates', 'driver_id', 'trip_templates_driver_id_fk')
    await addForeignKeyIfMissing('trips', 'co_driver_id', 'trips_co_driver_id_fk')
    await addForeignKeyIfMissing('trip_templates', 'co_driver_id', 'trip_templates_co_driver_id_fk')

    const indexes = await qi.showIndex('trips')
    for (const [name, column] of [['idx_trips_driver', 'driver_id'], ['idx_trips_co_driver', 'co_driver_id']]) {
      if (indexes.some((i) => i.name === name)) {
        console.log(`   = index ${name} đã có, bỏ qua.`)
      } else {
        await qi.addIndex('trips', [column, 'departure_time'], { name })
        console.log(`   + Đã thêm index ${name}`)
      }
    }

    // sync() trên từng model chỉ tạo bảng nếu CHƯA tồn tại (không alter/drop).
    await TripIncident.sync()
    await DriverUnavailability.sync()
    console.log('   ~ Bảng trip_incidents, driver_unavailabilities sẵn sàng.')

    console.log('✅ Bổ sung schema hoàn tất!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Lỗi bổ sung schema:', error.message)
    process.exit(1)
  }
}

migrate()
