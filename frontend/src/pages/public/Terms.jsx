import React from 'react'
import { motion } from 'framer-motion'
import LegalPageLayout from '@/components/common/LegalPageLayout'
import { fadeInUp } from '@/lib/motionVariants'

const Section = ({ children }) => (
  <motion.section
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: '-80px' }}
    variants={fadeInUp}
  >
    {children}
  </motion.section>
)

export default function Terms() {
  return (
    <LegalPageLayout title="Điều Khoản Sử Dụng" lastUpdated="31/07/2026">
      <Section>
        <h2 className="text-xl font-semibold tracking-tight">1. Phạm vi áp dụng</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Điều khoản này áp dụng cho mọi tài khoản Khách Hàng, Nhân Viên và Quản Trị Viên khi sử dụng hệ thống
          Đặt Vé Xe Khách để tra cứu, đặt vé và quản lý các chuyến xe khách. Bằng việc tạo tài khoản hoặc thực
          hiện đặt vé, bạn xác nhận đã đọc và đồng ý với các điều khoản dưới đây.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">2. Tài khoản người dùng</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Bạn có trách nhiệm cung cấp thông tin đăng ký chính xác (họ tên, email, số điện thoại) và bảo mật
          mật khẩu của mình. Mọi hoạt động thực hiện dưới tài khoản của bạn được xem là do chính bạn thực hiện.
          Nếu phát hiện tài khoản bị truy cập trái phép, vui lòng đổi mật khẩu ngay và liên hệ bộ phận hỗ trợ.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">3. Quy định đặt vé</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-[hsl(var(--muted-foreground))]">
          <li>Mỗi lượt đặt vé tạo ra một hóa đơn, có thể gồm nhiều vé (mỗi vé ứng với một ghế trên một chuyến xe).</li>
          <li>Thông tin hành khách (họ tên, số điện thoại) khai báo khi đặt vé phải chính xác để phục vụ việc lên xe và hỗ trợ khi cần thiết.</li>
          <li>Một ghế trên một chuyến xe chỉ có thể thuộc về một vé tại một thời điểm — hệ thống tự động ngăn chặn tình trạng đặt trùng ghế.</li>
          <li>Vé chỉ có giá trị cho đúng chuyến xe, ngày giờ khởi hành và số ghế đã đặt.</li>
        </ul>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">4. Trách nhiệm của các bên</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Hệ thống nỗ lực đảm bảo thông tin chuyến xe, giá vé và tình trạng ghế được cập nhật chính xác tại
          thời điểm hiển thị. Khách hàng có trách nhiệm kiểm tra kỹ thông tin trước khi xác nhận thanh toán.
          Việc hủy vé, hủy hóa đơn thực hiện theo{' '}
          <a href="/cancellation-policy" className="text-[hsl(var(--primary))] underline underline-offset-2">
            Quy Chế Hủy Vé
          </a>{' '}
          của hệ thống.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">5. Thay đổi điều khoản</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Điều khoản sử dụng có thể được cập nhật theo thời gian để phù hợp với thay đổi của hệ thống hoặc quy
          định pháp luật. Phiên bản mới nhất luôn được đăng tải tại trang này.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">6. Liên hệ</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Mọi thắc mắc về điều khoản sử dụng, vui lòng liên hệ hotline 1900 1234 hoặc email
          support@datvexekhach.vn.
        </p>
      </Section>
    </LegalPageLayout>
  )
}
