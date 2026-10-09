const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

// Sự cố / trễ chuyến do tài xế báo; staff/admin đánh dấu đã xử lý.
const TripIncident = sequelize.define('TripIncident', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  trip_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reported_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('delay', 'breakdown', 'accident', 'other'),
    allowNull: false,
  },
  // Bắt buộc (ở tầng controller) khi type = 'delay'.
  delay_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  note: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  // Đã gửi mail báo khách (NULL = chưa/không gửi).
  passengers_notified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'trip_incidents',
  timestamps: true,
  // Index, FK, CHECK: xem migrations/ (nguồn chuẩn của schema, md/ThietKeDatabase.md).
})

module.exports = TripIncident
