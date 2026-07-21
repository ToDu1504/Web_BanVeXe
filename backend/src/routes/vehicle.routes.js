const express = require('express')
const router = express.Router()
const vehicleController = require('../controllers/vehicleController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Protect all vehicle routes
router.use(protect)

router.get('/', authorize('staff', 'admin'), vehicleController.getAll)
router.get('/:id', authorize('staff', 'admin'), vehicleController.getById)

router.post('/', authorize('admin'), validate(schemas.createVehicle), vehicleController.create)
router.put('/:id', authorize('admin'), validate(schemas.updateVehicle), vehicleController.update)
router.delete('/:id', authorize('admin'), vehicleController.delete)

module.exports = router
