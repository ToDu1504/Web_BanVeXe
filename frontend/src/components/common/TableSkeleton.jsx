import { Skeleton } from '@/components/ui/skeleton'

// Khung skeleton cho bảng dữ liệu đang tải — thay Loader2 spinner ở các
// trang danh sách staff/admin. Số cột/hàng tuỳ biến theo bảng thực tế.
export default function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={colIndex === 0 ? 'h-4 w-1/4' : 'h-4 flex-1'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
