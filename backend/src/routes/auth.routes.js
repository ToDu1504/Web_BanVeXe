const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { protect } = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const schemas = require('../utils/joiSchemas')

router.post('/register', validate(schemas.register), authController.register)
router.post('/login', validate(schemas.login), authController.login)
router.post('/logout', protect, authController.logout)
router.get('/me', protect, authController.getMe)
router.put('/profile', protect, validate(schemas.updateProfile), authController.updateProfile)
router.put('/change-password', protect, validate(schemas.changePassword), authController.changePassword)

module.exports = router
