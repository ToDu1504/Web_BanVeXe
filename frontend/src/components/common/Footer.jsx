import React from 'react'
import { Bus, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2 text-[hsl(var(--primary))] font-bold text-xl">
              <Bus className="h-6 w-6 stroke-[2.5]" />
              <span>VexereBus</span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Hệ thống bán vé xe khách trực tuyến hàng đầu Việt Nam. Mang lại trải nghiệm đặt vé nhanh chóng, an toàn và tiện lợi nhất.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li><a href="/" className="hover:text-[hsl(var(--primary))] transition-colors">Tìm chuyến xe</a></li>
              <li><a href="/login" className="hover:text-[hsl(var(--primary))] transition-colors">Đăng nhập</a></li>
              <li><a href="/register" className="hover:text-[hsl(var(--primary))] transition-colors">Đăng ký</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Chính sách</h4>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li><span className="cursor-pointer hover:text-[hsl(var(--primary))] transition-colors">Điều khoản sử dụng</span></li>
              <li><span className="cursor-pointer hover:text-[hsl(var(--primary))] transition-colors">Chính sách bảo mật</span></li>
              <li><span className="cursor-pointer hover:text-[hsl(var(--primary))] transition-colors">Quy chế hủy vé</span></li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Liên hệ</h4>
            <div className="flex items-center space-x-2 text-sm text-[hsl(var(--muted-foreground))]">
              <Phone className="h-4 w-4" />
              <span>1900 1234</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-[hsl(var(--muted-foreground))]">
              <Mail className="h-4 w-4" />
              <span>support@vexerebus.vn</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-[hsl(var(--muted-foreground))]">
              <MapPin className="h-4 w-4" />
              <span>Đống Đa, Hà Nội, Việt Nam</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[hsl(var(--border))] pt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} VexereBus. All rights reserved. Built with premium design standards.
        </div>
      </div>
    </footer>
  )
}
