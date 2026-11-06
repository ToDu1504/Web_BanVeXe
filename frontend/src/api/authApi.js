import axiosInstance from './axiosInstance'

export const authApi = {
  register: async (userData) => {
    const response = await axiosInstance.post('/auth/register', userData)
    return response.data
  },
  login: async (credentials) => {
    const response = await axiosInstance.post('/auth/login', credentials)
    return response.data
  },
  logout: async () => {
    const response = await axiosInstance.post('/auth/logout')
    return response.data
  },
  getMe: async () => {
    // skipAuthRedirect: khách vãng lai luôn nhận 401 ở đây khi vừa vào trang — đây là
    // trạng thái bình thường, không phải phiên hết hạn nên không được ép về /login.
    const response = await axiosInstance.get('/auth/me', { skipAuthRedirect: true })
    return response.data
  },
  updateProfile: async (profileData) => {
    const response = await axiosInstance.put('/auth/profile', profileData)
    return response.data
  },
  changePassword: async (passwordData) => {
    const response = await axiosInstance.put('/auth/change-password', passwordData)
    return response.data
  },
  forgotPassword: async (email) => {
    const response = await axiosInstance.post('/auth/forgot-password', { email })
    return response.data
  },
  resetPassword: async ({ token, newPassword }) => {
    const response = await axiosInstance.post('/auth/reset-password', { token, newPassword })
    return response.data
  },
}
