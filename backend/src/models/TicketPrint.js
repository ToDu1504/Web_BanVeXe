const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

// One row per physical print action on a Ticket. This is the source of truth
// for full print history (Ticket.issued_at/issued_by/print_count are just a
// denormalized "last print" cache) — needed so staff can see every print in
// a shift for end-of-shift reconciliation, not only the most recent one.
const TicketPrint = sequelize.define('TicketPrint', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ticket_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Denormalized from Ticket.invoice_id so the reconciliation report can
  // filter/join without an extra hop through tickets.
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  printed_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  printed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  print_type: {
    type: DataTypes.ENUM('original', 'reprint'),
    allowNull: false,
  },
  // 1, 2, 3... per ticket — this is literally "in lại lần N".
  print_sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Required (at the controller level) when print_type = 'reprint'.
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'ticket_prints',
  timestamps: false,
  indexes: [
    { fields: ['ticket_id'] },
    { fields: ['printed_at'] },
    { fields: ['printed_by', 'printed_at'] },
  ],
})

module.exports = TicketPrint
