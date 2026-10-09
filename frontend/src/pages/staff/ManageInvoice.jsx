import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { invoiceApi } from '@/api/invoiceApi'
import { ticketApi } from '@/api/ticketApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import InvoiceStatus from '@/components/features/InvoiceStatus'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import TicketPrintView from '@/components/features/TicketPrintView'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Receipt, Search, Edit2, Eye, Loader2, Trash2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

export default function ManageInvoice() {
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Edit status Dialog state
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)

  // Details Dialog state
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeInvoice, setActiveInvoice] = useState(null)

  // Print ticket state
  const [printOpen, setPrintOpen] = useState(false)
  const [printTicketData, setPrintTicketData] = useState(null)
  const [reprintTarget, setReprintTarget] = useState(null)
  const [reprintReason, setReprintReason] = useState('')
  const [printing, setPrinting] = useState(false)

  // Gõ tới đâu tìm tới đó nhưng chỉ gọi API sau khi ngừng gõ 400ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const res = await invoiceApi.getAll({ page, limit: 10, search: debouncedSearch || undefined, status: statusFilter })
      setInvoices(res.data)
      setPagination(res.pagination)
    } catch (error) {
      toast.error('Không thể tải danh sách hóa đơn hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [page, debouncedSearch, statusFilter])

  const handleOpenStatusEdit = (invoice) => {
    setSelectedInvoice(invoice)
    setNewStatus(invoice.payment_status)
    setStatusOpen(true)
  }

  const handleSaveStatus = async () => {
    if (!selectedInvoice) return

    setUpdating(true)
    try {
      await invoiceApi.updateStatus(selectedInvoice.id, { payment_status: newStatus })
      toast.success(`Cập nhật hóa đơn HD-${selectedInvoice.id} thành công!`)
      fetchInvoices()
      setStatusOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelInvoice = async (id) => {
    try {
      await invoiceApi.cancelInvoice(id)
      toast.success(`Hủy toàn bộ hóa đơn HD-${id} thành công!`)
      fetchInvoices()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy hóa đơn')
    }
  }

  const handleCancelTicket = async (ticketId) => {
    try {
      await ticketApi.cancelTicket(ticketId)
      toast.success(`Hủy vé #${ticketId} thành công!`)

      // Refresh current page
      const res = await invoiceApi.getAll({ page, limit: 10, search: debouncedSearch || undefined, status: statusFilter })
      setInvoices(res.data)
      setPagination(res.pagination)

      // Refresh active dialog invoice details
      const nextActive = res.data.find((inv) => inv.id === activeInvoice.id)
      if (nextActive) {
        setActiveInvoice(nextActive)
      } else {
        setDetailsOpen(false)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy vé')
    }
  }

  const handleOpenDetails = (invoice) => {
    setActiveInvoice(invoice)
    setDetailsOpen(true)
  }

  const refreshAfterPrint = async () => {
    const res = await invoiceApi.getAll({ page, limit: 10, search: debouncedSearch || undefined, status: statusFilter })
    setInvoices(res.data)
    setPagination(res.pagination)
    const nextActive = res.data.find((inv) => inv.id === activeInvoice?.id)
    if (nextActive) setActiveInvoice(nextActive)
  }

  const submitPrint = async (ticketId, reason) => {
    setPrinting(true)
    try {
      const res = await ticketApi.printTicket(ticketId, reason ? { reason } : {})
      setPrintTicketData(res.ticket)
      setPrintOpen(true)
      setReprintTarget(null)
      setReprintReason('')
      await refreshAfterPrint()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi in vé')
    } finally {
      setPrinting(false)
    }
  }

  // Vé chưa in lần nào -> in thẳng. Vé đã in rồi -> bắt buộc xác nhận + lý do
  // in lại, để tránh in tràn lan và có log rõ ràng cho việc đối soát.
  const handlePrintTicket = (ticket) => {
    if (ticket.print_count > 0) {
      setReprintTarget(ticket)
      setReprintReason('')
    } else {
      submitPrint(ticket.id, null)
    }
  }

  const paymentMethodLabels = {
    cash: 'Tiền mặt',
    momo: 'Ví Momo',
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[hsl(var(--primary))]" />
            Quản Lý Hóa Đơn Khách Hàng
          </CardTitle>
          <CardDescription>
            Xem toàn bộ hóa đơn đặt vé, cập nhật trạng thái thanh toán và tra cứu thông tin khách hàng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Search and Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Tìm mã HĐ, tên, email hoặc SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-sm text-[hsl(var(--muted-foreground))] whitespace-nowrap">Trạng thái:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Lọc trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ thanh toán</SelectItem>
                  <SelectItem value="paid">Đã thanh toán</SelectItem>
                  <SelectItem value="refunded">Đã hoàn tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoices List Table */}
          {loading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Tuyến - Chuyến</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const firstTrip = invoice.Tickets?.[0]?.Trip
                  return (
                  <TableRow key={invoice.id} className={invoice.payment_status === 'refunded' ? 'opacity-60' : ''}>
                    <TableCell className="font-bold">HD-{invoice.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">{invoice.User?.full_name}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{invoice.User?.email} • {invoice.User?.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {firstTrip ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{firstTrip.Route?.origin} → {firstTrip.Route?.destination}</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDateTime(firstTrip.departure_time)}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(invoice.created_at)}</TableCell>
                    <TableCell className="text-xs">{paymentMethodLabels[invoice.payment_method] || invoice.payment_method}</TableCell>
                    <TableCell>
                      <InvoiceStatus status={invoice.payment_status} />
                    </TableCell>
                    <TableCell className="font-bold text-[hsl(var(--primary))] text-xs">
                      {formatCurrency(invoice.total_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDetails(invoice)}
                          className="h-8 w-8"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenStatusEdit(invoice)}
                          className="h-8 w-8"
                          title="Cập nhật trạng thái"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {invoice.payment_status !== 'refunded' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                                title="Hủy hóa đơn thay khách"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hủy hóa đơn HD-{invoice.id}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tất cả vé đi kèm trong hóa đơn này sẽ được hủy và ghế sẽ được hoàn trả lại. Hành động này không thể hoàn tác.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Đóng</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelInvoice(invoice.id)}>
                                  Xác nhận hủy
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Receipt} title="Không tìm thấy hóa đơn nào phù hợp với bộ lọc." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Edit Payment Status Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái thanh toán</DialogTitle>
            <DialogDescription>
              Thay đổi trạng thái thanh toán cho hóa đơn HD-{selectedInvoice?.id}.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 my-4">
              <div className="text-sm space-y-1">
                <p><strong>Khách hàng:</strong> {selectedInvoice.User?.full_name}</p>
                <p><strong>Số tiền cần thanh toán:</strong> {formatCurrency(selectedInvoice.total_price)}</p>
                <p><strong>Phương thức:</strong> {paymentMethodLabels[selectedInvoice.payment_method]}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-status">Trạng thái mới</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="payment-status">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Chờ thanh toán (Pending)</SelectItem>
                    <SelectItem value="paid">Đã thanh toán (Paid)</SelectItem>
                    <SelectItem value="refunded">Đã hoàn tiền (Refunded)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)} disabled={updating}>Hủy</Button>
            <Button onClick={handleSaveStatus} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl">
          {activeInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết hóa đơn HD-{activeInvoice.id}</DialogTitle>
                <DialogDescription>Danh sách vé xe đi kèm trong hóa đơn này.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs border border-[hsl(var(--border))] rounded-xl p-3 bg-[hsl(var(--muted)/0.3)]">
                  <p><strong>Tên tài khoản:</strong> {activeInvoice.User?.full_name}</p>
                  <p><strong>Số điện thoại:</strong> {activeInvoice.User?.phone}</p>
                  <p><strong>Email đăng ký:</strong> {activeInvoice.User?.email}</p>
                  <p><strong>Tổng tiền:</strong> {formatCurrency(activeInvoice.total_price)}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold border-b border-[hsl(var(--border))] pb-1">Vé đặt chi tiết</h4>
                  {activeInvoice.Tickets && activeInvoice.Tickets.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {activeInvoice.Tickets.map((t) => (
                        <div key={t.id} className="border border-[hsl(var(--border))] rounded-lg p-2.5 space-y-1">
                          <div className="flex justify-between items-center font-bold text-xs">
                            <span>Vé #{t.id} - Ghế số {t.seat_number}</span>
                            <div className="flex items-center gap-2">
                              <span className={t.booking_status === 'booked' ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
                                {t.booking_status === 'booked' ? 'Đã đặt' : 'Đã hủy'}
                              </span>
                              {t.booking_status === 'booked' && activeInvoice.payment_status === 'paid' && (
                                <Button
                                  variant="ghost"
                                  disabled={printing}
                                  onClick={() => handlePrintTicket(t)}
                                  className={`h-6 px-2 text-[10px] border rounded flex items-center gap-1 ${
                                    t.print_count > 0
                                      ? 'text-amber-600 border-amber-400/50 hover:bg-amber-500/10'
                                      : 'text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.1)]'
                                  }`}
                                >
                                  <Printer className="h-3 w-3" /> {t.print_count > 0 ? 'In lại vé' : 'In vé'}
                                </Button>
                              )}
                              {t.booking_status === 'booked' && activeInvoice.payment_status !== 'paid' && (
                                <span
                                  className="text-[10px] text-[hsl(var(--muted-foreground))]"
                                  title="Cần cập nhật trạng thái đã thanh toán trước khi in vé"
                                >
                                  Chưa thể in
                                </span>
                              )}
                              {t.booking_status === 'booked' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="h-6 px-2 text-[10px] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.3)] rounded"
                                    >
                                      Hủy vé
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hủy vé #{t.id}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Ghế số {t.seat_number} sẽ được hoàn trả lại cho chuyến xe. Hành động này không thể hoàn tác.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Đóng</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleCancelTicket(t.id)}>
                                        Xác nhận hủy
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                          <p className="text-xs">Hành khách: {t.passenger_name} ({t.passenger_phone})</p>
                          {t.issued_at && (
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              Đã xuất vé lúc {formatDateTime(t.issued_at)}{t.print_count > 1 ? ` (đã in ${t.print_count} lần)` : ''}
                            </p>
                          )}
                          {t.Trip && (
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              Chuyến: {t.Trip.Route?.origin} → {t.Trip.Route?.destination} ({formatDateTime(t.Trip.departure_time)})
                              {' · '}Tài xế: {t.Trip.Driver?.full_name || 'chưa phân công'}
                              {t.Trip.CoDriver && ` · Phụ: ${t.Trip.CoDriver.full_name}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Không có vé đi kèm.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reprint confirmation — vé đã in trước đó bắt buộc nhập lý do */}
      <AlertDialog open={!!reprintTarget} onOpenChange={(v) => !v && setReprintTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>In lại vé #{reprintTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vé này đã được in {reprintTarget?.print_count} lần trước đó. Vui lòng nhập lý do in lại
              (ví dụ: khách làm mất vé) để lưu vào lịch sử đối soát.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-2">
            <Label htmlFor="reprint-reason">Lý do in lại</Label>
            <Textarea
              id="reprint-reason"
              value={reprintReason}
              onChange={(e) => setReprintReason(e.target.value)}
              placeholder="Nhập lý do in lại vé..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <Button
              disabled={reprintReason.trim().length < 3 || printing}
              onClick={() => submitPrint(reprintTarget.id, reprintReason.trim())}
            >
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận in lại'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TicketPrintView open={printOpen} onOpenChange={setPrintOpen} ticket={printTicketData} />
    </motion.div>
  )
}
