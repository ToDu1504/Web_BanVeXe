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
  // the ticket is cancelled/refunded. The unique index uq_trip_active_seat
  // (trip_id, active_seat_number — see migrations/) is defined on this column
  // (not seat_number) so that MySQL — which allows multiple NULLs
  // in a unique index — only enforces "one active ticket per trip/seat" and
  // never blocks a seat from being re-sold after its earlier ticket was
  // cancelled. Keep this in sync with booking_status whenever it changes —
  // CHECK chk_tickets_active_seat rejects any row where they disagree.
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
  // Điểm danh khách lên xe (tài xế/nhân viên tick). NULL = chưa lên xe.
  boarded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  boarded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Cách lên xe: 'station' = tự đến bến, 'shuttle' = xe trung chuyển đón tại
  // pickup_address. pickup_updated_at được chạm mỗi khi vé có thể vào/ra danh
  // sách đón (tạo vé, đổi cách lên xe, hóa đơn -> paid) để suy ra "cần in lại".
  pickup_type: {
    type: DataTypes.ENUM('station', 'shuttle'),
    allowNull: false,
    defaultValue: 'station',
  },
  pickup_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  pickup_note: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  pickup_updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Lúc đã gửi mail nhắc chuyến cho vé này (jobs/sendDepartureReminders.js).
  reminder_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'tickets',
  timestamps: true,
  // Index, FK, CHECK: xem migrations/ (nguồn chuẩn của schema, md/ThietKeDatabase.md).
})

module.exports = Ticket
