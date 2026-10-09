import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { driverApi } from '@/api/driverApi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader'
import StatCard from '@/components/features/StatCard'
import DriverWeekSchedule from '@/components/features/DriverWeekSchedule'
import TripStatus from '@/components/features/TripStatus'
import {
  CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Download, Loader2, Bus, AlertTriangle,
  ArrowRight, Timer,
} from 'lucide-react'
import {
  exportToCsv, addDays, getWeekStart, toVNDateString, formatDateString, formatTime, formatDuration,
} from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const STATUS_LABELS = {
  scheduled: 'Sắp khởi hành',
  ongoing: 'Đang chạy',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
}

// Số phút còn lại tới giờ khởi hành → "Còn 1 giờ 20 phút" / "Đã quá giờ 5 phút"
function describeCountdown(departureTime, now) {
  const minutes = Math.round((new Date(departureTime).getTime() - now) / 60000)
  if (minutes >= 0) return minutes === 0 ? 'Khởi hành ngay bây giờ' : `Còn ${formatDuration(minutes)}`
  return `Đã quá giờ ${formatDuration(-minutes)}`
}

function tripHours(trips) {
  const minutes = trips
    .filter((t) => t.status !== 'cancelled' && t.arrival_time)
    .reduce((sum, t) => sum + (new Date(t.arrival_time) - new Date(t.departure_time)) / 60000, 0)
  return Math.round((minutes / 60) * 10) / 10
}

// Trang chính của tài xế: dashboard + lịch chạy trong tuần.
export default function MyTrips() {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [trips, setTrips] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Cập nhật đồng hồ đếm ngược mỗi 30 giây
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await driverApi.getDashboard())
    } catch {
      toast.error('Không thể tải thông tin tổng quan')
    }
  }, [])

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true)
      setTrips(await driverApi.getWeekTrips(weekStart))
    } catch {
      toast.error('Không thể tải lịch chạy trong tuần')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    loadTrips()
  }, [loadTrips])

  const currentWeekStart = getWeekStart()
  const weekEnd = addDays(weekStart, 6)
  const activeTrips = trips.filter((t) => t.status !== 'cancelled')

  const handleExportCsv = () => {
    const rows = [
      ['Ngày', 'Giờ đi', 'Giờ đến', 'Tuyến', 'Biển số xe', 'Vai trò', 'Trạng thái', 'Khách đã đặt'],
      ...trips.map((t) => [
        formatDateString(toVNDateString(t.departure_time)),
        formatTime(t.departure_time),
        t.arrival_time ? formatTime(t.arrival_time) : '',
        `${t.Route?.origin} → ${t.Route?.destination}`,
        t.Vehicle?.license_plate || '',
        t.my_role === 'co' ? 'Tài xế phụ' : 'Tài xế chính',
        STATUS_LABELS[t.status] || t.status,
        t.sold_seats,
      ]),
    ]
    exportToCsv(`lich-chay-${weekStart}.csv`, rows)
  }

  const handleDownloadIcs = async () => {
    setDownloading(true)
    try {
      const blob = await driverApi.downloadScheduleIcs(weekStart)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lich-chay-${weekStart}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Không thể tải file lịch')
    } finally {
      setDownloading(false)
    }
  }

  const nextTrip = dashboard?.next_trip

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <PageHeader
        title="Lịch chạy của tôi"
        description="Các chuyến được phân công và thời gian chạy trong tuần."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={trips.length === 0}>
              <Download className="mr-1.5 h-4 w-4" /> Xuất CSV
            </Button>
            <Button variant="outline" onClick={handleDownloadIcs} disabled={downloading || trips.length === 0}>
              {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-1.5 h-4 w-4" />}
              Thêm vào lịch (.ics)
            </Button>
          </div>
        }
      />

      {/* Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden border-[hsl(var(--border))] sm:col-span-2 xl:col-span-1">
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              Chuyến kế tiếp
            </p>
            {nextTrip ? (
              <button
                type="button"
                onClick={() => navigate(`/driver/trips/${nextTrip.id}`)}
                className="mt-2 block w-full text-left"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                  <span>{nextTrip.Route?.origin}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  <span>{nextTrip.Route?.destination}</span>
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {formatDateString(toVNDateString(nextTrip.departure_time))} · {formatTime(nextTrip.departure_time)} ·
                  {' '}{nextTrip.sold_seats} khách{nextTrip.my_role === 'co' ? ' · bạn là tài xế phụ' : ''}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <TripStatus status={nextTrip.status} />
                  {nextTrip.status === 'scheduled' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))]">
                      <Timer className="h-3.5 w-3.5" /> {describeCountdown(nextTrip.departure_time, now)}
                    </span>
                  )}
                </div>
              </button>
            ) : (
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Chưa có chuyến sắp tới.</p>
            )}
          </CardContent>
        </Card>

        <StatCard
          icon={Bus}
          label="Chuyến hôm nay"
          value={dashboard?.today.trips ?? 0}
          caption={`${dashboard?.today.hours ?? 0} giờ chạy`}
        />
        <StatCard
          icon={CalendarDays}
          label="Chuyến tuần này"
          value={dashboard?.week.trips ?? 0}
          caption={`${dashboard?.week.hours ?? 0} giờ chạy`}
          tone="success"
        />
        <StatCard
          icon={AlertTriangle}
          label="Sự cố chưa xử lý"
          value={dashboard?.open_incidents ?? 0}
          caption="Đã báo, chờ nhà xe xử lý"
          tone="accent"
        />
      </div>

      {/* Week navigation */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Tuần trước">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={weekStart === currentWeekStart ? 'default' : 'outline'}
                onClick={() => setWeekStart(currentWeekStart)}
              >
                Tuần này
              </Button>
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Tuần sau">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm">
              <p className="font-semibold">
                {formatDateString(weekStart)} – {formatDateString(weekEnd)}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {activeTrips.length} chuyến · {tripHours(trips)} giờ chạy trong tuần
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
            </div>
          ) : (
            <DriverWeekSchedule
              trips={trips}
              weekStart={weekStart}
              onSelectTrip={(trip) => navigate(`/driver/trips/${trip.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
