import axiosInstance from './axiosInstance'

export const tripTemplateApi = {
  getAll: async (params) => {
    const response = await axiosInstance.get('/trip-templates', { params })
    return response.data
  },
  getById: async (id) => {
    const response = await axiosInstance.get(`/trip-templates/${id}`)
    return response.data
  },
  create: async (templateData) => {
    const response = await axiosInstance.post('/trip-templates', templateData)
    return response.data
  },
  update: async (id, templateData) => {
    const response = await axiosInstance.put(`/trip-templates/${id}`, templateData)
    return response.data
  },
  delete: async (id) => {
    const response = await axiosInstance.delete(`/trip-templates/${id}`)
    return response.data
  },
  generateNow: async () => {
    const response = await axiosInstance.post('/trip-templates/generate-now')
    return response.data
  },
}
