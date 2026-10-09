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

// User <-> Invoice
User.hasMany(Invoice, { foreignKey: 'user_id', onDelete: 'CASCADE', hooks: true })
Invoice.belongsTo(User, { foreignKey: 'user_id' })

// Invoice <-> Ticket
Invoice.hasMany(Ticket, { foreignKey: 'invoice_id', onDelete: 'CASCADE', hooks: true })
Ticket.belongsTo(Invoice, { foreignKey: 'invoice_id' })

// Trip <-> Ticket
Trip.hasMany(Ticket, { foreignKey: 'trip_id', onDelete: 'CASCADE', hooks: true })
Ticket.belongsTo(Trip, { foreignKey: 'trip_id' })

// Route <-> Trip
Route.hasMany(Trip, { foreignKey: 'route_id', onDelete: 'CASCADE', hooks: true })
Trip.belongsTo(Route, { foreignKey: 'route_id' })

// Vehicle <-> Trip
Vehicle.hasMany(Trip, { foreignKey: 'vehicle_id', onDelete: 'CASCADE', hooks: true })
Trip.belongsTo(Vehicle, { foreignKey: 'vehicle_id' })

// Route <-> TripTemplate
Route.hasMany(TripTemplate, { foreignKey: 'route_id', onDelete: 'CASCADE', hooks: true })
TripTemplate.belongsTo(Route, { foreignKey: 'route_id' })

// Vehicle <-> TripTemplate
Vehicle.hasMany(TripTemplate, { foreignKey: 'vehicle_id', onDelete: 'CASCADE', hooks: true })
TripTemplate.belongsTo(Vehicle, { foreignKey: 'vehicle_id' })

// TripTemplate <-> Trip (deleting a template only detaches generated trips,
// never deletes them — see Trip.js's template_id comment)
TripTemplate.hasMany(Trip, { foreignKey: 'template_id', onDelete: 'SET NULL' })
Trip.belongsTo(TripTemplate, { foreignKey: 'template_id' })

// Ticket <-> TicketPrint (full print history; Ticket.issued_at/issued_by/
// print_count is just a denormalized "last print" cache of this)
Ticket.hasMany(TicketPrint, { foreignKey: 'ticket_id', onDelete: 'CASCADE', hooks: true })
TicketPrint.belongsTo(Ticket, { foreignKey: 'ticket_id' })

// User <-> TicketPrint (which staff printed it). Aliased so it doesn't clash
// with Invoice.belongsTo(User)'s default alias when both are included together.
User.hasMany(TicketPrint, { foreignKey: 'printed_by' })
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

// Ticket <-> User: who ticked the passenger as boarded
Ticket.belongsTo(User, { foreignKey: 'boarded_by', as: 'BoardedByUser', constraints: false })

// Trip <-> TripIncident
Trip.hasMany(TripIncident, { foreignKey: 'trip_id', onDelete: 'CASCADE', hooks: true })
TripIncident.belongsTo(Trip, { foreignKey: 'trip_id' })
TripIncident.belongsTo(User, { foreignKey: 'reported_by', as: 'Reporter' })
TripIncident.belongsTo(User, { foreignKey: 'resolved_by', as: 'Resolver', constraints: false })

// User (driver) <-> DriverUnavailability
User.hasMany(DriverUnavailability, { foreignKey: 'driver_id', onDelete: 'CASCADE', hooks: true })
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
