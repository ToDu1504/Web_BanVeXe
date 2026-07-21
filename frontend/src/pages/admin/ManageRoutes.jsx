import React, { useEffect, useState } from 'react'
import { routeApi } from '@/api/routeApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { Search, Plus, Edit2, Trash2, Route as RouteIcon, Loader2, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { toast } from 'sonner'

const routeSchema = zod.object({
  origin: zod.string().min(2, 'Điểm đi phải có ít nhất 2 ký tự'),
  destination: zod.string().min(2, 'Điểm đến phải có ít nhất 2 ký tự'),
  distance_km: zod.coerce.number().min(1, 'Cự ly phải lớn hơn 0'),
  duration_min: zod.coerce.number().min(1, 'Thời gian chạy phải lớn hơn 0'),
  base_price: zod.coerce.number().min(1000, 'Giá gốc tối thiểu là 1,000đ'),
})

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([])
  const [filteredRoutes, setFilteredRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: { origin: '', destination: '', distance_km: 0, duration_min: 0, base_price: 0 },
  })

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const data = await routeApi.getAll()
      setRoutes(data)
      setFilteredRoutes(data)
    } catch (error) {
      toast.error('Không thể tải danh sách tuyến đường')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  // Filter routes on search
  useEffect(() => {
    const q = searchQuery.toLowerCase()
    const result = routes.filter(
      (r) =>
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q)
    )
    setFilteredRoutes(result)
  }, [searchQuery, routes])

  const handleOpenAdd = () => {
    setEditingRoute(null)
    reset({ origin: '', destination: '', distance_km: 0, duration_min: 0, base_price: 0 })
    setDialogOpen(true)
  }

  const handleOpenEdit = (route) => {
    setEditingRoute(route)
    reset({
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km,
      duration_min: route.duration_min,
      base_price: route.base_price,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tuyến đường này?')) return

    try {
      await routeApi.delete(id)
      toast.success('Xóa tuyến đường thành công!')
      fetchRoutes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa tuyến đường')
    }
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editingRoute) {
        await routeApi.update(editingRoute.id, data)
        toast.success('Cập nhật tuyến đường thành công!')
      } else {
        await routeApi.create(data)
        toast.success('Tạo tuyến đường mới thành công!')
      }
      fetchRoutes()
      setDialogOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Quản Lý Tuyến Đường Vận Chuyển</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Xem, thêm mới, điều chỉnh thông tin các tuyến đường xe chạy.</p>
        </div>
        <Button onClick={handleOpenAdd} className="font-semibold h-10 shrink-0">
          <Plus className="h-4.5 w-4.5 mr-1.5" /> Thêm Tuyến Đường
        </Button>
      </div>

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardHeader className="pb-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Tìm điểm xuất phát, nơi đến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredRoutes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Điểm đi</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Điểm đến</TableHead>
                  <TableHead>Cự ly (km)</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Giá gốc</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-bold text-xs">R-{route.id}</TableCell>
                    <TableCell className="font-semibold text-xs">{route.origin}</TableCell>
                    <TableCell><ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /></TableCell>
                    <TableCell className="font-semibold text-xs">{route.destination}</TableCell>
                    <TableCell className="text-xs">{route.distance_km} km</TableCell>
                    <TableCell className="text-xs">{formatDuration(route.duration_min)}</TableCell>
                    <TableCell className="font-semibold text-xs text-[hsl(var(--primary))]">
                      {formatCurrency(route.base_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(route)}
                          className="h-8 w-8 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(route.id)}
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
              Không tìm thấy tuyến đường nào phù hợp.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? `Chỉnh sửa tuyến đường R-${editingRoute.id}` : 'Thêm tuyến đường mới'}
            </DialogTitle>
            <DialogDescription>
              Vui lòng điền đầy đủ các thông tin vận chuyển bên dưới.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 my-4">
              
              {/* Origin */}
              <div className="space-y-1.5">
                <Label htmlFor="origin">Điểm đi / Nơi xuất phát</Label>
                <Input
                  id="origin"
                  placeholder="Hà Nội"
                  {...register('origin')}
                  className={errors.origin ? 'border-red-500' : ''}
                />
                {errors.origin && <p className="text-xs text-red-500">{errors.origin.message}</p>}
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <Label htmlFor="destination">Điểm đến / Nơi cập bến</Label>
                <Input
                  id="destination"
                  placeholder="Hải Phòng"
                  {...register('destination')}
                  className={errors.destination ? 'border-red-500' : ''}
                />
                {errors.destination && <p className="text-xs text-red-500">{errors.destination.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Distance */}
                <div className="space-y-1.5">
                  <Label htmlFor="distance_km">Cự ly (km)</Label>
                  <Input
                    id="distance_km"
                    type="number"
                    placeholder="120"
                    {...register('distance_km')}
                    className={errors.distance_km ? 'border-red-500' : ''}
                  />
                  {errors.distance_km && <p className="text-xs text-red-500">{errors.distance_km.message}</p>}
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <Label htmlFor="duration_min">Thời gian chạy (phút)</Label>
                  <Input
                    id="duration_min"
                    type="number"
                    placeholder="150"
                    {...register('duration_min')}
                    className={errors.duration_min ? 'border-red-500' : ''}
                  />
                  {errors.duration_min && <p className="text-xs text-red-500">{errors.duration_min.message}</p>}
                </div>
              </div>

              {/* Base price */}
              <div className="space-y-1.5">
                <Label htmlFor="base_price">Giá vé gốc (VND)</Label>
                <Input
                  id="base_price"
                  type="number"
                  placeholder="120000"
                  {...register('base_price')}
                  className={errors.base_price ? 'border-red-500' : ''}
                />
                {errors.base_price && <p className="text-xs text-red-500">{errors.base_price.message}</p>}
              </div>

            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Hủy</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Lưu tuyến đường'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
