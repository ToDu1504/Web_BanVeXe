import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { driverApi } from '@/api/driverApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import PageHeader from '@/components/common/PageHeader'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import StatCard from '@/components/features/StatCard'
import StatsChart from '@/components/features/StatsChart'
import { History, Bus, Route as RouteIcon, Users } from 'lucide-react'
import { formatDateString, toVNDateString, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const DAY_MS = 24 * 60 * 60 * 1000

const RANGE_OPTIONS = [
  { value: '30', label: '30 ngày qua' },
  { value: '90', label: '90 ngày qua' },
  { value: '365', label: '12 tháng qua' },
  { value: 'all', label: 'Tất cả' },
]

function describeDelay(minutes) {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes === 0) return 'Đúng giờ'
  return minutes > 0 ? `Trễ ${minutes} phút` : `Sớm ${-minutes} phút`
}

export default function TripHistory() {
  const [range, setRange] = useState('90')
  const [page, setPage] = useState(1)
  const [trips, setTrips] = useState([])
  const [pagination, setPagination] = useState(null)
  const [summary, setSummary] = useState(null)
  const [byMonth, setByMonth] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [range])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const from = range === 'all' ? undefined : new Date(Date.now() - Number(range) * DAY_MS).toISOString()
        const res = await driverApi.getHistory({ page, limit: 10, from })
        setTrips(res.data)
        setPagination(res.pagination)
        setSummary(res.summary)
        setByMonth(res.by_month)
      } catch {
        toast.error('Không thể tải lịch sử chuyến')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [page, range])

  const chartData = byMonth.map((m) => ({ date: `${m.month.slice(5)}/${m.month.slice(0, 4)}`, trips: m.trips }))

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <PageHeader
        title="Lịch sử chuyến đã chạy"
        description="Các chuyến đã hoàn thành và thống kê cá nhân của bạn."
        action={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Bus} label="Số chuyến" value={summary?.total_trips ?? 0} />
        <StatCard
          icon={RouteIcon}
          label="Tổng quãng đường"
          value={summary?.total_km ?? 0}
          formatValue={(v) => `${v.toLocaleString('vi-VN')} km`}
          tone="success"
        />
        <StatCard icon={Users} label="Khách đã lên xe" value={summary?.total_boarded ?? 0} tone="accent" />
        <Card className="overflow-hidden border-[hsl(var(--border))]">
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              Xuất bến trung bình
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{describeDelay(summary?.avg_delay_minutes)}</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">So với giờ khởi hành theo lịch</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Số chuyến theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <StatsChart data={chartData} type="bar" dataKey="trips" name="Số chuyến" unit="chuyến" />
          </CardContent>
        </Card>
      )}

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : trips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Tuyến</TableHead>
                  <TableHead>Xe</TableHead>
                  <TableHead>Giờ chạy thực tế</TableHead>
                  <TableHead>Khách lên xe</TableHead>
                  <TableHead>Xuất bến</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => {
                  const delay = trip.actual_departure_at
                    ? Math.round((new Date(trip.actual_departure_at) - new Date(trip.departure_time)) / 60000)
                    : null
                  return (
                    <TableRow key={trip.id}>
                      <TableCell className="text-xs">{formatDateString(toVNDateString(trip.departure_time))}</TableCell>
                      <TableCell className="text-xs font-semibold">
                        {trip.Route?.origin} → {trip.Route?.destination}
                      </TableCell>
                      <TableCell className="text-xs">{trip.Vehicle?.license_plate}</TableCell>
                      <TableCell className="text-xs">
                        {trip.actual_departure_at ? formatTime(trip.actual_departure_at) : formatTime(trip.departure_time)}
                        {' – '}
                        {trip.actual_arrival_at ? formatTime(trip.actual_arrival_at) : trip.arrival_time ? formatTime(trip.arrival_time) : '?'}
                        {!trip.actual_departure_at && (
                          <span className="ml-1 text-[10px] text-[hsl(var(--muted-foreground))]">(theo lịch)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{trip.boarded_count}/{trip.sold_seats}</TableCell>
                      <TableCell className="text-xs">{describeDelay(delay)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={History} title="Chưa có chuyến nào hoàn thành trong khoảng thời gian này." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>
    </motion.div>
  )
}
