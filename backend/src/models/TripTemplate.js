const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const TripTemplate = sequelize.define('TripTemplate', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  route_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  vehicle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // "HH:mm" — time of day the trip departs on each matching day.
  departure_time_of_day: {
    type: DataTypes.STRING(5),
    allowNull: false,
  },
  // Used to compute a generated Trip's arrival_time. Left null, the
  // generated Trip's arrival_time is null too (same as manual trips).
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  available_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Array of JS Date.getDay() values (0=Sunday..6=Saturday) this template
  // repeats on.
  days_of_week: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  // Tài xế mặc định — Trip sinh ra từ mẫu kế thừa giá trị này.
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Tài xế phụ mặc định (có hoặc không).
  co_driver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'trip_templates',
  timestamps: true,
  // Index, FK, CHECK: xem migrations/ (nguồn chuẩn của schema, md/ThietKeDatabase.md).
})

module.exports = TripTemplate
