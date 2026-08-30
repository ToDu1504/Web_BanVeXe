import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { statsApi } from '@/api/statsApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import StatsChart from '@/components/features/StatsChart'
import StatCard from '@/components/features/StatCard'
import { BarChart3, TrendingUp, Ticket, ShieldAlert, Calendar, Loader2, Download } from 'lucide-react'
import { formatCurrency, formatDateTime, formatDate, exportToCsv } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp, staggerContainer } from '@/lib/motionVariants'

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

  const handleExportCsv = () => {
    const endDateObj = new Date()
    const startDateObj = new Date()
    startDateObj.setDate(startDateObj.getDate() - parseInt(timeRange))

    const rows = [
      ['BÁO CÁO THỐNG KÊ - ĐẶT VÉ XE KHÁCH'],
      ['Khoảng thời gian', `${formatDate(startDateObj)} - ${formatDate(endDateObj)}`],
      ['Ngày xuất báo cáo', formatDateTime(new Date())],
      [],
      ['TỔNG QUAN'],
      ['Chỉ số', 'Giá trị'],
      ['Doanh thu lũy kế (VNĐ)', stats.totalRevenue],
      ['Số vé đã bán', stats.totalTickets],
      ['Tỷ lệ hủy vé (%)', stats.cancellationRate],
      [],
      ['DOANH THU THEO NGÀY'],
      ['Ngày', 'Doanh thu (VNĐ)', 'Số vé'],
      ...stats.revenueOverTime.map((d) => [d.date, d.revenue, d.tickets]),
      [],
      ['TUYẾN XE ĐƯỢC ƯA CHUỘNG'],
      ['Tuyến', 'Doanh thu (VNĐ)', 'Số vé'],
      ...stats.popularRoutes.map((r) => [r.date, r.revenue, r.ticketCount]),
    ]

    const filename = `bao-cao-thong-ke_${endDateObj.toISOString().split('T')[0]}.csv`
    exportToCsv(filename, rows)
    toast.success('Đã xuất báo cáo thành công!')
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">

      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Báo Cáo Thống Kê</h1>
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
          <Button variant="outline" size="sm" disabled={loading} onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-1" /> Xuất báo cáo (CSV)
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tính toán thống kê...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Widget Row */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.08)}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={TrendingUp}
                label="Doanh thu lũy kế"
                value={stats.totalRevenue}
                formatValue={formatCurrency}
                caption="Tổng tiền từ các hóa đơn đã thanh toán"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={Ticket}
                label="Số vé đã bán"
                value={stats.totalTickets}
                formatValue={(v) => `${v.toLocaleString('vi-VN')} vé`}
                caption="Tổng vé hoạt động trên hệ thống"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={ShieldAlert}
                label="Tỷ lệ hủy vé"
                value={stats.cancellationRate}
                formatValue={(v) => `${v}%`}
                caption="Phần trăm vé bị hủy so với tổng đặt vé"
              />
            </motion.div>
          </motion.div>

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
    </motion.div>
  )
}
