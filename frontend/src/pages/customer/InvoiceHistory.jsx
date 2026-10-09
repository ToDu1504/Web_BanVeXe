import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { invoiceApi } from '@/api/invoiceApi'
import { ticketApi } from '@/api/ticketApi'
import { paymentApi } from '@/api/paymentApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import InvoiceStatus from '@/components/features/InvoiceStatus'
import ChangePickupDialog from '@/components/features/ChangePickupDialog'
import { describePickup, isPastShuttleCutoff } from '@/lib/shuttle'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Ticket, Eye, Trash2, Calendar, Bus, Receipt, Info, Loader2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { fadeInUp } from '@/lib/motionVariants'

// Chuyến đã chạy / quá giờ khởi hành — backend không cho khách tự hủy nữa.
const hasTripDeparted = (trip) => (
  !!trip && (['ongoing', 'completed'].includes(trip.status) || new Date(trip.departure_time).getTime() <= Date.now())
)
const hasDepartedTicket = (invoice) => (invoice.Tickets || []).some(
  (ticket) => ticket.booking_status === 'booked' && hasTripDeparted(ticket.Trip),
)

export default function InvoiceHistory() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [payingId, setPayingId] = useState(null)
  const [pickupTicket, setPickupTicket] = useState(null)

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const res = await invoiceApi.getMyInvoices({ page, limit: 10 })
      setInvoices(res.data)
      setPagination(res.pagination)
    } catch (error) {
      toast.error('Không thể tải lịch sử hóa đơn')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [page])

  const handleOpenDetail = (invoice) => {
    setSelectedInvoice(invoice)
    setDetailOpen(true)
  }

  const handleCancelInvoice = async (invoiceId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy toàn bộ đơn đặt vé này?')) return

    setCancellingId(invoiceId)
    try {
      await invoiceApi.cancelInvoice(invoiceId)
      toast.success('Đã hủy hóa đơn và giải phóng ghế thành công!')
      fetchInvoices()
      setDetailOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy hóa đơn')
    } finally {
      setCancellingId(null)
    }
  }

  const handlePayMomo = async (invoiceId) => {
    setPayingId(invoiceId)
    try {
      const { payUrl } = await paymentApi.createMomoPayment(invoiceId)
      window.location.href = payUrl
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể khởi tạo thanh toán MoMo')
      setPayingId(null)
    }
  }

  // Sau khi đổi cách lên xe: tải lại trang hiện tại và cập nhật hóa đơn đang mở.
  const refreshAfterPickupChange = async () => {
    const res = await invoiceApi.getMyInvoices({ page, limit: 10 })
    setInvoices(res.data)
    setPagination(res.pagination)
    const next = res.data.find((inv) => inv.id === selectedInvoice?.id)
    if (next) setSelectedInvoice(next)
  }

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy chiếc vé này?')) return

    try {
      await ticketApi.cancelTicket(ticketId)
      toast.success('Hủy vé thành công!')
      // Refresh current details if open
      if (selectedInvoice) {
        const res = await invoiceApi.getMyInvoices({ page, limit: 10 })
        setInvoices(res.data)
        setPagination(res.pagination)
        const newSel = res.data.find(inv => inv.id === selectedInvoice.id)
        if (newSel) {
          setSelectedInvoice(newSel)
        } else {
          setDetailOpen(false)
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy vé')
    }
  }

  const paymentMethodLabels = {
    cash: 'Tiền mặt',
    momo: 'Ví Momo',
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div initial="hidden" animate="show" variants={fadeInUp}>
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[hsl(var(--primary))]" />
            Lịch Sử Hóa Đơn Đặt Vé
          </CardTitle>
          <CardDescription>
            Xem và quản lý toàn bộ vé xe bạn đã đặt trên hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải lịch sử hóa đơn...</p>
              </div>
            </div>
          ) : invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Ngày đặt</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-bold">HD-{invoice.id}</TableCell>
                    <TableCell>{formatDateTime(invoice.created_at)}</TableCell>
                    <TableCell>{paymentMethodLabels[invoice.payment_method] || invoice.payment_method}</TableCell>
                    <TableCell>
                      <InvoiceStatus status={invoice.payment_status} />
                    </TableCell>
                    <TableCell className="font-bold text-[hsl(var(--primary))]">
                      {formatCurrency(invoice.total_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(invoice)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Chi tiết
                        </Button>
                        {invoice.payment_status === 'pending' && invoice.payment_method === 'momo' && (
                          <Button
                            variant="accent"
                            size="sm"
                            disabled={payingId === invoice.id}
                            onClick={() => handlePayMomo(invoice.id)}
                          >
                            {payingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Thanh toán MoMo'
                            )}
                          </Button>
                        )}
                        {(invoice.payment_status === 'pending' || invoice.payment_status === 'paid') && !hasDepartedTicket(invoice) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={cancellingId === invoice.id}
                            onClick={() => handleCancelInvoice(invoice.id)}
                          >
                            {cancellingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                {invoice.payment_status === 'paid' ? 'Hủy & Hoàn tiền' : 'Hủy'}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))] space-y-2">
              <Ticket className="h-12 w-12 mx-auto opacity-20" />
              <p>Bạn chưa đặt bất kỳ vé xe nào trên hệ thống.</p>
              <Button onClick={() => navigate('/')} variant="default" className="mt-4">Đặt vé ngay</Button>
            </div>
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>
      </motion.div>

      {/* Invoice Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[hsl(var(--primary))]" />
                  Chi Tiết Hóa Đơn HD-{selectedInvoice.id}
                </DialogTitle>
                <DialogDescription>
                  Thông tin hành trình và danh sách vé xe đi kèm.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 my-4 text-sm">

                {/* General Invoice Info */}
                <div className="grid grid-cols-2 gap-4 p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--muted)/0.3)]">
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] block">Ngày đặt vé</span>
                    <span className="font-semibold">{formatDateTime(selectedInvoice.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] block">Trạng thái thanh toán</span>
                    <InvoiceStatus status={selectedInvoice.payment_status} />
                  </div>
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] block">Phương thức thanh toán</span>
                    <span className="font-semibold">{paymentMethodLabels[selectedInvoice.payment_method]}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] block">Tổng thanh toán</span>
                    <span className="font-bold text-[hsl(var(--primary))]">{formatCurrency(selectedInvoice.total_price)}</span>
                  </div>
                </div>

                {/* Tickets list */}
                <div className="space-y-4">
                  <h4 className="font-bold text-md border-b border-[hsl(var(--border))] pb-2 flex items-center gap-1.5">
                    <Ticket className="h-4.5 w-4.5 text-[hsl(var(--primary))]" />
                    Danh sách vé xe
                  </h4>
                  {selectedInvoice.Tickets && selectedInvoice.Tickets.length > 0 ? (
                    <div className="space-y-4">
                      {selectedInvoice.Tickets.map((ticket) => (
                        <div key={ticket.id} className="border border-[hsl(var(--border))] p-4 rounded-xl space-y-3 relative overflow-hidden bg-[hsl(var(--card))]">

                          {/* Header info */}
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-[hsl(var(--foreground))]">Mã vé: Ticket-{ticket.id}</span>
                            <Badge variant={ticket.booking_status === 'booked' ? 'success' : 'destructive'}>
                              {ticket.booking_status === 'booked' ? 'Đã đặt' : 'Đã hủy'}
                            </Badge>
                          </div>

                          {/* Route & Vehicle details */}
                          {ticket.Trip && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs border-b border-[hsl(var(--border))] pb-3 mb-2">
                              <div className="flex items-center gap-1">
                                <Bus className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                <span className="font-medium">
                                  Xe {ticket.Trip.Vehicle?.license_plate} ({ticket.Trip.Vehicle?.vehicle_type === 'sleeper' ? 'Giường nằm' : 'Limousine'})
                                  {ticket.Trip.Driver && ` · Tài xế ${ticket.Trip.Driver.full_name}`}
                                  {ticket.Trip.CoDriver && ` · Phụ ${ticket.Trip.CoDriver.full_name}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                <span className="font-medium">{formatDateTime(ticket.Trip.departure_time)}</span>
                              </div>
                              <div className="md:col-span-2 flex items-center justify-between font-bold text-sm">
                                <span>{ticket.Trip.Route?.origin}</span>
                                <span>→</span>
                                <span>{ticket.Trip.Route?.destination}</span>
                              </div>
                            </div>
                          )}

                          {/* Passenger info */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[hsl(var(--muted-foreground))]">Hành khách:</span>
                              <p className="font-semibold">{ticket.passenger_name}</p>
                            </div>
                            <div>
                              <span className="text-[hsl(var(--muted-foreground))]">Số điện thoại:</span>
                              <p className="font-semibold">{ticket.passenger_phone}</p>
                            </div>
                            <div>
                              <span className="text-[hsl(var(--muted-foreground))]">Số ghế:</span>
                              <p className="font-bold text-[hsl(var(--primary))]">{ticket.seat_number}</p>
                            </div>
                            <div>
                              <span className="text-[hsl(var(--muted-foreground))]">Giá vé:</span>
                              <p className="font-semibold">{formatCurrency(ticket.ticket_price)}</p>
                            </div>
                          </div>

                          {/* Cách lên xe */}
                          <div className="flex items-start justify-between gap-2 text-xs border-t border-[hsl(var(--border))] pt-2">
                            <div className="flex items-start gap-1">
                              <MapPin className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                              <div>
                                <p className="font-medium">{describePickup(ticket, ticket.Trip?.Route)}</p>
                                {ticket.pickup_note && ticket.pickup_type === 'shuttle' && (
                                  <p className="text-[hsl(var(--muted-foreground))]">Ghi chú: {ticket.pickup_note}</p>
                                )}
                              </div>
                            </div>
                            {ticket.booking_status === 'booked' && ticket.Trip && !hasTripDeparted(ticket.Trip)
                              && !isPastShuttleCutoff(ticket.Trip)
                              && (ticket.Trip.Route?.shuttle_enabled || ticket.pickup_type === 'shuttle') && (
                              <Button variant="outline" size="sm" onClick={() => setPickupTicket(ticket)}>
                                Đổi cách lên xe
                              </Button>
                            )}
                          </div>

                          {/* Individual ticket cancel button */}
                          {ticket.booking_status === 'booked' && ['pending', 'paid'].includes(selectedInvoice.payment_status) && !hasTripDeparted(ticket.Trip) && (
                            <div className="flex justify-end pt-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancelTicket(ticket.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Hủy vé này
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Không tìm thấy thông tin vé đi kèm.</p>
                  )}
                </div>

                {/* Cancel policy details */}
                <div className="p-3 bg-[hsl(var(--accent)/0.08)] border border-[hsl(var(--accent)/0.2)] text-[hsl(var(--foreground))] rounded-xl flex gap-2 text-xs">
                  <Info className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <p>
                    Lưu ý: Vé thuộc hóa đơn đã thanh toán khi hủy sẽ được chuyển sang trạng thái <strong>Đã hoàn tiền</strong>.
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ChangePickupDialog
        ticket={pickupTicket}
        open={!!pickupTicket}
        onOpenChange={(v) => !v && setPickupTicket(null)}
        onSaved={refreshAfterPickupChange}
      />
    </div>
  )
}
