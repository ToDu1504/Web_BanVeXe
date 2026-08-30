import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Clock, Headset } from 'lucide-react'
import { fadeInUp } from '@/lib/motionVariants'
import authHero from '@/assets/auth-hero.jpg'
import logo from '@/assets/logo.png'

const highlights = [
  { icon: ShieldCheck, text: 'Thanh toán và đặt chỗ an toàn' },
  { icon: Clock, text: 'Giữ ghế theo thời gian thực, không trùng ghế' },
  { icon: Headset, text: 'Hỗ trợ khách hàng 24/7' },
]

// Shell dùng chung cho Login/Register — panel thương hiệu bên trái + form bên phải trên desktop,
// rút gọn về 1 cột (chỉ hiện form) trên mobile.
export default function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8 sm:py-12">
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeInUp}
        className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl lg:grid-cols-2"
      >
        {/* Panel thương hiệu — chỉ hiện từ lg trở lên */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[hsl(var(--primary))] p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-[hsl(var(--accent))]/20 blur-3xl" />

          <div className="relative z-10">
            <Link to="/" className="mb-10 inline-flex w-fit items-center rounded-lg bg-white/95 px-3 py-2 shadow-md">
              <img src={logo} alt="Đặt Vé Xe Khách" className="h-7 w-auto" />
            </Link>
            <h1 className="max-w-xs text-3xl font-bold leading-tight text-balance">
              Lên xe, việc còn lại để chúng tôi lo.
            </h1>
            <p className="mt-4 max-w-xs text-sm text-white/80">
              Tìm chuyến, chọn ghế và thanh toán chỉ trong vài bước — mọi lúc, mọi nơi.
            </p>

            <ul className="mt-8 space-y-3">
              {highlights.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-10 h-40 overflow-hidden rounded-xl shadow-lg">
            <img src={authHero} alt="Xe khách trên đường ven biển" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-[hsl(var(--primary))]/90 via-transparent to-transparent" />
          </div>
        </div>

        {/* Form */}
        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:py-12">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-8 flex items-center hover:opacity-80 lg:hidden">
              <img src={logo} alt="Đặt Vé Xe Khách" className="h-12 w-auto" />
            </Link>

            <div className="mb-6 space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              {description && <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>}
            </div>

            {children}

            {footer && <div className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">{footer}</div>}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
