import axiosInstance from './axiosInstance'

// Endpoint dành riêng cho role `driver` (/api/driver/*).
export const driverApi = {
  // weekStart: 'YYYY-MM-DD' (Thứ 2 của tuần). Trả về mảng chuyến trong tuần.
  getWeekTrips: async (weekStart) => {
    const response = await axiosInstance.get('/driver/trips', { params: { week_start: weekStart } })
    return response.data
  },
  getTripById: async (id) => {
    const response = await axiosInstance.get(`/driver/trips/${id}`)
    return response.data
  },
  getDashboard: async () => {
    const response = await axiosInstance.get('/driver/dashboard')
    return response.data
  },
  startTrip: async (id) => {
    const response = await axiosInstance.post(`/driver/trips/${id}/start`)
    return response.data
  },
  completeTrip: async (id) => {
    const response = await axiosInstance.post(`/driver/trips/${id}/complete`)
    return response.data
  },
  reportIncident: async (id, data) => {
    const response = await axiosInstance.post(`/driver/trips/${id}/incidents`, data)
    return response.data
  },
  getHistory: async (params) => {
    const response = await axiosInstance.get('/driver/history', { params })
    return response.data
  },
  // Tải file .ics (iCalendar) của tuần — trả về Blob để client lưu file.
  downloadScheduleIcs: async (weekStart) => {
    const response = await axiosInstance.get('/driver/schedule.ics', {
      params: { week_start: weekStart },
      responseType: 'blob',
    })
    return response.data
  },
  getUnavailabilities: async () => {
    const response = await axiosInstance.get('/driver/unavailabilities')
    return response.data
  },
  createUnavailability: async (data) => {
    const response = await axiosInstance.post('/driver/unavailabilities', data)
    return response.data
  },
  deleteUnavailability: async (id) => {
    const response = await axiosInstance.delete(`/driver/unavailabilities/${id}`)
    return response.data
  },
}
