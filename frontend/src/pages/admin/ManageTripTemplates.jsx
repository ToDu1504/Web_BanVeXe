import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { tripTemplateApi } from '@/api/tripTemplateApi'
import { routeApi } from '@/api/routeApi'
import { vehicleApi } from '@/api/vehicleApi'
import { userApi } from '@/api/userApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { Plus, Edit2, Trash2, Repeat, Loader2, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

// Mon..Sun labels mapped to JS Date.getDay() values (0=Sun..6=Sat), matching
// the backend's days_of_week convention exactly (no conversion needed).
const WEEKDAY_OPTIONS = [
  { label: 'T2', value: 1 },
  { label: 'T3', value: 2 },
  { label: 'T4', value: 3 },
  { label: 'T5', value: 4 },
  { label: 'T6', value: 5 },
  { label: 'T7', value: 6 },
  { label: 'CN', value: 0 },
]
const WEEKDAY_LABELS = Object.fromEntries(WEEKDAY_OPTIONS.map((d) => [d.value, d.label]))

const templateSchema = zod.object({
  route_id: zod.coerce.number().min(1, 'Vui lòng chọn tuyến đường'),
  vehicle_id: zod.coerce.number().min(1, 'Vui lòng chọn phương tiện'),
  departure_time_of_day: zod.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ khởi hành phải theo định dạng HH:mm'),
  duration_minutes: zod.coerce.number().min(1, 'Thời gian di chuyển phải lớn hơn 0').optional().or(zod.literal('')),
  price: zod.coerce.number().min(1000, 'Giá vé tối thiểu là 1,000đ'),
  available_seats: zod.coerce.number().min(1, 'Số ghế mở bán tối thiểu là 1'),
  days_of_week: zod.array(zod.number()).min(1, 'Chọn ít nhất 1 ngày trong tuần'),
  // Tài xế mặc định (null = chưa phân công)
  driver_id: zod.number().nullable().optional(),
  co_driver_id: zod.number().nullable().optional(),
})

