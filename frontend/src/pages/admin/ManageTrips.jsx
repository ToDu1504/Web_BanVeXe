import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { tripApi } from '@/api/tripApi'
import { routeApi } from '@/api/routeApi'
import { vehicleApi } from '@/api/vehicleApi'
import { userApi } from '@/api/userApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { FormField } from '@/components/ui/form-field'
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
import PageHeader from '@/components/common/PageHeader'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { Pagination } from '@/components/ui/pagination'
import TripStatus from '@/components/features/TripStatus'
import ShuttleBadge from '@/components/features/ShuttleBadge'
import TripPassengersDialog from '@/components/features/TripPassengersDialog'
import DriverSelect from '@/components/features/DriverSelect'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { Plus, Edit2, Trash2, CalendarDays, Loader2, ArrowRight, RefreshCw, Search, Users, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const tripSchema = zod.object({
  route_id: zod.coerce.number().min(1, 'Vui lòng chọn tuyến đường'),
  vehicle_id: zod.coerce.number().min(1, 'Vui lòng chọn phương tiện'),
  departure_time: zod.string().min(1, 'Thời gian khởi hành không được để trống'),
  arrival_time: zod.string().optional(),
  price: zod.coerce.number().min(1000, 'Giá vé tối thiểu là 1,000đ'),
  available_seats: zod.coerce.number().min(1, 'Số ghế trống tối thiểu là 1'),
  status: zod.enum(['scheduled', 'ongoing', 'completed', 'cancelled']),
  // Tài xế phụ trách (null = chưa phân công)
  driver_id: zod.number().nullable().optional(),
  // Tài xế phụ — có hoặc không
  co_driver_id: zod.number().nullable().optional(),
})

export default function ManageTrips() {
  const [trips, setTrips] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // Mặc định chỉ chuyến chưa chạy: danh sách sắp theo giờ đi tăng dần, nếu để
  // "Tất cả" thì 21 ngày lịch sử đã chạy đứng trước các chuyến sắp khởi hành.
  const [statusFilter, setStatusFilter] = useState('scheduled')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Passenger list dialog state
  const [passengersTripId, setPassengersTripId] = useState(null)
  const [passengersOpen, setPassengersOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      route_id: 0,
      vehicle_id: 0,
      departure_time: '',
      arrival_time: '',
      price: 0,
      available_seats: 0,
      status: 'scheduled',
      driver_id: null,
      co_driver_id: null,
    },
  })

  // Watch fields for automatic defaults
  const watchedRouteId = watch('route_id')
  const watchedVehicleId = watch('vehicle_id')
  const watchedDeparture = watch('departure_time')
  const watchedDriverId = watch('driver_id')
  const watchedCoDriverId = watch('co_driver_id')

  // Set default pricing/seats based on route/vehicle selection
  useEffect(() => {
    if (watchedRouteId && !editingTrip) {
      const selectedRoute = routes.find(r => r.id === parseInt(watchedRouteId))
      if (selectedRoute) setValue('price', selectedRoute.base_price)
    }
  }, [watchedRouteId, routes, editingTrip, setValue])

  useEffect(() => {
    if (watchedVehicleId && !editingTrip) {
      const selectedVehicle = vehicles.find(v => v.id === parseInt(watchedVehicleId))
      if (selectedVehicle) setValue('available_seats', selectedVehicle.total_seats)
    }
  }, [watchedVehicleId, vehicles, editingTrip, setValue])

  // Đề xuất tài xế theo khung giờ + xe đang chọn: backend trả về mỗi tài xế kèm
  // `unavailable` (nghỉ ngày đó), `busy_trip` (trùng giờ chuyến khác) và
  // `is_vehicle_regular` (tài xế quen của xe), đã sắp xếp quen & trống → trống → bận.
  const watchedArrival = watch('arrival_time')
  // true khi admin tự chọn tài xế — khi đó không tự điền đè lựa chọn của họ nữa
  const driverTouchedRef = useRef(false)
  const toIso = (local) => (local && local.length >= 16 ? new Date(local).toISOString() : undefined)

  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    const timer = setTimeout(() => {
      userApi.getDrivers({
        departure_time: toIso(watchedDeparture),
        arrival_time: toIso(watchedArrival),
        vehicle_id: watchedVehicleId || undefined,
        exclude_trip_id: editingTrip?.id,
      })
        .then((data) => {
          if (cancelled) return
          setDrivers(data)
          // Tự điền khi tạo mới và admin chưa tự chọn: tài xế đầu danh sách nếu
          // trống lịch (ưu tiên tài xế quen của xe), ngược lại để trống.
          if (!editingTrip && !driverTouchedRef.current && toIso(watchedDeparture)) {
            const best = data.find((d) => !d.unavailable && !d.busy_trip)
            setValue('driver_id', best ? best.id : null)
            // Tài xế phụ không tự điền; nếu người đang chọn giờ bị bận/trùng thì bỏ chọn
            const co = data.find((d) => d.id === getValues('co_driver_id'))
            if (co && (co.unavailable || co.busy_trip || co.id === best?.id)) setValue('co_driver_id', null)
          }
        })
        .catch(() => { if (!cancelled) setDrivers([]) })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [dialogOpen, watchedDeparture, watchedArrival, watchedVehicleId, editingTrip, setValue])


  // Gõ tới đâu tìm tới đó nhưng chỉ gọi API sau khi ngừng gõ 400ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tripsRes, routesData, vehiclesData] = await Promise.all([
        tripApi.getAll({ page, limit: 10, search: debouncedSearch || undefined, status: statusFilter }),
        routeApi.getAll(),
        vehicleApi.getAll(),
      ])
      setTrips(tripsRes.data)
      setPagination(tripsRes.pagination)
      setRoutes(routesData)
      setVehicles(vehiclesData)
    } catch (error) {
      toast.error('Không thể tải danh sách dữ liệu chuyến xe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => {
    // Trip data (e.g. available_seats) changes whenever a customer books
    // elsewhere, so refetch whenever the admin comes back to this tab.
    window.addEventListener('focus', loadData)
    return () => window.removeEventListener('focus', loadData)
  }, [page, debouncedSearch, statusFilter])

  const handleOpenAdd = () => {
    setEditingTrip(null)
    driverTouchedRef.current = false
    reset({
      route_id: 0,
      vehicle_id: 0,
      departure_time: '',
      arrival_time: '',
      price: 0,
      available_seats: 0,
      status: 'scheduled',
      driver_id: null,
      co_driver_id: null,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (trip) => {
    setEditingTrip(trip)
    driverTouchedRef.current = true // giữ nguyên tài xế đã phân công

    // Format dates to fit <input type="datetime-local"> (yyyy-MM-ddThh:mm)
    const formatLocal = (dtStr) => {
      if (!dtStr) return ''
      const d = new Date(dtStr)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset()) // adjust offset
      return d.toISOString().slice(0, 16)
    }

    reset({
      route_id: trip.route_id,
      vehicle_id: trip.vehicle_id,
      departure_time: formatLocal(trip.departure_time),
      arrival_time: formatLocal(trip.arrival_time),
      price: trip.price,
      available_seats: trip.available_seats,
      status: trip.status,
      driver_id: trip.driver_id ?? null,
      co_driver_id: trip.co_driver_id ?? null,
    })
    setDialogOpen(true)
  }

  const handleOpenPassengers = (trip) => {
    setPassengersTripId(trip.id)
    setPassengersOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await tripApi.delete(id)
      toast.success('Xóa chuyến xe thành công!')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa chuyến xe')
    }
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      // Ensure arrival_time is sent as null if empty
      const payload = {
        ...data,
        arrival_time: data.arrival_time === '' ? null : data.arrival_time,
      }

      if (editingTrip) {
        await tripApi.update(editingTrip.id, payload)
        toast.success('Cập nhật chuyến xe thành công!')
      } else {
        await tripApi.create(payload)
        toast.success('Khởi hành chuyến xe mới thành công!')
      }
      loadData()
      setDialogOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu chuyến xe')
    } finally {
      setSubmitting(false)
    }
  }

  const vehicleTypeLabels = {
    sleeper: 'Giường nằm',
    limousine: 'Limousine',
    standard: 'Ghế ngồi',
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">

      <PageHeader
        title="Quản Lý Chuyến Xe Khách"
        description="Xem danh sách, thêm mới chuyến chạy và điều phối xe đi theo tuyến."
        action={
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="font-semibold h-10"
              title="Tải lại số ghế trống mới nhất"
            >
              <RefreshCw className={`h-4.5 w-4.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Làm Mới
            </Button>
            <Button onClick={handleOpenAdd} className="font-semibold h-10">
              <Plus className="h-4.5 w-4.5 mr-1.5" /> Điều Phối Chuyến Xe
            </Button>
          </div>
        }
      />

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Tìm theo điểm đi, điểm đến, biển số xe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="scheduled">Sắp khởi hành</SelectItem>
                <SelectItem value="ongoing">Đang chạy</SelectItem>
                <SelectItem value="completed">Đã hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : trips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tuyến chạy</TableHead>
                  <TableHead>Phương tiện</TableHead>
                  <TableHead>Tài xế</TableHead>
                  <TableHead>Khởi hành</TableHead>
                  <TableHead>Giá vé</TableHead>
                  <TableHead>Ghế trống</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-bold text-xs">TRIP-{trip.id}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>{trip.Route?.origin}</span>
                        <ArrowRight className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                        <span>{trip.Route?.destination}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold">{trip.Vehicle?.license_plate}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                          {vehicleTypeLabels[trip.Vehicle?.vehicle_type]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {trip.Driver ? (
                        <span className="font-semibold">
                          {trip.Driver.full_name}
                          {trip.CoDriver && (
                            <span className="block text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                              Phụ: {trip.CoDriver.full_name}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">Chưa phân công</span>
                      )}
                      {trip.open_incident_count > 0 && (
                        <Badge variant="destructive" className="mt-1 flex w-fit items-center gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" />
                          {trip.open_incident_count} sự cố
                        </Badge>
                      )}
                      <ShuttleBadge trip={trip} />
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(trip.departure_time)}</TableCell>
                    <TableCell className="font-semibold text-xs text-[hsl(var(--primary))]">
                      {formatCurrency(trip.price)}
                    </TableCell>
                    <TableCell className="text-xs">
                      Còn {trip.available_seats} / {trip.Vehicle?.total_seats} ghế
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
                          onClick={() => handleOpenEdit(trip)}
                          className="h-8 w-8"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa chuyến xe TRIP-{trip.id}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Chuyến {trip.Route?.origin} → {trip.Route?.destination} sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Đóng</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(trip.id)}>
                                Xác nhận xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={CalendarDays} title="Chưa có chuyến xe nào được điều phối hoạt động." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTrip ? `Cập nhật chuyến chạy TRIP-${editingTrip.id}` : 'Thêm mới lịch trình chuyến chạy'}
            </DialogTitle>
            <DialogDescription>
              Vui lòng gán tuyến xe, xe khách và thời gian chạy bên dưới.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 my-3 text-sm">

              <FormField label="Chọn Tuyến Đường" htmlFor="route-select" error={errors.route_id?.message}>
                <Select
                  value={watch('route_id')?.toString()}
                  onValueChange={(val) => setValue('route_id', parseInt(val), { shouldValidate: true })}
                >
                  <SelectTrigger id="route-select">
                    <SelectValue placeholder="Chọn tuyến xe chạy..." />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map(r => (
                      <SelectItem key={`route-sel-${r.id}`} value={r.id.toString()}>
                        {r.origin} → {r.destination} ({formatCurrency(r.base_price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Chọn Phương Tiện Xe" htmlFor="vehicle-select" error={errors.vehicle_id?.message}>
                <Select
                  value={watch('vehicle_id')?.toString()}
                  onValueChange={(val) => setValue('vehicle_id', parseInt(val), { shouldValidate: true })}
                >
                  <SelectTrigger id="vehicle-select">
                    <SelectValue placeholder="Chọn xe chở khách..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={`vehicle-sel-${v.id}`} value={v.id.toString()}>
                        {v.license_plate} - {vehicleTypeLabels[v.vehicle_type]} ({v.total_seats} ghế)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Giờ khởi hành" htmlFor="departure_time" error={errors.departure_time?.message}>
                  <DateInput
                    id="departure_time"
                    type="datetime-local"
                    {...register('departure_time')}
                    value={watch('departure_time') ?? ''}
                    className={errors.departure_time ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>

                <FormField label="Giờ đến (Dự kiến)" htmlFor="arrival_time">
                  <DateInput
                    id="arrival_time"
                    type="datetime-local"
                    {...register('arrival_time')}
                    value={watch('arrival_time') ?? ''}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Giá vé thực tế (VND)" htmlFor="price" error={errors.price?.message}>
                  <Input
                    id="price"
                    type="number"
                    {...register('price')}
                    className={errors.price ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>

                <FormField label="Ghế mở bán" htmlFor="available_seats" error={errors.available_seats?.message}>
                  <Input
                    id="available_seats"
                    type="number"
                    {...register('available_seats')}
                    className={errors.available_seats ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tài xế chính" htmlFor="driver-select">
                  <DriverSelect
                    id="driver-select"
                    value={watchedDriverId}
                    onChange={(val) => {
                      driverTouchedRef.current = true
                      setValue('driver_id', val, { shouldValidate: true })
                      if (!val) setValue('co_driver_id', null) // không có tài xế chính thì bỏ luôn tài xế phụ
                    }}
                    drivers={drivers}
                    excludeId={watchedCoDriverId}
                    keepIds={[editingTrip?.driver_id, editingTrip?.co_driver_id].filter(Boolean)}
                  />
                </FormField>
                <FormField label="Tài xế phụ (không bắt buộc)" htmlFor="co-driver-select">
                  <DriverSelect
                    id="co-driver-select"
                    value={watchedCoDriverId}
                    onChange={(val) => setValue('co_driver_id', val, { shouldValidate: true })}
                    drivers={watchedDriverId ? drivers : []}
                    excludeId={watchedDriverId}
                    keepIds={[editingTrip?.driver_id, editingTrip?.co_driver_id].filter(Boolean)}
                    noneLabel={watchedDriverId ? 'Không có tài xế phụ' : 'Chọn tài xế chính trước'}
                  />
                </FormField>
              </div>
              {!editingTrip && !watchedDeparture && (
                <p className="-mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                  Nhập giờ khởi hành (và giờ đến) để hệ thống đề xuất tài xế trống lịch.
                </p>
              )}

              <FormField label="Trạng thái vận hành" htmlFor="trip-status">
                <Select
                  value={watch('status')}
                  onValueChange={(val) => setValue('status', val)}
                >
                  <SelectTrigger id="trip-status">
                    <SelectValue placeholder="Trạng thái chuyến chạy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Sắp khởi hành (Scheduled)</SelectItem>
                    <SelectItem value="ongoing">Đang chạy (Ongoing)</SelectItem>
                    <SelectItem value="completed">Đã hoàn thành (Completed)</SelectItem>
                    <SelectItem value="cancelled">Đã hủy chuyến (Cancelled)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Hủy</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Lưu chuyến xe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TripPassengersDialog open={passengersOpen} onOpenChange={setPassengersOpen} tripId={passengersTripId} />

    </motion.div>
  )
}
