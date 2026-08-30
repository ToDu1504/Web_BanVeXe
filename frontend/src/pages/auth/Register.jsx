import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { authApi } from '@/api/authApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { CardContent, CardFooter } from '@/components/ui/card'
import AuthLayout from '@/components/common/AuthLayout'
import { toast } from 'sonner'
import { Loader2, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react'

const registerSchema = zod.object({
  fullName: zod.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: zod.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
  phone: zod.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại không đúng định dạng Việt Nam'),
  password: zod.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: zod.string().min(6, 'Xác nhận mật khẩu không được để trống'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
})

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authApi.register({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      })
      toast.success('Đăng ký tài khoản thành công! Hãy đăng nhập.')
      navigate('/login')
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Có lỗi xảy ra trong quá trình đăng ký'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Đăng ký tài khoản"
      description="Tạo tài khoản để đặt và quản lý vé xe dễ dàng"
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-[hsl(var(--foreground))] hover:underline">
            Đăng nhập ngay
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <FormField label="Họ và tên" htmlFor="fullName" error={errors.fullName?.message}>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <Input
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                {...register('fullName')}
                className={`pl-9 ${errors.fullName ? 'border-[hsl(var(--destructive))]' : ''}`}
              />
            </div>
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                {...register('email')}
                className={`pl-9 ${errors.email ? 'border-[hsl(var(--destructive))]' : ''}`}
              />
            </div>
          </FormField>

          <FormField label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <Input
                id="phone"
                type="text"
                placeholder="0987654321"
                {...register('phone')}
                className={`pl-9 ${errors.phone ? 'border-[hsl(var(--destructive))]' : ''}`}
              />
            </div>
          </FormField>

          <FormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className={`pl-9 pr-10 ${errors.password ? 'border-[hsl(var(--destructive))]' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>

          <FormField label="Xác nhận mật khẩu" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={`pl-9 pr-10 ${errors.confirmPassword ? 'border-[hsl(var(--destructive))]' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo tài khoản...
              </>
            ) : (
              'Đăng ký'
            )}
          </Button>
        </CardFooter>
      </form>
    </AuthLayout>
  )
}
