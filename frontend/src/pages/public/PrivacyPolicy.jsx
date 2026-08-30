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

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Chính Sách Bảo Mật" lastUpdated="31/07/2026">
      <Section>
        <h2 className="text-xl font-semibold tracking-tight">1. Thông tin thu thập</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-[hsl(var(--muted-foreground))]">
          <li>Thông tin tài khoản: họ tên, email, số điện thoại, mật khẩu (đã mã hoá).</li>
          <li>Thông tin hành khách khai báo khi đặt vé: họ tên, số điện thoại của từng hành khách trên vé.</li>
          <li>Thông tin đặt vé và thanh toán: chuyến xe, ghế đã chọn, hóa đơn, trạng thái thanh toán.</li>
        </ul>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">2. Mục đích sử dụng</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Thông tin thu thập được sử dụng để: xử lý việc đặt vé và xuất vé, xác thực đăng nhập, xử lý thanh
          toán qua cổng MoMo, liên hệ hỗ trợ khách hàng khi có sự cố về chuyến đi, và cải thiện chất lượng
          dịch vụ. Hệ thống không sử dụng thông tin cá nhân cho mục đích quảng cáo bên thứ ba.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">3. Cách thức bảo mật</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-[hsl(var(--muted-foreground))]">
          <li>Mật khẩu được mã hoá một chiều (bcrypt) trước khi lưu trữ, hệ thống không thể xem lại mật khẩu gốc.</li>
          <li>Phiên đăng nhập sử dụng JWT lưu trong HttpOnly Cookie, hạn chế nguy cơ bị đánh cắp qua kịch bản độc hại trên trình duyệt.</li>
          <li>Hệ thống không lưu trữ thông tin thẻ ngân hàng hay tài khoản ví MoMo của khách hàng — toàn bộ bước thanh toán diễn ra trên cổng thanh toán của MoMo.</li>
        </ul>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">4. Chia sẻ thông tin với bên thứ ba</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Thông tin chỉ được chia sẻ với cổng thanh toán MoMo trong trường hợp khách hàng chủ động chọn hình
          thức thanh toán MoMo, ở mức tối thiểu cần thiết để khởi tạo và xác nhận giao dịch (mã hóa đơn, số
          tiền). Hệ thống không bán hoặc trao đổi thông tin cá nhân của khách hàng cho bất kỳ bên thứ ba nào
          khác.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">5. Quyền của người dùng</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Khách hàng có thể xem và cập nhật thông tin cá nhân bất kỳ lúc nào tại trang Hồ Sơ Cá Nhân, hoặc yêu
          cầu hỗ trợ chỉnh sửa/xoá dữ liệu qua kênh liên hệ bên dưới.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold tracking-tight">6. Liên hệ</h2>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ hotline 1900 1234 hoặc email
          support@datvexekhach.vn.
        </p>
      </Section>
    </LegalPageLayout>
  )
}
