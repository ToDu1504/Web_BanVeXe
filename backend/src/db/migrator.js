const path = require('path')
const { Umzug, SequelizeStorage } = require('umzug')
const { sequelize } = require('../config/db')

// Migration có phiên bản (md/ThietKeDatabase.md mục 7). Mỗi file trong
// backend/migrations/ export up/down nhận { context: queryInterface }; bảng
// SequelizeMeta ghi lại migration nào đã chạy. Schema CHỈ được tạo/đổi ở đây —
// không dùng sequelize.sync() ở bất kỳ đâu.
const MIGRATIONS_GLOB = path
  .join(__dirname, '..', '..', 'migrations', '*.js')
  .replace(/\\/g, '/') // glob cần dấu "/" kể cả trên Windows

const migrator = new Umzug({
  migrations: { glob: MIGRATIONS_GLOB },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: undefined,
})

module.exports = { migrator, sequelize }
