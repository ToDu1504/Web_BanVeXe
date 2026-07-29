import React, { useEffect, useState } from 'react'
import { invoiceApi } from '@/api/invoiceApi'
import { ticketApi } from '@/api/ticketApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import InvoiceStatus from '@/components/features/InvoiceStatus'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Receipt, Search, Edit2, Calendar, User, Eye, Loader2, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ManageInvoice() {
  const [invoices, setInvoices] = useState([])
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Edit status Dialog state
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)

  // Details Dialog state
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeInvoice, setActiveInvoice] = useState(null)

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const data = await invoiceApi.getAll()
      // Sort newest first
      const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setInvoices(sorted)
      setFilteredInvoices(sorted)
    } catch (error) {
      toast.error('Không thể tải danh sách hóa đơn hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  // Handle live search and status filter updates
  useEffect(() => {
    let result = invoices

    // Search query matches invoice ID, user details or passenger details
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.id.toString().includes(q) ||
          inv.User?.full_name?.toLowerCase().includes(q) ||
          inv.User?.email?.toLowerCase().includes(q) ||
          inv.User?.phone?.includes(q) ||
          inv.Tickets?.some(
            (t) =>
              t.passenger_name?.toLowerCase().includes(q) ||
              t.passenger_phone?.includes(q)
          )
      )
    }

    // Status filter matches
    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.payment_status === statusFilter)
    }

    setFilteredInvoices(result)
  }, [searchQuery, statusFilter, invoices])

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
    if (!window.confirm(`Bạn có chắc chắn muốn hủy toàn bộ hóa đơn HD-${id}? Tất cả vé đi kèm sẽ được hoàn/hủy.`)) return
    try {
      await invoiceApi.cancelInvoice(id)
      toast.success(`Hủy toàn bộ hóa đơn HD-${id} thành công!`)
      fetchInvoices()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy hóa đơn')
    }
  }

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy vé số #${ticketId}?`)) return
    try {
      await ticketApi.cancelTicket(ticketId)
      toast.success(`Hủy vé #${ticketId} thành công!`)
      
      // Refresh list
      const data = await invoiceApi.getAll()
      const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setInvoices(sorted)

      // Refresh active dialog invoice details
      const nextActive = sorted.find((inv) => inv.id === activeInvoice.id)
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

  const paymentMethodLabels = {
    cash: 'Tiền mặt',
    momo: 'Ví Momo',
  }

  return (
    <div className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-[hsl(var(--primary))]">
            <Receipt className="h-5 w-5" />
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
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải danh sách hóa đơn...</p>
              </div>
            </div>
          ) : filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-bold">HD-{invoice.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">{invoice.User?.full_name}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{invoice.User?.email} • {invoice.User?.phone}</span>
                      </div>
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
                          className="h-8 w-8 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenStatusEdit(invoice)}
                          className="h-8 w-8 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          title="Cập nhật trạng thái"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {invoice.payment_status !== 'refunded' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelInvoice(invoice.id)}
                            className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Hủy hóa đơn thay khách"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              Không tìm thấy hóa đơn nào phù hợp với bộ lọc.
            </div>
          )}
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
                <div className="grid grid-cols-2 gap-2 text-xs border border-[hsl(var(--border))] rounded-xl p-3 bg-[hsl(var(--muted))/10]">
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
                              <span className={t.booking_status === 'booked' ? 'text-green-600' : 'text-red-500'}>
                                {t.booking_status === 'booked' ? 'Đã đặt' : 'Đã hủy'}
                              </span>
                              {t.booking_status === 'booked' && (
                                <Button
                                  variant="ghost"
                                  onClick={() => handleCancelTicket(t.id)}
                                  className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200/50 rounded"
                                >
                                  Hủy vé
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs">Hành khách: {t.passenger_name} ({t.passenger_phone})</p>
                          {t.Trip && (
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              Chuyến: {t.Trip.Route?.origin} → {t.Trip.Route?.destination} ({formatDateTime(t.Trip.departure_time)})
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
    </div>
  )
}
