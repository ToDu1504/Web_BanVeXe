import axiosInstance from './axiosInstance'

export const routeApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/routes')
    return response.data
  },
  getById: async (id) => {
    const response = await axiosInstance.get(`/routes/${id}`)
    return response.data
  },
  create: async (routeData) => {
    const response = await axiosInstance.post('/routes', routeData)
    return response.data
  },
  update: async (id, routeData) => {
    const response = await axiosInstance.put(`/routes/${id}`, routeData)
    return response.data
  },
  delete: async (id) => {
    const response = await axiosInstance.delete(`/routes/${id}`)
    return response.data
  },
}
