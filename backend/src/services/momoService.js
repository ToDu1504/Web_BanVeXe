const crypto = require('crypto')
const momoConfig = require('../config/momo.config')

const sign = (rawSignature, secretKey) =>
  crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')

// @desc Gọi API MoMo (v2, requestType=captureWallet) để lấy payUrl thanh toán
const createPaymentRequest = async ({ orderId, amount, orderInfo, extraData = '' }) => {
  const { partnerCode, accessKey, secretKey, endpoint, redirectUrl, ipnUrl } = momoConfig
  const requestId = orderId
  const requestType = 'captureWallet'

  // Thứ tự các trường trong raw signature là bắt buộc theo tài liệu MoMo
  const rawSignature =
    `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`

  const signature = sign(rawSignature, secretKey)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    }),
  })

  const data = await response.json()
  if (data.resultCode !== 0) {
    throw new Error(data.message || 'Không thể khởi tạo thanh toán MoMo.')
  }
  return data // { payUrl, deeplink, qrCodeUrl, ... }
}

// @desc Xác thực chữ ký MoMo trả về (dùng chung cho IPN và redirect thủ công)
const verifySignature = (payload) => {
  const {
    partnerCode, orderId, requestId, amount, orderInfo,
    orderType, transId, resultCode, message, payType,
    responseTime, extraData, signature,
  } = payload

  if (!signature) return false

  const rawSignature =
    `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}` +
    `&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}` +
    `&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}` +
    `&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`

  return sign(rawSignature, momoConfig.secretKey) === signature
}

module.exports = { createPaymentRequest, verifySignature }