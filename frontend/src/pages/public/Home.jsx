import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { routeApi } from '@/api/routeApi'
import { tripApi } from '@/api/tripApi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TripCard from '@/components/features/TripCard'
import { Pagination } from '@/components/ui/pagination'
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  ArrowRightLeft,
  Bus,
  Loader2,
  ShieldCheck,
  Clock,
  Headset,
  Wallet,
} from 'lucide-react'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { toast } from 'sonner'
import { staggerContainer, fadeInUp } from '@/lib/motionVariants'
import heroImage from '@/assets/home-hero.jpg'
import routePhoto1 from '@/assets/route-1.jpg'
import routePhoto2 from '@/assets/route-2.jpg'
import routePhoto3 from '@/assets/route-3.jpg'

// Tuyến đường phổ biến ở trang chủ: 3 thành phố cố định, mỗi thành phố hiện
// đúng 3 điểm đến theo thứ tự đã chọn (không dựa vào thứ tự trả về mặc định
// từ API, để giữ đúng bố cục mong muốn). Ảnh chọn theo chủ đề khớp từng
// thành phố: route-1 (núi đồi sương mù) = Đà Lạt, route-2 (ven biển) = Đà
// Nẵng, route-3 (skyline về đêm) = Tp Hồ Chí Minh.
const FEATURED_CITIES = [
  { city: 'Tp Hồ Chí Minh', photo: routePhoto3, destinations: ['Đà Lạt', 'Cần Thơ', 'Long Xuyên'] },
  { city: 'Đà Lạt', photo: routePhoto1, destinations: ['Tp Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'] },
  { city: 'Đà Nẵng', photo: routePhoto2, destinations: ['Đà Lạt', 'Tp Hồ Chí Minh', 'Nha Trang'] },
]

const highlights = [
  { icon: ShieldCheck, title: 'An toàn tuyệt đối', text: 'Thanh toán bảo mật, nhà xe đối tác được xác thực kỹ lưỡng.' },
  { icon: Clock, title: 'Đúng giờ xuất bến', text: 'Lịch trình chính xác, giúp bạn chủ động kế hoạch di chuyển.' },
  { icon: Headset, title: 'Hỗ trợ 24/7', text: 'Đội ngũ chăm sóc khách hàng luôn sẵn sàng giải đáp thắc mắc.' },
  { icon: Wallet, title: 'Thanh toán đa dạng', text: 'Tiền mặt, MoMo và nhiều phương thức linh hoạt, an toàn.' },
]

