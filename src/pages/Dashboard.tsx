import { Link } from 'react-router-dom'
import { format, isToday, parseISO } from 'date-fns'
import {
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineArrowRight,
} from 'react-icons/hi'
import { PageShell } from '@/components/layout/PageShell'
import { usePageLayout } from '@/hooks/usePageLayout'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_SIDEBAR_PREFS } from '@/types/database'
import { useChecklist } from '@/hooks/useChecklist'
import { getChecklistDate } from '@/lib/checklistDay'
import { useTasks } from '@/hooks/useTasks'
import { useActivity } from '@/hooks/useActivity'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Badge } from '@/components/ui/Badge'
import { StatTile, EmptyState } from '@/components/ui/ListPrimitives'
import { isOverdue } from '@/lib/recurrence'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const { openSidebar } = usePageLayout()
  const { profile, canAccessCalendar } = useAuth()
  const prefs = { ...DEFAULT_SIDEBAR_PREFS, ...profile?.sidebar_prefs }
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
  const doneCount = tasks.filter((t) => t.status === 'done').length

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const upcoming = [...overdueTasks, ...activeTasks.filter((t) => !isOverdue(t.scheduled_at, false, t.status))].slice(0, 6)

  return (
    <PageShell
      title="Dashboard"
      subtitle={`${greeting()}, ${profile?.display_name ?? 'there'}`}
      onMenuClick={openSidebar}
      maxWidth="4xl"
      stats={
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label">Today at a glance</p>
            <p className="text-lg font-semibold text-foreground font-display mt-1">
              {activeTasks.length} active · {overdueTasks.length} overdue
            </p>
          </div>
          <ProgressRing done={doneCount} total={tasks.length || 1} />
        </div>
      }
    >
      <div className={cn(
        'grid grid-cols-2 gap-3',
        canAccessCalendar ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
      )}>
        <StatTile
          label="Checklist"
          value={`${checklistDone}/${checklist.length}`}
          accent="accent"
          icon={<HiOutlineClipboardList className="h-4 w-4" />}
          hint={<ProgressBar value={checklistDone} max={checklist.length || 1} className="h-1" />}
        />
        <StatTile
          label="Active tasks"
          value={activeTasks.length}
          accent="default"
          icon={<HiOutlineCheckCircle className="h-4 w-4" />}
          hint={
            <Link to="/tasks" className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1">
              View all <HiOutlineArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <StatTile
          label="Overdue"
          value={overdueTasks.length}
          accent={overdueTasks.length > 0 ? 'danger' : 'default'}
          icon={<HiOutlineClock className="h-4 w-4" />}
          hint={overdueTasks.length > 0 ? <span className="text-xs text-danger">Needs attention</span> : undefined}
        />
        {canAccessCalendar && (
          <StatTile
            label="Today's events"
            value={todayEvents.length}
            accent="purple"
            icon={<HiOutlineCalendar className="h-4 w-4" />}
            hint={
              <Link to="/calendar" className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1">
                Calendar <HiOutlineArrowRight className="h-3 w-3" />
              </Link>
            }
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassPanel
          title="Overdue & upcoming"
          toolbar={
            <Link to="/tasks" className="text-xs text-accent hover:text-accent-hover -mt-2 block text-right">
              See all tasks
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState message="No active tasks — you're all caught up" />
          ) : (
            <ul>
              {upcoming.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <span className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    isOverdue(task.scheduled_at, false, task.status) ? 'bg-danger' : 'bg-accent'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.scheduled_at && (
                      <p className="text-[11px] text-muted mt-0.5">
                        {format(parseISO(task.scheduled_at), 'MMM d · h:mm a')}
                      </p>
                    )}
                  </div>
                  {isOverdue(task.scheduled_at, false, task.status) && (
                    <Badge variant="warning">Overdue</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel
          title="Recently completed"
          toolbar={
            prefs.history !== false ? (
              <Link to="/history" className="text-xs text-accent hover:text-accent-hover -mt-2 block text-right">
                Full history
              </Link>
            ) : undefined
          }
        >
          {activity.length === 0 ? (
            <EmptyState message="No completed tasks yet" />
          ) : (
            <ul>
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex gap-3 px-5 py-3 border-b border-white/[0.06] last:border-b-0 text-sm"
                >
                  <span className="text-muted shrink-0 w-16 tabular-nums text-[11px] pt-0.5">
                    {format(parseISO(entry.created_at), 'MMM d')}
                  </span>
                  <span className="text-foreground truncate flex-1">
                    {entry.snapshot?.title != null
                      ? String(entry.snapshot.title)
                      : 'Completed task'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>
    </PageShell>
  )
}
