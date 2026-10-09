import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sun, Moon, Menu, LogOut, User as UserIcon, Ticket, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/api/authApi'
import logo from '@/assets/logo.png'

export default function Navbar() {
  const { user, isAuthenticated, logoutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authApi.logout()
      logoutUser()
      toast.success('Đăng xuất thành công!')
      navigate('/')
    } catch (error) {
      toast.error('Có lỗi xảy ra khi đăng xuất')
    }
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center hover:opacity-90">
          <img src={logo} alt="Đặt Vé Xe Khách" className="h-12 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium hover:text-[hsl(var(--primary))] transition-colors">
            Tìm chuyến xe
          </Link>
          {isAuthenticated && user?.role === 'customer' && (
            <Link to="/customer/invoices" className="text-sm font-medium hover:text-[hsl(var(--primary))] transition-colors">
              Vé của tôi
            </Link>
          )}
          {isAuthenticated && user?.role === 'driver' && (
            <Link to="/driver/trips" className="text-sm font-medium text-[hsl(var(--primary))] hover:opacity-95 transition-colors flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Lịch chạy
            </Link>
          )}
          {isAuthenticated && (user?.role === 'staff' || user?.role === 'admin') && (
            <Link to={user.role === 'admin' ? '/admin/dashboard' : '/staff/invoices'} className="text-sm font-medium text-[hsl(var(--primary))] hover:opacity-95 transition-colors flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Quản trị
            </Link>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* User Auth Info */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-9 w-9 border border-[hsl(var(--border))]">
                  <AvatarFallback className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                    <p className="text-xs leading-none text-[hsl(var(--muted-foreground))]">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/customer/profile')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Tài khoản</span>
                </DropdownMenuItem>
                {user?.role === 'customer' && (
                  <DropdownMenuItem onClick={() => navigate('/customer/invoices')}>
                    <Ticket className="mr-2 h-4 w-4" />
                    <span>Lịch sử đặt vé</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-[hsl(var(--destructive))] focus:bg-[hsl(var(--destructive)/0.1)] focus:text-[hsl(var(--destructive))]">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate('/login')}>Đăng nhập</Button>
              <Button onClick={() => navigate('/register')} variant="accent">Đăng ký</Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
