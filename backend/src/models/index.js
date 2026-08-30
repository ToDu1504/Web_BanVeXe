const User = require('./User')
const Route = require('./Route')
const Vehicle = require('./Vehicle')
const Trip = require('./Trip')
const Invoice = require('./Invoice')
const Ticket = require('./Ticket')
const TripTemplate = require('./TripTemplate')

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

module.exports = {
  User,
  Route,
  Vehicle,
  Trip,
  Invoice,
  Ticket,
  TripTemplate,
}
