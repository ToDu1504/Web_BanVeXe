import axiosInstance from './axiosInstance'

export const tripApi = {
  search: async ({ origin, destination, date, passengers, page, limit }) => {
    const response = await axiosInstance.get('/trips/search', {
      params: { origin, destination, date, passengers, page, limit },
    })
    return response.data
  },
  getById: async (id) => {
    const response = await axiosInstance.get(`/trips/${id}`)
    return response.data
  },
  getBookedSeats: async (id) => {
    const response = await axiosInstance.get(`/trips/${id}/booked-seats`)
    return response.data
  },
  getPassengers: async (id) => {
    const response = await axiosInstance.get(`/trips/${id}/tickets`)
    return response.data
  },
  // Admin endpoints
  getAll: async (params) => {
    const response = await axiosInstance.get('/trips', { params })
    return response.data
  },
  create: async (tripData) => {
    const response = await axiosInstance.post('/trips', tripData)
    return response.data
  },
  update: async (id, tripData) => {
    const response = await axiosInstance.put(`/trips/${id}`, tripData)
    return response.data
  },
  delete: async (id) => {
    const response = await axiosInstance.delete(`/trips/${id}`)
    return response.data
  },
}
