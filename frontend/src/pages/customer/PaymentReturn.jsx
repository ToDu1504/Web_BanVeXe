import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { paymentApi } from '@/api/paymentApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { fadeInUp } from '@/lib/motionVariants'

export default function PaymentReturn() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying') // verifying | success | failed
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verify = async () => {
      const payload = Object.fromEntries(searchParams.entries())

      if (!payload.orderId || !payload.signature) {
        setStatus('failed')
        setMessage('Thiếu thông tin phản hồi từ MoMo.')
        return
      }

      try {
        const data = await paymentApi.verifyMomoReturn(payload)
        setStatus(data.success ? 'success' : 'failed')
        setMessage(data.message || (data.success ? 'Thanh toán thành công!' : 'Thanh toán không thành công.'))
      } catch (error) {
        setStatus('failed')
        setMessage(error.response?.data?.message || 'Không thể xác thực kết quả thanh toán.')
      }
    }
    verify()
  }, [searchParams])

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <motion.div initial="hidden" animate="show" variants={fadeInUp}>
        <Card className="border border-[hsl(var(--border))] text-center">
          <CardHeader>
            <CardTitle className="text-xl">Kết quả thanh toán MoMo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <AnimatePresence mode="wait">
              {status === 'verifying' && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-6"
                >
                  <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--accent))]" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang xác thực kết quả thanh toán...</p>
                </motion.div>
              )}
              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="flex flex-col items-center gap-3 py-6"
                >
                  <CheckCircle2 className="h-14 w-14 text-[hsl(var(--success))]" />
                  <p className="font-semibold">{message}</p>
                </motion.div>
              )}
              {status === 'failed' && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="flex flex-col items-center gap-3 py-6"
                >
                  <XCircle className="h-14 w-14 text-[hsl(var(--destructive))]" />
                  <p className="font-semibold">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <Button asChild className="w-full">
              <Link to="/customer/invoices">Xem lịch sử hóa đơn</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
