import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Footer() {
  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <img src={logo} alt="Đặt Vé Xe Khách" className="h-12 w-auto" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Hệ thống bán vé xe khách trực tuyến hàng đầu Việt Nam. Mang lại
              trải nghiệm đặt vé nhanh chóng, an toàn và tiện lợi nhất.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Liên kết nhanh
            </h4>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li>
                <a
                  href="/"
                  className="hover:text-[hsl(var(--accent))] transition-colors"
                >
                  Tìm chuyến xe
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  className="hover:text-[hsl(var(--accent))] transition-colors"
                >
                  Đăng nhập
                </a>
              </li>
              <li>
                <a
                  href="/register"
                  className="hover:text-[hsl(var(--accent))] transition-colors"
                >
                  Đăng ký
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Chính sách
            </h4>
            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li>
                <a
                  href="/terms"
                  className="hover:text-[hsl(var(--accent))] transition-colors"
                >
                  Điều khoản sử dụng
                </a>
              </li>
              <li>
                <a
                  href="/privacy-policy"
                  className="hover:text-[hsl(var(--accent))] transition-colors"
                >
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a
                  href="/cancellation-policy"
                  className="hover:text-[hsl(var(--accent))] transition-colors"
                >
                  Quy chế hủy vé
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Liên hệ
            </h4>
            <div className="flex items-center space-x-2 text-sm text-[hsl(var(--muted-foreground))]">
              <Phone className="h-4 w-4" />
              <span>1900 1234</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-[hsl(var(--muted-foreground))]">
              <Mail className="h-4 w-4" />
              <span>support@datvexekhach.vn</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-[hsl(var(--muted-foreground))]">
              <MapPin className="h-4 w-4" />
              <span>Phó Cơ Điều, TP.HCM, Việt Nam</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[hsl(var(--border))] pt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} Đặt Vé Xe Khách. All rights reserved.
          Built with premium design standards.
        </div>
      </div>
    </footer>
  );
}
