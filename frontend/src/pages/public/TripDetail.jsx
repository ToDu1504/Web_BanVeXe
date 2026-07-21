import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tripApi } from '@/api/tripApi'
import { useBooking } from '@/hooks/useBooking'
import { useAuth } from '@/hooks/useAuth'
import SeatMap from '@/components/features/SeatMap'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bus, MapPin, Calendar, Clock, ArrowRight, Loader2, Info } from 'lucide-react'
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils'
import { toast } from 'sonner'

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const {
    selectedTrip,
    selectedSeats,
    bookedSeats,
    selectTrip,
    selectBooked,
    toggleSeatSelection,
  } = useBooking()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        setLoading(true)
        const tripData = await tripApi.getById(id)
        const booked = await tripApi.getBookedSeats(id)
        selectTrip(tripData)
        selectBooked(booked)
      } catch (error) {
        toast.error('Không thể tải thông tin chuyến xe')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    fetchTripData()
  }, [id])

  if (loading || !selectedTrip) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang tải sơ đồ ghế...</p>
        </div>
      </div>
    )
  }

  const selectedSeatNumbers = selectedSeats.map(s => s.seatNumber)
  const totalPrice = selectedSeats.length * selectedTrip.price

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 ghế để tiếp tục!')
      return
    }

    if (!isAuthenticated) {
      toast.info('Bạn cần đăng nhập để đặt vé xe')
      navigate('/login', { state: { from: { pathname: '/customer/book' } } })
      return
    }

    navigate('/customer/book')
  }

  const vehicleTypeLabels = {
    sleeper: 'Giường nằm',
    limousine: 'Limousine',
    standard: 'Ghế ngồi tiêu chuẩn',
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Seat Map Selection */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col space-y-2">
            <h2 className="text-2xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Bus className="h-6 w-6 text-[hsl(var(--primary))]" />
              Chọn Ghế Xe Khách
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Hãy click vào các ghế còn trống để chọn vị trí mong muốn của bạn.
            </p>
          </div>

          <SeatMap
            totalSeats={selectedTrip.Vehicle?.total_seats}
            layout={selectedTrip.Vehicle?.seat_layout}
            bookedSeats={bookedSeats}
            selectedSeats={selectedSeatNumbers}
            onSeatClick={toggleSeatSelection}
          />
        </div>

        {/* Right Column: Sticky Trip Summary & Checkout Info */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Thông tin chuyến đi</CardTitle>
              <CardDescription>
                Tóm tắt hành trình và phương tiện của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              
              {/* Route segment */}
              <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                <div className="font-bold text-[hsl(var(--foreground))]">{selectedTrip.Route?.origin}</div>
                <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <div className="font-bold text-[hsl(var(--foreground))]">{selectedTrip.Route?.destination}</div>
              </div>

              {/* Vehicle & Type */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">Loại xe</span>
                <Badge variant="secondary">{vehicleTypeLabels[selectedTrip.Vehicle?.vehicle_type]}</Badge>
              </div>

              {/* Time Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))] flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5 text-[hsl(var(--primary))]" /> Ngày đi
                  </span>
                  <span className="font-medium">{formatDateTime(selectedTrip.departure_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))] flex items-center">
                    <Clock className="h-4 w-4 mr-1.5 text-[hsl(var(--primary))]" /> Thời gian chạy
                  </span>
                  <span className="font-medium">{formatDuration(selectedTrip.Route?.duration_min)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[hsl(var(--border))] space-y-2">
                <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                  <span>Giá vé mỗi ghế</span>
                  <span>{formatCurrency(selectedTrip.price)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Ghế đã chọn:</span>
                  <span className="text-[hsl(var(--primary))]">
                    {selectedSeatNumbers.length > 0 ? selectedSeatNumbers.sort((a,b)=>a-b).join(', ') : 'Chưa chọn'}
                  </span>
                </div>
              </div>

            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3 bg-[hsl(var(--muted))/20] border-t border-[hsl(var(--border))] p-6 rounded-b-xl">
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-semibold">Tổng thanh toán:</span>
                <span className="text-xl font-extrabold text-[hsl(var(--primary))]">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <Button onClick={handleProceed} variant="accent" className="w-full font-bold">
                Tiếp tục đặt vé
              </Button>
            </CardFooter>
          </Card>

          {/* Info Card */}
          <div className="bg-[hsl(var(--muted))/30] border border-[hsl(var(--border))] p-4 rounded-xl flex gap-3 text-xs text-[hsl(var(--muted-foreground))]">
            <Info className="h-5 w-5 text-[hsl(var(--primary))] shrink-0" />
            <p>
              Hệ thống hỗ trợ hoàn hủy vé trực tuyến trước giờ khởi hành tối thiểu 24 giờ. Phí hủy vé có thể áp dụng theo quy chế.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
