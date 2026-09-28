import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Printer } from 'lucide-react'

const vehicleTypeLabels = {
  sleeper: 'Giường nằm',
  limousine: 'Limousine',
  standard: 'Ghế ngồi tiêu chuẩn',
}

// Phiếu vé in cho khách tại quầy — mã QR chỉ để đối chiếu thủ công/ngoài hệ
// thống lúc lên xe, không có màn hình quét/soát vé trong app.
export default function TicketPrintView({ open, onOpenChange, ticket }) {
  if (!ticket) return null

  const trip = ticket.Trip
  const route = trip?.Route
  const vehicle = trip?.Vehicle
  const qrValue = `INV${ticket.invoice_id}-TK${ticket.id}`
  const isReprint = ticket.print_count > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .ticket-print-area, .ticket-print-area * { visibility: visible; }
            .ticket-print-area { position: absolute; top: 0; left: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>

        <DialogHeader className="no-print">
          <DialogTitle>Phiếu vé xe</DialogTitle>
          <DialogDescription>Xem lại thông tin trước khi in cho khách.</DialogDescription>
        </DialogHeader>

        <div className="ticket-print-area space-y-3 rounded-xl border border-[hsl(var(--border))] p-4">
          {isReprint && (
            <div className="rounded-md bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.4)] px-3 py-1.5 text-center text-xs font-bold text-[hsl(var(--destructive))]">
              BẢN IN LẠI — LẦN {ticket.print_count}
            </div>
          )}

          <div className="text-center">
            <p className="text-lg font-bold">VÉ XE KHÁCH</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Mã hóa đơn: HD-{ticket.invoice_id} • Mã vé: #{ticket.id}</p>
          </div>

          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{route?.origin || '—'}</span>
            <span className="text-[hsl(var(--muted-foreground))]">→</span>
            <span>{route?.destination || '—'}</span>
          </div>

          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">Giờ khởi hành</span>
            <span className="text-right font-medium">{trip ? formatDateTime(trip.departure_time) : '—'}</span>
            <span className="text-[hsl(var(--muted-foreground))]">Xe</span>
            <span className="text-right font-medium">
              {vehicle ? `${vehicle.license_plate} • ${vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}` : '—'}
            </span>
            <span className="text-[hsl(var(--muted-foreground))]">Số ghế</span>
            <span className="text-right font-medium">{ticket.seat_number}</span>
            <span className="text-[hsl(var(--muted-foreground))]">Hành khách</span>
            <span className="text-right font-medium">{ticket.passenger_name}</span>
            <span className="text-[hsl(var(--muted-foreground))]">Số điện thoại</span>
            <span className="text-right font-medium">{ticket.passenger_phone}</span>
            <span className="text-[hsl(var(--muted-foreground))]">Giá vé</span>
            <span className="text-right font-bold text-[hsl(var(--primary))]">{formatCurrency(ticket.ticket_price)}</span>
          </div>

          <div className="flex flex-col items-center gap-1 pt-1">
            <QRCodeSVG value={qrValue} size={110} />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{qrValue}</span>
          </div>

          <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))]">
            In lúc {formatDateTime(ticket.issued_at)} — Vé đã xuất, vui lòng mang theo khi lên xe.
          </p>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" /> In vé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
