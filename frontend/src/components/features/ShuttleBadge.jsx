import { Badge } from '@/components/ui/badge'

// Badge "🚐 N khách đón" của một chuyến (staff/admin): kèm trạng thái danh sách
// đã chốt / đã in. Ẩn khi chuyến không có khách đi trung chuyển.
export default function ShuttleBadge({ trip }) {
  if (!trip.shuttle_count) return null
  const state = trip.shuttle_list_printed_at ? ' · đã in' : trip.shuttle_locked_at ? ' · đã chốt, chờ in' : ''
  return (
    <Badge
      variant={trip.shuttle_locked_at && !trip.shuttle_list_printed_at ? 'warning' : 'secondary'}
      className="mt-1 flex w-fit items-center gap-1 text-[10px]"
    >
      🚐 {trip.shuttle_count} khách đón{state}
    </Badge>
  )
}
