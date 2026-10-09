require('dotenv').config()
const { migrator, sequelize } = require('../db/migrator')
const { assertDestructiveAllowed, describeTarget } = require('../db/safety')
const { backupDatabase } = require('../db/backup')

// db:migrate          — chạy các migration chưa chạy
// db:migrate:undo     — lùi 1 migration (rào chắn P4 + tự sao lưu trước)
// db:status           — liệt kê migration đã chạy / đang chờ
const run = async (command) => {
  if (command === 'up') {
    const applied = await migrator.up()
    console.log(applied.length
      ? `✅ Đã chạy ${applied.length} migration: ${applied.map((m) => m.name).join(', ')}`
      : `✅ Schema đã ở phiên bản mới nhất (${describeTarget()}).`)
    return
  }

  if (command === 'down') {
    assertDestructiveAllowed('Lùi 1 migration')
    const file = await backupDatabase({ label: 'before-undo' })
    console.log(`💾 Đã sao lưu: ${file}`)
    const reverted = await migrator.down()
    console.log(reverted.length ? `↩️  Đã lùi: ${reverted[0].name}` : 'Không có migration nào để lùi.')
    return
  }

  if (command === 'status') {
    const executed = await migrator.executed()
    const pending = await migrator.pending()
    console.log(`Database: ${describeTarget()}`)
    for (const m of executed) console.log(`   ✔ ${m.name}`)
    for (const m of pending) console.log(`   … ${m.name} (chưa chạy)`)
    if (!executed.length && !pending.length) console.log('   (không có migration nào)')
    return
  }

  throw new Error(`Lệnh không hợp lệ: "${command}" (up | down | status)`)
}

run(process.argv[2])
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌', error.message)
    process.exit(1)
  })
