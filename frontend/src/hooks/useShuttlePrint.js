import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { shuttleApi } from '@/api/shuttleApi'

// Lấy dữ liệu danh sách đón của các chuyến, cho <ShuttlePickupSheet> in, rồi
// đánh dấu đã in (md/DonKhachTrungChuyen.md R8). Dùng chung cho trang hàng chờ
// /staff/shuttles và nút "In danh sách đón" trong TripPassengersDialog.
export function useShuttlePrint({ onPrinted } = {}) {
  const [entries, setEntries] = useState(null)
  const [loading, setLoading] = useState(false)
  const tripIdsRef = useRef([])

  const print = async (tripIds) => {
    setLoading(true)
    try {
      const data = await shuttleApi.getPickupList({ tripIds })
      if (!data.some((entry) => entry.passenger_count > 0)) {
        toast.info('Không có khách đi xe trung chuyển (đã thanh toán) để in.')
        return
      }
      tripIdsRef.current = data.map((entry) => entry.trip.id)
      setEntries(data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải danh sách đón.')
    } finally {
      setLoading(false)
    }
  }

  // Gọi khi hộp thoại in đóng (afterprint).
  const handleDone = async () => {
    try {
      await shuttleApi.markPrinted(tripIdsRef.current)
      onPrinted?.()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không ghi nhận được lần in danh sách đón.')
    } finally {
      setEntries(null)
    }
  }

  return { entries, loading, print, handleDone }
}
