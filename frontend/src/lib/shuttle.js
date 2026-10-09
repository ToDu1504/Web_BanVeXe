// Xe trung chuyển — quy tắc phía giao diện (backend vẫn kiểm tra lại, md/DonKhachTrungChuyen.md R1/R3).
export const DEFAULT_SHUTTLE_CUTOFF_MINUTES = 120

export const PICKUP_LABELS = {
  station: 'Tự đến bến',
  shuttle: 'Xe trung chuyển đón',
}

// Chuyến đã qua mốc chốt danh sách đón chưa.
export function isPastShuttleCutoff(trip, now = Date.now()) {
  const cutoff = trip?.shuttle_cutoff_minutes ?? DEFAULT_SHUTTLE_CUTOFF_MINUTES
  return now >= new Date(trip.departure_time).getTime() - cutoff * 60 * 1000
}

// { available, reason } — có chọn được xe trung chuyển cho chuyến này không.
// Staff/admin được bỏ qua mốc chốt nhưng không bỏ qua cờ của tuyến.
export function getShuttleAvailability(trip, route, { privileged = false } = {}) {
  if (!route?.shuttle_enabled) return { available: false, reason: 'Tuyến này chưa hỗ trợ xe trung chuyển.' }
  if (!privileged && isPastShuttleCutoff(trip)) {
    return { available: false, reason: 'Đã quá hạn đăng ký xe trung chuyển cho chuyến này.' }
  }
  return { available: true, reason: '' }
}

// Dòng mô tả cách lên xe của một vé.
export function describePickup(ticket, route) {
  if (ticket.pickup_type === 'shuttle') return `Xe trung chuyển đón: ${ticket.pickup_address}`
  return route?.origin_station ? `Tự đến bến: ${route.origin_station}` : 'Tự đến bến'
}
