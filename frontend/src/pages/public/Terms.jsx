import React from 'react'
import { motion } from 'framer-motion'

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-3xl"
      >
        <h1 className="text-3xl font-bold text-[hsl(var(--primary))]">Điều Khoản Sử Dụng</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Cập nhật lần cuối: 31/07/2026</p>

        <div className="mt-8 space-y-8 text-[hsl(var(--foreground))]">
          <section>
            <h2 className="text-xl font-semibold">1. Phạm vi áp dụng</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Điều khoản này áp dụng cho mọi tài khoản Khách Hàng, Nhân Viên và Quản Trị Viên khi sử dụng hệ thống
              Đặt Vé Xe Khách để tra cứu, đặt vé và quản lý các chuyến xe khách. Bằng việc tạo tài khoản hoặc thực
              hiện đặt vé, bạn xác nhận đã đọc và đồng ý với các điều khoản dưới đây.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Tài khoản người dùng</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Bạn có trách nhiệm cung cấp thông tin đăng ký chính xác (họ tên, email, số điện thoại) và bảo mật
              mật khẩu của mình. Mọi hoạt động thực hiện dưới tài khoản của bạn được xem là do chính bạn thực hiện.
              Nếu phát hiện tài khoản bị truy cập trái phép, vui lòng đổi mật khẩu ngay và liên hệ bộ phận hỗ trợ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Quy định đặt vé</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-[hsl(var(--muted-foreground))]">
              <li>Mỗi lượt đặt vé tạo ra một hóa đơn, có thể gồm nhiều vé (mỗi vé ứng với một ghế trên một chuyến xe).</li>
              <li>Thông tin hành khách (họ tên, số điện thoại) khai báo khi đặt vé phải chính xác để phục vụ việc lên xe và hỗ trợ khi cần thiết.</li>
              <li>Một ghế trên một chuyến xe chỉ có thể thuộc về một vé tại một thời điểm — hệ thống tự động ngăn chặn tình trạng đặt trùng ghế.</li>
              <li>Vé chỉ có giá trị cho đúng chuyến xe, ngày giờ khởi hành và số ghế đã đặt.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Trách nhiệm của các bên</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Hệ thống nỗ lực đảm bảo thông tin chuyến xe, giá vé và tình trạng ghế được cập nhật chính xác tại
              thời điểm hiển thị. Khách hàng có trách nhiệm kiểm tra kỹ thông tin trước khi xác nhận thanh toán.
              Việc hủy vé, hủy hóa đơn thực hiện theo{' '}
              <a href="/cancellation-policy" className="text-[hsl(var(--primary))] underline underline-offset-2">
                Quy Chế Hủy Vé
              </a>{' '}
              của hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Thay đổi điều khoản</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Điều khoản sử dụng có thể được cập nhật theo thời gian để phù hợp với thay đổi của hệ thống hoặc quy
              định pháp luật. Phiên bản mới nhất luôn được đăng tải tại trang này.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Liên hệ</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Mọi thắc mắc về điều khoản sử dụng, vui lòng liên hệ hotline 1900 1234 hoặc email
              support@datvexekhach.vn.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
