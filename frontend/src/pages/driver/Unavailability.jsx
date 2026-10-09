import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { driverApi } from '@/api/driverApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { FormField } from '@/components/ui/form-field'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { CalendarOff, Loader2, Trash2 } from 'lucide-react'
import { formatDateString, toVNDateString, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const leaveSchema = zod
  .object({
    start_date: zod.string().min(1, 'Chọn ngày bắt đầu'),
    end_date: zod.string().min(1, 'Chọn ngày kết thúc'),
    reason: zod.string().max(255, 'Lý do tối đa 255 ký tự').optional(),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    path: ['end_date'],
  })

// Tài xế đăng ký / hủy ngày nghỉ. Không đăng ký được nếu đã được phân công
// chuyến trong khoảng đó (backend trả 409 kèm danh sách chuyến).
export default function Unavailability() {
  const today = toVNDateString()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [conflictTrips, setConflictTrips] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leaveSchema),
    defaultValues: { start_date: '', end_date: '', reason: '' },
  })

  const load = useCallback(async () => {
    try {
      setItems(await driverApi.getUnavailabilities())
    } catch {
      toast.error('Không thể tải danh sách ngày nghỉ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onSubmit = async (data) => {
    setSubmitting(true)
    setConflictTrips([])
    try {
      await driverApi.createUnavailability({
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason || undefined,
      })
      toast.success('Đã đăng ký ngày nghỉ!')
      reset({ start_date: '', end_date: '', reason: '' })
      load()
    } catch (error) {
      if (error.response?.status === 409) setConflictTrips(error.response.data.trips || [])
      toast.error(error.response?.data?.message || 'Không thể đăng ký ngày nghỉ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await driverApi.deleteUnavailability(id)
      toast.success('Đã hủy đăng ký nghỉ')
      load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể hủy đăng ký nghỉ')
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Đăng ký ngày nghỉ"
        description="Báo ngày bận để quản trị viên không phân công chuyến cho bạn trong khoảng đó."
      />

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Đăng ký nghỉ mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Từ ngày" htmlFor="start_date" error={errors.start_date?.message}>
                <DateInput
                  id="start_date"
                  type="date"
                  min={today}
                  {...register('start_date')}
                  value={watch('start_date') ?? ''}
                  className={errors.start_date ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>
              <FormField label="Đến hết ngày" htmlFor="end_date" error={errors.end_date?.message}>
                <DateInput
                  id="end_date"
                  type="date"
                  min={today}
                  {...register('end_date')}
                  value={watch('end_date') ?? ''}
                  className={errors.end_date ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>
            </div>
            <FormField label="Lý do (không bắt buộc)" htmlFor="reason" error={errors.reason?.message}>
              <Input id="reason" placeholder="Việc gia đình, khám sức khỏe..." {...register('reason')} />
            </FormField>

            {conflictTrips.length > 0 && (
              <div className="rounded-lg border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.05)] p-3 text-sm">
                <p className="font-semibold text-[hsl(var(--destructive))]">
                  Bạn đang được phân công các chuyến sau trong khoảng này:
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
                  {conflictTrips.map((t) => (
                    <li key={t.id}>
                      TRIP-{t.id}: {t.origin} → {t.destination} · {formatDateTime(t.departure_time)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  Hãy nhờ quản trị viên gỡ phân công các chuyến này trước, rồi đăng ký nghỉ lại.
                </p>
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đăng ký nghỉ'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Ngày nghỉ đã đăng ký</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--accent))]" />
            </div>
          ) : items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item) => {
                const started = item.start_date <= today
                const finished = item.end_date < today
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">
                        {formatDateString(item.start_date)}
                        {item.end_date !== item.start_date && ` – ${formatDateString(item.end_date)}`}
                      </p>
                      {item.reason && <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.reason}</p>}
                      {finished ? (
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Đã qua</p>
                      ) : started ? (
                        <p className="text-[10px] font-semibold text-[hsl(var(--warning))]">Đang nghỉ</p>
                      ) : null}
                    </div>
                    {!started && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                        aria-label="Hủy đăng ký nghỉ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon={CalendarOff} title="Bạn chưa đăng ký ngày nghỉ nào." />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
