import React from 'react'
import { formatDateTime } from '@/lib/utils'

// Ô "Tài xế" trên bảng danh sách xe (ViewVehicles / ManageVehicles):
// tài xế của chuyến đang chạy hoặc chuyến sắp chạy gần nhất, kèm đội tài xế
// thay ca của xe (tài xế mặc định trên các mẫu chuyến). Dữ liệu do backend
// vehicleController.getAll gắn sẵn (current_driver, current_trip, regular_drivers).
export default function VehicleDriverCell({ vehicle }) {
  const { current_driver: driver, current_co_driver: coDriver, current_trip: trip, regular_drivers: regulars = [] } = vehicle
  const others = regulars.filter((d) => d.id !== driver?.id && d.id !== coDriver?.id)

  if (!driver && regulars.length === 0) {
    return <span className="text-xs text-[hsl(var(--muted-foreground))]">Chưa phân công</span>
  }

  return (
    <div className="text-xs">
      {driver ? (
        <>
          <p className="font-semibold">{driver.full_name}</p>
          {driver.phone && <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{driver.phone}</p>}
          {coDriver && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
              Phụ: {coDriver.full_name}{coDriver.phone ? ` – ${coDriver.phone}` : ''}
            </p>
          )}
          {trip && (
            <p
              className={
                trip.status === 'ongoing'
                  ? 'text-[10px] font-semibold text-[hsl(var(--warning))]'
                  : 'text-[10px] text-[hsl(var(--muted-foreground))]'
              }
            >
              {trip.status === 'ongoing'
                ? `Đang chạy TRIP-${trip.id}`
                : `Chuyến tới: ${formatDateTime(trip.departure_time)}`}
            </p>
          )}
        </>
      ) : (
        <p className="text-[hsl(var(--muted-foreground))]">Chưa có chuyến sắp tới</p>
      )}
      {others.length > 0 && (
        <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
          Tài xế khác của xe: {others.map((d) => d.full_name).join(', ')}
        </p>
      )}
    </div>
  )
}
