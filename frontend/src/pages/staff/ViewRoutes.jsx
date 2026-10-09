import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { routeApi } from '@/api/routeApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { Pagination } from '@/components/ui/pagination'
import ActiveStatus from '@/components/features/ActiveStatus'
import { Search, MapPin, Navigation, RefreshCw, Route } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

export default function ViewRoutes() {
  const [routes, setRoutes] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

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

  // Helper formatting travel duration
  const formatDuration = (mins) => {
    if (!mins) return 'Chưa xác định'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Route className="h-5 w-5 text-[hsl(var(--primary))]" />
              Tra Cứu Tuyến Đường Vận Chuyển
            </CardTitle>
            <CardDescription>
              Xem danh sách tất cả các tuyến chạy đang hoạt động, tra cứu cự ly hành trình và giá vé gốc.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchRoutes} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Tìm theo tỉnh/thành đi hoặc đến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : routes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tuyến chạy</TableHead>
                  <TableHead>Khoảng cách (km)</TableHead>
                  <TableHead>Thời gian dự kiến</TableHead>
                  <TableHead>Giá vé cơ bản</TableHead>
                  <TableHead>Bến / trung chuyển</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-semibold flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                      {route.origin}
                      <Navigation className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] rotate-90" />
                      {route.destination}
                    </TableCell>
                    <TableCell className="text-xs">{route.distance_km ? `${route.distance_km} km` : 'N/A'}</TableCell>
                    <TableCell className="text-xs">{formatDuration(route.duration_min)}</TableCell>
                    <TableCell className="font-bold text-[hsl(var(--primary))] text-xs">
                      {formatCurrency(route.base_price)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p>{route.origin_station || '—'}</p>
                      {route.shuttle_enabled && (
                        <p className="text-[hsl(var(--primary))]">
                          🚐 Có trung chuyển{route.shuttle_area_note ? `: ${route.shuttle_area_note}` : ''}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActiveStatus isActive={route.is_active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Route} title="Không tìm thấy tuyến đường nào phù hợp." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </CardContent>
      </Card>
    </motion.div>
  )
}
