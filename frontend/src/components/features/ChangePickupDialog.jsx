import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ticketApi } from '@/api/ticketApi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PickupSelector from '@/components/features/PickupSelector'
import { getShuttleAvailability } from '@/lib/shuttle'

// Đổi cách lên xe của một vé đã đặt (khách: trước mốc chốt; staff/admin: bất kỳ lúc nào trước giờ chạy).
export default function ChangePickupDialog({ ticket, open, onOpenChange, privileged = false, onSaved }) {
  const [value, setValue] = useState({ type: 'station', address: '', note: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && ticket) {
      setValue({
        type: ticket.pickup_type || 'station',
        address: ticket.pickup_address || '',
        note: ticket.pickup_note || '',
      })
      setError('')
    }
  }, [open, ticket])

  if (!ticket?.Trip) return null
  const route = ticket.Trip.Route
  // Vé đang là trung chuyển vẫn cho đổi về "tự đến bến" dù đã quá mốc chốt (với staff).
  const availability = getShuttleAvailability(ticket.Trip, route, { privileged })

  const handleSave = async () => {
    if (value.type === 'shuttle' && value.address.trim().length < 5) {
      setError('Vui lòng nhập địa chỉ đón (ít nhất 5 ký tự)')
      return
    }
    setSaving(true)
    try {
      await ticketApi.updatePickup(ticket.id, {
        pickup_type: value.type,
        ...(value.type === 'shuttle'
          ? { pickup_address: value.address.trim(), pickup_note: value.note.trim() || undefined }
          : {}),
      })
      toast.success('Đã cập nhật cách lên xe.')
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật cách lên xe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Đổi cách lên xe — ghế {ticket.seat_number}</DialogTitle>
          <DialogDescription>{ticket.passenger_name} · {ticket.passenger_phone}</DialogDescription>
        </DialogHeader>
        <PickupSelector
          idPrefix={`change-${ticket.id}`}
          value={value}
          onChange={(next) => { setValue(next); setError('') }}
          route={route}
          availability={availability}
          error={error}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
