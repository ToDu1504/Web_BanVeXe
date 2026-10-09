const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

// Khoảng ngày tài xế đăng ký nghỉ — không được phân công chuyến trong khoảng này.
const DriverUnavailability = sequelize.define('DriverUnavailability', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // 'YYYY-MM-DD'; end_date >= start_date, tính cả ngày cuối.
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'driver_unavailabilities',
  timestamps: true,
  indexes: [
    { fields: ['driver_id', 'start_date', 'end_date'], name: 'idx_driver_unavail' },
  ],
})

module.exports = DriverUnavailability
