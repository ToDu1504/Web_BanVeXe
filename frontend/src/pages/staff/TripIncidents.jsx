import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { tripIncidentApi } from '@/api/tripIncidentApi'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import PageHeader from '@/components/common/PageHeader'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const STATUS_FILTERS = [
  { value: 'open', label: 'Chưa xử lý' },
  { value: 'resolved', label: 'Đã xử lý' },
  { value: 'all', label: 'Tất cả' },
]

const TYPE_LABELS = {
  delay: 'Trễ chuyến',
  breakdown: 'Xe hỏng',
  accident: 'Tai nạn / sự cố',
  other: 'Khác',
}

// Staff/Admin xem sự cố tài xế báo từ chuyến xe và đánh dấu đã xử lý.
export default function TripIncidents() {
  const [incidents, setIncidents] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('open')
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [status])

  const fetchIncidents = async () => {
    try {
      setLoading(true)
      const res = await tripIncidentApi.getAll({ page, limit: 10, status })
      setIncidents(res.data)
      setPagination(res.pagination)
    } catch {
      toast.error('Không thể tải danh sách sự cố')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
  }, [page, status])

  const handleResolve = async (id) => {
    setResolvingId(id)
    try {
      await tripIncidentApi.resolve(id)
      toast.success('Đã đánh dấu sự cố là đã xử lý')
      fetchIncidents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật sự cố')
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <PageHeader
        title="Sự Cố Chuyến Xe"
        description="Các sự cố / trễ chuyến do tài xế báo từ hiện trường."
        action={
          <Button variant="outline" size="icon" onClick={fetchIncidents} disabled={loading} aria-label="Tải lại">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        }
      />

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium shadow-sm transition-colors',
                  status === f.value
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.7)]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : incidents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Báo lúc</TableHead>
                  <TableHead>Chuyến</TableHead>
                  <TableHead>Tài xế</TableHead>
                  <TableHead>Sự cố</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="text-xs">{formatDateTime(incident.created_at)}</TableCell>
                    <TableCell className="text-xs">
                      <p className="font-semibold">
                        {incident.Trip?.Route?.origin} → {incident.Trip?.Route?.destination}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        TRIP-{incident.trip_id} · {incident.Trip?.Vehicle?.license_plate} ·{' '}
                        {incident.Trip ? formatDateTime(incident.Trip.departure_time) : ''}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {incident.Reporter?.full_name}
                      {incident.Reporter?.phone && (
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{incident.Reporter.phone}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-semibold">{TYPE_LABELS[incident.type]}</span>
                      {incident.type === 'delay' && incident.delay_minutes ? ` — trễ ${incident.delay_minutes} phút` : ''}
                      {incident.note && <p className="text-[hsl(var(--muted-foreground))]">{incident.note}</p>}
                      {incident.passengers_notified_at && (
                        <p className="text-[10px] text-[hsl(var(--success))]">Đã email báo khách</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {incident.resolved_at ? (
                        <div>
                          <Badge variant="success">Đã xử lý</Badge>
                          {incident.Resolver && (
                            <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                              bởi {incident.Resolver.full_name}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="warning">Chưa xử lý</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!incident.resolved_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resolvingId === incident.id}
                          onClick={() => handleResolve(incident.id)}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Đã xử lý
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={AlertTriangle} title="Không có sự cố nào trong mục này." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>
    </motion.div>
  )
}
