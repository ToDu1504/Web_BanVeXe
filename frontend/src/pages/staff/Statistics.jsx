import React, { useEffect, useState } from 'react'
import { statsApi } from '@/api/statsApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import StatsChart from '@/components/features/StatsChart'
import { BarChart3, TrendingUp, Ticket, ShieldAlert, Calendar, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function Statistics() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7') // last 7 days
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTickets: 0,
    cancellationRate: 0,
    revenueOverTime: [],
    popularRoutes: [],
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        
        // Fetch stats overview
        const overview = await statsApi.getStats()
        
        // Construct query range dates
        const endDate = new Date().toISOString().split('T')[0]
        const startDateObj = new Date()
        startDateObj.setDate(startDateObj.getDate() - parseInt(timeRange))
        const startDate = startDateObj.toISOString().split('T')[0]

        // Fetch dynamic revenue chart data
        const chartData = await statsApi.getRevenue({ startDate, endDate })

        setStats({
          totalRevenue: overview.total_revenue || 0,
          totalTickets: overview.total_tickets || 0,
          cancellationRate: overview.cancellation_rate || 0,
          revenueOverTime: chartData.revenue_over_time || [],
          popularRoutes: overview.popular_routes || [],
        })
      } catch (error) {
        toast.error('Không thể tải dữ liệu thống kê. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [timeRange])

  return (
    <div className="space-y-6">
      
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Báo Cáo Thống Kê</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Xem tình hình doanh thu, số lượng đặt vé và tuyến xe phổ biến.</p>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Khoảng thời gian:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày qua</SelectItem>
              <SelectItem value="15">15 ngày qua</SelectItem>
              <SelectItem value="30">30 ngày qua</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tính toán thống kê...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Widget Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Revenue card */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Doanh thu lũy kế</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-[hsl(var(--foreground))]">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Tổng tiền từ các hóa đơn đã thanh toán</p>
              </CardContent>
            </Card>

            {/* Tickets sold card */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Số vé đã bán</CardTitle>
                <Ticket className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-[hsl(var(--foreground))]">
                  {stats.totalTickets} vé
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Tổng vé hoạt động trên hệ thống</p>
              </CardContent>
            </Card>

            {/* Cancellation card */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Tỷ lệ hủy vé</CardTitle>
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-[hsl(var(--foreground))]">
                  {stats.cancellationRate}%
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Phần trăm vé bị hủy so với tổng đặt vé</p>
              </CardContent>
            </Card>

          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Revenue Over Time Chart */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" /> Biểu đồ doanh thu hàng ngày
                </CardTitle>
                <CardDescription>Chi tiết doanh thu thu về theo từng ngày gần đây.</CardDescription>
              </CardHeader>
              <CardContent>
                <StatsChart data={stats.revenueOverTime} type="line" dataKey="revenue" name="Doanh thu" />
              </CardContent>
            </Card>

            {/* Popular Routes Revenue Chart */}
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" /> Tuyến xe được ưa chuộng
                </CardTitle>
                <CardDescription>Top các tuyến xe mang lại doanh thu tốt nhất.</CardDescription>
              </CardHeader>
              <CardContent>
                <StatsChart data={stats.popularRoutes} type="bar" dataKey="revenue" name="Doanh thu tuyến" />
              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  )
}
