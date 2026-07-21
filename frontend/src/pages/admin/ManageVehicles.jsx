import React, { useEffect, useState } from 'react'
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
import { Plus, Edit2, Trash2, Bus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import SeatMap from '@/components/features/SeatMap'

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
      const data = await vehicleApi.getAll()
      setVehicles(data)
    } catch (error) {
      toast.error('Không thể tải danh sách phương tiện xe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

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
    if (!window.confirm('Bạn có chắc chắn muốn xóa phương tiện này?')) return

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
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Quản Lý Phương Tiện Vận Chuyển</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Đăng ký và điều khiển danh sách xe khách hoạt động trên hệ thống.</p>
        </div>
        <Button onClick={handleOpenAdd} className="font-semibold h-10 shrink-0">
          <Plus className="h-4.5 w-4.5 mr-1.5" /> Thêm Phương Tiện
        </Button>
      </div>

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : vehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Biển số xe</TableHead>
                  <TableHead>Loại phương tiện</TableHead>
                  <TableHead>Tổng số ghế</TableHead>
                  <TableHead>Sơ đồ layout</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(v)}
                          className="h-8 w-8 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(v.id)}
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              Chưa đăng ký phương tiện xe nào trên hệ thống.
            </div>
          )}
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
              
              {/* License Plate */}
              <div className="space-y-1.5">
                <Label htmlFor="license_plate">Biển số xe</Label>
                <Input
                  id="license_plate"
                  placeholder="29B-12345"
                  {...register('license_plate')}
                  className={errors.license_plate ? 'border-red-500' : ''}
                />
                {errors.license_plate && <p className="text-xs text-red-500">{errors.license_plate.message}</p>}
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <Label htmlFor="vehicle_type">Loại phương tiện</Label>
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
              </div>

              {/* Total Seats */}
              <div className="space-y-1.5">
                <Label htmlFor="total_seats">Tổng số ghế bán</Label>
                <Input
                  id="total_seats"
                  type="number"
                  {...register('total_seats')}
                  className={errors.total_seats ? 'border-red-500' : ''}
                />
                {errors.total_seats && <p className="text-xs text-red-500">{errors.total_seats.message}</p>}
              </div>

              {/* Seat Layout (JSON Text) */}
              <div className="space-y-1.5">
                <Label htmlFor="seat_layout_str">Cấu trúc sơ đồ ghế (JSON Format)</Label>
                <Input
                  id="seat_layout_str"
                  placeholder='{"floors":2,"rows":6,"cols":3}'
                  {...register('seat_layout_str')}
                  className={errors.seat_layout_str ? 'border-red-500 font-mono text-xs' : 'font-mono text-xs'}
                />
                {errors.seat_layout_str && <p className="text-xs text-red-500">{errors.seat_layout_str.message}</p>}
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  * Nhập cấu hình: floors (số tầng), rows (số hàng ghế), cols (số cột ghế).
                </p>
              </div>

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

    </div>
  )
}
