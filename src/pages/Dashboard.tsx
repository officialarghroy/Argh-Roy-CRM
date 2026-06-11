import { Link } from 'react-router-dom'
import { format, isToday, parseISO } from 'date-fns'
import {
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineArrowRight,
} from 'react-icons/hi'
import { Header } from '@/components/layout/Header'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useChecklist } from '@/hooks/useChecklist'
import { getChecklistDate } from '@/lib/checklistDay'
import { useTasks } from '@/hooks/useTasks'
import { useActivity } from '@/hooks/useActivity'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { isOverdue } from '@/lib/recurrence'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const { openSidebar } = usePageLayout()
  const { profile, canAccessCalendar } = useAuth()
  const today = new Date()
  const checklistDay = getChecklistDate()
  const { data: checklist = [] } = useChecklist(checklistDay)
  const { data: tasks = [] } = useTasks()
  const { data: activity = [] } = useActivity(8, { entityType: 'task', action: 'completed' })
  const { data: events = [] } = useCalendarEvents(today, { enabled: canAccessCalendar })

  const checklistDone = checklist.filter((i) => i.completed).length
  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const overdueTasks = activeTasks.filter((t) => isOverdue(t.scheduled_at, false, t.status))
  const todayEvents = events.filter((e) => isToday(e.start)).slice(0, 5)

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle={`${greeting()}, ${profile?.display_name ?? 'there'}`}
        onMenuClick={openSidebar}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className={cn(
          'grid grid-cols-1 sm:grid-cols-2 gap-4',
          canAccessCalendar ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
        )}>
          <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/20 text-accent">
                <HiOutlineClipboardList className="h-5 w-5" />
              </div>
              <span className="text-sm text-muted">Today's checklist</span>
            </div>
            <p className="text-2xl font-bold">{checklistDone}/{checklist.length}</p>
            <ProgressBar value={checklistDone} max={checklist.length || 1} className="mt-3" />
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <HiOutlineCheckCircle className="h-5 w-5" />
              </div>
              <span className="text-sm text-muted">Active tasks</span>
            </div>
            <p className="text-2xl font-bold">{activeTasks.length}</p>
            <Link to="/tasks" className="text-xs text-accent hover:underline mt-2 inline-flex items-center gap-1">
              View all <HiOutlineArrowRight className="h-3 w-3" />
            </Link>
          </Card>

          <Card className={cn(
            'bg-gradient-to-br to-transparent',
            overdueTasks.length > 0 ? 'from-danger/10 border-danger/30' : 'from-white/[0.02] border-white/10'
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('p-2 rounded-lg', overdueTasks.length > 0 ? 'bg-danger/20 text-danger' : 'bg-white/5 text-muted')}>
                <HiOutlineClock className="h-5 w-5" />
              </div>
              <span className="text-sm text-muted">Overdue</span>
            </div>
            <p className="text-2xl font-bold">{overdueTasks.length}</p>
            {overdueTasks.length > 0 && (
              <p className="text-xs text-danger mt-1">Needs attention</p>
            )}
          </Card>

          {canAccessCalendar && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <HiOutlineCalendar className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted">Today's events</span>
              </div>
              <p className="text-2xl font-bold">{todayEvents.length}</p>
              <Link to="/calendar" className="text-xs text-accent hover:underline mt-2 inline-flex items-center gap-1">
                Open calendar <HiOutlineArrowRight className="h-3 w-3" />
              </Link>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Overdue & upcoming</h2>
              <Link to="/tasks" className="text-xs text-accent hover:underline">See all</Link>
            </div>
            <div className="space-y-2">
              {[...overdueTasks, ...activeTasks.filter((t) => !isOverdue(t.scheduled_at, false, t.status))].slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 glass-inset">
                  <div className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    isOverdue(task.scheduled_at, false, task.status) ? 'bg-danger' : 'bg-accent'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.scheduled_at && (
                      <p className="text-xs text-muted">{format(parseISO(task.scheduled_at), 'MMM d, h:mm a')}</p>
                    )}
                  </div>
                  {isOverdue(task.scheduled_at, false, task.status) && (
                    <Badge variant="warning">Overdue</Badge>
                  )}
                </div>
              ))}
              {activeTasks.length === 0 && (
                <p className="text-sm text-muted text-center py-4">No active tasks</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recently completed</h2>
              <Link to="/history" className="text-xs text-accent hover:underline">Full history</Link>
            </div>
            <div className="space-y-3">
              {activity.map((entry) => (
                <div key={entry.id} className="flex gap-3 text-sm">
                  <span className="text-muted shrink-0 w-20">
                    {format(parseISO(entry.created_at), 'MMM d')}
                  </span>
                  <span className="text-foreground truncate">
                    {entry.snapshot?.title != null
                      ? String(entry.snapshot.title)
                      : 'Completed task'}
                  </span>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-muted text-center py-4">No completed tasks yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
