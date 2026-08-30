import axiosInstance from './axiosInstance'

export const invoiceApi = {
  create: async (invoiceData) => {
    // invoiceData: { total_price, payment_method, tickets: [{ trip_id, seat_number, passenger_name, passenger_phone, ticket_price }] }
    const response = await axiosInstance.post('/invoices', invoiceData)
    return response.data
  },
  getMyInvoices: async (params) => {
    const response = await axiosInstance.get('/invoices/my', { params })
    return response.data
  },
  getById: async (id) => {
    const response = await axiosInstance.get(`/invoices/${id}`)
    return response.data
  },
  cancelInvoice: async (id) => {
    const response = await axiosInstance.delete(`/invoices/${id}`)
    return response.data
  },
  // Staff/Admin endpoints
  getAll: async (params) => {
    const response = await axiosInstance.get('/invoices', { params })
    return response.data
  },
  updateStatus: async (id, statusData) => {
    // statusData: { payment_status }
    const response = await axiosInstance.put(`/invoices/${id}/status`, statusData)
    return response.data
  },
}
