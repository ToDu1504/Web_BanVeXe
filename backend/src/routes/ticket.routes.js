const express = require('express')
const router = express.Router()
const ticketController = require('../controllers/ticketController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')

// Protect cancellation endpoint for customers or admins
router.delete('/:id', protect, authorize('customer', 'staff', 'admin'), ticketController.cancelTicket)

module.exports = router
