import axiosInstance from './axiosInstance'

export const userApi = {
  getAll: async (params) => {
    const response = await axiosInstance.get('/users', { params })
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
  searchCustomers: async (phone) => {
    const response = await axiosInstance.get('/users/customers/search', { params: { phone } })
    return response.data
  },
  resolveOrCreateCustomer: async (data) => {
    const response = await axiosInstance.post('/users/customers', data)
    return response.data
  },
}
