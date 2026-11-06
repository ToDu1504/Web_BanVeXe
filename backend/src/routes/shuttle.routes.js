const express = require('express')
const router = express.Router()
const shuttleController = require('../controllers/shuttleController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

router.use(protect, authorize('staff', 'admin'))

router.get('/queue', shuttleController.getQueue)
router.get('/pickup-list', shuttleController.getPickupList)
router.post('/mark-printed', validate(schemas.markShuttlePrinted), shuttleController.markPrinted)
router.post('/notify', validate(schemas.markShuttlePrinted), shuttleController.notify)

module.exports = router
