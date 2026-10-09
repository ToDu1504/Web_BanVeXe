// Rào chắn cho các lệnh có thể làm mất dữ liệu (md/ThietKeDatabase.md, nguyên tắc P4):
// chỉ chạy trên DB tên *_dev / *_test, không chạy khi NODE_ENV=production, và
// bắt buộc người chạy gõ thêm cờ --yes. Luôn in rõ đang thao tác trên DB nào.
const SAFE_SUFFIXES = ['_dev', '_test']

const describeTarget = () => {
  const host = process.env.DB_HOST || 'localhost'
  const port = process.env.DB_PORT || 3306
  return `${process.env.DB_NAME} @ ${host}:${port}`
}

const assertDestructiveAllowed = (action) => {
  const dbName = process.env.DB_NAME || ''
  console.log(`⚠️  ${action} — database: ${describeTarget()}`)

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Từ chối "${action}": NODE_ENV=production.`)
  }
  if (!SAFE_SUFFIXES.some((suffix) => dbName.endsWith(suffix))) {
    throw new Error(
      `Từ chối "${action}": DB_NAME="${dbName}" phải kết thúc bằng ${SAFE_SUFFIXES.join(' hoặc ')}.`,
    )
  }
  if (!process.argv.includes('--yes')) {
    throw new Error(`Thao tác này sẽ thay đổi/xóa dữ liệu. Chạy lại kèm "-- --yes" để xác nhận (ví dụ: npm run ${process.env.npm_lifecycle_event || '<lệnh>'} -- --yes).`)
  }
}

module.exports = { assertDestructiveAllowed, describeTarget }
