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
import { userApi } from '@/api/userApi'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Bus, MapPin, Calendar, Clock, CreditCard, Banknote, ArrowRight, Loader2, UserSearch, Check, X } from 'lucide-react'
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

  // Nhân viên/quản trị viên đặt vé hộ khách: hóa đơn phải gắn vào tài khoản
  // khách hàng thật (tìm hoặc tạo theo SĐT), không phải tài khoản của người
  // đang thao tác. Khách hàng tự đặt vé bỏ qua toàn bộ khối này.
  const isStaffBooking = user?.role === 'staff' || user?.role === 'admin'
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState(null)
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const handleSearchCustomer = async () => {
    if (customerPhone.trim().length < 3) {
      toast.warning('Vui lòng nhập ít nhất 3 số điện thoại.')
      return
    }
    setSearchingCustomer(true)
    setSelectedCustomer(null)
    try {
      const results = await userApi.searchCustomers(customerPhone.trim())
      setCustomerSearchResults(results)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi khi tìm khách hàng')
    } finally {
      setSearchingCustomer(false)
    }
  }

  const handleCreateCustomer = async () => {
    if (newCustomerName.trim().length < 2) {
      toast.warning('Vui lòng nhập họ tên khách hàng.')
      return
    }
    setCreatingCustomer(true)
    try {
      const customer = await userApi.resolveOrCreateCustomer({
        full_name: newCustomerName.trim(),
        phone: customerPhone.trim(),
        email: newCustomerEmail.trim() || undefined,
      })
      setSelectedCustomer(customer)
      setCustomerSearchResults(null)
      toast.success(`Đã tạo tài khoản khách hàng mới: ${customer.full_name}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi khi tạo tài khoản khách hàng')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const handleResetCustomer = () => {
    setSelectedCustomer(null)
    setCustomerSearchResults(null)
    setCustomerPhone('')
    setNewCustomerName('')
    setNewCustomerEmail('')
  }

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
    if (isStaffBooking && !selectedCustomer) {
      toast.warning('Vui lòng tìm hoặc tạo tài khoản khách hàng nhận vé trước khi đặt.')
      return
    }

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
        ...(isStaffBooking && selectedCustomer ? { customer_id: selectedCustomer.id } : {}),
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

            {/* Đặt vé hộ khách — chỉ hiện với nhân viên/quản trị viên */}
            {isStaffBooking && (
              <Card className="border border-[hsl(var(--border))]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserSearch className="h-5 w-5 text-[hsl(var(--primary))]" />
                    Khách hàng nhận vé
                  </CardTitle>
                  <CardDescription>
                    Tìm tài khoản khách hàng theo số điện thoại, hoặc tạo mới nếu khách chưa có tài khoản.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--success))] bg-[hsl(var(--success)/0.08)]">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                        <span className="font-semibold">{selectedCustomer.full_name}</span>
                        <span className="text-[hsl(var(--muted-foreground))]">— {selectedCustomer.phone}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={handleResetCustomer}>
                        <X className="h-3.5 w-3.5 mr-1" /> Đổi khách khác
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nhập số điện thoại khách hàng..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                        <Button type="button" onClick={handleSearchCustomer} disabled={searchingCustomer}>
                          {searchingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tìm khách'}
                        </Button>
                      </div>

                      {customerSearchResults && customerSearchResults.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Chọn tài khoản khách hàng phù hợp:</p>
                          {customerSearchResults.map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => { setSelectedCustomer(c); setCustomerSearchResults(null) }}
                              className="w-full text-left p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] text-sm"
                            >
                              <span className="font-semibold">{c.full_name}</span>
                              <span className="text-[hsl(var(--muted-foreground))]"> — {c.phone} — {c.email}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {customerSearchResults && customerSearchResults.length === 0 && (
                        <div className="space-y-3 p-3 rounded-lg border border-dashed border-[hsl(var(--border))]">
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Không tìm thấy khách hàng với số điện thoại này. Nhập thông tin để tạo tài khoản mới:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              placeholder="Họ tên khách hàng"
                              value={newCustomerName}
                              onChange={(e) => setNewCustomerName(e.target.value)}
                            />
                            <Input
                              placeholder="Email (tùy chọn)"
                              value={newCustomerEmail}
                              onChange={(e) => setNewCustomerEmail(e.target.value)}
                            />
                          </div>
                          <Button type="button" size="sm" onClick={handleCreateCustomer} disabled={creatingCustomer}>
                            {creatingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tạo khách mới & đặt vé'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

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
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-44 font-semibold"
                  disabled={submitting || (isStaffBooking && !selectedCustomer)}
                  title={isStaffBooking && !selectedCustomer ? 'Vui lòng chọn khách hàng nhận vé trước' : undefined}
                >
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
