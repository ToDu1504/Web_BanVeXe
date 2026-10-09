import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { userApi } from '@/api/userApi'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PHONE_REGEX = /^(0[3|5|7|8|9])+([0-9]{8})$/

const userSchema = zod.object({
  full_name: zod.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: zod.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
  phone: zod.string().refine((v) => !v || PHONE_REGEX.test(v), 'Số điện thoại không đúng định dạng Việt Nam'),
  password: zod.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  role: zod.enum(['driver', 'staff', 'customer', 'admin']),
})

const defaultValues = { full_name: '', email: '', phone: '', password: '', role: 'driver' }

// Admin tạo tài khoản trực tiếp (tài xế, nhân viên...) — gọi POST /api/users.
export default function CreateUserDialog({ open, onOpenChange, onCreated }) {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(userSchema), defaultValues })

  useEffect(() => {
    if (open) reset(defaultValues)
  }, [open, reset])

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const { phone, ...rest } = data
      await userApi.create(phone ? { ...rest, phone } : rest)
      toast.success('Tạo tài khoản thành công!')
      onCreated?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tạo tài khoản')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name) => ({
    ...register(name),
    className: errors[name] ? 'border-[hsl(var(--destructive))]' : '',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm tài khoản</DialogTitle>
          <DialogDescription>Tạo tài khoản tài xế, nhân viên... không cần đăng ký qua trang chủ.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="my-3 space-y-4 text-sm">
            <FormField label="Vai trò" htmlFor="new-user-role">
              <Select value={watch('role')} onValueChange={(val) => setValue('role', val)}>
                <SelectTrigger id="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Tài xế</SelectItem>
                  <SelectItem value="staff">Nhân viên</SelectItem>
                  <SelectItem value="customer">Khách hàng</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Họ tên" htmlFor="new-user-name" error={errors.full_name?.message}>
              <Input id="new-user-name" placeholder="Nguyễn Văn A" {...field('full_name')} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email" htmlFor="new-user-email" error={errors.email?.message}>
                <Input id="new-user-email" type="email" placeholder="taixe@domain.com" {...field('email')} />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="new-user-phone" error={errors.phone?.message}>
                <Input id="new-user-phone" placeholder="09xxxxxxxx" {...field('phone')} />
              </FormField>
            </div>
            <FormField label="Mật khẩu" htmlFor="new-user-password" error={errors.password?.message}>
              <Input id="new-user-password" type="password" placeholder="Tối thiểu 6 ký tự" {...field('password')} />
            </FormField>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tạo tài khoản'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
