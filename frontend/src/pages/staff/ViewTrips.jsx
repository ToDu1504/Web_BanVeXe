import React, { useEffect, useState } from 'react'
import { tripApi } from '@/api/tripApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SeatMap from '@/components/features/SeatMap'
import { CalendarDays, Search, MapPin, Eye, Loader2, RefreshCw, Bus, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

export default function ViewTrips() {
  const [trips, setTrips] = useState([])
  const [filteredTrips, setFilteredTrips] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // SeatMap Dialog state
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [bookedSeats, setBookedSeats] = useState([])
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [seatMapOpen, setSeatMapOpen] = useState(false)

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const data = await tripApi.getAll()
      setTrips(data)
      setFilteredTrips(data)
    } catch (error) {
      toast.error('Không thể tải danh sách chuyến xe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [])

  // Search & Filter
  useEffect(() => {
    let result = trips

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.Route?.origin?.toLowerCase().includes(q) ||
          t.Route?.destination?.toLowerCase().includes(q) ||
          t.Vehicle?.license_plate?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }

    setFilteredTrips(result)
  }, [searchQuery, statusFilter, trips])

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

  const tripStatusLabels = {
    scheduled: 'Lên lịch',
    ongoing: 'Đang chạy',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  }

  const tripStatusColors = {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    ongoing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }

  return (
    <div className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-[hsl(var(--primary))]">
              <CalendarDays className="h-5 w-5" />
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
          </div>

          {/* Table list */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải danh sách lịch trình...</p>
              </div>
            </div>
          ) : filteredTrips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chuyến chạy</TableHead>
                  <TableHead>Khởi hành</TableHead>
                  <TableHead>Xe & Số ghế</TableHead>
                  <TableHead>Ghế trống</TableHead>
                  <TableHead>Giá vé</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Sơ đồ ghế</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">
                          {trip.Route?.origin} → {trip.Route?.destination}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          Mã chuyến: TRIP-{trip.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(trip.departure_time)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{trip.Vehicle?.license_plate}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] capitalize">
                          Loại xe: {trip.Vehicle?.vehicle_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {trip.available_seats}
                      </span>
                      /{trip.Vehicle?.total_seats} ghế
                    </TableCell>
                    <TableCell className="font-bold text-[hsl(var(--primary))] text-xs">
                      {formatCurrency(trip.price)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tripStatusColors[trip.status]}`}>
                        {tripStatusLabels[trip.status] || trip.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenSeatMap(trip)}
                        className="h-8 w-8 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))] flex flex-col items-center justify-center space-y-2">
              <Bus className="h-10 w-10 opacity-30 stroke-[1.5]" />
              <p>Không tìm thấy chuyến xe nào phù hợp với bộ lọc.</p>
            </div>
          )}
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
                    <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải sơ đồ đặt chỗ...</p>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs border border-[hsl(var(--border))] rounded-xl p-3 bg-[hsl(var(--muted))/15]">
                    <div>
                      <p><strong>Ngày khởi hành:</strong> {formatDateTime(selectedTrip.departure_time)}</p>
                      <p className="mt-1"><strong>Tổng số ghế:</strong> {selectedTrip.Vehicle?.total_seats} ghế</p>
                    </div>
                    <div>
                      <p><strong>Số ghế đã bán:</strong> {bookedSeats.length} ghế</p>
                      <p className="mt-1"><strong>Số ghế còn trống:</strong> {selectedTrip.Vehicle?.total_seats - bookedSeats.length} ghế</p>
                    </div>
                  </div>

                  <div className="border border-[hsl(var(--border))] rounded-xl p-4 bg-white/5">
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
    </div>
  )
}
