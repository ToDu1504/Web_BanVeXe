const express = require('express')
const router = express.Router()
const tripController = require('../controllers/tripController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Public search and detail routes
router.get('/search', tripController.search)
router.get('/:id/booked-seats', tripController.getBookedSeats)
router.get('/:id', tripController.getById)

// Protected management routes
router.get('/', protect, authorize('staff', 'admin'), tripController.getAll)
router.post('/', protect, authorize('admin'), validate(schemas.createTrip), tripController.create)
router.put('/:id', protect, authorize('admin'), validate(schemas.updateTrip), tripController.update)
router.delete('/:id', protect, authorize('admin'), tripController.delete)

module.exports = router
