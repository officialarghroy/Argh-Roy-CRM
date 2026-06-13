import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Input({ className, label, hint, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40 disabled:opacity-50',
          className
        )}
        {...props}
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
