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
} from 'react-icons/hi'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { AppLogo } from '@/components/ui/AppLogo'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DEFAULT_SIDEBAR_PREFS } from '@/types/database'

const navItems = [
  { key: 'dailyChecklist' as const, to: '/', label: 'Daily Checklist', icon: HiOutlineClipboardList },
  { key: 'dashboard' as const, to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { key: 'myTasks' as const, to: '/tasks', label: 'My Tasks', icon: HiOutlineCheckCircle },
  { key: 'calendar' as const, to: '/calendar', label: 'Calendar', icon: HiOutlineCalendar },
  { key: 'projects' as const, to: '/projects', label: 'Projects', icon: HiOutlineViewGrid },
  { key: 'history' as const, to: '/history', label: 'History', icon: HiOutlineClock },
  { key: 'sops' as const, to: '/sops', label: 'SOPs', icon: HiOutlineBookOpen },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, signOut, hasFullAccess, canAccessCalendar } = useAuth()
  const navigate = useNavigate()
  const prefs = { ...DEFAULT_SIDEBAR_PREFS, ...profile?.sidebar_prefs }
  const visibleItems = (hasFullAccess ? navItems : navItems.filter((item) => item.key === 'projects'))
    .filter((item) => {
      if (item.key === 'calendar' && !canAccessCalendar) return false
      return hasFullAccess ? prefs[item.key] : true
    })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-white/18 bg-black transition-transform duration-200 lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="app-top-bar px-5">
          <AppLogo size="sm" showText />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/12 text-foreground'
                    : 'text-muted hover:text-foreground hover:bg-white/8'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/18 p-4 space-y-3 safe-area-bottom">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-foreground hover:bg-white/8'
              )
            }
          >
            <HiOutlineCog className="h-5 w-5" />
            Settings
          </NavLink>

          <div className="flex items-center gap-3 px-1">
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
