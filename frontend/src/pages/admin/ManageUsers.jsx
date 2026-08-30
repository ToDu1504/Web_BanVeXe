import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { userApi } from '@/api/userApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import PageHeader from '@/components/common/PageHeader'
import TableSkeleton from '@/components/common/TableSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { Pagination } from '@/components/ui/pagination'
import { Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { fadeInUp } from '@/lib/motionVariants'
import { cn } from '@/lib/utils'

const roleFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'admin', label: 'Quản trị viên' },
]

const roleSelectTone = {
  customer: '',
  staff: 'text-[hsl(var(--primary))]',
  admin: 'text-[hsl(var(--destructive))]',
}

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await userApi.getAll({ page, limit: 10, search: debouncedSearch || undefined, role: roleFilter })
      setUsers(res.data)
      setPagination(res.pagination)
    } catch (error) {
      toast.error('Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, debouncedSearch, roleFilter])

  const handleRoleChange = async (id, newRole) => {
    try {
      await userApi.updateRole(id, newRole)
      toast.success('Cập nhật quyền hạn tài khoản thành công!')
      // Update local state directly to prevent full reload
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, role: newRole } : u))
      )
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật vai trò')
    }
  }

  const handleStatusToggle = async (id, currentStatus) => {
    const nextStatus = !currentStatus
    try {
      await userApi.updateStatus(id, nextStatus)
      toast.success(`${nextStatus ? 'Kích hoạt' : 'Khóa'} tài khoản thành công!`)
      // Update local state directly
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, is_active: nextStatus } : u))
      )
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái')
    }
  }

  const handleDeleteUser = async (id) => {
    try {
      await userApi.delete(id)
      toast.success('Xóa tài khoản thành công!')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa tài khoản')
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">

      <PageHeader
        title="Quản Lý Tài Khoản Thành Viên"
        description="Phân quyền vai trò (Admin, Nhân viên, Khách hàng) và bật/tắt hoạt động của tài khoản."
      />

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardHeader className="flex-col items-start gap-4 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Tìm theo tên, email hoặc SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {roleFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRoleFilter(f.value)}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium shadow-sm transition-colors',
                  roleFilter === f.value
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.7)]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thành viên</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Email đăng ký</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-xs flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-bold text-xs">
                          {u.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{u.full_name}</span>
                    </TableCell>
                    <TableCell className="text-xs">{u.phone || 'Chưa cung cấp'}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                      >
                        <SelectTrigger className={cn('w-36 h-8 text-xs font-medium', roleSelectTone[u.role])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Khách hàng</SelectItem>
                          <SelectItem value="staff">Nhân viên</SelectItem>
                          <SelectItem value="admin">Quản trị viên</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={u.is_active}
                          onCheckedChange={() => handleStatusToggle(u.id, u.is_active)}
                        />
                        <span
                          className={cn(
                            'text-[10px] font-semibold',
                            u.is_active ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
                          )}
                        >
                          {u.is_active ? 'Hoạt động' : 'Đang khóa'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa tài khoản {u.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Hành động này sẽ xóa vĩnh viễn tài khoản khỏi hệ thống và không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Đóng</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(u.id)}>
                              Xác nhận xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Users} title="Không tìm thấy thành viên nào phù hợp." />
          )}
          <Pagination pagination={pagination} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>

    </motion.div>
  )
}
