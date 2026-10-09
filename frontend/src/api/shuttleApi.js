import axiosInstance from './axiosInstance'

export const shuttleApi = {
  // Hàng chờ "Cần in danh sách đón" (chuyến đã chốt, chưa in / cần in lại / bị hủy sau khi in)
  getQueue: async (params = {}) => {
    const response = await axiosInstance.get('/shuttles/queue', { params })
    return response.data
  },
  // Dữ liệu tờ in: theo trip_ids (mảng) hoặc khung from/to
  getPickupList: async ({ tripIds, from, to } = {}) => {
    const params = tripIds ? { trip_ids: tripIds.join(',') } : { from, to }
    const response = await axiosInstance.get('/shuttles/pickup-list', { params })
    return response.data
  },
  markPrinted: async (tripIds) => {
    const response = await axiosInstance.post('/shuttles/mark-printed', { trip_ids: tripIds })
    return response.data
  },
}
