import { cn } from '@/lib/utils'

// Trạng thái rỗng dùng chung: icon + thông điệp căn giữa, thay thế các đoạn
// text rỗng lặp lại ở mọi trang danh sách staff/admin.
export default function EmptyState({ icon: Icon, title = 'Không có dữ liệu', description, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-16 text-center', className)}>
      {Icon && <Icon className="h-10 w-10 text-[hsl(var(--muted-foreground))]" strokeWidth={1.5} />}
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{description}</p>}
    </div>
  )
}
