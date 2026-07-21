import axiosInstance from './axiosInstance'

export const vehicleApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/vehicles')
    return response.data
  },
  getById: async (id) => {
    const response = await axiosInstance.get(`/vehicles/${id}`)
    return response.data
  },
  create: async (vehicleData) => {
    const response = await axiosInstance.post('/vehicles', vehicleData)
    return response.data
  },
  update: async (id, vehicleData) => {
    const response = await axiosInstance.put(`/vehicles/${id}`, vehicleData)
    return response.data
  },
  delete: async (id) => {
    const response = await axiosInstance.delete(`/vehicles/${id}`)
    return response.data
  },
}
