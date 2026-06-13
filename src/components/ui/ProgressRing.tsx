import { cn } from '@/lib/utils'

interface ProgressRingProps {
  done: number
  total: number
  size?: 'sm' | 'md'
  className?: string
}

const sizes = {
  sm: { box: 'h-9 w-9', text: 'text-[9px]', r: 14 },
  md: { box: 'h-11 w-11', text: 'text-[10px]', r: 15.5 },
}

export function ProgressRing({ done, total, size = 'md', className }: ProgressRingProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const s = sizes[size]

  return (
    <div className={cn('relative shrink-0', s.box, className)}>
      <svg className={cn(s.box, '-rotate-90')} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={s.r} fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={s.r}
          fill="none"
          stroke="currentColor"
          className="text-emerald-400 transition-all duration-300"
          strokeWidth="3"
          strokeDasharray={`${percent} 100`}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center font-semibold text-foreground tabular-nums', s.text)}>
        {done}/{total}
      </span>
    </div>
  )
}
