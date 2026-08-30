import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// KPI card dùng chung cho Dashboard.jsx (admin) và Statistics.jsx (staff) —
// số liệu chạy đếm lên (count-up) bằng GSAP khi giá trị thay đổi.
const toneClasses = {
  primary: 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]',
  accent: 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]',
  success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  formatValue = (v) => v.toLocaleString('vi-VN'),
  tone = 'primary',
  className,
}) {
  const valueRef = useRef(null)

  useGSAP(() => {
    if (!valueRef.current) return
    const numericValue = Number(value) || 0
    const counter = { val: 0 }
    const tween = gsap.to(counter, {
      val: numericValue,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => {
        if (valueRef.current) valueRef.current.textContent = formatValue(Math.round(counter.val))
      },
    })
    return () => tween.kill()
  }, [value])

  return (
    <Card className={cn('overflow-hidden border-[hsl(var(--border))]', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              {label}
            </p>
            <p ref={valueRef} className="mt-2 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              0
            </p>
            {caption && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{caption}</p>}
          </div>
          {Icon && (
            <div className={cn('shrink-0 rounded-full p-2.5', toneClasses[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
