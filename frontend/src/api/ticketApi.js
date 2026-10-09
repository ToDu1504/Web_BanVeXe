import axiosInstance from './axiosInstance'

export const ticketApi = {
  cancelTicket: async (id) => {
    const response = await axiosInstance.delete(`/tickets/${id}`)
    return response.data
  },
  printTicket: async (id, data = {}) => {
    const response = await axiosInstance.post(`/tickets/${id}/print`, data)
    return response.data
  },
  getPrintHistory: async (id) => {
    const response = await axiosInstance.get(`/tickets/${id}/prints`)
    return response.data
  },
  // Điểm danh khách lên xe (tài xế/staff/admin). boarded: true | false
  setBoarded: async (id, boarded) => {
    const response = await axiosInstance.put(`/tickets/${id}/board`, { boarded })
    return response.data
  },
  // Đổi cách lên xe: { pickup_type: 'station' | 'shuttle', pickup_address?, pickup_note? }
  updatePickup: async (id, data) => {
    const response = await axiosInstance.put(`/tickets/${id}/pickup`, data)
    return response.data
  },
  getPrintLog: async (params = {}) => {
    const response = await axiosInstance.get('/tickets/prints', { params })
    return response.data
  },
}
