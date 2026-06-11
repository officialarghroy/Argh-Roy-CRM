import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-zinc-700 text-zinc-200': variant === 'default',
          'bg-green-500/20 text-green-400': variant === 'success',
          'bg-orange-500/20 text-orange-400': variant === 'warning',
          'bg-blue-500/20 text-blue-400': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
