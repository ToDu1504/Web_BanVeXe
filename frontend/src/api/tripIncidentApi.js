import axiosInstance from './axiosInstance'

export const tripIncidentApi = {
  getAll: async (params) => {
    const response = await axiosInstance.get('/trip-incidents', { params })
    return response.data
  },
  resolve: async (id) => {
    const response = await axiosInstance.put(`/trip-incidents/${id}/resolve`)
    return response.data
  },
}
