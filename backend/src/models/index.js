const User = require('./User')
const Route = require('./Route')
const Vehicle = require('./Vehicle')
const Trip = require('./Trip')
const Invoice = require('./Invoice')
const Ticket = require('./Ticket')
const TripTemplate = require('./TripTemplate')
const TicketPrint = require('./TicketPrint')
const TripIncident = require('./TripIncident')
const DriverUnavailability = require('./DriverUnavailability')

// Associations
//
// Ràng buộc thật (FK, ON DELETE, CHECK, index) nằm trong migrations/ — đó là
// nguồn chuẩn của schema. `onDelete` ở đây chỉ để mô tả cho khớp với migration;
// không dùng `hooks: true` (không để Sequelize tự xóa bản ghi con ở tầng ứng dụng).
// Chính sách (md/ThietKeDatabase.md mục 5): RESTRICT cho lịch sử tiền/vé, SET NULL
// cho người thao tác/tài xế, CASCADE cho dữ liệu phụ.

// User <-> Invoice
User.hasMany(Invoice, { foreignKey: 'user_id', onDelete: 'RESTRICT' })
Invoice.belongsTo(User, { foreignKey: 'user_id' })

// Invoice <-> Ticket. Xóa hóa đơn 'pending' phải xóa vé của nó trước, tường minh,
// trong cùng transaction (xem invoiceController.cancelInvoice).
Invoice.hasMany(Ticket, { foreignKey: 'invoice_id', onDelete: 'RESTRICT' })
Ticket.belongsTo(Invoice, { foreignKey: 'invoice_id' })

// Trip <-> Ticket
Trip.hasMany(Ticket, { foreignKey: 'trip_id', onDelete: 'RESTRICT' })
Ticket.belongsTo(Trip, { foreignKey: 'trip_id' })

// Route <-> Trip
Route.hasMany(Trip, { foreignKey: 'route_id', onDelete: 'RESTRICT' })
Trip.belongsTo(Route, { foreignKey: 'route_id' })

// Vehicle <-> Trip
Vehicle.hasMany(Trip, { foreignKey: 'vehicle_id', onDelete: 'RESTRICT' })
Trip.belongsTo(Vehicle, { foreignKey: 'vehicle_id' })

// Route <-> TripTemplate (mẫu chuyến là cấu hình — xóa tuyến/xe kéo theo mẫu)
Route.hasMany(TripTemplate, { foreignKey: 'route_id', onDelete: 'CASCADE' })
TripTemplate.belongsTo(Route, { foreignKey: 'route_id' })

// Vehicle <-> TripTemplate
Vehicle.hasMany(TripTemplate, { foreignKey: 'vehicle_id', onDelete: 'CASCADE' })
TripTemplate.belongsTo(Vehicle, { foreignKey: 'vehicle_id' })

// TripTemplate <-> Trip (deleting a template only detaches generated trips,
// never deletes them — see Trip.js's template_id comment)
TripTemplate.hasMany(Trip, { foreignKey: 'template_id', onDelete: 'SET NULL' })
Trip.belongsTo(TripTemplate, { foreignKey: 'template_id' })

// Ticket <-> TicketPrint (full print history; Ticket.issued_at/issued_by/
// print_count is just a denormalized "last print" cache of this)
Ticket.hasMany(TicketPrint, { foreignKey: 'ticket_id', onDelete: 'RESTRICT' })
TicketPrint.belongsTo(Ticket, { foreignKey: 'ticket_id' })

// Invoice <-> TicketPrint (nhật ký đối soát giữ cả mã hóa đơn)
Invoice.hasMany(TicketPrint, { foreignKey: 'invoice_id', onDelete: 'RESTRICT' })
TicketPrint.belongsTo(Invoice, { foreignKey: 'invoice_id' })

// User <-> TicketPrint (which staff printed it). Aliased so it doesn't clash
// with Invoice.belongsTo(User)'s default alias when both are included together.
User.hasMany(TicketPrint, { foreignKey: 'printed_by', onDelete: 'RESTRICT' })
TicketPrint.belongsTo(User, { foreignKey: 'printed_by', as: 'PrintedByUser' })

// User (driver) <-> Trip. Aliased 'Driver' so it never clashes with other User
// associations. Deleting a driver only detaches (SET NULL), never deletes trips.
User.hasMany(Trip, { foreignKey: 'driver_id', as: 'DrivenTrips', onDelete: 'SET NULL' })
Trip.belongsTo(User, { foreignKey: 'driver_id', as: 'Driver' })

// User (co-driver) <-> Trip / TripTemplate — tài xế phụ, alias 'CoDriver'
User.hasMany(Trip, { foreignKey: 'co_driver_id', as: 'CoDrivenTrips', onDelete: 'SET NULL' })
Trip.belongsTo(User, { foreignKey: 'co_driver_id', as: 'CoDriver' })
User.hasMany(TripTemplate, { foreignKey: 'co_driver_id', as: 'CoDrivenTemplates', onDelete: 'SET NULL' })
TripTemplate.belongsTo(User, { foreignKey: 'co_driver_id', as: 'CoDriver' })

// User (driver) <-> TripTemplate (default driver)
User.hasMany(TripTemplate, { foreignKey: 'driver_id', as: 'DrivenTemplates', onDelete: 'SET NULL' })
TripTemplate.belongsTo(User, { foreignKey: 'driver_id', as: 'Driver' })

// Ticket <-> User: ai in vé gần nhất / ai điểm danh khách lên xe (SET NULL)
Ticket.belongsTo(User, { foreignKey: 'issued_by', as: 'IssuedByUser', onDelete: 'SET NULL' })
Ticket.belongsTo(User, { foreignKey: 'boarded_by', as: 'BoardedByUser', onDelete: 'SET NULL' })

// Trip <-> TripIncident
Trip.hasMany(TripIncident, { foreignKey: 'trip_id', onDelete: 'CASCADE' })
TripIncident.belongsTo(Trip, { foreignKey: 'trip_id' })
TripIncident.belongsTo(User, { foreignKey: 'reported_by', as: 'Reporter', onDelete: 'RESTRICT' })
TripIncident.belongsTo(User, { foreignKey: 'resolved_by', as: 'Resolver', onDelete: 'SET NULL' })

// User (driver) <-> DriverUnavailability
User.hasMany(DriverUnavailability, { foreignKey: 'driver_id', onDelete: 'CASCADE' })
DriverUnavailability.belongsTo(User, { foreignKey: 'driver_id' })

module.exports = {
  User,
  Route,
  Vehicle,
  Trip,
  Invoice,
  Ticket,
  TripTemplate,
  TicketPrint,
  TripIncident,
  DriverUnavailability,
}
