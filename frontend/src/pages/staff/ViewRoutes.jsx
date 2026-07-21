import React, { useEffect, useState } from 'react'
import { routeApi } from '@/api/routeApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MapPin, Navigation, RefreshCw, Loader2, Route } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function ViewRoutes() {
  const [routes, setRoutes] = useState([])
  const [filteredRoutes, setFilteredRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRoutes(routes)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredRoutes(
        routes.filter(
          (r) =>
            r.origin?.toLowerCase().includes(q) ||
            r.destination?.toLowerCase().includes(q)
        )
      )
    }
  }, [searchQuery, routes])

  // Helper formatting travel duration
  const formatDuration = (mins) => {
    if (!mins) return 'Chưa xác định'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-[hsl(var(--primary))]">
              <Route className="h-5 w-5" />
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
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải danh sách tuyến đường...</p>
              </div>
            </div>
          ) : filteredRoutes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tuyến chạy</TableHead>
                  <TableHead>Khoảng cách (km)</TableHead>
                  <TableHead>Thời gian dự kiến</TableHead>
                  <TableHead>Giá vé cơ bản</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-semibold flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                      {route.origin}
                      <Navigation className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] rotate-90" />
                      {route.destination}
                    </TableCell>
                    <TableCell className="text-xs">{route.distance_km ? `${route.distance_km} km` : 'N/A'}</TableCell>
                    <TableCell className="text-xs">{formatDuration(route.duration_min)}</TableCell>
                    <TableCell className="font-bold text-[hsl(var(--primary))] text-xs">
                      {formatCurrency(route.base_price)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        route.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {route.is_active ? 'ĐANG CHẠY' : 'NGỪNG HOẠT ĐỘNG'}
                      </span>
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
    </div>
  )
}
