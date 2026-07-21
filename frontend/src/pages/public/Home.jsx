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
import { Search, MapPin, Calendar as CalendarIcon, ArrowRightLeft, Bus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
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
  const [hasSearched, setHasSearched] = useState(false)

  // Load unique origins and destinations
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await routeApi.getAll()
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

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchParams.origin || !searchParams.destination) {
      toast.warning('Vui lòng chọn đầy đủ Điểm đi và Điểm đến!')
      return
    }
    
    setSearching(true)
    setHasSearched(true)
    try {
      const data = await tripApi.search({
        origin: searchParams.origin,
        destination: searchParams.destination,
        date: searchParams.date,
      })
      setTrips(data)
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tìm chuyến xe')
    } finally {
      setSearching(false)
    }
  }

  const swapLocations = () => {
    setSearchParams(prev => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }))
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600 via-blue-700 to-indigo-900 text-white py-16 md:py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="container mx-auto text-center max-w-4xl relative z-10 space-y-6">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-extrabold tracking-tight"
          >
            Tìm Kiếm & Đặt Vé Xe Khách Nhanh Chóng
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-base md:text-xl text-blue-100 font-light max-w-2xl mx-auto"
          >
            Cam kết chất lượng dịch vụ tốt nhất, giá vé rẻ nhất, phục vụ tận tâm trên mọi nẻo đường Việt Nam.
          </motion.p>

          {/* Search Card Container */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full max-w-3xl mx-auto pt-6 text-[hsl(var(--foreground))]"
          >
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl rounded-2xl">
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  
                  {/* Origin Select */}
                  <div className="col-span-1 md:col-span-4 text-left space-y-1.5">
                    <Label className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-[hsl(var(--primary))]" />
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
                  <div className="col-span-1 md:col-span-1 flex justify-center pb-1">
                    <Button 
                      type="button" 
                      onClick={swapLocations} 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                    >
                      <ArrowRightLeft className="h-4 w-4 rotate-90 md:rotate-0" />
                    </Button>
                  </div>

                  {/* Destination Select */}
                  <div className="col-span-1 md:col-span-4 text-left space-y-1.5">
                    <Label className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-red-500" />
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
                  <div className="col-span-1 md:col-span-3 text-left space-y-1.5">
                    <Label className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1 text-[hsl(var(--primary))]" />
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
                  <div className="col-span-1 md:col-span-12 mt-2">
                    <Button type="submit" variant="accent" className="w-full h-11 font-bold text-md">
                      <Search className="h-4.5 w-4.5 mr-2" />
                      Tìm Kiếm Chuyến Xe
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      <section className="container mx-auto px-4 py-12 max-w-4xl flex-1">
        {searching && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
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
                className="space-y-4"
              >
                <div className="flex items-center space-x-2 pb-2 border-b border-[hsl(var(--border))] mb-6">
                  <Bus className="h-5 w-5 text-[hsl(var(--primary))]" />
                  <h3 className="font-bold text-lg">Tìm thấy {trips.length} chuyến xe phù hợp</h3>
                </div>
                {trips.map((trip) => (
                  <motion.div key={trip.id} variants={itemVariants}>
                    <TripCard trip={trip} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 space-y-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl"
              >
                <p className="text-lg font-semibold text-[hsl(var(--foreground))]">Không có chuyến xe nào phù hợp</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Vui lòng thay đổi thông tin tìm kiếm hoặc chọn ngày khác</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!searching && !hasSearched && (
          <div className="text-center py-16 space-y-3 text-[hsl(var(--muted-foreground))]">
            <Bus className="h-16 w-16 mx-auto opacity-20 stroke-[1.5]" />
            <p className="text-md">Chọn thông tin hành trình phía trên để tìm chuyến xe của bạn</p>
          </div>
        )}
      </section>
    </div>
  )
}
