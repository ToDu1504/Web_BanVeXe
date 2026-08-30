import React from 'react'
import { Badge } from '@/components/ui/badge'

export default function ActiveStatus({ isActive }) {
  return (
    <Badge variant={isActive ? 'success' : 'destructive'} className="font-semibold px-2.5 py-1">
      {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
    </Badge>
  )
}
