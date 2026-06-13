import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GlassPanelProps {
  title?: string
  action?: ReactNode
  toolbar?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function GlassPanel({
  title,
  action,
  toolbar,
  footer,
  children,
  className,
  bodyClassName,
}: GlassPanelProps) {
  return (
    <div className={cn('glass-card p-0 overflow-hidden', className)}>
      {(title || action || toolbar) && (
        <div className="px-5 py-4 border-b border-white/10 space-y-3">
          {(title || action) && (
            <div className="flex items-center justify-between gap-3">
              {title && (
                <h2 className="text-base font-semibold text-foreground tracking-tight font-display">
                  {title}
                </h2>
              )}
              {action}
            </div>
          )}
          {toolbar}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && <div className="border-t border-white/10">{footer}</div>}
    </div>
  )
}
