import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/authApi'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Lock, Loader2, Save, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'

const profileSchema = zod.object({
  fullName: zod.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: zod.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại không hợp lệ'),
})

const passwordSchema = zod.object({
  currentPassword: zod.string().min(6, 'Mật khẩu hiện tại phải có ít nhất 6 ký tự'),
  newPassword: zod.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  confirmPassword: zod.string().min(6, 'Xác nhận mật khẩu không được để trống'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu mới xác nhận không khớp',
  path: ['confirmPassword'],
})

export default function Profile() {
  const { user, updateUserInfo } = useAuth()
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.full_name || '',
      phone: user?.phone || '',
    },
  })

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onUpdateProfile = async (data) => {
    setProfileLoading(true)
    try {
      const response = await authApi.updateProfile({
        full_name: data.fullName,
        phone: data.phone,
      })
      updateUserInfo(response.user)
      toast.success('Cập nhật thông tin cá nhân thành công!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật thông tin')
    } finally {
      setProfileLoading(false)
    }
  }

  const onChangePassword = async (data) => {
    setPasswordLoading(true)
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('Thay đổi mật khẩu thành công!')
      resetPasswordForm()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mật khẩu hiện tại không chính xác')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div initial="hidden" animate="show" variants={fadeInUp}>
      <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] mb-6 flex items-center gap-2">
        <User className="h-6 w-6 text-[hsl(var(--primary))]" />
        Cài Đặt Tài Khoản
      </h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 font-medium text-sm">
            <User className="h-4 w-4" /> Thông tin cá nhân
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-1.5 font-medium text-sm">
            <Lock className="h-4 w-4" /> Đổi mật khẩu
          </TabsTrigger>
        </TabsList>

        {/* Profile Details Tab */}
        <TabsContent value="profile">
          <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <CardHeader>
              <CardTitle>Thông tin tài khoản</CardTitle>
              <CardDescription>
                Cập nhật họ tên và số điện thoại của bạn.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitProfile(onUpdateProfile)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email (Readonly) */}
                  <FormField label="Địa chỉ Email (Không thể thay đổi)" htmlFor="email" className="md:col-span-2">
                    <Input id="email" type="email" value={user?.email || ''} disabled className="bg-[hsl(var(--muted)/0.5)]" />
                  </FormField>

                  {/* Full Name */}
                  <FormField label="Họ và tên" htmlFor="fullName" error={profileErrors.fullName?.message}>
                    <Input
                      id="fullName"
                      placeholder="Nguyễn Văn A"
                      {...registerProfile('fullName')}
                      className={profileErrors.fullName ? 'border-[hsl(var(--destructive))]' : ''}
                    />
                  </FormField>

                  {/* Phone Number */}
                  <FormField label="Số điện thoại" htmlFor="phone" error={profileErrors.phone?.message}>
                    <Input
                      id="phone"
                      placeholder="0987654321"
                      {...registerProfile('phone')}
                      className={profileErrors.phone ? 'border-[hsl(var(--destructive))]' : ''}
                    />
                  </FormField>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t border-[hsl(var(--border))] pt-6 bg-[hsl(var(--muted)/0.3)] rounded-b-xl">
                <Button type="submit" disabled={profileLoading} className="font-semibold">
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lưu thay đổi...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Lưu thông tin
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Change Password Tab */}
        <TabsContent value="password">
          <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <CardHeader>
              <CardTitle>Đổi mật khẩu bảo mật</CardTitle>
              <CardDescription>
                Nhập mật khẩu cũ và đặt mật khẩu mới để bảo vệ tài khoản.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitPassword(onChangePassword)}>
              <CardContent className="space-y-4">
                <FormField label="Mật khẩu hiện tại" htmlFor="currentPassword" error={passwordErrors.currentPassword?.message}>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    {...registerPassword('currentPassword')}
                    className={passwordErrors.currentPassword ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>

                <FormField label="Mật khẩu mới" htmlFor="newPassword" error={passwordErrors.newPassword?.message}>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    {...registerPassword('newPassword')}
                    className={passwordErrors.newPassword ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>

                <FormField label="Xác nhận mật khẩu mới" htmlFor="confirmPassword" error={passwordErrors.confirmPassword?.message}>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...registerPassword('confirmPassword')}
                    className={passwordErrors.confirmPassword ? 'border-[hsl(var(--destructive))]' : ''}
                  />
                </FormField>
              </CardContent>
              <CardFooter className="justify-end border-t border-[hsl(var(--border))] pt-6 bg-[hsl(var(--muted)/0.3)] rounded-b-xl">
                <Button type="submit" disabled={passwordLoading} className="font-semibold">
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" /> Đổi mật khẩu
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
    </div>
  )
}
