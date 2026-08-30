import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
  Repeat,
} from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/api/authApi'
import logoIcon from '@/assets/logo-icon.png'

// Danh sách menu item cho sidebar — chia sẻ chung giữa desktop và mobile drawer.
function SidebarNav({ items, activePath, collapsed, onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activePath === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

// Khối theme-toggle + đăng xuất — dùng chung cho cả sidebar desktop và mobile drawer.
function SidebarFooterActions({ theme, toggleTheme, onLogout, collapsed }) {
  return (
    <>
      <Button
        variant="ghost"
        onClick={toggleTheme}
        className="w-full justify-start text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
      >
        {theme === 'dark' ? (
          <>
            <Sun className="h-4 w-4 mr-2" />
            {!collapsed && <span>Giao diện sáng</span>}
          </>
        ) : (
          <>
            <Moon className="h-4 w-4 mr-2" />
            {!collapsed && <span>Giao diện tối</span>}
          </>
        )}
      </Button>
      <Button
        variant="ghost"
        onClick={onLogout}
        className="w-full justify-start text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {!collapsed && <span>Đăng xuất</span>}
      </Button>
    </>
  )
}

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
      title: 'Mẫu chuyến lặp lại',
      path: '/admin/trip-templates',
      icon: Repeat,
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
      roles: ['staff', 'admin'],
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
            <Link to="/" className="flex items-center space-x-2 text-[hsl(var(--foreground))] font-bold text-lg">
              <img src={logoIcon} alt="" className="h-6 w-auto" />
              <span>Đặt Vé Xe Khách Admin</span>
            </Link>
          )}
          {isCollapsed && (
            <Link to="/" className="mx-auto">
              <img src={logoIcon} alt="Đặt Vé Xe Khách Admin" className="h-6 w-auto" />
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
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold">
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

        <SidebarNav items={menuItems} activePath={location.pathname} collapsed={isCollapsed} />

        {/* Footer actions */}
        <div className="p-2 border-t border-[hsl(var(--border))] space-y-1">
          <SidebarFooterActions
            theme={theme}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
            collapsed={isCollapsed}
          />
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
            <Link to="/" className="text-xs md:text-sm font-medium hover:text-[hsl(var(--accent))] transition-colors">
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
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="w-64 h-full bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex flex-col p-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-10 items-center justify-between border-b border-[hsl(var(--border))] pb-2">
                <span className="font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <img src={logoIcon} alt="" className="h-5 w-auto" />
                  Đặt Vé Xe Khách Admin
                </span>
              </div>
              <SidebarNav
                items={menuItems}
                activePath={location.pathname}
                collapsed={false}
                onNavigate={() => setIsMobileOpen(false)}
              />
              <div className="border-t border-[hsl(var(--border))] pt-4 space-y-2">
                <SidebarFooterActions
                  theme={theme}
                  toggleTheme={toggleTheme}
                  onLogout={() => {
                    handleLogout()
                    setIsMobileOpen(false)
                  }}
                  collapsed={false}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
