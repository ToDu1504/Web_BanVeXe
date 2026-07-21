import React from 'react'
import { Badge } from '@/components/ui/badge'

export default function InvoiceStatus({ status }) {
  const statusConfig = {
    pending: {
      label: 'Chờ thanh toán',
      variant: 'warning',
    },
    paid: {
      label: 'Đã thanh toán',
      variant: 'success',
    },
    refunded: {
      label: 'Đã hoàn tiền',
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
