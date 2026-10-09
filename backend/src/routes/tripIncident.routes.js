const express = require('express')
const router = express.Router()
const tripIncidentController = require('../controllers/tripIncidentController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')

router.use(protect, authorize('staff', 'admin'))

router.get('/', tripIncidentController.getAll)
router.put('/:id/resolve', tripIncidentController.resolve)

module.exports = router
