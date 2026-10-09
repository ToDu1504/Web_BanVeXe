const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { spawn } = require('child_process')
const { pipeline } = require('stream/promises')

// Sao lưu / khôi phục bằng mysqldump + mysql client (md/ThietKeDatabase.md mục 9).
// Đường dẫn công cụ lấy từ .env (MYSQLDUMP_PATH / MYSQL_PATH) để đổi XAMPP ->
// Docker chỉ cần sửa .env. Mật khẩu truyền qua biến môi trường MYSQL_PWD thay
// vì tham số dòng lệnh (không lộ trong danh sách tiến trình).
const BACKUP_DIR = path.resolve(__dirname, '..', '..', process.env.BACKUP_DIR || 'backups')
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP) || 10

const dbConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: String(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME,
})

const toolEnv = (password) => ({ ...process.env, MYSQL_PWD: password })

const timestamp = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

// Chờ tiến trình kết thúc; lỗi kèm stderr để người dùng biết vì sao (sai đường dẫn, sai mật khẩu…).
const waitForExit = (child, label) => new Promise((resolve, reject) => {
  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr += chunk })
  child.on('error', (error) => reject(new Error(`Không chạy được ${label}: ${error.message}`)))
  child.on('close', (code) => {
    if (code === 0) resolve()
    else reject(new Error(`${label} thoát với mã ${code}: ${stderr.trim()}`))
  })
})

// Xóa bớt bản sao lưu cũ của cùng DB, chỉ giữ BACKUP_KEEP bản mới nhất.
const rotateBackups = (database) => {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(`${database}-`) && f.endsWith('.sql.gz'))
    .sort()
  for (const file of files.slice(0, Math.max(0, files.length - BACKUP_KEEP))) {
    fs.unlinkSync(path.join(BACKUP_DIR, file))
  }
}

// Trả về đường dẫn file .sql.gz vừa tạo.
const backupDatabase = async ({ label = '' } = {}) => {
  const cfg = dbConfig()
  const mysqldump = process.env.MYSQLDUMP_PATH || 'mysqldump'
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const suffix = label ? `-${label}` : ''
  const file = path.join(BACKUP_DIR, `${cfg.database}-${timestamp()}${suffix}.sql.gz`)

  const child = spawn(mysqldump, [
    `--host=${cfg.host}`,
    `--port=${cfg.port}`,
    `--user=${cfg.user}`,
    '--single-transaction',
    '--routines',
    '--default-character-set=utf8mb4',
    cfg.database,
  ], { env: toolEnv(cfg.password) })

  const exited = waitForExit(child, 'mysqldump')
  try {
    await Promise.all([
      pipeline(child.stdout, zlib.createGzip(), fs.createWriteStream(file)),
      exited,
    ])
  } catch (error) {
    fs.rmSync(file, { force: true })
    throw error
  }
  rotateBackups(cfg.database)
  return file
}

// Nạp file .sql hoặc .sql.gz vào DB_NAME hiện tại.
const restoreDatabase = async (file) => {
  const cfg = dbConfig()
  const mysql = process.env.MYSQL_PATH || 'mysql'
  const child = spawn(mysql, [
    `--host=${cfg.host}`,
    `--port=${cfg.port}`,
    `--user=${cfg.user}`,
    '--default-character-set=utf8mb4',
    cfg.database,
  ], { env: toolEnv(cfg.password) })

  const exited = waitForExit(child, 'mysql')
  const source = fs.createReadStream(file)
  const streams = file.endsWith('.gz') ? [source, zlib.createGunzip(), child.stdin] : [source, child.stdin]
  await Promise.all([pipeline(...streams), exited])
}

module.exports = { backupDatabase, restoreDatabase, BACKUP_DIR }
