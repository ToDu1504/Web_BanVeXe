import axiosInstance from './axiosInstance'

export const userApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/users')
    return response.data
  },
  create: async (userData) => {
    const response = await axiosInstance.post('/users', userData)
    return response.data
  },
  updateRole: async (id, role) => {
    const response = await axiosInstance.put(`/users/${id}/role`, { role })
    return response.data
  },
  updateStatus: async (id, is_active) => {
    const response = await axiosInstance.put(`/users/${id}/status`, { is_active })
    return response.data
  },
  delete: async (id) => {
    const response = await axiosInstance.delete(`/users/${id}`)
    return response.data
  },
}
