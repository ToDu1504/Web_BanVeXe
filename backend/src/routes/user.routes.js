const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Quầy vé — đặt vé hộ khách: staff/admin cần tìm/tạo khách hàng theo SĐT.
// Khai báo TRƯỚC blanket admin-only middleware bên dưới, với authorize riêng.
router.get('/customers/search', protect, authorize('staff', 'admin'), userController.searchCustomers)
router.post('/customers', protect, authorize('staff', 'admin'), validate(schemas.resolveCustomer), userController.resolveOrCreateCustomer)

// Protect all routes below to only be accessible by Admins
router.use(protect, authorize('admin'))

router.route('/')
  .get(userController.getAll)
  .post(validate(schemas.createUser), userController.create)

router.get('/drivers', userController.getDrivers)
router.get('/:id/unavailabilities', userController.getDriverUnavailabilities)
router.put('/:id/role', validate(schemas.updateUserRole), userController.updateRole)
router.put('/:id/status', validate(schemas.updateUserStatus), userController.updateStatus)
router.delete('/:id', userController.delete)

module.exports = router
