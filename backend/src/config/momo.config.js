// Cấu hình cổng thanh toán MoMo — mặc định dùng thông tin merchant thử nghiệm
// (test/sandbox) công khai của MoMo để chạy demo ngay không cần đăng ký.
// Khi có tài khoản merchant sandbox riêng, ghi đè các giá trị này qua .env.
module.exports = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
  secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  redirectUrl: process.env.MOMO_REDIRECT_URL || `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment/momo/return`,
  ipnUrl: process.env.MOMO_IPN_URL || `${process.env.SERVER_URL || 'http://localhost:8080'}/api/payments/momo/ipn`,
}