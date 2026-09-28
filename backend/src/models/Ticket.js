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
  // Mirrors seat_number while the ticket is 'booked', and is set to NULL when
  // the ticket is cancelled/refunded. The unique index below is defined on
  // this column (not seat_number) so that MySQL — which allows multiple NULLs
  // in a unique index — only enforces "one active ticket per trip/seat" and
  // never blocks a seat from being re-sold after its earlier ticket was
  // cancelled. Keep this in sync with booking_status whenever it changes.
  active_seat_number: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  // Denormalized "last print" cache — mirrors the most recent TicketPrint row
  // so the UI can show issue status without an extra query. TicketPrint is
  // the source of truth for full history (needed for shift reconciliation);
  // these three columns must be updated in the same transaction as every
  // TicketPrint.create, same pattern as active_seat_number above.
  issued_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  issued_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  print_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'tickets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['trip_id', 'active_seat_number'],
      name: 'uq_trip_active_seat',
    },
  ],
})

module.exports = Ticket
