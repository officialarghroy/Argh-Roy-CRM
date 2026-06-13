import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { Header } from '@/components/layout/Header'

const maxWidths = {
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-none',
}

interface PageShellProps {
  title: string
  subtitle?: string
  onMenuClick: () => void
  onRefresh?: () => void
  actions?: ReactNode
  maxWidth?: keyof typeof maxWidths
  stats?: ReactNode
  children: ReactNode
}

export function PageShell({
  title,
  subtitle,
  onMenuClick,
  onRefresh,
  actions,
  maxWidth = '4xl',
  stats,
  children,
}: PageShellProps) {
  return (
    <div className="flex flex-col flex-1 relative z-10">
      <Header
        title={title}
        subtitle={subtitle}
        onMenuClick={onMenuClick}
        onRefresh={onRefresh}
        actions={actions}
      />
      <div className={cn('flex-1 p-4 lg:p-6 space-y-5 mx-auto w-full page-enter', maxWidths[maxWidth])}>
        {stats}
        {children}
      </div>
    </div>
  )
}
