import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { vehicleApi } from '@/api/vehicleApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import VehicleDriverCell from '@/components/features/VehicleDriverCell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { Pagination } from '@/components/ui/pagination'
import ActiveStatus from '@/components/features/ActiveStatus'
import { Search, Bus, RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

export default function ViewVehicles() {
  const [vehicles, setVehicles] = useState([])
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

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const res = await vehicleApi.getAll({ page, limit: 10, search: debouncedSearch || undefined })
      setVehicles(res.data)
      setPagination(res.pagination)
    } catch (error) {
      toast.error('Không thể tải danh sách xe khách')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [page, debouncedSearch])

  const vehicleTypeLabels = {
    sleeper: 'Xe giường nằm (Sleeper)',
    limousine: 'Xe Limousine VIP',
    standard: 'Ghế ngồi tiêu chuẩn (Standard)',
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Bus className="h-5 w-5 text-[hsl(var(--primary))]" />
              Tra Cứu Phương Tiện Xe Khách
            </CardTitle>
            <CardDescription>
              Xem danh sách tất cả các xe trong hệ thống, kiểm tra loại xe, số chỗ ngồi và sơ đồ sàn.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchVehicles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Tìm theo biển số xe hoặc loại xe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : vehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Biển kiểm soát</TableHead>
                  <TableHead>Loại phương tiện</TableHead>
                  <TableHead>Tổng số ghế</TableHead>
                  <TableHead>Sơ đồ layout</TableHead>
                  <TableHead>Tài xế</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-bold text-sm tracking-wide">
                      <div className="flex items-center gap-2">
                        <span className="bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] px-2 py-1 rounded font-mono text-xs">
                          {vehicle.license_plate}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}</TableCell>
                    <TableCell className="text-xs font-bold text-[hsl(var(--primary))]">{vehicle.total_seats} ghế</TableCell>
                    <TableCell className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {vehicle.seat_layout ? (
                        <div className="flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Số tầng: {vehicle.seat_layout.floors || 1} | Hàng: {vehicle.seat_layout.rows || 0} | Cột: {vehicle.seat_layout.cols || 0}
                          </span>
                        </div>
                      ) : (
                        'Chưa định dạng'
                      )}
                    </TableCell>
                    <TableCell>
                      <VehicleDriverCell vehicle={vehicle} />
                    </TableCell>
                    <TableCell>
                      <ActiveStatus isActive={vehicle.is_active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Bus} title="Không tìm thấy phương tiện nào phù hợp." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </CardContent>
      </Card>
    </motion.div>
  )
}
