import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motionVariants'

// Shell dùng chung cho Terms/PrivacyPolicy/CancellationPolicy — trước đây
// trùng lặp y hệt ở cả 3 trang.
export default function LegalPageLayout({ title, lastUpdated, children }) {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <motion.div initial="hidden" animate="show" variants={fadeInUp} className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))] md:text-4xl">
          {title}
        </h1>
        {lastUpdated && (
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Cập nhật lần cuối: {lastUpdated}</p>
        )}
        <div className="mt-12 space-y-10 text-[hsl(var(--foreground))]">{children}</div>
      </motion.div>
    </div>
  )
}
