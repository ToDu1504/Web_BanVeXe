import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { vehicleApi } from '@/api/vehicleApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import VehicleDriverCell from '@/components/features/VehicleDriverCell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Label } from '@/components/ui/label'
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { Plus, Edit2, Trash2, Bus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import SeatMap from '@/components/features/SeatMap'
import { fadeInUp } from '@/lib/motionVariants'

const vehicleSchema = zod.object({
  license_plate: zod.string().regex(/^[0-9]{2}[A-Z]-[0-9]{4,5}$/, 'Biển số xe phải đúng định dạng (Ví dụ: 29B-12345 hoặc 51A-9999)'),
  vehicle_type: zod.enum(['sleeper', 'limousine', 'standard']),
  total_seats: zod.coerce.number().min(4, 'Số ghế tối thiểu là 4').max(60, 'Số ghế tối đa là 60'),
  seat_layout_str: zod.string().refine((val) => {
    try {
      if (!val.trim()) return true
      const parsed = JSON.parse(val)
      return typeof parsed === 'object' && parsed !== null
    } catch {
      return false
    }
  }, 'Sơ đồ ghế phải là một JSON hợp lệ'),
})

export default function ManageVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      license_plate: '',
      vehicle_type: 'sleeper',
      total_seats: 40,
      seat_layout_str: '{"floors":2,"rows":6,"cols":3}',
    },
  })

  // Watch fields to auto update total seats depending on layout rows & cols
  const watchedLayoutStr = watch('seat_layout_str')
  const watchedType = watch('vehicle_type')
  const watchedTotalSeats = watch('total_seats')

  // Parse the JSON layout string live for the seat map preview below the field
  let previewLayout = null
  try {
    const parsed = JSON.parse(watchedLayoutStr)
    if (parsed && typeof parsed === 'object' && parsed.floors && parsed.rows && parsed.cols) {
      previewLayout = parsed
    }
  } catch {
    // invalid JSON while typing — no preview until it's valid
  }

  // Auto set layout defaults when vehicle type changes and not editing
  useEffect(() => {
    if (!editingVehicle) {
      if (watchedType === 'limousine') {
        setValue('seat_layout_str', '{"floors":1,"rows":3,"cols":3}')
        setValue('total_seats', 9)
      } else if (watchedType === 'sleeper') {
        setValue('seat_layout_str', '{"floors":2,"rows":6,"cols":3}')
        setValue('total_seats', 36)
      } else {
        setValue('seat_layout_str', '{"floors":1,"rows":10,"cols":4}')
        setValue('total_seats', 40)
      }
    }
  }, [watchedType, editingVehicle, setValue])

  // Automatically calculate total seats if layout string updates
  useEffect(() => {
    try {
      const parsed = JSON.parse(watchedLayoutStr)
      if (parsed.floors && parsed.rows && parsed.cols) {
        const calculated = parsed.floors * parsed.rows * parsed.cols
        if (calculated >= 4 && calculated <= 60 && !editingVehicle) {
          setValue('total_seats', calculated)
        }
      }
    } catch {
      // ignore parsing errors
    }
  }, [watchedLayoutStr, editingVehicle, setValue])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const res = await vehicleApi.getAll({ page, limit: 10 })
      setVehicles(res.data)
      setPagination(res.pagination)
    } catch (error) {
      toast.error('Không thể tải danh sách phương tiện xe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [page])

  const handleOpenAdd = () => {
    setEditingVehicle(null)
    reset({
      license_plate: '',
      vehicle_type: 'sleeper',
      total_seats: 36,
      seat_layout_str: '{"floors":2,"rows":6,"cols":3}',
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (vehicle) => {
    setEditingVehicle(vehicle)
    reset({
      license_plate: vehicle.license_plate,
      vehicle_type: vehicle.vehicle_type,
      total_seats: vehicle.total_seats,
      seat_layout_str: vehicle.seat_layout ? JSON.stringify(vehicle.seat_layout) : '{}',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await vehicleApi.delete(id)
      toast.success('Xóa xe thành công!')
      fetchVehicles()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa phương tiện')
    }
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const payload = {
        license_plate: data.license_plate,
        vehicle_type: data.vehicle_type,
        total_seats: data.total_seats,
        seat_layout: data.seat_layout_str ? JSON.parse(data.seat_layout_str) : null,
      }

      if (editingVehicle) {
        await vehicleApi.update(editingVehicle.id, payload)
        toast.success('Cập nhật phương tiện thành công!')
      } else {
        await vehicleApi.create(payload)
        toast.success('Thêm phương tiện mới thành công!')
      }
      fetchVehicles()
      setDialogOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu phương tiện')
    } finally {
      setSubmitting(false)
    }
  }

  const vehicleTypeLabels = {
    sleeper: 'Giường nằm',
    limousine: 'Limousine',
    standard: 'Ghế ngồi tiêu chuẩn',
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">

      <PageHeader
        title="Quản Lý Phương Tiện Vận Chuyển"
        description="Đăng ký và điều khiển danh sách xe khách hoạt động trên hệ thống."
        action={
          <Button onClick={handleOpenAdd} className="font-semibold h-10 shrink-0">
            <Plus className="h-4.5 w-4.5 mr-1.5" /> Thêm Phương Tiện
          </Button>
        }
      />

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          {loading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : vehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Biển số xe</TableHead>
                  <TableHead>Loại phương tiện</TableHead>
                  <TableHead>Tổng số ghế</TableHead>
                  <TableHead>Sơ đồ layout</TableHead>
                  <TableHead>Tài xế</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-bold text-xs">V-{v.id}</TableCell>
                    <TableCell className="font-mono font-bold text-xs">{v.license_plate}</TableCell>
                    <TableCell className="text-xs">{vehicleTypeLabels[v.vehicle_type]}</TableCell>
                    <TableCell className="text-xs">{v.total_seats} ghế</TableCell>
                    <TableCell className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                      {v.seat_layout ? JSON.stringify(v.seat_layout) : 'Mặc định'}
                    </TableCell>
                    <TableCell>
                      <VehicleDriverCell vehicle={v} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(v)}
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
                              <AlertDialogTitle>Xóa phương tiện V-{v.id}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Xe biển số {v.license_plate} sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Đóng</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(v.id)}>
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
            <EmptyState icon={Bus} title="Chưa đăng ký phương tiện xe nào trên hệ thống." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? `Chỉnh sửa xe khách V-${editingVehicle.id}` : 'Thêm phương tiện xe mới'}
            </DialogTitle>
            <DialogDescription>
              Vui lòng khai báo biển số xe, loại xe và sơ đồ ghế.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 my-3 text-sm">

              <FormField label="Biển số xe" htmlFor="license_plate" error={errors.license_plate?.message}>
                <Input
                  id="license_plate"
                  placeholder="29B-12345"
                  {...register('license_plate')}
                  className={errors.license_plate ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>

              <FormField label="Loại phương tiện" htmlFor="vehicle_type">
                <Select
                  value={watch('vehicle_type')}
                  onValueChange={(val) => setValue('vehicle_type', val)}
                >
                  <SelectTrigger id="vehicle_type">
                    <SelectValue placeholder="Chọn phân loại xe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sleeper">Xe giường nằm (Sleeper)</SelectItem>
                    <SelectItem value="limousine">Xe Limousine vip</SelectItem>
                    <SelectItem value="standard">Xe ghế ngồi thường (Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Tổng số ghế bán" htmlFor="total_seats" error={errors.total_seats?.message}>
                <Input
                  id="total_seats"
                  type="number"
                  {...register('total_seats')}
                  className={errors.total_seats ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>

              <FormField label="Cấu trúc sơ đồ ghế (JSON Format)" htmlFor="seat_layout_str" error={errors.seat_layout_str?.message}>
                <Input
                  id="seat_layout_str"
                  placeholder='{"floors":2,"rows":6,"cols":3}'
                  {...register('seat_layout_str')}
                  className={errors.seat_layout_str ? 'border-[hsl(var(--destructive))] font-mono text-xs' : 'font-mono text-xs'}
                />
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  * Nhập cấu hình: floors (số tầng), rows (số hàng ghế), cols (số cột ghế).
                </p>
              </FormField>

              {/* Live Seat Map Preview */}
              <div className="space-y-1.5">
                <Label>Xem trước sơ đồ ghế</Label>
                {previewLayout ? (
                  <div className="max-h-72 overflow-y-auto">
                    <SeatMap
                      totalSeats={watchedTotalSeats}
                      layout={previewLayout}
                      bookedSeats={[]}
                      selectedSeats={[]}
                      onSeatClick={() => {}}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] italic border border-dashed border-[hsl(var(--border))] rounded-lg p-4 text-center">
                    JSON chưa hợp lệ hoặc thiếu floors/rows/cols — chưa thể xem trước sơ đồ.
                  </p>
                )}
              </div>

            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Hủy</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Lưu thông tin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </motion.div>
  )
}
