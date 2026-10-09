import React from 'react'
import { cn, formatTime, toVNDateString, addDays, formatDateString } from '@/lib/utils'
import TripStatus from '@/components/features/TripStatus'
import { ArrowRight, Clock, AlertTriangle } from 'lucide-react'

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const URGENT_THRESHOLD_MS = 2 * 60 * 60 * 1000

function isUrgent(trip) {
  if (trip.status !== 'scheduled') return false
  const diff = new Date(trip.departure_time).getTime() - Date.now()
  return diff > 0 && diff < URGENT_THRESHOLD_MS
}

// Một thẻ chuyến nhỏ trong ô ngày.
function TripChip({ trip, onSelect }) {
  const cancelled = trip.status === 'cancelled'
  return (
    <button
      type="button"
      onClick={() => onSelect?.(trip)}
      className={cn(
        'w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 text-left text-xs shadow-sm transition-colors hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted)/0.4)]',
        cancelled && 'opacity-60',
      )}
    >
      <div className={cn('flex items-center gap-1 font-bold', cancelled && 'line-through')}>
        <Clock className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" />
        {formatTime(trip.departure_time)}–{trip.arrival_time ? formatTime(trip.arrival_time) : '?'}
      </div>
      <div className={cn('mt-1 flex flex-wrap items-center gap-1 font-semibold', cancelled && 'line-through')}>
        <span>{trip.Route?.origin}</span>
        <ArrowRight className="h-3 w-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
        <span>{trip.Route?.destination}</span>
      </div>
      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
        Xe {trip.Vehicle?.license_plate} · {trip.sold_seats}/{trip.total_seats ?? '?'} khách
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <TripStatus status={trip.status} />
        {isUrgent(trip) && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)]">
            Sắp khởi hành
          </span>
        )}
        {trip.my_role === 'co' && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]">
            Tài xế phụ
          </span>
        )}
        {trip.open_incident_count > 0 && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)]">
            <AlertTriangle className="h-3 w-3" /> {trip.open_incident_count}
          </span>
        )}
      </div>
    </button>
  )
}

// Lưới lịch tuần T2→CN: desktop 7 cột, mobile xếp dọc theo từng ngày.
export default function DriverWeekSchedule({ trips = [], weekStart, onSelectTrip }) {
  const today = toVNDateString()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const tripsByDay = new Map(days.map((d) => [d, []]))
  for (const trip of trips) {
    const key = toVNDateString(trip.departure_time)
    if (tripsByDay.has(key)) tripsByDay.get(key).push(trip)
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
      {days.map((day, index) => {
        const dayTrips = tripsByDay.get(day)
        const isToday = day === today
        return (
          <div
            key={day}
            className={cn(
              'rounded-xl border p-2.5',
              isToday
                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]',
            )}
          >
            <div className="mb-2 flex items-baseline justify-between md:block">
              <p className={cn('text-sm font-bold', isToday && 'text-[hsl(var(--primary))]')}>
                {WEEKDAY_LABELS[index]}
                {isToday && <span className="ml-1.5 text-[10px] font-semibold uppercase">Hôm nay</span>}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatDateString(day).slice(0, 5)}</p>
            </div>
            <div className="space-y-2">
              {dayTrips.length > 0 ? (
                dayTrips.map((trip) => <TripChip key={trip.id} trip={trip} onSelect={onSelectTrip} />)
              ) : (
                <p className="py-2 text-xs text-[hsl(var(--muted-foreground))]">Không có chuyến</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
