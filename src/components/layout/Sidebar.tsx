import { NavLink, useNavigate } from 'react-router-dom'
import {
  HiOutlineCheckCircle,
  HiOutlineViewGrid,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineShieldCheck,
} from 'react-icons/hi'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { AppLogo } from '@/components/ui/AppLogo'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DEFAULT_SIDEBAR_PREFS } from '@/types/database'

type NavKey = typeof DEFAULT_SIDEBAR_PREFS extends Record<infer K, boolean> ? K : never

const navItems: { key: NavKey; to: string; label: string; icon: typeof HiOutlineHome }[] = [
  { key: 'dailyChecklist', to: '/', label: 'Daily Checklist', icon: HiOutlineClipboardList },
  { key: 'accountability', to: '/accountability', label: 'Alpha Mode', icon: HiOutlineShieldCheck },
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { key: 'myTasks', to: '/tasks', label: 'My Tasks', icon: HiOutlineCheckCircle },
  { key: 'calendar', to: '/calendar', label: 'Calendar', icon: HiOutlineCalendar },
  { key: 'projects', to: '/projects', label: 'Projects', icon: HiOutlineViewGrid },
  { key: 'history', to: '/history', label: 'History', icon: HiOutlineClock },
  { key: 'sops', to: '/sops', label: 'SOPs', icon: HiOutlineBookOpen },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, signOut, hasFullAccess, canAccessCalendar } = useAuth()
  const navigate = useNavigate()
  const prefs = { ...DEFAULT_SIDEBAR_PREFS, ...profile?.sidebar_prefs }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const items = hasFullAccess
    ? navItems.filter((item) => {
        if (item.key === 'calendar' && !canAccessCalendar) return false
        return prefs[item.key as keyof typeof prefs] !== false
      })
    : [{ key: 'projects' as NavKey, to: '/projects', label: 'Projects', icon: HiOutlineViewGrid }]

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-black/95 backdrop-blur-xl transition-transform duration-220 lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="app-top-bar px-5 bg-transparent backdrop-blur-none border-white/10">
          <AppLogo size="sm" showText />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-white/10 text-foreground ring-1 ring-white/10 shadow-sm shadow-black/40'
                      : 'text-muted hover:text-foreground hover:bg-white/[0.05]'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4 space-y-3 safe-area-bottom">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/20'
                  : 'text-muted hover:text-foreground hover:bg-white/[0.05]'
              )
            }
          >
            <HiOutlineCog className="h-5 w-5" />
            Settings
          </NavLink>

          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/8 px-3 py-2.5">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name ?? 'User'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.display_name ?? 'User'}
              </p>
              <p className="text-xs text-muted truncate">{profile?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted"
            onClick={handleSignOut}
          >
            <HiOutlineLogout className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
