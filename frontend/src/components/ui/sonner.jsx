import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/hooks/useTheme'

function Toaster({ ...props }) {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      richColors
      position="top-right"
      duration={2500}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[hsl(var(--card))] group-[.toaster]:text-[hsl(var(--foreground))] group-[.toaster]:border-[hsl(var(--border))] group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[hsl(var(--muted-foreground))]',
          actionButton: 'group-[.toast]:bg-[hsl(var(--primary))] group-[.toast]:text-[hsl(var(--primary-foreground))]',
          cancelButton: 'group-[.toast]:bg-[hsl(var(--muted))] group-[.toast]:text-[hsl(var(--muted-foreground))]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
