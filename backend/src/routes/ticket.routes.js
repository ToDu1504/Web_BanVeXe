const express = require('express')
const router = express.Router()
const ticketController = require('../controllers/ticketController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Protect cancellation endpoint for customers or admins
router.delete('/:id', protect, authorize('customer', 'staff', 'admin'), ticketController.cancelTicket)

// Quầy vé — in vé & đối soát cuối ca (staff/admin only)
router.get('/prints', protect, authorize('staff', 'admin'), ticketController.getPrintLog)
router.get('/:id/prints', protect, authorize('staff', 'admin'), ticketController.getPrintHistory)
router.post('/:id/print', protect, authorize('staff', 'admin'), validate(schemas.printTicket), ticketController.printTicket)

// Điểm danh khách lên xe — tài xế (chỉ chuyến của mình), staff, admin
router.put('/:id/board', protect, authorize('driver', 'staff', 'admin'), validate(schemas.setBoarded), ticketController.setBoarded)

module.exports = router
