import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Wrapper trình bày đơn giản cho field trong form react-hook-form + zod —
// gộp Label + control + thông báo lỗi để tránh lặp lại 3 dòng boilerplate
// ở mỗi field trong các dialog CRUD (ManageRoutes/ManageTrips/ManageVehicles...).
function FormField({ label, htmlFor, error, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error && <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}

export { FormField }
