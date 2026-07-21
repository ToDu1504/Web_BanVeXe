const express = require('express')
const router = express.Router()
const statsController = require('../controllers/statsController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')

// Protect all stats endpoints for staff/admin only
router.use(protect, authorize('staff', 'admin'))

router.get('/', statsController.getStats)
router.get('/revenue', statsController.getRevenue)

module.exports = router
