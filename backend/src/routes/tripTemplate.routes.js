const express = require('express')
const router = express.Router()
const tripTemplateController = require('../controllers/tripTemplateController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Internal admin-scheduling concern — no public/customer use, so every
// route (including reads) requires staff/admin, unlike Route/Trip's search.
router.get('/', protect, authorize('staff', 'admin'), tripTemplateController.getAll)
router.get('/:id', protect, authorize('staff', 'admin'), tripTemplateController.getById)

router.post('/generate-now', protect, authorize('admin'), tripTemplateController.generateNow)
router.post('/', protect, authorize('admin'), validate(schemas.createTripTemplate), tripTemplateController.create)
router.put('/:id', protect, authorize('admin'), validate(schemas.updateTripTemplate), tripTemplateController.update)
router.delete('/:id', protect, authorize('admin'), tripTemplateController.delete)

module.exports = router
