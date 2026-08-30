import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ReactLenis, useLenis } from 'lenis/react'
import { ScrollTrigger } from '@/lib/gsap'

// Tắt Lenis ở khu vực back-office (staff/admin) vì AdminLayout tự cuộn trong
// <main overflow-y-auto> riêng, không phải window — Lenis mặc định chỉ làm mượt
// window scroll nên bật ở đó không có tác dụng, tắt hẳn để tránh xung đột.
function LenisRouteController() {
  const location = useLocation()
  const lenis = useLenis(() => {
    ScrollTrigger.update()
  })

  useEffect(() => {
    if (!lenis) return
    const isBackOffice = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff')
    if (isBackOffice) lenis.stop()
    else lenis.start()
  }, [lenis, location.pathname])

  return null
}

export default function SmoothScrollProvider({ children }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    return children
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.1, smoothWheel: true }}>
      <LenisRouteController />
      {children}
    </ReactLenis>
  )
}
