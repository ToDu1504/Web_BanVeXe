import React, { useEffect, useState } from 'react'
import { vehicleApi } from '@/api/vehicleApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Bus, RefreshCw, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function ViewVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [filteredVehicles, setFilteredVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const data = await vehicleApi.getAll()
      setVehicles(data)
      setFilteredVehicles(data)
    } catch (error) {
      toast.error('Không thể tải danh sách xe khách')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVehicles(vehicles)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredVehicles(
        vehicles.filter(
          (v) =>
            v.license_plate?.toLowerCase().includes(q) ||
            v.vehicle_type?.toLowerCase().includes(q)
        )
      )
    }
  }, [searchQuery, vehicles])

  const vehicleTypeLabels = {
    sleeper: 'Xe giường nằm (Sleeper)',
    limousine: 'Xe Limousine VIP',
    standard: 'Ghế ngồi tiêu chuẩn (Standard)',
  }

  return (
    <div className="space-y-6">
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-[hsl(var(--primary))]">
              <Bus className="h-5 w-5" />
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
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải danh sách xe...</p>
              </div>
            </div>
          ) : filteredVehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Biển kiểm soát</TableHead>
                  <TableHead>Loại phương tiện</TableHead>
                  <TableHead>Tổng số ghế</TableHead>
                  <TableHead>Sơ đồ layout</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-bold text-sm tracking-wide">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded text-xs">
                          {vehicle.license_plate}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}</TableCell>
                    <TableCell className="text-xs font-bold text-blue-600 dark:text-blue-400">{vehicle.total_seats} ghế</TableCell>
                    <TableCell className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {vehicle.seat_layout ? (
                        <div className="flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span>
                            Số tầng: {vehicle.seat_layout.floors || 1} | Hàng: {vehicle.seat_layout.rows || 0} | Cột: {vehicle.seat_layout.cols || 0}
                          </span>
                        </div>
                      ) : (
                        'Chưa định dạng'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        vehicle.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {vehicle.is_active ? 'HOẠT ĐỘNG' : 'BẢO TRÌ/KHÓA'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              Không tìm thấy phương tiện nào phù hợp.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
