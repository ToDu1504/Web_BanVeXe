const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  license_plate: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  vehicle_type: {
    type: DataTypes.ENUM('sleeper', 'limousine', 'standard'),
    allowNull: false,
  },
  total_seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  seat_layout: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'vehicles',
  timestamps: true,
})

module.exports = Vehicle
