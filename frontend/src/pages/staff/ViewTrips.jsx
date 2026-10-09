import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { tripApi } from '@/api/tripApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SeatMap from '@/components/features/SeatMap'
import TripPassengersDialog from '@/components/features/TripPassengersDialog'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { Pagination } from '@/components/ui/pagination'
import TripStatus from '@/components/features/TripStatus'
import { Badge } from '@/components/ui/badge'
import ShuttleBadge from '@/components/features/ShuttleBadge'
import { CalendarDays, Search, Eye, Loader2, RefreshCw, Bus, Users, Clock, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

// Ngưỡng coi là "sắp khởi hành" để đánh dấu nổi bật trên bảng, độc lập với
// bộ lọc khoảng thời gian — một chuyến trong 2 giờ tới luôn đáng chú ý dù
// nhân viên đang lọc "Hôm nay" hay "Tất cả".
const URGENT_THRESHOLD_MS = 2 * 60 * 60 * 1000

const TIME_WINDOWS = {
  all: null,
  '2h': 2 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  today: 'today',
}

function computeTimeRange(key) {
  const window = TIME_WINDOWS[key]
  if (!window) return {}
  const from = new Date()
  if (window === 'today') {
    const to = new Date()
    to.setHours(23, 59, 59, 999)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  return { from: from.toISOString(), to: new Date(from.getTime() + window).toISOString() }
}

function isUrgent(departureTime) {
  const diff = new Date(departureTime).getTime() - Date.now()
  return diff > 0 && diff < URGENT_THRESHOLD_MS
}

export default function ViewTrips() {
  const [trips, setTrips] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // Mặc định chỉ chuyến chưa chạy: danh sách sắp theo giờ đi tăng dần, nếu để
  // "Tất cả" thì 21 ngày lịch sử đã chạy đứng trước các chuyến sắp khởi hành.
  const [statusFilter, setStatusFilter] = useState('scheduled')
  const [timeFilter, setTimeFilter] = useState('all')

  // SeatMap Dialog state
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [bookedSeats, setBookedSeats] = useState([])
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [seatMapOpen, setSeatMapOpen] = useState(false)

  // Passenger list dialog state
  const [passengersTripId, setPassengersTripId] = useState(null)
  const [passengersOpen, setPassengersOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, timeFilter])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const { from, to } = computeTimeRange(timeFilter)
      const res = await tripApi.getAll({
        page, limit: 10, search: debouncedSearch || undefined, status: statusFilter, from, to,
      })
      setTrips(res.data)
      setPagination(res.pagination)
    } catch (error) {
      toast.error('Không thể tải danh sách chuyến xe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [page, debouncedSearch, statusFilter, timeFilter])

  const handleOpenPassengers = (trip) => {
    setPassengersTripId(trip.id)
    setPassengersOpen(true)
  }

  const handleOpenSeatMap = async (trip) => {
    setSelectedTrip(trip)
    setSeatMapOpen(true)
    setLoadingSeats(true)
    try {
      const seats = await tripApi.getBookedSeats(trip.id)
      setBookedSeats(seats)
    } catch (error) {
      toast.error('Không thể tải danh sách ghế đã bán')
    } finally {
      setLoadingSeats(false)
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[hsl(var(--primary))]" />
              Theo Dõi Lịch Trình Chuyến Xe
            </CardTitle>
            <CardDescription>
              Xem danh sách chuyến xe đang hoạt động, lọc thông tin và kiểm tra sơ đồ ghế chi tiết.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchTrips} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Tìm điểm đi, điểm đến hoặc biển số xe..."
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
                  <SelectItem value="scheduled">Lên lịch (Scheduled)</SelectItem>
                  <SelectItem value="ongoing">Đang chạy (Ongoing)</SelectItem>
                  <SelectItem value="completed">Hoàn thành (Completed)</SelectItem>
                  <SelectItem value="cancelled">Đã hủy (Cancelled)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-sm text-[hsl(var(--muted-foreground))] whitespace-nowrap">Khoảng thời gian:</span>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Lọc thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="2h">Trong 2 giờ tới</SelectItem>
                  <SelectItem value="6h">Trong 6 giờ tới</SelectItem>
                  <SelectItem value="today">Hôm nay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table list */}
          {loading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : trips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chuyến chạy</TableHead>
                  <TableHead>Khởi hành</TableHead>
                  <TableHead>Xe & Số ghế</TableHead>
                  <TableHead>Ghế trống</TableHead>
                  <TableHead>Giá vé</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">
                          {trip.Route?.origin} → {trip.Route?.destination}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          Mã chuyến: TRIP-{trip.id}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          Tài xế: {trip.Driver ? trip.Driver.full_name : 'Chưa phân công'}
                          {trip.CoDriver && ` · Phụ: ${trip.CoDriver.full_name}`}
                        </span>
                        {trip.open_incident_count > 0 && (
                          <Badge variant="destructive" className="mt-1 flex w-fit items-center gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" />
                            {trip.open_incident_count} sự cố chưa xử lý
                          </Badge>
                        )}
                        <ShuttleBadge trip={trip} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDateTime(trip.departure_time)}
                      {trip.status === 'scheduled' && isUrgent(trip.departure_time) && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)]">
                          <Clock className="h-3 w-3" /> Sắp khởi hành
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{trip.Vehicle?.license_plate}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] capitalize">
                          Loại xe: {trip.Vehicle?.vehicle_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-bold text-[hsl(var(--success))]">
                        {trip.available_seats}
                      </span>
                      /{trip.Vehicle?.total_seats} ghế
                    </TableCell>
                    <TableCell className="font-bold text-[hsl(var(--primary))] text-xs">
                      {formatCurrency(trip.price)}
                    </TableCell>
                    <TableCell>
                      <TripStatus status={trip.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenPassengers(trip)}
                          className="h-8 w-8"
                          title="Danh sách khách"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenSeatMap(trip)}
                          className="h-8 w-8"
                          title="Sơ đồ ghế"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Bus} title="Không tìm thấy chuyến xe nào phù hợp với bộ lọc." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* SeatMap Dialog */}
      <Dialog open={seatMapOpen} onOpenChange={setSeatMapOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTrip && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5 text-[hsl(var(--primary))]" />
                  Sơ đồ đặt ghế chuyến TRIP-{selectedTrip.id}
                </DialogTitle>
                <DialogDescription>
                  Tuyến chạy: {selectedTrip.Route?.origin} → {selectedTrip.Route?.destination} | Biển số: {selectedTrip.Vehicle?.license_plate}
                </DialogDescription>
              </DialogHeader>

              {loadingSeats ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải sơ đồ đặt chỗ...</p>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs border border-[hsl(var(--border))] rounded-xl p-3 bg-[hsl(var(--muted)/0.3)]">
                    <div>
                      <p><strong>Ngày khởi hành:</strong> {formatDateTime(selectedTrip.departure_time)}</p>
                      <p className="mt-1"><strong>Tổng số ghế:</strong> {selectedTrip.Vehicle?.total_seats} ghế</p>
                    </div>
                    <div>
                      <p><strong>Số ghế đã bán:</strong> {bookedSeats.length} ghế</p>
                      <p className="mt-1"><strong>Số ghế còn trống:</strong> {selectedTrip.Vehicle?.total_seats - bookedSeats.length} ghế</p>
                    </div>
                  </div>

                  <div className="border border-[hsl(var(--border))] rounded-xl p-4">
                    <SeatMap
                      totalSeats={selectedTrip.Vehicle?.total_seats}
                      layout={selectedTrip.Vehicle?.seat_layout}
                      bookedSeats={bookedSeats}
                      selectedSeats={[]}
                      onSeatClick={() => {}} // Read-only for staff
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <TripPassengersDialog open={passengersOpen} onOpenChange={setPassengersOpen} tripId={passengersTripId} />
    </motion.div>
  )
}
