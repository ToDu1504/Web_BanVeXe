import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { tripApi } from '@/api/tripApi'
import { ticketApi } from '@/api/ticketApi'
import { useAuth } from '@/hooks/useAuth'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import InvoiceStatus from '@/components/features/InvoiceStatus'
import EmptyState from '@/components/common/EmptyState'
import { formatDateTime } from '@/lib/utils'
import { Users, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'

const vehicleTypeLabels = {
  sleeper: 'Giường nằm',
  limousine: 'Limousine',
  standard: 'Ghế ngồi tiêu chuẩn',
}

// Danh sách hành khách của một chuyến xe cụ thể — dùng chung cho trang "Xem
// chuyến xe" (staff), "Quản lý Chuyến xe" (admin) và "Chi tiết chuyến" (tài xế).
// Tài xế chỉ thấy tên/SĐT/ghế và cột điểm danh (backend không trả thông tin
// thanh toán/in vé cho role này). Hiển thị cả vé đã hủy
// (đánh dấu riêng) để không gây hiểu lầm về sức chứa còn lại của chuyến.
//
// Ngoài xem trên màn hình, dialog còn in được một "phiếu điểm danh" cho cả
// chuyến (khác với vé xe từng khách ở TicketPrintView) — để phụ xe đối chiếu
// hành khách lúc lên xe. Không giới hạn theo trạng thái thanh toán (đây là
// tài liệu nội bộ, không phải vé giao khách), chỉ đánh dấu đỏ khách chưa trả
// tiền để nhắc thu trước giờ chạy.
export default function TripPassengersDialog({ open, onOpenChange, tripId, onBoardedChange }) {
  const { user } = useAuth()
  const isDriver = user?.role === 'driver'
  const [loading, setLoading] = useState(false)
  const [trip, setTrip] = useState(null)
  const [tickets, setTickets] = useState([])

  useEffect(() => {
    if (!open || !tripId) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await tripApi.getPassengers(tripId)
        setTrip(res.trip)
        setTickets(res.tickets)
      } catch (error) {
        toast.error('Không thể tải danh sách hành khách')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [open, tripId])

  const bookedTickets = tickets.filter((t) => t.booking_status === 'booked')
  const boardedCount = bookedTickets.filter((t) => t.boarded_at).length
  // Chỉ điểm danh được khi chuyến còn đang chờ/đang chạy (backend cũng chặn).
  const canBoard = trip && ['scheduled', 'ongoing'].includes(trip.status)

  const handleToggleBoarded = async (ticket) => {
    const nextBoarded = !ticket.boarded_at
    const apply = (value) =>
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, boarded_at: value } : t)))
    apply(nextBoarded ? new Date().toISOString() : null) // optimistic
    try {
      await ticketApi.setBoarded(ticket.id, nextBoarded)
      onBoardedChange?.()
    } catch (error) {
      apply(ticket.boarded_at) // revert
      toast.error(error.response?.data?.message || 'Không thể cập nhật điểm danh')
    }
  }

  // Phiếu điểm danh chỉ hiện khi in — một tờ cho cả chuyến để phụ xe đối
  // chiếu hành khách lúc lên xe (khác với vé xe từng khách ở TicketPrintView).
  // Bỏ vé đã hủy vì không cần điểm danh chỗ trống.
  //
  // Portal thẳng ra document.body thay vì nằm trong DialogContent: DialogContent
  // ở đây có max-h-[90vh] overflow-y-auto (cần thiết cho bảng xem trên màn hình
  // dài), nếu để phiếu in nằm bên trong thì khi in nó bị cắt theo vùng cuộn của
  // dialog thay vì tràn hết trang giấy.
  const printManifest = open && trip && (
    <div className="manifest-print-area hidden print:block space-y-3 p-6">
      <div className="text-center">
        <p className="text-lg font-bold">DANH SÁCH HÀNH KHÁCH</p>
        <p className="text-sm">{trip?.Route?.origin} → {trip?.Route?.destination}</p>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-xs border border-black p-2">
        <span>Mã chuyến: TRIP-{tripId}</span>
        <span>Khởi hành: {trip ? formatDateTime(trip.departure_time) : '—'}</span>
        <span>Xe: {trip?.Vehicle?.license_plate}</span>
        <span>Loại xe: {vehicleTypeLabels[trip?.Vehicle?.vehicle_type] || trip?.Vehicle?.vehicle_type}</span>
        <span className="col-span-2">
          Tài xế: {trip?.Driver ? `${trip.Driver.full_name}${trip.Driver.phone ? ` – ${trip.Driver.phone}` : ''}` : '................................'}
          {'   '}Tài xế phụ: {trip?.CoDriver ? `${trip.CoDriver.full_name}${trip.CoDriver.phone ? ` – ${trip.CoDriver.phone}` : ''}` : '................................'}
        </span>
        <span className="col-span-2 font-bold">Tổng số khách: {bookedTickets.length}</span>
      </div>
      <table className="w-full text-xs border-collapse border border-black">
        <thead>
          <tr>
            <th className="border border-black p-1">STT</th>
            <th className="border border-black p-1">Ghế</th>
            <th className="border border-black p-1">Họ tên</th>
            <th className="border border-black p-1">SĐT</th>
            {!isDriver && <th className="border border-black p-1">Thanh toán</th>}
            <th className="border border-black p-1 w-16">Đối chiếu</th>
          </tr>
        </thead>
        <tbody>
          {bookedTickets.map((t, i) => (
            <tr key={t.id}>
              <td className="border border-black p-1 text-center">{i + 1}</td>
              <td className="border border-black p-1 text-center font-bold">{t.seat_number}</td>
              <td className="border border-black p-1">{t.passenger_name}</td>
              <td className="border border-black p-1">{t.passenger_phone}</td>
              {!isDriver && (
                <td className="border border-black p-1 text-center">
                  {t.Invoice?.payment_status === 'paid' ? 'Đã TT' : (
                    <span className="font-bold" style={{ color: 'red' }}>Chưa TT</span>
                  )}
                </td>
              )}
              <td className="border border-black p-1 text-center">{t.boarded_at ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px]">In lúc {formatDateTime(new Date())}</p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {printManifest && createPortal(printManifest, document.body)}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .manifest-print-area, .manifest-print-area * { visibility: visible; }
            .no-print { display: none !important; }
          }
        `}</style>

        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(var(--primary))]" />
            Danh sách khách — TRIP-{tripId}
          </DialogTitle>
          {trip && (
            <DialogDescription>
              {trip.Route?.origin} → {trip.Route?.destination} · Khởi hành {formatDateTime(trip.departure_time)} ·
              Xe {trip.Vehicle?.license_plate} · Tài xế {trip.Driver ? `${trip.Driver.full_name}${trip.Driver.phone ? ` (${trip.Driver.phone})` : ''}` : 'chưa phân công'}
              {trip.CoDriver && ` · Phụ ${trip.CoDriver.full_name}${trip.CoDriver.phone ? ` (${trip.CoDriver.phone})` : ''}`} · {bookedTickets.length} khách đã đặt · Đã lên xe {boardedCount}/{bookedTickets.length}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 items-center justify-center no-print">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
          </div>
        ) : tickets.length > 0 ? (
          <>
            <div className="flex justify-end no-print">
              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={bookedTickets.length === 0}>
                <Printer className="h-4 w-4 mr-1.5" /> In danh sách khách
              </Button>
            </div>

            {/* Bảng tương tác xem trên màn hình */}
            <Table className="no-print">
              <TableHeader>
                <TableRow>
                  <TableHead>Ghế</TableHead>
                  <TableHead>Hành khách</TableHead>
                  {!isDriver && <TableHead>Mã HĐ</TableHead>}
                  {!isDriver && <TableHead>Thanh toán</TableHead>}
                  {!isDriver && <TableHead>Xuất vé</TableHead>}
                  <TableHead>Đã lên xe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id} className={t.booking_status === 'cancelled' ? 'opacity-50' : ''}>
                    <TableCell className="font-bold text-xs">{t.seat_number}</TableCell>
                    <TableCell className="text-xs">
                      {t.passenger_name}
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{t.passenger_phone}</div>
                      {t.booking_status === 'cancelled' && (
                        <Badge variant="destructive" className="mt-1 text-[10px]">Đã hủy</Badge>
                      )}
                    </TableCell>
                    {!isDriver && <TableCell className="text-xs font-semibold">HD-{t.invoice_id}</TableCell>}
                    {!isDriver && (
                      <TableCell>
                        {t.Invoice ? <InvoiceStatus status={t.Invoice.payment_status} /> : '—'}
                      </TableCell>
                    )}
                    {!isDriver && (
                      <TableCell className="text-xs">
                        {t.issued_at ? (
                          <span className="text-[hsl(var(--success))] font-semibold">
                            Đã xuất{t.print_count > 1 ? ` (${t.print_count} lần)` : ''}
                          </span>
                        ) : (
                          <span className="text-[hsl(var(--muted-foreground))]">Chưa in</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {t.booking_status === 'booked' ? (
                        <input
                          type="checkbox"
                          checked={Boolean(t.boarded_at)}
                          disabled={!canBoard}
                          onChange={() => handleToggleBoarded(t)}
                          aria-label={`Đã lên xe ghế ${t.seat_number}`}
                          className="h-5 w-5 cursor-pointer accent-[hsl(var(--success))] disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <EmptyState icon={Users} title="Chuyến xe này chưa có khách đặt vé." />
        )}
      </DialogContent>
    </Dialog>
  )
}
