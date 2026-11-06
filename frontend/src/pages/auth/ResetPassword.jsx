import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import { Loader2, Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react'

const resetSchema = zod.object({
  newPassword: zod.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: zod.string().min(6, 'Xác nhận mật khẩu không được để trống'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
})

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const isTokenWellFormed = /^[0-9a-f]{64}$/i.test(token)
  const navigate = useNavigate()
  const { isAuthenticated, logoutUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async ({ newPassword }) => {
    setLoading(true)
    try {
      const response = await authApi.resetPassword({ token, newPassword })
      // Server đã vô hiệu mọi phiên cũ — dọn trạng thái đăng nhập phía client nếu còn.
      if (isAuthenticated) logoutUser()
      toast.success(response.message)
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const passwordInput = (name, id, placeholder) => (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        {...register(name)}
        className={`pl-9 pr-10 ${errors[name] ? 'border-[hsl(var(--destructive))]' : ''}`}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      description="Chọn mật khẩu mới cho tài khoản của bạn"
      footer={
        <Link to="/login" className="font-semibold text-[hsl(var(--foreground))] hover:underline">
          Quay lại đăng nhập
        </Link>
      }
    >
      {!isTokenWellFormed ? (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--destructive))]" />
            <p>Link đặt lại mật khẩu không hợp lệ. Hãy mở đúng link trong email hoặc yêu cầu link mới.</p>
          </div>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Yêu cầu link mới</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField label="Mật khẩu mới" htmlFor="newPassword" error={errors.newPassword?.message}>
              {passwordInput('newPassword', 'newPassword', '••••••••')}
            </FormField>
            <FormField label="Xác nhận mật khẩu mới" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
              {passwordInput('confirmPassword', 'confirmPassword', '••••••••')}
            </FormField>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </Button>
            <Link to="/forgot-password" className="text-sm text-[hsl(var(--muted-foreground))] hover:underline">
              Link hết hạn? Yêu cầu link mới
            </Link>
          </CardFooter>
        </form>
      )}
    </AuthLayout>
  )
}
