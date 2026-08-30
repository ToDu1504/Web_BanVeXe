import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bus, Clock, Calendar, ArrowRight, User } from 'lucide-react'
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils'

export default function TripCard({ trip }) {
  const navigate = useNavigate()

  const vehicleTypeLabels = {
    sleeper: 'Giường nằm',
    limousine: 'Limousine',
    standard: 'Ghế ngồi tiêu chuẩn',
  }

  const durationMin = trip.Route?.duration_min || 0

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <Card className="overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left Column: Route & Time Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="font-semibold text-xs py-1 px-2.5">
                  {vehicleTypeLabels[trip.Vehicle?.vehicle_type] || 'Xe khách'}
                </Badge>
                <div className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                  <User className="h-3.5 w-3.5 mr-1" />
                  <span>Còn {trip.available_seats} / {trip.Vehicle?.total_seats || 40} ghế</span>
                </div>
              </div>

              {/* Origin to Destination */}
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                    {trip.Route?.origin}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDateTime(trip.departure_time)}
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                    {trip.Route?.destination}
                  </span>
                  {trip.arrival_time && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDateTime(trip.arrival_time)}
                    </span>
                  )}
                </div>
              </div>

              {/* Duration and distance info */}
              <div className="flex items-center space-x-4 text-xs text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span>Thời gian hành trình: {formatDuration(durationMin)}</span>
                </div>
                {trip.Route?.distance_km && (
                  <span>• Cự ly: {trip.Route.distance_km} km</span>
                )}
              </div>
            </div>

            {/* Right Column: Pricing & Call to Action */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-[hsl(var(--border))] pt-4 md:pt-0 md:pl-6">
              <div className="flex flex-col md:items-end">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Giá vé chỉ từ</span>
                <span className="text-2xl font-bold text-[hsl(var(--accent))]">
                  {formatCurrency(trip.price)}
                </span>
              </div>
              <Button
                variant="accent"
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="w-full md:w-32 font-semibold"
                disabled={trip.available_seats === 0 || trip.status !== 'scheduled'}
              >
                {trip.available_seats === 0 ? 'Hết vé' : 'Chọn chuyến'}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
