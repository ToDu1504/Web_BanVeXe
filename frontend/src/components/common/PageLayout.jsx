import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { motion } from 'framer-motion'
import { pageTransition } from '@/lib/motionVariants'

export default function PageLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Navbar />
      <motion.main
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={pageTransition.transition}
        className="flex-1"
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  )
}
