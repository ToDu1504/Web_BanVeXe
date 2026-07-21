import axiosInstance from './axiosInstance'

export const statsApi = {
  getStats: async () => {
    const response = await axiosInstance.get('/stats')
    return response.data
  },
  getRevenue: async ({ startDate, endDate }) => {
    const response = await axiosInstance.get('/stats/revenue', {
      params: { startDate, endDate },
    })
    return response.data
  },
}