export default function Home() {
  const [routes, setRoutes] = useState([])
  const [origins, setOrigins] = useState([])
  const [destinations, setDestinations] = useState([])
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
  })

  const [loadingRoutes, setLoadingRoutes] = useState(true)
  const [searching, setSearching] = useState(false)
  const [trips, setTrips] = useState([])
  const [tripsPagination, setTripsPagination] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Load unique origins and destinations
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await routeApi.getAll()
        setRoutes(data)
        const uniqueOrigins = [...new Set(data.map(r => r.origin))]
        const uniqueDestinations = [...new Set(data.map(r => r.destination))]
        setOrigins(uniqueOrigins)
        setDestinations(uniqueDestinations)
      } catch (error) {
        toast.error('Không thể tải danh sách tuyến đường')
      } finally {
        setLoadingRoutes(false)
      }
    }
    fetchRoutes()
  }, [])

  const performSearch = async (origin, destination, date, page = 1) => {
    setSearching(true)
    setHasSearched(true)
    try {
      const res = await tripApi.search({ origin, destination, date, page, limit: 10 })
      setTrips(res.data)
      setTripsPagination(res.pagination)
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tìm chuyến xe')
    } finally {
      setSearching(false)
    }
  }

  const handleSearchPageChange = (page) => {
    performSearch(searchParams.origin, searchParams.destination, searchParams.date, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchParams.origin || !searchParams.destination) {
      toast.warning('Vui lòng chọn đầy đủ Điểm đi và Điểm đến!')
      return
    }
    await performSearch(searchParams.origin, searchParams.destination, searchParams.date)
  }

  const handleQuickRoute = (route) => {
    setSearchParams(prev => ({ ...prev, origin: route.origin, destination: route.destination }))
    performSearch(route.origin, route.destination, searchParams.date)
  }

  const swapLocations = () => {
    setSearchParams(prev => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }))
  }

  const containerVariants = staggerContainer(0.1)
  const itemVariants = fadeInUp

  // Nhóm tuyến đường phổ biến theo 3 thành phố cố định (FEATURED_CITIES),
  // mỗi thành phố tra đúng route theo thứ tự destinations đã khai báo.
  const featuredCityCards = FEATURED_CITIES.map(({ city, photo, destinations }) => ({
    city,
    photo,
    routes: destinations
      .map((dest) => routes.find((r) => r.origin === city && r.destination === dest))
      .filter(Boolean),
  })).filter((card) => card.routes.length > 0)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section — ảnh xe khách full-bleed + gradient tối để chữ luôn rõ */}
      <section className="relative h-110 overflow-hidden md:h-130">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-stone-950/90 via-stone-950/60 to-stone-950/20" />
        <div className="relative z-10 flex h-full items-center px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="max-w-xl text-stone-50">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-semibold tracking-tight leading-[1.05] text-balance md:text-5xl"
              >
                Đặt Vé Xe Khách<br />Nhanh Chóng &amp; An Tâm
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="mt-4 max-w-md text-base text-stone-300"
              >
                Cam kết chất lượng dịch vụ tốt nhất, giá vé rẻ nhất, phục vụ tận tâm trên mọi nẻo đường Việt Nam.
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-6 flex flex-wrap gap-3"
              >
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-stone-100 backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Đối tác uy tín
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-stone-100 backdrop-blur-sm">
                  <Headset className="h-3.5 w-3.5" />
                  Hỗ trợ 24/7
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Card — nổi đè lên đáy hero */}
      <div className="container relative z-20 mx-auto -mt-16 max-w-5xl px-4 md:-mt-14">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          <Card className="rounded-2xl border-none shadow-2xl">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">

                {/* Origin Select */}
                <div className="col-span-1 space-y-1.5 text-left md:col-span-4">
                  <Label className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    Điểm đi
                  </Label>
                  <Select
                    value={searchParams.origin}
                    onValueChange={(val) => setSearchParams(prev => ({ ...prev, origin: val }))}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Chọn nơi xuất phát" />
                    </SelectTrigger>
                    <SelectContent>
                      {origins.map(city => (
                        <SelectItem key={`origin-${city}`} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Swap Button */}
                <div className="col-span-1 flex justify-center pb-1 md:col-span-1">
                  <Button
                    type="button"
                    onClick={swapLocations}
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-[hsl(var(--border))]"
                  >
                    <ArrowRightLeft className="h-4 w-4 rotate-90 md:rotate-0" />
                  </Button>
                </div>

                {/* Destination Select */}
                <div className="col-span-1 space-y-1.5 text-left md:col-span-4">
                  <Label className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                    <MapPin className="h-3.5 w-3.5 mr-1 text-[hsl(var(--primary))]" />
                    Điểm đến
                  </Label>
                  <Select
                    value={searchParams.destination}
                    onValueChange={(val) => setSearchParams(prev => ({ ...prev, destination: val }))}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Chọn nơi đến" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map(city => (
                        <SelectItem key={`dest-${city}`} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Input */}
                <div className="col-span-1 space-y-1.5 text-left md:col-span-3">
                  <Label className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    Ngày đi
                  </Label>
                  <Input
                    type="date"
                    value={searchParams.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full h-10"
                  />
                </div>

                {/* Search Button */}
                <div className="col-span-1 mt-2 md:col-span-12">
                  <Button type="submit" variant="accent" size="lg" className="w-full font-semibold">
                    <Search className="h-4.5 w-4.5 mr-2" />
                    Tìm Kiếm Chuyến Xe
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Results Section */}
      <section className="container mx-auto flex-1 max-w-6xl px-4 py-16 md:py-20">
        {searching && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tìm các chuyến xe phù hợp...</p>
          </div>
        )}

        {!searching && hasSearched && (
          <AnimatePresence>
            {trips.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="mx-auto max-w-4xl space-y-4"
              >
                <div className="flex items-center space-x-2 pb-2 border-b border-[hsl(var(--border))] mb-6">
                  <Bus className="h-5 w-5 text-[hsl(var(--primary))]" />
                  <h2 className="text-xl font-semibold tracking-tight">Tìm thấy {tripsPagination?.total ?? trips.length} chuyến xe phù hợp</h2>
                </div>
                {trips.map((trip) => (
                  <motion.div key={trip.id} variants={itemVariants}>
                    <TripCard trip={trip} />
                  </motion.div>
                ))}
                <Pagination pagination={tripsPagination} onPageChange={handleSearchPageChange} className="pt-4" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto max-w-4xl text-center py-16 space-y-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl"
              >
                <p className="text-lg font-semibold text-[hsl(var(--foreground))]">Không có chuyến xe nào phù hợp</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Vui lòng thay đổi thông tin tìm kiếm hoặc chọn ngày khác</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!searching && !hasSearched && (
          <div>
            {!loadingRoutes && featuredCityCards.length > 0 && (
              <div>
                <div className="mb-8 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Tuyến đường phổ biến</h2>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Chọn nhanh một tuyến để xem các chuyến xe đang chạy.</p>
                  </div>
                </div>
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-80px' }}
                  variants={containerVariants}
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {featuredCityCards.map((card) => (
                    <motion.div key={card.city} variants={itemVariants}>
                      <Card className="overflow-hidden border-[hsl(var(--border))] p-0">
                        <div
                          className="relative h-32 w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${card.photo})` }}
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-4 text-stone-50">
                            <span className="text-xs text-stone-200">Tuyến xe từ</span>
                            <h3 className="text-lg font-semibold leading-tight">{card.city}</h3>
                          </div>
                        </div>
                        <CardContent className="divide-y divide-[hsl(var(--border))] p-0">
                          {card.routes.map((route) => (
                            <button
                              key={route.id}
                              type="button"
                              onClick={() => handleQuickRoute(route)}
                              className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[hsl(var(--muted)/0.5)]"
                            >
                              <div>
                                <span className="font-semibold text-[hsl(var(--primary))]">{route.destination}</span>
                                {route.duration_min && (
                                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                                    <Clock className="h-3 w-3" />
                                    {route.distance_km ? `${route.distance_km}km - ` : ''}{formatDuration(route.duration_min)}
                                  </div>
                                )}
                              </div>
                              <span className="shrink-0 font-semibold text-[hsl(var(--foreground))]">{formatCurrency(route.base_price)}</span>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Why choose us */}
            <div className="mt-24">
              <div className="mb-10 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Tại sao chọn chúng tôi?</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-[hsl(var(--muted-foreground))]">
                  Cam kết mang lại trải nghiệm đặt vé chuyên nghiệp, minh bạch và tiện lợi nhất cho mọi hành trình của bạn.
                </p>
              </div>
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-80px' }}
                variants={containerVariants}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
              >
                {highlights.map(({ icon: Icon, title, text }) => (
                  <motion.div
                    key={title}
                    variants={itemVariants}
                    className="flex flex-col items-center rounded-xl border border-[hsl(var(--border))] p-6 text-center transition-transform hover:-translate-y-1"
                  >
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">{text}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
