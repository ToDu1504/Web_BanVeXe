const express = require('express')
const router = express.Router()
const invoiceController = require('../controllers/invoiceController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Protected routes
router.use(protect)

// Customer can create invoices and view/cancel their own invoices
router.post('/', authorize('customer', 'staff', 'admin'), validate(schemas.createInvoice), invoiceController.create)
router.get('/my', authorize('customer'), invoiceController.getMyInvoices)
router.delete('/:id', authorize('customer', 'staff', 'admin'), invoiceController.cancelInvoice)

// Staff/Admin can view all and update invoice status
router.get('/', authorize('staff', 'admin'), invoiceController.getAll)
router.put('/:id/status', authorize('staff', 'admin'), validate(schemas.updateInvoiceStatus), invoiceController.updateStatus)

module.exports = router
