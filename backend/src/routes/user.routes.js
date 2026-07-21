const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

// Protect all routes to only be accessible by Admins
router.use(protect, authorize('admin'))

router.route('/')
  .get(userController.getAll)
  .post(validate(schemas.createUser), userController.create)

router.put('/:id/role', validate(schemas.updateUserRole), userController.updateRole)
router.put('/:id/status', validate(schemas.updateUserStatus), userController.updateStatus)
router.delete('/:id', userController.delete)

module.exports = router
