import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { useBooking } from '@/hooks/useBooking'
import { useAuth } from '@/hooks/useAuth'
import { invoiceApi } from '@/api/invoiceApi'
import { paymentApi } from '@/api/paymentApi'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Bus, MapPin, Calendar, Clock, CreditCard, Banknote, ArrowRight, Loader2 } from 'lucide-react'
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils'
import { toast } from 'sonner'
import { staggerContainer, fadeInUp } from '@/lib/motionVariants'

const passengerSchema = zod.object({
  fullName: zod.string().min(2, 'Họ tên hành khách phải có ít nhất 2 ký tự'),
  phone: zod.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại không hợp lệ'),
})

const bookingFormSchema = zod.object({
  passengers: zod.array(passengerSchema),
  paymentMethod: zod.enum(['cash', 'momo']),
})

export default function BookTicket() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedTrip, selectedSeats, resetBooking } = useBooking()
  const [submitting, setSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Redirect if no trip/seats selected (skip once booking has just succeeded,
  // since resetBooking() also clears selectedTrip/selectedSeats)
  useEffect(() => {
    if (!bookingSuccess && (!selectedTrip || selectedSeats.length === 0)) {
      toast.warning('Chưa có thông tin chuyến xe hoặc ghế chọn!')
      navigate('/')
    }
  }, [selectedTrip, selectedSeats, bookingSuccess, navigate])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      passengers: selectedSeats.map(s => ({
        fullName: s.passengerName || user?.full_name || '',
        phone: s.passengerPhone || user?.phone || '',
      })),
      paymentMethod: 'momo',
    },
  })

  const { fields } = useFieldArray({
    control,
    name: 'passengers',
  })

  if (!selectedTrip || selectedSeats.length === 0) {
    return null
  }

  const totalPrice = selectedSeats.length * selectedTrip.price

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      // Map passenger form details back to tickets format for API
      const tickets = selectedSeats.map((seat, index) => ({
        trip_id: selectedTrip.id,
        seat_number: seat.seatNumber,
        passenger_name: data.passengers[index].fullName,
        passenger_phone: data.passengers[index].phone,
        ticket_price: selectedTrip.price,
      }))

      const result = await invoiceApi.create({
        total_price: totalPrice,
        payment_method: data.paymentMethod,
        tickets,
      })

      setBookingSuccess(true) // Prevent the "missing trip/seats" guard from firing on reset

      // Momo: redirect the user to the MoMo sandbox payment page to finish payment.
      // The invoice/tickets already exist (pending) regardless of the outcome, so
      // if creating the payment link fails, fall back to the invoice history page
      // where the customer can retry payment.
      if (data.paymentMethod === 'momo') {
        try {
          const { payUrl } = await paymentApi.createMomoPayment(result.invoiceId)
          resetBooking()
          window.location.href = payUrl
          return
        } catch (momoError) {
          toast.error(momoError.response?.data?.message || 'Không thể khởi tạo thanh toán MoMo. Vui lòng thử lại từ lịch sử hóa đơn.')
          resetBooking()
          navigate('/customer/invoices')
          return
        }
      }

      toast.success('Đặt vé thành công! Vui lòng thanh toán hóa đơn.')
      resetBooking() // Clear booking state
      navigate('/customer/invoices')
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Có lỗi xảy ra khi đặt vé xe'
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] mb-6 flex items-center gap-2">
        <Bus className="h-6 w-6 text-[hsl(var(--primary))]" />
        Thông Tin Đặt Vé & Thanh Toán
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Passenger Info Form */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeInUp}
          className="lg:col-span-8 space-y-6"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Passenger Forms */}
            <Card className="border border-[hsl(var(--border))]">
              <CardHeader>
                <CardTitle className="text-lg">Thông tin hành khách</CardTitle>
                <CardDescription>
                  Vui lòng cung cấp chính xác thông tin để in lên vé xe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={staggerContainer(0.08)}
                  className="space-y-6"
                >
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      variants={fadeInUp}
                      className="p-4 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.3)] space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2">
                        <span className="font-bold text-sm text-[hsl(var(--primary))]">
                          Hành khách đi ghế {selectedSeats[index].seatNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label="Họ tên hành khách"
                          htmlFor={`passengers.${index}.fullName`}
                          error={errors.passengers?.[index]?.fullName?.message}
                        >
                          <Input
                            id={`passengers.${index}.fullName`}
                            placeholder="Nguyễn Văn A"
                            {...register(`passengers.${index}.fullName`)}
                            className={errors.passengers?.[index]?.fullName ? 'border-[hsl(var(--destructive))]' : ''}
                          />
                        </FormField>

                        <FormField
                          label="Số điện thoại"
                          htmlFor={`passengers.${index}.phone`}
                          error={errors.passengers?.[index]?.phone?.message}
                        >
                          <Input
                            id={`passengers.${index}.phone`}
                            placeholder="0987654321"
                            {...register(`passengers.${index}.phone`)}
                            className={errors.passengers?.[index]?.phone ? 'border-[hsl(var(--destructive))]' : ''}
                          />
                        </FormField>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>

            {/* Payment Method Selector */}
            <Card className="border border-[hsl(var(--border))]">
              <CardHeader>
                <CardTitle className="text-lg">Phương thức thanh toán</CardTitle>
                <CardDescription>
                  Chọn hình thức thanh toán thuận tiện nhất với bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Momo */}
                  <label className="flex items-center space-x-3 p-4 border border-[hsl(var(--border))] rounded-xl cursor-pointer transition-all hover:bg-[hsl(var(--muted)/0.3)] has-checked:border-[hsl(var(--primary))] has-checked:bg-[hsl(var(--primary)/0.05)]">
                    <input
                      type="radio"
                      value="momo"
                      {...register('paymentMethod')}
                      className="accent-[hsl(var(--primary))]"
                    />
                    <CreditCard className="h-5 w-5 text-pink-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Ví Momo</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Thanh toán bằng ví điện tử</p>
                    </div>
                  </label>

                  {/* Cash */}
                  <label className="flex items-center space-x-3 p-4 border border-[hsl(var(--border))] rounded-xl cursor-pointer transition-all hover:bg-[hsl(var(--muted)/0.3)] has-checked:border-[hsl(var(--primary))] has-checked:bg-[hsl(var(--primary)/0.05)]">
                    <input
                      type="radio"
                      value="cash"
                      {...register('paymentMethod')}
                      className="accent-[hsl(var(--primary))]"
                    />
                    <Banknote className="h-5 w-5 text-[hsl(var(--success))] shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Tiền mặt</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Thanh toán trực tiếp tại quầy</p>
                    </div>
                  </label>
                </div>
              </CardContent>
              <CardFooter className="bg-[hsl(var(--muted)/0.4)] p-6 border-t border-[hsl(var(--border))] rounded-b-xl flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Tổng cộng ({selectedSeats.length} vé)</span>
                  <span className="text-lg font-bold text-[hsl(var(--primary))]">{formatCurrency(totalPrice)}</span>
                </div>
                <Button type="submit" variant="accent" size="lg" className="w-44 font-semibold" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận đặt vé'
                  )}
                </Button>
              </CardFooter>
            </Card>

          </form>
        </motion.div>

        {/* Right Column: Order Summary Info */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeInUp}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 space-y-6"
        >
          <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <CardHeader>
              <CardTitle className="text-md">Tóm tắt hành trình</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                <span className="font-bold text-[hsl(var(--foreground))]">{selectedTrip.Route?.origin}</span>
                <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <span className="font-bold text-[hsl(var(--foreground))]">{selectedTrip.Route?.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Ngày đi</span>
                <span className="font-medium">{formatDateTime(selectedTrip.departure_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Thời gian chạy</span>
                <span className="font-medium">{formatDuration(selectedTrip.Route?.duration_min)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Số lượng ghế</span>
                <span className="font-medium">{selectedSeats.length} ghế</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Danh sách ghế</span>
                <span className="font-bold text-[hsl(var(--primary))]">
                  {selectedSeats.map(s => s.seatNumber).sort((a,b)=>a-b).join(', ')}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  )
}
