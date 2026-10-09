import React from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

// Ô chọn tài xế dùng chung cho tài xế chính / tài xế phụ khi lập chuyến.
// `drivers` lấy từ GET /api/users/drivers (đã gắn unavailable, busy_trip,
// is_vehicle_regular và sắp xếp sẵn). Chia 2 nhóm "Trống lịch" / "Không khả
// dụng" (khóa chọn, ghi lý do). `excludeId`: người đang được chọn ở ô còn lại
// (không cho chọn trùng). `keepIds`: tài xế đang gán sẵn trên chuyến đang sửa —
// vẫn chọn được dù bị đánh dấu bận/nghỉ.
export default function DriverSelect({
  id,
  value,
  onChange,
  drivers,
  excludeId,
  keepIds = [],
  noneLabel = 'Chưa phân công',
}) {
  const options = drivers.filter((d) => d.id !== excludeId)
  const available = options.filter((d) => !d.unavailable && !d.busy_trip)
  const blocked = options.filter((d) => d.unavailable || d.busy_trip)

  return (
    <Select
      value={value ? value.toString() : 'none'}
      onValueChange={(val) => onChange(val === 'none' ? null : parseInt(val))}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Chọn tài xế..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{noneLabel}</SelectItem>
        {available.length > 0 && (
          <SelectGroup>
            <SelectLabel>Trống lịch ({available.length})</SelectLabel>
            {available.map((d) => (
              <SelectItem key={`${id}-${d.id}`} value={d.id.toString()}>
                {d.full_name}{d.phone ? ` - ${d.phone}` : ''}{d.is_vehicle_regular ? ' ★ tài xế của xe' : ''}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {blocked.length > 0 && (
          <SelectGroup>
            <SelectLabel>Không khả dụng ({blocked.length})</SelectLabel>
            {blocked.map((d) => (
              <SelectItem key={`${id}-${d.id}`} value={d.id.toString()} disabled={!keepIds.includes(d.id)}>
                {d.full_name} ({d.unavailable ? 'đang nghỉ' : `trùng TRIP-${d.busy_trip.id}`})
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
