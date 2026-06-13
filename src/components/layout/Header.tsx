import { HiOutlineMenu, HiOutlineRefresh } from 'react-icons/hi'

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick: () => void
  onRefresh?: () => void
  actions?: React.ReactNode
}

export function Header({ title, subtitle, onMenuClick, onRefresh, actions }: HeaderProps) {
  return (
    <header className="app-top-bar sticky top-0 z-30 w-full">
      <div className="flex w-full items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden border-0 p-2.5 -ml-2 rounded-lg text-muted outline-none hover:text-foreground hover:bg-white/5 active:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <HiOutlineMenu className="h-5 w-5" />
          </button>
            <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate font-display tracking-tight">{title}</h1>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="border-0 p-1 rounded text-muted outline-none hover:text-foreground hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <HiOutlineRefresh className="h-4 w-4" />
                </button>
              )}
            </div>
            {subtitle && <p className="text-sm text-muted mt-0.5 line-clamp-1">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      </div>
    </header>
  )
}
