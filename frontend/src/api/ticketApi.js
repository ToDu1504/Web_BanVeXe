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
  getPrintLog: async (params = {}) => {
    const response = await axiosInstance.get('/tickets/prints', { params })
    return response.data
  },
}
