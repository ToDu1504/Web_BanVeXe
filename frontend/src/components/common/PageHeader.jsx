import { cn } from '@/lib/utils'

// Header dùng chung cho các trang danh sách staff/admin: tiêu đề + mô tả bên
// trái, khu vực action (nút "Thêm mới"...) bên phải.
export default function PageHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
