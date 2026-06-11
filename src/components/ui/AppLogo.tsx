import { cn } from '@/lib/utils'

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
}

interface AppLogoProps {
  size?: keyof typeof sizes
  showText?: boolean
  className?: string
}

export function AppLogo({ size = 'sm', showText = false, className }: AppLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/logo.png"
        alt="Argh Roy CRM"
        className={cn('shrink-0 rounded-full object-cover', sizes[size])}
      />
      {showText && <span className="font-semibold text-foreground">Argh Roy CRM</span>}
    </div>
  )
}
