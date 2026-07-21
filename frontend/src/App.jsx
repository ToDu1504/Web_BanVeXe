import React, { useEffect, useState } from 'react'
import AppRouter from '@/router/AppRouter'
import { authApi } from '@/api/authApi'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export default function App() {
  const { loginUser, logoutUser } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuthSession = async () => {
      try {
        const data = await authApi.getMe()
        if (data && data.user) {
          loginUser(data.user)
        } else {
          logoutUser()
        }
      } catch (error) {
        // Safe to ignore on load - just means not logged in
        logoutUser()
      } finally {
        setLoading(false)
      }
    }

    checkAuthSession()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Đang tải ứng dụng...</p>
        </div>
      </div>
    )
  }

  return <AppRouter />
}
