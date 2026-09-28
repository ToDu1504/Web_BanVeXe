import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { ticketApi } from '@/api/ticketApi'
import { userApi } from '@/api/userApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { formatDateTime, formatDate } from '@/lib/utils'
import { ClipboardList, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const todayStr = () => new Date().toISOString().split('T')[0]

// Đối soát cuối ca: liệt kê MỌI lượt in vé trong khoảng ngày đã chọn — nhân
// viên chỉ thấy lượt in của chính mình, quản trị viên thấy toàn bộ và có
// thể lọc theo từng nhân viên.
export default function PrintReconciliation() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState(todayStr())
  const [staffFilter, setStaffFilter] = useState('all')
  const [staffList, setStaffList] = useState([])
  const [prints, setPrints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) return
    userApi.getAll({ role: 'staff' }).then(setStaffList).catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    const fetchPrints = async () => {
      setLoading(true)
      try {
        const params = { from: `${fromDate}T00:00:00`, to: `${toDate}T23:59:59` }
        if (isAdmin && staffFilter !== 'all') params.printed_by = staffFilter
        const res = await ticketApi.getPrintLog(params)
        setPrints(Array.isArray(res) ? res : res.data)
      } catch (error) {
        toast.error('Không thể tải báo cáo đối soát in vé')
      } finally {
        setLoading(false)
      }
    }
    fetchPrints()
  }, [fromDate, toDate, staffFilter, isAdmin])

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[hsl(var(--primary))]" />
            Đối Soát In Vé
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Toàn bộ lượt in vé của tất cả nhân viên, phục vụ đối soát cuối ca.'
              : 'Lượt in vé của bạn trong khoảng thời gian đã chọn.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
              <span className="text-sm text-[hsl(var(--muted-foreground))]">đến</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>

            {isAdmin && (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-sm text-[hsl(var(--muted-foreground))] whitespace-nowrap">Nhân viên:</span>
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Tất cả nhân viên" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nhân viên</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : prints.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời điểm in</TableHead>
                  <TableHead>Mã vé / HĐ</TableHead>
                  <TableHead>Hành khách</TableHead>
                  <TableHead>Tuyến - Chuyến</TableHead>
                  <TableHead>Loại in</TableHead>
                  <TableHead>Nhân viên in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prints.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{formatDateTime(p.printed_at)}</TableCell>
                    <TableCell className="text-xs font-bold">#{p.ticket_id} / HD-{p.invoice_id}</TableCell>
                    <TableCell className="text-xs">
                      {p.Ticket?.passenger_name}
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{p.Ticket?.passenger_phone}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.Ticket?.Trip?.Route ? (
                        <>
                          {p.Ticket.Trip.Route.origin} → {p.Ticket.Trip.Route.destination}
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(p.Ticket.Trip.departure_time)}</div>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {p.print_type === 'reprint' ? (
                        <span className="text-[10px] font-bold text-amber-600 border border-amber-400/50 rounded px-1.5 py-0.5">
                          IN LẠI — LẦN {p.print_sequence}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[hsl(var(--success))] border border-[hsl(var(--success)/0.4)] rounded px-1.5 py-0.5">
                          BẢN GỐC
                        </span>
                      )}
                      {p.reason && (
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Lý do: {p.reason}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{p.PrintedByUser?.full_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={ClipboardList} title="Không có lượt in vé nào trong khoảng thời gian đã chọn." />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
