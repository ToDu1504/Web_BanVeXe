const express = require('express')
const router = express.Router()
const routeController = require('../controllers/routeController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Public GET routes so guests can search
router.get('/', routeController.getAll)
router.get('/:id', routeController.getById)

// Admin restricted endpoints for modifying routes
router.post('/', protect, authorize('admin'), validate(schemas.createRoute), routeController.create)
router.put('/:id', protect, authorize('admin'), validate(schemas.updateRoute), routeController.update)
router.delete('/:id', protect, authorize('admin'), routeController.delete)

module.exports = router
