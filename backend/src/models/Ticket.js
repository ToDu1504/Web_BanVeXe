const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  trip_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  seat_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  passenger_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  passenger_phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
  },
  ticket_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  booking_status: {
    type: DataTypes.ENUM('booked', 'cancelled'),
    defaultValue: 'booked',
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'tickets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['trip_id', 'seat_number'],
      name: 'uq_trip_seat',
    },
  ],
})

module.exports = Ticket
