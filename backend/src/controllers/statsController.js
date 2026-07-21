const { Op } = require('sequelize')
const { Invoice, Ticket, Trip, Route } = require('../models')

const statsController = {
  // @desc    Get general stats overview
  // @route   GET /api/stats
  // @access  Private/Staff/Admin
  getStats: async (req, res) => {
    try {
      // 1. Total Revenue from Paid Invoices
      const paidInvoices = await Invoice.findAll({
        where: { payment_status: 'paid' },
      })
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_price), 0)

      // 2. Total Tickets Sold & Cancellation Rate
      const totalTicketsCount = await Ticket.count()
      const bookedTicketsCount = await Ticket.count({ where: { booking_status: 'booked' } })
      const cancelledTicketsCount = await Ticket.count({ where: { booking_status: 'cancelled' } })

      const cancellationRate = totalTicketsCount > 0
        ? ((cancelledTicketsCount / totalTicketsCount) * 100).toFixed(1)
        : 0

      // 3. Today / This-month figures (for Dashboard KPI widgets)
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const todayRevenue = await Invoice.sum('total_price', {
        where: { payment_status: 'paid', created_at: { [Op.between]: [todayStart, todayEnd] } },
      }) || 0

      const monthRevenue = await Invoice.sum('total_price', {
        where: { payment_status: 'paid', created_at: { [Op.between]: [monthStart, monthEnd] } },
      }) || 0

      const todayTicketsCount = await Ticket.count({
        where: { booking_status: 'booked', created_at: { [Op.between]: [todayStart, todayEnd] } },
      })

      const ongoingTripsCount = await Trip.count({ where: { status: 'ongoing' } })

      // 4. Popular Routes
      // Find all booked tickets, join with Trip and Route
      const activeTickets = await Ticket.findAll({
        where: { booking_status: 'booked' },
        include: [
          {
            model: Trip,
            include: [Route],
          },
        ],
      })

      // Aggregate revenue and counts per Route
      const routeStats = {}
      for (const ticket of activeTickets) {
        const route = ticket.Trip?.Route
        if (route) {
          const routeKey = `${route.origin} - ${route.destination}`
          if (!routeStats[routeKey]) {
            routeStats[routeKey] = { date: routeKey, revenue: 0, ticketCount: 0 }
          }
          routeStats[routeKey].revenue += parseFloat(ticket.ticket_price)
          routeStats[routeKey].ticketCount += 1
        }
      }

      // Sort and get top 5 popular routes
      const popularRoutes = Object.values(routeStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      return res.status(200).json({
        total_revenue: totalRevenue,
        total_tickets: bookedTicketsCount,
        cancellation_rate: parseFloat(cancellationRate),
        popular_routes: popularRoutes,
        today_revenue: todayRevenue,
        today_tickets: todayTicketsCount,
        month_revenue: monthRevenue,
        ongoing_trips: ongoingTripsCount,
      })
    } catch (error) {
      console.error('Lỗi getStats:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi kết xuất thống kê.' })
    }
  },

  // @desc    Get dynamic revenue chart details by time period
  // @route   GET /api/stats/revenue
  // @access  Private/Staff/Admin
  getRevenue: async (req, res) => {
    try {
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ startDate và endDate (YYYY-MM-DD).' })
      }

      const start = new Date(`${startDate}T00:00:00.000Z`)
      const end = new Date(`${endDate}T23:59:59.999Z`)

      // Query paid invoices in range
      const invoices = await Invoice.findAll({
        where: {
          payment_status: 'paid',
          created_at: {
            [Op.between]: [start, end],
          },
        },
        order: [['created_at', 'ASC']],
      })

      // Group by date (Vietnam local format dd/MM)
      const dailyRevenue = {}
      
      // Initialize daily range map to ensure dates with 0 revenue are shown
      const current = new Date(start)
      while (current <= end) {
        const dateStr = current.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
        dailyRevenue[dateStr] = { date: dateStr, revenue: 0, tickets: 0 }
        current.setDate(current.getDate() + 1)
      }

      // Populate values from actual database invoices
      for (const inv of invoices) {
        const dateStr = new Date(inv.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
        
        // Count tickets inside invoice
        const ticketCount = await Ticket.count({
          where: { invoice_id: inv.id, booking_status: 'booked' },
        })

        if (!dailyRevenue[dateStr]) {
          dailyRevenue[dateStr] = { date: dateStr, revenue: 0, tickets: 0 }
        }
        dailyRevenue[dateStr].revenue += parseFloat(inv.total_price)
        dailyRevenue[dateStr].tickets += ticketCount
      }

      const chartData = Object.values(dailyRevenue)

      return res.status(200).json({
        revenue_over_time: chartData,
      })
    } catch (error) {
      console.error('Lỗi getRevenue:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi thống kê doanh thu.' })
    }
  },
}

module.exports = statsController
