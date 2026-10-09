import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { driverApi } from '@/api/driverApi'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const INCIDENT_TYPES = [
  { value: 'delay', label: 'Trễ chuyến (kẹt xe, chờ khách...)' },
  { value: 'breakdown', label: 'Xe hỏng / sự cố kỹ thuật' },
  { value: 'accident', label: 'Tai nạn / sự cố trên đường' },
  { value: 'other', label: 'Khác' },
]

const incidentSchema = zod
  .object({
    type: zod.enum(['delay', 'breakdown', 'accident', 'other']),
    delay_minutes: zod.union([zod.coerce.number().int().min(1, 'Tối thiểu 1 phút').max(1440, 'Tối đa 1440 phút'), zod.literal('')]).optional(),
    note: zod.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
    notify_passengers: zod.boolean().optional(),
  })
  .refine((v) => v.type !== 'delay' || (v.delay_minutes !== '' && v.delay_minutes !== undefined), {
    message: 'Vui lòng nhập số phút dự kiến trễ',
    path: ['delay_minutes'],
  })

const defaultValues = { type: 'delay', delay_minutes: '', note: '', notify_passengers: false }

// Form tài xế báo sự cố / trễ chuyến — tùy chọn gửi email báo khách đã đặt vé.
export default function IncidentReportDialog({ open, onOpenChange, tripId, onCreated }) {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(incidentSchema), defaultValues })

  useEffect(() => {
    if (open) reset(defaultValues)
  }, [open, reset])

  const type = watch('type')

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const payload = {
        type: data.type,
        note: data.note || undefined,
        notify_passengers: Boolean(data.notify_passengers),
        ...(data.type === 'delay' ? { delay_minutes: Number(data.delay_minutes) } : {}),
      }
      const incident = await driverApi.reportIncident(tripId, payload)
      if (payload.notify_passengers) {
        toast.success(
          incident.emails_sent > 0
            ? `Đã báo sự cố và gửi email cho ${incident.emails_sent} khách.`
            : 'Đã ghi nhận sự cố. Không có email nào được gửi (chưa cấu hình SMTP hoặc khách không có email).'
        )
      } else {
        toast.success('Đã gửi báo cáo sự cố cho nhà xe.')
      }
      onCreated?.(incident)
      onOpenChange(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi báo cáo sự cố')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--destructive))]" />
            Báo sự cố chuyến TRIP-{tripId}
          </DialogTitle>
          <DialogDescription>
            Nhân viên và quản trị viên sẽ thấy báo cáo này ngay. Báo cáo không tự đổi giờ chạy hay hủy chuyến.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="my-3 space-y-4 text-sm">
            <FormField label="Loại sự cố" htmlFor="incident-type">
              <Select value={type} onValueChange={(val) => setValue('type', val, { shouldValidate: true })}>
                <SelectTrigger id="incident-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {type === 'delay' && (
              <FormField label="Dự kiến trễ (phút)" htmlFor="delay_minutes" error={errors.delay_minutes?.message}>
                <Input
                  id="delay_minutes"
                  type="number"
                  inputMode="numeric"
                  placeholder="30"
                  {...register('delay_minutes')}
                  className={errors.delay_minutes ? 'border-[hsl(var(--destructive))]' : ''}
                />
              </FormField>
            )}

            <FormField label="Ghi chú" htmlFor="incident-note" error={errors.note?.message}>
              <Textarea id="incident-note" rows={3} placeholder="Mô tả ngắn gọn tình hình..." {...register('note')} />
            </FormField>

            <label
              htmlFor="notify_passengers"
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[hsl(var(--border))] p-3"
            >
              <input
                id="notify_passengers"
                type="checkbox"
                {...register('notify_passengers')}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="font-medium">Gửi email báo khách trên chuyến</span>
                <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                  Mỗi hóa đơn nhận một email (bỏ qua khách tạo tại quầy không có email thật).
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi báo cáo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
