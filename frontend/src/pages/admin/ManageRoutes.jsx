import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { routeApi } from '@/api/routeApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
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
import { Search, Plus, Edit2, Trash2, Route as RouteIcon, Loader2, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const routeSchema = zod.object({
  origin: zod.string().min(2, 'Điểm đi phải có ít nhất 2 ký tự'),
  destination: zod.string().min(2, 'Điểm đến phải có ít nhất 2 ký tự'),
  distance_km: zod.coerce.number().min(1, 'Cự ly phải lớn hơn 0'),
  duration_min: zod.coerce.number().min(1, 'Thời gian chạy phải lớn hơn 0'),
  base_price: zod.coerce.number().min(1000, 'Giá gốc tối thiểu là 1,000đ'),
})

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: { origin: '', destination: '', distance_km: 0, duration_min: 0, base_price: 0 },
  })

  // Gõ tới đâu tìm tới đó nhưng chỉ gọi API sau khi ngừng gõ 400ms, tránh
  // bắn 1 request mỗi phím bấm (tìm kiếm giờ chạy ở backend, không còn lọc
  // trên toàn bộ dữ liệu đã tải như trước).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Đổi từ khóa tìm kiếm thì quay về trang 1
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const res = await routeApi.getAll({ page, limit: 10, search: debouncedSearch || undefined })
      setRoutes(res.data)
      setPagination(res.pagination)
    } catch (error) {
      toast.error('Không thể tải danh sách tuyến đường')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [page, debouncedSearch])

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
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">

      <PageHeader
        title="Quản Lý Tuyến Đường Vận Chuyển"
        description="Xem, thêm mới, điều chỉnh thông tin các tuyến đường xe chạy."
        action={
          <Button onClick={handleOpenAdd} className="font-semibold h-10 shrink-0">
            <Plus className="h-4.5 w-4.5 mr-1.5" /> Thêm Tuyến Đường
          </Button>
        }
      />

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
            <TableSkeleton rows={5} columns={8} />
          ) : routes.length > 0 ? (
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
                {routes.map((route) => (
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
                              <AlertDialogTitle>Xóa tuyến đường R-{route.id}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tuyến {route.origin} → {route.destination} sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Đóng</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(route.id)}>
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
            <EmptyState icon={RouteIcon} title="Không tìm thấy tuyến đường nào phù hợp." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
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

              <FormField label="Điểm đi / Nơi xuất phát" htmlFor="origin" error={errors.origin?.message}>
                <Input
                  id="origin"
                  placeholder="Hà Nội"
                  {...register('origin')}
                  className={errors.origin ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>

              <FormField label="Điểm đến / Nơi cập bến" htmlFor="destination" error={errors.destination?.message}>
                <Input
                  id="destination"
                  placeholder="Hải Phòng"
                  {...register('destination')}
                  className={errors.destination ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Cự ly (km)" htmlFor="distance_km" error={errors.distance_km?.message}>
                  <Input
                    id="distance_km"
                    type="number"
                    placeholder="120"
                    {...register('distance_km')}
                    className={errors.distance_km ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>

                <FormField label="Thời gian chạy (phút)" htmlFor="duration_min" error={errors.duration_min?.message}>
                  <Input
                    id="duration_min"
                    type="number"
                    placeholder="150"
                    {...register('duration_min')}
                    className={errors.duration_min ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>
              </div>

              <FormField label="Giá vé gốc (VND)" htmlFor="base_price" error={errors.base_price?.message}>
                <Input
                  id="base_price"
                  type="number"
                  placeholder="120000"
                  {...register('base_price')}
                  className={errors.base_price ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>

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

    </motion.div>
  )
}
