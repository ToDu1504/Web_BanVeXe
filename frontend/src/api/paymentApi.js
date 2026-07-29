import axiosInstance from './axiosInstance'

export const paymentApi = {
  // Khởi tạo thanh toán MoMo (sandbox) cho một hóa đơn đang chờ thanh toán
  // Trả về { payUrl, qrCodeUrl, deeplink, orderId }
  createMomoPayment: async (invoiceId) => {
    const response = await axiosInstance.post(`/payments/momo/create/${invoiceId}`)
    return response.data
  },
  // Xác thực kết quả trả về từ MoMo khi trình duyệt redirect về trang web
  verifyMomoReturn: async (payload) => {
    const response = await axiosInstance.post('/payments/momo/verify-return', payload)
    return response.data
  },
}