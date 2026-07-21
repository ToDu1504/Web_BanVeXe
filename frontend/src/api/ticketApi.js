import axiosInstance from './axiosInstance'

export const ticketApi = {
  cancelTicket: async (id) => {
    const response = await axiosInstance.delete(`/tickets/${id}`)
    return response.data
  },
}
