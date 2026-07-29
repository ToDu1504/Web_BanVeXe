const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')
const { protect } = require('../middlewares/auth')
const { authorize } = require('../middlewares/role')

// Public — gọi trực tiếp bởi máy chủ MoMo, không có cookie xác thực người dùng
router.post('/momo/ipn', paymentController.momoIpn)

// Protected — người dùng đã đăng nhập khởi tạo/xác nhận thanh toán cho hóa đơn của mình
router.post('/momo/create/:invoiceId', protect, authorize('customer', 'staff', 'admin'), paymentController.createMomoPayment)
router.post('/momo/verify-return', protect, authorize('customer', 'staff', 'admin'), paymentController.verifyReturn)

module.exports = router