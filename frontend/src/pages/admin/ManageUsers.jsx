import React, { useEffect, useState } from 'react'
import { userApi } from '@/api/userApi'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Trash2, Users, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await userApi.getAll()
      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      toast.error('Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on query search
  useEffect(() => {
    const q = searchQuery.toLowerCase()
    const result = users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
    )
    setFilteredUsers(result)
  }, [searchQuery, users])

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
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return

    try {
      await userApi.delete(id)
      toast.success('Xóa tài khoản thành công!')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa tài khoản')
    }
  }

  const roleLabels = {
    customer: 'Khách hàng',
    staff: 'Nhân viên',
    admin: 'Quản trị viên',
  }

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Quản Lý Tài Khoản Thành Viên</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Phân quyền vai trò (Admin, Nhân viên, Khách hàng) và bật/tắt hoạt động của tài khoản.</p>
      </div>

      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardHeader className="pb-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Tìm theo tên, email hoặc SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredUsers.length > 0 ? (
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
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-xs flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-bold text-xs">
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
                        <SelectTrigger className="w-36 h-8 text-xs">
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
                        <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                          {u.is_active ? 'Hoạt động' : 'Đang khóa'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(u.id)}
                        className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              Không tìm thấy thành viên nào phù hợp.
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
