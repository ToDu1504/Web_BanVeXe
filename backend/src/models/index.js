const User = require('./User')
const Route = require('./Route')
const Vehicle = require('./Vehicle')
const Trip = require('./Trip')
const Invoice = require('./Invoice')
const Ticket = require('./Ticket')

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

module.exports = {
  User,
  Route,
  Vehicle,
  Trip,
  Invoice,
  Ticket,
}
