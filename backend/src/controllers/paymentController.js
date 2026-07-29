const { Invoice } = require('../models')
const momoService = require('../services/momoService')

// orderId gửi cho MoMo được mã hóa dạng INV{invoiceId}-{timestamp} để
// tra ngược lại hóa đơn khi nhận kết quả (IPN hoặc redirect), không cần cột DB mới.
const extractInvoiceId = (orderId = '') => {
  const match = /^INV(\d+)-/.exec(orderId)
  return match ? parseInt(match[1], 10) : null
}

// Áp kết quả thanh toán MoMo vào hóa đơn tương ứng — idempotent, dùng chung
// cho cả IPN (server-to-server) và redirect thủ công (verify-return).
const applyMomoResult = async (payload) => {
  const invoiceId = extractInvoiceId(payload.orderId)
  if (!invoiceId) return null

  const invoice = await Invoice.findByPk(invoiceId)
  if (!invoice) return null

  if (String(payload.resultCode) === '0' && invoice.payment_status === 'pending') {
    invoice.payment_status = 'paid'
    await invoice.save()
  }

  return invoice
}

const paymentController = {
  // @desc    Tạo yêu cầu thanh toán MoMo (sandbox) cho một hóa đơn đang chờ thanh toán
  // @route   POST /api/payments/momo/create/:invoiceId
  // @access  Private (chủ hóa đơn, hoặc staff/admin)
  createMomoPayment: async (req, res) => {
    try {
      const invoice = await Invoice.findByPk(req.params.invoiceId)

      if (!invoice) {
        return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' })
      }
      if (req.user.role === 'customer' && invoice.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền thanh toán hóa đơn này.' })
      }
      if (invoice.payment_status !== 'pending') {
        return res.status(400).json({ message: 'Hóa đơn này không ở trạng thái chờ thanh toán.' })
      }
      if (invoice.payment_method !== 'momo') {
        return res.status(400).json({ message: 'Hóa đơn này không sử dụng phương thức thanh toán MoMo.' })
      }

      const orderId = `INV${invoice.id}-${Date.now()}`
      const amount = Math.round(Number(invoice.total_price))

      const momoRes = await momoService.createPaymentRequest({
        orderId,
        amount,
        orderInfo: `Thanh toan hoa don ve xe HD-${invoice.id}`,
      })

      return res.status(200).json({
        payUrl: momoRes.payUrl,
        qrCodeUrl: momoRes.qrCodeUrl,
        deeplink: momoRes.deeplink,
        orderId,
      })
    } catch (error) {
      console.error('Lỗi tạo thanh toán MoMo:', error)
      return res.status(500).json({ message: error.message || 'Lỗi hệ thống khi khởi tạo thanh toán MoMo.' })
    }
  },

  // @desc    Nhận thông báo kết quả thanh toán từ MoMo (server-to-server)
  // @route   POST /api/payments/momo/ipn
  // @access  Public (gọi bởi MoMo — cần domain public/ngrok để nhận được ở local)
  momoIpn: async (req, res) => {
    try {
      if (!momoService.verifySignature(req.body)) {
        return res.status(400).json({ message: 'Chữ ký không hợp lệ.' })
      }
      await applyMomoResult(req.body)
      return res.status(204).send()
    } catch (error) {
      console.error('Lỗi xử lý IPN MoMo:', error)
      return res.status(500).json({ message: 'Lỗi xử lý IPN.' })
    }
  },

  // @desc    Xác thực kết quả thanh toán từ query params khi MoMo redirect trình
  //          duyệt người dùng về lại trang web (bổ sung cho IPN — hoạt động được
  //          cả khi chạy local vì trình duyệt gọi trực tiếp tới backend của ta).
  // @route   POST /api/payments/momo/verify-return
  // @access  Private
  verifyReturn: async (req, res) => {
    try {
      const payload = req.body
      if (!momoService.verifySignature(payload)) {
        return res.status(400).json({ message: 'Chữ ký không hợp lệ.' })
      }

      const invoice = await applyMomoResult(payload)
      return res.status(200).json({
        success: String(payload.resultCode) === '0',
        payment_status: invoice ? invoice.payment_status : undefined,
        message: payload.message,
      })
    } catch (error) {
      console.error('Lỗi xác thực kết quả MoMo:', error)
      return res.status(500).json({ message: 'Lỗi xác thực kết quả thanh toán.' })
    }
  },
}

module.exports = paymentController