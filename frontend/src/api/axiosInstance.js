import axios from 'axios'
import { store } from '@/store/store'
import { logout } from '@/store/authSlice'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  withCredentials: true, // Send cookies automatically
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      store.dispatch(logout())
      // skipAuthRedirect: dùng cho request kiểm tra phiên đăng nhập lúc tải trang —
      // 401 ở đó chỉ có nghĩa là khách chưa đăng nhập, không phải phiên vừa hết hạn.
      if (
        !error.config?.skipAuthRedirect &&
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
