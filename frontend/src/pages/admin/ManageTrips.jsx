import React, { useEffect, useState } from 'react'
import { tripApi } from '@/api/tripApi'
import { routeApi } from '@/api/routeApi'
import { vehicleApi } from '@/api/vehicleApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { Plus, Edit2, Trash2, Calendar, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

const tripSchema = zod.object({
  route_id: zod.coerce.number().min(1, 'Vui lòng chọn tuyến đường'),
  vehicle_id: zod.coerce.number().min(1, 'Vui lòng chọn phương tiện'),
  departure_time: zod.string().min(1, 'Thời gian khởi hành không được để trống'),
  arrival_time: zod.string().optional(),
  price: zod.coerce.number().min(1000, 'Giá vé tối thiểu là 1,000đ'),
  available_seats: zod.coerce.number().min(1, 'Số ghế trống tối thiểu là 1'),
  status: zod.enum(['scheduled', 'ongoing', 'completed', 'cancelled']),
})

export default function ManageTrips() {
  const [trips, setTrips] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
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
    },
  })

  // Watch fields for automatic defaults
  const watchedRouteId = watch('route_id')
  const watchedVehicleId = watch('vehicle_id')

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

  const loadData = async () => {
    try {
      setLoading(true)
      const [tripsData, routesData, vehiclesData] = await Promise.all([
        tripApi.getAll(),
        routeApi.getAll(),
        vehicleApi.getAll(),
      ])
      setTrips(tripsData)
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

    // Trip data (e.g. available_seats) changes whenever a customer books
    // elsewhere, so refetch whenever the admin comes back to this tab.
    window.addEventListener('focus', loadData)
    return () => window.removeEventListener('focus', loadData)
  }, [])

  const handleOpenAdd = () => {
    setEditingTrip(null)
    reset({
      route_id: 0,
      vehicle_id: 0,
      departure_time: '',
      arrival_time: '',
      price: 0,
      available_seats: 0,
      status: 'scheduled',
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (trip) => {
    setEditingTrip(trip)
    
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
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chuyến xe này?')) return

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

  const statusLabels = {
    scheduled: { label: 'Sắp chạy', variant: 'secondary' },
    ongoing: { label: 'Đang chạy', variant: 'warning' },
    completed: { label: 'Đã hoàn thành', variant: 'success' },
    cancelled: { label: 'Đã hủy', variant: 'destructive' },
  }

  const vehicleTypeLabels = {
    sleeper: 'Giường nằm',
    limousine: 'Limousine',
    standard: 'Ghế ngồi',
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Quản Lý Chuyến Xe Khách</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Xem danh sách, thêm mới chuyến chạy và điều phối xe đi theo tuyến.</p>
        </div>
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
      </div>

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : trips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tuyến chạy</TableHead>
                  <TableHead>Phương tiện</TableHead>
                  <TableHead>Khởi hành</TableHead>
                  <TableHead>Giá vé</TableHead>
                  <TableHead>Ghế trống</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => {
                  const statusConf = statusLabels[trip.status] || { label: trip.status, variant: 'outline' }
                  return (
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
                      <TableCell className="text-xs">{formatDateTime(trip.departure_time)}</TableCell>
                      <TableCell className="font-semibold text-xs text-[hsl(var(--primary))]">
                        {formatCurrency(trip.price)}
                      </TableCell>
                      <TableCell className="text-xs">
                        Còn {trip.available_seats} / {trip.Vehicle?.total_seats} ghế
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConf.variant} className="text-[10px] font-semibold py-0.5">
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(trip)}
                            className="h-8 w-8 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(trip.id)}
                            className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              Chưa có chuyến xe nào được điều phối hoạt động.
            </div>
          )}
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
              
              {/* Route Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="route-select">Chọn Tuyến Đường</Label>
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
                {errors.route_id && <p className="text-xs text-red-500">{errors.route_id.message}</p>}
              </div>

              {/* Vehicle Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="vehicle-select">Chọn Phương Tiện Xe</Label>
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
                {errors.vehicle_id && <p className="text-xs text-red-500">{errors.vehicle_id.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Departure Time */}
                <div className="space-y-1.5">
                  <Label htmlFor="departure_time">Giờ khởi hành</Label>
                  <Input
                    id="departure_time"
                    type="datetime-local"
                    {...register('departure_time')}
                    className={errors.departure_time ? 'border-red-500' : ''}
                  />
                  {errors.departure_time && <p className="text-xs text-red-500">{errors.departure_time.message}</p>}
                </div>

                {/* Arrival Time */}
                <div className="space-y-1.5">
                  <Label htmlFor="arrival_time">Giờ đến (Dự kiến)</Label>
                  <Input
                    id="arrival_time"
                    type="datetime-local"
                    {...register('arrival_time')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="price">Giá vé thực tế (VND)</Label>
                  <Input
                    id="price"
                    type="number"
                    {...register('price')}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                </div>

                {/* Available seats */}
                <div className="space-y-1.5">
                  <Label htmlFor="available_seats">Ghế mở bán</Label>
                  <Input
                    id="available_seats"
                    type="number"
                    {...register('available_seats')}
                    className={errors.available_seats ? 'border-red-500' : ''}
                  />
                  {errors.available_seats && <p className="text-xs text-red-500">{errors.available_seats.message}</p>}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="trip-status">Trạng thái vận hành</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(val) => setValue('status', val)}
                >
                  <SelectTrigger id="trip-status">
                    <SelectValue placeholder="Trạng thái chuyến chạy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Sắp chạy (Scheduled)</SelectItem>
                    <SelectItem value="ongoing">Đang chạy (Ongoing)</SelectItem>
                    <SelectItem value="completed">Đã hoàn thành (Completed)</SelectItem>
                    <SelectItem value="cancelled">Đã hủy chuyến (Cancelled)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

    </div>
  )
}
