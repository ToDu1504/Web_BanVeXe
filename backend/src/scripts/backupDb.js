require('dotenv').config()
const { backupDatabase } = require('../db/backup')
const { describeTarget } = require('../db/safety')

// db:backup — mysqldump DB_NAME ra backups/<DB_NAME>-<thời gian>.sql.gz (giữ BACKUP_KEEP bản).
console.log(`💾 Đang sao lưu ${describeTarget()}...`)
backupDatabase()
  .then((file) => {
    console.log(`✅ Đã sao lưu: ${file}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Lỗi sao lưu:', error.message)
    process.exit(1)
  })
