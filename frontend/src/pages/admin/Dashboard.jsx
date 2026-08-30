import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { statsApi } from '@/api/statsApi'
import { tripApi } from '@/api/tripApi'
import { userApi } from '@/api/userApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import StatCard from '@/components/features/StatCard'
import StatsChart from '@/components/features/StatsChart'
import { Bus, Users, Ticket, Activity, Calendar, TrendingUp, Loader2 } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp, staggerContainer } from '@/lib/motionVariants'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [upcomingTrips, setUpcomingTrips] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [revenueOverTime, setRevenueOverTime] = useState([])
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

        // Fetch revenue for the last 7 days
        const endDate = new Date().toISOString().split('T')[0]
        const startDateObj = new Date()
        startDateObj.setDate(startDateObj.getDate() - 7)
        const startDate = startDateObj.toISOString().split('T')[0]
        const chartData = await statsApi.getRevenue({ startDate, endDate })
        setRevenueOverTime(chartData.revenue_over_time || [])
      } catch (error) {
        toast.error('Không thể tải dữ liệu tổng quan. Vui lòng thử tải lại trang.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Quản Trị Tổng Quan</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Chào mừng trở lại trang quản trị của Đặt Vé Xe Khách.</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
        </div>
      ) : (
        <>
          {/* KPI Widget Cards */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.08)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={Activity}
                label="Doanh thu hôm nay"
                value={stats.todayRevenue}
                formatValue={formatCurrency}
                caption="Hóa đơn thanh toán trong ngày"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={Ticket}
                label="Vé bán hôm nay"
                value={stats.todayTickets}
                formatValue={(v) => `${v.toLocaleString('vi-VN')} vé`}
                caption="Số lượng vé xe đã được thanh toán"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={Bus}
                label="Chuyến xe hoạt động"
                value={stats.ongoingTrips}
                formatValue={(v) => `${v.toLocaleString('vi-VN')} chuyến`}
                caption="Chuyến xe đang chạy (ongoing)"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={Users}
                label="Tổng người dùng"
                value={userCount}
                formatValue={(v) => `${v.toLocaleString('vi-VN')} thành viên`}
                caption="Khách hàng, nhân viên và admin"
              />
            </motion.div>
          </motion.div>

          {/* Revenue Chart + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-[hsl(var(--primary))]" /> Biểu đồ doanh thu
                </CardTitle>
                <CardDescription>Doanh thu 7 ngày gần nhất từ các hóa đơn đã thanh toán.</CardDescription>
              </CardHeader>
              <CardContent>
                <StatsChart data={revenueOverTime} type="line" dataKey="revenue" name="Doanh thu" />
              </CardContent>
            </Card>

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

          {/* Upcoming Trips */}
          <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
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
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                            {trip.Route?.origin} → {trip.Route?.destination}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{formatDateTime(trip.departure_time)}</TableCell>
                        <TableCell className="text-xs font-mono">{trip.Vehicle?.license_plate}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${trip.available_seats === 0 ? 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'}`}
                          >
                            {trip.available_seats === 0 ? 'Đã đầy' : `Còn ${trip.available_seats} ghế`}
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
        </>
      )}
    </motion.div>
  )
}
