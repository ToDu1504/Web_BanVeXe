import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.8)]',
        secondary: 'border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.8)]',
        destructive: 'border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/0.8)]',
        outline: 'text-[hsl(var(--foreground))]',
        success: 'border-transparent bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] dark:bg-[hsl(var(--success)/0.2)]',
        warning: 'border-transparent bg-[hsl(var(--warning)/0.15)] text-[hsl(38_92%_35%)] dark:bg-[hsl(var(--warning)/0.2)] dark:text-[hsl(var(--warning))]',
        accent: 'border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
