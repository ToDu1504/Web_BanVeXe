import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Route as RouteIcon,
  CalendarDays,
  Bus as BusIcon,
  Users,
  FileSpreadsheet,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  Ticket,
} from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/api/authApi'

export default function AdminLayout({ children }) {
  const { user, logoutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

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

  const menuItems = [
    {
      title: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: ['admin'],
    },
    {
      title: 'Quản lý Tuyến xe',
      path: '/admin/routes',
      icon: RouteIcon,
      roles: ['admin'],
    },
    {
      title: 'Quản lý Chuyến xe',
      path: '/admin/trips',
      icon: CalendarDays,
      roles: ['admin'],
    },
    {
      title: 'Quản lý Phương tiện',
      path: '/admin/vehicles',
      icon: BusIcon,
      roles: ['admin'],
    },
    {
      title: 'Quản lý Người dùng',
      path: '/admin/users',
      icon: Users,
      roles: ['admin'],
    },
    {
      title: 'Quản lý Hóa đơn',
      path: '/staff/invoices',
      icon: FileSpreadsheet,
      roles: ['staff', 'admin'],
    },
    {
      title: 'Đặt vé hộ khách',
      path: '/',
      icon: Ticket,
      roles: ['staff'],
    },
    {
      title: 'Xem chuyến xe',
      path: '/staff/trips',
      icon: CalendarDays,
      roles: ['staff', 'admin'],
    },
    {
      title: 'Tra cứu Tuyến xe',
      path: '/staff/routes',
      icon: RouteIcon,
      roles: ['staff', 'admin'],
    },
    {
      title: 'Tra cứu Xe khách',
      path: '/staff/vehicles',
      icon: BusIcon,
      roles: ['staff', 'admin'],
    },
    {
      title: 'Thống kê doanh thu',
      path: '/staff/stats',
      icon: BarChart3,
      roles: ['staff', 'admin'],
    },
  ].filter((item) => item.roles.includes(user?.role))

  const activeItem = menuItems.find((item) => location.pathname === item.path) || menuItems[0]

  return (
    <div className="flex h-screen w-full bg-[hsl(var(--background))] overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-[hsl(var(--border))]">
          {!isCollapsed && (
            <Link to="/" className="flex items-center space-x-2 text-[hsl(var(--primary))] font-bold text-lg">
              <BusIcon className="h-5 w-5 stroke-[2.5]" />
              <span>VexereBus Admin</span>
            </Link>
          )}
          {isCollapsed && (
            <Link to="/" className="mx-auto text-[hsl(var(--primary))] font-bold">
              <BusIcon className="h-5 w-5 stroke-[2.5]" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex h-7 w-7 rounded-md"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* User profile brief */}
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center space-x-3">
          <Avatar className="h-9 w-9 bg-[hsl(var(--primary))] text-white">
            <AvatarFallback className="bg-[hsl(var(--primary))] text-white font-bold">
              {user?.full_name?.charAt(0).toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.full_name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{user?.role}</p>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-2 border-t border-[hsl(var(--border))] space-y-1">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="w-full justify-start text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 mr-2" />
                {!isCollapsed && <span>Giao diện sáng</span>}
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2" />
                {!isCollapsed && <span>Giao diện tối</span>}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Topbar for mobile and headers */}
        <header className="flex h-16 items-center justify-between border-b border-[hsl(var(--border))] px-4 bg-[hsl(var(--card))]">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-md font-semibold md:text-lg">
              {activeItem?.title || 'Quản trị'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xs md:text-sm font-medium hover:text-[hsl(var(--primary))] transition-colors">
              Xem trang chủ
            </Link>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[hsl(var(--background))]">
          {children}
        </main>
      </div>

      {/* Mobile Drawer (Menu) overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-64 h-full bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex flex-col p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 items-center justify-between border-b border-[hsl(var(--border))] pb-2">
              <span className="font-bold text-[hsl(var(--primary))] flex items-center gap-2">
                <BusIcon className="h-5 w-5" />
                VexereBus Admin
              </span>
            </div>
            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-[hsl(var(--border))] pt-4 space-y-2">
              <Button
                variant="ghost"
                onClick={() => {
                  toggleTheme()
                  setIsMobileOpen(false)
                }}
                className="w-full justify-start text-[hsl(var(--muted-foreground))]"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                Toggle Theme
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  handleLogout()
                  setIsMobileOpen(false)
                }}
                className="w-full justify-start text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
