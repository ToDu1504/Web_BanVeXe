import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Loader2, Mail, MailCheck } from 'lucide-react'

const forgotSchema = zod.object({
  email: zod.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
})

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  // Sau khi gửi chỉ hiện thông báo chung của server — không tiết lộ email có tồn tại hay không.
  const [sentMessage, setSentMessage] = useState('')

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }) => {
    setLoading(true)
    try {
      const response = await authApi.forgotPassword(email)
      setSentMessage(response.message)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Quên mật khẩu"
      description="Nhập email đã đăng ký, chúng tôi sẽ gửi link để bạn đặt mật khẩu mới"
      footer={
        <>
          Đã nhớ mật khẩu?{' '}
          <Link to="/login" className="font-semibold text-[hsl(var(--foreground))] hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      {sentMessage ? (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4 text-sm">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
            <p>{sentMessage}</p>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Không nhận được email sau vài phút? Bạn có thể gửi lại cho <b>{getValues('email')}</b>.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSentMessage('')}>
            Gửi lại
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@domain.com"
                  autoFocus
                  {...register('email')}
                  className={`pl-9 ${errors.email ? 'border-[hsl(var(--destructive))]' : ''}`}
                />
              </div>
            </FormField>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi link đặt lại mật khẩu'
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </AuthLayout>
  )
}
