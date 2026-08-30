import React from 'react'
import { motion } from 'framer-motion'
import { Check, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fadeInUp } from '@/lib/motionVariants'

export default function SeatMap({
  totalSeats = 40,
  layout = null, // e.g. { floors: 1, rows: 10, cols: 4 }
  bookedSeats = [],
  selectedSeats = [], // Array of numbers e.g. [1, 2]
  onSeatClick,
}) {
  // Parse or construct default layout
  const floors = layout?.floors || 1
  const cols = layout?.cols || 4 // number of columns
  const rows = layout?.rows || Math.ceil(totalSeats / (cols * floors))

  // Helper to generate seat layout for a floor
  const renderFloor = (floorIndex) => {
    const seats = []
    const startSeat = floorIndex * (totalSeats / floors)
    const endSeat = startSeat + (totalSeats / floors)

    for (let r = 0; r < rows; r++) {
      const rowSeats = []
      for (let c = 0; c < cols; c++) {
        // Calculate seat number (1-indexed)
        const seatNum = Math.floor(startSeat + r * cols + c + 1)
        if (seatNum <= endSeat && seatNum <= totalSeats) {
          rowSeats.push(seatNum)
        } else {
          rowSeats.push(null) // Empty cell (aisle or empty space)
        }
      }
      seats.push(rowSeats)
    }

    return (
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeInUp}
        className="flex flex-col space-y-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm"
      >
        <h4 className="text-center font-bold text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
          {floors > 1 ? `Tầng ${floorIndex + 1}` : 'Sơ đồ ghế xe'}
        </h4>

        {/* Front of the bus indicator */}
        <div className="w-full flex justify-center pb-4 border-b border-[hsl(var(--border))] mb-4">
          <div className="flex items-center space-x-1.5 text-xs text-[hsl(var(--muted-foreground))] font-semibold">
            <span className="w-3.5 h-3.5 border border-[hsl(var(--border))] rounded flex items-center justify-center text-[8px] bg-[hsl(var(--muted))]">↑</span>
            <span>Đầu xe / Tài xế</span>
          </div>
        </div>

        {/* Seats Grid */}
        <div className="grid gap-3 justify-center" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {seats.map((row, rIndex) =>
            row.map((seatNum, cIndex) => {
              if (seatNum === null) {
                return <div key={`empty-${rIndex}-${cIndex}`} className="w-12 h-12" /> // Aisle space
              }

              const isBooked = bookedSeats.includes(seatNum)
              const isSelected = selectedSeats.includes(seatNum)

              return (
                <motion.button
                  key={`seat-${seatNum}`}
                  whileTap={{ scale: isBooked ? 1 : 0.95 }}
                  onClick={() => !isBooked && onSeatClick(seatNum)}
                  className={cn(
                    "relative w-12 h-12 rounded-xl flex flex-col items-center justify-center font-semibold text-xs transition-all border",
                    isBooked
                      ? "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.2)] cursor-not-allowed"
                      : isSelected
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))] shadow-sm"
                      : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  )}
                  type="button"
                  disabled={isBooked}
                >
                  <span>{seatNum}</span>
                  {isSelected && <Check className="absolute top-1 right-1 h-3 w-3 stroke-[3]" />}
                </motion.button>
              )
            })
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 bg-[hsl(var(--muted)/0.5)] rounded-xl p-4 text-xs font-medium">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          <span>Ghế trống</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-[hsl(var(--primary))] border border-[hsl(var(--primary))]" />
          <span>Đang chọn</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)]" />
          <span>Đã bán / Không bán</span>
        </div>
      </div>

      {/* Render Floors side-by-side or stacked */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center max-w-2xl mx-auto">
        {Array.from({ length: floors }).map((_, fIndex) => (
          <div key={`floor-container-${fIndex}`}>
            {renderFloor(fIndex)}
          </div>
        ))}
      </div>
    </div>
  )
}
