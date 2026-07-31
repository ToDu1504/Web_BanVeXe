import React from 'react'
import { motion } from 'framer-motion'

export default function CancellationPolicy() {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-3xl"
      >
        <h1 className="text-3xl font-bold text-[hsl(var(--primary))]">Quy Chế Hủy Vé</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Cập nhật lần cuối: 31/07/2026</p>

        <div className="mt-8 space-y-8 text-[hsl(var(--foreground))]">
          <section>
            <h2 className="text-xl font-semibold">1. Điều kiện hủy vé</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Khách hàng có thể tự hủy vé hoặc hủy toàn bộ hóa đơn tại trang Lịch Sử Hóa Đơn đối với các chuyến xe
              chưa khởi hành. Nhân viên quầy vé và Quản trị viên có thể hủy vé/hóa đơn thay cho khách hàng khi có
              yêu cầu qua hotline hoặc tại quầy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Cơ chế hoàn ghế</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Ngay khi một vé hoặc hóa đơn được hủy, ghế tương ứng được cộng trả lại vào số ghế trống của chuyến
              xe và mở bán lại cho khách hàng khác ngay lập tức. Toàn bộ thao tác hủy được xử lý trong một giao
              dịch duy nhất để đảm bảo số ghế trống luôn chính xác, không xảy ra tình trạng bán trùng ghế.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Hoàn tiền</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-[hsl(var(--muted-foreground))]">
              <li>Hóa đơn thanh toán bằng tiền mặt tại quầy (chưa ghi nhận thanh toán): hủy trực tiếp, không phát sinh hoàn tiền.</li>
              <li>Hóa đơn đã thanh toán thành công qua MoMo: trạng thái hóa đơn được chuyển sang "Đã hoàn tiền", việc hoàn tiền thực tế được nhân viên/quản trị viên xử lý và xác nhận thủ công theo kênh thanh toán tương ứng.</li>
              <li>Thời gian xử lý hoàn tiền dự kiến trong vòng 3-5 ngày làm việc kể từ khi yêu cầu hủy được xác nhận.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Trường hợp không áp dụng hủy vé</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Vé thuộc các chuyến xe đã khởi hành hoặc đã hoàn thành không thể hủy hoặc hoàn tiền qua hệ thống.
              Trường hợp phát sinh sự cố ngoài ý muốn (xe hỏng, hủy chuyến từ phía nhà xe), khách hàng vui lòng
              liên hệ trực tiếp hotline để được hỗ trợ xử lý riêng.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Liên hệ hỗ trợ</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Mọi yêu cầu liên quan đến hủy vé, hoàn tiền, vui lòng liên hệ hotline 1900 1234 hoặc email
              support@datvexekhach.vn để được hỗ trợ kịp thời.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
