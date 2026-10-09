require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { backupDatabase, restoreDatabase } = require('../db/backup')
const { assertDestructiveAllowed } = require('../db/safety')

// db:restore -- <file> --yes — nạp file .sql/.sql.gz vào DB_NAME. Sao lưu trạng
// thái hiện tại trước khi ghi đè.
const restore = async () => {
  const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!fileArg) throw new Error('Thiếu đường dẫn file. Ví dụ: npm run db:restore -- backups/bus_ticket_dev-20261010-090000.sql.gz --yes')
  const file = path.resolve(fileArg)
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file: ${file}`)

  assertDestructiveAllowed(`Khôi phục từ ${path.basename(file)}`)
  const current = await backupDatabase({ label: 'before-restore' })
  console.log(`💾 Đã sao lưu trạng thái hiện tại: ${current}`)
  await restoreDatabase(file)
  console.log('✅ Khôi phục hoàn tất. Chạy "npm run db:status" để kiểm tra phiên bản schema.')
}

restore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌', error.message)
    process.exit(1)
  })
