import React from 'react'
import { Badge } from '@/components/ui/badge'

export default function TripStatus({ status }) {
  const statusConfig = {
    scheduled: {
      label: 'Sắp khởi hành',
      variant: 'secondary',
    },
    ongoing: {
      label: 'Đang chạy',
      variant: 'warning',
    },
    completed: {
      label: 'Đã hoàn thành',
      variant: 'success',
    },
    cancelled: {
      label: 'Đã hủy',
      variant: 'destructive',
    },
  }

  const config = statusConfig[status] || { label: 'Không xác định', variant: 'outline' }

  return (
    <Badge variant={config.variant} className="font-semibold px-2.5 py-1">
      {config.label}
    </Badge>
  )
}
