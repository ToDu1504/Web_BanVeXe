require('dotenv').config()
const mysql = require('mysql2/promise')

// db:create — tạo database DB_NAME (utf8mb4) nếu chưa có. Không đụng dữ liệu sẵn có.
const createDb = async () => {
  const dbName = process.env.DB_NAME
  if (!dbName || !/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error(`DB_NAME không hợp lệ: "${dbName}" (chỉ dùng chữ, số, gạch dưới).`)
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS ?? '',
  })
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    console.log(`✅ Database "${dbName}" đã sẵn sàng.`)
  } finally {
    await connection.end()
  }
}

createDb()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Lỗi tạo database:', error.message)
    process.exit(1)
  })
