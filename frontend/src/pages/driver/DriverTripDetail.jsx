import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { driverApi } from '@/api/driverApi'
import { tripApi } from '@/api/tripApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import SeatMap from '@/components/features/SeatMap'
import TripStatus from '@/components/features/TripStatus'
import TripPassengersDialog from '@/components/features/TripPassengersDialog'
import IncidentReportDialog from '@/components/features/IncidentReportDialog'
import EmptyState from '@/components/common/EmptyState'
import { ArrowLeft, ArrowRight, Play, Flag, Users, AlertTriangle, Loader2, Bus } from 'lucide-react'
import { formatDateTime, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

// Cho phép bấm "Bắt đầu chạy" sớm nhất bấy nhiêu phút trước giờ khởi hành
// (phải khớp START_EARLY_MINUTES ở backend/driverController.js).
const START_EARLY_MINUTES = 60

const INCIDENT_LABELS = {
  delay: 'Trễ chuyến',
  breakdown: 'Xe hỏng',
  accident: 'Tai nạn / sự cố',
  other: 'Khác',
}

export default function DriverTripDetail() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [bookedSeats, setBookedSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [acting, setActing] = useState(false)

  const [passengersOpen, setPassengersOpen] = useState(false)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // 'start' | 'complete' | null

  const load = useCallback(async () => {
    try {
      const [tripData, seats] = await Promise.all([
        driverApi.getTripById(id),
        tripApi.getBookedSeats(id),
      ])
      setTrip(tripData)
      setBookedSeats(seats)
      setNotFound(false)
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 404) {
        setNotFound(true)
      } else {
        toast.error('Không thể tải chi tiết chuyến')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const runAction = async (action) => {
    setActing(true)
    try {
      if (action === 'start') {
        await driverApi.startTrip(id)
        toast.success('Đã bắt đầu chuyến. Chúc thượng lộ bình an!')
      } else {
        await driverApi.completeTrip(id)
        toast.success('Đã hoàn thành chuyến. Cảm ơn bạn!')
      }
      await load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái chuyến')
    } finally {
      setActing(false)
      setConfirmAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
      </div>
    )
  }

  if (notFound || !trip) {
    return (
      <div className="space-y-4">
        <EmptyState icon={Bus} title="Không tìm thấy chuyến này hoặc chuyến không được phân công cho bạn." />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link to="/driver/trips">Về lịch chạy</Link>
          </Button>
        </div>
      </div>
    )
  }

  const startAllowedAt = new Date(new Date(trip.departure_time).getTime() - START_EARLY_MINUTES * 60 * 1000)
  // Chỉ tài xế chính bấm Bắt đầu/Hoàn thành; tài xế phụ xem, điểm danh, báo sự cố.
  const isMain = trip.my_role === 'main'
  const canStart = trip.status === 'scheduled' && Date.now() >= startAllowedAt.getTime()
  const canReport = ['scheduled', 'ongoing'].includes(trip.status)

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/driver/trips"><ArrowLeft className="mr-1.5 h-4 w-4" /> Lịch chạy</Link>
      </Button>

      <Card className="border-[hsl(var(--border))]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
              <span>{trip.Route?.origin}</span>
              <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <span>{trip.Route?.destination}</span>
            </CardTitle>
            <TripStatus status={trip.status} />
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Mã chuyến: TRIP-{trip.id}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Khởi hành (theo lịch)</p>
              <p className="font-semibold">{formatDateTime(trip.departure_time)}</p>
              {trip.actual_departure_at && (
                <p className="text-xs text-[hsl(var(--success))]">Thực tế: {formatTime(trip.actual_departure_at)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Đến nơi (dự kiến)</p>
              <p className="font-semibold">{trip.arrival_time ? formatDateTime(trip.arrival_time) : 'Chưa xác định'}</p>
              {trip.actual_arrival_at && (
                <p className="text-xs text-[hsl(var(--success))]">Thực tế: {formatTime(trip.actual_arrival_at)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Xe</p>
              <p className="font-semibold">{trip.Vehicle?.license_plate}</p>
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Tài xế {isMain ? '(bạn là tài xế chính)' : '(bạn là tài xế phụ)'}
              </p>
              <p className="font-semibold">
                {trip.Driver?.full_name || 'Chưa phân công'}
                {trip.CoDriver && <span className="font-normal"> · Phụ: {trip.CoDriver.full_name}</span>}
              </p>
              {!isMain && trip.Driver?.phone && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">SĐT tài xế chính: {trip.Driver.phone}</p>
              )}
              {isMain && trip.CoDriver?.phone && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">SĐT tài xế phụ: {trip.CoDriver.phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Khách</p>
              <p className="font-semibold">
                {trip.sold_seats} đã đặt / {trip.total_seats} ghế · Đã lên xe {trip.boarded_count}/{trip.sold_seats}
              </p>
            </div>
          </div>

          {/* Hành động chính — nút lớn cho thao tác trên điện thoại */}
          <div className="grid gap-2 sm:grid-cols-2">
            {isMain && trip.status === 'scheduled' && (
              <Button
                size="lg"
                className="h-12 text-base"
                disabled={!canStart || acting}
                onClick={() => setConfirmAction('start')}
              >
                <Play className="mr-2 h-5 w-5" /> Bắt đầu chạy
              </Button>
            )}
            {isMain && trip.status === 'ongoing' && (
              <Button
                size="lg"
                variant="accent"
                className="h-12 text-base"
                disabled={acting}
                onClick={() => setConfirmAction('complete')}
              >
                <Flag className="mr-2 h-5 w-5" /> Hoàn thành chuyến
              </Button>
            )}
            <Button size="lg" variant="outline" className="h-12 text-base" onClick={() => setPassengersOpen(true)}>
              <Users className="mr-2 h-5 w-5" /> Danh sách khách & điểm danh
            </Button>
            {canReport && (
              <Button
                size="lg"
                variant="outline"
                className="h-12 text-base text-[hsl(var(--destructive))] sm:col-span-2"
                onClick={() => setIncidentOpen(true)}
              >
                <AlertTriangle className="mr-2 h-5 w-5" /> Báo sự cố / trễ chuyến
              </Button>
            )}
          </div>
          {!isMain && ['scheduled', 'ongoing'].includes(trip.status) && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Bạn là tài xế phụ: tài xế chính sẽ bấm "Bắt đầu chạy" / "Hoàn thành". Bạn vẫn điểm danh khách và báo sự cố được.
            </p>
          )}
          {isMain && trip.status === 'scheduled' && !canStart && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Có thể bấm "Bắt đầu chạy" từ {formatTime(startAllowedAt)} ({START_EARLY_MINUTES} phút trước giờ khởi hành).
            </p>
          )}
        </CardContent>
      </Card>

      {trip.incidents?.length > 0 && (
        <Card className="border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sự cố đã báo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {trip.incidents.map((incident) => (
              <div key={incident.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[hsl(var(--border))] p-2.5">
                <div>
                  <span className="font-semibold">{INCIDENT_LABELS[incident.type]}</span>
                  {incident.type === 'delay' && incident.delay_minutes ? ` — trễ ${incident.delay_minutes} phút` : ''}
                  {incident.note && <p className="text-xs text-[hsl(var(--muted-foreground))]">{incident.note}</p>}
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDateTime(incident.created_at)}</p>
                </div>
                {incident.resolved_at ? (
                  <Badge variant="success">Đã xử lý</Badge>
                ) : (
                  <Badge variant="warning">Chờ xử lý</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-[hsl(var(--border))]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sơ đồ ghế</CardTitle>
        </CardHeader>
        <CardContent>
          <SeatMap
            totalSeats={trip.Vehicle?.total_seats}
            layout={trip.Vehicle?.seat_layout}
            bookedSeats={bookedSeats}
            selectedSeats={[]}
            onSeatClick={() => {}} // Chỉ xem
          />
        </CardContent>
      </Card>

      <TripPassengersDialog
        open={passengersOpen}
        onOpenChange={(open) => {
          setPassengersOpen(open)
          if (!open) load() // cập nhật lại số khách đã lên xe
        }}
        tripId={trip.id}
      />
      <IncidentReportDialog
        open={incidentOpen}
        onOpenChange={setIncidentOpen}
        tripId={trip.id}
        onCreated={load}
      />

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'start' ? 'Bắt đầu chạy chuyến này?' : 'Xác nhận hoàn thành chuyến?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'start'
                ? 'Hệ thống sẽ ghi nhận giờ xuất bến thực tế là bây giờ.'
                : 'Hệ thống sẽ ghi nhận giờ đến nơi thực tế là bây giờ. Sau khi hoàn thành không thể điểm danh khách nữa.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Đóng</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => {
                e.preventDefault()
                runAction(confirmAction)
              }}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
