import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function ListSectionHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('section-label px-5 pt-4 pb-2', className)}>
      {children}
    </p>
  )
}

export function EmptyState({
  message,
  action,
  className,
}: {
  message: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-5 py-12 text-center', className)}>
      <p className="text-sm text-muted">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  href,
  accent = 'default',
}: {
  label: string
  value: string | number
  hint?: ReactNode
  icon?: ReactNode
  href?: string
  accent?: 'default' | 'accent' | 'danger' | 'success' | 'purple'
}) {
  const accents = {
    default: 'bg-white/[0.03] border-white/10',
    accent: 'bg-accent-soft border-accent/20',
    danger: 'bg-danger/10 border-danger/25',
    success: 'bg-emerald-500/10 border-emerald-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
  }

  const content = (
    <div className={cn('rounded-xl border p-4 transition-colors duration-150 hover:bg-white/[0.04]', accents[accent])}>
      <div className="flex items-center gap-2.5 mb-2">
        {icon && <span className="text-muted">{icon}</span>}
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight font-display">{value}</p>
      {hint && <div className="mt-2">{hint}</div>}
    </div>
  )

  if (href) {
    return <Link to={href} className="block">{content}</Link>
  }
  return content
}