export default function ManageTripTemplates() {
  const [templates, setTemplates] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      route_id: 0,
      vehicle_id: 0,
      departure_time_of_day: '',
      duration_minutes: '',
      price: 0,
      available_seats: 0,
      days_of_week: [],
      driver_id: null,
      co_driver_id: null,
    },
  })

  const watchedRouteId = watch('route_id')
  const watchedVehicleId = watch('vehicle_id')
  const watchedDays = watch('days_of_week') || []
  const watchedDriverId = watch('driver_id')
  const watchedCoDriverId = watch('co_driver_id')

  // Auto-fill duration/seats from the selected route/vehicle, same UX as ManageTrips.jsx.
  useEffect(() => {
    if (watchedRouteId && !editingTemplate) {
      const selectedRoute = routes.find((r) => r.id === parseInt(watchedRouteId))
      if (selectedRoute?.duration_min) setValue('duration_minutes', selectedRoute.duration_min)
    }
  }, [watchedRouteId, routes, editingTemplate, setValue])

  useEffect(() => {
    if (watchedVehicleId && !editingTemplate) {
      const selectedVehicle = vehicles.find((v) => v.id === parseInt(watchedVehicleId))
      if (selectedVehicle) setValue('available_seats', selectedVehicle.total_seats)
    }
  }, [watchedVehicleId, vehicles, editingTemplate, setValue])

  // Chọn xe khi tạo mẫu mới → tự điền tài xế quen của xe (mẫu không có ngày cụ
  // thể nên không kiểm tra trùng lịch ở đây; job sinh chuyến sẽ tự kiểm tra).
  useEffect(() => {
    if (!dialogOpen || editingTemplate || !watchedVehicleId) return
    let cancelled = false
    userApi.getDrivers({ vehicle_id: watchedVehicleId })
      .then((data) => {
        if (cancelled) return
        setDrivers(data)
        const regulars = data.filter((d) => d.is_vehicle_regular)
        if (regulars[0]) setValue('driver_id', regulars[0].id)
        setValue('co_driver_id', regulars[1] ? regulars[1].id : null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [dialogOpen, watchedVehicleId, editingTemplate, setValue])

  const loadData = async () => {
    try {
      setLoading(true)
      const [templatesRes, routesData, vehiclesData, driversData] = await Promise.all([
        tripTemplateApi.getAll({ page, limit: 10 }),
        routeApi.getAll(),
        vehicleApi.getAll(),
        userApi.getDrivers(),
      ])
      setTemplates(templatesRes.data)
      setPagination(templatesRes.pagination)
      setRoutes(routesData)
      setVehicles(vehiclesData)
      setDrivers(driversData)
    } catch (error) {
      toast.error('Không thể tải danh sách mẫu chuyến lặp lại')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page])

  const toggleWeekday = (value) => {
    const next = watchedDays.includes(value)
      ? watchedDays.filter((d) => d !== value)
      : [...watchedDays, value]
    setValue('days_of_week', next, { shouldValidate: true })
  }

  const handleOpenAdd = () => {
    setEditingTemplate(null)
    reset({
      route_id: 0,
      vehicle_id: 0,
      departure_time_of_day: '',
      duration_minutes: '',
      price: 0,
      available_seats: 0,
      days_of_week: [],
      driver_id: null,
      co_driver_id: null,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (template) => {
    setEditingTemplate(template)
    reset({
      route_id: template.route_id,
      vehicle_id: template.vehicle_id,
      departure_time_of_day: template.departure_time_of_day,
      duration_minutes: template.duration_minutes ?? '',
      price: template.price,
      available_seats: template.available_seats,
      days_of_week: template.days_of_week || [],
      driver_id: template.driver_id ?? null,
      co_driver_id: template.co_driver_id ?? null,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await tripTemplateApi.delete(id)
      toast.success('Xóa mẫu chuyến lặp lại thành công! Các chuyến đã sinh ra trước đó vẫn được giữ nguyên.')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa mẫu chuyến')
    }
  }

  const handleActiveToggle = async (template) => {
    const nextStatus = !template.is_active
    try {
      await tripTemplateApi.update(template.id, { is_active: nextStatus })
      toast.success(`${nextStatus ? 'Kích hoạt' : 'Tạm dừng'} mẫu chuyến thành công!`)
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, is_active: nextStatus } : t)))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái')
    }
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        duration_minutes: data.duration_minutes === '' ? null : data.duration_minutes,
      }

      if (editingTemplate) {
        await tripTemplateApi.update(editingTemplate.id, payload)
        toast.success('Cập nhật mẫu chuyến lặp lại thành công!')
      } else {
        await tripTemplateApi.create(payload)
        toast.success('Tạo mẫu chuyến lặp lại thành công!')
      }
      loadData()
      setDialogOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu mẫu chuyến')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">

      <PageHeader
        title="Mẫu Chuyến Xe Lặp Lại"
        description="Định nghĩa một lần, hệ thống tự động sinh chuyến xe hàng ngày theo lịch — không cần tạo thủ công mỗi ngày."
        action={
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handleOpenAdd} className="font-semibold h-10">
              <Plus className="h-4.5 w-4.5 mr-1.5" /> Thêm Mẫu Chuyến
            </Button>
          </div>
        }
      />

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          {loading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tuyến chạy</TableHead>
                  <TableHead>Phương tiện</TableHead>
                  <TableHead>Tài xế</TableHead>
                  <TableHead>Giờ khởi hành</TableHead>
                  <TableHead>Ngày lặp lại</TableHead>
                  <TableHead>Giá vé</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-bold text-xs">TPL-{template.id}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>{template.Route?.origin}</span>
                        <ArrowRight className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                        <span>{template.Route?.destination}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{template.Vehicle?.license_plate}</TableCell>
                    <TableCell className="text-xs">
                      {template.Driver ? (
                        <span className="font-semibold">
                          {template.Driver.full_name}
                          {template.CoDriver && (
                            <span className="block text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                              Phụ: {template.CoDriver.full_name}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{template.departure_time_of_day}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(template.days_of_week || []).slice().sort().map((d) => (
                          <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {WEEKDAY_LABELS[d]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-[hsl(var(--primary))]">
                      {formatCurrency(template.price)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => handleActiveToggle(template)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(template)}
                          className="h-8 w-8"
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
                              <AlertDialogTitle>Xóa mẫu chuyến TPL-{template.id}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Hệ thống sẽ ngừng tự động sinh chuyến mới từ mẫu này. Các chuyến xe đã sinh ra trước đó (kể cả đã bán vé) vẫn được giữ nguyên, không bị xóa.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Đóng</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(template.id)}>
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
            <EmptyState icon={Repeat} title="Chưa có mẫu chuyến lặp lại nào. Thêm mẫu để hệ thống tự động sinh chuyến hàng ngày." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Cập nhật mẫu chuyến TPL-${editingTemplate.id}` : 'Thêm mẫu chuyến lặp lại mới'}
            </DialogTitle>
            <DialogDescription>
              Hệ thống sẽ tự động sinh chuyến xe thật theo lịch này trong 14 ngày tới, không cần tạo tay mỗi ngày.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 my-3 text-sm">

              <FormField label="Chọn Tuyến Đường" htmlFor="template-route-select" error={errors.route_id?.message}>
                <Select
                  value={watch('route_id')?.toString()}
                  onValueChange={(val) => setValue('route_id', parseInt(val), { shouldValidate: true })}
                >
                  <SelectTrigger id="template-route-select">
                    <SelectValue placeholder="Chọn tuyến xe chạy..." />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={`tpl-route-${r.id}`} value={r.id.toString()}>
                        {r.origin} → {r.destination} ({formatCurrency(r.base_price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Chọn Phương Tiện Xe" htmlFor="template-vehicle-select" error={errors.vehicle_id?.message}>
                <Select
                  value={watch('vehicle_id')?.toString()}
                  onValueChange={(val) => setValue('vehicle_id', parseInt(val), { shouldValidate: true })}
                >
                  <SelectTrigger id="template-vehicle-select">
                    <SelectValue placeholder="Chọn xe chở khách..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={`tpl-vehicle-${v.id}`} value={v.id.toString()}>
                        {v.license_plate} ({v.total_seats} ghế)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Tài xế mặc định" htmlFor="template-driver-select">
                <Select
                  value={watchedDriverId ? watchedDriverId.toString() : 'none'}
                  onValueChange={(val) => {
                    const next = val === 'none' ? null : parseInt(val)
                    setValue('driver_id', next, { shouldValidate: true })
                    if (!next || next === watchedCoDriverId) setValue('co_driver_id', null)
                  }}
                >
                  <SelectTrigger id="template-driver-select">
                    <SelectValue placeholder="Chọn tài xế..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa phân công</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={`tpl-driver-${d.id}`} value={d.id.toString()}>
                        {d.full_name}{d.phone ? ` - ${d.phone}` : ''}{d.is_vehicle_regular ? ' ★ tài xế của xe' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Các chuyến sinh ra từ mẫu kế thừa tài xế này. Nếu tài xế nghỉ/trùng lịch vào ngày đó, chuyến vẫn
                  được tạo nhưng để trống tài xế.
                </p>
              </FormField>

              <FormField label="Tài xế phụ mặc định (không bắt buộc)" htmlFor="template-co-driver-select">
                <Select
                  value={watchedCoDriverId ? watchedCoDriverId.toString() : 'none'}
                  onValueChange={(val) => setValue('co_driver_id', val === 'none' ? null : parseInt(val), { shouldValidate: true })}
                  disabled={!watchedDriverId}
                >
                  <SelectTrigger id="template-co-driver-select">
                    <SelectValue placeholder="Chọn tài xế phụ..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{watchedDriverId ? 'Không có tài xế phụ' : 'Chọn tài xế chính trước'}</SelectItem>
                    {drivers.filter((d) => d.id !== watchedDriverId).map((d) => (
                      <SelectItem key={`tpl-co-driver-${d.id}`} value={d.id.toString()}>
                        {d.full_name}{d.phone ? ` - ${d.phone}` : ''}{d.is_vehicle_regular ? ' ★ tài xế của xe' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Giờ khởi hành" htmlFor="departure_time_of_day" error={errors.departure_time_of_day?.message}>
                  <Input
                    id="departure_time_of_day"
                    type="time"
                    {...register('departure_time_of_day')}
                    className={errors.departure_time_of_day ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>

                <FormField label="Thời gian chạy (phút)" htmlFor="duration_minutes" error={errors.duration_minutes?.message}>
                  <Input
                    id="duration_minutes"
                    type="number"
                    placeholder="150"
                    {...register('duration_minutes')}
                  />
                </FormField>
              </div>

              <FormField label="Các ngày trong tuần lặp lại" htmlFor="days_of_week" error={errors.days_of_week?.message}>
                <div className="flex flex-wrap gap-2" id="days_of_week">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      size="sm"
                      variant={watchedDays.includes(day.value) ? 'default' : 'outline'}
                      onClick={() => toggleWeekday(day.value)}
                      className="w-12"
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Giá vé (VND)" htmlFor="template-price" error={errors.price?.message}>
                  <Input
                    id="template-price"
                    type="number"
                    {...register('price')}
                    className={errors.price ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>

                <FormField label="Ghế mở bán" htmlFor="template-available-seats" error={errors.available_seats?.message}>
                  <Input
                    id="template-available-seats"
                    type="number"
                    {...register('available_seats')}
                    className={errors.available_seats ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>
              </div>

            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Hủy</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Lưu mẫu chuyến'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </motion.div>
  )
}
