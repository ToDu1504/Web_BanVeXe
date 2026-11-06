import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/authApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { CardContent, CardFooter } from '@/components/ui/card'
import AuthLayout from '@/components/common/AuthLayout'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react'

const loginSchema = zod.object({
  email: zod.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
  password: zod.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})

export default function Login() {
  const { loginUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Redirect destination
  const from = location.state?.from?.pathname || '/'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const response = await authApi.login(data)
      loginUser(response.user)
      toast.success('Đăng nhập thành công!')

      // Redirect depending on user role
      if (response.user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else if (response.user.role === 'staff') {
        navigate('/staff/invoices', { replace: true })
      } else if (response.user.role === 'driver') {
        navigate('/driver/trips', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Email hoặc mật khẩu không chính xác'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      description="Đăng nhập để đặt vé xe và quản lý vé dễ dàng hơn"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-[hsl(var(--foreground))] hover:underline">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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

          <div className="relative">
            <Link
              to="/forgot-password"
              className="absolute right-0 top-0 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:underline"
            >
              Quên mật khẩu?
            </Link>
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
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>
        </CardFooter>
      </form>
    </AuthLayout>
  )
}
