import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { shuttleApi } from '@/api/shuttleApi'
import { useShuttlePrint } from '@/hooks/useShuttlePrint'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/common/PageHeader'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import ShuttlePickupSheet from '@/components/features/ShuttlePickupSheet'
import { Bus, Check, Loader2, Printer, RefreshCw } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const HOUR_MS = 60 * 60 * 1000

// Khung giờ lọc hàng chờ. `default` = để backend dùng mặc định (từ bây giờ tới mốc chốt).
const WINDOWS = [
  { value: 'default', label: 'Đã chốt (sắp chạy)' },
  { value: '6h', label: '6 giờ tới', hours: 6 },
  { value: 'today', label: 'Hôm nay' },
]

const resolveParams = (windowValue) => {
  const now = new Date()
  if (windowValue === 'default') return {}
  if (windowValue === 'today') {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { from: now.toISOString(), to: end.toISOString() }
  }
  const hours = WINDOWS.find((w) => w.value === windowValue)?.hours || 6
  return { from: now.toISOString(), to: new Date(now.getTime() + hours * HOUR_MS).toISOString() }
}

// Hàng chờ "Cần in danh sách đón": quầy vé in cho tài xế trung chuyển
// (md/DonKhachTrungChuyen.md R6–R8).
export default function ShuttlePickups() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [windowValue, setWindowValue] = useState('default')
  const [selected, setSelected] = useState(new Set())
  const [acknowledgingId, setAcknowledgingId] = useState(null)

  const fetchQueue = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const data = await shuttleApi.getQueue(resolveParams(windowValue))
      setQueue(data)
      setSelected((prev) => new Set([...prev].filter((id) => data.some((t) => t.id === id && !t.is_cancelled_after_print))))
    } catch {
      toast.error('Không thể tải hàng chờ in danh sách đón')
    } finally {
      setLoading(false)
    }
  }, [windowValue])

  useEffect(() => {
    fetchQueue()
    const timer = setInterval(() => fetchQueue({ silent: true }), 60 * 1000)
    return () => clearInterval(timer)
  }, [fetchQueue])

  const shuttlePrint = useShuttlePrint({ onPrinted: () => fetchQueue({ silent: true }) })

  const printable = queue.filter((t) => !t.is_cancelled_after_print)
  const allSelected = printable.length > 0 && printable.every((t) => selected.has(t.id))

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(printable.map((t) => t.id)))

  // Chuyến bị hủy sau khi đã in: nhân viên báo tài xế trung chuyển rồi bấm "Đã xử lý".
  const handleAcknowledge = async (tripId) => {
    setAcknowledgingId(tripId)
    try {
      await shuttleApi.markPrinted([tripId])
      fetchQueue({ silent: true })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật')
    } finally {
      setAcknowledgingId(null)
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <PageHeader
        title="Danh Sách Đón Trung Chuyển"
        description="Các chuyến đã chốt danh sách đón, cần in đưa cho tài xế trung chuyển."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchQueue()} disabled={loading} aria-label="Tải lại">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button
              onClick={() => shuttlePrint.print([...selected])}
              disabled={selected.size === 0 || shuttlePrint.loading}
            >
              {shuttlePrint.loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Printer className="h-4 w-4 mr-1.5" />}
              In danh sách đã chọn ({selected.size})
            </Button>
          </div>
        }
      />

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWindowValue(w.value)}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium shadow-sm transition-colors',
                  windowValue === w.value
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.7)]'
                )}
              >
                {w.label}
              </button>
            ))}
          </div>

          {loading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : queue.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Chọn tất cả"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </TableHead>
                  <TableHead>Chuyến</TableHead>
                  <TableHead>Khởi hành</TableHead>
                  <TableHead>Xe / Tài xế</TableHead>
                  <TableHead>Khách cần đón</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      {!trip.is_cancelled_after_print && (
                        <input
                          type="checkbox"
                          checked={selected.has(trip.id)}
                          onChange={() => toggle(trip.id)}
                          aria-label={`Chọn chuyến TRIP-${trip.id}`}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-semibold">{trip.Route?.origin} → {trip.Route?.destination}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">TRIP-{trip.id}</p>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(trip.departure_time)}</TableCell>
                    <TableCell className="text-xs">
                      {trip.Vehicle?.license_plate}
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {trip.Driver?.full_name || 'Chưa phân công'}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      <span className="inline-flex items-center gap-1"><Bus className="h-3.5 w-3.5" /> {trip.shuttle_count}</span>
                    </TableCell>
                    <TableCell>
                      {trip.is_cancelled_after_print ? (
                        <Badge variant="destructive" className="text-[10px]">Chuyến đã hủy – báo tài xế trung chuyển</Badge>
                      ) : trip.needs_reprint ? (
                        <Badge variant="warning" className="text-[10px]">Cần in lại (có thay đổi)</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Chưa in</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {trip.is_cancelled_after_print ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(trip.id)}
                          disabled={acknowledgingId === trip.id}
                        >
                          {acknowledgingId === trip.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <><Check className="h-3.5 w-3.5 mr-1" /> Đã xử lý</>}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shuttlePrint.print([trip.id])}
                          disabled={shuttlePrint.loading}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" /> In
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Bus} title="Không có chuyến nào cần in danh sách đón." />
          )}
        </CardContent>
      </Card>

      <ShuttlePickupSheet entries={shuttlePrint.entries} onDone={shuttlePrint.handleDone} />
    </motion.div>
  )
}
