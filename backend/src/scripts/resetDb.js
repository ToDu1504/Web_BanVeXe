require('dotenv').config()
const path = require('path')
const { spawnSync } = require('child_process')
const { migrator, sequelize } = require('../db/migrator')
const { assertDestructiveAllowed } = require('../db/safety')
const { backupDatabase } = require('../db/backup')

// db:reset -- --yes — sao lưu, xóa MỌI bảng của DB_NAME, chạy lại toàn bộ
// migration rồi nạp dữ liệu mẫu. Chỉ cho DB *_dev / *_test (xem db/safety.js).
const reset = async () => {
  assertDestructiveAllowed('Xóa toàn bộ bảng, migrate lại và seed')

  const [tables] = await sequelize.query('SHOW TABLES')
  if (tables.length > 0) {
    const file = await backupDatabase({ label: 'before-reset' })
    console.log(`💾 Đã sao lưu: ${file}`)
  }

  // FOREIGN_KEY_CHECKS là biến theo phiên — chạy mọi lệnh trên CÙNG một kết nối
  // (transaction giữ kết nối) để thứ tự xóa bảng không bị FK chặn.
  const t = await sequelize.transaction()
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t })
    for (const row of tables) {
      await sequelize.query(`DROP TABLE IF EXISTS \`${Object.values(row)[0]}\``, { transaction: t })
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t })
    await t.commit()
  } catch (error) {
    await t.rollback()
    throw error
  }
  console.log(`🗑️  Đã xóa ${tables.length} bảng.`)

  const applied = await migrator.up()
  console.log(`✅ Đã chạy ${applied.length} migration.`)
  await sequelize.close()

  // seedData.js tự kết nối/thoát tiến trình — chạy như một tiến trình con.
  const seed = spawnSync(process.execPath, [path.join(__dirname, 'seedData.js'), '--yes'], { stdio: 'inherit', env: process.env })
  if (seed.status !== 0) throw new Error('Seed thất bại.')
}

reset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌', error.message)
    process.exit(1)
  })
