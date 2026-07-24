import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { statsApi } from '@/api/statsApi'
import { tripApi } from '@/api/tripApi'
import { userApi } from '@/api/userApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bus, Users, Ticket, ArrowRight, Activity, Calendar, Loader2 } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [upcomingTrips, setUpcomingTrips] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayTickets: 0,
    ongoingTrips: 0,
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // Fetch users
        const users = await userApi.getAll()
        setUserCount(users.length)

        // Fetch upcoming trips (all trips)
        const trips = await tripApi.getAll()
        const upcoming = trips
          .filter(t => new Date(t.departure_time) > new Date())
          .slice(0, 5) // Show top 5 upcoming
        setUpcomingTrips(upcoming)

        // Fetch stats
        const overview = await statsApi.getStats()
        setStats({
          todayRevenue: overview.today_revenue,
          todayTickets: overview.today_tickets,
          ongoingTrips: overview.ongoing_trips,
        })
      } catch (error) {
        toast.error('Không thể tải dữ liệu tổng quan. Vui lòng thử tải lại trang.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const vehicleTypeLabels = {
    sleeper: 'Giường nằm',
    limousine: 'Limousine',
    standard: 'Ghế ngồi tiêu chuẩn',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Quản Trị Tổng Quan</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Chào mừng trở lại trang quản trị của Đặt Vé Xe Khách.</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : (
        <>
          {/* KPI Widget Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Today Revenue */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Doanh thu hôm nay</CardTitle>
                <Activity className="h-4.5 w-4.5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-[hsl(var(--foreground))]">
                  {formatCurrency(stats.todayRevenue)}
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Hóa đơn thanh toán trong ngày</p>
              </CardContent>
            </Card>

            {/* Today Tickets */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Vé bán hôm nay</CardTitle>
                <Ticket className="h-4.5 w-4.5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-[hsl(var(--foreground))]">
                  {stats.todayTickets} vé
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Số lượng vé xe đã được thanh toán</p>
              </CardContent>
            </Card>

            {/* Active Trips */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Chuyến xe hoạt động</CardTitle>
                <Bus className="h-4.5 w-4.5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-[hsl(var(--foreground))]">
                  {stats.ongoingTrips} chuyến
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Chuyến xe đang chạy (ongoing)</p>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Tổng người dùng</CardTitle>
                <Users className="h-4.5 w-4.5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-[hsl(var(--foreground))]">
                  {userCount} thành viên
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Khách hàng, nhân viên và admin</p>
              </CardContent>
            </Card>

          </div>

          {/* Quick Info Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Upcoming Trips List */}
            <Card className="lg:col-span-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-md flex items-center gap-1.5">
                    <Calendar className="h-4.5 w-4.5 text-[hsl(var(--primary))]" /> Lịch trình sắp khởi hành
                  </CardTitle>
                  <CardDescription>Danh sách chuyến xe tiếp theo khởi hành.</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/trips">Tất cả chuyến</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {upcomingTrips.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tuyến xe</TableHead>
                        <TableHead>Khởi hành</TableHead>
                        <TableHead>Biển số xe</TableHead>
                        <TableHead>Ghế trống</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingTrips.map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell className="font-semibold text-xs">
                            {trip.Route?.origin} → {trip.Route?.destination}
                          </TableCell>
                          <TableCell className="text-xs">{formatDateTime(trip.departure_time)}</TableCell>
                          <TableCell className="text-xs font-mono">{trip.Vehicle?.license_plate}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              Còn {trip.available_seats} ghế
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-xs text-[hsl(var(--muted-foreground))]">
                    Không có chuyến xe nào sắp khởi hành.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Shortcuts */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader>
                <CardTitle className="text-md">Lối tắt thao tác nhanh</CardTitle>
                <CardDescription>Thêm mới dữ liệu vào hệ thống nhanh chóng.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button className="w-full justify-start font-medium text-xs h-10" asChild>
                  <Link to="/admin/trips">Điều phối chuyến xe mới</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start font-medium text-xs h-10" asChild>
                  <Link to="/admin/routes">Tạo tuyến đường vận chuyển</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start font-medium text-xs h-10" asChild>
                  <Link to="/admin/vehicles">Thêm xe khách mới</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start font-medium text-xs h-10" asChild>
                  <Link to="/admin/users">Xem phân quyền người dùng</Link>
                </Button>
              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  )
}
