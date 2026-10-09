import { Bus, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// Chọn cách lên xe cho một vé: tự đến bến hoặc xe trung chuyển đón tại địa chỉ.
// Controlled: value = { type, address, note }. `availability` = { available, reason }
// (xem lib/shuttle.js) — khi không available thì khóa lựa chọn trung chuyển.
export default function PickupSelector({ value, onChange, route, availability, error, idPrefix }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const shuttleDisabled = !availability.available

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Cách lên xe</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-start gap-3 p-3 border border-[hsl(var(--border))] rounded-lg cursor-pointer hover:bg-[hsl(var(--muted)/0.3)] has-checked:border-[hsl(var(--primary))] has-checked:bg-[hsl(var(--primary)/0.05)]">
          <input
            type="radio"
            name={`${idPrefix}-pickup`}
            checked={value.type === 'station'}
            onChange={() => set({ type: 'station' })}
            className="mt-1 accent-[hsl(var(--primary))]"
          />
          <div className="text-sm">
            <p className="font-semibold flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Tự đến bến</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {route?.origin_station || 'Có mặt tại bến/văn phòng nhà xe trước giờ chạy.'}
            </p>
          </div>
        </label>

        <label
          className={cn(
            'flex items-start gap-3 p-3 border border-[hsl(var(--border))] rounded-lg has-checked:border-[hsl(var(--primary))] has-checked:bg-[hsl(var(--primary)/0.05)]',
            shuttleDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[hsl(var(--muted)/0.3)]',
          )}
          title={shuttleDisabled ? availability.reason : undefined}
        >
          <input
            type="radio"
            name={`${idPrefix}-pickup`}
            checked={value.type === 'shuttle'}
            disabled={shuttleDisabled}
            onChange={() => set({ type: 'shuttle' })}
            className="mt-1 accent-[hsl(var(--primary))]"
          />
          <div className="text-sm">
            <p className="font-semibold flex items-center gap-1.5"><Bus className="h-4 w-4" /> Xe trung chuyển đón</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {shuttleDisabled
                ? availability.reason
                : route?.shuttle_area_note || 'Xe trung chuyển đến đón tại địa chỉ của bạn (miễn phí).'}
            </p>
          </div>
        </label>
      </div>

      {value.type === 'shuttle' && (
        <div className="space-y-2">
          <Input
            id={`${idPrefix}-pickup-address`}
            placeholder="Địa chỉ đón (số nhà, đường, phường/quận)"
            value={value.address}
            onChange={(e) => set({ address: e.target.value })}
            className={error ? 'border-[hsl(var(--destructive))]' : ''}
          />
          {error && <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>}
          <Textarea
            placeholder="Ghi chú cho tài xế (ví dụ: hẻm 12, cổng xanh) — không bắt buộc"
            value={value.note}
            onChange={(e) => set({ note: e.target.value })}
            rows={2}
          />
        </div>
      )}
    </div>
  )
}
