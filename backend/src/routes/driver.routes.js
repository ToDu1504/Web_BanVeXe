const express = require('express')
const router = express.Router()
const driverController = require('../controllers/driverController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Mọi endpoint /api/driver/* chỉ dành cho role driver. Endpoint có :id chuyến
// còn kiểm tra trip.driver_id === req.user.id (xem loadOwnedTrip).
router.use(protect, authorize('driver'))

router.get('/trips', driverController.getTrips)
router.get('/trips/:id', driverController.getTripById)
router.post('/trips/:id/start', driverController.startTrip)
router.post('/trips/:id/complete', driverController.completeTrip)
router.post('/trips/:id/incidents', validate(schemas.createIncident), driverController.createIncident)

router.get('/dashboard', driverController.getDashboard)
router.get('/history', driverController.getHistory)
router.get('/schedule.ics', driverController.getScheduleIcs)

router.get('/unavailabilities', driverController.getUnavailabilities)
router.post('/unavailabilities', validate(schemas.createUnavailability), driverController.createUnavailability)
router.delete('/unavailabilities/:id', driverController.deleteUnavailability)

module.exports = router
